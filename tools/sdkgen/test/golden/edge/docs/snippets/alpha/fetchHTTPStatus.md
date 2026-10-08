## `fetchHTTPStatus`

Fetch a \<status\> for \`GET\` | \*POST\* calls, with \#tags, \{braces\}, \[links\], \~tildes\~, \& a back\\slash for \_escaping\_ in snake_case.

**Deprecated.** Use capabilities.

- **Operation:** `alpha.fetchHTTPStatus`, a query sent as `AlphaFetchHTTPStatus`.
- **Layer:** both (client and server SDKs).
- **Authorization** (any one of):
  - `userToken`.
  - `serverKey` with all of the scopes `itemRead` and `widgetWrite`.
- **Idempotency:** `safe`. Read-only. Repeat freely.

**Context** (`context: ContextInput!`)

| Field | Type | Use | Default | Description |
| --- | --- | --- | --- | --- |
| `tenant` | `String` | required |  | Tenant that owns the request. |
| `requestId` | `ID!` | required |  |  |
| `attempt` | `Int` | optional | `1` |  |
| `permit` | `String` | forbidden |  | Single-use permit. Only alpha.redeem accepts it. |
| `tags` | `[String!]` | optional | `["a","b\|c"]` |  |

**Input** (`input: FetchInput`)

| Field | Type | Default |
| --- | --- | --- |
| `method` | `HTTPMethod` | `"GET"` |

**Result** (`Int`)

**Errors**

- Returned by the authority: `UNAVAILABLE`.
- Transient, so repeating the request may succeed: `UNAVAILABLE`.

**GraphQL**

```graphql
query AlphaFetchHTTPStatus($context: ContextInput!, $input: FetchInput) {
  fetchHTTPStatus(context: $context, input: $input)
}
```
