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
    "communication.capabilities": OperationSpec(
        id="communication.capabilities",
        plane="communication",
        kind="query",
        field="capabilities",
        operation_name="CommunicationCapabilities",
        document=(
            "query CommunicationCapabilities($context: RequestContextInput!) {\n"
            "  capabilities(context: $context) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      serverRelease\n"
            "      capabilityRevision\n"
            "      limitsRevision\n"
            "      features {\n"
            "        chat\n"
            "        inbox\n"
            "        lexicalSearch\n"
            "        typing\n"
            "        webhooks\n"
            "        liveSessions\n"
            "        liveBroadcast\n"
            "      }\n"
            "      limits {\n"
            "        key\n"
            "        value {\n"
            "          maximum\n"
            "          unit\n"
            "          scope\n"
            "          milliseconds\n"
            "          policyId\n"
            "          revision\n"
            "        }\n"
            "      }\n"
            "      environment\n"
            "      productionQualified\n"
            "      mediaPolicy {\n"
            "        leasePolicyId\n"
            "        maxLeaseMs\n"
            "        renewAttemptMs\n"
            "        preludeMaxBytes\n"
            "        preludeTimeoutMs\n"
            "        clockProfileId\n"
            "      }\n"
            "      geoControlAuthorityId\n"
            "      offerings\n"
            "      geos\n"
            "      installationProfiles\n"
            "      portalIdentity\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type=None,
        result_type="CapabilitiesReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "required", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INVALID_REQUEST", "INVALID_RESPONSE", "RATE_LIMITED", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "communication.route": OperationSpec(
        id="communication.route",
        plane="communication",
        kind="query",
        field="route",
        operation_name="CommunicationRoute",
        document=(
            "query CommunicationRoute($context: RequestContextInput!) {\n"
            "  route(context: $context) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result\n"
            "  }\n"
            "}"
        ),
        input_type=None,
        result_type="RouteReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "required", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INVALID_REQUEST", "INVALID_RESPONSE", "RATE_LIMITED", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "communication.getPrincipal": OperationSpec(
        id="communication.getPrincipal",
        plane="communication",
        kind="query",
        field="getPrincipal",
        operation_name="CommunicationGetPrincipal",
        document=(
            "query CommunicationGetPrincipal($context: RequestContextInput!, $input: GetPrincipalRequestInput!) {\n"
            "  getPrincipal(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      principalId\n"
            "      externalUserId\n"
            "      status\n"
            "      revision\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="GetPrincipalRequestInput",
        result_type="GetPrincipalReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("principalId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "RATE_LIMITED", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.getConversation": OperationSpec(
        id="communication.getConversation",
        plane="communication",
        kind="query",
        field="getConversation",
        operation_name="CommunicationGetConversation",
        document=(
            "query CommunicationGetConversation($context: RequestContextInput!, $input: GetConversationRequestInput!) {\n"
            "  getConversation(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      conversationId\n"
            "      revision\n"
            "      title\n"
            "      props\n"
            "      latestSequence\n"
            "      membership {\n"
            "        conversationId\n"
            "        principalId\n"
            "        role\n"
            "        status\n"
            "        membershipEpoch\n"
            "        visibilityEpoch\n"
            "        revision\n"
            "        visibleFromSequence\n"
            "        canStartBroadcast\n"
            "      }\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="GetConversationRequestInput",
        result_type="GetConversationReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("conversationId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "RATE_LIMITED", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.members": OperationSpec(
        id="communication.members",
        plane="communication",
        kind="query",
        field="members",
        operation_name="CommunicationMembers",
        document=(
            "query CommunicationMembers($context: RequestContextInput!, $input: MembersRequestInput!) {\n"
            "  members(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      items {\n"
            "        conversationId\n"
            "        principalId\n"
            "        role\n"
            "        status\n"
            "        membershipEpoch\n"
            "        visibilityEpoch\n"
            "        revision\n"
            "        visibleFromSequence\n"
            "        canStartBroadcast\n"
            "      }\n"
            "      complete\n"
            "      refreshRequired\n"
            "      nextCursor\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="MembersRequestInput",
        result_type="MembersReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=("conversationId",),
        pagination=PaginationSpec(style="cursor", page_path=("result",), page_type="MemberPage", item_type="Member", limit_field="limit", cursor_field="cursor"),
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "RATE_LIMITED", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.messages": OperationSpec(
        id="communication.messages",
        plane="communication",
        kind="query",
        field="messages",
        operation_name="CommunicationMessages",
        document=(
            "query CommunicationMessages($context: RequestContextInput!, $input: MessagesRequestInput!) {\n"
            "  messages(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      items {\n"
            "        messageId\n"
            "        conversationId\n"
            "        authorId\n"
            "        sequence\n"
            "        revision\n"
            "        revisionSequence\n"
            "        createdAt\n"
            "        deleted\n"
            "        text\n"
            "        props\n"
            "        editedAt\n"
            "      }\n"
            "      complete\n"
            "      refreshRequired\n"
            "      nextCursor\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="MessagesRequestInput",
        result_type="MessagesReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=("conversationId",),
        pagination=PaginationSpec(style="sequence", page_path=("result",), page_type="MessagePage", item_type="Message", limit_field="limit", cursor_field="beforeSequence"),
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "PAGE_ITEM_TOO_LARGE", "RATE_LIMITED", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.getMessage": OperationSpec(
        id="communication.getMessage",
        plane="communication",
        kind="query",
        field="getMessage",
        operation_name="CommunicationGetMessage",
        document=(
            "query CommunicationGetMessage($context: RequestContextInput!, $input: GetMessageRequestInput!) {\n"
            "  getMessage(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      messageId\n"
            "      conversationId\n"
            "      authorId\n"
            "      sequence\n"
            "      revision\n"
            "      revisionSequence\n"
            "      createdAt\n"
            "      deleted\n"
            "      text\n"
            "      props\n"
            "      editedAt\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="GetMessageRequestInput",
        result_type="GetMessageReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("conversationId", "messageId"),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "MESSAGE_DELETED", "NOT_FOUND", "RATE_LIMITED", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.inbox": OperationSpec(
        id="communication.inbox",
        plane="communication",
        kind="query",
        field="inbox",
        operation_name="CommunicationInbox",
        document=(
            "query CommunicationInbox($context: RequestContextInput!, $input: InboxRequestInput!) {\n"
            "  inbox(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      items {\n"
            "        conversationId\n"
            "        title\n"
            "        activityAt\n"
            "        visibilityEpoch\n"
            "        latestVisibleMessage {\n"
            "          messageId\n"
            "          conversationId\n"
            "          authorId\n"
            "          sequence\n"
            "          revision\n"
            "          revisionSequence\n"
            "          createdAt\n"
            "          deleted\n"
            "          text\n"
            "          props\n"
            "          editedAt\n"
            "        }\n"
            "        hasUnread\n"
            "      }\n"
            "      complete\n"
            "      refreshRequired\n"
            "      nextCursor\n"
            "      partialReason\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="InboxRequestInput",
        result_type="InboxReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=PaginationSpec(style="cursor", page_path=("result",), page_type="InboxPage", item_type="InboxItem", limit_field="limit", cursor_field="cursor"),
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "CURSOR_EXPIRED", "CURSOR_SCOPE_MISMATCH", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "PAGE_ITEM_TOO_LARGE", "RATE_LIMITED", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.search": OperationSpec(
        id="communication.search",
        plane="communication",
        kind="query",
        field="search",
        operation_name="CommunicationSearch",
        document=(
            "query CommunicationSearch($context: RequestContextInput!, $input: SearchRequestInput!) {\n"
            "  search(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      items {\n"
            "        conversationId\n"
            "        message {\n"
            "          messageId\n"
            "          conversationId\n"
            "          authorId\n"
            "          sequence\n"
            "          revision\n"
            "          revisionSequence\n"
            "          createdAt\n"
            "          deleted\n"
            "          text\n"
            "          props\n"
            "          editedAt\n"
            "        }\n"
            "      }\n"
            "      complete\n"
            "      refreshRequired\n"
            "      nextCursor\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="SearchRequestInput",
        result_type="SearchReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=PaginationSpec(style="cursor", page_path=("result",), page_type="SearchPage", item_type="SearchHit", limit_field="pageSize", cursor_field="cursor"),
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "CURSOR_SCOPE_MISMATCH", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "PAGE_ITEM_TOO_LARGE", "RATE_LIMITED", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.resolveRequest": OperationSpec(
        id="communication.resolveRequest",
        plane="communication",
        kind="query",
        field="resolveRequest",
        operation_name="CommunicationResolveRequest",
        document=(
            "query CommunicationResolveRequest($context: RequestContextInput!, $input: ResolveRequestRequestInput!) {\n"
            "  resolveRequest(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      state\n"
            "      requestId\n"
            "      checkedAt\n"
            "      resultWithheld\n"
            "      receipt {\n"
            "        status\n"
            "        requestId\n"
            "        serverTime\n"
            "        receiptId\n"
            "        committedAt\n"
            "        replayed\n"
            "        operation {\n"
            "          operationId\n"
            "          owner\n"
            "          href\n"
            "          state\n"
            "        }\n"
            "        resourceRef {\n"
            "          kind\n"
            "          id\n"
            "        }\n"
            "        result {\n"
            "          agentGrant {\n"
            "            grantId\n"
            "            orgId\n"
            "            signupId\n"
            "            agentActorId\n"
            "            projectId\n"
            "            scopes\n"
            "            expiresAt\n"
            "            revokedAt\n"
            "            createdAt\n"
            "            keys {\n"
            "              operationId\n"
            "              state\n"
            "              scopes\n"
            "              expiresAt\n"
            "              keyId\n"
            "              deliveryId\n"
            "              deliveryExpiresAt\n"
            "            }\n"
            "          }\n"
            "          agentSignupStatus {\n"
            "            signupId\n"
            "            state\n"
            "            orgId\n"
            "            deploymentId\n"
            "            projectId\n"
            "            nextStep\n"
            "            scopes\n"
            "            grantExpiresAt\n"
            "            keys {\n"
            "              operationId\n"
            "              state\n"
            "              scopes\n"
            "              expiresAt\n"
            "              keyId\n"
            "              deliveryId\n"
            "              deliveryExpiresAt\n"
            "            }\n"
            "            incarnation\n"
            "            servingEpoch\n"
            "          }\n"
            "          billingCheckoutSession {\n"
            "            orgId\n"
            "            planId\n"
            "            url\n"
            "            expiresAt\n"
            "          }\n"
            "          billingPortalSession {\n"
            "            orgId\n"
            "            url\n"
            "            expiresAt\n"
            "          }\n"
            "          broadcastPermissionChanged {\n"
            "            member {\n"
            "              conversationId\n"
            "              principalId\n"
            "              role\n"
            "              status\n"
            "              membershipEpoch\n"
            "              visibilityEpoch\n"
            "              revision\n"
            "              visibleFromSequence\n"
            "              canStartBroadcast\n"
            "            }\n"
            "            mediaCutoff {\n"
            "              state\n"
            "              scope {\n"
            "                kind\n"
            "                liveSessionId\n"
            "                generation\n"
            "                participationId\n"
            "              }\n"
            "              evidence\n"
            "              enforcedAt\n"
            "              operationId\n"
            "            }\n"
            "          }\n"
            "          conversation {\n"
            "            conversationId\n"
            "            revision\n"
            "            title\n"
            "            props\n"
            "            latestSequence\n"
            "            membership {\n"
            "              conversationId\n"
            "              principalId\n"
            "              role\n"
            "              status\n"
            "              membershipEpoch\n"
            "              visibilityEpoch\n"
            "              revision\n"
            "              visibleFromSequence\n"
            "              canStartBroadcast\n"
            "            }\n"
            "          }\n"
            "          conversationMemberBatch {\n"
            "            items {\n"
            "              conversationId\n"
            "              principalId\n"
            "              role\n"
            "              status\n"
            "              membershipEpoch\n"
            "              visibilityEpoch\n"
            "              revision\n"
            "              visibleFromSequence\n"
            "              canStartBroadcast\n"
            "            }\n"
            "          }\n"
            "          conversationMute {\n"
            "            conversationId\n"
            "            principalId\n"
            "            muted\n"
            "            until\n"
            "          }\n"
            "          credentialDeliveryReceipt {\n"
            "            deliveryId\n"
            "          }\n"
            "          deliveryAck {\n"
            "            deliveryId\n"
            "            acknowledged\n"
            "          }\n"
            "          liveAlertBatch {\n"
            "            liveSessionId\n"
            "            created\n"
            "            suppressed\n"
            "          }\n"
            "          liveCredentialIssuance {\n"
            "            liveSessionId\n"
            "            participationId\n"
            "            generation\n"
            "            leaseId\n"
            "            grantOrdinal\n"
            "            admissionExpiresAt\n"
            "            leaseExpiresAt\n"
            "          }\n"
            "          liveSessionEndRequested {\n"
            "            liveSessionId\n"
            "            operationId\n"
            "            mediaCutoff {\n"
            "              state\n"
            "              scope {\n"
            "                kind\n"
            "                liveSessionId\n"
            "                generation\n"
            "                participationId\n"
            "              }\n"
            "              evidence\n"
            "              enforcedAt\n"
            "              operationId\n"
            "            }\n"
            "          }\n"
            "          liveSessionJoined {\n"
            "            liveSessionId\n"
            "            generation\n"
            "            participation {\n"
            "              participationId\n"
            "              principalId\n"
            "              membershipEpoch\n"
            "              role\n"
            "              state\n"
            "              permissions {\n"
            "                microphone\n"
            "                camera\n"
            "                subscribe\n"
            "              }\n"
            "              reservationExpiresAt\n"
            "              nativeConnectionId\n"
            "              mediaCutoff {\n"
            "                state\n"
            "                scope {\n"
            "                  kind\n"
            "                  liveSessionId\n"
            "                  generation\n"
            "                  participationId\n"
            "                }\n"
            "                evidence\n"
            "                enforcedAt\n"
            "                operationId\n"
            "              }\n"
            "            }\n"
            "          }\n"
            "          liveSessionLeft {\n"
            "            liveSessionId\n"
            "            participationId\n"
            "            mediaCutoff {\n"
            "              state\n"
            "              scope {\n"
            "                kind\n"
            "                liveSessionId\n"
            "                generation\n"
            "                participationId\n"
            "              }\n"
            "              evidence\n"
            "              enforcedAt\n"
            "              operationId\n"
            "            }\n"
            "          }\n"
            "          liveSessionStarted {\n"
            "            liveSessionId\n"
            "            conversationId\n"
            "            kind\n"
            "            mediaProfile\n"
            "            operationId\n"
            "          }\n"
            "          member {\n"
            "            conversationId\n"
            "            principalId\n"
            "            role\n"
            "            status\n"
            "            membershipEpoch\n"
            "            visibilityEpoch\n"
            "            revision\n"
            "            visibleFromSequence\n"
            "            canStartBroadcast\n"
            "          }\n"
            "          message {\n"
            "            messageId\n"
            "            conversationId\n"
            "            authorId\n"
            "            sequence\n"
            "            revision\n"
            "            revisionSequence\n"
            "            createdAt\n"
            "            deleted\n"
            "            text\n"
            "            props\n"
            "            editedAt\n"
            "          }\n"
            "          messageAck {\n"
            "            messageId\n"
            "            conversationId\n"
            "            sequence\n"
            "            revision\n"
            "            status\n"
            "            cursor {\n"
            "              incarnation\n"
            "              conversationId\n"
            "              sequence\n"
            "            }\n"
            "          }\n"
            "          organization {\n"
            "            orgId\n"
            "            name\n"
            "            status\n"
            "            revision\n"
            "          }\n"
            "          organizationSpend {\n"
            "            orgId\n"
            "            planId\n"
            "            currency\n"
            "            catalogVersion\n"
            "            monthlySpendCap\n"
            "            agentPurchaseLimit\n"
            "            updatedAt\n"
            "            monthlyMinimum\n"
            "            periodStart\n"
            "            periodEnd\n"
            "            credits\n"
            "            charges\n"
            "            margin\n"
            "            stop\n"
            "            refusedMeters\n"
            "            evaluatedAt\n"
            "            usageThrough\n"
            "            validUntil\n"
            "            minimumCredit\n"
            "            chargeLimit\n"
            "          }\n"
            "          principal {\n"
            "            principalId\n"
            "            externalUserId\n"
            "            status\n"
            "            revision\n"
            "          }\n"
            "          readReceipt {\n"
            "            principalId\n"
            "            membershipEpoch\n"
            "            visibilityEpoch\n"
            "            deliveredThroughSequence\n"
            "            readThroughSequence\n"
            "            updatedAt\n"
            "          }\n"
            "          sessionBootstrap {\n"
            "            session {\n"
            "              sessionId\n"
            "              principalId\n"
            "              deviceId\n"
            "              incarnation\n"
            "              sessionRevision\n"
            "              expiresAt\n"
            "              status\n"
            "            }\n"
            "            tokenExpiresAt\n"
            "            sessionToken\n"
            "          }\n"
            "          sessionRevocation {\n"
            "            sessionId\n"
            "            status\n"
            "            mediaCutoff {\n"
            "              state\n"
            "              scope {\n"
            "                kind\n"
            "                principalId\n"
            "                sessionId\n"
            "                deviceId\n"
            "                callId\n"
            "              }\n"
            "            }\n"
            "          }\n"
            "          signedProof\n"
            "        }\n"
            "      }\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="ResolveRequestRequestInput",
        result_type="ResolveRequestReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("requestId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "CREDENTIAL_EXPIRED", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "RATE_LIMITED", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.getOperation": OperationSpec(
        id="communication.getOperation",
        plane="communication",
        kind="query",
        field="getOperation",
        operation_name="CommunicationGetOperation",
        document=(
            "query CommunicationGetOperation($context: RequestContextInput!, $input: GetOperationRequestInput!) {\n"
            "  getOperation(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      operationId\n"
            "      kind\n"
            "      targetRef {\n"
            "        kind\n"
            "        id\n"
            "      }\n"
            "      state\n"
            "      revision\n"
            "      requestedAt\n"
            "      updatedAt\n"
            "      steps {\n"
            "        stepId\n"
            "        state\n"
            "      }\n"
            "      result {\n"
            "        projectId\n"
            "        incarnation\n"
            "        status\n"
            "        backend\n"
            "        environment\n"
            "        policyRevision\n"
            "        expiresAt\n"
            "        kind\n"
            "        resourceRef {\n"
            "          kind\n"
            "          id\n"
            "        }\n"
            "        delivery {\n"
            "          deliveryId\n"
            "          kind\n"
            "          projectId\n"
            "          installationId\n"
            "          resourceRef {\n"
            "            kind\n"
            "            id\n"
            "          }\n"
            "          expiresAt\n"
            "          payloadDigest\n"
            "          recipientActorRef {\n"
            "            tenantId\n"
            "            objectId\n"
            "          }\n"
            "        }\n"
            "        keyId\n"
            "        endpointId\n"
            "        enabled\n"
            "        liveSessionCompletion {\n"
            "          liveSessionId\n"
            "          generation\n"
            "          state\n"
            "          revision\n"
            "          completedAt\n"
            "          mediaCutoff {\n"
            "            state\n"
            "            scope {\n"
            "              kind\n"
            "              liveSessionId\n"
            "              generation\n"
            "              participationId\n"
            "            }\n"
            "            evidence\n"
            "            enforcedAt\n"
            "            operationId\n"
            "          }\n"
            "        }\n"
            "        replayedDeliveries\n"
            "        skippedDeliveries\n"
            "        messagePreview\n"
            "      }\n"
            "      blockedReason\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="GetOperationRequestInput",
        result_type="GetOperationReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("operationId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "RATE_LIMITED", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.conversationMute": OperationSpec(
        id="communication.conversationMute",
        plane="communication",
        kind="query",
        field="conversationMute",
        operation_name="CommunicationConversationMute",
        document=(
            "query CommunicationConversationMute($context: RequestContextInput!, $input: ConversationMuteInput!) {\n"
            "  conversationMute(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    result {\n"
            "      conversationId\n"
            "      principalId\n"
            "      muted\n"
            "      until\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="ConversationMuteInput",
        result_type="ConversationMuteReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("conversationId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "RATE_LIMITED", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.currentLiveSession": OperationSpec(
        id="communication.currentLiveSession",
        plane="communication",
        kind="query",
        field="currentLiveSession",
        operation_name="CommunicationCurrentLiveSession",
        document=(
            "query CommunicationCurrentLiveSession($context: RequestContextInput!, $input: ConversationLiveInput!) {\n"
            "  currentLiveSession(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    result {\n"
            "      liveSessionId\n"
            "      conversationId\n"
            "      creatorId\n"
            "      kind\n"
            "      mediaProfile\n"
            "      state\n"
            "      generation\n"
            "      revision\n"
            "      createdAt\n"
            "      expiresAt\n"
            "      myParticipation {\n"
            "        participationId\n"
            "        principalId\n"
            "        membershipEpoch\n"
            "        role\n"
            "        state\n"
            "        permissions {\n"
            "          microphone\n"
            "          camera\n"
            "          subscribe\n"
            "        }\n"
            "        reservationExpiresAt\n"
            "        nativeConnectionId\n"
            "        mediaCutoff {\n"
            "          state\n"
            "          scope {\n"
            "            kind\n"
            "            liveSessionId\n"
            "            generation\n"
            "            participationId\n"
            "          }\n"
            "          evidence\n"
            "          enforcedAt\n"
            "          operationId\n"
            "        }\n"
            "      }\n"
            "      mediaCutoff {\n"
            "        state\n"
            "        scope {\n"
            "          kind\n"
            "          liveSessionId\n"
            "          generation\n"
            "          participationId\n"
            "        }\n"
            "        evidence\n"
            "        enforcedAt\n"
            "        operationId\n"
            "      }\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="ConversationLiveInput",
        result_type="CurrentLiveSessionReply!",
        returns="optional_result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("conversationId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "RATE_LIMITED", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.liveSession": OperationSpec(
        id="communication.liveSession",
        plane="communication",
        kind="query",
        field="liveSession",
        operation_name="CommunicationLiveSession",
        document=(
            "query CommunicationLiveSession($context: RequestContextInput!, $input: LiveSessionInput!) {\n"
            "  liveSession(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    result {\n"
            "      liveSessionId\n"
            "      conversationId\n"
            "      creatorId\n"
            "      kind\n"
            "      mediaProfile\n"
            "      state\n"
            "      generation\n"
            "      revision\n"
            "      createdAt\n"
            "      expiresAt\n"
            "      myParticipation {\n"
            "        participationId\n"
            "        principalId\n"
            "        membershipEpoch\n"
            "        role\n"
            "        state\n"
            "        permissions {\n"
            "          microphone\n"
            "          camera\n"
            "          subscribe\n"
            "        }\n"
            "        reservationExpiresAt\n"
            "        nativeConnectionId\n"
            "        mediaCutoff {\n"
            "          state\n"
            "          scope {\n"
            "            kind\n"
            "            liveSessionId\n"
            "            generation\n"
            "            participationId\n"
            "          }\n"
            "          evidence\n"
            "          enforcedAt\n"
            "          operationId\n"
            "        }\n"
            "      }\n"
            "      mediaCutoff {\n"
            "        state\n"
            "        scope {\n"
            "          kind\n"
            "          liveSessionId\n"
            "          generation\n"
            "          participationId\n"
            "        }\n"
            "        evidence\n"
            "        enforcedAt\n"
            "        operationId\n"
            "      }\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="LiveSessionInput",
        result_type="LiveSessionReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("liveSessionId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "RATE_LIMITED", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.liveSessions": OperationSpec(
        id="communication.liveSessions",
        plane="communication",
        kind="query",
        field="liveSessions",
        operation_name="CommunicationLiveSessions",
        document=(
            "query CommunicationLiveSessions($context: RequestContextInput!, $input: LiveSessionsInput!) {\n"
            "  liveSessions(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    result {\n"
            "      items {\n"
            "        liveSessionId\n"
            "        conversationId\n"
            "        creatorId\n"
            "        kind\n"
            "        mediaProfile\n"
            "        state\n"
            "        generation\n"
            "        revision\n"
            "        createdAt\n"
            "        expiresAt\n"
            "        myParticipation {\n"
            "          participationId\n"
            "          principalId\n"
            "          membershipEpoch\n"
            "          role\n"
            "          state\n"
            "          permissions {\n"
            "            microphone\n"
            "            camera\n"
            "            subscribe\n"
            "          }\n"
            "          reservationExpiresAt\n"
            "          nativeConnectionId\n"
            "          mediaCutoff {\n"
            "            state\n"
            "            scope {\n"
            "              kind\n"
            "              liveSessionId\n"
            "              generation\n"
            "              participationId\n"
            "            }\n"
            "            evidence\n"
            "            enforcedAt\n"
            "            operationId\n"
            "          }\n"
            "        }\n"
            "        mediaCutoff {\n"
            "          state\n"
            "          scope {\n"
            "            kind\n"
            "            liveSessionId\n"
            "            generation\n"
            "            participationId\n"
            "          }\n"
            "          evidence\n"
            "          enforcedAt\n"
            "          operationId\n"
            "        }\n"
            "      }\n"
            "      nextCursor\n"
            "      complete\n"
            "      partialReason\n"
            "      refreshRequired\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="LiveSessionsInput",
        result_type="LiveSessionPageReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=("conversationId",),
        pagination=PaginationSpec(style="cursor", page_path=("result",), page_type="LiveSessionPage", item_type="LiveSession", limit_field="limit", cursor_field="cursor"),
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "CURSOR_INVALID", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "RATE_LIMITED", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.liveSessionParticipants": OperationSpec(
        id="communication.liveSessionParticipants",
        plane="communication",
        kind="query",
        field="liveSessionParticipants",
        operation_name="CommunicationLiveSessionParticipants",
        document=(
            "query CommunicationLiveSessionParticipants($context: RequestContextInput!, $input: LiveParticipantsInput!) {\n"
            "  liveSessionParticipants(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    result {\n"
            "      items {\n"
            "        participationId\n"
            "        principalId\n"
            "        membershipEpoch\n"
            "        role\n"
            "        state\n"
            "        permissions {\n"
            "          microphone\n"
            "          camera\n"
            "          subscribe\n"
            "        }\n"
            "        reservationExpiresAt\n"
            "        nativeConnectionId\n"
            "        mediaCutoff {\n"
            "          state\n"
            "          scope {\n"
            "            kind\n"
            "            liveSessionId\n"
            "            generation\n"
            "            participationId\n"
            "          }\n"
            "          evidence\n"
            "          enforcedAt\n"
            "          operationId\n"
            "        }\n"
            "      }\n"
            "      nextCursor\n"
            "      complete\n"
            "      partialReason\n"
            "      refreshRequired\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="LiveParticipantsInput",
        result_type="LiveParticipantPageReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=PaginationSpec(style="cursor", page_path=("result",), page_type="LiveParticipantPage", item_type="LiveParticipation", limit_field="limit", cursor_field="cursor"),
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "CURSOR_INVALID", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "RATE_LIMITED", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.liveSessionOperation": OperationSpec(
        id="communication.liveSessionOperation",
        plane="communication",
        kind="query",
        field="liveSessionOperation",
        operation_name="CommunicationLiveSessionOperation",
        document=(
            "query CommunicationLiveSessionOperation($context: RequestContextInput!, $input: LiveSessionOperationInput!) {\n"
            "  liveSessionOperation(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    result {\n"
            "      operationId\n"
            "      requestId\n"
            "      liveSessionId\n"
            "      kind\n"
            "      state\n"
            "      revision\n"
            "      requestedAt\n"
            "      completedAt\n"
            "      completion {\n"
            "        liveSessionId\n"
            "        generation\n"
            "        state\n"
            "        revision\n"
            "        completedAt\n"
            "        mediaCutoff {\n"
            "          state\n"
            "          scope {\n"
            "            kind\n"
            "            liveSessionId\n"
            "            generation\n"
            "            participationId\n"
            "          }\n"
            "          evidence\n"
            "          enforcedAt\n"
            "          operationId\n"
            "        }\n"
            "      }\n"
            "      failure {\n"
            "        code\n"
            "        message\n"
            "      }\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="LiveSessionOperationInput",
        result_type="LiveSessionOperationReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("operationId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "RATE_LIMITED", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.sessionRequestOutcome": OperationSpec(
        id="communication.sessionRequestOutcome",
        plane="communication",
        kind="query",
        field="sessionRequestOutcome",
        operation_name="CommunicationSessionRequestOutcome",
        document=(
            "query CommunicationSessionRequestOutcome($context: RequestContextInput!, $input: SessionRequestOutcomeRequestInput!) {\n"
            "  sessionRequestOutcome(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    result {\n"
            "      state\n"
            "      requestId\n"
            "      checkedAt\n"
            "      operation\n"
            "      receiptId\n"
            "      committedAt\n"
            "      originalSession {\n"
            "        sessionId\n"
            "        principalId\n"
            "        deviceId\n"
            "        incarnation\n"
            "        sessionRevision\n"
            "        expiresAt\n"
            "        status\n"
            "      }\n"
            "      currentSession {\n"
            "        sessionId\n"
            "        principalId\n"
            "        deviceId\n"
            "        incarnation\n"
            "        sessionRevision\n"
            "        expiresAt\n"
            "        status\n"
            "      }\n"
            "      currentState\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="SessionRequestOutcomeRequestInput",
        result_type="SessionRequestOutcomeReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("requestId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_A_SESSION_REQUEST", "NOT_FOUND", "RATE_LIMITED", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "SCOPE_REQUIRED", "SESSION_RECEIPT_BINDING_MISMATCH", "SESSION_RECEIPT_INVALID", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.createPrincipal": OperationSpec(
        id="communication.createPrincipal",
        plane="communication",
        kind="mutation",
        field="createPrincipal",
        operation_name="CommunicationCreatePrincipal",
        document=(
            "mutation CommunicationCreatePrincipal($context: RequestContextInput!, $input: CreatePrincipalRequestInput!) {\n"
            "  createPrincipal(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      principalId\n"
            "      externalUserId\n"
            "      status\n"
            "      revision\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="CreatePrincipalRequestInput",
        result_type="CreatePrincipalReply!",
        returns="result",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("externalUserId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "ALREADY_EXISTS", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "OUTCOME_UNKNOWN", "RATE_LIMITED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_EXPIRED", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.disablePrincipal": OperationSpec(
        id="communication.disablePrincipal",
        plane="communication",
        kind="mutation",
        field="disablePrincipal",
        operation_name="CommunicationDisablePrincipal",
        document=(
            "mutation CommunicationDisablePrincipal($context: RequestContextInput!, $input: DisablePrincipalRequestInput!) {\n"
            "  disablePrincipal(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      principalId\n"
            "      externalUserId\n"
            "      status\n"
            "      revision\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="DisablePrincipalRequestInput",
        result_type="DisablePrincipalReply!",
        returns="result",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("principalId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "RATE_LIMITED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_EXPIRED", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "REVISION_CONFLICT", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.issueSession": OperationSpec(
        id="communication.issueSession",
        plane="communication",
        kind="mutation",
        field="issueSession",
        operation_name="CommunicationIssueSession",
        document=(
            "mutation CommunicationIssueSession($context: RequestContextInput!, $input: IssueSessionRequestInput!) {\n"
            "  issueSession(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      session {\n"
            "        sessionId\n"
            "        principalId\n"
            "        deviceId\n"
            "        incarnation\n"
            "        sessionRevision\n"
            "        expiresAt\n"
            "        status\n"
            "      }\n"
            "      tokenExpiresAt\n"
            "      sessionToken\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="IssueSessionRequestInput",
        result_type="IssueSessionReply!",
        returns="result",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "CREDENTIAL_EXPIRED", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "RATE_LIMITED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_EXPIRED", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.renewSession": OperationSpec(
        id="communication.renewSession",
        plane="communication",
        kind="mutation",
        field="renewSession",
        operation_name="CommunicationRenewSession",
        document=(
            "mutation CommunicationRenewSession($context: RequestContextInput!, $input: RenewSessionRequestInput!) {\n"
            "  renewSession(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      session {\n"
            "        sessionId\n"
            "        principalId\n"
            "        deviceId\n"
            "        incarnation\n"
            "        sessionRevision\n"
            "        expiresAt\n"
            "        status\n"
            "      }\n"
            "      tokenExpiresAt\n"
            "      sessionToken\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="RenewSessionRequestInput",
        result_type="RenewSessionReply!",
        returns="result",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "CREDENTIAL_EXPIRED", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "RATE_LIMITED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_EXPIRED", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "REVISION_CONFLICT", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.revokeSession": OperationSpec(
        id="communication.revokeSession",
        plane="communication",
        kind="mutation",
        field="revokeSession",
        operation_name="CommunicationRevokeSession",
        document=(
            "mutation CommunicationRevokeSession($context: RequestContextInput!, $input: RevokeSessionRequestInput!) {\n"
            "  revokeSession(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      sessionId\n"
            "      status\n"
            "      mediaCutoff {\n"
            "        state\n"
            "        scope {\n"
            "          kind\n"
            "          principalId\n"
            "          sessionId\n"
            "          deviceId\n"
            "          callId\n"
            "        }\n"
            "      }\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="RevokeSessionRequestInput",
        result_type="RevokeSessionReply!",
        returns="result",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("sessionId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "RATE_LIMITED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_EXPIRED", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "REVISION_CONFLICT", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.createConversation": OperationSpec(
        id="communication.createConversation",
        plane="communication",
        kind="mutation",
        field="createConversation",
        operation_name="CommunicationCreateConversation",
        document=(
            "mutation CommunicationCreateConversation($context: RequestContextInput!, $input: CreateConversationRequestInput!) {\n"
            "  createConversation(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      conversationId\n"
            "      revision\n"
            "      title\n"
            "      props\n"
            "      latestSequence\n"
            "      membership {\n"
            "        conversationId\n"
            "        principalId\n"
            "        role\n"
            "        status\n"
            "        membershipEpoch\n"
            "        visibilityEpoch\n"
            "        revision\n"
            "        visibleFromSequence\n"
            "        canStartBroadcast\n"
            "      }\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="CreateConversationRequestInput",
        result_type="CreateConversationReply!",
        returns="result",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "MEMBERSHIP_COUNT_INVALID", "MEMBER_LIMIT", "NOT_FOUND", "OUTCOME_UNKNOWN", "RATE_LIMITED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_EXPIRED", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.updateConversation": OperationSpec(
        id="communication.updateConversation",
        plane="communication",
        kind="mutation",
        field="updateConversation",
        operation_name="CommunicationUpdateConversation",
        document=(
            "mutation CommunicationUpdateConversation($context: RequestContextInput!, $input: UpdateConversationRequestInput!) {\n"
            "  updateConversation(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      conversationId\n"
            "      revision\n"
            "      title\n"
            "      props\n"
            "      latestSequence\n"
            "      membership {\n"
            "        conversationId\n"
            "        principalId\n"
            "        role\n"
            "        status\n"
            "        membershipEpoch\n"
            "        visibilityEpoch\n"
            "        revision\n"
            "        visibleFromSequence\n"
            "        canStartBroadcast\n"
            "      }\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="UpdateConversationRequestInput",
        result_type="UpdateConversationReply!",
        returns="result",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("conversationId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "RATE_LIMITED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_EXPIRED", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "REVISION_CONFLICT", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.addMember": OperationSpec(
        id="communication.addMember",
        plane="communication",
        kind="mutation",
        field="addMember",
        operation_name="CommunicationAddMember",
        document=(
            "mutation CommunicationAddMember($context: RequestContextInput!, $input: AddMemberRequestInput!) {\n"
            "  addMember(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      conversationId\n"
            "      principalId\n"
            "      role\n"
            "      status\n"
            "      membershipEpoch\n"
            "      visibilityEpoch\n"
            "      revision\n"
            "      visibleFromSequence\n"
            "      canStartBroadcast\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="AddMemberRequestInput",
        result_type="AddMemberReply!",
        returns="result",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("conversationId", "principalId"),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "MEMBERSHIP_COUNT_INVALID", "MEMBER_LIMIT", "NOT_FOUND", "OUTCOME_UNKNOWN", "RATE_LIMITED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_EXPIRED", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "REVISION_CONFLICT", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.addMembers": OperationSpec(
        id="communication.addMembers",
        plane="communication",
        kind="mutation",
        field="addMembers",
        operation_name="CommunicationAddMembers",
        document=(
            "mutation CommunicationAddMembers($context: RequestContextInput!, $input: AddMembersInput!) {\n"
            "  addMembers(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    result {\n"
            "      items {\n"
            "        conversationId\n"
            "        principalId\n"
            "        role\n"
            "        status\n"
            "        membershipEpoch\n"
            "        visibilityEpoch\n"
            "        revision\n"
            "        visibleFromSequence\n"
            "        canStartBroadcast\n"
            "      }\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="AddMembersInput",
        result_type="AddMembersPayload!",
        returns="result",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "MEMBERSHIP_COUNT_INVALID", "MEMBER_LIMIT", "NOT_FOUND", "OUTCOME_UNKNOWN", "RATE_LIMITED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_EXPIRED", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "REVISION_CONFLICT", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.removeMember": OperationSpec(
        id="communication.removeMember",
        plane="communication",
        kind="mutation",
        field="removeMember",
        operation_name="CommunicationRemoveMember",
        document=(
            "mutation CommunicationRemoveMember($context: RequestContextInput!, $input: RemoveMemberRequestInput!) {\n"
            "  removeMember(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      conversationId\n"
            "      principalId\n"
            "      role\n"
            "      status\n"
            "      membershipEpoch\n"
            "      visibilityEpoch\n"
            "      revision\n"
            "      visibleFromSequence\n"
            "      canStartBroadcast\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="RemoveMemberRequestInput",
        result_type="RemoveMemberReply!",
        returns="result",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("conversationId", "principalId"),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "MEMBERSHIP_COUNT_INVALID", "NOT_FOUND", "OUTCOME_UNKNOWN", "RATE_LIMITED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_EXPIRED", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "REVISION_CONFLICT", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.historyGrant": OperationSpec(
        id="communication.historyGrant",
        plane="communication",
        kind="mutation",
        field="historyGrant",
        operation_name="CommunicationHistoryGrant",
        document=(
            "mutation CommunicationHistoryGrant($context: RequestContextInput!, $input: HistoryGrantRequestInput!) {\n"
            "  historyGrant(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      conversationId\n"
            "      principalId\n"
            "      role\n"
            "      status\n"
            "      membershipEpoch\n"
            "      visibilityEpoch\n"
            "      revision\n"
            "      visibleFromSequence\n"
            "      canStartBroadcast\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="HistoryGrantRequestInput",
        result_type="HistoryGrantReply!",
        returns="result",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("conversationId", "principalId"),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "RATE_LIMITED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_EXPIRED", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "REVISION_CONFLICT", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.sendMessage": OperationSpec(
        id="communication.sendMessage",
        plane="communication",
        kind="mutation",
        field="sendMessage",
        operation_name="CommunicationSendMessage",
        document=(
            "mutation CommunicationSendMessage($context: RequestContextInput!, $input: SendMessageRequestInput!) {\n"
            "  sendMessage(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      messageId\n"
            "      conversationId\n"
            "      sequence\n"
            "      revision\n"
            "      status\n"
            "      cursor {\n"
            "        incarnation\n"
            "        conversationId\n"
            "        sequence\n"
            "      }\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="SendMessageRequestInput",
        result_type="SendMessageReply!",
        returns="result",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("conversationId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "CREDITS_EXHAUSTED", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "PLAN_LIMIT_EXCEEDED", "QUOTA_EXCEEDED", "RATE_LIMITED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_EXPIRED", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "SCOPE_REQUIRED", "SPEND_CAP_REACHED", "SPEND_UNVERIFIED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.editMessage": OperationSpec(
        id="communication.editMessage",
        plane="communication",
        kind="mutation",
        field="editMessage",
        operation_name="CommunicationEditMessage",
        document=(
            "mutation CommunicationEditMessage($context: RequestContextInput!, $input: EditMessageRequestInput!) {\n"
            "  editMessage(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      messageId\n"
            "      conversationId\n"
            "      authorId\n"
            "      sequence\n"
            "      revision\n"
            "      revisionSequence\n"
            "      createdAt\n"
            "      deleted\n"
            "      text\n"
            "      props\n"
            "      editedAt\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="EditMessageRequestInput",
        result_type="EditMessageReply!",
        returns="result",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("conversationId", "messageId"),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "MESSAGE_DELETED", "NOT_FOUND", "OUTCOME_UNKNOWN", "RATE_LIMITED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_EXPIRED", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "REVISION_CONFLICT", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.deleteMessage": OperationSpec(
        id="communication.deleteMessage",
        plane="communication",
        kind="mutation",
        field="deleteMessage",
        operation_name="CommunicationDeleteMessage",
        document=(
            "mutation CommunicationDeleteMessage($context: RequestContextInput!, $input: DeleteMessageRequestInput!) {\n"
            "  deleteMessage(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      messageId\n"
            "      conversationId\n"
            "      authorId\n"
            "      sequence\n"
            "      revision\n"
            "      revisionSequence\n"
            "      createdAt\n"
            "      deleted\n"
            "      text\n"
            "      props\n"
            "      editedAt\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="DeleteMessageRequestInput",
        result_type="DeleteMessageReply!",
        returns="result",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("conversationId", "messageId"),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "MESSAGE_DELETED", "NOT_FOUND", "OUTCOME_UNKNOWN", "RATE_LIMITED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_EXPIRED", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "REVISION_CONFLICT", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.setBroadcastPermission": OperationSpec(
        id="communication.setBroadcastPermission",
        plane="communication",
        kind="mutation",
        field="setBroadcastPermission",
        operation_name="CommunicationSetBroadcastPermission",
        document=(
            "mutation CommunicationSetBroadcastPermission($context: RequestContextInput!, $input: SetBroadcastPermissionInput!) {\n"
            "  setBroadcastPermission(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    result {\n"
            "      member {\n"
            "        conversationId\n"
            "        principalId\n"
            "        role\n"
            "        status\n"
            "        membershipEpoch\n"
            "        visibilityEpoch\n"
            "        revision\n"
            "        visibleFromSequence\n"
            "        canStartBroadcast\n"
            "      }\n"
            "      mediaCutoff {\n"
            "        state\n"
            "        scope {\n"
            "          kind\n"
            "          liveSessionId\n"
            "          generation\n"
            "          participationId\n"
            "        }\n"
            "        evidence\n"
            "        enforcedAt\n"
            "        operationId\n"
            "      }\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="SetBroadcastPermissionInput",
        result_type="SetBroadcastPermissionPayload!",
        returns="result",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "RATE_LIMITED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_EXPIRED", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "REVISION_CONFLICT", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.setConversationMute": OperationSpec(
        id="communication.setConversationMute",
        plane="communication",
        kind="mutation",
        field="setConversationMute",
        operation_name="CommunicationSetConversationMute",
        document=(
            "mutation CommunicationSetConversationMute($context: RequestContextInput!, $input: SetConversationMuteInput!) {\n"
            "  setConversationMute(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    result {\n"
            "      conversationId\n"
            "      principalId\n"
            "      muted\n"
            "      until\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="SetConversationMuteInput",
        result_type="SetConversationMutePayload!",
        returns="result",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("conversationId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "RATE_LIMITED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_EXPIRED", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.alertLiveSession": OperationSpec(
        id="communication.alertLiveSession",
        plane="communication",
        kind="mutation",
        field="alertLiveSession",
        operation_name="CommunicationAlertLiveSession",
        document=(
            "mutation CommunicationAlertLiveSession($context: RequestContextInput!, $input: AlertLiveSessionInput!) {\n"
            "  alertLiveSession(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    result {\n"
            "      liveSessionId\n"
            "      created\n"
            "      suppressed\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="AlertLiveSessionInput",
        result_type="AlertLiveSessionPayload!",
        returns="result",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("liveSessionId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GENERATION_CONFLICT", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "LIVE_ALERT_LIMIT", "LIVE_SESSION_CLOSED", "NOT_FOUND", "OUTCOME_UNKNOWN", "PARTICIPATION_MISMATCH", "RATE_LIMITED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_EXPIRED", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "communication.endLiveSession": OperationSpec(
        id="communication.endLiveSession",
        plane="communication",
        kind="mutation",
        field="endLiveSession",
        operation_name="CommunicationEndLiveSession",
        document=(
            "mutation CommunicationEndLiveSession($context: RequestContextInput!, $input: EndLiveSessionInput!) {\n"
            "  endLiveSession(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    result {\n"
            "      liveSessionId\n"
            "      operationId\n"
            "      mediaCutoff {\n"
            "        state\n"
            "        scope {\n"
            "          kind\n"
            "          liveSessionId\n"
            "          generation\n"
            "          participationId\n"
            "        }\n"
            "        evidence\n"
            "        enforcedAt\n"
            "        operationId\n"
            "      }\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="EndLiveSessionInput",
        result_type="EndLiveSessionPayload!",
        returns="value",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "required", "incarnation": "required", "observedServingEpoch": "required", "credentialDeliveryPermit": "forbidden"},
        echo_path=(),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running="communication.liveSessionOperation",
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GENERATION_CONFLICT", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INCARNATION_MISMATCH", "INVALID_REQUEST", "INVALID_RESPONSE", "LIVE_SESSION_CLOSED", "MEDIA_FENCE_REQUIRED", "NOT_FOUND", "OUTCOME_UNKNOWN", "PARTICIPATION_MISMATCH", "RATE_LIMITED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_EXPIRED", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "REVISION_CONFLICT", "SCOPE_REQUIRED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WRONG_REGION"),
    ),
    "management.capabilities": OperationSpec(
        id="management.capabilities",
        plane="management",
        kind="query",
        field="capabilities",
        operation_name="ManagementCapabilities",
        document=(
            "query ManagementCapabilities($context: RequestContextInput!) {\n"
            "  capabilities(context: $context) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      serverRelease\n"
            "      capabilityRevision\n"
            "      limitsRevision\n"
            "      features {\n"
            "        chat\n"
            "        inbox\n"
            "        lexicalSearch\n"
            "        typing\n"
            "        webhooks\n"
            "        liveSessions\n"
            "        liveBroadcast\n"
            "      }\n"
            "      limits {\n"
            "        key\n"
            "        value {\n"
            "          maximum\n"
            "          unit\n"
            "          scope\n"
            "          milliseconds\n"
            "          policyId\n"
            "          revision\n"
            "        }\n"
            "      }\n"
            "      environment\n"
            "      productionQualified\n"
            "      mediaPolicy {\n"
            "        leasePolicyId\n"
            "        maxLeaseMs\n"
            "        renewAttemptMs\n"
            "        preludeMaxBytes\n"
            "        preludeTimeoutMs\n"
            "        clockProfileId\n"
            "      }\n"
            "      geoControlAuthorityId\n"
            "      offerings\n"
            "      geos\n"
            "      installationProfiles\n"
            "      portalIdentity\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type=None,
        result_type="CapabilitiesReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INVALID_REQUEST", "INVALID_RESPONSE", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.organizations": OperationSpec(
        id="management.organizations",
        plane="management",
        kind="query",
        field="organizations",
        operation_name="ManagementOrganizations",
        document=(
            "query ManagementOrganizations($context: RequestContextInput!) {\n"
            "  organizations(context: $context) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      items {\n"
            "        orgId\n"
            "        name\n"
            "        status\n"
            "        revision\n"
            "      }\n"
            "      complete\n"
            "      refreshRequired\n"
            "      nextCursor\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type=None,
        result_type="OrganizationsReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=PaginationSpec(style="bounded", page_path=("result",), page_type="OrganizationPage", item_type="Organization", limit_field=None, cursor_field=None),
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INVALID_REQUEST", "INVALID_RESPONSE", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.getOrganization": OperationSpec(
        id="management.getOrganization",
        plane="management",
        kind="query",
        field="getOrganization",
        operation_name="ManagementGetOrganization",
        document=(
            "query ManagementGetOrganization($context: RequestContextInput!, $input: GetOrganizationRequestInput!) {\n"
            "  getOrganization(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      orgId\n"
            "      name\n"
            "      status\n"
            "      revision\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="GetOrganizationRequestInput",
        result_type="GetOrganizationReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("orgId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.getDeployment": OperationSpec(
        id="management.getDeployment",
        plane="management",
        kind="query",
        field="getDeployment",
        operation_name="ManagementGetDeployment",
        document=(
            "query ManagementGetDeployment($context: RequestContextInput!, $input: GetDeploymentRequestInput!) {\n"
            "  getDeployment(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      deploymentId\n"
            "      orgId\n"
            "      offering\n"
            "      geoId\n"
            "      installationId\n"
            "      resourceOwner\n"
            "      approvedRegions\n"
            "      readiness\n"
            "      revision\n"
            "      consentRef\n"
            "      environment\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="GetDeploymentRequestInput",
        result_type="GetDeploymentReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("deploymentId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.getProject": OperationSpec(
        id="management.getProject",
        plane="management",
        kind="query",
        field="getProject",
        operation_name="ManagementGetProject",
        document=(
            "query ManagementGetProject($context: RequestContextInput!, $input: GetProjectRequestInput!) {\n"
            "  getProject(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      projectId\n"
            "      deploymentId\n"
            "      name\n"
            "      environment\n"
            "      incarnation\n"
            "      servingRegion\n"
            "      servingEpoch\n"
            "      status\n"
            "      revision\n"
            "      policyRevision\n"
            "      messagePreview\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="GetProjectRequestInput",
        result_type="GetProjectReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("projectId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.deploymentHealth": OperationSpec(
        id="management.deploymentHealth",
        plane="management",
        kind="query",
        field="deploymentHealth",
        operation_name="ManagementDeploymentHealth",
        document=(
            "query ManagementDeploymentHealth($context: RequestContextInput!, $input: DeploymentHealthRequestInput!) {\n"
            "  deploymentHealth(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      deploymentId\n"
            "      readiness\n"
            "      observedAt\n"
            "      services {\n"
            "        role\n"
            "        observedAt\n"
            "        details {\n"
            "          status\n"
            "        }\n"
            "      }\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="DeploymentHealthRequestInput",
        result_type="DeploymentHealthReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("deploymentId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.deploymentUsage": OperationSpec(
        id="management.deploymentUsage",
        plane="management",
        kind="query",
        field="deploymentUsage",
        operation_name="ManagementDeploymentUsage",
        document=(
            "query ManagementDeploymentUsage($context: RequestContextInput!, $input: DeploymentUsageRequestInput!) {\n"
            "  deploymentUsage(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      deploymentId\n"
            "      source\n"
            "      observedAt\n"
            "      complete\n"
            "      reason\n"
            "      from\n"
            "      to\n"
            "      meters {\n"
            "        meter\n"
            "        unit\n"
            "        quantity\n"
            "        emitted\n"
            "      }\n"
            "      aggregatedThrough\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="DeploymentUsageRequestInput",
        result_type="DeploymentUsageReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("deploymentId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.projectUsage": OperationSpec(
        id="management.projectUsage",
        plane="management",
        kind="query",
        field="projectUsage",
        operation_name="ManagementProjectUsage",
        document=(
            "query ManagementProjectUsage($context: RequestContextInput!, $input: ProjectUsageRequestInput!) {\n"
            "  projectUsage(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      projectId\n"
            "      source\n"
            "      observedAt\n"
            "      complete\n"
            "      reason\n"
            "      from\n"
            "      to\n"
            "      meters {\n"
            "        meter\n"
            "        unit\n"
            "        quantity\n"
            "        emitted\n"
            "      }\n"
            "      aggregatedThrough\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="ProjectUsageRequestInput",
        result_type="ProjectUsageReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("projectId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.organizationUsage": OperationSpec(
        id="management.organizationUsage",
        plane="management",
        kind="query",
        field="organizationUsage",
        operation_name="ManagementOrganizationUsage",
        document=(
            "query ManagementOrganizationUsage($context: RequestContextInput!, $input: OrganizationUsageRequestInput!) {\n"
            "  organizationUsage(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      orgId\n"
            "      source\n"
            "      observedAt\n"
            "      complete\n"
            "      reason\n"
            "      from\n"
            "      to\n"
            "      meters {\n"
            "        meter\n"
            "        unit\n"
            "        quantity\n"
            "        emitted\n"
            "      }\n"
            "      aggregatedThrough\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="OrganizationUsageRequestInput",
        result_type="OrganizationUsageReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("orgId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.organizationBilling": OperationSpec(
        id="management.organizationBilling",
        plane="management",
        kind="query",
        field="organizationBilling",
        operation_name="ManagementOrganizationBilling",
        document=(
            "query ManagementOrganizationBilling($context: RequestContextInput!, $input: OrganizationBillingRequestInput!) {\n"
            "  organizationBilling(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      orgId\n"
            "      planId\n"
            "      standing\n"
            "      graceUntil\n"
            "      subscriptionStatus\n"
            "      currentPeriodEnd\n"
            "      cancelAtPeriodEnd\n"
            "      catalogVersion\n"
            "      configured\n"
            "      billed\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="OrganizationBillingRequestInput",
        result_type="OrganizationBillingReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("orgId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "BILLING_NOT_CONFIGURED", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.webhookEndpoints": OperationSpec(
        id="management.webhookEndpoints",
        plane="management",
        kind="query",
        field="webhookEndpoints",
        operation_name="ManagementWebhookEndpoints",
        document=(
            "query ManagementWebhookEndpoints($context: RequestContextInput!, $input: WebhookEndpointsRequestInput!) {\n"
            "  webhookEndpoints(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      items {\n"
            "        endpointId\n"
            "        url\n"
            "        eventTypes\n"
            "        enabled\n"
            "        status\n"
            "        disabledReason\n"
            "        revision\n"
            "        secretVersion\n"
            "        rotationPending\n"
            "        rotationOverlapUntil\n"
            "        consecutiveFailures\n"
            "        failingSince\n"
            "        lastSuccessAt\n"
            "        lastFailureAt\n"
            "      }\n"
            "      complete\n"
            "      refreshRequired\n"
            "      nextCursor\n"
            "      observedAt\n"
            "      partialReason\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="WebhookEndpointsRequestInput",
        result_type="WebhookEndpointsReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=PaginationSpec(style="bounded", page_path=("result",), page_type="WebhookEndpointPage", item_type="WebhookEndpoint", limit_field=None, cursor_field=None),
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.webhookDeliveries": OperationSpec(
        id="management.webhookDeliveries",
        plane="management",
        kind="query",
        field="webhookDeliveries",
        operation_name="ManagementWebhookDeliveries",
        document=(
            "query ManagementWebhookDeliveries($context: RequestContextInput!, $input: WebhookDeliveriesRequestInput!) {\n"
            "  webhookDeliveries(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      items {\n"
            "        effectId\n"
            "        eventId\n"
            "        state\n"
            "        attempts\n"
            "        lastOutcome\n"
            "        nextAttemptAt\n"
            "        eventType\n"
            "        createdAt\n"
            "        replayedAt\n"
            "        lastAttemptAt\n"
            "        lastHttpStatus\n"
            "        lastLatencyMs\n"
            "        lastErrorCode\n"
            "      }\n"
            "      complete\n"
            "      refreshRequired\n"
            "      nextCursor\n"
            "      observedAt\n"
            "      partialReason\n"
            "      sourceRevision\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="WebhookDeliveriesRequestInput",
        result_type="WebhookDeliveriesReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=PaginationSpec(style="bounded", page_path=("result",), page_type="WebhookDeliveryPage", item_type="WebhookDelivery", limit_field=None, cursor_field=None),
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.resolveRequest": OperationSpec(
        id="management.resolveRequest",
        plane="management",
        kind="query",
        field="resolveRequest",
        operation_name="ManagementResolveRequest",
        document=(
            "query ManagementResolveRequest($context: RequestContextInput!, $input: ResolveRequestRequestInput!) {\n"
            "  resolveRequest(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      state\n"
            "      requestId\n"
            "      checkedAt\n"
            "      resultWithheld\n"
            "      receipt {\n"
            "        status\n"
            "        requestId\n"
            "        serverTime\n"
            "        receiptId\n"
            "        committedAt\n"
            "        replayed\n"
            "        operation {\n"
            "          operationId\n"
            "          owner\n"
            "          href\n"
            "          state\n"
            "        }\n"
            "        resourceRef {\n"
            "          kind\n"
            "          id\n"
            "        }\n"
            "        result {\n"
            "          agentGrant {\n"
            "            grantId\n"
            "            orgId\n"
            "            signupId\n"
            "            agentActorId\n"
            "            projectId\n"
            "            scopes\n"
            "            expiresAt\n"
            "            revokedAt\n"
            "            createdAt\n"
            "            keys {\n"
            "              operationId\n"
            "              state\n"
            "              scopes\n"
            "              expiresAt\n"
            "              keyId\n"
            "              deliveryId\n"
            "              deliveryExpiresAt\n"
            "            }\n"
            "          }\n"
            "          agentSignupStatus {\n"
            "            signupId\n"
            "            state\n"
            "            orgId\n"
            "            deploymentId\n"
            "            projectId\n"
            "            nextStep\n"
            "            scopes\n"
            "            grantExpiresAt\n"
            "            keys {\n"
            "              operationId\n"
            "              state\n"
            "              scopes\n"
            "              expiresAt\n"
            "              keyId\n"
            "              deliveryId\n"
            "              deliveryExpiresAt\n"
            "            }\n"
            "            incarnation\n"
            "            servingEpoch\n"
            "          }\n"
            "          billingCheckoutSession {\n"
            "            orgId\n"
            "            planId\n"
            "            url\n"
            "            expiresAt\n"
            "          }\n"
            "          billingPortalSession {\n"
            "            orgId\n"
            "            url\n"
            "            expiresAt\n"
            "          }\n"
            "          broadcastPermissionChanged {\n"
            "            member {\n"
            "              conversationId\n"
            "              principalId\n"
            "              role\n"
            "              status\n"
            "              membershipEpoch\n"
            "              visibilityEpoch\n"
            "              revision\n"
            "              visibleFromSequence\n"
            "              canStartBroadcast\n"
            "            }\n"
            "            mediaCutoff {\n"
            "              state\n"
            "              scope {\n"
            "                kind\n"
            "                liveSessionId\n"
            "                generation\n"
            "                participationId\n"
            "              }\n"
            "              evidence\n"
            "              enforcedAt\n"
            "              operationId\n"
            "            }\n"
            "          }\n"
            "          conversation {\n"
            "            conversationId\n"
            "            revision\n"
            "            title\n"
            "            props\n"
            "            latestSequence\n"
            "            membership {\n"
            "              conversationId\n"
            "              principalId\n"
            "              role\n"
            "              status\n"
            "              membershipEpoch\n"
            "              visibilityEpoch\n"
            "              revision\n"
            "              visibleFromSequence\n"
            "              canStartBroadcast\n"
            "            }\n"
            "          }\n"
            "          conversationMemberBatch {\n"
            "            items {\n"
            "              conversationId\n"
            "              principalId\n"
            "              role\n"
            "              status\n"
            "              membershipEpoch\n"
            "              visibilityEpoch\n"
            "              revision\n"
            "              visibleFromSequence\n"
            "              canStartBroadcast\n"
            "            }\n"
            "          }\n"
            "          conversationMute {\n"
            "            conversationId\n"
            "            principalId\n"
            "            muted\n"
            "            until\n"
            "          }\n"
            "          credentialDeliveryReceipt {\n"
            "            deliveryId\n"
            "          }\n"
            "          deliveryAck {\n"
            "            deliveryId\n"
            "            acknowledged\n"
            "          }\n"
            "          liveAlertBatch {\n"
            "            liveSessionId\n"
            "            created\n"
            "            suppressed\n"
            "          }\n"
            "          liveCredentialIssuance {\n"
            "            liveSessionId\n"
            "            participationId\n"
            "            generation\n"
            "            leaseId\n"
            "            grantOrdinal\n"
            "            admissionExpiresAt\n"
            "            leaseExpiresAt\n"
            "          }\n"
            "          liveSessionEndRequested {\n"
            "            liveSessionId\n"
            "            operationId\n"
            "            mediaCutoff {\n"
            "              state\n"
            "              scope {\n"
            "                kind\n"
            "                liveSessionId\n"
            "                generation\n"
            "                participationId\n"
            "              }\n"
            "              evidence\n"
            "              enforcedAt\n"
            "              operationId\n"
            "            }\n"
            "          }\n"
            "          liveSessionJoined {\n"
            "            liveSessionId\n"
            "            generation\n"
            "            participation {\n"
            "              participationId\n"
            "              principalId\n"
            "              membershipEpoch\n"
            "              role\n"
            "              state\n"
            "              permissions {\n"
            "                microphone\n"
            "                camera\n"
            "                subscribe\n"
            "              }\n"
            "              reservationExpiresAt\n"
            "              nativeConnectionId\n"
            "              mediaCutoff {\n"
            "                state\n"
            "                scope {\n"
            "                  kind\n"
            "                  liveSessionId\n"
            "                  generation\n"
            "                  participationId\n"
            "                }\n"
            "                evidence\n"
            "                enforcedAt\n"
            "                operationId\n"
            "              }\n"
            "            }\n"
            "          }\n"
            "          liveSessionLeft {\n"
            "            liveSessionId\n"
            "            participationId\n"
            "            mediaCutoff {\n"
            "              state\n"
            "              scope {\n"
            "                kind\n"
            "                liveSessionId\n"
            "                generation\n"
            "                participationId\n"
            "              }\n"
            "              evidence\n"
            "              enforcedAt\n"
            "              operationId\n"
            "            }\n"
            "          }\n"
            "          liveSessionStarted {\n"
            "            liveSessionId\n"
            "            conversationId\n"
            "            kind\n"
            "            mediaProfile\n"
            "            operationId\n"
            "          }\n"
            "          member {\n"
            "            conversationId\n"
            "            principalId\n"
            "            role\n"
            "            status\n"
            "            membershipEpoch\n"
            "            visibilityEpoch\n"
            "            revision\n"
            "            visibleFromSequence\n"
            "            canStartBroadcast\n"
            "          }\n"
            "          message {\n"
            "            messageId\n"
            "            conversationId\n"
            "            authorId\n"
            "            sequence\n"
            "            revision\n"
            "            revisionSequence\n"
            "            createdAt\n"
            "            deleted\n"
            "            text\n"
            "            props\n"
            "            editedAt\n"
            "          }\n"
            "          messageAck {\n"
            "            messageId\n"
            "            conversationId\n"
            "            sequence\n"
            "            revision\n"
            "            status\n"
            "            cursor {\n"
            "              incarnation\n"
            "              conversationId\n"
            "              sequence\n"
            "            }\n"
            "          }\n"
            "          organization {\n"
            "            orgId\n"
            "            name\n"
            "            status\n"
            "            revision\n"
            "          }\n"
            "          organizationSpend {\n"
            "            orgId\n"
            "            planId\n"
            "            currency\n"
            "            catalogVersion\n"
            "            monthlySpendCap\n"
            "            agentPurchaseLimit\n"
            "            updatedAt\n"
            "            monthlyMinimum\n"
            "            periodStart\n"
            "            periodEnd\n"
            "            credits\n"
            "            charges\n"
            "            margin\n"
            "            stop\n"
            "            refusedMeters\n"
            "            evaluatedAt\n"
            "            usageThrough\n"
            "            validUntil\n"
            "            minimumCredit\n"
            "            chargeLimit\n"
            "          }\n"
            "          principal {\n"
            "            principalId\n"
            "            externalUserId\n"
            "            status\n"
            "            revision\n"
            "          }\n"
            "          readReceipt {\n"
            "            principalId\n"
            "            membershipEpoch\n"
            "            visibilityEpoch\n"
            "            deliveredThroughSequence\n"
            "            readThroughSequence\n"
            "            updatedAt\n"
            "          }\n"
            "          sessionBootstrap {\n"
            "            session {\n"
            "              sessionId\n"
            "              principalId\n"
            "              deviceId\n"
            "              incarnation\n"
            "              sessionRevision\n"
            "              expiresAt\n"
            "              status\n"
            "            }\n"
            "            tokenExpiresAt\n"
            "            sessionToken\n"
            "          }\n"
            "          sessionRevocation {\n"
            "            sessionId\n"
            "            status\n"
            "            mediaCutoff {\n"
            "              state\n"
            "              scope {\n"
            "                kind\n"
            "                principalId\n"
            "                sessionId\n"
            "                deviceId\n"
            "                callId\n"
            "              }\n"
            "            }\n"
            "          }\n"
            "          signedProof\n"
            "        }\n"
            "      }\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="ResolveRequestRequestInput",
        result_type="ResolveRequestReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("requestId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "PERMIT_EXPIRED", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.getOperation": OperationSpec(
        id="management.getOperation",
        plane="management",
        kind="query",
        field="getOperation",
        operation_name="ManagementGetOperation",
        document=(
            "query ManagementGetOperation($context: RequestContextInput!, $input: GetOperationRequestInput!) {\n"
            "  getOperation(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      operationId\n"
            "      kind\n"
            "      targetRef {\n"
            "        kind\n"
            "        id\n"
            "      }\n"
            "      state\n"
            "      revision\n"
            "      requestedAt\n"
            "      updatedAt\n"
            "      steps {\n"
            "        stepId\n"
            "        state\n"
            "      }\n"
            "      result {\n"
            "        projectId\n"
            "        incarnation\n"
            "        status\n"
            "        backend\n"
            "        environment\n"
            "        policyRevision\n"
            "        expiresAt\n"
            "        kind\n"
            "        resourceRef {\n"
            "          kind\n"
            "          id\n"
            "        }\n"
            "        delivery {\n"
            "          deliveryId\n"
            "          kind\n"
            "          projectId\n"
            "          installationId\n"
            "          resourceRef {\n"
            "            kind\n"
            "            id\n"
            "          }\n"
            "          expiresAt\n"
            "          payloadDigest\n"
            "          recipientActorRef {\n"
            "            tenantId\n"
            "            objectId\n"
            "          }\n"
            "        }\n"
            "        keyId\n"
            "        endpointId\n"
            "        enabled\n"
            "        liveSessionCompletion {\n"
            "          liveSessionId\n"
            "          generation\n"
            "          state\n"
            "          revision\n"
            "          completedAt\n"
            "          mediaCutoff {\n"
            "            state\n"
            "            scope {\n"
            "              kind\n"
            "              liveSessionId\n"
            "              generation\n"
            "              participationId\n"
            "            }\n"
            "            evidence\n"
            "            enforcedAt\n"
            "            operationId\n"
            "          }\n"
            "        }\n"
            "        replayedDeliveries\n"
            "        skippedDeliveries\n"
            "        messagePreview\n"
            "      }\n"
            "      blockedReason\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="GetOperationRequestInput",
        result_type="GetOperationReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("operationId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.agentSignupForApproval": OperationSpec(
        id="management.agentSignupForApproval",
        plane="management",
        kind="query",
        field="agentSignupForApproval",
        operation_name="ManagementAgentSignupForApproval",
        document=(
            "query ManagementAgentSignupForApproval($context: RequestContextInput!, $input: AgentSignupForApprovalRequestInput!) {\n"
            "  agentSignupForApproval(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      signupId\n"
            "      ownerEmail\n"
            "      organizationName\n"
            "      agentName\n"
            "      purpose\n"
            "      suggestedPlan\n"
            "      suggestedScopes\n"
            "      suggestedMonthlySpendCap\n"
            "      currency\n"
            "      expiresAt\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="AgentSignupForApprovalRequestInput",
        result_type="AgentSignupForApprovalReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AGENTIC_NOT_CONFIGURED", "AGENT_SIGNUP_CLOSED", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INVALID_REQUEST", "INVALID_RESPONSE", "RATE_LIMITED", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.agentSignup": OperationSpec(
        id="management.agentSignup",
        plane="management",
        kind="query",
        field="agentSignup",
        operation_name="ManagementAgentSignup",
        document=(
            "query ManagementAgentSignup($context: RequestContextInput!) {\n"
            "  agentSignup(context: $context) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      signupId\n"
            "      state\n"
            "      orgId\n"
            "      deploymentId\n"
            "      projectId\n"
            "      nextStep\n"
            "      scopes\n"
            "      grantExpiresAt\n"
            "      keys {\n"
            "        operationId\n"
            "        state\n"
            "        scopes\n"
            "        expiresAt\n"
            "        keyId\n"
            "        deliveryId\n"
            "        deliveryExpiresAt\n"
            "      }\n"
            "      incarnation\n"
            "      servingEpoch\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type=None,
        result_type="AgentSignupReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AGENTIC_NOT_CONFIGURED", "AGENT_GRANT_EXPIRED", "AGENT_GRANT_REVOKED", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INVALID_REQUEST", "INVALID_RESPONSE", "RATE_LIMITED", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.agentGrants": OperationSpec(
        id="management.agentGrants",
        plane="management",
        kind="query",
        field="agentGrants",
        operation_name="ManagementAgentGrants",
        document=(
            "query ManagementAgentGrants($context: RequestContextInput!, $input: AgentGrantsRequestInput!) {\n"
            "  agentGrants(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      items {\n"
            "        grantId\n"
            "        orgId\n"
            "        signupId\n"
            "        agentActorId\n"
            "        projectId\n"
            "        scopes\n"
            "        expiresAt\n"
            "        revokedAt\n"
            "        createdAt\n"
            "        keys {\n"
            "          operationId\n"
            "          state\n"
            "          scopes\n"
            "          expiresAt\n"
            "          keyId\n"
            "          deliveryId\n"
            "          deliveryExpiresAt\n"
            "        }\n"
            "      }\n"
            "      complete\n"
            "      refreshRequired\n"
            "      nextCursor\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="AgentGrantsRequestInput",
        result_type="AgentGrantsReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=("orgId",),
        pagination=PaginationSpec(style="cursor", page_path=("result",), page_type="AgentGrantPage", item_type="AgentGrant", limit_field="limit", cursor_field="cursor"),
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "CURSOR_SCOPE_MISMATCH", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.agentAuditEvents": OperationSpec(
        id="management.agentAuditEvents",
        plane="management",
        kind="query",
        field="agentAuditEvents",
        operation_name="ManagementAgentAuditEvents",
        document=(
            "query ManagementAgentAuditEvents($context: RequestContextInput!, $input: AgentAuditEventsRequestInput!) {\n"
            "  agentAuditEvents(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      items {\n"
            "        eventId\n"
            "        orgId\n"
            "        grantId\n"
            "        actorKind\n"
            "        actorId\n"
            "        kind\n"
            "        details\n"
            "        occurredAt\n"
            "      }\n"
            "      complete\n"
            "      refreshRequired\n"
            "      nextCursor\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="AgentAuditEventsRequestInput",
        result_type="AgentAuditEventsReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=("orgId",),
        pagination=PaginationSpec(style="cursor", page_path=("result",), page_type="AgentAuditEventPage", item_type="AgentAuditEvent", limit_field="limit", cursor_field="cursor"),
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "CURSOR_SCOPE_MISMATCH", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.organizationSpend": OperationSpec(
        id="management.organizationSpend",
        plane="management",
        kind="query",
        field="organizationSpend",
        operation_name="ManagementOrganizationSpend",
        document=(
            "query ManagementOrganizationSpend($context: RequestContextInput!, $input: OrganizationSpendRequestInput!) {\n"
            "  organizationSpend(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      orgId\n"
            "      planId\n"
            "      currency\n"
            "      catalogVersion\n"
            "      monthlySpendCap\n"
            "      agentPurchaseLimit\n"
            "      updatedAt\n"
            "      monthlyMinimum\n"
            "      periodStart\n"
            "      periodEnd\n"
            "      credits\n"
            "      charges\n"
            "      margin\n"
            "      stop\n"
            "      refusedMeters\n"
            "      evaluatedAt\n"
            "      usageThrough\n"
            "      validUntil\n"
            "      minimumCredit\n"
            "      chargeLimit\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="OrganizationSpendRequestInput",
        result_type="OrganizationSpendReply!",
        returns="result",
        idempotency="safe",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("orgId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "BILLING_NOT_CONFIGURED", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "REQUEST_TOO_LARGE", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.createOrganization": OperationSpec(
        id="management.createOrganization",
        plane="management",
        kind="mutation",
        field="createOrganization",
        operation_name="ManagementCreateOrganization",
        document=(
            "mutation ManagementCreateOrganization($context: RequestContextInput!, $input: CreateOrganizationRequestInput!) {\n"
            "  createOrganization(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      orgId\n"
            "      name\n"
            "      status\n"
            "      revision\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="CreateOrganizationRequestInput",
        result_type="CreateOrganizationReply!",
        returns="result",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "ALREADY_EXISTS", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INVALID_REQUEST", "INVALID_RESPONSE", "OUTCOME_UNKNOWN", "RATE_LIMITED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.createDeployment": OperationSpec(
        id="management.createDeployment",
        plane="management",
        kind="mutation",
        field="createDeployment",
        operation_name="ManagementCreateDeployment",
        document=(
            "mutation ManagementCreateDeployment($context: RequestContextInput!, $input: CreateDeploymentRequestInput!) {\n"
            "  createDeployment(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      projectId\n"
            "      incarnation\n"
            "      status\n"
            "      backend\n"
            "      environment\n"
            "      policyRevision\n"
            "      expiresAt\n"
            "      kind\n"
            "      resourceRef {\n"
            "        kind\n"
            "        id\n"
            "      }\n"
            "      delivery {\n"
            "        deliveryId\n"
            "        kind\n"
            "        projectId\n"
            "        installationId\n"
            "        resourceRef {\n"
            "          kind\n"
            "          id\n"
            "        }\n"
            "        expiresAt\n"
            "        payloadDigest\n"
            "        recipientActorRef {\n"
            "          tenantId\n"
            "          objectId\n"
            "        }\n"
            "      }\n"
            "      keyId\n"
            "      endpointId\n"
            "      enabled\n"
            "      liveSessionCompletion {\n"
            "        liveSessionId\n"
            "        generation\n"
            "        state\n"
            "        revision\n"
            "        completedAt\n"
            "        mediaCutoff {\n"
            "          state\n"
            "          scope {\n"
            "            kind\n"
            "            liveSessionId\n"
            "            generation\n"
            "            participationId\n"
            "          }\n"
            "          evidence\n"
            "          enforcedAt\n"
            "          operationId\n"
            "        }\n"
            "      }\n"
            "      replayedDeliveries\n"
            "      skippedDeliveries\n"
            "      messagePreview\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="CreateDeploymentRequestInput",
        result_type="CreateDeploymentReply!",
        returns="value",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=(),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running="management.getOperation",
        errors=("ADMISSION_LIMIT", "ALREADY_EXISTS", "AUTHORITY_UNAVAILABLE", "BILLING_SUSPENDED", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.createProject": OperationSpec(
        id="management.createProject",
        plane="management",
        kind="mutation",
        field="createProject",
        operation_name="ManagementCreateProject",
        document=(
            "mutation ManagementCreateProject($context: RequestContextInput!, $input: CreateProjectRequestInput!) {\n"
            "  createProject(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      projectId\n"
            "      incarnation\n"
            "      status\n"
            "      backend\n"
            "      environment\n"
            "      policyRevision\n"
            "      expiresAt\n"
            "      kind\n"
            "      resourceRef {\n"
            "        kind\n"
            "        id\n"
            "      }\n"
            "      delivery {\n"
            "        deliveryId\n"
            "        kind\n"
            "        projectId\n"
            "        installationId\n"
            "        resourceRef {\n"
            "          kind\n"
            "          id\n"
            "        }\n"
            "        expiresAt\n"
            "        payloadDigest\n"
            "        recipientActorRef {\n"
            "          tenantId\n"
            "          objectId\n"
            "        }\n"
            "      }\n"
            "      keyId\n"
            "      endpointId\n"
            "      enabled\n"
            "      liveSessionCompletion {\n"
            "        liveSessionId\n"
            "        generation\n"
            "        state\n"
            "        revision\n"
            "        completedAt\n"
            "        mediaCutoff {\n"
            "          state\n"
            "          scope {\n"
            "            kind\n"
            "            liveSessionId\n"
            "            generation\n"
            "            participationId\n"
            "          }\n"
            "          evidence\n"
            "          enforcedAt\n"
            "          operationId\n"
            "        }\n"
            "      }\n"
            "      replayedDeliveries\n"
            "      skippedDeliveries\n"
            "      messagePreview\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="CreateProjectRequestInput",
        result_type="CreateProjectReply!",
        returns="value",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=(),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running="management.getOperation",
        errors=("ADMISSION_LIMIT", "ALREADY_EXISTS", "AUTHORITY_UNAVAILABLE", "BILLING_SUSPENDED", "DEPLOYMENT_NOT_READY", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "PLAN_LIMIT_EXCEEDED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.issueBackendKey": OperationSpec(
        id="management.issueBackendKey",
        plane="management",
        kind="mutation",
        field="issueBackendKey",
        operation_name="ManagementIssueBackendKey",
        document=(
            "mutation ManagementIssueBackendKey($context: RequestContextInput!, $input: IssueBackendKeyRequestInput!) {\n"
            "  issueBackendKey(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      projectId\n"
            "      incarnation\n"
            "      status\n"
            "      backend\n"
            "      environment\n"
            "      policyRevision\n"
            "      expiresAt\n"
            "      kind\n"
            "      resourceRef {\n"
            "        kind\n"
            "        id\n"
            "      }\n"
            "      delivery {\n"
            "        deliveryId\n"
            "        kind\n"
            "        projectId\n"
            "        installationId\n"
            "        resourceRef {\n"
            "          kind\n"
            "          id\n"
            "        }\n"
            "        expiresAt\n"
            "        payloadDigest\n"
            "        recipientActorRef {\n"
            "          tenantId\n"
            "          objectId\n"
            "        }\n"
            "      }\n"
            "      keyId\n"
            "      endpointId\n"
            "      enabled\n"
            "      liveSessionCompletion {\n"
            "        liveSessionId\n"
            "        generation\n"
            "        state\n"
            "        revision\n"
            "        completedAt\n"
            "        mediaCutoff {\n"
            "          state\n"
            "          scope {\n"
            "            kind\n"
            "            liveSessionId\n"
            "            generation\n"
            "            participationId\n"
            "          }\n"
            "          evidence\n"
            "          enforcedAt\n"
            "          operationId\n"
            "        }\n"
            "      }\n"
            "      replayedDeliveries\n"
            "      skippedDeliveries\n"
            "      messagePreview\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="IssueBackendKeyRequestInput",
        result_type="IssueBackendKeyReply!",
        returns="value",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=(),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running="management.getOperation",
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.revokeBackendKey": OperationSpec(
        id="management.revokeBackendKey",
        plane="management",
        kind="mutation",
        field="revokeBackendKey",
        operation_name="ManagementRevokeBackendKey",
        document=(
            "mutation ManagementRevokeBackendKey($context: RequestContextInput!, $input: RevokeBackendKeyRequestInput!) {\n"
            "  revokeBackendKey(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      projectId\n"
            "      incarnation\n"
            "      status\n"
            "      backend\n"
            "      environment\n"
            "      policyRevision\n"
            "      expiresAt\n"
            "      kind\n"
            "      resourceRef {\n"
            "        kind\n"
            "        id\n"
            "      }\n"
            "      delivery {\n"
            "        deliveryId\n"
            "        kind\n"
            "        projectId\n"
            "        installationId\n"
            "        resourceRef {\n"
            "          kind\n"
            "          id\n"
            "        }\n"
            "        expiresAt\n"
            "        payloadDigest\n"
            "        recipientActorRef {\n"
            "          tenantId\n"
            "          objectId\n"
            "        }\n"
            "      }\n"
            "      keyId\n"
            "      endpointId\n"
            "      enabled\n"
            "      liveSessionCompletion {\n"
            "        liveSessionId\n"
            "        generation\n"
            "        state\n"
            "        revision\n"
            "        completedAt\n"
            "        mediaCutoff {\n"
            "          state\n"
            "          scope {\n"
            "            kind\n"
            "            liveSessionId\n"
            "            generation\n"
            "            participationId\n"
            "          }\n"
            "          evidence\n"
            "          enforcedAt\n"
            "          operationId\n"
            "        }\n"
            "      }\n"
            "      replayedDeliveries\n"
            "      skippedDeliveries\n"
            "      messagePreview\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="RevokeBackendKeyRequestInput",
        result_type="RevokeBackendKeyReply!",
        returns="value",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=(),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running="management.getOperation",
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "REVISION_CONFLICT", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.projectPolicy": OperationSpec(
        id="management.projectPolicy",
        plane="management",
        kind="mutation",
        field="projectPolicy",
        operation_name="ManagementProjectPolicy",
        document=(
            "mutation ManagementProjectPolicy($context: RequestContextInput!, $input: ProjectPolicyRequestInput!) {\n"
            "  projectPolicy(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      projectId\n"
            "      incarnation\n"
            "      status\n"
            "      backend\n"
            "      environment\n"
            "      policyRevision\n"
            "      expiresAt\n"
            "      kind\n"
            "      resourceRef {\n"
            "        kind\n"
            "        id\n"
            "      }\n"
            "      delivery {\n"
            "        deliveryId\n"
            "        kind\n"
            "        projectId\n"
            "        installationId\n"
            "        resourceRef {\n"
            "          kind\n"
            "          id\n"
            "        }\n"
            "        expiresAt\n"
            "        payloadDigest\n"
            "        recipientActorRef {\n"
            "          tenantId\n"
            "          objectId\n"
            "        }\n"
            "      }\n"
            "      keyId\n"
            "      endpointId\n"
            "      enabled\n"
            "      liveSessionCompletion {\n"
            "        liveSessionId\n"
            "        generation\n"
            "        state\n"
            "        revision\n"
            "        completedAt\n"
            "        mediaCutoff {\n"
            "          state\n"
            "          scope {\n"
            "            kind\n"
            "            liveSessionId\n"
            "            generation\n"
            "            participationId\n"
            "          }\n"
            "          evidence\n"
            "          enforcedAt\n"
            "          operationId\n"
            "        }\n"
            "      }\n"
            "      replayedDeliveries\n"
            "      skippedDeliveries\n"
            "      messagePreview\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="ProjectPolicyRequestInput",
        result_type="ProjectPolicyReply!",
        returns="value",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=(),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running="management.getOperation",
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "REVISION_CONFLICT", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.credentialPermit": OperationSpec(
        id="management.credentialPermit",
        plane="management",
        kind="mutation",
        field="credentialPermit",
        operation_name="ManagementCredentialPermit",
        document=(
            "mutation ManagementCredentialPermit($context: RequestContextInput!, $input: CredentialPermitRequestInput!) {\n"
            "  credentialPermit(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result\n"
            "  }\n"
            "}"
        ),
        input_type="CredentialPermitRequestInput",
        result_type="CredentialPermitReply!",
        returns="result",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "CREDENTIAL_DELIVERY_EXPIRED", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "PERMIT_EXPIRED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.pauseOperation": OperationSpec(
        id="management.pauseOperation",
        plane="management",
        kind="mutation",
        field="pauseOperation",
        operation_name="ManagementPauseOperation",
        document=(
            "mutation ManagementPauseOperation($context: RequestContextInput!, $input: PauseOperationRequestInput!) {\n"
            "  pauseOperation(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      operationId\n"
            "      kind\n"
            "      targetRef {\n"
            "        kind\n"
            "        id\n"
            "      }\n"
            "      state\n"
            "      revision\n"
            "      requestedAt\n"
            "      updatedAt\n"
            "      steps {\n"
            "        stepId\n"
            "        state\n"
            "      }\n"
            "      result {\n"
            "        projectId\n"
            "        incarnation\n"
            "        status\n"
            "        backend\n"
            "        environment\n"
            "        policyRevision\n"
            "        expiresAt\n"
            "        kind\n"
            "        resourceRef {\n"
            "          kind\n"
            "          id\n"
            "        }\n"
            "        delivery {\n"
            "          deliveryId\n"
            "          kind\n"
            "          projectId\n"
            "          installationId\n"
            "          resourceRef {\n"
            "            kind\n"
            "            id\n"
            "          }\n"
            "          expiresAt\n"
            "          payloadDigest\n"
            "          recipientActorRef {\n"
            "            tenantId\n"
            "            objectId\n"
            "          }\n"
            "        }\n"
            "        keyId\n"
            "        endpointId\n"
            "        enabled\n"
            "        liveSessionCompletion {\n"
            "          liveSessionId\n"
            "          generation\n"
            "          state\n"
            "          revision\n"
            "          completedAt\n"
            "          mediaCutoff {\n"
            "            state\n"
            "            scope {\n"
            "              kind\n"
            "              liveSessionId\n"
            "              generation\n"
            "              participationId\n"
            "            }\n"
            "            evidence\n"
            "            enforcedAt\n"
            "            operationId\n"
            "          }\n"
            "        }\n"
            "        replayedDeliveries\n"
            "        skippedDeliveries\n"
            "        messagePreview\n"
            "      }\n"
            "      blockedReason\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="PauseOperationRequestInput",
        result_type="PauseOperationReply!",
        returns="result",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("operationId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "REVISION_CONFLICT", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.resumeOperation": OperationSpec(
        id="management.resumeOperation",
        plane="management",
        kind="mutation",
        field="resumeOperation",
        operation_name="ManagementResumeOperation",
        document=(
            "mutation ManagementResumeOperation($context: RequestContextInput!, $input: ResumeOperationRequestInput!) {\n"
            "  resumeOperation(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      operationId\n"
            "      kind\n"
            "      targetRef {\n"
            "        kind\n"
            "        id\n"
            "      }\n"
            "      state\n"
            "      revision\n"
            "      requestedAt\n"
            "      updatedAt\n"
            "      steps {\n"
            "        stepId\n"
            "        state\n"
            "      }\n"
            "      result {\n"
            "        projectId\n"
            "        incarnation\n"
            "        status\n"
            "        backend\n"
            "        environment\n"
            "        policyRevision\n"
            "        expiresAt\n"
            "        kind\n"
            "        resourceRef {\n"
            "          kind\n"
            "          id\n"
            "        }\n"
            "        delivery {\n"
            "          deliveryId\n"
            "          kind\n"
            "          projectId\n"
            "          installationId\n"
            "          resourceRef {\n"
            "            kind\n"
            "            id\n"
            "          }\n"
            "          expiresAt\n"
            "          payloadDigest\n"
            "          recipientActorRef {\n"
            "            tenantId\n"
            "            objectId\n"
            "          }\n"
            "        }\n"
            "        keyId\n"
            "        endpointId\n"
            "        enabled\n"
            "        liveSessionCompletion {\n"
            "          liveSessionId\n"
            "          generation\n"
            "          state\n"
            "          revision\n"
            "          completedAt\n"
            "          mediaCutoff {\n"
            "            state\n"
            "            scope {\n"
            "              kind\n"
            "              liveSessionId\n"
            "              generation\n"
            "              participationId\n"
            "            }\n"
            "            evidence\n"
            "            enforcedAt\n"
            "            operationId\n"
            "          }\n"
            "        }\n"
            "        replayedDeliveries\n"
            "        skippedDeliveries\n"
            "        messagePreview\n"
            "      }\n"
            "      blockedReason\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="ResumeOperationRequestInput",
        result_type="ResumeOperationReply!",
        returns="result",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("operationId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AGENTIC_NOT_CONFIGURED", "AGENT_GRANT_EXPIRED", "AGENT_GRANT_REVOKED", "AGENT_KEY_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "REVISION_CONFLICT", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.createBillingCheckoutSession": OperationSpec(
        id="management.createBillingCheckoutSession",
        plane="management",
        kind="mutation",
        field="createBillingCheckoutSession",
        operation_name="ManagementCreateBillingCheckoutSession",
        document=(
            "mutation ManagementCreateBillingCheckoutSession($context: RequestContextInput!, $input: CreateBillingCheckoutSessionRequestInput!) {\n"
            "  createBillingCheckoutSession(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      orgId\n"
            "      planId\n"
            "      url\n"
            "      expiresAt\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="CreateBillingCheckoutSessionRequestInput",
        result_type="CreateBillingCheckoutSessionReply!",
        returns="result",
        idempotency="singleUse",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("orgId", "planId"),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "BILLING_CATALOG_CONFLICT", "BILLING_CATALOG_NOT_SYNCED", "BILLING_LINK_EXPIRED", "BILLING_NOT_CONFIGURED", "BILLING_PLAN_UNAVAILABLE", "BILLING_PROVIDER_CHANGED", "BILLING_PROVIDER_REJECTED", "BILLING_SUBSCRIPTION_ACTIVE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.createBillingPortalSession": OperationSpec(
        id="management.createBillingPortalSession",
        plane="management",
        kind="mutation",
        field="createBillingPortalSession",
        operation_name="ManagementCreateBillingPortalSession",
        document=(
            "mutation ManagementCreateBillingPortalSession($context: RequestContextInput!, $input: CreateBillingPortalSessionRequestInput!) {\n"
            "  createBillingPortalSession(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      orgId\n"
            "      url\n"
            "      expiresAt\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="CreateBillingPortalSessionRequestInput",
        result_type="CreateBillingPortalSessionReply!",
        returns="result",
        idempotency="singleUse",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("orgId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "BILLING_CATALOG_CONFLICT", "BILLING_CATALOG_NOT_SYNCED", "BILLING_CUSTOMER_MISSING", "BILLING_LINK_EXPIRED", "BILLING_NOT_CONFIGURED", "BILLING_PROVIDER_CHANGED", "BILLING_PROVIDER_REJECTED", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.configureWebhook": OperationSpec(
        id="management.configureWebhook",
        plane="management",
        kind="mutation",
        field="configureWebhook",
        operation_name="ManagementConfigureWebhook",
        document=(
            "mutation ManagementConfigureWebhook($context: RequestContextInput!, $input: ConfigureWebhookRequestInput!) {\n"
            "  configureWebhook(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      projectId\n"
            "      incarnation\n"
            "      status\n"
            "      backend\n"
            "      environment\n"
            "      policyRevision\n"
            "      expiresAt\n"
            "      kind\n"
            "      resourceRef {\n"
            "        kind\n"
            "        id\n"
            "      }\n"
            "      delivery {\n"
            "        deliveryId\n"
            "        kind\n"
            "        projectId\n"
            "        installationId\n"
            "        resourceRef {\n"
            "          kind\n"
            "          id\n"
            "        }\n"
            "        expiresAt\n"
            "        payloadDigest\n"
            "        recipientActorRef {\n"
            "          tenantId\n"
            "          objectId\n"
            "        }\n"
            "      }\n"
            "      keyId\n"
            "      endpointId\n"
            "      enabled\n"
            "      liveSessionCompletion {\n"
            "        liveSessionId\n"
            "        generation\n"
            "        state\n"
            "        revision\n"
            "        completedAt\n"
            "        mediaCutoff {\n"
            "          state\n"
            "          scope {\n"
            "            kind\n"
            "            liveSessionId\n"
            "            generation\n"
            "            participationId\n"
            "          }\n"
            "          evidence\n"
            "          enforcedAt\n"
            "          operationId\n"
            "        }\n"
            "      }\n"
            "      replayedDeliveries\n"
            "      skippedDeliveries\n"
            "      messagePreview\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="ConfigureWebhookRequestInput",
        result_type="ConfigureWebhookReply!",
        returns="value",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=(),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running="management.getOperation",
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WEBHOOK_DESTINATION_DENIED", "WEBHOOK_ENDPOINT_LIMIT"),
    ),
    "management.updateWebhook": OperationSpec(
        id="management.updateWebhook",
        plane="management",
        kind="mutation",
        field="updateWebhook",
        operation_name="ManagementUpdateWebhook",
        document=(
            "mutation ManagementUpdateWebhook($context: RequestContextInput!, $input: UpdateWebhookRequestInput!) {\n"
            "  updateWebhook(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      projectId\n"
            "      incarnation\n"
            "      status\n"
            "      backend\n"
            "      environment\n"
            "      policyRevision\n"
            "      expiresAt\n"
            "      kind\n"
            "      resourceRef {\n"
            "        kind\n"
            "        id\n"
            "      }\n"
            "      delivery {\n"
            "        deliveryId\n"
            "        kind\n"
            "        projectId\n"
            "        installationId\n"
            "        resourceRef {\n"
            "          kind\n"
            "          id\n"
            "        }\n"
            "        expiresAt\n"
            "        payloadDigest\n"
            "        recipientActorRef {\n"
            "          tenantId\n"
            "          objectId\n"
            "        }\n"
            "      }\n"
            "      keyId\n"
            "      endpointId\n"
            "      enabled\n"
            "      liveSessionCompletion {\n"
            "        liveSessionId\n"
            "        generation\n"
            "        state\n"
            "        revision\n"
            "        completedAt\n"
            "        mediaCutoff {\n"
            "          state\n"
            "          scope {\n"
            "            kind\n"
            "            liveSessionId\n"
            "            generation\n"
            "            participationId\n"
            "          }\n"
            "          evidence\n"
            "          enforcedAt\n"
            "          operationId\n"
            "        }\n"
            "      }\n"
            "      replayedDeliveries\n"
            "      skippedDeliveries\n"
            "      messagePreview\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="UpdateWebhookRequestInput",
        result_type="UpdateWebhookReply!",
        returns="value",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=(),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running="management.getOperation",
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "REVISION_CONFLICT", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WEBHOOK_ENDPOINT_LIMIT", "WEBHOOK_SECRET_UNACKNOWLEDGED"),
    ),
    "management.rotateWebhookSecret": OperationSpec(
        id="management.rotateWebhookSecret",
        plane="management",
        kind="mutation",
        field="rotateWebhookSecret",
        operation_name="ManagementRotateWebhookSecret",
        document=(
            "mutation ManagementRotateWebhookSecret($context: RequestContextInput!, $input: RotateWebhookSecretRequestInput!) {\n"
            "  rotateWebhookSecret(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      projectId\n"
            "      incarnation\n"
            "      status\n"
            "      backend\n"
            "      environment\n"
            "      policyRevision\n"
            "      expiresAt\n"
            "      kind\n"
            "      resourceRef {\n"
            "        kind\n"
            "        id\n"
            "      }\n"
            "      delivery {\n"
            "        deliveryId\n"
            "        kind\n"
            "        projectId\n"
            "        installationId\n"
            "        resourceRef {\n"
            "          kind\n"
            "          id\n"
            "        }\n"
            "        expiresAt\n"
            "        payloadDigest\n"
            "        recipientActorRef {\n"
            "          tenantId\n"
            "          objectId\n"
            "        }\n"
            "      }\n"
            "      keyId\n"
            "      endpointId\n"
            "      enabled\n"
            "      liveSessionCompletion {\n"
            "        liveSessionId\n"
            "        generation\n"
            "        state\n"
            "        revision\n"
            "        completedAt\n"
            "        mediaCutoff {\n"
            "          state\n"
            "          scope {\n"
            "            kind\n"
            "            liveSessionId\n"
            "            generation\n"
            "            participationId\n"
            "          }\n"
            "          evidence\n"
            "          enforcedAt\n"
            "          operationId\n"
            "        }\n"
            "      }\n"
            "      replayedDeliveries\n"
            "      skippedDeliveries\n"
            "      messagePreview\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="RotateWebhookSecretRequestInput",
        result_type="RotateWebhookSecretReply!",
        returns="value",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=(),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running="management.getOperation",
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "REVISION_CONFLICT", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WEBHOOK_ROTATION_PENDING", "WEBHOOK_SECRET_UNACKNOWLEDGED"),
    ),
    "management.disableWebhook": OperationSpec(
        id="management.disableWebhook",
        plane="management",
        kind="mutation",
        field="disableWebhook",
        operation_name="ManagementDisableWebhook",
        document=(
            "mutation ManagementDisableWebhook($context: RequestContextInput!, $input: DisableWebhookRequestInput!) {\n"
            "  disableWebhook(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      projectId\n"
            "      incarnation\n"
            "      status\n"
            "      backend\n"
            "      environment\n"
            "      policyRevision\n"
            "      expiresAt\n"
            "      kind\n"
            "      resourceRef {\n"
            "        kind\n"
            "        id\n"
            "      }\n"
            "      delivery {\n"
            "        deliveryId\n"
            "        kind\n"
            "        projectId\n"
            "        installationId\n"
            "        resourceRef {\n"
            "          kind\n"
            "          id\n"
            "        }\n"
            "        expiresAt\n"
            "        payloadDigest\n"
            "        recipientActorRef {\n"
            "          tenantId\n"
            "          objectId\n"
            "        }\n"
            "      }\n"
            "      keyId\n"
            "      endpointId\n"
            "      enabled\n"
            "      liveSessionCompletion {\n"
            "        liveSessionId\n"
            "        generation\n"
            "        state\n"
            "        revision\n"
            "        completedAt\n"
            "        mediaCutoff {\n"
            "          state\n"
            "          scope {\n"
            "            kind\n"
            "            liveSessionId\n"
            "            generation\n"
            "            participationId\n"
            "          }\n"
            "          evidence\n"
            "          enforcedAt\n"
            "          operationId\n"
            "        }\n"
            "      }\n"
            "      replayedDeliveries\n"
            "      skippedDeliveries\n"
            "      messagePreview\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="DisableWebhookRequestInput",
        result_type="DisableWebhookReply!",
        returns="value",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=(),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running="management.getOperation",
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "REVISION_CONFLICT", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.replayWebhookDeliveries": OperationSpec(
        id="management.replayWebhookDeliveries",
        plane="management",
        kind="mutation",
        field="replayWebhookDeliveries",
        operation_name="ManagementReplayWebhookDeliveries",
        document=(
            "mutation ManagementReplayWebhookDeliveries($context: RequestContextInput!, $input: ReplayWebhookDeliveriesRequestInput!) {\n"
            "  replayWebhookDeliveries(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      projectId\n"
            "      incarnation\n"
            "      status\n"
            "      backend\n"
            "      environment\n"
            "      policyRevision\n"
            "      expiresAt\n"
            "      kind\n"
            "      resourceRef {\n"
            "        kind\n"
            "        id\n"
            "      }\n"
            "      delivery {\n"
            "        deliveryId\n"
            "        kind\n"
            "        projectId\n"
            "        installationId\n"
            "        resourceRef {\n"
            "          kind\n"
            "          id\n"
            "        }\n"
            "        expiresAt\n"
            "        payloadDigest\n"
            "        recipientActorRef {\n"
            "          tenantId\n"
            "          objectId\n"
            "        }\n"
            "      }\n"
            "      keyId\n"
            "      endpointId\n"
            "      enabled\n"
            "      liveSessionCompletion {\n"
            "        liveSessionId\n"
            "        generation\n"
            "        state\n"
            "        revision\n"
            "        completedAt\n"
            "        mediaCutoff {\n"
            "          state\n"
            "          scope {\n"
            "            kind\n"
            "            liveSessionId\n"
            "            generation\n"
            "            participationId\n"
            "          }\n"
            "          evidence\n"
            "          enforcedAt\n"
            "          operationId\n"
            "        }\n"
            "      }\n"
            "      replayedDeliveries\n"
            "      skippedDeliveries\n"
            "      messagePreview\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="ReplayWebhookDeliveriesRequestInput",
        result_type="ReplayWebhookDeliveriesReply!",
        returns="value",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=(),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running="management.getOperation",
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED", "WEBHOOK_ENDPOINT_DISABLED"),
    ),
    "management.requestAgentSignup": OperationSpec(
        id="management.requestAgentSignup",
        plane="management",
        kind="mutation",
        field="requestAgentSignup",
        operation_name="ManagementRequestAgentSignup",
        document=(
            "mutation ManagementRequestAgentSignup($context: RequestContextInput!, $input: RequestAgentSignupRequestInput!) {\n"
            "  requestAgentSignup(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      signupId\n"
            "      confirmationCode\n"
            "      expiresAt\n"
            "      pollAfterSeconds\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="RequestAgentSignupRequestInput",
        result_type="RequestAgentSignupReply!",
        returns="result",
        idempotency="replayOnly",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AGENTIC_NOT_CONFIGURED", "AGENT_SIGNUP_EMAIL_REJECTED", "AGENT_SIGNUP_SUPPRESSED", "AUTHORITY_UNAVAILABLE", "BILLING_PLAN_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INVALID_REQUEST", "INVALID_RESPONSE", "OUTCOME_UNKNOWN", "RATE_LIMITED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.rejectAgentSignup": OperationSpec(
        id="management.rejectAgentSignup",
        plane="management",
        kind="mutation",
        field="rejectAgentSignup",
        operation_name="ManagementRejectAgentSignup",
        document=(
            "mutation ManagementRejectAgentSignup($context: RequestContextInput!, $input: RejectAgentSignupRequestInput!) {\n"
            "  rejectAgentSignup(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      signupId\n"
            "      state\n"
            "      orgId\n"
            "      deploymentId\n"
            "      projectId\n"
            "      nextStep\n"
            "      scopes\n"
            "      grantExpiresAt\n"
            "      keys {\n"
            "        operationId\n"
            "        state\n"
            "        scopes\n"
            "        expiresAt\n"
            "        keyId\n"
            "        deliveryId\n"
            "        deliveryExpiresAt\n"
            "      }\n"
            "      incarnation\n"
            "      servingEpoch\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="RejectAgentSignupRequestInput",
        result_type="RejectAgentSignupReply!",
        returns="result",
        idempotency="replayOnly",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AGENTIC_NOT_CONFIGURED", "AGENT_SIGNUP_CLOSED", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INVALID_REQUEST", "INVALID_RESPONSE", "OUTCOME_UNKNOWN", "RATE_LIMITED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.approveAgentSignup": OperationSpec(
        id="management.approveAgentSignup",
        plane="management",
        kind="mutation",
        field="approveAgentSignup",
        operation_name="ManagementApproveAgentSignup",
        document=(
            "mutation ManagementApproveAgentSignup($context: RequestContextInput!, $input: ApproveAgentSignupRequestInput!) {\n"
            "  approveAgentSignup(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      signupId\n"
            "      state\n"
            "      orgId\n"
            "      deploymentId\n"
            "      projectId\n"
            "      nextStep\n"
            "      scopes\n"
            "      grantExpiresAt\n"
            "      keys {\n"
            "        operationId\n"
            "        state\n"
            "        scopes\n"
            "        expiresAt\n"
            "        keyId\n"
            "        deliveryId\n"
            "        deliveryExpiresAt\n"
            "      }\n"
            "      incarnation\n"
            "      servingEpoch\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="ApproveAgentSignupRequestInput",
        result_type="ApproveAgentSignupReply!",
        returns="result",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AGENTIC_NOT_CONFIGURED", "AGENT_CONFIRMATION_CODE_INVALID", "AGENT_SIGNUP_CLOSED", "AUTHORITY_UNAVAILABLE", "BILLING_PLAN_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INVALID_REQUEST", "INVALID_RESPONSE", "OUTCOME_UNKNOWN", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.issueAgentKey": OperationSpec(
        id="management.issueAgentKey",
        plane="management",
        kind="mutation",
        field="issueAgentKey",
        operation_name="ManagementIssueAgentKey",
        document=(
            "mutation ManagementIssueAgentKey($context: RequestContextInput!, $input: IssueAgentKeyRequestInput!) {\n"
            "  issueAgentKey(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      operationId\n"
            "      state\n"
            "      scopes\n"
            "      expiresAt\n"
            "      keyId\n"
            "      deliveryId\n"
            "      deliveryExpiresAt\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="IssueAgentKeyRequestInput",
        result_type="IssueAgentKeyReply!",
        returns="result",
        idempotency="replayOnly",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AGENTIC_NOT_CONFIGURED", "AGENT_GRANT_EXPIRED", "AGENT_GRANT_REVOKED", "AGENT_KEY_LIMIT", "AGENT_SCOPE_NOT_GRANTED", "AGENT_SIGNUP_NOT_READY", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INVALID_REQUEST", "INVALID_RESPONSE", "OUTCOME_UNKNOWN", "RATE_LIMITED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.agentCredentialPermit": OperationSpec(
        id="management.agentCredentialPermit",
        plane="management",
        kind="mutation",
        field="agentCredentialPermit",
        operation_name="ManagementAgentCredentialPermit",
        document=(
            "mutation ManagementAgentCredentialPermit($context: RequestContextInput!, $input: AgentCredentialPermitRequestInput!) {\n"
            "  agentCredentialPermit(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result\n"
            "  }\n"
            "}"
        ),
        input_type="AgentCredentialPermitRequestInput",
        result_type="AgentCredentialPermitReply!",
        returns="result",
        idempotency="replayOnly",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AGENTIC_NOT_CONFIGURED", "AGENT_GRANT_EXPIRED", "AGENT_GRANT_REVOKED", "AGENT_SIGNUP_NOT_READY", "AUTHORITY_UNAVAILABLE", "CREDENTIAL_DELIVERY_EXPIRED", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "PERMIT_EXPIRED", "RATE_LIMITED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.revokeAgentGrant": OperationSpec(
        id="management.revokeAgentGrant",
        plane="management",
        kind="mutation",
        field="revokeAgentGrant",
        operation_name="ManagementRevokeAgentGrant",
        document=(
            "mutation ManagementRevokeAgentGrant($context: RequestContextInput!, $input: RevokeAgentGrantRequestInput!) {\n"
            "  revokeAgentGrant(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      grantId\n"
            "      orgId\n"
            "      signupId\n"
            "      agentActorId\n"
            "      projectId\n"
            "      scopes\n"
            "      expiresAt\n"
            "      revokedAt\n"
            "      createdAt\n"
            "      keys {\n"
            "        operationId\n"
            "        state\n"
            "        scopes\n"
            "        expiresAt\n"
            "        keyId\n"
            "        deliveryId\n"
            "        deliveryExpiresAt\n"
            "      }\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="RevokeAgentGrantRequestInput",
        result_type="RevokeAgentGrantReply!",
        returns="result",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("grantId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.setSpendControls": OperationSpec(
        id="management.setSpendControls",
        plane="management",
        kind="mutation",
        field="setSpendControls",
        operation_name="ManagementSetSpendControls",
        document=(
            "mutation ManagementSetSpendControls($context: RequestContextInput!, $input: SetSpendControlsRequestInput!) {\n"
            "  setSpendControls(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      orgId\n"
            "      planId\n"
            "      currency\n"
            "      catalogVersion\n"
            "      monthlySpendCap\n"
            "      agentPurchaseLimit\n"
            "      updatedAt\n"
            "      monthlyMinimum\n"
            "      periodStart\n"
            "      periodEnd\n"
            "      credits\n"
            "      charges\n"
            "      margin\n"
            "      stop\n"
            "      refusedMeters\n"
            "      evaluatedAt\n"
            "      usageThrough\n"
            "      validUntil\n"
            "      minimumCredit\n"
            "      chargeLimit\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="SetSpendControlsRequestInput",
        result_type="SetSpendControlsReply!",
        returns="result",
        idempotency="idempotent",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=("orgId",),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AUTHORITY_UNAVAILABLE", "BILLING_NOT_CONFIGURED", "BILLING_PLAN_UNAVAILABLE", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INVALID_REQUEST", "INVALID_RESPONSE", "NOT_FOUND", "OUTCOME_UNKNOWN", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
    "management.purchaseAgentCredits": OperationSpec(
        id="management.purchaseAgentCredits",
        plane="management",
        kind="mutation",
        field="purchaseAgentCredits",
        operation_name="ManagementPurchaseAgentCredits",
        document=(
            "mutation ManagementPurchaseAgentCredits($context: RequestContextInput!, $input: PurchaseAgentCreditsRequestInput!) {\n"
            "  purchaseAgentCredits(context: $context, input: $input) {\n"
            "    status\n"
            "    requestId\n"
            "    serverTime\n"
            "    receiptId\n"
            "    committedAt\n"
            "    replayed\n"
            "    operation {\n"
            "      operationId\n"
            "      owner\n"
            "      href\n"
            "      state\n"
            "    }\n"
            "    resourceRef {\n"
            "      kind\n"
            "      id\n"
            "    }\n"
            "    result {\n"
            "      paymentId\n"
            "      amount\n"
            "      currency\n"
            "      state\n"
            "    }\n"
            "  }\n"
            "}"
        ),
        input_type="PurchaseAgentCreditsRequestInput",
        result_type="PurchaseAgentCreditsReply!",
        returns="result",
        idempotency="replayOnly",
        context={"requestId": "required", "projectId": "forbidden", "incarnation": "optional", "observedServingEpoch": "optional", "credentialDeliveryPermit": "forbidden"},
        echo_path=("result",),
        echo=(),
        item_echo=(),
        pagination=None,
        long_running=None,
        errors=("ADMISSION_LIMIT", "AGENTIC_NOT_CONFIGURED", "AGENT_GRANT_EXPIRED", "AGENT_GRANT_REVOKED", "AGENT_PURCHASE_LIMIT_EXCEEDED", "AGENT_SIGNUP_NOT_READY", "AUTHORITY_UNAVAILABLE", "BILLING_CUSTOMER_MISSING", "BILLING_PROVIDER_REJECTED", "BILLING_SUSPENDED", "CREDITS_REQUIRE_METERED_PLAN", "CREDIT_AMOUNT_OUT_OF_RANGE", "CREDIT_GRANT_LIMIT_REACHED", "FEATURE_UNSUPPORTED", "FORBIDDEN", "GRAPHQL_ERROR", "GRAPHQL_INVALID_REQUEST", "GRAPHQL_QUERY_LIMIT", "GRAPHQL_RESPONSE_LIMIT", "HTTP_FAILURE", "IDEMPOTENCY_CONFLICT", "INVALID_REQUEST", "INVALID_RESPONSE", "OUTCOME_UNKNOWN", "PAYMENT_DECLINED", "PAYMENT_RAIL_NOT_CONFIGURED", "RATE_LIMITED", "RECOVERY_LIMIT", "RECOVERY_STORAGE_FAILURE", "REQUEST_TOO_LARGE", "RESOLUTION_REQUIRED", "RESPONSE_TOO_LARGE", "RETRY_EXHAUSTED", "TRANSPORT_UNKNOWN", "UNAUTHENTICATED"),
    ),
}
"""Operations a server runtime calls with a bearer credential or without a credential, by IR id."""


OBJECTS: Mapping[str, Mapping[str, str]] = {
    "ActorRef": {
        "tenantId": "String!",
        "objectId": "String!",
    },
    "AddMemberReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "Member",
    },
    "AddMembersPayload": {
        "status": "String!",
        "requestId": "UUID!",
        "receiptId": "UUID!",
        "committedAt": "String!",
        "replayed": "Boolean!",
        "result": "ConversationMemberBatch!",
    },
    "AgentAuditEvent": {
        "eventId": "UUID!",
        "orgId": "UUID!",
        "grantId": "UUID",
        "actorKind": "String!",
        "actorId": "UUID",
        "kind": "String!",
        "details": "Properties",
        "occurredAt": "String!",
    },
    "AgentAuditEventPage": {
        "items": "[AgentAuditEvent!]!",
        "complete": "Boolean!",
        "refreshRequired": "Boolean!",
        "nextCursor": "String",
    },
    "AgentGrant": {
        "grantId": "UUID!",
        "orgId": "UUID!",
        "signupId": "UUID!",
        "agentActorId": "UUID!",
        "projectId": "UUID",
        "scopes": "[String!]!",
        "expiresAt": "String!",
        "revokedAt": "String",
        "createdAt": "String!",
        "keys": "[AgentKey!]!",
    },
    "AgentGrantPage": {
        "items": "[AgentGrant!]!",
        "complete": "Boolean!",
        "refreshRequired": "Boolean!",
        "nextCursor": "String",
    },
    "AgentKey": {
        "operationId": "UUID!",
        "state": "String!",
        "scopes": "[String!]!",
        "expiresAt": "String!",
        "keyId": "String",
        "deliveryId": "UUID",
        "deliveryExpiresAt": "String",
    },
    "AgentPayment": {
        "paymentId": "UUID!",
        "amount": "String!",
        "currency": "String!",
        "state": "String!",
    },
    "AgentSignupReview": {
        "signupId": "UUID!",
        "ownerEmail": "String!",
        "organizationName": "String!",
        "agentName": "String!",
        "purpose": "String",
        "suggestedPlan": "String",
        "suggestedScopes": "[String!]!",
        "suggestedMonthlySpendCap": "String",
        "currency": "String!",
        "expiresAt": "String!",
    },
    "AgentSignupStatus": {
        "signupId": "UUID!",
        "state": "String!",
        "orgId": "UUID",
        "deploymentId": "UUID",
        "projectId": "UUID",
        "nextStep": "String",
        "scopes": "[String!]!",
        "grantExpiresAt": "String",
        "keys": "[AgentKey!]!",
        "incarnation": "UUID",
        "servingEpoch": "Decimal",
    },
    "AgentSignupTicket": {
        "signupId": "UUID!",
        "confirmationCode": "String!",
        "expiresAt": "String!",
        "pollAfterSeconds": "Int!",
    },
    "AlertLiveSessionPayload": {
        "status": "String!",
        "requestId": "UUID!",
        "receiptId": "UUID!",
        "committedAt": "String!",
        "replayed": "Boolean!",
        "result": "LiveAlertBatch!",
    },
    "BillingCheckoutSession": {
        "orgId": "UUID!",
        "planId": "String!",
        "url": "String!",
        "expiresAt": "String!",
    },
    "BillingPortalSession": {
        "orgId": "UUID!",
        "url": "String!",
        "expiresAt": "String",
    },
    "BroadcastPermissionChanged": {
        "member": "Member!",
        "mediaCutoff": "LiveMediaCutoff",
    },
    "Capabilities": {
        "serverRelease": "String!",
        "capabilityRevision": "Decimal!",
        "limitsRevision": "Decimal!",
        "features": "Features",
        "limits": "[LimitEntry!]!",
        "environment": "String!",
        "productionQualified": "Boolean!",
        "mediaPolicy": "MediaPolicy",
        "geoControlAuthorityId": "String",
        "offerings": "[String!]!",
        "geos": "[String!]!",
        "installationProfiles": "[String!]!",
        "portalIdentity": "String",
    },
    "CapabilitiesReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "Capabilities",
    },
    "Conversation": {
        "conversationId": "UUID!",
        "revision": "Decimal!",
        "title": "String!",
        "props": "Properties",
        "latestSequence": "Decimal!",
        "membership": "Member",
    },
    "ConversationMemberBatch": {
        "items": "[Member!]!",
    },
    "ConversationMute": {
        "conversationId": "UUID!",
        "principalId": "UUID!",
        "muted": "Boolean!",
        "until": "String",
    },
    "ConversationMuteReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String!",
        "result": "ConversationMute!",
    },
    "CreateConversationReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "Conversation",
    },
    "CreatePrincipalReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "Principal",
    },
    "CredentialDelivery": {
        "deliveryId": "UUID!",
        "kind": "String!",
        "projectId": "UUID!",
        "installationId": "String!",
        "resourceRef": "ResourceRef",
        "expiresAt": "String!",
        "payloadDigest": "String!",
        "recipientActorRef": "ActorRef",
    },
    "CredentialDeliveryReceipt": {
        "deliveryId": "UUID!",
    },
    "CurrentLiveSessionReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String!",
        "result": "LiveSession",
    },
    "Cursor": {
        "incarnation": "UUID!",
        "conversationId": "UUID!",
        "sequence": "Decimal!",
    },
    "CutoffScope": {
        "kind": "String!",
        "principalId": "UUID",
        "sessionId": "UUID",
        "deviceId": "UUID",
        "callId": "UUID",
    },
    "DeleteMessageReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "Message",
    },
    "DeliveryAck": {
        "deliveryId": "UUID!",
        "acknowledged": "Boolean!",
    },
    "Deployment": {
        "deploymentId": "UUID!",
        "orgId": "UUID!",
        "offering": "String!",
        "geoId": "String!",
        "installationId": "String!",
        "resourceOwner": "String!",
        "approvedRegions": "[String!]!",
        "readiness": "String!",
        "revision": "Decimal!",
        "consentRef": "String!",
        "environment": "String!",
    },
    "DeploymentHealth": {
        "deploymentId": "UUID!",
        "readiness": "String!",
        "observedAt": "String!",
        "services": "[ServiceObservation!]!",
    },
    "DeploymentUsage": {
        "deploymentId": "UUID!",
        "source": "String!",
        "observedAt": "String!",
        "complete": "Boolean!",
        "reason": "String!",
        "from": "String!",
        "to": "String!",
        "meters": "[UsageMeter!]!",
        "aggregatedThrough": "String",
    },
    "DisablePrincipalReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "Principal",
    },
    "EditMessageReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "Message",
    },
    "EndLiveSessionPayload": {
        "status": "String!",
        "requestId": "UUID!",
        "receiptId": "UUID!",
        "committedAt": "String!",
        "replayed": "Boolean!",
        "operation": "OperationRef!",
        "result": "LiveSessionEndRequested!",
    },
    "Features": {
        "chat": "Boolean!",
        "inbox": "Boolean!",
        "lexicalSearch": "Boolean!",
        "typing": "Boolean!",
        "webhooks": "Boolean!",
        "liveSessions": "Boolean!",
        "liveBroadcast": "Boolean!",
    },
    "GetConversationReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "Conversation",
    },
    "GetMessageReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "Message",
    },
    "GetOperationReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "Operation",
    },
    "GetPrincipalReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "Principal",
    },
    "HistoryGrantReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "Member",
    },
    "InboxItem": {
        "conversationId": "UUID!",
        "title": "String!",
        "activityAt": "String",
        "visibilityEpoch": "Decimal!",
        "latestVisibleMessage": "Message",
        "hasUnread": "Boolean!",
    },
    "InboxPage": {
        "items": "[InboxItem!]!",
        "complete": "Boolean!",
        "refreshRequired": "Boolean!",
        "nextCursor": "String",
        "partialReason": "String",
    },
    "InboxReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "InboxPage",
    },
    "IssueSessionReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "SessionBootstrap",
    },
    "Limit": {
        "maximum": "Decimal",
        "unit": "String",
        "scope": "String",
        "milliseconds": "Decimal",
        "policyId": "String",
        "revision": "Decimal",
    },
    "LimitEntry": {
        "key": "String!",
        "value": "Limit!",
    },
    "LiveAlertBatch": {
        "liveSessionId": "UUID!",
        "created": "Decimal!",
        "suppressed": "Decimal!",
    },
    "LiveCredentialIssuance": {
        "liveSessionId": "UUID!",
        "participationId": "UUID!",
        "generation": "Decimal!",
        "leaseId": "UUID!",
        "grantOrdinal": "Decimal!",
        "admissionExpiresAt": "String!",
        "leaseExpiresAt": "String!",
    },
    "LiveCutoffScope": {
        "kind": "LiveCutoffScopeKind!",
        "liveSessionId": "UUID!",
        "generation": "Decimal!",
        "participationId": "UUID",
    },
    "LiveMediaCutoff": {
        "state": "LiveCutoffState!",
        "scope": "LiveCutoffScope!",
        "evidence": "LiveCutoffEvidence",
        "enforcedAt": "String",
        "operationId": "UUID",
    },
    "LiveMediaPermissions": {
        "microphone": "Boolean!",
        "camera": "Boolean!",
        "subscribe": "Boolean!",
    },
    "LiveOperationFailure": {
        "code": "LiveErrorCode!",
        "message": "String!",
    },
    "LiveParticipantPage": {
        "items": "[LiveParticipation!]!",
        "nextCursor": "String",
        "complete": "Boolean!",
        "partialReason": "String",
        "refreshRequired": "Boolean!",
    },
    "LiveParticipantPageReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String!",
        "result": "LiveParticipantPage!",
    },
    "LiveParticipation": {
        "participationId": "UUID!",
        "principalId": "UUID!",
        "membershipEpoch": "Decimal!",
        "role": "LiveRole!",
        "state": "LiveParticipationState!",
        "permissions": "LiveMediaPermissions!",
        "reservationExpiresAt": "String",
        "nativeConnectionId": "UUID",
        "mediaCutoff": "LiveMediaCutoff",
    },
    "LiveSession": {
        "liveSessionId": "UUID!",
        "conversationId": "UUID!",
        "creatorId": "UUID!",
        "kind": "LiveSessionKind!",
        "mediaProfile": "LiveMediaProfile!",
        "state": "LiveSessionState!",
        "generation": "Decimal!",
        "revision": "Decimal!",
        "createdAt": "String!",
        "expiresAt": "String!",
        "myParticipation": "LiveParticipation",
        "mediaCutoff": "LiveMediaCutoff",
    },
    "LiveSessionEndRequested": {
        "liveSessionId": "UUID!",
        "operationId": "UUID!",
        "mediaCutoff": "LiveMediaCutoff!",
    },
    "LiveSessionJoined": {
        "liveSessionId": "UUID!",
        "generation": "Decimal!",
        "participation": "LiveParticipation!",
    },
    "LiveSessionLeft": {
        "liveSessionId": "UUID!",
        "participationId": "UUID!",
        "mediaCutoff": "LiveMediaCutoff!",
    },
    "LiveSessionOperation": {
        "operationId": "UUID!",
        "requestId": "UUID!",
        "liveSessionId": "UUID!",
        "kind": "LiveOperationKind!",
        "state": "LiveOperationState!",
        "revision": "Decimal!",
        "requestedAt": "String!",
        "completedAt": "String",
        "completion": "LiveSessionOperationCompletion",
        "failure": "LiveOperationFailure",
    },
    "LiveSessionOperationCompletion": {
        "liveSessionId": "UUID!",
        "generation": "Decimal!",
        "state": "LiveSessionState!",
        "revision": "Decimal!",
        "completedAt": "String!",
        "mediaCutoff": "LiveMediaCutoff",
    },
    "LiveSessionOperationReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String!",
        "result": "LiveSessionOperation!",
    },
    "LiveSessionPage": {
        "items": "[LiveSession!]!",
        "nextCursor": "String",
        "complete": "Boolean!",
        "partialReason": "String",
        "refreshRequired": "Boolean!",
    },
    "LiveSessionPageReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String!",
        "result": "LiveSessionPage!",
    },
    "LiveSessionReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String!",
        "result": "LiveSession!",
    },
    "LiveSessionStarted": {
        "liveSessionId": "UUID!",
        "conversationId": "UUID!",
        "kind": "LiveSessionKind!",
        "mediaProfile": "LiveMediaProfile!",
        "operationId": "UUID!",
    },
    "MediaCutoff": {
        "state": "String!",
        "scope": "CutoffScope",
    },
    "MediaPolicy": {
        "leasePolicyId": "String!",
        "maxLeaseMs": "Decimal!",
        "renewAttemptMs": "Decimal!",
        "preludeMaxBytes": "String!",
        "preludeTimeoutMs": "String!",
        "clockProfileId": "String!",
    },
    "Member": {
        "conversationId": "UUID!",
        "principalId": "UUID!",
        "role": "String!",
        "status": "String!",
        "membershipEpoch": "Decimal!",
        "visibilityEpoch": "Decimal!",
        "revision": "Decimal!",
        "visibleFromSequence": "Decimal!",
        "canStartBroadcast": "Boolean!",
    },
    "MemberPage": {
        "items": "[Member!]!",
        "complete": "Boolean!",
        "refreshRequired": "Boolean!",
        "nextCursor": "String",
    },
    "MembersReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "MemberPage",
    },
    "Message": {
        "messageId": "UUID!",
        "conversationId": "UUID!",
        "authorId": "String!",
        "sequence": "Decimal!",
        "revision": "Decimal!",
        "revisionSequence": "Decimal!",
        "createdAt": "String!",
        "deleted": "Boolean!",
        "text": "String",
        "props": "Properties",
        "editedAt": "String",
    },
    "MessageAck": {
        "messageId": "UUID!",
        "conversationId": "UUID!",
        "sequence": "Decimal!",
        "revision": "Decimal!",
        "status": "String!",
        "cursor": "Cursor",
    },
    "MessagePage": {
        "items": "[Message!]!",
        "complete": "Boolean!",
        "refreshRequired": "Boolean!",
        "nextCursor": "String",
    },
    "MessagesReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "MessagePage",
    },
    "Operation": {
        "operationId": "UUID!",
        "kind": "String!",
        "targetRef": "ResourceRef",
        "state": "String!",
        "revision": "Decimal!",
        "requestedAt": "String!",
        "updatedAt": "String!",
        "steps": "[OperationStep!]!",
        "result": "OperationResult",
        "blockedReason": "String",
    },
    "OperationRef": {
        "operationId": "UUID!",
        "owner": "String!",
        "href": "String!",
        "state": "String!",
    },
    "OperationResult": {
        "projectId": "UUID",
        "incarnation": "UUID",
        "status": "String",
        "backend": "String",
        "environment": "String",
        "policyRevision": "Decimal",
        "expiresAt": "String",
        "kind": "String",
        "resourceRef": "ResourceRef",
        "delivery": "CredentialDelivery",
        "keyId": "String",
        "endpointId": "UUID",
        "enabled": "Boolean",
        "liveSessionCompletion": "LiveSessionOperationCompletion",
        "replayedDeliveries": "Int",
        "skippedDeliveries": "Int",
        "messagePreview": "Boolean",
    },
    "OperationStep": {
        "stepId": "String!",
        "state": "String!",
    },
    "Organization": {
        "orgId": "UUID!",
        "name": "String!",
        "status": "String!",
        "revision": "Decimal!",
    },
    "OrganizationBilling": {
        "orgId": "UUID!",
        "planId": "String",
        "standing": "String",
        "graceUntil": "String",
        "subscriptionStatus": "String",
        "currentPeriodEnd": "String",
        "cancelAtPeriodEnd": "Boolean!",
        "catalogVersion": "String!",
        "configured": "Boolean!",
        "billed": "Boolean!",
    },
    "OrganizationPage": {
        "items": "[Organization!]!",
        "complete": "Boolean!",
        "refreshRequired": "Boolean!",
        "nextCursor": "String",
    },
    "OrganizationSpend": {
        "orgId": "UUID!",
        "planId": "String!",
        "currency": "String!",
        "catalogVersion": "String!",
        "monthlySpendCap": "String",
        "agentPurchaseLimit": "String",
        "updatedAt": "String",
        "monthlyMinimum": "String",
        "periodStart": "String",
        "periodEnd": "String",
        "credits": "String",
        "charges": "String",
        "margin": "String",
        "stop": "String",
        "refusedMeters": "[String!]!",
        "evaluatedAt": "String",
        "usageThrough": "String",
        "validUntil": "String",
        "minimumCredit": "String",
        "chargeLimit": "String",
    },
    "OrganizationUsage": {
        "orgId": "UUID!",
        "source": "String!",
        "observedAt": "String!",
        "complete": "Boolean!",
        "reason": "String!",
        "from": "String!",
        "to": "String!",
        "meters": "[UsageMeter!]!",
        "aggregatedThrough": "String",
    },
    "Principal": {
        "principalId": "UUID!",
        "externalUserId": "String!",
        "status": "String!",
        "revision": "Decimal!",
    },
    "Project": {
        "projectId": "UUID!",
        "deploymentId": "UUID!",
        "name": "String!",
        "environment": "String!",
        "incarnation": "UUID!",
        "servingRegion": "String!",
        "servingEpoch": "Decimal!",
        "status": "String!",
        "revision": "Decimal!",
        "policyRevision": "Decimal!",
        "messagePreview": "Boolean!",
    },
    "ProjectUsage": {
        "projectId": "UUID!",
        "source": "String!",
        "observedAt": "String!",
        "complete": "Boolean!",
        "reason": "String!",
        "from": "String!",
        "to": "String!",
        "meters": "[UsageMeter!]!",
        "aggregatedThrough": "String",
    },
    "ReadReceipt": {
        "principalId": "UUID!",
        "membershipEpoch": "Decimal!",
        "visibilityEpoch": "Decimal!",
        "deliveredThroughSequence": "Decimal",
        "readThroughSequence": "Decimal",
        "updatedAt": "String",
    },
    "RemoveMemberReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "Member",
    },
    "RenewSessionReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "SessionBootstrap",
    },
    "RequestResolution": {
        "state": "String!",
        "requestId": "UUID!",
        "checkedAt": "String!",
        "resultWithheld": "Boolean!",
        "receipt": "ResolvedReceipt",
    },
    "ResolveRequestReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "RequestResolution",
    },
    "ResolvedReceipt": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "RetainedResult",
    },
    "ResourceRef": {
        "kind": "String!",
        "id": "String!",
    },
    "RetainedResult": {
        "agentGrant": "AgentGrant",
        "agentSignupStatus": "AgentSignupStatus",
        "billingCheckoutSession": "BillingCheckoutSession",
        "billingPortalSession": "BillingPortalSession",
        "broadcastPermissionChanged": "BroadcastPermissionChanged",
        "conversation": "Conversation",
        "conversationMemberBatch": "ConversationMemberBatch",
        "conversationMute": "ConversationMute",
        "credentialDeliveryReceipt": "CredentialDeliveryReceipt",
        "deliveryAck": "DeliveryAck",
        "liveAlertBatch": "LiveAlertBatch",
        "liveCredentialIssuance": "LiveCredentialIssuance",
        "liveSessionEndRequested": "LiveSessionEndRequested",
        "liveSessionJoined": "LiveSessionJoined",
        "liveSessionLeft": "LiveSessionLeft",
        "liveSessionStarted": "LiveSessionStarted",
        "member": "Member",
        "message": "Message",
        "messageAck": "MessageAck",
        "organization": "Organization",
        "organizationSpend": "OrganizationSpend",
        "principal": "Principal",
        "readReceipt": "ReadReceipt",
        "sessionBootstrap": "SessionBootstrap",
        "sessionRevocation": "SessionRevocation",
        "signedProof": "SignedProof",
    },
    "RevokeSessionReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "SessionRevocation",
    },
    "RouteReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "SignedProof",
    },
    "SearchHit": {
        "conversationId": "UUID!",
        "message": "Message",
    },
    "SearchPage": {
        "items": "[SearchHit!]!",
        "complete": "Boolean!",
        "refreshRequired": "Boolean!",
        "nextCursor": "String",
    },
    "SearchReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "SearchPage",
    },
    "SendMessageReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "MessageAck",
    },
    "ServiceDetails": {
        "status": "String!",
    },
    "ServiceObservation": {
        "role": "String!",
        "observedAt": "String!",
        "details": "ServiceDetails",
    },
    "Session": {
        "sessionId": "UUID!",
        "principalId": "UUID!",
        "deviceId": "UUID!",
        "incarnation": "UUID!",
        "sessionRevision": "Decimal!",
        "expiresAt": "String!",
        "status": "String!",
    },
    "SessionBootstrap": {
        "session": "Session",
        "tokenExpiresAt": "String!",
        "sessionToken": "String!",
    },
    "SessionRequestOutcome": {
        "state": "String!",
        "requestId": "UUID!",
        "checkedAt": "String!",
        "operation": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "originalSession": "Session",
        "currentSession": "Session",
        "currentState": "String",
    },
    "SessionRequestOutcomeReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String!",
        "result": "SessionRequestOutcome!",
    },
    "SessionRevocation": {
        "sessionId": "UUID!",
        "status": "String!",
        "mediaCutoff": "MediaCutoff",
    },
    "SetBroadcastPermissionPayload": {
        "status": "String!",
        "requestId": "UUID!",
        "receiptId": "UUID!",
        "committedAt": "String!",
        "replayed": "Boolean!",
        "result": "BroadcastPermissionChanged!",
    },
    "SetConversationMutePayload": {
        "status": "String!",
        "requestId": "UUID!",
        "receiptId": "UUID!",
        "committedAt": "String!",
        "replayed": "Boolean!",
        "result": "ConversationMute!",
    },
    "UpdateConversationReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "Conversation",
    },
    "UsageMeter": {
        "meter": "String!",
        "unit": "String!",
        "quantity": "Decimal!",
        "emitted": "Boolean!",
    },
    "WebhookDelivery": {
        "effectId": "UUID!",
        "eventId": "UUID!",
        "state": "String!",
        "attempts": "Decimal!",
        "lastOutcome": "String",
        "nextAttemptAt": "String!",
        "eventType": "String",
        "createdAt": "String",
        "replayedAt": "String",
        "lastAttemptAt": "String",
        "lastHttpStatus": "Int",
        "lastLatencyMs": "Int",
        "lastErrorCode": "String",
    },
    "WebhookDeliveryPage": {
        "items": "[WebhookDelivery!]!",
        "complete": "Boolean!",
        "refreshRequired": "Boolean!",
        "nextCursor": "String",
        "observedAt": "String",
        "partialReason": "String",
        "sourceRevision": "Decimal",
    },
    "WebhookEndpoint": {
        "endpointId": "UUID!",
        "url": "String!",
        "eventTypes": "[String!]!",
        "enabled": "Boolean!",
        "status": "String!",
        "disabledReason": "String",
        "revision": "Decimal!",
        "secretVersion": "String!",
        "rotationPending": "Boolean!",
        "rotationOverlapUntil": "String",
        "consecutiveFailures": "Int!",
        "failingSince": "String",
        "lastSuccessAt": "String",
        "lastFailureAt": "String",
    },
    "WebhookEndpointPage": {
        "items": "[WebhookEndpoint!]!",
        "complete": "Boolean!",
        "refreshRequired": "Boolean!",
        "nextCursor": "String",
        "observedAt": "String",
        "partialReason": "String",
    },
    "AgentAuditEventsReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "AgentAuditEventPage",
    },
    "AgentCredentialPermitReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "SignedProof",
    },
    "AgentGrantsReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "AgentGrantPage",
    },
    "AgentSignupForApprovalReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "AgentSignupReview",
    },
    "AgentSignupReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "AgentSignupStatus",
    },
    "ApproveAgentSignupReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "AgentSignupStatus",
    },
    "ConfigureWebhookReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "OperationResult",
    },
    "CreateBillingCheckoutSessionReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "BillingCheckoutSession",
    },
    "CreateBillingPortalSessionReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "BillingPortalSession",
    },
    "CreateDeploymentReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "OperationResult",
    },
    "CreateOrganizationReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "Organization",
    },
    "CreateProjectReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "OperationResult",
    },
    "CredentialPermitReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "SignedProof",
    },
    "DeploymentHealthReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "DeploymentHealth",
    },
    "DeploymentUsageReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "DeploymentUsage",
    },
    "DisableWebhookReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "OperationResult",
    },
    "GetDeploymentReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "Deployment",
    },
    "GetOrganizationReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "Organization",
    },
    "GetProjectReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "Project",
    },
    "IssueAgentKeyReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "AgentKey",
    },
    "IssueBackendKeyReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "OperationResult",
    },
    "OrganizationBillingReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "OrganizationBilling",
    },
    "OrganizationSpendReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "OrganizationSpend",
    },
    "OrganizationUsageReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "OrganizationUsage",
    },
    "OrganizationsReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "OrganizationPage",
    },
    "PauseOperationReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "Operation",
    },
    "ProjectPolicyReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "OperationResult",
    },
    "ProjectUsageReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "ProjectUsage",
    },
    "PurchaseAgentCreditsReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "AgentPayment",
    },
    "RejectAgentSignupReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "AgentSignupStatus",
    },
    "ReplayWebhookDeliveriesReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "OperationResult",
    },
    "RequestAgentSignupReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "AgentSignupTicket",
    },
    "ResumeOperationReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "Operation",
    },
    "RevokeAgentGrantReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "AgentGrant",
    },
    "RevokeBackendKeyReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "OperationResult",
    },
    "RotateWebhookSecretReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "OperationResult",
    },
    "SetSpendControlsReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "OrganizationSpend",
    },
    "UpdateWebhookReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "OperationResult",
    },
    "WebhookDeliveriesReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "WebhookDeliveryPage",
    },
    "WebhookEndpointsReply": {
        "status": "String!",
        "requestId": "UUID!",
        "serverTime": "String",
        "receiptId": "UUID",
        "committedAt": "String",
        "replayed": "Boolean",
        "operation": "OperationRef",
        "resourceRef": "ResourceRef",
        "result": "WebhookEndpointPage",
    },
}
"""Output object fields and their GraphQL types."""


ENUMS: Mapping[str, tuple[str, ...]] = {
    "LiveCutoffEvidence": ("NATIVE_FENCE", "MONOTONIC_BOOT_RETIREMENT", "NO_GRANTS_ISSUED"),
    "LiveCutoffScopeKind": ("PARTICIPATION", "GENERATION"),
    "LiveCutoffState": ("PENDING", "ENFORCED", "UNKNOWN"),
    "LiveErrorCode": ("LIVE_SESSION_EXISTS", "LIVE_SESSION_CLOSED", "LIVE_SESSION_INTERRUPTED", "LIVE_SESSION_CAPACITY", "LIVE_ALERT_LIMIT", "JOINED_ELSEWHERE", "PARTICIPATION_DRAINING", "PARTICIPATION_MISMATCH", "GENERATION_CONFLICT", "MEDIA_NOT_READY", "CREDENTIAL_REFRESH_REQUIRED", "LIVE_START_CANCELLED", "LIVE_PREPARATION_FAILED"),
    "LiveMediaProfile": ("AUDIO_ONLY", "AUDIO_VIDEO"),
    "LiveOperationKind": ("START", "END"),
    "LiveOperationState": ("RUNNING", "COMPLETED", "FAILED"),
    "LiveParticipationState": ("JOINED", "CONNECTING", "CONNECTED", "DISCONNECTED", "LEAVING", "LEFT"),
    "LiveRole": ("PUBLISHER", "VIEWER"),
    "LiveSessionKind": ("INTERACTIVE", "BROADCAST"),
    "LiveSessionState": ("PREPARING", "READY", "ACTIVE", "DRAINING", "ENDED", "FAILED"),
}
"""Enum values in schema order."""


INPUTS: Mapping[str, Mapping[str, tuple[str, bool]]] = {
    "AddMemberRequestInput": {
        "conversationId": ("UUID!", False),
        "principalId": ("UUID!", False),
        "role": ("String!", False),
        "expectedRevision": ("Decimal!", False),
    },
    "AddMembersInput": {
        "conversationId": ("UUID!", False),
        "members": ("[MemberBatchEntryInput!]!", False),
    },
    "AlertLiveSessionInput": {
        "liveSessionId": ("UUID!", False),
        "expectedGeneration": ("Decimal!", False),
        "principalIds": ("[UUID!]!", False),
    },
    "ConversationLiveInput": {
        "conversationId": ("UUID!", False),
    },
    "ConversationMuteInput": {
        "conversationId": ("UUID!", False),
        "actAsPrincipalId": ("UUID", False),
    },
    "CreateConversationRequestInput": {
        "title": ("String!", False),
        "props": ("Properties!", False),
        "members": ("[MemberInputInput!]!", False),
    },
    "CreatePrincipalRequestInput": {
        "externalUserId": ("String!", False),
    },
    "DeleteMessageRequestInput": {
        "conversationId": ("UUID!", False),
        "messageId": ("UUID!", False),
        "expectedRevision": ("Decimal!", False),
    },
    "DisablePrincipalRequestInput": {
        "principalId": ("UUID!", False),
        "expectedRevision": ("Decimal!", False),
    },
    "EditMessageRequestInput": {
        "conversationId": ("UUID!", False),
        "messageId": ("UUID!", False),
        "expectedRevision": ("Decimal!", False),
        "text": ("String", False),
        "props": ("Properties", False),
    },
    "EndLiveSessionInput": {
        "liveSessionId": ("UUID!", False),
        "expectedGeneration": ("Decimal!", False),
        "expectedRevision": ("Decimal!", False),
    },
    "GetConversationRequestInput": {
        "conversationId": ("UUID!", False),
    },
    "GetMessageRequestInput": {
        "conversationId": ("UUID!", False),
        "messageId": ("UUID!", False),
        "actAsPrincipalId": ("UUID", False),
    },
    "GetOperationRequestInput": {
        "operationId": ("UUID!", False),
    },
    "GetPrincipalRequestInput": {
        "principalId": ("UUID!", False),
    },
    "HistoryGrantRequestInput": {
        "conversationId": ("UUID!", False),
        "principalId": ("UUID!", False),
        "membershipEpoch": ("Decimal!", False),
        "expectedRevision": ("Decimal!", False),
        "fromSequence": ("Decimal!", False),
    },
    "InboxRequestInput": {
        "limit": ("PageSize!", False),
        "cursor": ("String", False),
        "actAsPrincipalId": ("UUID", False),
    },
    "IssueSessionRequestInput": {
        "principalId": ("UUID!", False),
        "deviceId": ("UUID!", False),
        "requestedTtlMs": ("Decimal!", False),
    },
    "LiveParticipantsInput": {
        "liveSessionId": ("UUID!", False),
        "limit": ("PageSize!", True),
        "cursor": ("String", False),
    },
    "LiveSessionInput": {
        "liveSessionId": ("UUID!", False),
    },
    "LiveSessionOperationInput": {
        "operationId": ("UUID!", False),
    },
    "LiveSessionsInput": {
        "conversationId": ("UUID!", False),
        "limit": ("PageSize!", True),
        "cursor": ("String", False),
    },
    "MemberBatchEntryInput": {
        "principalId": ("UUID!", False),
        "role": ("String!", False),
        "expectedRevision": ("Decimal!", False),
    },
    "MemberInputInput": {
        "principalId": ("UUID!", False),
        "role": ("String!", False),
    },
    "MembersRequestInput": {
        "conversationId": ("UUID!", False),
        "limit": ("PageSize!", False),
        "cursor": ("String", False),
    },
    "MessagesRequestInput": {
        "conversationId": ("UUID!", False),
        "limit": ("PageSize!", False),
        "beforeSequence": ("Decimal", False),
        "actAsPrincipalId": ("UUID", False),
    },
    "PolicyChangeInput": {
        "kind": ("String!", False),
        "reason": ("String", False),
        "holdId": ("String", False),
    },
    "RemoveMemberRequestInput": {
        "conversationId": ("UUID!", False),
        "principalId": ("UUID!", False),
        "expectedRevision": ("Decimal!", False),
    },
    "RenewSessionRequestInput": {
        "sessionId": ("UUID!", False),
        "principalId": ("UUID!", False),
        "deviceId": ("UUID!", False),
        "expectedRevision": ("Decimal!", False),
        "requestedTtlMs": ("Decimal!", False),
    },
    "ResolveRequestRequestInput": {
        "requestId": ("UUID!", False),
    },
    "RevokeSessionRequestInput": {
        "sessionId": ("UUID!", False),
        "expectedRevision": ("Decimal!", False),
    },
    "SearchRequestInput": {
        "query": ("String!", False),
        "pageSize": ("PageSize!", False),
        "scope": ("SearchScopeInput", False),
        "cursor": ("String", False),
        "actAsPrincipalId": ("UUID", False),
    },
    "SearchScopeInput": {
        "conversationIds": ("[UUID!]!", False),
    },
    "SendMessageRequestInput": {
        "conversationId": ("UUID!", False),
        "text": ("String!", False),
        "props": ("Properties!", False),
        "actAsPrincipalId": ("UUID", False),
    },
    "SessionRequestOutcomeRequestInput": {
        "requestId": ("UUID!", False),
    },
    "SetBroadcastPermissionInput": {
        "conversationId": ("UUID!", False),
        "principalId": ("UUID!", False),
        "allowed": ("Boolean!", False),
        "expectedMembershipRevision": ("Decimal!", False),
    },
    "SetConversationMuteInput": {
        "conversationId": ("UUID!", False),
        "muted": ("Boolean!", False),
        "until": ("String", False),
        "actAsPrincipalId": ("UUID", False),
    },
    "UpdateConversationRequestInput": {
        "conversationId": ("UUID!", False),
        "expectedRevision": ("Decimal!", False),
        "title": ("String", False),
        "props": ("Properties", False),
    },
    "AgentAuditEventsRequestInput": {
        "orgId": ("UUID!", False),
        "limit": ("PageSize!", True),
        "cursor": ("String", False),
    },
    "AgentCredentialPermitRequestInput": {
        "deliveryId": ("UUID!", False),
        "redemptionRequestId": ("UUID!", False),
    },
    "AgentGrantsRequestInput": {
        "orgId": ("UUID!", False),
        "limit": ("PageSize!", True),
        "cursor": ("String", False),
    },
    "AgentSignupForApprovalRequestInput": {
        "approvalToken": ("String!", False),
    },
    "ApproveAgentSignupRequestInput": {
        "approvalToken": ("String!", False),
        "confirmationCode": ("String!", False),
        "termsRef": ("String!", False),
        "plan": ("String!", False),
        "scopes": ("[String!]!", False),
        "monthlySpendCap": ("String!", False),
        "agentPurchaseLimit": ("String", False),
        "grantExpiresAt": ("String", False),
    },
    "ConfigureWebhookRequestInput": {
        "projectId": ("UUID!", False),
        "url": ("String!", False),
        "eventTypes": ("[String!]!", False),
        "consentRef": ("String!", False),
    },
    "CreateBillingCheckoutSessionRequestInput": {
        "orgId": ("UUID!", False),
        "planId": ("String!", False),
    },
    "CreateBillingPortalSessionRequestInput": {
        "orgId": ("UUID!", False),
    },
    "CreateDeploymentRequestInput": {
        "orgId": ("UUID!", False),
        "offering": ("String!", False),
        "geoId": ("String!", False),
        "installationProfileId": ("String!", False),
        "consentRef": ("String!", False),
    },
    "CreateOrganizationRequestInput": {
        "name": ("String!", False),
        "termsRef": ("String!", False),
    },
    "CreateProjectRequestInput": {
        "deploymentId": ("UUID!", False),
        "name": ("String!", False),
        "environment": ("String!", False),
        "backendPrincipalName": ("String!", False),
    },
    "CredentialPermitRequestInput": {
        "projectId": ("UUID!", False),
        "deliveryId": ("UUID!", False),
        "redemptionRequestId": ("UUID!", False),
    },
    "DeploymentHealthRequestInput": {
        "deploymentId": ("UUID!", False),
    },
    "DeploymentUsageRequestInput": {
        "deploymentId": ("UUID!", False),
        "from": ("String", False),
        "to": ("String", False),
    },
    "DisableWebhookRequestInput": {
        "projectId": ("UUID!", False),
        "endpointId": ("UUID!", False),
        "expectedRevision": ("Decimal!", False),
    },
    "GetDeploymentRequestInput": {
        "deploymentId": ("UUID!", False),
    },
    "GetOrganizationRequestInput": {
        "orgId": ("UUID!", False),
    },
    "GetProjectRequestInput": {
        "projectId": ("UUID!", False),
    },
    "IssueAgentKeyRequestInput": {
        "scopes": ("[String!]!", False),
        "expiresAt": ("String", False),
    },
    "IssueBackendKeyRequestInput": {
        "projectId": ("UUID!", False),
        "name": ("String!", False),
        "scopes": ("[String!]!", False),
        "expiresAt": ("String!", False),
    },
    "OrganizationBillingRequestInput": {
        "orgId": ("UUID!", False),
    },
    "OrganizationSpendRequestInput": {
        "orgId": ("UUID!", False),
    },
    "OrganizationUsageRequestInput": {
        "orgId": ("UUID!", False),
        "from": ("String", False),
        "to": ("String", False),
    },
    "PauseOperationRequestInput": {
        "operationId": ("UUID!", False),
        "expectedRevision": ("Decimal!", False),
    },
    "ProjectPolicyRequestInput": {
        "projectId": ("UUID!", False),
        "expectedRevision": ("Decimal!", False),
        "change": ("PolicyChangeInput!", False),
    },
    "ProjectUsageRequestInput": {
        "projectId": ("UUID!", False),
        "from": ("String", False),
        "to": ("String", False),
    },
    "PurchaseAgentCreditsRequestInput": {
        "amount": ("String!", False),
        "sharedPaymentToken": ("String!", False),
    },
    "RejectAgentSignupRequestInput": {
        "approvalToken": ("String!", False),
        "suppressFutureRequests": ("Boolean!", False),
    },
    "ReplayWebhookDeliveriesRequestInput": {
        "projectId": ("UUID!", False),
        "endpointId": ("UUID!", False),
        "effectId": ("UUID", False),
        "since": ("String", False),
        "until": ("String", False),
    },
    "RequestAgentSignupRequestInput": {
        "ownerEmail": ("String!", False),
        "pollChallenge": ("String!", False),
        "organizationName": ("String!", False),
        "agentName": ("String!", False),
        "purpose": ("String", False),
        "suggestedPlan": ("String", False),
        "suggestedScopes": ("[String!]!", False),
        "suggestedMonthlySpendCap": ("String", False),
    },
    "ResumeOperationRequestInput": {
        "operationId": ("UUID!", False),
        "expectedRevision": ("Decimal!", False),
    },
    "RevokeAgentGrantRequestInput": {
        "grantId": ("UUID!", False),
        "revokeIssuedSessions": ("Boolean!", False),
    },
    "RevokeBackendKeyRequestInput": {
        "projectId": ("UUID!", False),
        "keyId": ("String!", False),
        "expectedRevision": ("Decimal!", False),
        "revokeIssuedSessions": ("Boolean!", False),
    },
    "RotateWebhookSecretRequestInput": {
        "projectId": ("UUID!", False),
        "endpointId": ("UUID!", False),
        "expectedRevision": ("Decimal!", False),
    },
    "SetSpendControlsRequestInput": {
        "orgId": ("UUID!", False),
        "monthlySpendCap": ("String!", False),
        "agentPurchaseLimit": ("String", False),
    },
    "UpdateWebhookRequestInput": {
        "projectId": ("UUID!", False),
        "endpointId": ("UUID!", False),
        "expectedRevision": ("Decimal!", False),
        "eventTypes": ("[String!]!", False),
        "enabled": ("Boolean!", False),
    },
    "WebhookDeliveriesRequestInput": {
        "projectId": ("UUID!", False),
        "endpointId": ("UUID!", False),
    },
    "WebhookEndpointsRequestInput": {
        "projectId": ("UUID!", False),
    },
}
"""Input object fields: their GraphQL type and whether the server has a default."""


SCALARS: Mapping[str, ScalarSpec] = {
    "String": ScalarSpec(representation="string"),
    "Boolean": ScalarSpec(representation="boolean"),
    "Int": ScalarSpec(representation="integer"),
    "Decimal": ScalarSpec(representation="string", pattern="^(0|[1-9][0-9]*)$", maximum_decimal="9223372036854775807"),
    "PageSize": ScalarSpec(representation="integer", minimum=1, maximum=100),
    "Properties": ScalarSpec(representation="object", max_canonical_json_bytes=8192),
    "SignedProof": ScalarSpec(representation="object", max_canonical_json_bytes=32768, required_string_properties=("signature",)),
    "UUID": ScalarSpec(representation="string", pattern="^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", disallowed=("00000000-0000-0000-0000-000000000000",)),
}
"""Scalars the operations use."""


IDEMPOTENCY: Mapping[str, IdempotencySpec] = {
    "ephemeral": IdempotencySpec(retry="none", resolvable=False, max_attempts=None, window_ms=None),
    "idempotent": IdempotencySpec(retry="sameRequest", resolvable=True, max_attempts=3, window_ms=60000),
    "permitBound": IdempotencySpec(retry="sameRequest", resolvable=False, max_attempts=3, window_ms=60000),
    "replayOnly": IdempotencySpec(retry="sameRequest", resolvable=False, max_attempts=3, window_ms=60000),
    "safe": IdempotencySpec(retry="repeat", resolvable=False, max_attempts=None, window_ms=None),
    "singleUse": IdempotencySpec(retry="sameRequest", resolvable=True, max_attempts=3, window_ms=60000),
}
"""Idempotency classes."""


PLANES: Mapping[str, str | None] = {
    "communication": "communication.resolveRequest",
    "management": "management.resolveRequest",
}
"""The operation that resolves an unknown mutation outcome, per plane."""


ERRORS: Mapping[str, ErrorSpec] = {
    "ADMISSION_LIMIT": ErrorSpec(summary="A rate, size or concurrency admission limit was reached. Back off, then retry with the same requestId.", origin="both", status=429, retryable=True),
    "AGENTIC_NOT_CONFIGURED": ErrorSpec(summary="Agent signup is not offered in this environment.", origin="server", status=503, retryable=False),
    "AGENT_CONFIRMATION_CODE_INVALID": ErrorSpec(summary="The confirmation code differs from the one the agent shows. The fifth wrong code closes the signup request.", origin="server", status=403, retryable=False),
    "AGENT_GRANT_EXPIRED": ErrorSpec(summary="The agent's grant has expired. The agent needs a new signup request approved.", origin="server", status=403, retryable=False),
    "AGENT_GRANT_REVOKED": ErrorSpec(summary="The owner revoked the agent's grant.", origin="server", status=403, retryable=False),
    "AGENT_KEY_LIMIT": ErrorSpec(summary="The grant already has as many active keys as it allows. Issue another after one expires or the owner revokes one.", origin="server", status=409, retryable=False),
    "AGENT_PURCHASE_LIMIT_EXCEEDED": ErrorSpec(summary="The purchase would take this month's agent credit purchases beyond the limit the owner set.", origin="server", status=402, retryable=False),
    "AGENT_SCOPE_NOT_GRANTED": ErrorSpec(summary="A requested scope is outside the agent's grant.", origin="server", status=403, retryable=False),
    "AGENT_SIGNUP_CLOSED": ErrorSpec(summary="The signup request is no longer pending: it was approved, rejected, locked by wrong confirmation codes, or has expired.", origin="server", status=409, retryable=False),
    "AGENT_SIGNUP_EMAIL_REJECTED": ErrorSpec(summary="The owner's email address is refused, for example for a disposable domain.", origin="server", status=400, retryable=False),
    "AGENT_SIGNUP_NOT_READY": ErrorSpec(summary="The signup is not approved, or its organization and project are still being provisioned. Poll agentSignup until it is ready.", origin="server", status=409, retryable=False),
    "AGENT_SIGNUP_SUPPRESSED": ErrorSpec(summary="The owner opted out of agent signup requests to this email address.", origin="server", status=403, retryable=False),
    "ALREADY_CONNECTED": ErrorSpec(summary="The participation already has an active media connection.", origin="server", status=409, retryable=False),
    "ALREADY_EXISTS": ErrorSpec(summary="A resource with the same unique key already exists.", origin="server", status=409, retryable=False),
    "AUTHORITY_UNAVAILABLE": ErrorSpec(summary="The authority is temporarily unavailable. Retry with the same requestId.", origin="both", status=503, retryable=True),
    "BILLING_CATALOG_CONFLICT": ErrorSpec(summary="The billing provider's catalog conflicts with the configured price book, for example a duplicated or unsafe object. An operator must resolve it.", origin="server", status=409, retryable=False),
    "BILLING_CATALOG_NOT_SYNCED": ErrorSpec(summary="The billing provider's catalog does not match the configured price book yet. An operator must sync it.", origin="server", status=409, retryable=False),
    "BILLING_CUSTOMER_MISSING": ErrorSpec(summary="The organization has no billing account yet. Start a checkout first.", origin="server", status=409, retryable=False),
    "BILLING_LINK_EXPIRED": ErrorSpec(summary="The billing link of this request is no longer valid. Send a new request with a new requestId.", origin="server", status=409, retryable=False),
    "BILLING_NOT_CONFIGURED": ErrorSpec(summary="Billing is not configured in this environment.", origin="server", status=503, retryable=False),
    "BILLING_PLAN_UNAVAILABLE": ErrorSpec(summary="The plan is not offered for self-service checkout.", origin="server", status=400, retryable=False),
    "BILLING_PROVIDER_CHANGED": ErrorSpec(summary="The organization's billing account belongs to a different billing provider.", origin="server", status=409, retryable=False),
    "BILLING_PROVIDER_REJECTED": ErrorSpec(summary="The billing provider refused the request.", origin="server", status=409, retryable=False),
    "BILLING_SUBSCRIPTION_ACTIVE": ErrorSpec(summary="The organization already has a subscription. Change it in the billing portal.", origin="server", status=409, retryable=False),
    "BILLING_SUSPENDED": ErrorSpec(summary="The organization is suspended for an unpaid balance. Update its payment method in the billing portal.", origin="server", status=402, retryable=False),
    "CREDENTIAL_DELIVERY_EXPIRED": ErrorSpec(summary="The credential delivery expired or can no longer be redeemed.", origin="server", status=409, retryable=False),
    "CREDENTIAL_EXPIRED": ErrorSpec(summary="The credential carried by the stored result has expired. Request a new one.", origin="server", status=409, retryable=False),
    "CREDENTIAL_REFRESH_REQUIRED": ErrorSpec(summary="The media credential must be refreshed before connecting.", origin="both", status=409, retryable=False),
    "CREDENTIAL_REQUIRED": ErrorSpec(summary="Delivery-permit requests cannot be resolved by lookup. Obtain a current permit and resubmit the same delivery explicitly.", origin="sdk", status=409, retryable=False),
    "CREDITS_EXHAUSTED": ErrorSpec(summary="Prepaid credits are spent and the monthly spend cap is zero, so billable usage beyond the plan's allowances is refused before any effect (WebSocket close 4402). extensions.meter names the meter and extensions.periodEnd ends the spend month. Usage within allowances continues; add credits or raise the cap.", origin="server", status=402, retryable=False),
    "CREDITS_REQUIRE_METERED_PLAN": ErrorSpec(summary="Credits apply only to a billed subscription, and none is in force.", origin="server", status=409, retryable=False),
    "CREDIT_AMOUNT_OUT_OF_RANGE": ErrorSpec(summary="The credit amount is outside the allowed purchase range.", origin="server", status=400, retryable=False),
    "CREDIT_GRANT_LIMIT_REACHED": ErrorSpec(summary="Too many of the organization's credit grants are unconsumed, counting purchases still in progress. Buy more after invoices consume some.", origin="server", status=409, retryable=False),
    "CURSOR_AHEAD": ErrorSpec(summary="The cursor is ahead of the committed events of the conversation.", origin="server", status=409, retryable=False),
    "CURSOR_EXPIRED": ErrorSpec(summary="The cursor is older than retained history. Resynchronize from current state; never reset the cursor silently.", origin="server", status=409, retryable=False),
    "CURSOR_INVALID": ErrorSpec(summary="The cursor is malformed or was not issued for this query.", origin="server", status=409, retryable=False),
    "CURSOR_MISMATCH": ErrorSpec(summary="The cursor does not continue the subscribed stream.", origin="server", status=409, retryable=False),
    "CURSOR_SCOPE_MISMATCH": ErrorSpec(summary="The cursor was issued for a different scope, caller or visibility.", origin="server", status=409, retryable=False),
    "DELIVERY_CONSUMED": ErrorSpec(summary="The delivery was already redeemed by a different request.", origin="server", status=409, retryable=False),
    "DELIVERY_NOT_REDEEMED": ErrorSpec(summary="The delivery must be redeemed before it can be acknowledged.", origin="server", status=409, retryable=False),
    "DEPLOYMENT_NOT_READY": ErrorSpec(summary="The deployment cannot host projects yet.", origin="server", status=409, retryable=False),
    "FEATURE_UNSUPPORTED": ErrorSpec(summary="The feature is not available in this deployment.", origin="server", status=None, retryable=False),
    "FORBIDDEN": ErrorSpec(summary="The credential is valid but not allowed to perform this operation.", origin="server", status=403, retryable=False),
    "GENERATION_CONFLICT": ErrorSpec(summary="The live session generation changed. Read the current generation and retry.", origin="server", status=409, retryable=False),
    "GRAPHQL_ERROR": ErrorSpec(summary="A GraphQL error arrived without a recognized code.", origin="sdk", status=None, retryable=False),
    "GRAPHQL_INVALID_REQUEST": ErrorSpec(summary="The GraphQL request is malformed or fails validation.", origin="server", status=400, retryable=False),
    "GRAPHQL_QUERY_LIMIT": ErrorSpec(summary="The GraphQL document exceeds a depth, complexity or size limit.", origin="server", status=400, retryable=False),
    "GRAPHQL_RESPONSE_LIMIT": ErrorSpec(summary="The query response exceeds the response limit. Request a smaller page.", origin="server", status=413, retryable=False),
    "HTTP_FAILURE": ErrorSpec(summary="The HTTP exchange failed without a usable GraphQL error.", origin="sdk", status=None, retryable=True),
    "IDEMPOTENCY_CONFLICT": ErrorSpec(summary="The requestId was already used with a different payload or caller.", origin="both", status=409, retryable=False),
    "INCARNATION_MISMATCH": ErrorSpec(summary="The project incarnation changed. Discard state from the old incarnation and recover explicitly.", origin="both", status=409, retryable=False),
    "INVALID_REPLACEMENT": ErrorSpec(summary="The connection to replace is not a current connection of this participation.", origin="server", status=409, retryable=False),
    "INVALID_REQUEST": ErrorSpec(summary="The input or request context failed validation.", origin="both", status=400, retryable=False),
    "INVALID_RESPONSE": ErrorSpec(summary="The response did not match the expected shape or identity. The outcome is unknown.", origin="sdk", status=None, retryable=True),
    "LIVE_ALERT_LIMIT": ErrorSpec(summary="The live session reached its alert limit.", origin="server", status=409, retryable=False),
    "LIVE_SESSION_CLOSED": ErrorSpec(summary="The live session has ended or is ending.", origin="server", status=409, retryable=False),
    "LIVE_SESSION_EXISTS": ErrorSpec(summary="The conversation already has an active live session.", origin="server", status=409, retryable=False),
    "MEDIA_CONNECT_FAILED": ErrorSpec(summary="The native media connection failed. The participation remains; resolve and reconnect, or leave explicitly.", origin="sdk", status=None, retryable=False),
    "MEDIA_FENCE_REQUIRED": ErrorSpec(summary="Media cutoff is not enforced yet for this live session. Retry after the cutoff completes.", origin="server", status=409, retryable=False),
    "MEDIA_NOT_READY": ErrorSpec(summary="Media for the live session is not ready yet.", origin="server", status=409, retryable=False),
    "MEDIA_RECOVERING": ErrorSpec(summary="Media for the live session is recovering.", origin="server", status=409, retryable=False),
    "MEMBERSHIP_COUNT_INVALID": ErrorSpec(summary="Membership accounting needs operator reconciliation.", origin="server", status=503, retryable=False),
    "MEMBER_LIMIT": ErrorSpec(summary="The conversation reached its member limit.", origin="server", status=409, retryable=False),
    "MESSAGE_DELETED": ErrorSpec(summary="The message was deleted.", origin="server", status=409, retryable=False),
    "NOT_A_SESSION_REQUEST": ErrorSpec(summary="The requestId does not belong to an issueSession or renewSession request.", origin="server", status=400, retryable=False),
    "NOT_FOUND": ErrorSpec(summary="The resource does not exist or is not visible to the caller.", origin="server", status=404, retryable=False),
    "OUTCOME_UNKNOWN": ErrorSpec(summary="The mutation may have committed. Retry with the same requestId or resolve it.", origin="server", status=503, retryable=True),
    "PAGE_ITEM_TOO_LARGE": ErrorSpec(summary="A single item exceeds the page response limit.", origin="server", status=413, retryable=False),
    "PARTICIPATION_MISMATCH": ErrorSpec(summary="The participation does not belong to the caller or the current live session generation.", origin="both", status=409, retryable=False),
    "PAYMENT_DECLINED": ErrorSpec(summary="The payment rail declined the payment. Nothing was charged.", origin="server", status=402, retryable=False),
    "PAYMENT_RAIL_NOT_CONFIGURED": ErrorSpec(summary="No payment rail is enabled in this environment.", origin="server", status=503, retryable=False),
    "PERMIT_EXPIRED": ErrorSpec(summary="The stored delivery permit has expired. Request a new permit.", origin="server", status=409, retryable=False),
    "PLAN_LIMIT_EXCEEDED": ErrorSpec(summary="The plan does not permit the resource or feature. extensions.planLimit names the limit and extensions.limit holds the plan's value. Change the plan or the limit before trying again.", origin="server", status=403, retryable=False),
    "QUOTA_EXCEEDED": ErrorSpec(summary="A hard usage quota refused new work until the quota period ends. extensions.meter, extensions.limit and extensions.periodEnd describe the quota, and extensions.retryAfter (HTTP Retry-After) counts the seconds until it resets. Work already in progress continues.", origin="server", status=429, retryable=False),
    "RATE_LIMITED": ErrorSpec(summary="A per-second rate limit refused the request before it had any effect. Wait extensions.retryAfter seconds (HTTP Retry-After), then resend the request with the same requestId.", origin="server", status=429, retryable=True),
    "RECOVERY_LIMIT": ErrorSpec(summary="The SDK's recovery store already holds 128 mutation records that are not final, so the new request was not sent. Retry or resolve outstanding requests, then send it again.", origin="sdk", status=409, retryable=False),
    "RECOVERY_STORAGE_FAILURE": ErrorSpec(summary="Caller-provided recovery storage did not confirm durability. Keep the original request and its outcome.", origin="sdk", status=None, retryable=False),
    "REQUEST_EXPIRED": ErrorSpec(summary="The original request is too old to replay.", origin="server", status=409, retryable=False),
    "REQUEST_TOO_LARGE": ErrorSpec(summary="The request body exceeds the size limit.", origin="server", status=413, retryable=False),
    "RESOLUTION_REQUIRED": ErrorSpec(summary="The outcome is still unresolved and the retry budget is spent. Resolve the original request before continuing.", origin="sdk", status=409, retryable=False),
    "RESPONSE_TOO_LARGE": ErrorSpec(summary="The response exceeds the size limit.", origin="server", status=413, retryable=False),
    "RESYNC_REQUIRED": ErrorSpec(summary="The subscription cannot continue. Replay from the last applied cursor.", origin="server", status=409, retryable=False),
    "RETRY_EXHAUSTED": ErrorSpec(summary="The authority exhausted its internal retry budget. Retry later with the same requestId.", origin="server", status=503, retryable=True),
    "REVISION_CONFLICT": ErrorSpec(summary="The expected revision or epoch is stale. Read the current state and retry with a new request.", origin="server", status=409, retryable=False),
    "SCOPE_REQUIRED": ErrorSpec(summary="The backend key lacks a scope this operation requires. The message names the scope.", origin="server", status=403, retryable=False),
    "SESSION_RECEIPT_BINDING_MISMATCH": ErrorSpec(summary="The stored session receipt does not match its binding.", origin="server", status=503, retryable=False),
    "SESSION_RECEIPT_INVALID": ErrorSpec(summary="The stored session receipt failed validation.", origin="server", status=503, retryable=False),
    "SESSION_REFRESH_FAILED": ErrorSpec(summary="The application session refresh callback failed.", origin="sdk", status=None, retryable=False),
    "SESSION_REFRESH_REJECTED": ErrorSpec(summary="The refreshed session was rejected because it does not match the current session.", origin="sdk", status=409, retryable=False),
    "SESSION_REFRESH_REQUIRED": ErrorSpec(summary="The user session needs renewal and no refresh is configured, or it expired.", origin="sdk", status=409, retryable=False),
    "SESSION_REFRESH_UNVERIFIED": ErrorSpec(summary="The refreshed session could not be verified.", origin="sdk", status=None, retryable=False),
    "SPEND_CAP_REACHED": ErrorSpec(summary="The spend month's usage charges reached the charge limit that the organization's prepaid credits and monthly spend cap set, less a safety margin. Billable usage beyond the plan's allowances is refused before any effect (WebSocket close 4402). extensions.meter names the meter and extensions.periodEnd ends the spend month. Usage within allowances continues; add credits or raise the cap.", origin="server", status=402, retryable=False),
    "SPEND_UNVERIFIED": ErrorSpec(summary="Current spend cannot be verified, so billable usage beyond the plan's allowances fails closed before any effect (WebSocket close 4503). extensions.meter names the meter and extensions.periodEnd ends the spend month; extensions.retryAfter (HTTP Retry-After) counts the seconds before the same request may succeed.", origin="server", status=503, retryable=True),
    "TRANSPORT_UNKNOWN": ErrorSpec(summary="The transport failed after the request may have been sent. Resolve or retry the original request.", origin="sdk", status=None, retryable=True),
    "UNAUTHENTICATED": ErrorSpec(summary="The credential is missing, invalid or expired.", origin="both", status=401, retryable=False),
    "WEBHOOK_DESTINATION_DENIED": ErrorSpec(summary="The webhook URL is not a public HTTPS destination.", origin="server", status=400, retryable=False),
    "WEBHOOK_ENDPOINT_DISABLED": ErrorSpec(summary="The webhook endpoint is disabled. Enable it, then replay its deliveries.", origin="server", status=409, retryable=False),
    "WEBHOOK_ENDPOINT_LIMIT": ErrorSpec(summary="The project reached its webhook endpoint limit.", origin="server", status=None, retryable=False),
    "WEBHOOK_ROTATION_PENDING": ErrorSpec(summary="A signing-secret rotation is already waiting for acknowledgement.", origin="server", status=409, retryable=False),
    "WEBHOOK_SECRET_UNACKNOWLEDGED": ErrorSpec(summary="The endpoint's signing secret has not been acknowledged yet.", origin="server", status=409, retryable=False),
    "WRONG_REGION": ErrorSpec(summary="The observed serving epoch is stale. Route again, then retry.", origin="server", status=409, retryable=False),
}
"""Error codes."""
