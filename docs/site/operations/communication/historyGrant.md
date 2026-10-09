# `communication.historyGrant`

Expand the history a member can see to an earlier sequence.

- **Operation:** `communication.historyGrant`, a mutation sent as `CommunicationHistoryGrant`.
- **Layer:** server (server SDKs).
- **Authorization:** `backendKey` with scope `historyManage`.
- **Idempotency:** `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
- **Emits:**
  - `member.historyExpanded`: A member's visible history was expanded.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: HistoryGrantRequestInput!`)

| Field | Type |
| --- | --- |
| `conversationId` | `UUID!` |
| `principalId` | `UUID!` |
| `membershipEpoch` | `Decimal!` |
| `expectedRevision` | `Decimal!` |
| `fromSequence` | `Decimal!` |

**Result** (`HistoryGrantReply!`)

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

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `REQUEST_EXPIRED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `REVISION_CONFLICT`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `mutation`, `communicationMutation`, `rateLimited`.

**GraphQL**

```graphql
mutation CommunicationHistoryGrant($context: RequestContextInput!, $input: HistoryGrantRequestInput!) {
  historyGrant(context: $context, input: $input) {
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
| [TypeScript](../../typescript/reference/operations.md) | [`ServerConversation.members.grantHistory`](../../typescript/reference/server.md#serverconversationmembersgranthistory-method) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.history_grant`](../../python/reference/convohop.md#convohophistory_grant-method), [`AsyncConvoHop.history_grant`](../../python/reference/convohop.md#asyncconvohophistory_grant-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`CommunicationApi.historyGrant`](../../jvm/reference/server.md#communicationapihistorygrant-method), [`CommunicationSuspendApi.historyGrant`](../../jvm/reference/server-kotlin.md#communicationsuspendapihistorygrant-method) |
