# `communication.typing`

Send an ephemeral typing signal.

- **Operation:** `communication.typing`, a mutation sent as `CommunicationTyping`.
- **Layer:** client (client SDKs).
- **Authorization:** `userSession`, when `member`: The caller is an active member of the conversation.
- **Idempotency:** `ephemeral`. Transient signal. Not deduplicated or retried; send a fresh signal instead.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: TypingRequestInput!`)

| Field | Type |
| --- | --- |
| `conversationId` | `UUID!` |
| `isTyping` | `Boolean!` |

**Result** (`TypingReply!`)

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
| `result` | `TypingStatus` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, but this operation is never retried; send a fresh request: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `rateLimited`.

**GraphQL**

```graphql
mutation CommunicationTyping($context: RequestContextInput!, $input: TypingRequestInput!) {
  typing(context: $context, input: $input) {
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
      accepted
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`RelayClient.typing`](../../typescript/reference/client.md#relayclienttyping-method), [`TypingIndicator.input`](../../typescript/reference/client.md#typingindicatorinput-method), [`TypingIndicator.stop`](../../typescript/reference/client.md#typingindicatorstop-method), [`TypingIndicator.dispose`](../../typescript/reference/client.md#typingindicatordispose-method), [`useTyping`](../../typescript/reference/react.md#usetyping-function), [`TypingControls.input`](../../typescript/reference/react.md#typingcontrolsinput-method), [`TypingControls.stop`](../../typescript/reference/react.md#typingcontrolsstop-method) |
| [Swift](../../swift/reference/operations.md) | [`RelayClient.setTyping`](../../swift/reference/relay.md#relayclientsettyping-method), [`RelayTypingIndicator.textChanged`](../../swift/reference/relay.md#relaytypingindicatortextchanged-method), [`RelayTypingIndicator.stop`](../../swift/reference/relay.md#relaytypingindicatorstop-method), [`RelayConversationModel.send`](../../swift/reference/relay.md#relayconversationmodelsend-method), [`RelayConversationModel.textChanged`](../../swift/reference/relay.md#relayconversationmodeltextchanged-method), [`RelayConversationModel.stop`](../../swift/reference/relay.md#relayconversationmodelstop-method) |
| [Android](../../android/reference/operations.md) | [`RelayClient.typing`](../../android/reference/android-core.md#relayclienttyping-method), [`TypingIndicator.keystroke`](../../android/reference/android-core.md#typingindicatorkeystroke-method), [`TypingIndicator.stop`](../../android/reference/android-core.md#typingindicatorstop-method), [`Timeline.send`](../../android/reference/android-core.md#timelinesend-method) |
| [Flutter](../../flutter/reference/operations.md) | [`RelayClient.sendTyping`](../../flutter/reference/instantrelay.md#relayclientsendtyping-method), [`TypingIndicator.keystroke`](../../flutter/reference/instantrelay.md#typingindicatorkeystroke-method), [`TypingIndicator.stop`](../../flutter/reference/instantrelay.md#typingindicatorstop-method), [`TypingIndicator.close`](../../flutter/reference/instantrelay.md#typingindicatorclose-method), [`CommunicationOperations.typing`](../../flutter/reference/instantrelay.md#communicationoperationstyping-method) |
| [React Native](../../react-native/reference/operations.md) | [`RelayClient.typing`](../../react-native/reference/client.md#relayclienttyping-method), [`TypingIndicator.input`](../../react-native/reference/client.md#typingindicatorinput-method), [`TypingIndicator.stop`](../../react-native/reference/client.md#typingindicatorstop-method), [`TypingIndicator.dispose`](../../react-native/reference/client.md#typingindicatordispose-method), [`useTyping`](../../react-native/reference/react.md#usetyping-function), [`TypingControls.input`](../../react-native/reference/react.md#typingcontrolsinput-method), [`TypingControls.stop`](../../react-native/reference/react.md#typingcontrolsstop-method) |
