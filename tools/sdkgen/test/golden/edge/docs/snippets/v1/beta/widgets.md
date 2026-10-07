## `widgets`

List widgets in one bounded page.

- **Operation:** `beta.widgets`, a query sent as `BetaWidgets`.
- **Layer:** server (server SDKs).
- **Authorization:** `serverKey` with scope `itemRead`.
- **Idempotency:** `safe`. Read-only. Repeat freely.
- **Pagination:** `bounded`. One bounded page. Uses page `WidgetPage` at `widgets.result` and items `Widget`.

**Context** (`context: ContextInput!`)

| Field | Type | Use | Default | Description |
| --- | --- | --- | --- | --- |
| `tenant` | `String` | optional |  | Tenant that owns the request. |
| `requestId` | `ID!` | required |  |  |
| `attempt` | `Int` | optional | `1` |  |
| `permit` | `String` | forbidden |  | Single-use permit. Only alpha.redeem accepts it. |
| `tags` | `[String!]` | optional | `["a","b\|c"]` |  |

**Input** (`input: WidgetsInput`)

| Field | Type |
| --- | --- |
| `states` | `[WidgetState!]` |

**Result** (`WidgetsPayload!`)

| Field | Type |
| --- | --- |
| `requestId` | `ID!` |
| `result` | `WidgetPage` |

**Errors**

- Returned by the authority: `UNAVAILABLE`.
- Returned by the authority or raised by SDKs: `INVALID_REQUEST`.
- Raised by SDKs: `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `TRANSPORT_UNKNOWN`, `UNAVAILABLE`.
- Error sets: `request`, `http`.

**GraphQL**

```graphql
query BetaWidgets($context: ContextInput!, $input: WidgetsInput) {
  widgets(context: $context, input: $input) {
    requestId
    result {
      items {
        id
        label
        state
        revision
      }
      complete
      refreshRequired
    }
  }
}
```
