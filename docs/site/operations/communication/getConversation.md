# `communication.getConversation`

Read a conversation.

- **Operation:** `communication.getConversation`, a query sent as `CommunicationGetConversation`.
- **Layer:** both (client and server SDKs).
- **Authorization** (any one of):
  - `userSession`, when `member`: The caller is an active member of the conversation.
  - `backendKey` with scope `conversationManage`.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: GetConversationRequestInput!`)

| Field | Type |
| --- | --- |
| `conversationId` | `UUID!` |

**Result** (`GetConversationReply!`)

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
| `result` | `Conversation` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `rateLimited`.

**GraphQL**

```graphql
query CommunicationGetConversation($context: RequestContextInput!, $input: GetConversationRequestInput!) {
  getConversation(context: $context, input: $input) {
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
      conversationId
      revision
      title
      props
      latestSequence
      membership {
        conversationId
        principalId
        role
        status
        membershipEpoch
        visibilityEpoch
        revision
        visibleFromSequence
        canStartBroadcast
      }
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`ServerConversation.get`](../../typescript/reference/server.md#serverconversationget-method), [`ConvoHopClient.getConversation`](../../typescript/reference/client.md#convohopclientgetconversation-method), [`ConversationHandle.get`](../../typescript/reference/client.md#conversationhandleget-method), [`ConversationStore.open`](../../typescript/reference/client.md#conversationstoreopen-method), [`ConversationStore.resync`](../../typescript/reference/client.md#conversationstoreresync-method), [`useConversation`](../../typescript/reference/react.md#useconversation-function), [`ConversationView.open`](../../typescript/reference/react.md#conversationviewopen-method), [`ConversationView.resync`](../../typescript/reference/react.md#conversationviewresync-method) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.get_conversation`](../../python/reference/convohop.md#convohopget_conversation-method), [`AsyncConvoHop.get_conversation`](../../python/reference/convohop.md#asyncconvohopget_conversation-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ServerConversation.GetAsync`](../../dotnet/reference/convohop.md#serverconversationgetasync-method), [`CommunicationApi.GetConversationAsync`](../../dotnet/reference/api.md#communicationapigetconversationasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`ServerConversation.get`](../../jvm/reference/server.md#serverconversationget-method), [`CommunicationApi.getConversation`](../../jvm/reference/server.md#communicationapigetconversation-method), [`CommunicationSuspendApi.getConversation`](../../jvm/reference/server-kotlin.md#communicationsuspendapigetconversation-method) |
| [Go](../../go/reference/operations.md) | [`ProjectClient.GetConversation`](../../go/reference/convohop.md#projectclientgetconversation-method) |
