## `redeem`

Redeem a delivery with its permit.

- **Operation:** `alpha.redeem`, a mutation sent as `AlphaRedeem`.
- **Layer:** server (server SDKs).
- **Authorization:** `permit`.
- **Idempotency:** `permitBound`. Authorized by a single-use permit. Retry with the same requestId and permit.

**Context** (`context: ContextInput!`)

| Field | Type | Use | Default | Description |
| --- | --- | --- | --- | --- |
| `tenant` | `String` | required |  | Tenant that owns the request. |
| `requestId` | `ID!` | required |  |  |
| `attempt` | `Int` | optional | `1` |  |
| `permit` | `String` | required |  | Single-use permit. Only alpha.redeem accepts it. |
| `tags` | `[String!]` | optional | `["a","b\|c"]` |  |

**Input** (`input: RedeemInput!`)

| Field | Type |
| --- | --- |
| `deliveryId` | `ID!` |

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
- Transient, so a retry with the same `requestId` and input may succeed: `TRANSPORT_UNKNOWN`, `UNAVAILABLE`.
- Error sets: `request`, `http`.

**GraphQL**

```graphql
mutation AlphaRedeem($context: ContextInput!, $input: RedeemInput!) {
  redeem(context: $context, input: $input) {
    requestId
    committed
    sequence
  }
}
```
