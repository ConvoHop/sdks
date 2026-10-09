# `communication.joinLiveSession`

Join a live session.

- **Operation:** `communication.joinLiveSession`, a mutation sent as `CommunicationJoinLiveSession`.
- **Layer:** client (client SDKs).
- **Authorization:** `userSession`, when `member`: The caller is an active member of the conversation.
- **Idempotency:** `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
- **Emits:**
  - `live.participationChanged`: A participant joined or left a live session.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: JoinLiveSessionInput!`)

| Field | Type |
| --- | --- |
| `liveSessionId` | `UUID!` |
| `expectedGeneration` | `Decimal!` |

**Result** (`JoinLiveSessionPayload!`)

| Field | Type |
| --- | --- |
| `status` | `String!` |
| `requestId` | `UUID!` |
| `receiptId` | `UUID!` |
| `committedAt` | `String!` |
| `replayed` | `Boolean!` |
| `result` | `LiveSessionJoined!` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GENERATION_CONFLICT`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `LIVE_SESSION_CLOSED`, `NOT_FOUND`, `OUTCOME_UNKNOWN`, `PLAN_LIMIT_EXCEEDED`, `QUOTA_EXCEEDED`, `RATE_LIMITED`, `REQUEST_EXPIRED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `PARTICIPATION_MISMATCH`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `mutation`, `communicationMutation`, `live`, `rateLimited`.

**GraphQL**

```graphql
mutation CommunicationJoinLiveSession($context: RequestContextInput!, $input: JoinLiveSessionInput!) {
  joinLiveSession(context: $context, input: $input) {
    status
    requestId
    receiptId
    committedAt
    replayed
    result {
      liveSessionId
      generation
      participation {
        participationId
        principalId
        membershipEpoch
        role
        state
        permissions {
          microphone
          camera
          subscribe
        }
        reservationExpiresAt
        nativeConnectionId
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
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`LiveSessionHandle.join`](../../typescript/reference/client.md#livesessionhandlejoin-method) |
| [Android](../../android/reference/operations.md) | [`LiveSessionHandle.join`](../../android/reference/android-core.md#livesessionhandlejoin-method), [`ConvoHopCall.answer` (static)](../../android/reference/android.md#convohopcallanswer-static-method) |
| [Flutter](../../flutter/reference/operations.md) | [`LiveSessionHandle.join`](../../flutter/reference/convohop.md#livesessionhandlejoin-method), [`CommunicationOperations.joinLiveSession`](../../flutter/reference/convohop.md#communicationoperationsjoinlivesession-method) |
