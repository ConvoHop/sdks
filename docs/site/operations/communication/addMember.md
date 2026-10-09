# `communication.addMember`

Add a member, or change the role of an active member.

- **Operation:** `communication.addMember`, a mutation sent as `CommunicationAddMember`.
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

**Input** (`input: AddMemberRequestInput!`)

| Field | Type |
| --- | --- |
| `conversationId` | `UUID!` |
| `principalId` | `UUID!` |
| `role` | `String!` |
| `expectedRevision` | `Decimal!` |

**Result** (`AddMemberReply!`)

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
| `result` | `Member` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `MEMBERSHIP_COUNT_INVALID`, `MEMBER_LIMIT`, `NOT_FOUND`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `REQUEST_EXPIRED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `REVISION_CONFLICT`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `mutation`, `communicationMutation`, `rateLimited`.

**GraphQL**

```graphql
mutation CommunicationAddMember($context: RequestContextInput!, $input: AddMemberRequestInput!) {
  addMember(context: $context, input: $input) {
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
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`ServerConversation.members.add`](../../typescript/reference/server.md#serverconversationmembersadd-method) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.add_member`](../../python/reference/convohop.md#convohopadd_member-method), [`AsyncConvoHop.add_member`](../../python/reference/convohop.md#asyncconvohopadd_member-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`ServerConversation.members.add`](../../jvm/reference/server.md#serverconversationmembersadd-method), [`CommunicationApi.addMember`](../../jvm/reference/server.md#communicationapiaddmember-method), [`CommunicationSuspendApi.addMember`](../../jvm/reference/server-kotlin.md#communicationsuspendapiaddmember-method) |
