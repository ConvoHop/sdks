## `createBillingCheckoutSession`

Create a hosted checkout link that subscribes an active organization to a self-service plan. The link grants access to whoever holds it; a retry with the same requestId returns the same link until it expires.

- **Operation:** `management.createBillingCheckoutSession`, a mutation sent as `ManagementCreateBillingCheckoutSession`.
- **Layer:** server (server SDKs).
- **Authorization:** `portalCredential`, when `owner`: The caller owns the organization, deployment or project.
- **Idempotency:** `singleUse`. Like idempotent, but the result carries a short-lived credential for one connection. Request a new one instead of reusing an expired result.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | forbidden |
| `incarnation` | `UUID` | optional |
| `observedServingEpoch` | `Decimal` | optional |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: CreateBillingCheckoutSessionRequestInput!`)

| Field | Type |
| --- | --- |
| `orgId` | `UUID!` |
| `planId` | `String!` |

**Result** (`CreateBillingCheckoutSessionReply!`)

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
| `result` | `BillingCheckoutSession` |

**Errors**

- Returned by the authority: `BILLING_CATALOG_CONFLICT`, `BILLING_CATALOG_NOT_SYNCED`, `BILLING_LINK_EXPIRED`, `BILLING_NOT_CONFIGURED`, `BILLING_PLAN_UNAVAILABLE`, `BILLING_PROVIDER_CHANGED`, `BILLING_PROVIDER_REJECTED`, `BILLING_SUBSCRIPTION_ACTIVE`, `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `OUTCOME_UNKNOWN`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_LIMIT`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `mutation`.

**GraphQL**

```graphql
mutation ManagementCreateBillingCheckoutSession($context: RequestContextInput!, $input: CreateBillingCheckoutSessionRequestInput!) {
  createBillingCheckoutSession(context: $context, input: $input) {
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
      planId
      url
      expiresAt
    }
  }
}
```
