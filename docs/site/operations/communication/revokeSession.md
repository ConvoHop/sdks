# `communication.revokeSession`

Revoke a user session.

- **Operation:** `communication.revokeSession`, a mutation sent as `CommunicationRevokeSession`.
- **Layer:** both (client and server SDKs).
- **Authorization** (any one of):
  - `userSession`, when `ownSession`: The session belongs to the caller.
  - `backendKey` with scope `sessionManage`.
- **Idempotency:** `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: RevokeSessionRequestInput!`)

| Field | Type |
| --- | --- |
| `sessionId` | `UUID!` |
| `expectedRevision` | `Decimal!` |

**Result** (`RevokeSessionReply!`)

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
| `result` | `SessionRevocation` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `REQUEST_EXPIRED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `REVISION_CONFLICT`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `mutation`, `communicationMutation`, `rateLimited`.

**GraphQL**

```graphql
mutation CommunicationRevokeSession($context: RequestContextInput!, $input: RevokeSessionRequestInput!) {
  revokeSession(context: $context, input: $input) {
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
      sessionId
      status
      mediaCutoff {
        state
        scope {
          kind
          principalId
          sessionId
          deviceId
          callId
        }
      }
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`ProjectServerClient.sessions.revoke`](../../typescript/reference/server.md#projectserverclientsessionsrevoke-property) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.revoke_session`](../../python/reference/convohop.md#convohoprevoke_session-method), [`AsyncConvoHop.revoke_session`](../../python/reference/convohop.md#asyncconvohoprevoke_session-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ServerSessions.RevokeAsync`](../../dotnet/reference/convohop.md#serversessionsrevokeasync-method), [`CommunicationApi.RevokeSessionAsync`](../../dotnet/reference/api.md#communicationapirevokesessionasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`ProjectServerClient.sessions.revoke`](../../jvm/reference/server.md#projectserverclientsessionsrevoke-method), [`CommunicationApi.revokeSession`](../../jvm/reference/server.md#communicationapirevokesession-method), [`CommunicationSuspendApi.revokeSession`](../../jvm/reference/server-kotlin.md#communicationsuspendapirevokesession-method) |
| [Go](../../go/reference/operations.md) | [`ProjectClient.RevokeSession`](../../go/reference/convohop.md#projectclientrevokesession-method) |
