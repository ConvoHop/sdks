# `communication.acknowledgeCredential`

Acknowledge that a redeemed credential is stored, closing the delivery.

- **Operation:** `communication.acknowledgeCredential`, a mutation sent as `CommunicationAcknowledgeCredential`.
- **Layer:** server (server SDKs).
- **Authorization:** `deliveryPermit`.
- **Idempotency:** `permitBound`. Authorized by a single-delivery permit. Retry with the same requestId and permit; outcomes cannot be resolved by lookup.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | required |

**Input** (`input: AcknowledgeCredentialRequestInput!`)

| Field | Type |
| --- | --- |
| `deliveryId` | `UUID!` |

**Result** (`AcknowledgeCredentialReply!`)

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
| `result` | `DeliveryAck` |

**Errors**

- Returned by the authority: `CREDENTIAL_DELIVERY_EXPIRED`, `DELIVERY_CONSUMED`, `DELIVERY_NOT_REDEEMED`, `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `REQUEST_EXPIRED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `CREDENTIAL_REQUIRED`, `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_LIMIT`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `mutation`, `communicationMutation`, `credentialDelivery`, `rateLimited`.

**GraphQL**

```graphql
mutation CommunicationAcknowledgeCredential($context: RequestContextInput!, $input: AcknowledgeCredentialRequestInput!) {
  acknowledgeCredential(context: $context, input: $input) {
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
      deliveryId
      acknowledged
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | Not wrapped by a method |
| [Python](../../python/reference/operations.md) | Not wrapped by a method |
| [.NET](../../dotnet/reference/operations.md) | [`CommunicationApi.AcknowledgeCredentialAsync`](../../dotnet/reference/api.md#communicationapiacknowledgecredentialasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`CommunicationApi.acknowledgeCredential`](../../jvm/reference/server.md#communicationapiacknowledgecredential-method), [`CommunicationSuspendApi.acknowledgeCredential`](../../jvm/reference/server-kotlin.md#communicationsuspendapiacknowledgecredential-method) |
| [Go](../../go/reference/operations.md) | [`ProjectClient.AcknowledgeCredential`](../../go/reference/convohop.md#projectclientacknowledgecredential-method) |
