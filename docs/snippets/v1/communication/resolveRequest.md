## `resolveRequest`

Look up the stored outcome of an earlier communication mutation by its requestId.

- **Operation:** `communication.resolveRequest`, a query sent as `CommunicationResolveRequest`.
- **Layer:** both (client and server SDKs).
- **Authorization** (any one of):
  - `userSession`, when `ownRequest`: The caller made the original request.
  - `backendKey`, when `ownRequest`: The caller made the original request.
- **Idempotency:** `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

**Context** (`context: RequestContextInput!`)

| Field | Type | Use |
| --- | --- | --- |
| `requestId` | `UUID!` | required |
| `projectId` | `UUID` | required |
| `incarnation` | `UUID` | required |
| `observedServingEpoch` | `Decimal` | required |
| `credentialDeliveryPermit` | `SignedProof` | forbidden |

**Input** (`input: ResolveRequestRequestInput!`)

| Field | Type |
| --- | --- |
| `requestId` | `UUID!` |

**Result** (`ResolveRequestReply!`)

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
| `result` | `RequestResolution` |

**Errors**

- Returned by the authority: `CREDENTIAL_EXPIRED`, `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`.

**GraphQL**

```graphql
query CommunicationResolveRequest($context: RequestContextInput!, $input: ResolveRequestRequestInput!) {
  resolveRequest(context: $context, input: $input) {
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
      state
      requestId
      checkedAt
      resultWithheld
      receipt {
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
          broadcastPermissionChanged {
            member {
              conversationId
              principalId
              role
              status
              membershipEpoch
              visibilityEpoch
              revision
              visibleFromSequence
              canStartBroadcast
            }
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
          conversation {
            conversationId
            revision
            title
            props
            latestSequence
            membership {
              conversationId
              principalId
              role
              status
              membershipEpoch
              visibilityEpoch
              revision
              visibleFromSequence
              canStartBroadcast
            }
          }
          conversationMemberBatch {
            items {
              conversationId
              principalId
              role
              status
              membershipEpoch
              visibilityEpoch
              revision
              visibleFromSequence
              canStartBroadcast
            }
          }
          credentialDeliveryReceipt {
            deliveryId
          }
          deliveryAck {
            deliveryId
            acknowledged
          }
          liveAlertBatch {
            liveSessionId
            created
            suppressed
          }
          liveCredentialIssuance {
            liveSessionId
            participationId
            generation
            leaseId
            grantOrdinal
            admissionExpiresAt
            leaseExpiresAt
          }
          liveSessionEndRequested {
            liveSessionId
            operationId
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
          liveSessionJoined {
            liveSessionId
            generation
            participation {
              participationId
              principalId
              membershipEpoch
              role
              state
              permissions {
                microphone
                camera
                subscribe
              }
              reservationExpiresAt
              nativeConnectionId
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
          liveSessionLeft {
            liveSessionId
            participationId
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
          liveSessionStarted {
            liveSessionId
            conversationId
            kind
            mediaProfile
            operationId
          }
          member {
            conversationId
            principalId
            role
            status
            membershipEpoch
            visibilityEpoch
            revision
            visibleFromSequence
            canStartBroadcast
          }
          message {
            messageId
            conversationId
            authorId
            sequence
            revision
            revisionSequence
            createdAt
            deleted
            text
            props
            editedAt
          }
          messageAck {
            messageId
            conversationId
            sequence
            revision
            status
            cursor {
              incarnation
              conversationId
              sequence
            }
          }
          organization {
            orgId
            name
            status
            revision
          }
          principal {
            principalId
            externalUserId
            status
            revision
          }
          readReceipt {
            principalId
            membershipEpoch
            visibilityEpoch
            deliveredThroughSequence
            readThroughSequence
            updatedAt
          }
          sessionBootstrap {
            session {
              sessionId
              principalId
              deviceId
              incarnation
              sessionRevision
              expiresAt
              status
            }
            tokenExpiresAt
            sessionToken
          }
          sessionRevocation {
            sessionId
            status
            mediaCutoff {
              state
              scope {
                kind
                principalId
                sessionId
                deviceId
                callId
              }
            }
          }
          signedProof
        }
      }
    }
  }
}
```
