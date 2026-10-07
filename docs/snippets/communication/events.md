## `events`

Replay committed conversation events after a cursor, in sequence order.

- **Operation:** `communication.events`, a query sent as `CommunicationEvents`.
- **Layer:** client (client SDKs).
- **Authorization:** `userSession`, when `member`: The caller is an active member of the conversation.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.
- **Pagination:** `replay`. Committed events in ascending sequence after a cursor. Persist the last applied cursor; invalid or expired cursors fail and are never reset silently. Uses page `EventPage` at `events.result`, items `Event`, page size `input.limit` and cursor `input.after`.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: EventsRequestInput!`)

| Field | Type |
| --- | --- |
| `conversationId` | `UUID!` |
| `limit` | `PageSize!` |
| `after` | `CursorInput` |

**Result** (`EventsReply!`)

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
| `result` | `EventPage` |

**Errors**

- Returned by the authority: `CURSOR_AHEAD`, `CURSOR_EXPIRED`, `CURSOR_SCOPE_MISMATCH`, `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`.

**GraphQL**

```graphql
query CommunicationEvents($context: RequestContextInput!, $input: EventsRequestInput!) {
  events(context: $context, input: $input) {
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
      items {
        eventId
        conversationId
        sequence
        eventVersion
        type
        occurredAt
        subjectRef {
          kind
          id
        }
        payload {
          messageId
          revision
          revisionSequence
          principalId
          membershipEpoch
          visibilityEpoch
          kind
          throughSequence
          callId
          generation
          state
          cutoffEvidence
          liveSessionId
        }
      }
      complete
      refreshRequired
      nextCursor {
        incarnation
        conversationId
        sequence
      }
    }
  }
}
```
