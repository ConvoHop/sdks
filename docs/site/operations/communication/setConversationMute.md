# `communication.setConversationMute`

Mute or unmute message push notifications for a member of a conversation, optionally until a time. Calls still ring. A backend key must name the member with actAsPrincipalId.

- **Operation:** `communication.setConversationMute`, a mutation sent as `CommunicationSetConversationMute`.
- **Layer:** both (client and server SDKs).
- **Authorization** (any one of):
  - `userSession`, when `member`: The caller is an active member of the conversation.
  - `backendKey` with scope `membershipManage`.
- **Idempotency:** `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: SetConversationMuteInput!`)

| Field | Type |
| --- | --- |
| `conversationId` | `UUID!` |
| `muted` | `Boolean!` |
| `until` | `String` |
| `actAsPrincipalId` | `UUID` |

**Result** (`SetConversationMutePayload!`)

| Field | Type |
| --- | --- |
| `status` | `String!` |
| `requestId` | `UUID!` |
| `receiptId` | `UUID!` |
| `committedAt` | `String!` |
| `replayed` | `Boolean!` |
| `result` | `ConversationMute!` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `REQUEST_EXPIRED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `mutation`, `communicationMutation`, `rateLimited`.

**GraphQL**

```graphql
mutation CommunicationSetConversationMute($context: RequestContextInput!, $input: SetConversationMuteInput!) {
  setConversationMute(context: $context, input: $input) {
    status
    requestId
    receiptId
    committedAt
    replayed
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
| [TypeScript](../../typescript/reference/operations.md) | [`ServerConversation.members.setMute`](../../typescript/reference/server.md#serverconversationmemberssetmute-method), [`ConversationHandle.mute.set`](../../typescript/reference/client.md#conversationhandlemuteset-property) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.set_conversation_mute`](../../python/reference/convohop.md#convohopset_conversation_mute-method), [`AsyncConvoHop.set_conversation_mute`](../../python/reference/convohop.md#asyncconvohopset_conversation_mute-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`CommunicationApi.setConversationMute`](../../jvm/reference/server.md#communicationapisetconversationmute-method), [`CommunicationSuspendApi.setConversationMute`](../../jvm/reference/server-kotlin.md#communicationsuspendapisetconversationmute-method) |
