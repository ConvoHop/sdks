"""Mutation recovery records and the storage interfaces that keep them across restarts.

Before a mutation is sent, the client records its request ID, operation, input fingerprint and retry budget. Pass
``recovery_storage`` (or ``async_recovery_storage`` to :class:`~convohop.AsyncConvoHop`) to keep these records
durable, so a restarted process can resolve or retry an uncertain mutation with ``retry_request``. Records never
contain credentials.
"""

from __future__ import annotations

import copy
import dataclasses
import json
from collections.abc import Mapping
from typing import Any, Literal, Protocol, runtime_checkable

from ._generated.operations import OPERATIONS
from ._json import MAX_SAFE_INTEGER, parse
from ._protocol import is_id

__all__ = ["AsyncRecoveryStorage", "MemoryStorage", "RecoveryState", "RecoveryStorage"]

MAX_RECORDS = 128
MANAGEMENT_INCARNATION = "management"
_STATES = ("pending", "unknown", "rejected", "committed", "accepted")
_CLOCKS = ("firstSubmittedAt", "retryDeadline", "attemptCount", "lastAttemptAt")


@runtime_checkable
class RecoveryStorage(Protocol):
    """Synchronous key-value storage for recovery records, such as a file or database adapter."""

    def get_item(self, key: str) -> str | None:
        """Returns the stored value, or ``None`` when the key is absent."""

    def set_item(self, key: str, value: str) -> None:
        """Stores the value durably before returning; raise if durability is not confirmed."""


@runtime_checkable
class AsyncRecoveryStorage(Protocol):
    """Asynchronous key-value storage for recovery records."""

    async def get_item(self, key: str) -> str | None:
        """Returns the stored value, or ``None`` when the key is absent."""

    async def set_item(self, key: str, value: str) -> None:
        """Stores the value durably before returning; raise if durability is not confirmed."""


class MemoryStorage:
    """In-process :class:`RecoveryStorage`. Records survive client reconstruction but not a process restart."""

    __slots__ = ("_items",)

    def __init__(self) -> None:
        self._items: dict[str, str] = {}

    def get_item(self, key: str) -> str | None:
        return self._items.get(key)

    def set_item(self, key: str, value: str) -> None:
        self._items[key] = value

    def remove_item(self, key: str) -> None:
        self._items.pop(key, None)

    def clear(self) -> None:
        self._items.clear()


@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class RecoveryState:
    """A snapshot of one mutation's recovery record.

    Attributes:
        request_id: The mutation's request ID.
        incarnation: The project incarnation it was sent in (``"management"`` for management mutations).
        payload_fingerprint: ``sha256:`` digest of the operation, project and input.
        operation: Operation ID, for example ``communication.sendMessage``.
        project_id: The project, for communication mutations.
        input: A copy of the exact input sent.
        first_submitted_at: Unix milliseconds when the record was created.
        retry_deadline: Unix milliseconds after which the SDK no longer resends it.
        attempt_count: Attempts sent so far.
        last_attempt_at: Unix milliseconds of the latest attempt.
        last_attempt_classification: ``notSubmitted``, ``submitted``, ``authorityReceipt``, an error code or
            ``opaqueTransportFailure``.
        resolution_state: ``pending`` (never sent), ``unknown``, ``rejected`` (the authority rejected every attempt),
            ``committed`` or ``accepted``.
        media_admission_attempted: Whether native media admission used this request's credentials.
    """

    request_id: str
    incarnation: str
    payload_fingerprint: str
    operation: str
    project_id: str | None
    input: Mapping[str, Any]
    first_submitted_at: int
    retry_deadline: int
    attempt_count: int
    last_attempt_at: int
    last_attempt_classification: str
    resolution_state: Literal["pending", "unknown", "rejected", "committed", "accepted"]
    media_admission_attempted: bool = False


