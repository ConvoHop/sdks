# `communication.currentSession`

Return the calling user session.

- **Operation:** `communication.currentSession`, a query sent as `CommunicationCurrentSession`.
- **Layer:** client (client SDKs).
- **Authorization:** `userSession`.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Result** (`CurrentSessionReply!`)

| Field | Type |
| --- | --- |
| `status` | `String!` |
| `requestId` | `UUID!` |
| `serverTime` | `String!` |
| `result` | `Session!` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `rateLimited`.

**GraphQL**

```graphql
query CommunicationCurrentSession($context: RequestContextInput!) {
  currentSession(context: $context) {
    status
    requestId
    serverTime
    result {
      sessionId
      principalId
      deviceId
      incarnation
      sessionRevision
      expiresAt
      status
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`RelayClient.initialize`](../../typescript/reference/client.md#relayclientinitialize-method), [`RelayClient.refreshSession`](../../typescript/reference/client.md#relayclientrefreshsession-method), [`RelayClient.scheduleSessionRefresh`](../../typescript/reference/client.md#relayclientschedulesessionrefresh-method), [`useSessionRefresh`](../../typescript/reference/react.md#usesessionrefresh-function) |
| [Swift](../../swift/reference/operations.md) | [`RelayClient.initialize`](../../swift/reference/relay.md#relayclientinitialize-method), [`RelayClient.refreshSession`](../../swift/reference/relay.md#relayclientrefreshsession-method), [`RelayClient.scheduleSessionRefresh`](../../swift/reference/relay.md#relayclientschedulesessionrefresh-method), [`RelayClient.watch`](../../swift/reference/relay.md#relayclientwatch-method), [`RelayClient.resyncAuthorizedHistory`](../../swift/reference/relay.md#relayclientresyncauthorizedhistory-method), [`RelayConversationModel.start`](../../swift/reference/relay.md#relayconversationmodelstart-method), [`RelayConversationModel.resync`](../../swift/reference/relay.md#relayconversationmodelresync-method) |
| [Android](../../android/reference/operations.md) | [`RelayClient.initialize`](../../android/reference/android-core.md#relayclientinitialize-method), [`RelayClient.refreshSession`](../../android/reference/android-core.md#relayclientrefreshsession-method), [`RelayClient.refreshAutomatically`](../../android/reference/android-core.md#relayclientrefreshautomatically-method) |
| [Flutter](../../flutter/reference/operations.md) | [`RelayClient.initialize`](../../flutter/reference/instantrelay.md#relayclientinitialize-method), [`RelayClient.refreshSession`](../../flutter/reference/instantrelay.md#relayclientrefreshsession-method), [`SessionRefresher`](../../flutter/reference/instantrelay.md#sessionrefresher-constructor), [`SessionRefresher.check`](../../flutter/reference/instantrelay.md#sessionrefreshercheck-method), [`CommunicationOperations.currentSession`](../../flutter/reference/instantrelay.md#communicationoperationscurrentsession-method) |
| [React Native](../../react-native/reference/operations.md) | [`RelayClient.initialize`](../../react-native/reference/client.md#relayclientinitialize-method), [`RelayClient.refreshSession`](../../react-native/reference/client.md#relayclientrefreshsession-method), [`RelayClient.scheduleSessionRefresh`](../../react-native/reference/client.md#relayclientschedulesessionrefresh-method), [`useSessionRefresh`](../../react-native/reference/react.md#usesessionrefresh-function) |
