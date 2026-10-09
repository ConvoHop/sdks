# `management.issueAgentKey`

Issue a backend key for the agent within its grant's scopes and expiry. The result is the pending key; poll agentSignup until it shows the key's delivery, then redeem it with agentCredentialPermit.

- **Operation:** `management.issueAgentKey`, a mutation sent as `ManagementIssueAgentKey`.
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

**Input** (`input: IssueAgentKeyRequestInput!`)

| Field | Type |
| --- | --- |
| `scopes` | `[String!]!` |
| `expiresAt` | `String` |

**Result** (`IssueAgentKeyReply!`)

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
| `result` | `AgentKey` |

**Errors**

- Returned by the authority: `AGENTIC_NOT_CONFIGURED`, `AGENT_GRANT_EXPIRED`, `AGENT_GRANT_REVOKED`, `AGENT_KEY_LIMIT`, `AGENT_SCOPE_NOT_GRANTED`, `AGENT_SIGNUP_NOT_READY`, `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_LIMIT`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `mutation`, `rateLimited`.

**GraphQL**

```graphql
mutation ManagementIssueAgentKey($context: RequestContextInput!, $input: IssueAgentKeyRequestInput!) {
  issueAgentKey(context: $context, input: $input) {
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
      operationId
      state
      scopes
      expiresAt
      keyId
      deliveryId
      deliveryExpiresAt
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
