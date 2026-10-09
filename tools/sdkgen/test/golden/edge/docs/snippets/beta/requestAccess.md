## `requestAccess`

Ask for access without a credential.

- **Operation:** `beta.requestAccess`, a mutation sent as `BetaRequestAccess`.
- **Layer:** server (server SDKs).
- **Authorization:** `anon`, when `challenge`: The input answers a challenge the authority issued.
- **Idempotency:** `replayOnly`. Replay with the same requestId and input; resolveRequest cannot read the outcome.

**Context** (`context: ContextInput!`)

| Field | Type | Use | Default | Description |
| --- | --- | --- | --- | --- |
| `tenant` | `String` | optional |  | Tenant that owns the request. |
| `requestId` | `ID!` | required |  |  |
| `attempt` | `Int` | optional | `1` |  |
| `permit` | `String` | forbidden |  | Single-use permit. Only alpha.redeem accepts it. |
| `tags` | `[String!]` | optional | `["a","b\|c"]` |  |

**Input** (`input: RequestAccessInput!`)

| Field | Type |
| --- | --- |
| `email` | `String!` |
| `challenge` | `String!` |

**Result** (`Receipt!`)

| Field | Type |
| --- | --- |
| `requestId` | `ID!` |
| `committed` | `Boolean!` |
| `sequence` | `Counter` |

**Errors**

- Returned by the authority: `UNAVAILABLE`.
- Returned by the authority or raised by SDKs: `INVALID_REQUEST`.
- Raised by SDKs: `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `TRANSPORT_UNKNOWN`, `UNAVAILABLE`.
- Error sets: `request`, `http`.

**GraphQL**

```graphql
mutation BetaRequestAccess($context: ContextInput!, $input: RequestAccessInput!) {
  requestAccess(context: $context, input: $input) {
    requestId
    committed
    sequence
  }
}
```
