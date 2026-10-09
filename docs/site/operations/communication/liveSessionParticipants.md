# `communication.liveSessionParticipants`

List the participants of a live session.

- **Operation:** `communication.liveSessionParticipants`, a query sent as `CommunicationLiveSessionParticipants`.
- **Layer:** both (client and server SDKs).
- **Authorization** (any one of):
  - `userSession`, when `member`: The caller is an active member of the conversation.
  - `backendKey` with scope `callRead`.
  - `backendKey` with scope `callManage`.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.
- **Pagination:** `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. Uses page `LiveParticipantPage` at `liveSessionParticipants.result`, items `LiveParticipation`, page size `input.limit` and cursor `input.cursor`.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: LiveParticipantsInput!`)

| Field | Type | Default |
| --- | --- | --- |
| `liveSessionId` | `UUID!` |  |
| `limit` | `PageSize!` | `50` |
| `cursor` | `String` |  |

**Result** (`LiveParticipantPageReply!`)

| Field | Type |
| --- | --- |
| `status` | `String!` |
| `requestId` | `UUID!` |
| `serverTime` | `String!` |
| `result` | `LiveParticipantPage!` |

**Errors**

- Returned by the authority: `CURSOR_INVALID`, `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `rateLimited`.

**GraphQL**

```graphql
query CommunicationLiveSessionParticipants($context: RequestContextInput!, $input: LiveParticipantsInput!) {
  liveSessionParticipants(context: $context, input: $input) {
    status
    requestId
    serverTime
    result {
      items {
        participationId
        principalId
        membershipEpoch
        role
        state
        permissions {
          microphone
          camera
          subscribe
        }
        reservationExpiresAt
        nativeConnectionId
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
      nextCursor
      complete
      partialReason
      refreshRequired
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`ServerLiveSession.participants`](../../typescript/reference/server.md#serverlivesessionparticipants-method), [`LiveSessionHandle.participants`](../../typescript/reference/client.md#livesessionhandleparticipants-method) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.live_session_participants`](../../python/reference/convohop.md#convohoplive_session_participants-method), [`ConvoHop.iter_live_session_participants`](../../python/reference/convohop.md#convohopiter_live_session_participants-method), [`AsyncConvoHop.live_session_participants`](../../python/reference/convohop.md#asyncconvohoplive_session_participants-method), [`AsyncConvoHop.iter_live_session_participants`](../../python/reference/convohop.md#asyncconvohopiter_live_session_participants-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ServerLiveSession.ListParticipantsAsync`](../../dotnet/reference/convohop.md#serverlivesessionlistparticipantsasync-method), [`CommunicationApi.LiveSessionParticipantsAsync`](../../dotnet/reference/api.md#communicationapilivesessionparticipantsasync-method), [`CommunicationApi.LiveSessionParticipantsPagesAsync`](../../dotnet/reference/api.md#communicationapilivesessionparticipantspagesasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`CommunicationApi.liveSessionParticipants`](../../jvm/reference/server.md#communicationapilivesessionparticipants-method), [`CommunicationApi.liveSessionParticipantsPages`](../../jvm/reference/server.md#communicationapilivesessionparticipantspages-method), [`CommunicationSuspendApi.liveSessionParticipants`](../../jvm/reference/server-kotlin.md#communicationsuspendapilivesessionparticipants-method), [`CommunicationSuspendApi.liveSessionParticipantsPages`](../../jvm/reference/server-kotlin.md#communicationsuspendapilivesessionparticipantspages-method) |
| [Go](../../go/reference/operations.md) | [`ProjectClient.LiveSessionParticipants`](../../go/reference/convohop.md#projectclientlivesessionparticipants-method), [`ProjectClient.LiveSessionParticipantsPages`](../../go/reference/convohop.md#projectclientlivesessionparticipantspages-method) |
