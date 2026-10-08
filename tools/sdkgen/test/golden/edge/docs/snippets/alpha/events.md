## `events`

Replay alpha events after a cursor.

- **Operation:** `alpha.events`, a query sent as `AlphaEvents`.
- **Layer:** client (client SDKs).
- **Authorization:** `userToken`.
- **Idempotency:** `safe`. Read-only. Repeat freely.
- **Pagination:** `replay`. Events in ascending sequence after a cursor. Uses page `EventPage` at `events`, items `Event`, page size `input.limit` and cursor `input.after`.

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
- Raised by SDKs: `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `TRANSPORT_UNKNOWN`, `UNAVAILABLE`.
- Error sets: `request`, `http`.

**GraphQL**

```graphql
query AlphaEvents($context: ContextInput!, $input: EventsInput!) {
  events(context: $context, input: $input) {
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
