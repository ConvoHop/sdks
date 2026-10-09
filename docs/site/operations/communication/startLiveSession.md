# `communication.startLiveSession`

Start a live session (a call) in a conversation. Readiness completes asynchronously.

- **Operation:** `communication.startLiveSession`, a mutation sent as `CommunicationStartLiveSession`.
- **Layer:** client (client SDKs).
- **Authorization:** `userSession`, when `member`: The caller is an active member of the conversation.
- **Idempotency:** `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
- **Emits:**
  - `live.started`: A live session started.
  - `live.ready`: A live session became ready for media.
- **Long-running:** poll `communication.liveSessionOperation` with `input.operationId` set to `startLiveSession.operation.operationId` from the result until the work completes.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: StartLiveSessionInput!`)

| Field | Type | Default |
| --- | --- | --- |
| `conversationId` | `UUID!` |  |
| `kind` | `LiveSessionKind!` | `"INTERACTIVE"` |
| `mediaProfile` | `LiveMediaProfile!` | `"AUDIO_ONLY"` |

**Result** (`StartLiveSessionPayload!`)

| Field | Type |
| --- | --- |
| `status` | `String!` |
| `requestId` | `UUID!` |
| `receiptId` | `UUID!` |
| `committedAt` | `String!` |
| `replayed` | `Boolean!` |
| `operation` | `OperationRef!` |
| `result` | `LiveSessionStarted!` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `LIVE_SESSION_EXISTS`, `MEDIA_RECOVERING`, `NOT_FOUND`, `OUTCOME_UNKNOWN`, `PLAN_LIMIT_EXCEEDED`, `QUOTA_EXCEEDED`, `RATE_LIMITED`, `REQUEST_EXPIRED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_LIMIT`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `mutation`, `communicationMutation`, `rateLimited`.

**GraphQL**

```graphql
mutation CommunicationStartLiveSession($context: RequestContextInput!, $input: StartLiveSessionInput!) {
  startLiveSession(context: $context, input: $input) {
    status
    requestId
    receiptId
    committedAt
    replayed
    operation {
      operationId
      owner
      href
      state
    }
    result {
      liveSessionId
      conversationId
      kind
      mediaProfile
      operationId
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`ConversationLive.startVoice`](../../typescript/reference/client.md#conversationlivestartvoice-method), [`ConversationLive.startVideo`](../../typescript/reference/client.md#conversationlivestartvideo-method), [`ConversationLive.startBroadcast`](../../typescript/reference/client.md#conversationlivestartbroadcast-method) |
| [Android](../../android/reference/operations.md) | [`ConversationLive.startVoice`](../../android/reference/android-core.md#conversationlivestartvoice-method), [`ConversationLive.startVideo`](../../android/reference/android-core.md#conversationlivestartvideo-method), [`ConversationLive.startBroadcast`](../../android/reference/android-core.md#conversationlivestartbroadcast-method) |
| [Flutter](../../flutter/reference/operations.md) | [`ConversationLive.startVoice`](../../flutter/reference/convohop.md#conversationlivestartvoice-method), [`ConversationLive.startVideo`](../../flutter/reference/convohop.md#conversationlivestartvideo-method), [`ConversationLive.startBroadcast`](../../flutter/reference/convohop.md#conversationlivestartbroadcast-method), [`CommunicationOperations.startLiveSession`](../../flutter/reference/convohop.md#communicationoperationsstartlivesession-method) |
