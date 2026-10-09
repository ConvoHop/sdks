# `management.deploymentUsage`

Read the metered usage of a deployment, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

- **Operation:** `management.deploymentUsage`, a query sent as `ManagementDeploymentUsage`.
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

**Input** (`input: DeploymentUsageRequestInput!`)

| Field | Type |
| --- | --- |
| `deploymentId` | `UUID!` |
| `from` | `String` |
| `to` | `String` |

**Result** (`DeploymentUsageReply!`)

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
| `result` | `DeploymentUsage` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`.

**GraphQL**

```graphql
query ManagementDeploymentUsage($context: RequestContextInput!, $input: DeploymentUsageRequestInput!) {
  deploymentUsage(context: $context, input: $input) {
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
      deploymentId
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
| [Python](../../python/reference/operations.md) | [`ConvoHopManagement.deployment_usage`](../../python/reference/convohop.md#convohopmanagementdeployment_usage-method), [`AsyncConvoHopManagement.deployment_usage`](../../python/reference/convohop.md#asyncconvohopmanagementdeployment_usage-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ManagementApi.DeploymentUsageAsync`](../../dotnet/reference/api.md#managementapideploymentusageasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`ManagementApi.deploymentUsage`](../../jvm/reference/server.md#managementapideploymentusage-method), [`ManagementSuspendApi.deploymentUsage`](../../jvm/reference/server-kotlin.md#managementsuspendapideploymentusage-method) |
| [Go](../../go/reference/operations.md) | [`ManagementClient.DeploymentUsage`](../../go/reference/convohop.md#managementclientdeploymentusage-method) |
