# `communication.deleteMessage`

Delete a message.

- **Operation:** `communication.deleteMessage`, a mutation sent as `CommunicationDeleteMessage`.
- **Layer:** both (client and server SDKs).
- **Authorization** (any one of):
  - `userSession`, when `authorOrModerator`: The caller wrote the message or moderates the conversation.
  - `backendKey` with scope `moderation`.
- **Idempotency:** `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
- **Emits:**
  - `message.deleted`: A message was deleted.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: DeleteMessageRequestInput!`)

| Field | Type |
| --- | --- |
| `conversationId` | `UUID!` |
| `messageId` | `UUID!` |
| `expectedRevision` | `Decimal!` |

**Result** (`DeleteMessageReply!`)

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
mutation CommunicationDeleteMessage($context: RequestContextInput!, $input: DeleteMessageRequestInput!) {
  deleteMessage(context: $context, input: $input) {
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
| [TypeScript](../../typescript/reference/operations.md) | [`ServerConversation.messages.delete`](../../typescript/reference/server.md#serverconversationmessagesdelete-method), [`RelayClient.delete`](../../typescript/reference/client.md#relayclientdelete-method), [`ConversationHandle.messages.delete`](../../typescript/reference/client.md#conversationhandlemessagesdelete-property) |
| [Python](../../python/reference/operations.md) | [`Relay.delete_message`](../../python/reference/instantrelay.md#relaydelete_message-method), [`AsyncRelay.delete_message`](../../python/reference/instantrelay.md#asyncrelaydelete_message-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ServerMessages.DeleteAsync`](../../dotnet/reference/relay.md#servermessagesdeleteasync-method), [`CommunicationApi.DeleteMessageAsync`](../../dotnet/reference/api.md#communicationapideletemessageasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`ServerConversation.messages.delete`](../../jvm/reference/server.md#serverconversationmessagesdelete-method), [`CommunicationApi.deleteMessage`](../../jvm/reference/server.md#communicationapideletemessage-method), [`CommunicationSuspendApi.deleteMessage`](../../jvm/reference/server-kotlin.md#communicationsuspendapideletemessage-method) |
| [Go](../../go/reference/operations.md) | [`ProjectClient.DeleteMessage`](../../go/reference/relay.md#projectclientdeletemessage-method) |
| [Swift](../../swift/reference/operations.md) | [`RelayClient.delete`](../../swift/reference/relay.md#relayclientdelete-method), [`ConversationMessages.delete`](../../swift/reference/relay.md#conversationmessagesdelete-method) |
| [Android](../../android/reference/operations.md) | [`RelayClient.delete`](../../android/reference/android-core.md#relayclientdelete-method), [`ConversationHandle.messages.delete`](../../android/reference/android-core.md#conversationhandlemessagesdelete-method) |
| [Flutter](../../flutter/reference/operations.md) | [`RelayClient.delete`](../../flutter/reference/instantrelay.md#relayclientdelete-method), [`ConversationMessages.delete`](../../flutter/reference/instantrelay.md#conversationmessagesdelete-method), [`CommunicationOperations.deleteMessage`](../../flutter/reference/instantrelay.md#communicationoperationsdeletemessage-method) |
| [React Native](../../react-native/reference/operations.md) | [`RelayClient.delete`](../../react-native/reference/client.md#relayclientdelete-method), [`ConversationHandle.messages.delete`](../../react-native/reference/client.md#conversationhandlemessagesdelete-property) |
