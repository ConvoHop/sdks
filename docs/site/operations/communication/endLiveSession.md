# `communication.endLiveSession`

End a live session for every participant. Completes asynchronously.

- **Operation:** `communication.endLiveSession`, a mutation sent as `CommunicationEndLiveSession`.
- **Layer:** both (client and server SDKs).
- **Authorization** (any one of):
  - `userSession`, when `creatorOrModerator`: The caller started the live session or moderates its conversation.
  - `backendKey` with scope `callManage`.
- **Idempotency:** `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
- **Emits:**
  - `live.ended`: A live session ended.
- **Long-running:** poll `communication.liveSessionOperation` with `input.operationId` set to `endLiveSession.operation.operationId` from the result until the work completes.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: EndLiveSessionInput!`)

| Field | Type |
| --- | --- |
| `liveSessionId` | `UUID!` |
| `expectedGeneration` | `Decimal!` |
| `expectedRevision` | `Decimal!` |

**Result** (`EndLiveSessionPayload!`)

| Field | Type |
| --- | --- |
| `status` | `String!` |
| `requestId` | `UUID!` |
| `receiptId` | `UUID!` |
| `committedAt` | `String!` |
| `replayed` | `Boolean!` |
| `operation` | `OperationRef!` |
| `result` | `LiveSessionEndRequested!` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GENERATION_CONFLICT`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `LIVE_SESSION_CLOSED`, `MEDIA_FENCE_REQUIRED`, `NOT_FOUND`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `REQUEST_EXPIRED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `REVISION_CONFLICT`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `PARTICIPATION_MISMATCH`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `mutation`, `communicationMutation`, `live`, `rateLimited`.

**GraphQL**

```graphql
mutation CommunicationEndLiveSession($context: RequestContextInput!, $input: EndLiveSessionInput!) {
  endLiveSession(context: $context, input: $input) {
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
      operationId
      mediaCutoff {
        state
        scope {
          kind
          liveSessionId
          generation
          participationId
        }
        evidence
        enforcedAt
        operationId
      }
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`ServerLiveSession.end`](../../typescript/reference/server.md#serverlivesessionend-method), [`LiveSessionHandle.end`](../../typescript/reference/client.md#livesessionhandleend-method) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.end_live_session`](../../python/reference/convohop.md#convohopend_live_session-method), [`AsyncConvoHop.end_live_session`](../../python/reference/convohop.md#asyncconvohopend_live_session-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`CommunicationApi.endLiveSession`](../../jvm/reference/server.md#communicationapiendlivesession-method), [`CommunicationSuspendApi.endLiveSession`](../../jvm/reference/server-kotlin.md#communicationsuspendapiendlivesession-method) |
