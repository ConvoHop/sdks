# `communication.resolveRequest`

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

- Returned by the authority: `CREDENTIAL_EXPIRED`, `FEATURE_UNSUPPORTED`, `FORBIDDEN`, `GRAPHQL_INVALID_REQUEST`, `GRAPHQL_QUERY_LIMIT`, `GRAPHQL_RESPONSE_LIMIT`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`, `RESPONSE_TOO_LARGE`, `RETRY_EXHAUSTED`, `WRONG_REGION`.
- Returned by the authority or raised by SDKs: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `INCARNATION_MISMATCH`, `INVALID_REQUEST`, `UNAUTHENTICATED`.
- Raised by SDKs: `GRAPHQL_ERROR`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `TRANSPORT_UNKNOWN`.
- Transient, so repeating the request may succeed: `ADMISSION_LIMIT`, `AUTHORITY_UNAVAILABLE`, `HTTP_FAILURE`, `INVALID_RESPONSE`, `RATE_LIMITED`, `RETRY_EXHAUSTED`, `TRANSPORT_UNKNOWN`.
- Error sets: `request`, `http`, `communication`, `rateLimited`.

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
          conversationMute {
            conversationId
            principalId
            muted
            until
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

## SDK members

| Language | Members |
| --- | --- |
| [TypeScript](../../typescript/reference/operations.md) | [`ProjectServerClient.requests.resolve`](../../typescript/reference/server.md#projectserverclientrequestsresolve-property), [`ProjectServerClient.requests.retry`](../../typescript/reference/server.md#projectserverclientrequestsretry-property), [`ConvoHopClient.requests.resolve`](../../typescript/reference/client.md#convohopclientrequestsresolve-property), [`ConvoHopClient.requests.retry`](../../typescript/reference/client.md#convohopclientrequestsretry-property), [`ConvoHopClient.recoverPending`](../../typescript/reference/client.md#convohopclientrecoverpending-method), [`Outbox.send`](../../typescript/reference/client.md#outboxsend-method), [`Outbox.resend`](../../typescript/reference/client.md#outboxresend-method), [`Outbox.flush`](../../typescript/reference/client.md#outboxflush-method), [`ConversationStore.send`](../../typescript/reference/client.md#conversationstoresend-method), [`ConversationView.send`](../../typescript/reference/react.md#conversationviewsend-method) |
| [Python](../../python/reference/operations.md) | [`ConvoHop.resolve_request`](../../python/reference/convohop.md#convohopresolve_request-method), [`ConvoHop.retry_request`](../../python/reference/convohop.md#convohopretry_request-method), [`AsyncConvoHop.resolve_request`](../../python/reference/convohop.md#asyncconvohopresolve_request-method), [`AsyncConvoHop.retry_request`](../../python/reference/convohop.md#asyncconvohopretry_request-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ServerRequests.ResolveAsync`](../../dotnet/reference/convohop.md#serverrequestsresolveasync-method), [`ServerRequests.RetryAsync`](../../dotnet/reference/convohop.md#serverrequestsretryasync-method), [`ConvoHopTransport.RetryAsync`](../../dotnet/reference/convohop.md#convohoptransportretryasync-method), [`CommunicationApi.ResolveRequestAsync`](../../dotnet/reference/api.md#communicationapiresolverequestasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`Requests.resolve`](../../jvm/reference/server.md#requestsresolve-method), [`Requests.retry`](../../jvm/reference/server.md#requestsretry-method), [`CommunicationApi.resolveRequest`](../../jvm/reference/server.md#communicationapiresolverequest-method), [`CommunicationSuspendApi.resolveRequest`](../../jvm/reference/server-kotlin.md#communicationsuspendapiresolverequest-method) |
