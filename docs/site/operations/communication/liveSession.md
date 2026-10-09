# `communication.liveSession`

Read a live session.

- **Operation:** `communication.liveSession`, a query sent as `CommunicationLiveSession`.
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

**Input** (`input: LiveSessionInput!`)

| Field | Type |
| --- | --- |
| `liveSessionId` | `UUID!` |

**Result** (`LiveSessionReply!`)

| Field | Type |
| --- | --- |
| `status` | `String!` |
| `requestId` | `UUID!` |
| `serverTime` | `String!` |
| `result` | `LiveSession!` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `rateLimited`.

**GraphQL**

```graphql
query CommunicationLiveSession($context: RequestContextInput!, $input: LiveSessionInput!) {
  liveSession(context: $context, input: $input) {
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
| [TypeScript](../../typescript/reference/operations.md) | [`ServerLiveSession.get`](../../typescript/reference/server.md#serverlivesessionget-method), [`ConvoHopClient.liveSession`](../../typescript/reference/client.md#convohopclientlivesession-method), [`LiveSessionHandle.get` (static)](../../typescript/reference/client.md#livesessionhandleget-static-method), [`LiveSessionHandle.get`](../../typescript/reference/client.md#livesessionhandleget-method), [`LiveSessionHandle.participation`](../../typescript/reference/client.md#livesessionhandleparticipation-method), [`LiveStartOperation.ready`](../../typescript/reference/client.md#livestartoperationready-method), [`LiveParticipationHandle.get`](../../typescript/reference/client.md#liveparticipationhandleget-method) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.live_session`](../../python/reference/convohop.md#convohoplive_session-method), [`AsyncConvoHop.live_session`](../../python/reference/convohop.md#asyncconvohoplive_session-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ServerLiveSession.GetAsync`](../../dotnet/reference/convohop.md#serverlivesessiongetasync-method), [`CommunicationApi.LiveSessionAsync`](../../dotnet/reference/api.md#communicationapilivesessionasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`CommunicationApi.liveSession`](../../jvm/reference/server.md#communicationapilivesession-method), [`CommunicationSuspendApi.liveSession`](../../jvm/reference/server-kotlin.md#communicationsuspendapilivesession-method) |
| [Go](../../go/reference/operations.md) | [`ProjectClient.LiveSession`](../../go/reference/convohop.md#projectclientlivesession-method) |
| [Android](../../android/reference/operations.md) | [`ConvoHopClient.liveSession`](../../android/reference/android-core.md#convohopclientlivesession-method), [`LiveSessionHandle.get`](../../android/reference/android-core.md#livesessionhandleget-method), [`LiveSessionHandle.participation`](../../android/reference/android-core.md#livesessionhandleparticipation-method), [`LiveSessionHandle.end`](../../android/reference/android-core.md#livesessionhandleend-method), [`LiveStartOperation.ready`](../../android/reference/android-core.md#livestartoperationready-method), [`LiveParticipationHandle.get`](../../android/reference/android-core.md#liveparticipationhandleget-method), [`ConvoHopCall.answer` (static)](../../android/reference/android.md#convohopcallanswer-static-method) |
| [Flutter](../../flutter/reference/operations.md) | [`ConvoHopClient.liveSession`](../../flutter/reference/convohop.md#convohopclientlivesession-method), [`LiveSessionHandle.get`](../../flutter/reference/convohop.md#livesessionhandleget-method), [`LiveSessionHandle.participation`](../../flutter/reference/convohop.md#livesessionhandleparticipation-method), [`LiveSessionHandle.end`](../../flutter/reference/convohop.md#livesessionhandleend-method), [`LiveStartOperation.ready`](../../flutter/reference/convohop.md#livestartoperationready-method), [`LiveParticipationHandle.get`](../../flutter/reference/convohop.md#liveparticipationhandleget-method), [`LiveParticipationHandle.connect`](../../flutter/reference/convohop.md#liveparticipationhandleconnect-method), [`LiveMediaConnection.reconnect`](../../flutter/reference/convohop.md#livemediaconnectionreconnect-method), [`CommunicationOperations.liveSession`](../../flutter/reference/convohop.md#communicationoperationslivesession-method) |
