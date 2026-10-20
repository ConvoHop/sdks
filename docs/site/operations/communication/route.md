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
| [TypeScript](../../typescript/reference/operations.md) | [`ProjectServerClient.initialize`](../../typescript/reference/server.md#projectserverclientinitialize-method), [`RelayClient.initialize`](../../typescript/reference/client.md#relayclientinitialize-method), [`RelayClient.refreshSession`](../../typescript/reference/client.md#relayclientrefreshsession-method), [`RelayClient.scheduleSessionRefresh`](../../typescript/reference/client.md#relayclientschedulesessionrefresh-method), [`useSessionRefresh`](../../typescript/reference/react.md#usesessionrefresh-function) |
| [Python](../../python/reference/operations.md) | [`Relay.route`](../../python/reference/instantrelay.md#relayroute-method), [`Relay.initialize`](../../python/reference/instantrelay.md#relayinitialize-method), [`AsyncRelay.route`](../../python/reference/instantrelay.md#asyncrelayroute-method), [`AsyncRelay.initialize`](../../python/reference/instantrelay.md#asyncrelayinitialize-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ProjectServerClient.InitializeAsync`](../../dotnet/reference/relay.md#projectserverclientinitializeasync-method), [`CommunicationApi.RouteAsync`](../../dotnet/reference/api.md#communicationapirouteasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`ProjectServerClient.initialize`](../../jvm/reference/server.md#projectserverclientinitialize-method), [`CommunicationApi.route`](../../jvm/reference/server.md#communicationapiroute-method), [`CommunicationSuspendApi.route`](../../jvm/reference/server-kotlin.md#communicationsuspendapiroute-method) |
| [Go](../../go/reference/operations.md) | [`ProjectClient.Route`](../../go/reference/relay.md#projectclientroute-method), [`ProjectClient.Initialize`](../../go/reference/relay.md#projectclientinitialize-method) |
| [Swift](../../swift/reference/operations.md) | [`RelayClient.initialize`](../../swift/reference/relay.md#relayclientinitialize-method), [`RelayClient.refreshSession`](../../swift/reference/relay.md#relayclientrefreshsession-method), [`RelayClient.scheduleSessionRefresh`](../../swift/reference/relay.md#relayclientschedulesessionrefresh-method), [`RelayClient.watch`](../../swift/reference/relay.md#relayclientwatch-method), [`RelayClient.resyncAuthorizedHistory`](../../swift/reference/relay.md#relayclientresyncauthorizedhistory-method), [`RelayConversationModel.start`](../../swift/reference/relay.md#relayconversationmodelstart-method), [`RelayConversationModel.resync`](../../swift/reference/relay.md#relayconversationmodelresync-method) |
| [Android](../../android/reference/operations.md) | [`RelayClient.initialize`](../../android/reference/android-core.md#relayclientinitialize-method), [`RelayClient.refreshSession`](../../android/reference/android-core.md#relayclientrefreshsession-method), [`RelayClient.refreshAutomatically`](../../android/reference/android-core.md#relayclientrefreshautomatically-method) |
| [Flutter](../../flutter/reference/operations.md) | [`RelayClient.initialize`](../../flutter/reference/instantrelay.md#relayclientinitialize-method), [`RelayClient.refreshSession`](../../flutter/reference/instantrelay.md#relayclientrefreshsession-method), [`RelayClient.resyncAuthorizedHistory`](../../flutter/reference/instantrelay.md#relayclientresyncauthorizedhistory-method), [`SessionRefresher`](../../flutter/reference/instantrelay.md#sessionrefresher-constructor), [`SessionRefresher.check`](../../flutter/reference/instantrelay.md#sessionrefreshercheck-method), [`CommunicationOperations.route`](../../flutter/reference/instantrelay.md#communicationoperationsroute-method) |
| [React Native](../../react-native/reference/operations.md) | [`RelayClient.initialize`](../../react-native/reference/client.md#relayclientinitialize-method), [`RelayClient.refreshSession`](../../react-native/reference/client.md#relayclientrefreshsession-method), [`RelayClient.scheduleSessionRefresh`](../../react-native/reference/client.md#relayclientschedulesessionrefresh-method), [`useSessionRefresh`](../../react-native/reference/react.md#usesessionrefresh-function) |
