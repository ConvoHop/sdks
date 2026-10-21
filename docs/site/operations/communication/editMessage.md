# `communication.editMessage`

Edit a message.

- **Operation:** `communication.editMessage`, a mutation sent as `CommunicationEditMessage`.
- **Layer:** both (client and server SDKs).
- **Authorization** (any one of):
  - `userSession`, when `authorOrModerator`: The caller wrote the message or moderates the conversation.
  - `backendKey` with scope `moderation`.
- **Idempotency:** `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
- **Emits:**
  - `message.edited`: A message was edited.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: EditMessageRequestInput!`)

| Field | Type |
| --- | --- |
| `conversationId` | `UUID!` |
| `messageId` | `UUID!` |
| `expectedRevision` | `Decimal!` |
| `text` | `String` |
| `props` | `Properties` |

**Result** (`EditMessageReply!`)

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

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `MESSAGE_DELETED`, `NOT_FOUND`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `REQUEST_EXPIRED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `REVISION_CONFLICT`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_LIMIT`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `mutation`, `communicationMutation`, `rateLimited`.

**GraphQL**

```graphql
mutation CommunicationEditMessage($context: RequestContextInput!, $input: EditMessageRequestInput!) {
  editMessage(context: $context, input: $input) {
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
| [TypeScript](../../typescript/reference/operations.md) | [`ServerConversation.messages.edit`](../../typescript/reference/server.md#serverconversationmessagesedit-method), [`RelayClient.edit`](../../typescript/reference/client.md#relayclientedit-method), [`ConversationHandle.messages.edit`](../../typescript/reference/client.md#conversationhandlemessagesedit-property) |
| [Python](../../python/reference/operations.md) | [`Relay.edit_message`](../../python/reference/instantrelay.md#relayedit_message-method), [`AsyncRelay.edit_message`](../../python/reference/instantrelay.md#asyncrelayedit_message-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ServerMessages.EditAsync`](../../dotnet/reference/relay.md#servermessageseditasync-method), [`CommunicationApi.EditMessageAsync`](../../dotnet/reference/api.md#communicationapieditmessageasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`ServerConversation.messages.edit`](../../jvm/reference/server.md#serverconversationmessagesedit-method), [`CommunicationApi.editMessage`](../../jvm/reference/server.md#communicationapieditmessage-method), [`CommunicationSuspendApi.editMessage`](../../jvm/reference/server-kotlin.md#communicationsuspendapieditmessage-method) |
| [Go](../../go/reference/operations.md) | [`ProjectClient.EditMessage`](../../go/reference/relay.md#projectclienteditmessage-method) |
| [Swift](../../swift/reference/operations.md) | [`RelayClient.edit`](../../swift/reference/relay.md#relayclientedit-method), [`ConversationMessages.edit`](../../swift/reference/relay.md#conversationmessagesedit-method) |
| [Android](../../android/reference/operations.md) | [`RelayClient.edit`](../../android/reference/android-core.md#relayclientedit-method), [`ConversationHandle.messages.edit`](../../android/reference/android-core.md#conversationhandlemessagesedit-method) |
| [Flutter](../../flutter/reference/operations.md) | [`RelayClient.edit`](../../flutter/reference/instantrelay.md#relayclientedit-method), [`ConversationMessages.edit`](../../flutter/reference/instantrelay.md#conversationmessagesedit-method), [`CommunicationOperations.editMessage`](../../flutter/reference/instantrelay.md#communicationoperationseditmessage-method) |
| [React Native](../../react-native/reference/operations.md) | [`RelayClient.edit`](../../react-native/reference/client.md#relayclientedit-method), [`ConversationHandle.messages.edit`](../../react-native/reference/client.md#conversationhandlemessagesedit-property) |
