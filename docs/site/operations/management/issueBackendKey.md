# `management.issueBackendKey`

Issue a scoped backend key. The secret is delivered once through a credential delivery.

- **Operation:** `management.issueBackendKey`, a mutation sent as `ManagementIssueBackendKey`.
- **Layer:** server (server SDKs).
- **Authorization:** `portalCredential`, when `owner`: The caller owns the organization, deployment or project.
- **Idempotency:** `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
- **Long-running:** poll `management.getOperation` with `input.operationId` set to `issueBackendKey.operation.operationId` from the result until the work completes.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | forbidden |
| `incarnation` | `UUID` | optional |
| `observedServingEpoch` | `Decimal` | optional |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: IssueBackendKeyRequestInput!`)

| Field | Type |
| --- | --- |
| `projectId` | `UUID!` |
| `name` | `String!` |
| `scopes` | `[String!]!` |
| `expiresAt` | `String!` |

**Result** (`IssueBackendKeyReply!`)

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
| `result` | `OperationResult` |

**Errors**

- Returned by the authority: `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `OUTCOME_UNKNOWN`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RECOVERY_STORAGE_FAILURE`, `RESOLUTION_REQUIRED`, `TRANSPORT_UNKNOWN`.
- Transient, so a retry with the same `requestId` and input may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `OUTCOME_UNKNOWN`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `mutation`.

**GraphQL**

```graphql
mutation ManagementIssueBackendKey($context: RequestContextInput!, $input: IssueBackendKeyRequestInput!) {
  issueBackendKey(context: $context, input: $input) {
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
  }
}
```

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`ConvoHopManagementClient.issueBackendKey`](../../typescript/reference/server.md#convohopmanagementclientissuebackendkey-method) |
