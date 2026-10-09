## `agentSignup`

Read the agent's own signup: its state and, once approved, the organization, project, grant scopes and expiry, and keys. Poll no more often than the ticket's pollAfterSeconds.

- **Operation:** `management.agentSignup`, a query sent as `ManagementAgentSignup`.
- **Layer:** server (server SDKs).
- **Authorization:** `agentVerifier`, when `ownSignup`: The verifier is the one whose digest the signup request carries.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | forbidden |
| `incarnation` | `UUID` | optional |
| `observedServingEpoch` | `Decimal` | optional |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Result** (`AgentSignupReply!`)

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

- Returned by the authority: `AGENTIC_NOT_CONFIGURED`, `AGENT_GRANT_EXPIRED`, `AGENT_GRANT_REVOKED`, `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `rateLimited`.

**GraphQL**

```graphql
query ManagementAgentSignup($context: RequestContextInput!) {
  agentSignup(context: $context) {
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
