"""Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.

Models for the operations the server SDK calls. Enums are string literals. Output objects are frozen
dataclasses built from validated responses. Input objects are frozen dataclasses; fields left as None are omitted.
"""

from __future__ import annotations

import dataclasses as _dc
from collections.abc import Mapping, Sequence
from typing import Any, Literal, TypeAlias


__all__ = [
    "Capabilities",
    "ResolveInput",
    "Receipt",
    "HTTPMethod",
    "JobRef",
    "StartJobPayload",
    "StartJobInput",
    "JobInput",
    "Job",
    "FetchInput",
    "WidgetState",
    "Widget",
    "WidgetPage",
    "WidgetsPayload",
    "WidgetsInput",
    "ShapeInput",
    "RequestAccessInput",
    "ClaimWidgetInput",
    "CreateWidgetInput",
]


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class Capabilities:
    version: str
    wss_url: str | None
    features: tuple[str, ...]

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> Capabilities:
        return cls(
            version=data["version"],
            wss_url=data["wssUrl"],
            features=tuple(data["features"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "version": self.version,
            "wssUrl": self.wss_url,
            "features": list(self.features),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ResolveInput:
    request_id: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "requestId": self.request_id,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class Receipt:
    request_id: str
    committed: bool
    sequence: str | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> Receipt:
        return cls(
            request_id=data["requestId"],
            committed=data["committed"],
            sequence=data["sequence"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "requestId": self.request_id,
            "committed": self.committed,
            "sequence": self.sequence,
        }


HTTPMethod: TypeAlias = Literal[
    "POST",
    "GET",
]


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class JobRef:
    operation_id: str
    state: str

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> JobRef:
        return cls(
            operation_id=data["operationId"],
            state=data["state"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "operationId": self.operation_id,
            "state": self.state,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class StartJobPayload:
    request_id: str
    receipt: Receipt
    job: JobRef | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> StartJobPayload:
        return cls(
            request_id=data["requestId"],
            receipt=Receipt._from_wire(data["receipt"]),
            job=None if data["job"] is None else JobRef._from_wire(data["job"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "requestId": self.request_id,
            "receipt": self.receipt.to_dict(),
            "job": None if self.job is None else self.job.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class StartJobInput:
    item_id: str
    repeat: int | None = None
    """How many times to run.

    Defaults to ``1`` on the server.
    """
    props: Mapping[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "itemId": self.item_id,
        }
        if self.repeat is not None:
            data["repeat"] = self.repeat
        if self.props is not None:
            data["props"] = self.props
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class JobInput:
    operation_id: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "operationId": self.operation_id,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class Job:
    operation_id: str
    state: str
    progress: float | None
    output: dict[str, Any] | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> Job:
        return cls(
            operation_id=data["operationId"],
            state=data["state"],
            progress=None if data["progress"] is None else float(data["progress"]),
            output=data["output"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "operationId": self.operation_id,
            "state": self.state,
            "progress": self.progress,
            "output": self.output,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class FetchInput:
    method: HTTPMethod | None = None
    """Defaults to ``"GET"`` on the server."""

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {}
        if self.method is not None:
            data["method"] = self.method
        return data


WidgetState: TypeAlias = Literal[
    "ACTIVE",
    "ARCHIVED",
]


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class Widget:
    id: str
    label: str | None
    state: WidgetState
    revision: str

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> Widget:
        return cls(
            id=data["id"],
            label=data["label"],
            state=data["state"],
            revision=data["revision"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "id": self.id,
            "label": self.label,
            "state": self.state,
            "revision": self.revision,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class WidgetPage:
    items: tuple[Widget, ...]
    complete: bool
    refresh_required: bool

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> WidgetPage:
        return cls(
            items=tuple(Widget._from_wire(item1) for item1 in data["items"]),
            complete=data["complete"],
            refresh_required=data["refreshRequired"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "items": [item1.to_dict() for item1 in self.items],
            "complete": self.complete,
            "refreshRequired": self.refresh_required,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class WidgetsPayload:
    request_id: str
    result: WidgetPage | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> WidgetsPayload:
        return cls(
            request_id=data["requestId"],
            result=None if data["result"] is None else WidgetPage._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "requestId": self.request_id,
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class WidgetsInput:
    states: Sequence[WidgetState] | None = None

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {}
        if self.states is not None:
            data["states"] = self.states
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ShapeInput:
    kind: str
    sides: Sequence[int]

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "kind": self.kind,
            "sides": self.sides,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class RequestAccessInput:
    email: str
    challenge: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "email": self.email,
            "challenge": self.challenge,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ClaimWidgetInput:
    widget_id: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "widgetId": self.widget_id,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class CreateWidgetInput:
    label: str
    state: WidgetState | None = None
    """Defaults to ``"ACTIVE"`` on the server."""
    ratio: float | None = None
    """Defaults to ``0.5`` on the server."""
    nested: Sequence[Sequence[int]] | None = None
    shape: ShapeInput | None = None
    """Defaults to ``{"kind":"box","sides":[1,2]}`` on the server."""

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "label": self.label,
        }
        if self.state is not None:
            data["state"] = self.state
        if self.ratio is not None:
            data["ratio"] = self.ratio
        if self.nested is not None:
            data["nested"] = self.nested
        if self.shape is not None:
            data["shape"] = self.shape.to_dict()
        return data
