## `getOperation`

Read the state of a long-running management operation.

- **Operation:** `management.getOperation`, a query sent as `ManagementGetOperation`.
- **Layer:** server (server SDKs).
- **Authorization:** `portalCredential`, when `owner`: The caller owns the organization, deployment or project.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | forbidden |
| `incarnation` | `UUID` | optional |
| `observedServingEpoch` | `Decimal` | optional |
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

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`.

**GraphQL**

```graphql
query ManagementGetOperation($context: RequestContextInput!, $input: GetOperationRequestInput!) {
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
      }
      blockedReason
    }
  }
}
```
