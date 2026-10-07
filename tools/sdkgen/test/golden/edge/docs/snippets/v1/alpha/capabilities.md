## `capabilities`

Read the server capabilities.

Server capabilities.

- **Operation:** `alpha.capabilities`, a query sent as `AlphaCapabilities`.
- **Layer:** both (client and server SDKs).
- **Authorization** (any one of):
  - `userToken`.
  - `serverKey`.
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
- Raised by SDKs: `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `TRANSPORT_UNKNOWN`, `UNAVAILABLE`.
- Error sets: `request`, `http`.

**GraphQL**

```graphql
query AlphaCapabilities($context: ContextInput!) {
  capabilities(context: $context) {
    version
    wssUrl
    features
  }
}
```
