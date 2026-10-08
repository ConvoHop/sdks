## `liveSessionAlerts`

List the live session alerts addressed to the calling user.

- **Operation:** `communication.liveSessionAlerts`, a query sent as `CommunicationLiveSessionAlerts`.
- **Layer:** client (client SDKs).
- **Authorization:** `userSession`.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.
- **Pagination:** `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. Uses page `LiveAlertPage` at `liveSessionAlerts.result`, items `LiveAlert`, page size `input.limit` and cursor `input.cursor`.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: LiveAlertsInput!`)

| Field | Type | Default |
| --- | --- | --- |
| `limit` | `PageSize!` | `50` |
| `cursor` | `String` |  |

**Result** (`LiveAlertPageReply!`)

| Field | Type |
| --- | --- |
| `status` | `String!` |
| `requestId` | `UUID!` |
| `serverTime` | `String!` |
| `result` | `LiveAlertPage!` |

**Errors**

- Returned by the authority: `CURSOR_INVALID`, `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `rateLimited`.

**GraphQL**

```graphql
query CommunicationLiveSessionAlerts($context: RequestContextInput!, $input: LiveAlertsInput!) {
  liveSessionAlerts(context: $context, input: $input) {
    status
    requestId
    serverTime
    result {
      items {
        alertId
        liveSessionId
        conversationId
        generation
        membershipEpoch
        createdAt
        expiresAt
      }
      nextCursor
      complete
      partialReason
      refreshRequired
    }
  }
}
```
