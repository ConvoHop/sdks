# `communication.renewSession`

Renew a user session before it expires.

- **Operation:** `communication.renewSession`, a mutation sent as `CommunicationRenewSession`.
- **Layer:** server (server SDKs).
- **Authorization:** `backendKey` with scope `sessionIssue`.
- **Idempotency:** `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: RenewSessionRequestInput!`)

| Field | Type |
| --- | --- |
| `sessionId` | `UUID!` |
| `principalId` | `UUID!` |
| `deviceId` | `UUID!` |
| `expectedRevision` | `Decimal!` |
| `requestedTtlMs` | `Decimal!` |

**Result** (`RenewSessionReply!`)

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
| `result` | `SessionBootstrap` |

**Errors**

- Returned by the authority: `CREDENTIAL_EXPIRED`, `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `REQUEST_EXPIRED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `REVISION_CONFLICT`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `mutation`, `communicationMutation`, `rateLimited`.

**GraphQL**

```graphql
mutation CommunicationRenewSession($context: RequestContextInput!, $input: RenewSessionRequestInput!) {
  renewSession(context: $context, input: $input) {
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
      session {
        sessionId
        principalId
        deviceId
        incarnation
        sessionRevision
        expiresAt
        status
      }
      tokenExpiresAt
      sessionToken
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`ProjectServerClient.sessions.renew`](../../typescript/reference/server.md#projectserverclientsessionsrenew-property) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.renew_session`](../../python/reference/convohop.md#convohoprenew_session-method), [`AsyncConvoHop.renew_session`](../../python/reference/convohop.md#asyncconvohoprenew_session-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ServerSessions.RenewAsync`](../../dotnet/reference/convohop.md#serversessionsrenewasync-method), [`CommunicationApi.RenewSessionAsync`](../../dotnet/reference/api.md#communicationapirenewsessionasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`ProjectServerClient.sessions.renew`](../../jvm/reference/server.md#projectserverclientsessionsrenew-method), [`CommunicationApi.renewSession`](../../jvm/reference/server.md#communicationapirenewsession-method), [`CommunicationSuspendApi.renewSession`](../../jvm/reference/server-kotlin.md#communicationsuspendapirenewsession-method) |
