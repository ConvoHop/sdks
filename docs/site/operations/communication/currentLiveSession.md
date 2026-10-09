# `communication.currentLiveSession`

Return the active live session of a conversation, if any.

- **Operation:** `communication.currentLiveSession`, a query sent as `CommunicationCurrentLiveSession`.
- **Layer:** both (client and server SDKs).
- **Authorization** (any one of):
  - `userSession`, when `member`: The caller is an active member of the conversation.
  - `backendKey` with scope `callRead`.
  - `backendKey` with scope `callManage`.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: ConversationLiveInput!`)

| Field | Type |
| --- | --- |
| `conversationId` | `UUID!` |

**Result** (`CurrentLiveSessionReply!`)

| Field | Type |
| --- | --- |
| `status` | `String!` |
| `requestId` | `UUID!` |
| `serverTime` | `String!` |
| `result` | `LiveSession` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `rateLimited`.

**GraphQL**

```graphql
query CommunicationCurrentLiveSession($context: RequestContextInput!, $input: ConversationLiveInput!) {
  currentLiveSession(context: $context, input: $input) {
    status
    requestId
    serverTime
    result {
      liveSessionId
      conversationId
      creatorId
      kind
      mediaProfile
      state
      generation
      revision
      createdAt
      expiresAt
      myParticipation {
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
| [TypeScript](../../typescript/reference/operations.md) | [`ServerConversation.live.current`](../../typescript/reference/server.md#serverconversationlivecurrent-method), [`ConversationLive.current`](../../typescript/reference/client.md#conversationlivecurrent-method), [`useLiveSession`](../../typescript/reference/react.md#uselivesession-function), [`LiveSessionView.refresh`](../../typescript/reference/react.md#livesessionviewrefresh-method) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.current_live_session`](../../python/reference/convohop.md#convohopcurrent_live_session-method), [`AsyncConvoHop.current_live_session`](../../python/reference/convohop.md#asyncconvohopcurrent_live_session-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ServerConversationLive.GetCurrentAsync`](../../dotnet/reference/convohop.md#serverconversationlivegetcurrentasync-method), [`CommunicationApi.CurrentLiveSessionAsync`](../../dotnet/reference/api.md#communicationapicurrentlivesessionasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`CommunicationApi.currentLiveSession`](../../jvm/reference/server.md#communicationapicurrentlivesession-method), [`CommunicationSuspendApi.currentLiveSession`](../../jvm/reference/server-kotlin.md#communicationsuspendapicurrentlivesession-method) |
| [Go](../../go/reference/operations.md) | [`ProjectClient.CurrentLiveSession`](../../go/reference/convohop.md#projectclientcurrentlivesession-method) |
| [Swift](../../swift/reference/operations.md) | [`ConversationLive.current`](../../swift/reference/convohop.md#conversationlivecurrent-method) |
| [Android](../../android/reference/operations.md) | [`ConversationLive.current`](../../android/reference/android-core.md#conversationlivecurrent-method) |
| [Flutter](../../flutter/reference/operations.md) | [`ConversationLive.current`](../../flutter/reference/convohop.md#conversationlivecurrent-method), [`CommunicationOperations.currentLiveSession`](../../flutter/reference/convohop.md#communicationoperationscurrentlivesession-method) |
