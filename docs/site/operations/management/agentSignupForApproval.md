# `management.agentSignupForApproval`

Read a pending agent signup request for its approval page, with the agent's suggested plan, scopes and monthly spend cap.

- **Operation:** `management.agentSignupForApproval`, a query sent as `ManagementAgentSignupForApproval`.
- **Layer:** server (server SDKs).
- **Authorization:** `anonymous`, when `approvalToken`: The input carries the approval token from the email sent to the request's named owner.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | forbidden |
| `incarnation` | `UUID` | optional |
| `observedServingEpoch` | `Decimal` | optional |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: AgentSignupForApprovalRequestInput!`)

| Field | Type |
| --- | --- |
| `approvalToken` | `String!` |

**Result** (`AgentSignupForApprovalReply!`)

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
| `result` | `AgentSignupReview` |

**Errors**

- Returned by the authority: `AGENTIC_NOT_CONFIGURED`, `AGENT_SIGNUP_CLOSED`, `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `rateLimited`.

**GraphQL**

```graphql
query ManagementAgentSignupForApproval($context: RequestContextInput!, $input: AgentSignupForApprovalRequestInput!) {
  agentSignupForApproval(context: $context, input: $input) {
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
      ownerEmail
      organizationName
      agentName
      purpose
      suggestedPlan
      suggestedScopes
      suggestedMonthlySpendCap
      currency
      expiresAt
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | Not wrapped by a method |
| [Python](../../python/reference/operations.md) | Not wrapped by a method |
| [.NET](../../dotnet/reference/operations.md) | Not wrapped by a method |
| [Java and Kotlin](../../jvm/reference/operations.md) | Not wrapped by a method |
| [Go](../../go/reference/operations.md) | Not wrapped by a method |
