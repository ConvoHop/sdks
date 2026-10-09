# `communication.sendMessage`

Send a message. A backend key sends as its service principal, or as the member named by actAsPrincipalId.

- **Operation:** `communication.sendMessage`, a mutation sent as `CommunicationSendMessage`.
- **Layer:** both (client and server SDKs).
- **Authorization** (any one of):
  - `userSession`, when `member`: The caller is an active member of the conversation.
  - `backendKey` with scope `messageWrite`.
- **Idempotency:** `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
- **Emits:**
  - `message.created`: A message was sent.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: SendMessageRequestInput!`)

| Field | Type |
| --- | --- |
| `conversationId` | `UUID!` |
| `text` | `String!` |
| `props` | `Properties!` |
| `actAsPrincipalId` | `UUID` |

**Result** (`SendMessageReply!`)

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
| `result` | `MessageAck` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `OUTCOME_UNKNOWN`, `PLAN_LIMIT_EXCEEDED`, `QUOTA_EXCEEDED`, `RATE_LIMITED`, `REQUEST_EXPIRED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `mutation`, `communicationMutation`, `rateLimited`.

**GraphQL**

```graphql
mutation CommunicationSendMessage($context: RequestContextInput!, $input: SendMessageRequestInput!) {
  sendMessage(context: $context, input: $input) {
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
      sequence
      revision
      status
      cursor {
        incarnation
        conversationId
        sequence
      }
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`ServerConversation.messages.send`](../../typescript/reference/server.md#serverconversationmessagessend-method), [`ConvoHopClient.send`](../../typescript/reference/client.md#convohopclientsend-method), [`ConversationHandle.messages.send`](../../typescript/reference/client.md#conversationhandlemessagessend-property), [`Outbox.send`](../../typescript/reference/client.md#outboxsend-method), [`Outbox.resend`](../../typescript/reference/client.md#outboxresend-method), [`Outbox.flush`](../../typescript/reference/client.md#outboxflush-method), [`ConversationStore.send`](../../typescript/reference/client.md#conversationstoresend-method), [`ConversationView.send`](../../typescript/reference/react.md#conversationviewsend-method) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.send_message`](../../python/reference/convohop.md#convohopsend_message-method), [`AsyncConvoHop.send_message`](../../python/reference/convohop.md#asyncconvohopsend_message-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ServerMessages.SendAsync`](../../dotnet/reference/convohop.md#servermessagessendasync-method), [`CommunicationApi.SendMessageAsync`](../../dotnet/reference/api.md#communicationapisendmessageasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`ServerConversation.messages.send`](../../jvm/reference/server.md#serverconversationmessagessend-method), [`CommunicationApi.sendMessage`](../../jvm/reference/server.md#communicationapisendmessage-method), [`CommunicationSuspendApi.sendMessage`](../../jvm/reference/server-kotlin.md#communicationsuspendapisendmessage-method) |
| [Go](../../go/reference/operations.md) | [`ProjectClient.SendMessage`](../../go/reference/convohop.md#projectclientsendmessage-method) |
| [Android](../../android/reference/operations.md) | [`ConvoHopClient.send`](../../android/reference/android-core.md#convohopclientsend-method), [`ConversationHandle.messages.send`](../../android/reference/android-core.md#conversationhandlemessagessend-method), [`Outbox.send`](../../android/reference/android-core.md#outboxsend-method), [`Outbox.sendAgain`](../../android/reference/android-core.md#outboxsendagain-method), [`Outbox.drain`](../../android/reference/android-core.md#outboxdrain-method), [`Timeline.send`](../../android/reference/android-core.md#timelinesend-method) |
