# `communication.updateConversation`

Update the title or properties of a conversation.

- **Operation:** `communication.updateConversation`, a mutation sent as `CommunicationUpdateConversation`.
- **Layer:** both (client and server SDKs).
- **Authorization** (any one of):
  - `userSession`, when `moderator`: The caller moderates the conversation.
  - `backendKey` with scope `conversationManage`.
- **Idempotency:** `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
- **Emits:**
  - `conversation.updated`: A conversation's title or properties changed.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: UpdateConversationRequestInput!`)

| Field | Type |
| --- | --- |
| `conversationId` | `UUID!` |
| `expectedRevision` | `Decimal!` |
| `title` | `String` |
| `props` | `Properties` |

**Result** (`UpdateConversationReply!`)

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

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `REQUEST_EXPIRED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `REVISION_CONFLICT`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `mutation`, `communicationMutation`, `rateLimited`.

**GraphQL**

```graphql
mutation CommunicationUpdateConversation($context: RequestContextInput!, $input: UpdateConversationRequestInput!) {
  updateConversation(context: $context, input: $input) {
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
| [TypeScript](../../typescript/reference/operations.md) | [`ServerConversation.update`](../../typescript/reference/server.md#serverconversationupdate-method) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.update_conversation`](../../python/reference/convohop.md#convohopupdate_conversation-method), [`AsyncConvoHop.update_conversation`](../../python/reference/convohop.md#asyncconvohopupdate_conversation-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ServerConversation.UpdateAsync`](../../dotnet/reference/convohop.md#serverconversationupdateasync-method), [`CommunicationApi.UpdateConversationAsync`](../../dotnet/reference/api.md#communicationapiupdateconversationasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`CommunicationApi.updateConversation`](../../jvm/reference/server.md#communicationapiupdateconversation-method), [`CommunicationSuspendApi.updateConversation`](../../jvm/reference/server-kotlin.md#communicationsuspendapiupdateconversation-method) |
