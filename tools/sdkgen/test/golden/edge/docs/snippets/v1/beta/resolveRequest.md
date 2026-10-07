## `resolveRequest`

Look up the outcome of an earlier beta mutation by requestId.

- **Operation:** `beta.resolveRequest`, a query sent as `BetaResolveRequest`.
- **Layer:** server (server SDKs).
- **Authorization:** `serverKey` with scope `widgetWrite`.
- **Idempotency:** `safe`. Read-only. Repeat freely.

**Context** (`context: ContextInput!`)

| Field | Type | Use | Default | Description |
| --- | --- | --- | --- | --- |
| `tenant` | `String` | optional |  | Tenant that owns the request. |
| `requestId` | `ID!` | required |  |  |
| `attempt` | `Int` | optional | `1` |  |
| `permit` | `String` | forbidden |  | Single-use permit. Only alpha.redeem accepts it. |
| `tags` | `[String!]` | optional | `["a","b\|c"]` |  |

**Input** (`input: ResolveInput!`)

| Field | Type |
| --- | --- |
| `requestId` | `ID!` |

**Result** (`Receipt!`)

| Field | Type |
| --- | --- |
| `requestId` | `ID!` |
| `committed` | `Boolean!` |
| `sequence` | `Counter` |

**Errors**

- Returned by the authority: `NOT_FOUND`, `UNAVAILABLE`.
- Returned by the authority or raised by SDKs: `INVALID_REQUEST`.
- Transient, so repeating the request may succeed: `UNAVAILABLE`.
- Error sets: `request`.

**GraphQL**

```graphql
query BetaResolveRequest($context: ContextInput!, $input: ResolveInput!) {
  resolveRequest(context: $context, input: $input) {
    requestId
    committed
    sequence
  }
}
```
