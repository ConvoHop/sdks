## `purchaseAgentCredits`

Buy prepaid credits with a Shared Payment Token, within the owner's agent purchase limit.

- **Operation:** `management.purchaseAgentCredits`, a mutation sent as `ManagementPurchaseAgentCredits`.
- **Layer:** server (server SDKs).
- **Authorization:** `agentVerifier`, when `activeGrant`: The agent's grant is neither revoked nor expired, and its organization is active.
- **Idempotency:** `replayOnly`. Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | forbidden |
| `incarnation` | `UUID` | optional |
| `observedServingEpoch` | `Decimal` | optional |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: PurchaseAgentCreditsRequestInput!`)

| Field | Type |
| --- | --- |
| `amount` | `String!` |
| `sharedPaymentToken` | `String!` |

**Result** (`PurchaseAgentCreditsReply!`)

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
| `result` | `AgentPayment` |

**Errors**

- Returned by the authority: `AGENTIC_NOT_CONFIGURED`, `AGENT_GRANT_EXPIRED`, `AGENT_GRANT_REVOKED`, `AGENT_PURCHASE_LIMIT_EXCEEDED`, `AGENT_SIGNUP_NOT_READY`, `BILLING_CUSTOMER_MISSING`, `BILLING_PROVIDER_REJECTED`, `BILLING_SUSPENDED`, `CREDITS_REQUIRE_METERED_PLAN`, `CREDIT_AMOUNT_OUT_OF_RANGE`, `CREDIT_GRANT_LIMIT_REACHED`, `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `OUTCOME_UNKNOWN`, `PAYMENT_DECLINED`, `PAYMENT_RAIL_NOT_CONFIGURED`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_LIMIT`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `mutation`, `rateLimited`.

**GraphQL**

```graphql
mutation ManagementPurchaseAgentCredits($context: RequestContextInput!, $input: PurchaseAgentCreditsRequestInput!) {
  purchaseAgentCredits(context: $context, input: $input) {
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
      paymentId
      amount
      currency
      state
    }
  }
}
```
