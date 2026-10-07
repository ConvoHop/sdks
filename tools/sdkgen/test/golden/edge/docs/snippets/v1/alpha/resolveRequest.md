## `resolveRequest`

Look up the outcome of an earlier alpha mutation by requestId.

- **Operation:** `alpha.resolveRequest`, a query sent as `AlphaResolveRequest`.
- **Layer:** both (client and server SDKs).
- **Authorization** (any one of):
  - `userToken`, when `owner`: The caller made the original request.
  - `serverKey` with scope `itemRead`.
- **Idempotency:** `safe`. Read-only. Repeat freely.

**Context** (`context: ContextInput!`)

| Field | Type | Use | Default | Description |
| --- | --- | --- | --- | --- |
| `tenant` | `String` | required |  | Tenant that owns the request. |
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
- Raised by SDKs: `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `TRANSPORT_UNKNOWN`, `UNAVAILABLE`.
- Error sets: `request`, `http`.

**GraphQL**

```graphql
query AlphaResolveRequest($context: ContextInput!, $input: ResolveInput!) {
  resolveRequest(context: $context, input: $input) {
    requestId
    committed
    sequence
  }
}
```
