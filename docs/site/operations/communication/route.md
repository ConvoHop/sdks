# `communication.route`

Return the signed route: project incarnation, serving epoch and realtime endpoint. Call it before other communication operations and again after WRONG_REGION.

- **Operation:** `communication.route`, a query sent as `CommunicationRoute`.
- **Layer:** both (client and server SDKs).
- **Authorization** (any one of):
  - `userSession`.
  - `backendKey`.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | optional |
| `observedServingEpoch` | `Decimal` | optional |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Result** (`RouteReply!`)

| Field | Type |
| --- | --- |
| `status` | `String!` |
| `requestId` | `UUID!` |
| `serverTime` | `String` |
| `receiptId` | `UUID` |
| `committedAt` | `String` |
| `replayed` | `Boolean` |
| `operation` | `OperationRef` |
| `resourceRef` | `ResourceRef` |
| `result` | `SignedProof` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `rateLimited`.

**GraphQL**

```graphql
query CommunicationRoute($context: RequestContextInput!) {
  route(context: $context) {
    status
    requestId
    serverTime
    receiptId
    committedAt
    replayed
    operation {
      operationId
      owner
      href
      state
    }
    resourceRef {
      kind
      id
    }
    result
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`ProjectServerClient.initialize`](../../typescript/reference/server.md#projectserverclientinitialize-method), [`ConvoHopClient.initialize`](../../typescript/reference/client.md#convohopclientinitialize-method), [`ConvoHopClient.refreshSession`](../../typescript/reference/client.md#convohopclientrefreshsession-method), [`ConvoHopClient.scheduleSessionRefresh`](../../typescript/reference/client.md#convohopclientschedulesessionrefresh-method), [`useSessionRefresh`](../../typescript/reference/react.md#usesessionrefresh-function) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.route`](../../python/reference/convohop.md#convohoproute-method), [`ConvoHop.initialize`](../../python/reference/convohop.md#convohopinitialize-method), [`AsyncConvoHop.route`](../../python/reference/convohop.md#asyncconvohoproute-method), [`AsyncConvoHop.initialize`](../../python/reference/convohop.md#asyncconvohopinitialize-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ProjectServerClient.InitializeAsync`](../../dotnet/reference/convohop.md#projectserverclientinitializeasync-method), [`CommunicationApi.RouteAsync`](../../dotnet/reference/api.md#communicationapirouteasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`ProjectServerClient.initialize`](../../jvm/reference/server.md#projectserverclientinitialize-method), [`CommunicationApi.route`](../../jvm/reference/server.md#communicationapiroute-method), [`CommunicationSuspendApi.route`](../../jvm/reference/server-kotlin.md#communicationsuspendapiroute-method) |
| [Go](../../go/reference/operations.md) | [`ProjectClient.Route`](../../go/reference/convohop.md#projectclientroute-method), [`ProjectClient.Initialize`](../../go/reference/convohop.md#projectclientinitialize-method) |
| [Swift](../../swift/reference/operations.md) | [`ConvoHopClient.initialize`](../../swift/reference/convohop.md#convohopclientinitialize-method), [`ConvoHopClient.refreshSession`](../../swift/reference/convohop.md#convohopclientrefreshsession-method), [`ConvoHopClient.scheduleSessionRefresh`](../../swift/reference/convohop.md#convohopclientschedulesessionrefresh-method), [`ConvoHopClient.watch`](../../swift/reference/convohop.md#convohopclientwatch-method), [`ConvoHopClient.resyncAuthorizedHistory`](../../swift/reference/convohop.md#convohopclientresyncauthorizedhistory-method), [`ConvoHopConversationModel.start`](../../swift/reference/convohop.md#convohopconversationmodelstart-method), [`ConvoHopConversationModel.resync`](../../swift/reference/convohop.md#convohopconversationmodelresync-method) |
| [Android](../../android/reference/operations.md) | [`ConvoHopClient.initialize`](../../android/reference/android-core.md#convohopclientinitialize-method), [`ConvoHopClient.refreshSession`](../../android/reference/android-core.md#convohopclientrefreshsession-method), [`ConvoHopClient.refreshAutomatically`](../../android/reference/android-core.md#convohopclientrefreshautomatically-method) |
| [Flutter](../../flutter/reference/operations.md) | [`ConvoHopClient.initialize`](../../flutter/reference/convohop.md#convohopclientinitialize-method), [`ConvoHopClient.refreshSession`](../../flutter/reference/convohop.md#convohopclientrefreshsession-method), [`ConvoHopClient.resyncAuthorizedHistory`](../../flutter/reference/convohop.md#convohopclientresyncauthorizedhistory-method), [`SessionRefresher`](../../flutter/reference/convohop.md#sessionrefresher-constructor), [`SessionRefresher.check`](../../flutter/reference/convohop.md#sessionrefreshercheck-method), [`CommunicationOperations.route`](../../flutter/reference/convohop.md#communicationoperationsroute-method) |
| [React Native](../../react-native/reference/operations.md) | [`ConvoHopClient.initialize`](../../react-native/reference/client.md#convohopclientinitialize-method), [`ConvoHopClient.refreshSession`](../../react-native/reference/client.md#convohopclientrefreshsession-method), [`ConvoHopClient.scheduleSessionRefresh`](../../react-native/reference/client.md#convohopclientschedulesessionrefresh-method), [`useSessionRefresh`](../../react-native/reference/react.md#usesessionrefresh-function) |
