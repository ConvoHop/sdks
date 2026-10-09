# `communication.alertLiveSession`

Alert (ring) conversation members about a live session.

- **Operation:** `communication.alertLiveSession`, a mutation sent as `CommunicationAlertLiveSession`.
- **Layer:** both (client and server SDKs).
- **Authorization** (any one of):
  - `userSession`, when `creatorOrModerator`: The caller started the live session or moderates its conversation.
  - `backendKey` with scope `callManage`.
- **Idempotency:** `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
- **Emits:**
  - `live.alerted`: Members were alerted about a live session.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: AlertLiveSessionInput!`)

| Field | Type |
| --- | --- |
| `liveSessionId` | `UUID!` |
| `expectedGeneration` | `Decimal!` |
| `principalIds` | `[UUID!]!` |

**Result** (`AlertLiveSessionPayload!`)

| Field | Type |
| --- | --- |
| `status` | `String!` |
| `requestId` | `UUID!` |
| `receiptId` | `UUID!` |
| `committedAt` | `String!` |
| `replayed` | `Boolean!` |
| `result` | `LiveAlertBatch!` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GENERATION_CONFLICT`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `LIVE_ALERT_LIMIT`, `LIVE_SESSION_CLOSED`, `NOT_FOUND`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `REQUEST_EXPIRED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `PARTICIPATION_MISMATCH`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `mutation`, `communicationMutation`, `live`, `rateLimited`.

**GraphQL**

```graphql
mutation CommunicationAlertLiveSession($context: RequestContextInput!, $input: AlertLiveSessionInput!) {
  alertLiveSession(context: $context, input: $input) {
    status
    requestId
    receiptId
    committedAt
    replayed
    result {
      liveSessionId
      created
      suppressed
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`ServerLiveSession.alert`](../../typescript/reference/server.md#serverlivesessionalert-method), [`LiveSessionHandle.alerts.send`](../../typescript/reference/client.md#livesessionhandlealertssend-property) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.alert_live_session`](../../python/reference/convohop.md#convohopalert_live_session-method), [`AsyncConvoHop.alert_live_session`](../../python/reference/convohop.md#asyncconvohopalert_live_session-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`CommunicationApi.alertLiveSession`](../../jvm/reference/server.md#communicationapialertlivesession-method), [`CommunicationSuspendApi.alertLiveSession`](../../jvm/reference/server-kotlin.md#communicationsuspendapialertlivesession-method) |
