## `currentLiveSession`

Return the active live session of a conversation, if any.

- **Operation:** `communication.currentLiveSession`, a query sent as `CommunicationCurrentLiveSession`.
- **Layer:** both (client and server SDKs).
- **Authorization** (any one of):
  - `userSession`, when `member`: The caller is an active member of the conversation.
  - `backendKey` with scope `callRead`.
  - `backendKey` with scope `callManage`.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: ConversationLiveInput!`)

| Field | Type |
| --- | --- |
| `conversationId` | `UUID!` |

**Result** (`CurrentLiveSessionReply!`)

| Field | Type |
| --- | --- |
| `status` | `String!` |
| `requestId` | `UUID!` |
| `serverTime` | `String!` |
| `result` | `LiveSession` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `rateLimited`.

**GraphQL**

```graphql
query CommunicationCurrentLiveSession($context: RequestContextInput!, $input: ConversationLiveInput!) {
  currentLiveSession(context: $context, input: $input) {
    status
    requestId
    serverTime
    result {
      liveSessionId
      conversationId
      creatorId
      kind
      mediaProfile
      state
      generation
      revision
      createdAt
      expiresAt
      myParticipation {
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
