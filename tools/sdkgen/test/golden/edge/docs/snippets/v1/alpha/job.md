## `job`

Poll a job that alpha.startJob started.

- **Operation:** `alpha.job`, a query sent as `AlphaJob`.
- **Layer:** server (server SDKs).
- **Authorization:** `serverKey` with scope `itemRead`.
- **Idempotency:** `safe`. Read-only. Repeat freely.

**Context** (`context: ContextInput!`)

| Field | Type | Use | Default | Description |
| --- | --- | --- | --- | --- |
| `tenant` | `String` | required |  | Tenant that owns the request. |
| `requestId` | `ID!` | required |  |  |
| `attempt` | `Int` | optional | `1` |  |
| `permit` | `String` | forbidden |  | Single-use permit. Only alpha.redeem accepts it. |
| `tags` | `[String!]` | optional | `["a","b\|c"]` |  |

**Input** (`input: JobInput!`)

| Field | Type |
| --- | --- |
| `operationId` | `ID!` |

**Result** (`Job`)

| Field | Type |
| --- | --- |
| `operationId` | `ID!` |
| `state` | `String!` |
| `progress` | `Float` |
| `output` | `Blob` |

**Errors**

- Returned by the authority: `NOT_FOUND`, `UNAVAILABLE`.
- Returned by the authority or raised by SDKs: `INVALID_REQUEST`.
- Raised by SDKs: `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `TRANSPORT_UNKNOWN`, `UNAVAILABLE`.
- Error sets: `request`, `http`.

**GraphQL**

```graphql
query AlphaJob($context: ContextInput!, $input: JobInput!) {
  job(context: $context, input: $input) {
    operationId
    state
    progress
    output
  }
}
```
