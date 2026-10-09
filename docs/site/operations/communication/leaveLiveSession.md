# `communication.leaveLiveSession`

Leave a live session.

- **Operation:** `communication.leaveLiveSession`, a mutation sent as `CommunicationLeaveLiveSession`.
- **Layer:** client (client SDKs).
- **Authorization:** `userSession`, when `participant`: The caller holds the referenced participation in the live session.
- **Idempotency:** `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
- **Emits:**
  - `live.participationChanged`: A participant joined or left a live session.
  - `live.ended`: A live session ended.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: LeaveLiveSessionInput!`)

| Field | Type |
| --- | --- |
| `liveSessionId` | `UUID!` |
| `expectedGeneration` | `Decimal!` |
| `participationId` | `UUID!` |

**Result** (`LeaveLiveSessionPayload!`)

| Field | Type |
| --- | --- |
| `status` | `String!` |
| `requestId` | `UUID!` |
| `receiptId` | `UUID!` |
| `committedAt` | `String!` |
| `replayed` | `Boolean!` |
| `result` | `LiveSessionLeft!` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GENERATION_CONFLICT`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `LIVE_SESSION_CLOSED`, `MEDIA_FENCE_REQUIRED`, `NOT_FOUND`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `REQUEST_EXPIRED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `PARTICIPATION_MISMATCH`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_LIMIT`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `mutation`, `communicationMutation`, `live`, `rateLimited`.

**GraphQL**

```graphql
mutation CommunicationLeaveLiveSession($context: RequestContextInput!, $input: LeaveLiveSessionInput!) {
  leaveLiveSession(context: $context, input: $input) {
    status
    requestId
    receiptId
    committedAt
    replayed
    result {
      liveSessionId
      participationId
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
| [TypeScript](../../typescript/reference/operations.md) | [`LiveParticipationHandle.leave`](../../typescript/reference/client.md#liveparticipationhandleleave-method) |
| [Swift](../../swift/reference/operations.md) | [`LiveParticipationHandle.leave`](../../swift/reference/convohop.md#liveparticipationhandleleave-method) |
| [Android](../../android/reference/operations.md) | [`LiveParticipationHandle.leave`](../../android/reference/android-core.md#liveparticipationhandleleave-method), [`ConvoHopCall.hangUp`](../../android/reference/android.md#convohopcallhangup-method) |
| [Flutter](../../flutter/reference/operations.md) | [`LiveParticipationHandle.leave`](../../flutter/reference/convohop.md#liveparticipationhandleleave-method), [`CommunicationOperations.leaveLiveSession`](../../flutter/reference/convohop.md#communicationoperationsleavelivesession-method) |
