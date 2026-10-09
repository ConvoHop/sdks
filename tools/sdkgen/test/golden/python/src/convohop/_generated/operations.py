"""Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.

The operation catalog and wire shapes the runtime reads, and the hooks it implements.
"""

from __future__ import annotations

import dataclasses as _dc
from collections.abc import AsyncIterator, Iterator, Mapping
from typing import Any, Literal


__all__ = [
    "AsyncInvoker",
    "ENUMS",
    "ERRORS",
    "IDEMPOTENCY",
    "INPUTS",
    "OBJECTS",
    "OPERATIONS",
    "PLANES",
    "SCALARS",
    "ErrorSpec",
    "IdempotencySpec",
    "OperationSpec",
    "PaginationSpec",
    "ScalarSpec",
    "SyncInvoker",
]


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class PaginationSpec:
    """How an operation pages: the page location in its result, the item type and the cursor input."""

    style: str
    page_path: tuple[str, ...]
    page_type: str
    item_type: str
    limit_field: str | None
    cursor_field: str | None


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class OperationSpec:
    """One GraphQL operation, as the runtime sends and checks it."""

    id: str
    plane: str
    kind: Literal["query", "mutation"]
    field: str
    operation_name: str
    document: str
    input_type: str | None
    result_type: str
    returns: Literal["value", "result", "optional_result"]
    """``value`` returns the field; ``result`` and ``optional_result`` return its ``result``, which only the latter may omit."""
    idempotency: str
    context: Mapping[str, str]
    """How the operation uses each request context field: required, optional or forbidden."""
    echo_path: tuple[str, ...]
    echo: tuple[str, ...]
    """Input identifiers the object at ``echo_path`` must repeat."""
    item_echo: tuple[str, ...]
    """Input identifiers every page item must repeat."""
    pagination: PaginationSpec | None
    long_running: str | None
    """The operation to poll when the work completes later."""
    errors: tuple[str, ...]


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ScalarSpec:
    """A scalar's JSON representation and constraints."""

    representation: Literal["string", "integer", "number", "boolean", "object"]
    pattern: str | None = None
    disallowed: tuple[str, ...] = ()
    minimum: float | None = None
    maximum: float | None = None
    maximum_decimal: str | None = None
    max_canonical_json_bytes: int | None = None
    required_string_properties: tuple[str, ...] = ()


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class IdempotencySpec:
    """An idempotency class and its retry budget."""

    retry: str
    resolvable: bool
    max_attempts: int | None
    window_ms: int | None


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ErrorSpec:
    """An error code from the authority or the SDKs."""

    summary: str
    origin: str
    status: int | None
    retryable: bool


class SyncInvoker:
    """Hooks the generated synchronous operations call. The client implements them."""

    __slots__ = ()

    def _invoke(self, operation: OperationSpec, payload: Mapping[str, Any] | None, request_id: str | None) -> Any:
        raise NotImplementedError

    def _pages(self, operation: OperationSpec, payload: Mapping[str, Any]) -> Iterator[Any]:
        raise NotImplementedError


class AsyncInvoker:
    """Hooks the generated asynchronous operations call. The client implements them."""

    __slots__ = ()

    async def _invoke(self, operation: OperationSpec, payload: Mapping[str, Any] | None, request_id: str | None) -> Any:
        raise NotImplementedError

    def _pages(self, operation: OperationSpec, payload: Mapping[str, Any]) -> AsyncIterator[Any]:
        raise NotImplementedError


