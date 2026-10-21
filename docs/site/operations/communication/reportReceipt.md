# `communication.reportReceipt`

Report delivery or read progress through a sequence.

- **Operation:** `communication.reportReceipt`, a mutation sent as `CommunicationReportReceipt`.
- **Layer:** client (client SDKs).
- **Authorization:** `userSession`, when `member`: The caller is an active member of the conversation.
- **Idempotency:** `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
- **Emits:**
  - `receipt.reported`: A member reported delivery or read progress.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: ReportReceiptRequestInput!`)

| Field | Type |
| --- | --- |
| `conversationId` | `UUID!` |
| `kind` | `String!` |
| `membershipEpoch` | `Decimal!` |
| `visibilityEpoch` | `Decimal!` |
| `throughSequence` | `Decimal!` |

**Result** (`ReportReceiptReply!`)

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
| `result` | `ReadReceipt` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `REQUEST_EXPIRED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `REVISION_CONFLICT`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_LIMIT`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `mutation`, `communicationMutation`, `rateLimited`.

**GraphQL**

```graphql
mutation CommunicationReportReceipt($context: RequestContextInput!, $input: ReportReceiptRequestInput!) {
  reportReceipt(context: $context, input: $input) {
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
      principalId
      membershipEpoch
      visibilityEpoch
      deliveredThroughSequence
      readThroughSequence
      updatedAt
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`RelayClient.reportRead`](../../typescript/reference/client.md#relayclientreportread-method), [`RelayClient.reportDelivered`](../../typescript/reference/client.md#relayclientreportdelivered-method), [`ConversationStore.markRead`](../../typescript/reference/client.md#conversationstoremarkread-method), [`ConversationStore.markDelivered`](../../typescript/reference/client.md#conversationstoremarkdelivered-method), [`ConversationView.markRead`](../../typescript/reference/react.md#conversationviewmarkread-method), [`ConversationView.markDelivered`](../../typescript/reference/react.md#conversationviewmarkdelivered-method) |
| [Swift](../../swift/reference/operations.md) | [`RelayClient.reportRead`](../../swift/reference/relay.md#relayclientreportread-method), [`RelayReadReceiptReporter.markRead`](../../swift/reference/relay.md#relayreadreceiptreportermarkread-method), [`RelayConversationModel.markRead`](../../swift/reference/relay.md#relayconversationmodelmarkread-method) |
| [Android](../../android/reference/operations.md) | [`RelayClient.reportRead`](../../android/reference/android-core.md#relayclientreportread-method), [`RelayClient.reportDelivered`](../../android/reference/android-core.md#relayclientreportdelivered-method), [`Timeline.markRead`](../../android/reference/android-core.md#timelinemarkread-method) |
| [Flutter](../../flutter/reference/operations.md) | [`RelayClient.reportRead`](../../flutter/reference/instantrelay.md#relayclientreportread-method), [`ConversationStore.markRead`](../../flutter/reference/instantrelay.md#conversationstoremarkread-method), [`CommunicationOperations.reportReceipt`](../../flutter/reference/instantrelay.md#communicationoperationsreportreceipt-method) |
| [React Native](../../react-native/reference/operations.md) | [`RelayClient.reportRead`](../../react-native/reference/client.md#relayclientreportread-method), [`RelayClient.reportDelivered`](../../react-native/reference/client.md#relayclientreportdelivered-method), [`ConversationStore.markRead`](../../react-native/reference/client.md#conversationstoremarkread-method), [`ConversationStore.markDelivered`](../../react-native/reference/client.md#conversationstoremarkdelivered-method), [`ConversationView.markRead`](../../react-native/reference/react.md#conversationviewmarkread-method), [`ConversationView.markDelivered`](../../react-native/reference/react.md#conversationviewmarkdelivered-method) |
