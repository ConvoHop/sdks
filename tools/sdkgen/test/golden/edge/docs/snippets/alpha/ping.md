## `ping`

1\. Send an ephemeral ping.

- **Operation:** `alpha.ping`, a mutation sent as `AlphaPing`.
- **Layer:** client (client SDKs).
- **Authorization:** `userToken`.
- **Idempotency:** `ephemeral`. Transient signal. Never retried.
- **Emits:**
  - `item.changed`: An item changed.

**Context** (`context: ContextInput!`)

| Field | Type | Use | Default | Description |
| --- | --- | --- | --- | --- |
| `tenant` | `String` | required |  | Tenant that owns the request. |
| `requestId` | `ID!` | required |  |  |
| `attempt` | `Int` | optional | `1` |  |
| `permit` | `String` | forbidden |  | Single-use permit. Only alpha.redeem accepts it. |
| `tags` | `[String!]` | optional | `["a","b\|c"]` |  |

**Input** (`input: PingInput`)

| Field | Type |
| --- | --- |
| `note` | `String` |

**Result** (`Boolean!`)

**Errors**

- Returned by the authority: `UNAVAILABLE`.
- Returned by the authority or raised by SDKs: `INVALID_REQUEST`.
- Transient, but this operation is never retried; send a fresh request: `UNAVAILABLE`.
- Error sets: `request`.

**GraphQL**

```graphql
mutation AlphaPing($context: ContextInput!, $input: PingInput) {
  ping(context: $context, input: $input)
}
```
