# `communication.conversationMute`

Read whether a member has muted message push notifications for a conversation. A backend key must name the member with actAsPrincipalId.

- **Operation:** `communication.conversationMute`, a query sent as `CommunicationConversationMute`.
- **Layer:** both (client and server SDKs).
- **Authorization** (any one of):
  - `userSession`, when `member`: The caller is an active member of the conversation.
  - `backendKey` with scope `membershipManage`.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: ConversationMuteInput!`)

| Field | Type |
| --- | --- |
| `conversationId` | `UUID!` |
| `actAsPrincipalId` | `UUID` |

**Result** (`ConversationMuteReply!`)

| Field | Type |
| --- | --- |
| `status` | `String!` |
| `requestId` | `UUID!` |
| `serverTime` | `String!` |
| `result` | `ConversationMute!` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `rateLimited`.

**GraphQL**

```graphql
query CommunicationConversationMute($context: RequestContextInput!, $input: ConversationMuteInput!) {
  conversationMute(context: $context, input: $input) {
    status
    requestId
    serverTime
    result {
      conversationId
      principalId
      muted
      until
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`ServerConversation.members.getMute`](../../typescript/reference/server.md#serverconversationmembersgetmute-method), [`ConversationHandle.mute.get`](../../typescript/reference/client.md#conversationhandlemuteget-property) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.conversation_mute`](../../python/reference/convohop.md#convohopconversation_mute-method), [`AsyncConvoHop.conversation_mute`](../../python/reference/convohop.md#asyncconvohopconversation_mute-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`CommunicationApi.conversationMute`](../../jvm/reference/server.md#communicationapiconversationmute-method), [`CommunicationSuspendApi.conversationMute`](../../jvm/reference/server-kotlin.md#communicationsuspendapiconversationmute-method) |
