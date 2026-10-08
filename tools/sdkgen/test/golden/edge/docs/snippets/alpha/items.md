## `items`

List items in server order.

List items.

Pages follow the cursor style.

- **Operation:** `alpha.items`, a query sent as `AlphaItems`.
- **Layer:** client (client SDKs).
- **Authorization:** `userToken`.
- **Idempotency:** `safe`. Read-only. Repeat freely.
- **Pagination:** `cursor`. Server-ordered pages. Uses page `ItemPage` at `items`, items `Item`, page size `input.limit` and cursor `input.cursor`.

**Context** (`context: ContextInput!`)

| Field | Type | Use | Default | Description |
| --- | --- | --- | --- | --- |
| `tenant` | `String` | required |  | Tenant that owns the request. |
| `requestId` | `ID!` | required |  |  |
| `attempt` | `Int` | optional | `1` |  |
| `permit` | `String` | forbidden |  | Single-use permit. Only alpha.redeem accepts it. |
| `tags` | `[String!]` | optional | `["a","b\|c"]` |  |

**Input** (`input: ItemsInput!`)

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `limit` | `Int` | `20` | Page size. Defaults to 20. |
| `cursor` | `String` |  |  |
| `fruits` | `[Fruit!]` |  |  |
| `minWeight` | `Float` |  |  |
| `includeDeprecated` | `Boolean` | `false` |  |
| `method` | `HTTPMethod` | `"GET"` |  |
| `box` | `Box_3dInput` |  |  |
| `legacyFilter` | `String` |  | Deprecated: Use fruits. |
| `item2` | `Int` |  |  |
| `item10` | `Int` |  |  |

**Result** (`ItemPage!`)

| Field | Type |
| --- | --- |
| `items` | `[Item!]!` |
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
query AlphaItems($context: ContextInput!, $input: ItemsInput!) {
  items(context: $context, input: $input) {
    items {
      id
      name
      fruit
      weight
      ripe
      oldName
      legacyCode
      grid
      aliases
      history
    }
    complete
    refreshRequired
    nextCursor
  }
}
```
