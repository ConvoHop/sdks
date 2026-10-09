# `management.rejectAgentSignup`

Reject a signup request from its approval link, optionally suppressing future requests to the email.

- **Operation:** `management.rejectAgentSignup`, a mutation sent as `ManagementRejectAgentSignup`.
- **Layer:** server (server SDKs).
- **Authorization:** `anonymous`, when `approvalToken`: The input carries the approval token from the email sent to the request's named owner.
- **Idempotency:** `replayOnly`. Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | forbidden |
| `incarnation` | `UUID` | optional |
| `observedServingEpoch` | `Decimal` | optional |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: RejectAgentSignupRequestInput!`)

| Field | Type |
| --- | --- |
| `approvalToken` | `String!` |
| `suppressFutureRequests` | `Boolean!` |

**Result** (`RejectAgentSignupReply!`)

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

- Returned by the authority: `AGENTIC_NOT_CONFIGURED`, `AGENT_SIGNUP_CLOSED`, `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_LIMIT`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `mutation`, `rateLimited`.

**GraphQL**

```graphql
mutation ManagementRejectAgentSignup($context: RequestContextInput!, $input: RejectAgentSignupRequestInput!) {
  rejectAgentSignup(context: $context, input: $input) {
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

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | Not wrapped by a method |
| [Python](../../python/reference/operations.md) | Not wrapped by a method |
| [.NET](../../dotnet/reference/operations.md) | Not wrapped by a method |
| [Java and Kotlin](../../jvm/reference/operations.md) | Not wrapped by a method |
| [Go](../../go/reference/operations.md) | Not wrapped by a method |
