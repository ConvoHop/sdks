## `currentSession`

Return the calling user session.

- **Operation:** `communication.currentSession`, a query sent as `CommunicationCurrentSession`.
- **Layer:** client (client SDKs).
- **Authorization:** `userSession`.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Result** (`CurrentSessionReply!`)

| Field | Type |
| --- | --- |
| `status` | `String!` |
| `requestId` | `UUID!` |
| `serverTime` | `String!` |
| `result` | `Session!` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `rateLimited`.

**GraphQL**

```graphql
query CommunicationCurrentSession($context: RequestContextInput!) {
  currentSession(context: $context) {
    status
    requestId
    serverTime
    result {
      sessionId
      principalId
      deviceId
      incarnation
      sessionRevision
      expiresAt
      status
    }
  }
}
```
