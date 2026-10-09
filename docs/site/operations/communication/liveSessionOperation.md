# `communication.liveSessionOperation`

Read the state of a live session start or end operation.

- **Operation:** `communication.liveSessionOperation`, a query sent as `CommunicationLiveSessionOperation`.
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

**Input** (`input: LiveSessionOperationInput!`)

| Field | Type |
| --- | --- |
| `operationId` | `UUID!` |

**Result** (`LiveSessionOperationReply!`)

| Field | Type |
| --- | --- |
| `status` | `String!` |
| `requestId` | `UUID!` |
| `serverTime` | `String!` |
| `result` | `LiveSessionOperation!` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `rateLimited`.

**GraphQL**

```graphql
query CommunicationLiveSessionOperation($context: RequestContextInput!, $input: LiveSessionOperationInput!) {
  liveSessionOperation(context: $context, input: $input) {
    status
    requestId
    serverTime
    result {
      operationId
      requestId
      liveSessionId
      kind
      state
      revision
      requestedAt
      completedAt
      completion {
        liveSessionId
        generation
        state
        revision
        completedAt
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
      failure {
        code
        message
      }
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`ServerLiveOperation.get`](../../typescript/reference/server.md#serverliveoperationget-method), [`ServerLiveOperation.completed`](../../typescript/reference/server.md#serverliveoperationcompleted-method), [`LiveStartOperation.get`](../../typescript/reference/client.md#livestartoperationget-method), [`LiveStartOperation.completed`](../../typescript/reference/client.md#livestartoperationcompleted-method), [`LiveStartOperation.ready`](../../typescript/reference/client.md#livestartoperationready-method), [`LiveEndOperation.get`](../../typescript/reference/client.md#liveendoperationget-method), [`LiveEndOperation.completed`](../../typescript/reference/client.md#liveendoperationcompleted-method) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.live_session_operation`](../../python/reference/convohop.md#convohoplive_session_operation-method), [`AsyncConvoHop.live_session_operation`](../../python/reference/convohop.md#asyncconvohoplive_session_operation-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ServerLiveOperation.GetAsync`](../../dotnet/reference/convohop.md#serverliveoperationgetasync-method), [`ServerLiveOperation.WaitForCompletionAsync`](../../dotnet/reference/convohop.md#serverliveoperationwaitforcompletionasync-method), [`CommunicationApi.LiveSessionOperationAsync`](../../dotnet/reference/api.md#communicationapilivesessionoperationasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`CommunicationApi.liveSessionOperation`](../../jvm/reference/server.md#communicationapilivesessionoperation-method), [`CommunicationSuspendApi.liveSessionOperation`](../../jvm/reference/server-kotlin.md#communicationsuspendapilivesessionoperation-method) |
| [Go](../../go/reference/operations.md) | [`ProjectClient.LiveSessionOperation`](../../go/reference/convohop.md#projectclientlivesessionoperation-method) |
| [Swift](../../swift/reference/operations.md) | [`LiveAction.get`](../../swift/reference/convohop.md#liveactionget-method), [`LiveAction.completed`](../../swift/reference/convohop.md#liveactioncompleted-method), [`LiveStartOperation.ready`](../../swift/reference/convohop.md#livestartoperationready-method) |
| [Android](../../android/reference/operations.md) | [`LiveAction.get`](../../android/reference/android-core.md#liveactionget-method), [`LiveAction.completed`](../../android/reference/android-core.md#liveactioncompleted-method), [`LiveStartOperation.ready`](../../android/reference/android-core.md#livestartoperationready-method) |
| [Flutter](../../flutter/reference/operations.md) | [`LiveAction.get`](../../flutter/reference/convohop.md#liveactionget-method), [`LiveAction.completed`](../../flutter/reference/convohop.md#liveactioncompleted-method), [`LiveStartOperation.ready`](../../flutter/reference/convohop.md#livestartoperationready-method), [`CommunicationOperations.liveSessionOperation`](../../flutter/reference/convohop.md#communicationoperationslivesessionoperation-method) |
| [React Native](../../react-native/reference/operations.md) | [`LiveStartOperation.get`](../../react-native/reference/client.md#livestartoperationget-method), [`LiveStartOperation.completed`](../../react-native/reference/client.md#livestartoperationcompleted-method), [`LiveStartOperation.ready`](../../react-native/reference/client.md#livestartoperationready-method), [`LiveEndOperation.get`](../../react-native/reference/client.md#liveendoperationget-method), [`LiveEndOperation.completed`](../../react-native/reference/client.md#liveendoperationcompleted-method) |
