# `communication.receipts`

List the delivery and read receipts of a conversation.

- **Operation:** `communication.receipts`, a query sent as `CommunicationReceipts`.
- **Layer:** client (client SDKs).
- **Authorization:** `userSession`, when `member`: The caller is an active member of the conversation.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.
- **Pagination:** `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. Uses page `ReceiptPage` at `receipts.result`, items `ReadReceipt`, page size `input.limit` and cursor `input.cursor`.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: ReceiptsRequestInput!`)

| Field | Type |
| --- | --- |
| `conversationId` | `UUID!` |
| `limit` | `PageSize!` |
| `cursor` | `String` |

**Result** (`ReceiptsReply!`)

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
| `result` | `ReceiptPage` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `rateLimited`.

**GraphQL**

```graphql
query CommunicationReceipts($context: RequestContextInput!, $input: ReceiptsRequestInput!) {
  receipts(context: $context, input: $input) {
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
        principalId
        membershipEpoch
        visibilityEpoch
        deliveredThroughSequence
        readThroughSequence
        updatedAt
      }
      complete
      refreshRequired
      nextCursor
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`RelayClient.receipts`](../../typescript/reference/client.md#relayclientreceipts-method), [`ConversationStore.open`](../../typescript/reference/client.md#conversationstoreopen-method), [`ConversationStore.resync`](../../typescript/reference/client.md#conversationstoreresync-method), [`useConversation`](../../typescript/reference/react.md#useconversation-function), [`ConversationView.open`](../../typescript/reference/react.md#conversationviewopen-method), [`ConversationView.resync`](../../typescript/reference/react.md#conversationviewresync-method) |
| [Swift](../../swift/reference/operations.md) | [`RelayClient.receipts`](../../swift/reference/relay.md#relayclientreceipts-method), [`RelayConversationModel.start`](../../swift/reference/relay.md#relayconversationmodelstart-method), [`RelayConversationModel.resync`](../../swift/reference/relay.md#relayconversationmodelresync-method) |
| [Android](../../android/reference/operations.md) | [`RelayClient.receipts`](../../android/reference/android-core.md#relayclientreceipts-method), [`RelayStore.timeline`](../../android/reference/android-core.md#relaystoretimeline-method) |
| [Flutter](../../flutter/reference/operations.md) | [`RelayClient.receipts`](../../flutter/reference/instantrelay.md#relayclientreceipts-method), [`ConversationStore`](../../flutter/reference/instantrelay.md#conversationstore-constructor), [`ConversationStore.reconnect`](../../flutter/reference/instantrelay.md#conversationstorereconnect-method), [`ConversationStore.resync`](../../flutter/reference/instantrelay.md#conversationstoreresync-method), [`CommunicationOperations.receipts`](../../flutter/reference/instantrelay.md#communicationoperationsreceipts-method) |
| [React Native](../../react-native/reference/operations.md) | [`RelayClient.receipts`](../../react-native/reference/client.md#relayclientreceipts-method), [`ConversationStore.open`](../../react-native/reference/client.md#conversationstoreopen-method), [`ConversationStore.resync`](../../react-native/reference/client.md#conversationstoreresync-method), [`useConversation`](../../react-native/reference/react.md#useconversation-function), [`ConversationView.open`](../../react-native/reference/react.md#conversationviewopen-method), [`ConversationView.resync`](../../react-native/reference/react.md#conversationviewresync-method) |
