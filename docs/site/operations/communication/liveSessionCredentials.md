# `communication.liveSessionCredentials`

Obtain a media credential for one connection of the caller's participation.

- **Operation:** `communication.liveSessionCredentials`, a mutation sent as `CommunicationLiveSessionCredentials`.
- **Layer:** client (client SDKs).
- **Authorization:** `userSession`, when `participant`: The caller holds the referenced participation in the live session.
- **Idempotency:** `singleUse`. Like idempotent, but the result carries a short-lived credential for one connection. Request a new one instead of reusing an expired result.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: LiveSessionCredentialsInput!`)

| Field | Type |
| --- | --- |
| `liveSessionId` | `UUID!` |
| `participationId` | `UUID!` |
| `expectedGeneration` | `Decimal!` |
| `mode` | `LiveConnectionMode!` |
| `replacementOfConnectionId` | `UUID` |

**Result** (`LiveSessionCredentialsPayload!`)

| Field | Type |
| --- | --- |
| `status` | `String!` |
| `requestId` | `UUID!` |
| `receiptId` | `UUID!` |
| `committedAt` | `String!` |
| `replayed` | `Boolean!` |
| `result` | `LiveConnectionGrant!` |

**Errors**

- Returned by the authority: `ALREADY_CONNECTED`, `CREDENTIAL_EXPIRED`, `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GENERATION_CONFLICT`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `INVALID_REPLACEMENT`, `LIVE_SESSION_CLOSED`, `MEDIA_NOT_READY`, `MEDIA_RECOVERING`, `NOT_FOUND`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `REQUEST_EXPIRED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `CREDENTIAL_REFRESH_REQUIRED`, `IDEMPOTENCY_CONFLICT`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `PARTICIPATION_MISMATCH`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_LIMIT`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `mutation`, `communicationMutation`, `live`, `rateLimited`.

**GraphQL**

```graphql
mutation CommunicationLiveSessionCredentials($context: RequestContextInput!, $input: LiveSessionCredentialsInput!) {
  liveSessionCredentials(context: $context, input: $input) {
    status
    requestId
    receiptId
    committedAt
    replayed
    result {
      liveSessionId
      participationId
      generation
      roomName
      participantIdentity
      livekitUrl
      transportToken
      admissionTicket
      forwardingLease
      transportExpiresAt
      admissionExpiresAt
      leaseExpiresAt
      leasePolicyId
      connectToken
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`LiveParticipationHandle.connect`](../../typescript/reference/client.md#liveparticipationhandleconnect-method), [`LiveParticipationHandle.connectWith`](../../typescript/reference/client.md#liveparticipationhandleconnectwith-method), [`MediaConnection.reconnect`](../../typescript/reference/client.md#mediaconnectionreconnect-method), [`MediaConnectionView.connect`](../../typescript/reference/react.md#mediaconnectionviewconnect-method), [`MediaConnectionView.reconnect`](../../typescript/reference/react.md#mediaconnectionviewreconnect-method) |
| [Swift](../../swift/reference/operations.md) | [`LiveParticipationHandle.connect`](../../swift/reference/convohop.md#liveparticipationhandleconnect-method), [`MediaConnection.reconnect`](../../swift/reference/convohop.md#mediaconnectionreconnect-method) |
| [Android](../../android/reference/operations.md) | [`LiveParticipationHandle.connect`](../../android/reference/android-core.md#liveparticipationhandleconnect-method), [`MediaConnection.reconnect`](../../android/reference/android-core.md#mediaconnectionreconnect-method), [`ConvoHopCall.answer` (static)](../../android/reference/android.md#convohopcallanswer-static-method), [`ConvoHopCall.join` (static)](../../android/reference/android.md#convohopcalljoin-static-method) |
| [Flutter](../../flutter/reference/operations.md) | [`LiveParticipationHandle.connect`](../../flutter/reference/convohop.md#liveparticipationhandleconnect-method), [`LiveMediaConnection.reconnect`](../../flutter/reference/convohop.md#livemediaconnectionreconnect-method), [`CommunicationOperations.liveSessionCredentials`](../../flutter/reference/convohop.md#communicationoperationslivesessioncredentials-method) |
| [React Native](../../react-native/reference/operations.md) | [`LiveParticipationHandle.connectWith`](../../react-native/reference/client.md#liveparticipationhandleconnectwith-method) |