def public_state(record: Mapping[str, Any]) -> RecoveryState:
    return RecoveryState(
        request_id=record["requestId"],
        incarnation=record["incarnation"],
        payload_fingerprint=record["payloadFingerprint"],
        operation=record["operation"],
        project_id=record.get("projectId"),
        input=copy.deepcopy(record["input"]),
        first_submitted_at=record["firstSubmittedAt"],
        retry_deadline=record["retryDeadline"],
        attempt_count=record["attemptCount"],
        last_attempt_at=record["lastAttemptAt"],
        last_attempt_classification=record["lastAttemptClassification"],
        resolution_state=record["resolutionState"],
        media_admission_attempted=record.get("mediaAdmissionAttempted") is True,
    )


def snapshot(records: Mapping[str, Mapping[str, Any]]) -> str:
    """Serializes records like the TypeScript SDK, so both can share stored recovery state."""
    return json.dumps(list(records.values()), ensure_ascii=False, separators=(",", ":"), allow_nan=False)


def restore(saved: str | None) -> dict[str, dict[str, Any]]:
    """Parses and checks stored records. Raises ``ValueError`` if any record could authorize a wrong resend."""
    if saved is not None and not isinstance(saved, str):
        raise ValueError("Invalid mutation recovery storage")
    if not saved:
        return {}
    try:
        values = parse(saved)
    except ValueError:
        raise ValueError("Invalid mutation recovery storage") from None
    if not isinstance(values, list) or len(values) > MAX_RECORDS:
        raise ValueError("Invalid mutation recovery storage")
    restored: dict[str, dict[str, Any]] = {}
    for value in values:
        record = _record(value)
        if record["requestId"] in restored:
            raise ValueError("Duplicate mutation recovery identity")
        restored[record["requestId"]] = record
    return restored


def _record(value: object) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError("Invalid recovery record")  # noqa: TRY004 - corrupt storage is invalid data, not a caller's type
    name = value.get("operation")
    operation = OPERATIONS.get(name) if isinstance(name, str) else None
    if operation is None or operation.kind != "mutation" or value.get("resolutionState") not in _STATES:
        raise ValueError("Invalid recovery record")
    project_id = value.get("projectId")
    if "projectId" in value and not is_id(project_id):
        raise ValueError("Invalid recovery project scope")
    if (operation.plane == "communication") != (project_id is not None):
        raise ValueError("Invalid recovery project scope")
    for key in _CLOCKS:
        clock = value.get(key)
        if not isinstance(clock, int) or isinstance(clock, bool) or not 0 <= clock <= MAX_SAFE_INTEGER:
            raise ValueError("Invalid recovery clock or count")
    marker = value.get("mediaAdmissionAttempted", None)
    if "mediaAdmissionAttempted" in value and marker is not True:
        raise ValueError("Invalid native admission marker")
    request_id = value.get("requestId")
    if not is_id(request_id):
        raise ValueError("Invalid recovery record")
    for key in ("incarnation", "payloadFingerprint", "lastAttemptClassification"):
        if not isinstance(value.get(key), str):
            raise ValueError("Invalid recovery record")  # noqa: TRY004
    if not isinstance(value.get("input"), dict):
        raise ValueError("Invalid recovery record")  # noqa: TRY004
    record: dict[str, Any] = {
        "requestId": request_id,
        "incarnation": value["incarnation"],
        "payloadFingerprint": value["payloadFingerprint"],
        "operation": operation.id,
    }
    if project_id is not None:
        record["projectId"] = project_id
    record.update(
        {
            "input": value["input"],
            "firstSubmittedAt": value["firstSubmittedAt"],
            "retryDeadline": value["retryDeadline"],
            "attemptCount": value["attemptCount"],
            "lastAttemptAt": value["lastAttemptAt"],
            "lastAttemptClassification": value["lastAttemptClassification"],
            "resolutionState": value["resolutionState"],
        }
    )
    if marker is True:
        record["mediaAdmissionAttempted"] = True
    return record
