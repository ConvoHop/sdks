# `communication.getOperation`

Read the state of a long-running communication operation.

- **Operation:** `communication.getOperation`, a query sent as `CommunicationGetOperation`.
- **Layer:** both (client and server SDKs).
- **Authorization** (any one of):
  - `userSession`, when `operationParticipant`: The caller started the operation or can access its target.
  - `backendKey`, when `operationParticipant`: The caller started the operation or can access its target.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: GetOperationRequestInput!`)

| Field | Type |
| --- | --- |
| `operationId` | `UUID!` |

**Result** (`GetOperationReply!`)

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
| `result` | `Operation` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `SCOPE_REQUIRED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `rateLimited`.

**GraphQL**

```graphql
query CommunicationGetOperation($context: RequestContextInput!, $input: GetOperationRequestInput!) {
  getOperation(context: $context, input: $input) {
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
      operationId
      kind
      targetRef {
        kind
        id
      }
      state
      revision
      requestedAt
      updatedAt
      steps {
        stepId
        state
      }
      result {
        projectId
        incarnation
        status
        backend
        environment
        policyRevision
        expiresAt
        kind
        resourceRef {
          kind
          id
        }
        delivery {
          deliveryId
          kind
          projectId
          installationId
          resourceRef {
            kind
            id
          }
          expiresAt
          payloadDigest
          recipientActorRef {
            tenantId
            objectId
          }
        }
        keyId
        endpointId
        enabled
        liveSessionCompletion {
          liveSessionId
          generation
          state
          revision
          completedAt
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
        replayedDeliveries
        skippedDeliveries
        messagePreview
      }
      blockedReason
    }
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`ProjectServerClient.operation`](../../typescript/reference/server.md#projectserverclientoperation-method) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.get_operation`](../../python/reference/convohop.md#convohopget_operation-method), [`AsyncConvoHop.get_operation`](../../python/reference/convohop.md#asyncconvohopget_operation-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`ProjectServerClient.operation`](../../jvm/reference/server.md#projectserverclientoperation-method), [`CommunicationApi.getOperation`](../../jvm/reference/server.md#communicationapigetoperation-method), [`CommunicationSuspendApi.getOperation`](../../jvm/reference/server-kotlin.md#communicationsuspendapigetoperation-method) |
