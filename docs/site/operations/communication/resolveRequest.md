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
          billingCheckoutSession {
            orgId
            planId
            url
            expiresAt
          }
          billingPortalSession {
            orgId
            url
            expiresAt
          }
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
| [TypeScript](../../typescript/reference/operations.md) | [`ProjectServerClient.requests.resolve`](../../typescript/reference/server.md#projectserverclientrequestsresolve-property), [`ProjectServerClient.requests.retry`](../../typescript/reference/server.md#projectserverclientrequestsretry-property), [`RelayClient.requests.resolve`](../../typescript/reference/client.md#relayclientrequestsresolve-property), [`RelayClient.requests.retry`](../../typescript/reference/client.md#relayclientrequestsretry-property), [`RelayClient.recoverPending`](../../typescript/reference/client.md#relayclientrecoverpending-method), [`Outbox.send`](../../typescript/reference/client.md#outboxsend-method), [`Outbox.resend`](../../typescript/reference/client.md#outboxresend-method), [`Outbox.flush`](../../typescript/reference/client.md#outboxflush-method), [`ConversationStore.send`](../../typescript/reference/client.md#conversationstoresend-method), [`ConversationView.send`](../../typescript/reference/react.md#conversationviewsend-method) |
| [Python](../../python/reference/operations.md) | [`Relay.resolve_request`](../../python/reference/instantrelay.md#relayresolve_request-method), [`Relay.retry_request`](../../python/reference/instantrelay.md#relayretry_request-method), [`AsyncRelay.resolve_request`](../../python/reference/instantrelay.md#asyncrelayresolve_request-method), [`AsyncRelay.retry_request`](../../python/reference/instantrelay.md#asyncrelayretry_request-method) |
| [.NET](../../dotnet/reference/operations.md) | [`ServerRequests.ResolveAsync`](../../dotnet/reference/relay.md#serverrequestsresolveasync-method), [`ServerRequests.RetryAsync`](../../dotnet/reference/relay.md#serverrequestsretryasync-method), [`RelayTransport.RetryAsync`](../../dotnet/reference/relay.md#relaytransportretryasync-method), [`CommunicationApi.ResolveRequestAsync`](../../dotnet/reference/api.md#communicationapiresolverequestasync-method) |
| [Java and Kotlin](../../jvm/reference/operations.md) | [`Requests.resolve`](../../jvm/reference/server.md#requestsresolve-method), [`Requests.retry`](../../jvm/reference/server.md#requestsretry-method), [`CommunicationApi.resolveRequest`](../../jvm/reference/server.md#communicationapiresolverequest-method), [`CommunicationSuspendApi.resolveRequest`](../../jvm/reference/server-kotlin.md#communicationsuspendapiresolverequest-method) |
| [Go](../../go/reference/operations.md) | [`ProjectClient.ResolveRequest`](../../go/reference/relay.md#projectclientresolverequest-method), [`ProjectClient.Retry`](../../go/reference/relay.md#projectclientretry-method) |
| [Swift](../../swift/reference/operations.md) | [`RelayClient.resolveRequest`](../../swift/reference/relay.md#relayclientresolverequest-method), [`RelayClient.retryRequest`](../../swift/reference/relay.md#relayclientretryrequest-method), [`RelayClient.recoverPending`](../../swift/reference/relay.md#relayclientrecoverpending-method), [`RelayClient.watch`](../../swift/reference/relay.md#relayclientwatch-method), [`RelayClient.resyncAuthorizedHistory`](../../swift/reference/relay.md#relayclientresyncauthorizedhistory-method), [`RelayOutbox.start`](../../swift/reference/relay.md#relayoutboxstart-method), [`RelayOutbox.enqueue`](../../swift/reference/relay.md#relayoutboxenqueue-method), [`RelayOutbox.resume`](../../swift/reference/relay.md#relayoutboxresume-method), [`RelayOutbox.flush`](../../swift/reference/relay.md#relayoutboxflush-method), [`RelayOutbox.resend`](../../swift/reference/relay.md#relayoutboxresend-method), [`RelayConversationModel.start`](../../swift/reference/relay.md#relayconversationmodelstart-method), [`RelayConversationModel.resync`](../../swift/reference/relay.md#relayconversationmodelresync-method), [`RelayConversationModel.send`](../../swift/reference/relay.md#relayconversationmodelsend-method), [`LiveParticipationHandle.connect`](../../swift/reference/relay.md#liveparticipationhandleconnect-method), [`MediaConnection.reconnect`](../../swift/reference/relay.md#mediaconnectionreconnect-method) |
| [Android](../../android/reference/operations.md) | [`RelayClient.requests.resolve`](../../android/reference/android-core.md#relayclientrequestsresolve-method), [`RelayClient.requests.retry`](../../android/reference/android-core.md#relayclientrequestsretry-method), [`RelayClient.recoverPending`](../../android/reference/android-core.md#relayclientrecoverpending-method), [`Outbox.send`](../../android/reference/android-core.md#outboxsend-method), [`Outbox.sendAgain`](../../android/reference/android-core.md#outboxsendagain-method), [`Outbox.drain`](../../android/reference/android-core.md#outboxdrain-method), [`Timeline.send`](../../android/reference/android-core.md#timelinesend-method), [`LiveParticipationHandle.connect`](../../android/reference/android-core.md#liveparticipationhandleconnect-method) |
| [Flutter](../../flutter/reference/operations.md) | [`ClientRequests.resolve`](../../flutter/reference/instantrelay.md#clientrequestsresolve-method), [`ClientRequests.retry`](../../flutter/reference/instantrelay.md#clientrequestsretry-method), [`RelayClient.recoverPending`](../../flutter/reference/instantrelay.md#relayclientrecoverpending-method), [`RelayClient.watch`](../../flutter/reference/instantrelay.md#relayclientwatch-method), [`RelayClient.resyncAuthorizedHistory`](../../flutter/reference/instantrelay.md#relayclientresyncauthorizedhistory-method), [`RelayTransport.retry`](../../flutter/reference/instantrelay.md#relaytransportretry-method), [`RelayOutbox.initialize`](../../flutter/reference/instantrelay.md#relayoutboxinitialize-method), [`RelayOutbox.send`](../../flutter/reference/instantrelay.md#relayoutboxsend-method), [`RelayOutbox.flush`](../../flutter/reference/instantrelay.md#relayoutboxflush-method), [`RelayOutbox.resolve`](../../flutter/reference/instantrelay.md#relayoutboxresolve-method), [`RelayOutbox.resend`](../../flutter/reference/instantrelay.md#relayoutboxresend-method), [`ConversationStore.send`](../../flutter/reference/instantrelay.md#conversationstoresend-method), [`ConversationStore`](../../flutter/reference/instantrelay.md#conversationstore-constructor), [`ConversationStore.reconnect`](../../flutter/reference/instantrelay.md#conversationstorereconnect-method), [`ConversationStore.resync`](../../flutter/reference/instantrelay.md#conversationstoreresync-method), [`LiveParticipationHandle.connect`](../../flutter/reference/instantrelay.md#liveparticipationhandleconnect-method), [`LiveMediaConnection.reconnect`](../../flutter/reference/instantrelay.md#livemediaconnectionreconnect-method), [`CommunicationOperations.resolveRequest`](../../flutter/reference/instantrelay.md#communicationoperationsresolverequest-method) |
| [React Native](../../react-native/reference/operations.md) | [`RelayClient.requests.resolve`](../../react-native/reference/client.md#relayclientrequestsresolve-property), [`RelayClient.requests.retry`](../../react-native/reference/client.md#relayclientrequestsretry-property), [`RelayClient.recoverPending`](../../react-native/reference/client.md#relayclientrecoverpending-method), [`Outbox.send`](../../react-native/reference/client.md#outboxsend-method), [`Outbox.resend`](../../react-native/reference/client.md#outboxresend-method), [`Outbox.flush`](../../react-native/reference/client.md#outboxflush-method), [`ConversationStore.send`](../../react-native/reference/client.md#conversationstoresend-method), [`ConversationView.send`](../../react-native/reference/react.md#conversationviewsend-method) |
