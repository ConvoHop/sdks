# `communication.getPrincipal`

Read a principal (an application user).

- **Operation:** `communication.getPrincipal`, a query sent as `CommunicationGetPrincipal`.
- **Layer:** server (server SDKs).
- **Authorization:** `backendKey` with scope `principalManage`.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: GetPrincipalRequestInput!`)

| Field | Type |
| --- | --- |
| `principalId` | `UUID!` |

**Result** (`GetPrincipalReply!`)

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
| `result` | `Principal` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `rateLimited`.

**GraphQL**

```graphql
query CommunicationGetPrincipal($context: RequestContextInput!, $input: GetPrincipalRequestInput!) {
  getPrincipal(context: $context, input: $input) {
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
      principalId
      externalUserId
      status
      revision
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`ProjectServerClient.principals.get`](../../typescript/reference/server.md#projectserverclientprincipalsget-property) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.get_principal`](../../python/reference/convohop.md#convohopget_principal-method), [`AsyncConvoHop.get_principal`](../../python/reference/convohop.md#asyncconvohopget_principal-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ServerPrincipals.GetAsync`](../../dotnet/reference/convohop.md#serverprincipalsgetasync-method), [`CommunicationApi.GetPrincipalAsync`](../../dotnet/reference/api.md#communicationapigetprincipalasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`ProjectServerClient.principals.get`](../../jvm/reference/server.md#projectserverclientprincipalsget-method), [`CommunicationApi.getPrincipal`](../../jvm/reference/server.md#communicationapigetprincipal-method), [`CommunicationSuspendApi.getPrincipal`](../../jvm/reference/server-kotlin.md#communicationsuspendapigetprincipal-method) |
| [Go](../../go/reference/operations.md) | [`ProjectClient.GetPrincipal`](../../go/reference/convohop.md#projectclientgetprincipal-method) |
