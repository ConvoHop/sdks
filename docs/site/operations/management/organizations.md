# `management.organizations`

List the organizations the caller can access.

- **Operation:** `management.organizations`, a query sent as `ManagementOrganizations`.
- **Layer:** server (server SDKs).
- **Authorization:** `portalCredential`.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.
- **Pagination:** `bounded`. One bounded page without a cursor input. complete reports whether every item fit. Uses page `OrganizationPage` at `organizations.result` and items `Organization`.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | forbidden |
| `incarnation` | `UUID` | optional |
| `observedServingEpoch` | `Decimal` | optional |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Result** (`OrganizationsReply!`)

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
| `result` | `OrganizationPage` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`.

**GraphQL**

```graphql
query ManagementOrganizations($context: RequestContextInput!) {
  organizations(context: $context) {
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
      items {
        orgId
        name
        status
        revision
      }
      complete
      refreshRequired
      nextCursor
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | Not wrapped by a method |
| [Python](../../python/reference/operations.md) | [`ConvoHopManagement.organizations`](../../python/reference/convohop.md#convohopmanagementorganizations-method), [`AsyncConvoHopManagement.organizations`](../../python/reference/convohop.md#asyncconvohopmanagementorganizations-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ManagementApi.OrganizationsAsync`](../../dotnet/reference/api.md#managementapiorganizationsasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`ManagementApi.organizations`](../../jvm/reference/server.md#managementapiorganizations-method), [`ManagementSuspendApi.organizations`](../../jvm/reference/server-kotlin.md#managementsuspendapiorganizations-method) |
| [Go](../../go/reference/operations.md) | [`ManagementClient.Organizations`](../../go/reference/convohop.md#managementclientorganizations-method) |
