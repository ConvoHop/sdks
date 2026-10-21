# `communication.getMessage`

Read one message. A backend key reads any message, or reads as the member named by actAsPrincipalId.

- **Operation:** `communication.getMessage`, a query sent as `CommunicationGetMessage`.
- **Layer:** both (client and server SDKs).
- **Authorization** (any one of):
  - `userSession`, when `member`: The caller is an active member of the conversation.
  - `backendKey` with scope `messageRead`.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: GetMessageRequestInput!`)

| Field | Type |
| --- | --- |
| `conversationId` | `UUID!` |
| `messageId` | `UUID!` |
| `actAsPrincipalId` | `UUID` |

**Result** (`GetMessageReply!`)

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
| `result` | `Message` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `MESSAGE_DELETED`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `rateLimited`.

**GraphQL**

```graphql
query CommunicationGetMessage($context: RequestContextInput!, $input: GetMessageRequestInput!) {
  getMessage(context: $context, input: $input) {
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
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`ServerConversation.messages.get`](../../typescript/reference/server.md#serverconversationmessagesget-method), [`RelayClient.getMessage`](../../typescript/reference/client.md#relayclientgetmessage-method), [`ConversationStore.open`](../../typescript/reference/client.md#conversationstoreopen-method), [`ConversationStore.resync`](../../typescript/reference/client.md#conversationstoreresync-method), [`useConversation`](../../typescript/reference/react.md#useconversation-function), [`ConversationView.open`](../../typescript/reference/react.md#conversationviewopen-method), [`ConversationView.resync`](../../typescript/reference/react.md#conversationviewresync-method) |
| [Python](../../python/reference/operations.md) | [`Relay.get_message`](../../python/reference/instantrelay.md#relayget_message-method), [`AsyncRelay.get_message`](../../python/reference/instantrelay.md#asyncrelayget_message-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ServerMessages.GetAsync`](../../dotnet/reference/relay.md#servermessagesgetasync-method), [`CommunicationApi.GetMessageAsync`](../../dotnet/reference/api.md#communicationapigetmessageasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`ServerConversation.messages.get`](../../jvm/reference/server.md#serverconversationmessagesget-method), [`CommunicationApi.getMessage`](../../jvm/reference/server.md#communicationapigetmessage-method), [`CommunicationSuspendApi.getMessage`](../../jvm/reference/server-kotlin.md#communicationsuspendapigetmessage-method) |
| [Go](../../go/reference/operations.md) | [`ProjectClient.GetMessage`](../../go/reference/relay.md#projectclientgetmessage-method) |
| [Swift](../../swift/reference/operations.md) | [`RelayClient.getMessage`](../../swift/reference/relay.md#relayclientgetmessage-method), [`ConversationMessages.get`](../../swift/reference/relay.md#conversationmessagesget-method), [`RelayConversationModel.start`](../../swift/reference/relay.md#relayconversationmodelstart-method), [`RelayConversationModel.resync`](../../swift/reference/relay.md#relayconversationmodelresync-method), [`RelayConversationModel.send`](../../swift/reference/relay.md#relayconversationmodelsend-method), [`RelayNotificationService.didReceive`](../../swift/reference/notification-service.md#relaynotificationservicedidreceive-method) |
| [Android](../../android/reference/operations.md) | [`RelayClient.getMessage`](../../android/reference/android-core.md#relayclientgetmessage-method), [`RelayStore.timeline`](../../android/reference/android-core.md#relaystoretimeline-method), [`RelayMessageContent.content`](../../android/reference/android.md#relaymessagecontentcontent-method) |
| [Flutter](../../flutter/reference/operations.md) | [`RelayClient.getMessage`](../../flutter/reference/instantrelay.md#relayclientgetmessage-method), [`MessageNotification.fetchMessage`](../../flutter/reference/instantrelay.md#messagenotificationfetchmessage-method), [`ConversationStore`](../../flutter/reference/instantrelay.md#conversationstore-constructor), [`ConversationStore.reconnect`](../../flutter/reference/instantrelay.md#conversationstorereconnect-method), [`ConversationStore.resync`](../../flutter/reference/instantrelay.md#conversationstoreresync-method), [`ConversationStore.send`](../../flutter/reference/instantrelay.md#conversationstoresend-method), [`CommunicationOperations.getMessage`](../../flutter/reference/instantrelay.md#communicationoperationsgetmessage-method) |
| [React Native](../../react-native/reference/operations.md) | [`RelayClient.getMessage`](../../react-native/reference/client.md#relayclientgetmessage-method), [`ConversationStore.open`](../../react-native/reference/client.md#conversationstoreopen-method), [`ConversationStore.resync`](../../react-native/reference/client.md#conversationstoreresync-method), [`useConversation`](../../react-native/reference/react.md#useconversation-function), [`ConversationView.open`](../../react-native/reference/react.md#conversationviewopen-method), [`ConversationView.resync`](../../react-native/reference/react.md#conversationviewresync-method) |
