# `communication.search`

Search the messages visible to the calling user. A backend key searches as the member named by actAsPrincipalId, or within scope.conversationIds.

- **Operation:** `communication.search`, a query sent as `CommunicationSearch`.
- **Layer:** both (client and server SDKs).
- **Authorization** (any one of):
  - `userSession`.
  - `backendKey` with scope `messageRead`.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.
- **Pagination:** `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. Uses page `SearchPage` at `search.result`, items `SearchHit`, page size `input.pageSize` and cursor `input.cursor`.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: SearchRequestInput!`)

| Field | Type |
| --- | --- |
| `query` | `String!` |
| `pageSize` | `PageSize!` |
| `scope` | `SearchScopeInput` |
| `cursor` | `String` |
| `actAsPrincipalId` | `UUID` |

**Result** (`SearchReply!`)

| Field | Type |
| --- | --- |
| `status` | `String!` |
| `requestId` | `UUID!` |
| `serverTime` | `String` |
| `receiptId` | `UUID` |
| `committedAt` | `String` |
| `replayed` | `Boolean` |
| `operation` | `OperationRef` |
| `resourceRef` | `ResourceRef` |
| `result` | `SearchPage` |

**Errors**

- Returned by the authority: `CURSOR_SCOPE_MISMATCH`, `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `PAGE_ITEM_TOO_LARGE`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `rateLimited`.

**GraphQL**

```graphql
query CommunicationSearch($context: RequestContextInput!, $input: SearchRequestInput!) {
  search(context: $context, input: $input) {
    status
    requestId
    serverTime
    receiptId
    committedAt
    replayed
    operation {
      operationId
      owner
      href
      state
    }
    resourceRef {
      kind
      id
    }
    result {
      items {
        conversationId
        message {
          messageId
          conversationId
          authorId
          sequence
          revision
          revisionSequence
          createdAt
          deleted
          text
          props
          editedAt
        }
      }
      complete
      refreshRequired
      nextCursor
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`ProjectServerClient.search`](../../typescript/reference/server.md#projectserverclientsearch-method), [`ConvoHopClient.search`](../../typescript/reference/client.md#convohopclientsearch-method) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.search`](../../python/reference/convohop.md#convohopsearch-method), [`ConvoHop.iter_search`](../../python/reference/convohop.md#convohopiter_search-method), [`AsyncConvoHop.search`](../../python/reference/convohop.md#asyncconvohopsearch-method), [`AsyncConvoHop.iter_search`](../../python/reference/convohop.md#asyncconvohopiter_search-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ProjectServerClient.SearchAsync`](../../dotnet/reference/convohop.md#projectserverclientsearchasync-method), [`CommunicationApi.SearchAsync`](../../dotnet/reference/api.md#communicationapisearchasync-method), [`CommunicationApi.SearchPagesAsync`](../../dotnet/reference/api.md#communicationapisearchpagesasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`CommunicationApi.search`](../../jvm/reference/server.md#communicationapisearch-method), [`CommunicationApi.searchPages`](../../jvm/reference/server.md#communicationapisearchpages-method), [`CommunicationSuspendApi.search`](../../jvm/reference/server-kotlin.md#communicationsuspendapisearch-method), [`CommunicationSuspendApi.searchPages`](../../jvm/reference/server-kotlin.md#communicationsuspendapisearchpages-method) |
| [Go](../../go/reference/operations.md) | [`ProjectClient.Search`](../../go/reference/convohop.md#projectclientsearch-method), [`ProjectClient.SearchPages`](../../go/reference/convohop.md#projectclientsearchpages-method) |
