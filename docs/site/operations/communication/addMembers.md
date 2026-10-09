# `communication.addMembers`

Add several members in one request.

- **Operation:** `communication.addMembers`, a mutation sent as `CommunicationAddMembers`.
- **Layer:** server (server SDKs).
- **Authorization:** `backendKey` with scope `membershipManage`.
- **Idempotency:** `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
- **Emits:**
  - `member.added`: A member was added.
  - `member.roleChanged`: An active member's role changed.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: AddMembersInput!`)

| Field | Type |
| --- | --- |
| `conversationId` | `UUID!` |
| `members` | `[MemberBatchEntryInput!]!` |

**Result** (`AddMembersPayload!`)

| Field | Type |
| --- | --- |
| `status` | `String!` |
| `requestId` | `UUID!` |
| `receiptId` | `UUID!` |
| `committedAt` | `String!` |
| `replayed` | `Boolean!` |
| `result` | `ConversationMemberBatch!` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `MEMBERSHIP_COUNT_INVALID`, `MEMBER_LIMIT`, `NOT_FOUND`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `REQUEST_EXPIRED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `REVISION_CONFLICT`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `mutation`, `communicationMutation`, `rateLimited`.

**GraphQL**

```graphql
mutation CommunicationAddMembers($context: RequestContextInput!, $input: AddMembersInput!) {
  addMembers(context: $context, input: $input) {
    status
    requestId
    receiptId
    committedAt
    replayed
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
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`ProjectServerClient.addMembers`](../../typescript/reference/server.md#projectserverclientaddmembers-method), [`ServerConversation.members.addBatch`](../../typescript/reference/server.md#serverconversationmembersaddbatch-method) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.add_members`](../../python/reference/convohop.md#convohopadd_members-method), [`AsyncConvoHop.add_members`](../../python/reference/convohop.md#asyncconvohopadd_members-method) |
