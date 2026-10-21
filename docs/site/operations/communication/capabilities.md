# `communication.capabilities`

Describe the features, limits and API model the authority supports.

- **Operation:** `communication.capabilities`, a query sent as `CommunicationCapabilities`.
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

**Result** (`CapabilitiesReply!`)

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
| `result` | `Capabilities` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `rateLimited`.

**GraphQL**

```graphql
query CommunicationCapabilities($context: RequestContextInput!) {
  capabilities(context: $context) {
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
    result {
      serverRelease
      capabilityRevision
      limitsRevision
      features {
        chat
        inbox
        lexicalSearch
        typing
        webhooks
        liveSessions
        liveBroadcast
      }
      limits {
        key
        value {
          maximum
          unit
          scope
          milliseconds
          policyId
          revision
        }
      }
      environment
      productionQualified
      mediaPolicy {
        leasePolicyId
        maxLeaseMs
        renewAttemptMs
        preludeMaxBytes
        preludeTimeoutMs
        clockProfileId
      }
      geoControlAuthorityId
      offerings
      geos
      installationProfiles
      portalIdentity
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`ProjectServerClient.capabilities`](../../typescript/reference/server.md#projectserverclientcapabilities-method), [`RelayClient.capabilities`](../../typescript/reference/client.md#relayclientcapabilities-method) |
| [Python](../../python/reference/operations.md) | [`Relay.capabilities`](../../python/reference/instantrelay.md#relaycapabilities-method), [`AsyncRelay.capabilities`](../../python/reference/instantrelay.md#asyncrelaycapabilities-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ProjectServerClient.GetCapabilitiesAsync`](../../dotnet/reference/relay.md#projectserverclientgetcapabilitiesasync-method), [`CommunicationApi.CapabilitiesAsync`](../../dotnet/reference/api.md#communicationapicapabilitiesasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`ProjectServerClient.capabilities`](../../jvm/reference/server.md#projectserverclientcapabilities-method), [`CommunicationApi.capabilities`](../../jvm/reference/server.md#communicationapicapabilities-method), [`CommunicationSuspendApi.capabilities`](../../jvm/reference/server-kotlin.md#communicationsuspendapicapabilities-method) |
| [Go](../../go/reference/operations.md) | [`ProjectClient.Capabilities`](../../go/reference/relay.md#projectclientcapabilities-method) |
| [Swift](../../swift/reference/operations.md) | [`RelayClient.capabilities`](../../swift/reference/relay.md#relayclientcapabilities-method), [`RelayTypingIndicator.textChanged`](../../swift/reference/relay.md#relaytypingindicatortextchanged-method), [`RelayConversationModel.textChanged`](../../swift/reference/relay.md#relayconversationmodeltextchanged-method) |
| [Android](../../android/reference/operations.md) | [`RelayClient.capabilities`](../../android/reference/android-core.md#relayclientcapabilities-method) |
| [Flutter](../../flutter/reference/operations.md) | [`CommunicationOperations.capabilities`](../../flutter/reference/instantrelay.md#communicationoperationscapabilities-method) |
| [React Native](../../react-native/reference/operations.md) | [`RelayClient.capabilities`](../../react-native/reference/client.md#relayclientcapabilities-method) |
