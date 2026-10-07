## `startJob`

Start a job. It finishes asynchronously.

- **Operation:** `alpha.startJob`, a mutation sent as `AlphaStartJob`.
- **Layer:** server (server SDKs).
- **Authorization:** `serverKey` with scope `widgetWrite`.
- **Idempotency:** `idempotent`. Retry with the same requestId and input; resolve an unknown outcome with resolveRequest.
- **Emits:**
  - `job.started`: A job started.
  - `job.finished`: A job finished.
- **Long-running:** poll `alpha.job` with `input.operationId` set to `startJob.job.operationId` from the result until the work completes.

**Context** (`context: ContextInput!`)

| Field | Type | Use | Default | Description |
| --- | --- | --- | --- | --- |
| `tenant` | `String` | required |  | Tenant that owns the request. |
| `requestId` | `ID!` | required |  |  |
| `attempt` | `Int` | optional | `1` |  |
| `permit` | `String` | forbidden |  | Single-use permit. Only alpha.redeem accepts it. |
| `tags` | `[String!]` | optional | `["a","b\|c"]` |  |

**Input** (`input: StartJobInput!`)

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `itemId` | `ID!` |  |  |
| `repeat` | `Int` | `1` | How many times to run. |
| `props` | `Blob` |  |  |

**Result** (`StartJobPayload!`)

| Field | Type |
| --- | --- |
| `requestId` | `ID!` |
| `receipt` | `Receipt!` |
| `job` | `JobRef` |

**Errors**

- Returned by the authority: `NOT_FOUND`, `UNAVAILABLE`.
- Returned by the authority or raised by SDKs: `INVALID_REQUEST`.
- Raised by SDKs: `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `TRANSPORT_UNKNOWN`, `UNAVAILABLE`.
- Error sets: `request`, `http`.

**GraphQL**

```graphql
mutation AlphaStartJob($context: ContextInput!, $input: StartJobInput!) {
  startJob(context: $context, input: $input) {
    requestId
    receipt {
      requestId
      committed
      sequence
    }
    job {
      operationId
      state
    }
  }
}
```
