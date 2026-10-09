# `communication.members`

List the members of a conversation.

- **Operation:** `communication.members`, a query sent as `CommunicationMembers`.
- **Layer:** both (client and server SDKs).
- **Authorization** (any one of):
  - `userSession`, when `member`: The caller is an active member of the conversation.
  - `backendKey` with scope `membershipManage`.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.
- **Pagination:** `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. Uses page `MemberPage` at `members.result`, items `Member`, page size `input.limit` and cursor `input.cursor`.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: MembersRequestInput!`)

| Field | Type |
| --- | --- |
| `conversationId` | `UUID!` |
| `limit` | `PageSize!` |
| `cursor` | `String` |

**Result** (`MembersReply!`)

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
| `result` | `MemberPage` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `rateLimited`.

**GraphQL**

```graphql
query CommunicationMembers($context: RequestContextInput!, $input: MembersRequestInput!) {
  members(context: $context, input: $input) {
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
| [TypeScript](../../typescript/reference/operations.md) | [`ServerConversation.members.list`](../../typescript/reference/server.md#serverconversationmemberslist-method), [`ConvoHopClient.members`](../../typescript/reference/client.md#convohopclientmembers-method) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.members`](../../python/reference/convohop.md#convohopmembers-method), [`ConvoHop.iter_members`](../../python/reference/convohop.md#convohopiter_members-method), [`AsyncConvoHop.members`](../../python/reference/convohop.md#asyncconvohopmembers-method), [`AsyncConvoHop.iter_members`](../../python/reference/convohop.md#asyncconvohopiter_members-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ServerMembers.ListAsync`](../../dotnet/reference/convohop.md#servermemberslistasync-method), [`CommunicationApi.MembersAsync`](../../dotnet/reference/api.md#communicationapimembersasync-method), [`CommunicationApi.MembersPagesAsync`](../../dotnet/reference/api.md#communicationapimemberspagesasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`ServerConversation.members.list`](../../jvm/reference/server.md#serverconversationmemberslist-method), [`CommunicationApi.members`](../../jvm/reference/server.md#communicationapimembers-method), [`CommunicationApi.membersPages`](../../jvm/reference/server.md#communicationapimemberspages-method), [`CommunicationSuspendApi.members`](../../jvm/reference/server-kotlin.md#communicationsuspendapimembers-method), [`CommunicationSuspendApi.membersPages`](../../jvm/reference/server-kotlin.md#communicationsuspendapimemberspages-method) |
| [Go](../../go/reference/operations.md) | [`ProjectClient.Members`](../../go/reference/convohop.md#projectclientmembers-method), [`ProjectClient.MembersPages`](../../go/reference/convohop.md#projectclientmemberspages-method) |
| [Swift](../../swift/reference/operations.md) | [`ConvoHopClient.members`](../../swift/reference/convohop.md#convohopclientmembers-method) |
| [Android](../../android/reference/operations.md) | [`ConvoHopClient.members`](../../android/reference/android-core.md#convohopclientmembers-method) |
| [Flutter](../../flutter/reference/operations.md) | [`CommunicationOperations.members`](../../flutter/reference/convohop.md#communicationoperationsmembers-method) |
