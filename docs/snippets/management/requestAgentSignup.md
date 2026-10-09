## `requestAgentSignup`

Request an organization for a named human owner, who approves it from an emailed link. Nothing is usable before approval.

- **Operation:** `management.requestAgentSignup`, a mutation sent as `ManagementRequestAgentSignup`.
- **Layer:** server (server SDKs).
- **Authorization:** `anonymous`.
- **Idempotency:** `replayOnly`. Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | forbidden |
| `incarnation` | `UUID` | optional |
| `observedServingEpoch` | `Decimal` | optional |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: RequestAgentSignupRequestInput!`)

| Field | Type |
| --- | --- |
| `ownerEmail` | `String!` |
| `pollChallenge` | `String!` |
| `organizationName` | `String!` |
| `agentName` | `String!` |
| `purpose` | `String` |
| `suggestedPlan` | `String` |
| `suggestedScopes` | `[String!]!` |
| `suggestedMonthlySpendCap` | `String` |

**Result** (`RequestAgentSignupReply!`)

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
| `result` | `AgentSignupTicket` |

**Errors**

- Returned by the authority: `AGENTIC_NOT_CONFIGURED`, `AGENT_SIGNUP_EMAIL_REJECTED`, `AGENT_SIGNUP_SUPPRESSED`, `BILLING_PLAN_UNAVAILABLE`, `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_LIMIT`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `mutation`, `rateLimited`.

**GraphQL**

```graphql
mutation ManagementRequestAgentSignup($context: RequestContextInput!, $input: RequestAgentSignupRequestInput!) {
  requestAgentSignup(context: $context, input: $input) {
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
      confirmationCode
      expiresAt
      pollAfterSeconds
    }
  }
}
```
