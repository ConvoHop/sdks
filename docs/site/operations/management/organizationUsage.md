# `management.organizationUsage`

Read the metered usage of an organization in any status, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

- **Operation:** `management.organizationUsage`, a query sent as `ManagementOrganizationUsage`.
- **Layer:** server (server SDKs).
- **Authorization:** `portalCredential`, when `owner`: The caller owns the organization, deployment or project.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | forbidden |
| `incarnation` | `UUID` | optional |
| `observedServingEpoch` | `Decimal` | optional |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: OrganizationUsageRequestInput!`)

| Field | Type |
| --- | --- |
| `orgId` | `UUID!` |
| `from` | `String` |
| `to` | `String` |

**Result** (`OrganizationUsageReply!`)

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
| `result` | `OrganizationUsage` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`.

**GraphQL**

```graphql
query ManagementOrganizationUsage($context: RequestContextInput!, $input: OrganizationUsageRequestInput!) {
  organizationUsage(context: $context, input: $input) {
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
      orgId
      source
      observedAt
      complete
      reason
      from
      to
      meters {
        meter
        unit
        quantity
        emitted
      }
      aggregatedThrough
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | Not wrapped by a method |
| [Python](../../python/reference/operations.md) | [`ConvoHopManagement.organization_usage`](../../python/reference/convohop.md#convohopmanagementorganization_usage-method), [`AsyncConvoHopManagement.organization_usage`](../../python/reference/convohop.md#asyncconvohopmanagementorganization_usage-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ManagementApi.OrganizationUsageAsync`](../../dotnet/reference/api.md#managementapiorganizationusageasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`ManagementApi.organizationUsage`](../../jvm/reference/server.md#managementapiorganizationusage-method), [`ManagementSuspendApi.organizationUsage`](../../jvm/reference/server-kotlin.md#managementsuspendapiorganizationusage-method) |
| [Go](../../go/reference/operations.md) | [`ManagementClient.OrganizationUsage`](../../go/reference/convohop.md#managementclientorganizationusage-method) |
