## `redeemCredential`

Redeem a delivered credential with its delivery permit.

- **Operation:** `communication.redeemCredential`, a mutation sent as `CommunicationRedeemCredential`.
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

**Input** (`input: RedeemCredentialRequestInput!`)

| Field | Type |
| --- | --- |
| `deliveryId` | `UUID!` |

**Result** (`RedeemCredentialReply!`)

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
| `result` | `CredentialCapsule` |

**Errors**

- Returned by the authority: `CREDENTIAL_DELIVERY_EXPIRED`, `DELIVERY_CONSUMED`, `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `REQUEST_EXPIRED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `CREDENTIAL_REQUIRED`, `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `mutation`, `communicationMutation`, `credentialDelivery`, `rateLimited`.

**GraphQL**

```graphql
mutation CommunicationRedeemCredential($context: RequestContextInput!, $input: RedeemCredentialRequestInput!) {
  redeemCredential(context: $context, input: $input) {
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
      kind
      keyId
      backendPrincipalId
      backendKey
      expiresAt
      endpointId
      secretVersion
      secret
    }
  }
}
```
