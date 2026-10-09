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
    "Fruit",
    "HTTPMethod",
    "Item",
    "ItemsInput",
    "Box_3dInput",
    "ItemPage",
    "SubjectRef",
    "EventPayload",
    "Event",
    "EventPage",
    "EventsInput",
    "JobRef",
    "StartJobPayload",
    "StartJobInput",
    "JobInput",
    "Job",
    "PingInput",
    "FetchInput",
    "WidgetState",
    "Widget",
    "WidgetPage",
    "WidgetsPayload",
    "WidgetsInput",
    "ShapeInput",
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


Fruit: TypeAlias = Literal[
    "BANANA",
    "APPLE",
    "cherry",
    "apple10",
    "apple9",
    "DATE",
    "ELDER",
]
"""Kinds of fruit.
The values are deliberately unsorted.

- ``BANANA``: Curved and yellow.
- ``DATE``: Deprecated: No longer supported.
- ``ELDER``: Elderberries. Deprecated: Use APPLE.
"""


HTTPMethod: TypeAlias = Literal[
    "POST",
    "GET",
]


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class Item:
    id: str
    name: str
    fruit: Fruit | None
    weight: float | None
    ripe: bool
    old_name: str | None
    """Deprecated: No longer supported."""
    legacy_code: int | None
    """Legacy numeric code.

    Deprecated: Use id.
    """
    grid: tuple[tuple[int, ...] | None, ...]
    """Nested and nullable lists."""
    aliases: tuple[str | None, ...] | None
    history: tuple[tuple[Fruit | None, ...], ...] | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> Item:
        return cls(
            id=data["id"],
            name=data["name"],
            fruit=data["fruit"],
            weight=None if data["weight"] is None else float(data["weight"]),
            ripe=data["ripe"],
            old_name=data["oldName"],
            legacy_code=data["legacyCode"],
            grid=tuple(None if item1 is None else tuple(item1) for item1 in data["grid"]),
            aliases=None if data["aliases"] is None else tuple(data["aliases"]),
            history=None if data["history"] is None else tuple(tuple(item1) for item1 in data["history"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "id": self.id,
            "name": self.name,
            "fruit": self.fruit,
            "weight": self.weight,
            "ripe": self.ripe,
            "oldName": self.old_name,
            "legacyCode": self.legacy_code,
            "grid": [None if item1 is None else list(item1) for item1 in self.grid],
            "aliases": None if self.aliases is None else list(self.aliases),
            "history": None if self.history is None else [list(item1) for item1 in self.history],
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ItemsInput:
    """Filters for alpha.items.
    A closing comment marker */ must not end a generated comment.
    """

    limit: int | None = None
    """Page size.
    Defaults to 20.

    Defaults to ``20`` on the server.
    """
    cursor: str | None = None
    fruits: Sequence[Fruit] | None = None
    min_weight: float | None = None
    include_deprecated: bool | None = None
    """Defaults to ``false`` on the server."""
    method: HTTPMethod | None = None
    """Defaults to ``"GET"`` on the server."""
    box: Box_3dInput | None = None
    legacy_filter: str | None = None
    """Deprecated: Use fruits."""
    item2: int | None = None
    item10: int | None = None

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {}
        if self.limit is not None:
            data["limit"] = self.limit
        if self.cursor is not None:
            data["cursor"] = self.cursor
        if self.fruits is not None:
            data["fruits"] = self.fruits
        if self.min_weight is not None:
            data["minWeight"] = self.min_weight
        if self.include_deprecated is not None:
            data["includeDeprecated"] = self.include_deprecated
        if self.method is not None:
            data["method"] = self.method
        if self.box is not None:
            data["box"] = self.box.to_dict()
        if self.legacy_filter is not None:
            data["legacyFilter"] = self.legacy_filter
        if self.item2 is not None:
            data["item2"] = self.item2
        if self.item10 is not None:
            data["item10"] = self.item10
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class Box_3dInput:
    width: float
    height: float
    depth: float

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "width": self.width,
            "height": self.height,
            "depth": self.depth,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ItemPage:
    items: tuple[Item, ...]
    complete: bool
    refresh_required: bool
    next_cursor: str | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> ItemPage:
        return cls(
            items=tuple(Item._from_wire(item1) for item1 in data["items"]),
            complete=data["complete"],
            refresh_required=data["refreshRequired"],
            next_cursor=data["nextCursor"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "items": [item1.to_dict() for item1 in self.items],
            "complete": self.complete,
            "refreshRequired": self.refresh_required,
            "nextCursor": self.next_cursor,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class SubjectRef:
    kind: str
    id: str

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> SubjectRef:
        return cls(
            kind=data["kind"],
            id=data["id"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "kind": self.kind,
            "id": self.id,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class EventPayload:
    item_id: str | None
    job_id: str | None
    revision: str | None
    note: str | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> EventPayload:
        return cls(
            item_id=data["itemId"],
            job_id=data["jobId"],
            revision=data["revision"],
            note=data["note"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "itemId": self.item_id,
            "jobId": self.job_id,
            "revision": self.revision,
            "note": self.note,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class Event:
    sequence: str
    type: str
    subject_ref: SubjectRef
    payload: EventPayload

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> Event:
        return cls(
            sequence=data["sequence"],
            type=data["type"],
            subject_ref=SubjectRef._from_wire(data["subjectRef"]),
            payload=EventPayload._from_wire(data["payload"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "sequence": self.sequence,
            "type": self.type,
            "subjectRef": self.subject_ref.to_dict(),
            "payload": self.payload.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class EventPage:
    items: tuple[Event, ...]
    complete: bool
    refresh_required: bool
    next_cursor: str | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> EventPage:
        return cls(
            items=tuple(Event._from_wire(item1) for item1 in data["items"]),
            complete=data["complete"],
            refresh_required=data["refreshRequired"],
            next_cursor=data["nextCursor"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "items": [item1.to_dict() for item1 in self.items],
            "complete": self.complete,
            "refreshRequired": self.refresh_required,
            "nextCursor": self.next_cursor,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class EventsInput:
    after: str | None = None
    limit: int

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "limit": self.limit,
        }
        if self.after is not None:
            data["after"] = self.after
        return data


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
class PingInput:
    note: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {}
        if self.note is not None:
            data["note"] = self.note
        return data


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
