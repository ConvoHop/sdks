## `sessionRequestOutcome`

Look up the outcome of an earlier issueSession or renewSession request, including the session it produced.

- **Operation:** `communication.sessionRequestOutcome`, a query sent as `CommunicationSessionRequestOutcome`.
- **Layer:** server (server SDKs).
- **Authorization:** `backendKey` with all of the scopes `sessionIssue` and `sessionManage`.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: SessionRequestOutcomeRequestInput!`)

| Field | Type |
| --- | --- |
| `requestId` | `UUID!` |

**Result** (`SessionRequestOutcomeReply!`)

| Field | Type |
| --- | --- |
| `status` | `String!` |
| `requestId` | `UUID!` |
| `serverTime` | `String!` |
| `result` | `SessionRequestOutcome!` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_A_SESSION_REQUEST`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `SCOPE_REQUIRED`, `SESSION_RECEIPT_BINDING_MISMATCH`, `SESSION_RECEIPT_INVALID`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `rateLimited`.

**GraphQL**

```graphql
query CommunicationSessionRequestOutcome($context: RequestContextInput!, $input: SessionRequestOutcomeRequestInput!) {
  sessionRequestOutcome(context: $context, input: $input) {
    status
    requestId
    serverTime
    result {
      state
      requestId
      checkedAt
      operation
      receiptId
      committedAt
      originalSession {
        sessionId
        principalId
        deviceId
        incarnation
        sessionRevision
        expiresAt
        status
      }
      currentSession {
        sessionId
        principalId
        deviceId
        incarnation
        sessionRevision
        expiresAt
        status
      }
      currentState
    }
  }
}
```
