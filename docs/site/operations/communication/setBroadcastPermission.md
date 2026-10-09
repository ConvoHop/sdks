# `communication.setBroadcastPermission`

Allow or deny a member to publish media in live sessions.

- **Operation:** `communication.setBroadcastPermission`, a mutation sent as `CommunicationSetBroadcastPermission`.
- **Layer:** server (server SDKs).
- **Authorization:** `backendKey` with scope `membershipManage`.
- **Idempotency:** `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
- **Emits:**
  - `member.broadcastPermissionChanged`: A member's live session broadcast permission changed.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: SetBroadcastPermissionInput!`)

| Field | Type |
| --- | --- |
| `conversationId` | `UUID!` |
| `principalId` | `UUID!` |
| `allowed` | `Boolean!` |
| `expectedMembershipRevision` | `Decimal!` |

**Result** (`SetBroadcastPermissionPayload!`)

| Field | Type |
| --- | --- |
| `status` | `String!` |
| `requestId` | `UUID!` |
| `receiptId` | `UUID!` |
| `committedAt` | `String!` |
| `replayed` | `Boolean!` |
| `result` | `BroadcastPermissionChanged!` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `REQUEST_EXPIRED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `REVISION_CONFLICT`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_LIMIT`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `mutation`, `communicationMutation`, `rateLimited`.

**GraphQL**

```graphql
mutation CommunicationSetBroadcastPermission($context: RequestContextInput!, $input: SetBroadcastPermissionInput!) {
  setBroadcastPermission(context: $context, input: $input) {
    status
    requestId
    receiptId
    committedAt
    replayed
    result {
      member {
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
      mediaCutoff {
        state
        scope {
          kind
          liveSessionId
          generation
          participationId
        }
        evidence
        enforcedAt
        operationId
      }
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`ServerConversation.members.setBroadcastPermission`](../../typescript/reference/server.md#serverconversationmemberssetbroadcastpermission-method) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.set_broadcast_permission`](../../python/reference/convohop.md#convohopset_broadcast_permission-method), [`AsyncConvoHop.set_broadcast_permission`](../../python/reference/convohop.md#asyncconvohopset_broadcast_permission-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ServerMembers.SetBroadcastPermissionAsync`](../../dotnet/reference/convohop.md#servermemberssetbroadcastpermissionasync-method), [`CommunicationApi.SetBroadcastPermissionAsync`](../../dotnet/reference/api.md#communicationapisetbroadcastpermissionasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`CommunicationApi.setBroadcastPermission`](../../jvm/reference/server.md#communicationapisetbroadcastpermission-method), [`CommunicationSuspendApi.setBroadcastPermission`](../../jvm/reference/server-kotlin.md#communicationsuspendapisetbroadcastpermission-method) |
| [Go](../../go/reference/operations.md) | [`ProjectClient.SetBroadcastPermission`](../../go/reference/convohop.md#projectclientsetbroadcastpermission-method) |
