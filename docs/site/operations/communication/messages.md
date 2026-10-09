# `communication.messages`

List the messages of a conversation, newest first. A backend key reads the full history, or the history visible to the member named by actAsPrincipalId.

- **Operation:** `communication.messages`, a query sent as `CommunicationMessages`.
- **Layer:** both (client and server SDKs).
- **Authorization** (any one of):
  - `userSession`, when `member`: The caller is an active member of the conversation.
  - `backendKey` with scope `messageRead`.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.
- **Pagination:** `sequence`. Newest first. Pass nextCursor back as the sequence cursor input to read older items until complete is true. Uses page `MessagePage` at `messages.result`, items `Message`, page size `input.limit` and cursor `input.beforeSequence`.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: MessagesRequestInput!`)

| Field | Type |
| --- | --- |
| `conversationId` | `UUID!` |
| `limit` | `PageSize!` |
| `beforeSequence` | `Decimal` |
| `actAsPrincipalId` | `UUID` |

**Result** (`MessagesReply!`)

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
| `result` | `MessagePage` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `PAGE_ITEM_TOO_LARGE`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `rateLimited`.

**GraphQL**

```graphql
query CommunicationMessages($context: RequestContextInput!, $input: MessagesRequestInput!) {
  messages(context: $context, input: $input) {
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
| [TypeScript](../../typescript/reference/operations.md) | [`ServerConversation.messages.list`](../../typescript/reference/server.md#serverconversationmessageslist-method), [`ConvoHopClient.messages`](../../typescript/reference/client.md#convohopclientmessages-method), [`ConversationHandle.messages.list`](../../typescript/reference/client.md#conversationhandlemessageslist-property) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.messages`](../../python/reference/convohop.md#convohopmessages-method), [`ConvoHop.iter_messages`](../../python/reference/convohop.md#convohopiter_messages-method), [`AsyncConvoHop.messages`](../../python/reference/convohop.md#asyncconvohopmessages-method), [`AsyncConvoHop.iter_messages`](../../python/reference/convohop.md#asyncconvohopiter_messages-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`ServerConversation.messages.list`](../../jvm/reference/server.md#serverconversationmessageslist-method), [`CommunicationApi.messages`](../../jvm/reference/server.md#communicationapimessages-method), [`CommunicationApi.messagesPages`](../../jvm/reference/server.md#communicationapimessagespages-method), [`CommunicationSuspendApi.messages`](../../jvm/reference/server-kotlin.md#communicationsuspendapimessages-method), [`CommunicationSuspendApi.messagesPages`](../../jvm/reference/server-kotlin.md#communicationsuspendapimessagespages-method) |
