# `communication.events`

Replay committed conversation events after a cursor, in sequence order.

- **Operation:** `communication.events`, a query sent as `CommunicationEvents`.
- **Layer:** client (client SDKs).
- **Authorization:** `userSession`, when `member`: The caller is an active member of the conversation.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.
- **Pagination:** `replay`. Committed events in ascending sequence after a cursor. Persist the last applied cursor; invalid or expired cursors fail and are never reset silently. Uses page `EventPage` at `events.result`, items `Event`, page size `input.limit` and cursor `input.after`.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: EventsRequestInput!`)

| Field | Type |
| --- | --- |
| `conversationId` | `UUID!` |
| `limit` | `PageSize!` |
| `after` | `CursorInput` |

**Result** (`EventsReply!`)

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
| `result` | `EventPage` |

**Errors**

- Returned by the authority: `CURSOR_AHEAD`, `CURSOR_EXPIRED`, `CURSOR_SCOPE_MISMATCH`, `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `rateLimited`.

**GraphQL**

```graphql
query CommunicationEvents($context: RequestContextInput!, $input: EventsRequestInput!) {
  events(context: $context, input: $input) {
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
        eventId
        conversationId
        sequence
        type
        occurredAt
        subjectRef {
          kind
          id
        }
        payload {
          messageId
          revision
          revisionSequence
          principalId
          membershipEpoch
          visibilityEpoch
          kind
          throughSequence
          callId
          generation
          state
          cutoffEvidence
          liveSessionId
        }
      }
      complete
      refreshRequired
      nextCursor {
        incarnation
        conversationId
        sequence
      }
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`RelayClient.events`](../../typescript/reference/client.md#relayclientevents-method), [`RelayClient.watch`](../../typescript/reference/client.md#relayclientwatch-method), [`RelayClient.resyncAuthorizedHistory`](../../typescript/reference/client.md#relayclientresyncauthorizedhistory-method), [`ConversationStore.open`](../../typescript/reference/client.md#conversationstoreopen-method), [`ConversationStore.resync`](../../typescript/reference/client.md#conversationstoreresync-method), [`useConversation`](../../typescript/reference/react.md#useconversation-function), [`ConversationView.open`](../../typescript/reference/react.md#conversationviewopen-method), [`ConversationView.resync`](../../typescript/reference/react.md#conversationviewresync-method) |
| [Swift](../../swift/reference/operations.md) | [`RelayClient.events`](../../swift/reference/relay.md#relayclientevents-method), [`RelayClient.watch`](../../swift/reference/relay.md#relayclientwatch-method), [`RelayClient.resyncAuthorizedHistory`](../../swift/reference/relay.md#relayclientresyncauthorizedhistory-method), [`ConversationStream.reconcile`](../../swift/reference/relay.md#conversationstreamreconcile-method), [`RelayConversationModel.start`](../../swift/reference/relay.md#relayconversationmodelstart-method), [`RelayConversationModel.resync`](../../swift/reference/relay.md#relayconversationmodelresync-method) |
| [Android](../../android/reference/operations.md) | [`RelayClient.events`](../../android/reference/android-core.md#relayclientevents-method), [`RelayClient.watch`](../../android/reference/android-core.md#relayclientwatch-method), [`RelayClient.resyncAuthorizedHistory`](../../android/reference/android-core.md#relayclientresyncauthorizedhistory-method), [`ConversationStream.reconcile`](../../android/reference/android-core.md#conversationstreamreconcile-method), [`RelayStore.timeline`](../../android/reference/android-core.md#relaystoretimeline-method) |
| [Flutter](../../flutter/reference/operations.md) | [`RelayClient.events`](../../flutter/reference/instantrelay.md#relayclientevents-method), [`RelayClient.watch`](../../flutter/reference/instantrelay.md#relayclientwatch-method), [`RelayClient.resyncAuthorizedHistory`](../../flutter/reference/instantrelay.md#relayclientresyncauthorizedhistory-method), [`ConversationStream.reconcile`](../../flutter/reference/instantrelay.md#conversationstreamreconcile-method), [`ConversationStore`](../../flutter/reference/instantrelay.md#conversationstore-constructor), [`ConversationStore.reconnect`](../../flutter/reference/instantrelay.md#conversationstorereconnect-method), [`ConversationStore.resync`](../../flutter/reference/instantrelay.md#conversationstoreresync-method), [`CommunicationOperations.events`](../../flutter/reference/instantrelay.md#communicationoperationsevents-method) |
| [React Native](../../react-native/reference/operations.md) | [`RelayClient.events`](../../react-native/reference/client.md#relayclientevents-method), [`RelayClient.watch`](../../react-native/reference/client.md#relayclientwatch-method), [`RelayClient.resyncAuthorizedHistory`](../../react-native/reference/client.md#relayclientresyncauthorizedhistory-method), [`ConversationStore.open`](../../react-native/reference/client.md#conversationstoreopen-method), [`ConversationStore.resync`](../../react-native/reference/client.md#conversationstoreresync-method), [`useConversation`](../../react-native/reference/react.md#useconversation-function), [`ConversationView.open`](../../react-native/reference/react.md#conversationviewopen-method), [`ConversationView.resync`](../../react-native/reference/react.md#conversationviewresync-method) |
