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
| [TypeScript](../../typescript/reference/operations.md) | [`ServerConversation.messages.list`](../../typescript/reference/server.md#serverconversationmessageslist-method), [`ConvoHopClient.messages`](../../typescript/reference/client.md#convohopclientmessages-method), [`ConversationHandle.messages.list`](../../typescript/reference/client.md#conversationhandlemessageslist-property), [`ConversationStore.open`](../../typescript/reference/client.md#conversationstoreopen-method), [`ConversationStore.resync`](../../typescript/reference/client.md#conversationstoreresync-method), [`ConversationStore.loadOlder`](../../typescript/reference/client.md#conversationstoreloadolder-method), [`useConversation`](../../typescript/reference/react.md#useconversation-function), [`ConversationView.open`](../../typescript/reference/react.md#conversationviewopen-method), [`ConversationView.resync`](../../typescript/reference/react.md#conversationviewresync-method), [`ConversationView.loadOlder`](../../typescript/reference/react.md#conversationviewloadolder-method) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.messages`](../../python/reference/convohop.md#convohopmessages-method), [`ConvoHop.iter_messages`](../../python/reference/convohop.md#convohopiter_messages-method), [`AsyncConvoHop.messages`](../../python/reference/convohop.md#asyncconvohopmessages-method), [`AsyncConvoHop.iter_messages`](../../python/reference/convohop.md#asyncconvohopiter_messages-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ServerMessages.ListAsync`](../../dotnet/reference/convohop.md#servermessageslistasync-method), [`CommunicationApi.MessagesAsync`](../../dotnet/reference/api.md#communicationapimessagesasync-method), [`CommunicationApi.MessagesPagesAsync`](../../dotnet/reference/api.md#communicationapimessagespagesasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`ServerConversation.messages.list`](../../jvm/reference/server.md#serverconversationmessageslist-method), [`CommunicationApi.messages`](../../jvm/reference/server.md#communicationapimessages-method), [`CommunicationApi.messagesPages`](../../jvm/reference/server.md#communicationapimessagespages-method), [`CommunicationSuspendApi.messages`](../../jvm/reference/server-kotlin.md#communicationsuspendapimessages-method), [`CommunicationSuspendApi.messagesPages`](../../jvm/reference/server-kotlin.md#communicationsuspendapimessagespages-method) |
| [Go](../../go/reference/operations.md) | [`ProjectClient.Messages`](../../go/reference/convohop.md#projectclientmessages-method), [`ProjectClient.MessagesPages`](../../go/reference/convohop.md#projectclientmessagespages-method) |
| [Swift](../../swift/reference/operations.md) | [`ConvoHopClient.messages`](../../swift/reference/convohop.md#convohopclientmessages-method), [`ConversationMessages.list`](../../swift/reference/convohop.md#conversationmessageslist-method), [`ConvoHopConversationModel.start`](../../swift/reference/convohop.md#convohopconversationmodelstart-method), [`ConvoHopConversationModel.resync`](../../swift/reference/convohop.md#convohopconversationmodelresync-method), [`ConvoHopConversationModel.loadOlder`](../../swift/reference/convohop.md#convohopconversationmodelloadolder-method) |
| [Android](../../android/reference/operations.md) | [`ConvoHopClient.messages`](../../android/reference/android-core.md#convohopclientmessages-method), [`ConversationHandle.messages.list`](../../android/reference/android-core.md#conversationhandlemessageslist-method), [`ConvoHopStore.timeline`](../../android/reference/android-core.md#convohopstoretimeline-method), [`Timeline.loadOlder`](../../android/reference/android-core.md#timelineloadolder-method) |
| [Flutter](../../flutter/reference/operations.md) | [`ConvoHopClient.messages`](../../flutter/reference/convohop.md#convohopclientmessages-method), [`ConversationMessages.list`](../../flutter/reference/convohop.md#conversationmessageslist-method), [`ConversationStore`](../../flutter/reference/convohop.md#conversationstore-constructor), [`ConversationStore.reconnect`](../../flutter/reference/convohop.md#conversationstorereconnect-method), [`ConversationStore.resync`](../../flutter/reference/convohop.md#conversationstoreresync-method), [`ConversationStore.loadOlder`](../../flutter/reference/convohop.md#conversationstoreloadolder-method), [`CommunicationOperations.messages`](../../flutter/reference/convohop.md#communicationoperationsmessages-method) |
| [React Native](../../react-native/reference/operations.md) | [`ConvoHopClient.messages`](../../react-native/reference/client.md#convohopclientmessages-method), [`ConversationHandle.messages.list`](../../react-native/reference/client.md#conversationhandlemessageslist-property), [`ConversationStore.open`](../../react-native/reference/client.md#conversationstoreopen-method), [`ConversationStore.resync`](../../react-native/reference/client.md#conversationstoreresync-method), [`ConversationStore.loadOlder`](../../react-native/reference/client.md#conversationstoreloadolder-method), [`useConversation`](../../react-native/reference/react.md#useconversation-function), [`ConversationView.open`](../../react-native/reference/react.md#conversationviewopen-method), [`ConversationView.resync`](../../react-native/reference/react.md#conversationviewresync-method), [`ConversationView.loadOlder`](../../react-native/reference/react.md#conversationviewloadolder-method) |
