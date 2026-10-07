## `capabilities`

Read the server capabilities.

Server capabilities.

- **Operation:** `beta.capabilities`, a query sent as `BetaCapabilities`.
- **Layer:** server (server SDKs).
- **Authorization:** `serverKey`.
- **Idempotency:** `safe`. Read-only. Repeat freely.

**Context** (`context: ContextInput!`)

| Field | Type | Use | Default | Description |
| --- | --- | --- | --- | --- |
| `tenant` | `String` | optional |  | Tenant that owns the request. |
| `requestId` | `ID!` | required |  |  |
| `attempt` | `Int` | optional | `1` |  |
| `permit` | `String` | forbidden |  | Single-use permit. Only alpha.redeem accepts it. |
| `tags` | `[String!]` | optional | `["a","b\|c"]` |  |

**Result** (`Capabilities!`)

| Field | Type |
| --- | --- |
| `version` | `String!` |
| `wssUrl` | `String` |
| `features` | `[String!]!` |

**Errors**

- Returned by the authority: `UNAVAILABLE`.
- Returned by the authority or raised by SDKs: `INVALID_REQUEST`.
- Transient, so repeating the request may succeed: `UNAVAILABLE`.
- Error sets: `request`.

**GraphQL**

```graphql
query BetaCapabilities($context: ContextInput!) {
  capabilities(context: $context) {
    version
    wssUrl
    features
  }
}
```
