## `approveAgentSignup`

Approve a signup request with its approval token and the agent's confirmation code, choosing the plan, scopes, monthly spend cap, agent purchase limit and grant expiry. The signed-in approver becomes the owner.

- **Operation:** `management.approveAgentSignup`, a mutation sent as `ManagementApproveAgentSignup`.
- **Layer:** server (server SDKs).
- **Authorization:** `portalCredential`, when `approvalToken`: The input carries the approval token from the email sent to the request's named owner.
- **Idempotency:** `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | forbidden |
| `incarnation` | `UUID` | optional |
| `observedServingEpoch` | `Decimal` | optional |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: ApproveAgentSignupRequestInput!`)

| Field | Type |
| --- | --- |
| `approvalToken` | `String!` |
| `confirmationCode` | `String!` |
| `termsRef` | `String!` |
| `plan` | `String!` |
| `scopes` | `[String!]!` |
| `monthlySpendCap` | `String!` |
| `agentPurchaseLimit` | `String` |
| `grantExpiresAt` | `String` |

**Result** (`ApproveAgentSignupReply!`)

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
| `result` | `AgentSignupStatus` |

**Errors**

- Returned by the authority: `AGENTIC_NOT_CONFIGURED`, `AGENT_CONFIRMATION_CODE_INVALID`, `AGENT_SIGNUP_CLOSED`, `BILLING_PLAN_UNAVAILABLE`, `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `OUTCOME_UNKNOWN`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_LIMIT`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `mutation`.

**GraphQL**

```graphql
mutation ManagementApproveAgentSignup($context: RequestContextInput!, $input: ApproveAgentSignupRequestInput!) {
  approveAgentSignup(context: $context, input: $input) {
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
      signupId
      state
      orgId
      deploymentId
      projectId
      nextStep
      scopes
      grantExpiresAt
      keys {
        operationId
        state
        scopes
        expiresAt
        keyId
        deliveryId
        deliveryExpiresAt
      }
      incarnation
      servingEpoch
    }
  }
}
```
