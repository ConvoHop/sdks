# `management.webhookEndpoints`

List the webhook endpoints of a project with their status, signing-secret rotation and delivery health.

- **Operation:** `management.webhookEndpoints`, a query sent as `ManagementWebhookEndpoints`.
- **Layer:** server (server SDKs).
- **Authorization:** `portalCredential`, when `owner`: The caller owns the organization, deployment or project.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.
- **Pagination:** `bounded`. One bounded page without a cursor input. complete reports whether every item fit. Uses page `WebhookEndpointPage` at `webhookEndpoints.result` and items `WebhookEndpoint`.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | forbidden |
| `incarnation` | `UUID` | optional |
| `observedServingEpoch` | `Decimal` | optional |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: WebhookEndpointsRequestInput!`)

| Field | Type |
| --- | --- |
| `projectId` | `UUID!` |

**Result** (`WebhookEndpointsReply!`)

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
| `result` | `WebhookEndpointPage` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`.

**GraphQL**

```graphql
query ManagementWebhookEndpoints($context: RequestContextInput!, $input: WebhookEndpointsRequestInput!) {
  webhookEndpoints(context: $context, input: $input) {
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
        endpointId
        url
        eventTypes
        enabled
        status
        disabledReason
        revision
        secretVersion
        rotationPending
        rotationOverlapUntil
        consecutiveFailures
        failingSince
        lastSuccessAt
        lastFailureAt
      }
      complete
      refreshRequired
      nextCursor
      observedAt
      partialReason
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | Not wrapped by a method |
