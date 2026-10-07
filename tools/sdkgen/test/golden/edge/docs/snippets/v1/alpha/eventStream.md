## `eventStream`

Subscribe to alpha events after a cursor.

- **Operation:** `alpha.eventStream`, a subscription sent as `AlphaEventStream`.
- **Layer:** client (client SDKs).
- **Authorization:** `userToken`.
- **Idempotency:** `safe`. Read-only. Repeat freely.
- **Pagination:** `replay`. Events in ascending sequence after a cursor. Uses page `EventPage` at `eventStream`, items `Event`, page size `input.limit` and cursor `input.after`.
- **Realtime:** subscription on the `eventStream` channel. Ordered alpha events, gap-filled with alpha.events.

**Context** (`context: ContextInput!`)

| Field | Type | Use | Default | Description |
| --- | --- | --- | --- | --- |
| `tenant` | `String` | required |  | Tenant that owns the request. |
| `requestId` | `ID!` | required |  |  |
| `attempt` | `Int` | optional | `1` |  |
| `permit` | `String` | forbidden |  | Single-use permit. Only alpha.redeem accepts it. |
| `tags` | `[String!]` | optional | `["a","b\|c"]` |  |

**Input** (`input: EventsInput!`)

| Field | Type |
| --- | --- |
| `after` | `String` |
| `limit` | `PageSize!` |

**Result** (`EventPage!`)

| Field | Type |
| --- | --- |
| `items` | `[Event!]!` |
| `complete` | `Boolean!` |
| `refreshRequired` | `Boolean!` |
| `nextCursor` | `String` |

**Errors**

- Returned by the authority: `CURSOR_EXPIRED`, `UNAVAILABLE`.
- Returned by the authority or raised by SDKs: `INVALID_REQUEST`.
- Transient, so repeating the request may succeed: `UNAVAILABLE`.
- Error sets: `request`.

**GraphQL**

```graphql
subscription AlphaEventStream($context: ContextInput!, $input: EventsInput!) {
  eventStream(context: $context, input: $input) {
    items {
      sequence
      type
      subjectRef {
        kind
        id
      }
      payload {
        itemId
        jobId
        revision
        note
      }
    }
    complete
    refreshRequired
    nextCursor
  }
}
```
