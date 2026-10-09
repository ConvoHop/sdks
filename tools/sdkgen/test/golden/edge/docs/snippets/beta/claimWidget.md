## `claimWidget`

Claim a widget for an agent.

- **Operation:** `beta.claimWidget`, a mutation sent as `BetaClaimWidget`.
- **Layer:** server (server SDKs).
- **Authorization:** `agentToken`.
- **Idempotency:** `replayOnly`. Replay with the same requestId and input; resolveRequest cannot read the outcome.

**Context** (`context: ContextInput!`)

| Field | Type | Use | Default | Description |
| --- | --- | --- | --- | --- |
| `tenant` | `String` | optional |  | Tenant that owns the request. |
| `requestId` | `ID!` | required |  |  |
| `attempt` | `Int` | optional | `1` |  |
| `permit` | `String` | forbidden |  | Single-use permit. Only alpha.redeem accepts it. |
| `tags` | `[String!]` | optional | `["a","b\|c"]` |  |

**Input** (`input: ClaimWidgetInput!`)

| Field | Type |
| --- | --- |
| `widgetId` | `ID!` |

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
mutation BetaClaimWidget($context: ContextInput!, $input: ClaimWidgetInput!) {
  claimWidget(context: $context, input: $input) {
    id
    label
    state
    revision
  }
}
```