OPERATIONS: Mapping[str, OperationSpec] = {
    "alpha.capabilities": OperationSpec(
        id="alpha.capabilities",
        plane="alpha",
        kind="query",
        field="capabilities",
        operation_name="AlphaCapabilities",
        document=(
            "query AlphaCapabilities($context: ContextInput!) {\n"
            "  capabilities(context: $context) {\n"
            "    version\n"
            "    wssUrl\n"
            "    features\n"
            "  }\n"
            "}"
        ),
        input_type=None,
        result_type="Capabilities!",
        returns="value",
        idempotency="safe",
        context={"tenant": "optional", "requestId": "required", "attempt": "optional", "permit": "forbidden", "tags": "optional"},
        echo_path=(),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("INVALID_REQUEST", "TRANSPORT_UNKNOWN", "UNAVAILABLE"),
    ),
    "alpha.resolveRequest": OperationSpec(
        id="alpha.resolveRequest",
        plane="alpha",
        kind="query",
        field="resolveRequest",
        operation_name="AlphaResolveRequest",
        document=(
            "query AlphaResolveRequest($context: ContextInput!, $input: ResolveInput!) {\n"
            "  resolveRequest(context: $context, input: $input) {\n"
            "    requestId\n"
            "    committed\n"
            "    sequence\n"
            "  }\n"
            "}"
        ),
        input_type="ResolveInput",
        result_type="Receipt!",
        returns="value",
        idempotency="safe",
        context={"tenant": "required", "requestId": "required", "attempt": "optional", "permit": "forbidden", "tags": "optional"},
        echo_path=(),
        echo=("requestId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("INVALID_REQUEST", "NOT_FOUND", "TRANSPORT_UNKNOWN", "UNAVAILABLE"),
    ),
    "alpha.items": OperationSpec(
        id="alpha.items",
        plane="alpha",
        kind="query",
        field="items",
        operation_name="AlphaItems",
        document=(
            "query AlphaItems($context: ContextInput!, $input: ItemsInput!) {\n"
            "  items(context: $context, input: $input) {\n"
            "    items {\n"
            "      id\n"
            "      name\n"
            "      fruit\n"
            "      weight\n"
            "      ripe\n"
            "      oldName\n"
            "      legacyCode\n"
            "      grid\n"
            "      aliases\n"
            "      history\n"
            "    }\n"
            "    complete\n"
            "    refreshRequired\n"
            "    nextCursor\n"
            "  }\n"
            "}"
        ),
        input_type="ItemsInput",
        result_type="ItemPage!",
        returns="value",
        idempotency="safe",
        context={"tenant": "required", "requestId": "required", "attempt": "optional", "permit": "forbidden", "tags": "optional"},
        echo_path=(),
        echo=(),
        item_echo=(),
        pagination=PaginationSpec(style="cursor", page_path=(), page_type="ItemPage", item_type="Item", limit_field="limit", cursor_field="cursor"),
        long_running=None,
        errors=("CURSOR_EXPIRED", "INVALID_REQUEST", "TRANSPORT_UNKNOWN", "UNAVAILABLE"),
    ),
    "alpha.events": OperationSpec(
        id="alpha.events",
        plane="alpha",
        kind="query",
        field="events",
        operation_name="AlphaEvents",
        document=(
            "query AlphaEvents($context: ContextInput!, $input: EventsInput!) {\n"
            "  events(context: $context, input: $input) {\n"
            "    items {\n"
            "      sequence\n"
            "      type\n"
            "      subjectRef {\n"
            "        kind\n"
            "        id\n"
            "      }\n"
            "      payload {\n"
            "        itemId\n"
            "        jobId\n"
            "        revision\n"
            "        note\n"
            "      }\n"
            "    }\n"
            "    complete\n"
            "    refreshRequired\n"
            "    nextCursor\n"
            "  }\n"
            "}"
        ),
        input_type="EventsInput",
        result_type="EventPage!",
        returns="value",
        idempotency="safe",
        context={"tenant": "required", "requestId": "required", "attempt": "optional", "permit": "forbidden", "tags": "optional"},
        echo_path=(),
        echo=(),
        item_echo=(),
        pagination=PaginationSpec(style="replay", page_path=(), page_type="EventPage", item_type="Event", limit_field="limit", cursor_field="after"),
        long_running=None,
        errors=("CURSOR_EXPIRED", "INVALID_REQUEST", "TRANSPORT_UNKNOWN", "UNAVAILABLE"),
    ),
    "alpha.job": OperationSpec(
        id="alpha.job",
        plane="alpha",
        kind="query",
        field="job",
        operation_name="AlphaJob",
        document=(
            "query AlphaJob($context: ContextInput!, $input: JobInput!) {\n"
            "  job(context: $context, input: $input) {\n"
            "    operationId\n"
            "    state\n"
            "    progress\n"
            "    output\n"
            "  }\n"
            "}"
        ),
        input_type="JobInput",
        result_type="Job",
        returns="value",
        idempotency="safe",
        context={"tenant": "required", "requestId": "required", "attempt": "optional", "permit": "forbidden", "tags": "optional"},
        echo_path=(),
        echo=("operationId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("INVALID_REQUEST", "NOT_FOUND", "TRANSPORT_UNKNOWN", "UNAVAILABLE"),
    ),
    "alpha.fetchHTTPStatus": OperationSpec(
        id="alpha.fetchHTTPStatus",
        plane="alpha",
        kind="query",
        field="fetchHTTPStatus",
        operation_name="AlphaFetchHTTPStatus",
        document=(
            "query AlphaFetchHTTPStatus($context: ContextInput!, $input: FetchInput) {\n"
            "  fetchHTTPStatus(context: $context, input: $input)\n"
            "}"
        ),
        input_type="FetchInput",
        result_type="Int",
        returns="value",
        idempotency="safe",
        context={"tenant": "required", "requestId": "required", "attempt": "optional", "permit": "forbidden", "tags": "optional"},
        echo_path=(),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("UNAVAILABLE",),
    ),
    "alpha.startJob": OperationSpec(
        id="alpha.startJob",
        plane="alpha",
        kind="mutation",
        field="startJob",
        operation_name="AlphaStartJob",
        document=(
            "mutation AlphaStartJob($context: ContextInput!, $input: StartJobInput!) {\n"
            "  startJob(context: $context, input: $input) {\n"
            "    requestId\n"
            "    receipt {\n"
            "      requestId\n"
            "      committed\n"
            "      sequence\n"
            "    }\n"
            "    job {\n"
            "      operationId\n"
            "      state\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="StartJobInput",
        result_type="StartJobPayload!",
        returns="value",
        idempotency="idempotent",
        context={"tenant": "required", "requestId": "required", "attempt": "optional", "permit": "forbidden", "tags": "optional"},
        echo_path=(),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running="alpha.job",
        errors=("INVALID_REQUEST", "NOT_FOUND", "TRANSPORT_UNKNOWN", "UNAVAILABLE"),
    ),
    "alpha.ping": OperationSpec(
        id="alpha.ping",
        plane="alpha",
        kind="mutation",
        field="ping",
        operation_name="AlphaPing",
        document=(
            "mutation AlphaPing($context: ContextInput!, $input: PingInput) {\n"
            "  ping(context: $context, input: $input)\n"
            "}"
        ),
        input_type="PingInput",
        result_type="Boolean!",
        returns="value",
        idempotency="ephemeral",
        context={"tenant": "required", "requestId": "required", "attempt": "optional", "permit": "forbidden", "tags": "optional"},
        echo_path=(),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("INVALID_REQUEST", "UNAVAILABLE"),
    ),
    "beta.capabilities": OperationSpec(
        id="beta.capabilities",
        plane="beta",
        kind="query",
        field="capabilities",
        operation_name="BetaCapabilities",
        document=(
            "query BetaCapabilities($context: ContextInput!) {\n"
            "  capabilities(context: $context) {\n"
            "    version\n"
            "    wssUrl\n"
            "    features\n"
            "  }\n"
            "}"
        ),
        input_type=None,
        result_type="Capabilities!",
        returns="value",
        idempotency="safe",
        context={"tenant": "optional", "requestId": "required", "attempt": "optional", "permit": "forbidden", "tags": "optional"},
        echo_path=(),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("INVALID_REQUEST", "UNAVAILABLE"),
    ),
    "beta.resolveRequest": OperationSpec(
        id="beta.resolveRequest",
        plane="beta",
        kind="query",
        field="resolveRequest",
        operation_name="BetaResolveRequest",
        document=(
            "query BetaResolveRequest($context: ContextInput!, $input: ResolveInput!) {\n"
            "  resolveRequest(context: $context, input: $input) {\n"
            "    requestId\n"
            "    committed\n"
            "    sequence\n"
            "  }\n"
            "}"
        ),
        input_type="ResolveInput",
        result_type="Receipt!",
        returns="value",
        idempotency="safe",
        context={"tenant": "optional", "requestId": "required", "attempt": "optional", "permit": "forbidden", "tags": "optional"},
        echo_path=(),
        echo=("requestId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("INVALID_REQUEST", "NOT_FOUND", "UNAVAILABLE"),
    ),
    "beta.widgets": OperationSpec(
        id="beta.widgets",
        plane="beta",
        kind="query",
        field="widgets",
        operation_name="BetaWidgets",
        document=(
            "query BetaWidgets($context: ContextInput!, $input: WidgetsInput) {\n"
            "  widgets(context: $context, input: $input) {\n"
            "    requestId\n"
            "    result {\n"
            "      items {\n"
            "        id\n"
            "        label\n"
            "        state\n"
            "        revision\n"
            "      }\n"
            "      complete\n"
            "      refreshRequired\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="WidgetsInput",
        result_type="WidgetsPayload!",
        returns="optional_result",
        idempotency="safe",
        context={"tenant": "optional", "requestId": "required", "attempt": "optional", "permit": "forbidden", "tags": "optional"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=PaginationSpec(style="bounded", page_path=("result",), page_type="WidgetPage", item_type="Widget", limit_field=None, cursor_field=None),
        long_running=None,
        errors=("INVALID_REQUEST", "TRANSPORT_UNKNOWN", "UNAVAILABLE"),
    ),
    "beta.createWidget": OperationSpec(
        id="beta.createWidget",
        plane="beta",
        kind="mutation",
        field="createWidget",
        operation_name="BetaCreateWidget",
        document=(
            "mutation BetaCreateWidget($context: ContextInput!, $input: CreateWidgetInput!) {\n"
            "  createWidget(context: $context, input: $input) {\n"
            "    id\n"
            "    label\n"
            "    state\n"
            "    revision\n"
            "  }\n"
            "}"
        ),
        input_type="CreateWidgetInput",
        result_type="Widget!",
        returns="value",
        idempotency="singleUse",
        context={"tenant": "optional", "requestId": "required", "attempt": "optional", "permit": "forbidden", "tags": "optional"},
        echo_path=(),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("INVALID_REQUEST", "TRANSPORT_UNKNOWN", "UNAVAILABLE"),
    ),
    "beta.requestAccess": OperationSpec(
        id="beta.requestAccess",
        plane="beta",
        kind="mutation",
        field="requestAccess",
        operation_name="BetaRequestAccess",
        document=(
            "mutation BetaRequestAccess($context: ContextInput!, $input: RequestAccessInput!) {\n"
            "  requestAccess(context: $context, input: $input) {\n"
            "    requestId\n"
            "    committed\n"
            "    sequence\n"
            "  }\n"
            "}"
        ),
        input_type="RequestAccessInput",
        result_type="Receipt!",
        returns="value",
        idempotency="replayOnly",
        context={"tenant": "optional", "requestId": "required", "attempt": "optional", "permit": "forbidden", "tags": "optional"},
        echo_path=(),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("INVALID_REQUEST", "TRANSPORT_UNKNOWN", "UNAVAILABLE"),
    ),
    "beta.claimWidget": OperationSpec(
        id="beta.claimWidget",
        plane="beta",
        kind="mutation",
        field="claimWidget",
        operation_name="BetaClaimWidget",
        document=(
            "mutation BetaClaimWidget($context: ContextInput!, $input: ClaimWidgetInput!) {\n"
            "  claimWidget(context: $context, input: $input) {\n"
            "    id\n"
            "    label\n"
            "    state\n"
            "    revision\n"
            "  }\n"
            "}"
        ),
        input_type="ClaimWidgetInput",
        result_type="Widget!",
        returns="value",
        idempotency="replayOnly",
        context={"tenant": "optional", "requestId": "required", "attempt": "optional", "permit": "forbidden", "tags": "optional"},
        echo_path=(),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("INVALID_REQUEST", "TRANSPORT_UNKNOWN", "UNAVAILABLE"),
    ),
}
"""Operations a server runtime calls with a bearer credential or without a credential, by IR id."""


OBJECTS: Mapping[str, Mapping[str, str]] = {
    "Capabilities": {
        "version": "String!",
        "wssUrl": "String",
        "features": "[String!]!",
    },
    "Receipt": {
        "requestId": "ID!",
        "committed": "Boolean!",
        "sequence": "Counter",
    },
    "Item": {
        "id": "ID!",
        "name": "String!",
        "fruit": "Fruit",
        "weight": "Float",
        "ripe": "Boolean!",
        "oldName": "String",
        "legacyCode": "Int",
        "grid": "[[Int!]]!",
        "aliases": "[String]",
        "history": "[[Fruit]!]",
    },
    "ItemPage": {
        "items": "[Item!]!",
        "complete": "Boolean!",
        "refreshRequired": "Boolean!",
        "nextCursor": "String",
    },
    "SubjectRef": {
        "kind": "String!",
        "id": "ID!",
    },
    "EventPayload": {
        "itemId": "ID",
        "jobId": "ID",
        "revision": "Counter",
        "note": "String",
    },
    "Event": {
        "sequence": "Counter!",
        "type": "String!",
        "subjectRef": "SubjectRef!",
        "payload": "EventPayload!",
    },
    "EventPage": {
        "items": "[Event!]!",
        "complete": "Boolean!",
        "refreshRequired": "Boolean!",
        "nextCursor": "String",
    },
    "JobRef": {
        "operationId": "ID!",
        "state": "String!",
    },
    "StartJobPayload": {
        "requestId": "ID!",
        "receipt": "Receipt!",
        "job": "JobRef",
    },
    "Job": {
        "operationId": "ID!",
        "state": "String!",
        "progress": "Float",
        "output": "Blob",
    },
    "Widget": {
        "id": "ID!",
        "label": "String",
        "state": "WidgetState!",
        "revision": "Counter!",
    },
    "WidgetPage": {
        "items": "[Widget!]!",
        "complete": "Boolean!",
        "refreshRequired": "Boolean!",
    },
    "WidgetsPayload": {
        "requestId": "ID!",
        "result": "WidgetPage",
    },
}
"""Output object fields and their GraphQL types."""


ENUMS: Mapping[str, tuple[str, ...]] = {
    "Fruit": ("BANANA", "APPLE", "cherry", "apple10", "apple9", "DATE", "ELDER"),
    "HTTPMethod": ("POST", "GET"),
    "WidgetState": ("ACTIVE", "ARCHIVED"),
}
"""Enum values in schema order."""


INPUTS: Mapping[str, Mapping[str, tuple[str, bool]]] = {
    "ResolveInput": {
        "requestId": ("ID!", False),
    },
    "ItemsInput": {
        "limit": ("Int", True),
        "cursor": ("String", False),
        "fruits": ("[Fruit!]", False),
        "minWeight": ("Float", False),
        "includeDeprecated": ("Boolean", True),
        "method": ("HTTPMethod", True),
        "box": ("Box_3dInput", False),
        "legacyFilter": ("String", False),
        "item2": ("Int", False),
        "item10": ("Int", False),
    },
    "Box_3dInput": {
        "width": ("Float!", False),
        "height": ("Float!", False),
        "depth": ("Float!", False),
    },
    "EventsInput": {
        "after": ("String", False),
        "limit": ("PageSize!", False),
    },
    "StartJobInput": {
        "itemId": ("ID!", False),
        "repeat": ("Int", True),
        "props": ("Blob", False),
    },
    "JobInput": {
        "operationId": ("ID!", False),
    },
    "PingInput": {
        "note": ("String", False),
    },
    "FetchInput": {
        "method": ("HTTPMethod", True),
    },
    "WidgetsInput": {
        "states": ("[WidgetState!]", False),
    },
    "ShapeInput": {
        "kind": ("String!", False),
        "sides": ("[Int!]!", False),
    },
    "RequestAccessInput": {
        "email": ("String!", False),
        "challenge": ("String!", False),
    },
    "ClaimWidgetInput": {
        "widgetId": ("ID!", False),
    },
    "CreateWidgetInput": {
        "label": ("String!", False),
        "state": ("WidgetState", True),
        "ratio": ("Ratio", True),
        "nested": ("[[Int!]!]", False),
        "shape": ("ShapeInput", True),
    },
}
"""Input object fields: their GraphQL type and whether the server has a default."""


SCALARS: Mapping[str, ScalarSpec] = {
    "Counter": ScalarSpec(representation="string", pattern="^(0|[1-9][0-9]*)$", maximum_decimal="9223372036854775807"),
    "Blob": ScalarSpec(representation="object", max_canonical_json_bytes=1024, required_string_properties=("signature",)),
    "PageSize": ScalarSpec(representation="integer", minimum=1, maximum=50),
    "String": ScalarSpec(representation="string"),
    "ID": ScalarSpec(representation="string"),
    "Int": ScalarSpec(representation="integer"),
    "Boolean": ScalarSpec(representation="boolean"),
    "Float": ScalarSpec(representation="number"),
    "Ratio": ScalarSpec(representation="number", minimum=0, maximum=1),
}
"""Scalars the operations use."""


IDEMPOTENCY: Mapping[str, IdempotencySpec] = {
    "ephemeral": IdempotencySpec(retry="none", resolvable=False, max_attempts=None, window_ms=None),
    "idempotent": IdempotencySpec(retry="sameRequest", resolvable=True, max_attempts=3, window_ms=60000),
    "permitBound": IdempotencySpec(retry="sameRequest", resolvable=False, max_attempts=3, window_ms=60000),
    "replayOnly": IdempotencySpec(retry="sameRequest", resolvable=False, max_attempts=3, window_ms=60000),
    "safe": IdempotencySpec(retry="repeat", resolvable=False, max_attempts=None, window_ms=None),
    "singleUse": IdempotencySpec(retry="sameRequest", resolvable=True, max_attempts=2, window_ms=1000),
}
"""Idempotency classes."""


PLANES: Mapping[str, str | None] = {
    "alpha": "alpha.resolveRequest",
    "beta": "beta.resolveRequest",
}
"""The operation that resolves an unknown mutation outcome, per plane."""


ERRORS: Mapping[str, ErrorSpec] = {
    "CURSOR_EXPIRED": ErrorSpec(summary="The cursor is too old.", origin="server", status=410, retryable=False),
    "INVALID_REQUEST": ErrorSpec(summary="The request is malformed.", origin="both", status=400, retryable=False),
    "NOT_FOUND": ErrorSpec(summary="The resource does not exist.", origin="server", status=404, retryable=False),
    "TRANSPORT_UNKNOWN": ErrorSpec(summary="The transport failed after sending.", origin="sdk", status=None, retryable=True),
    "UNAVAILABLE": ErrorSpec(summary="Temporarily unavailable.", origin="server", status=503, retryable=True),
}
"""Error codes."""
