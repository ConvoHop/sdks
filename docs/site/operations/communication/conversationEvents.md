# `communication.conversationEvents`

Subscribe to conversation events in sequence order, resuming after a cursor.

- **Operation:** `communication.conversationEvents`, a subscription sent as `CommunicationConversationEvents`.
- **Layer:** client (client SDKs).
- **Authorization:** `userSession`, when `member`: The caller is an active member of the conversation.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.
- **Pagination:** `replay`. Committed events in ascending sequence after a cursor. Persist the last applied cursor; invalid or expired cursors fail and are never reset silently. Uses page `EventPage` at `conversationEvents`, items `Event`, page size `input.limit` and cursor `input.after`.
- **Realtime:** subscription on the `conversationEvents` channel. Ordered events of one conversation over graphql-transport-ws, gap-filled with the replay query.

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

**Result** (`EventPage!`)

| Field | Type |
| --- | --- |
| `items` | `[Event!]!` |
| `complete` | `Boolean!` |
| `refreshRequired` | `Boolean!` |
| `nextCursor` | `Cursor` |

**Errors**

- Returned by the authority: `CURSOR_AHEAD`, `CURSOR_EXPIRED`, `CURSOR_MISMATCH`, `CURSOR_SCOPE_MISMATCH`, `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `PLAN_LIMIT_EXCEEDED`, `QUOTA_EXCEEDED`, `RATE_LIMITED`, `RESYNC_REQUIRED`, `RETRY_EXHAUSTED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`.
- Error sets: `request`, `communication`, `rateLimited`.

**GraphQL**

```graphql
subscription CommunicationConversationEvents($context: RequestContextInput!, $input: EventsRequestInput!) {
  conversationEvents(context: $context, input: $input) {
    items {
      eventId
      conversationId
      sequence
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
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`ConvoHopClient.watch`](../../typescript/reference/client.md#convohopclientwatch-method), [`ConvoHopClient.resyncAuthorizedHistory`](../../typescript/reference/client.md#convohopclientresyncauthorizedhistory-method), [`ConversationStore.open`](../../typescript/reference/client.md#conversationstoreopen-method), [`ConversationStore.resync`](../../typescript/reference/client.md#conversationstoreresync-method), [`useConversation`](../../typescript/reference/react.md#useconversation-function), [`ConversationView.open`](../../typescript/reference/react.md#conversationviewopen-method), [`ConversationView.resync`](../../typescript/reference/react.md#conversationviewresync-method) |
