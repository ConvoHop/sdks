## `createWidget`

Create a widget.

- **Operation:** `beta.createWidget`, a mutation sent as `BetaCreateWidget`.
- **Layer:** server (server SDKs).
- **Authorization:** `serverKey` with scope `widgetWrite`.
- **Idempotency:** `singleUse`. Like idempotent, but the result is good for one use.

**Context** (`context: ContextInput!`)

| Field | Type | Use | Default | Description |
| --- | --- | --- | --- | --- |
| `tenant` | `String` | optional |  | Tenant that owns the request. |
| `requestId` | `ID!` | required |  |  |
| `attempt` | `Int` | optional | `1` |  |
| `permit` | `String` | forbidden |  | Single-use permit. Only alpha.redeem accepts it. |
| `tags` | `[String!]` | optional | `["a","b\|c"]` |  |

**Input** (`input: CreateWidgetInput!`)

| Field | Type | Default |
| --- | --- | --- |
| `label` | `String!` |  |
| `state` | `WidgetState` | `"ACTIVE"` |
| `ratio` | `Ratio` | `0.5` |
| `nested` | `[[Int!]!]` |  |
| `shape` | `ShapeInput` | `{"kind":"box","sides":[1,2]}` |

**Result** (`Widget!`)

| Field | Type |
| --- | --- |
| `id` | `ID!` |
| `label` | `String` |
| `state` | `WidgetState!` |
| `revision` | `Counter!` |

**Errors**

- Returned by the authority: `UNAVAILABLE`.
- Returned by the authority or raised by SDKs: `INVALID_REQUEST`.
- Raised by SDKs: `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `TRANSPORT_UNKNOWN`, `UNAVAILABLE`.
- Error sets: `request`, `http`.

**GraphQL**

```graphql
mutation BetaCreateWidget($context: ContextInput!, $input: CreateWidgetInput!) {
  createWidget(context: $context, input: $input) {
    id
    label
    state
    revision
  }
}
```
