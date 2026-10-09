# API operations

Every operation in the ConvoHop GraphQL API, with its authorization, idempotency, input, result and errors, and the SDK members that send it.

## Communication

Conversations, members, messages, receipts, realtime events and live sessions inside one project.

| Operation | Kind | Layer | Summary |
| --- | --- | --- | --- |
| [`communication.capabilities`](communication/capabilities.md) | query | both | Describe the features, limits and API model the authority supports. |
| [`communication.route`](communication/route.md) | query | both | Return the signed route: project incarnation, serving epoch and realtime endpoint. Call it before other communication operations and again after WRONG_REGION. |
| [`communication.currentSession`](communication/currentSession.md) | query | client | Return the calling user session. |
| [`communication.getPrincipal`](communication/getPrincipal.md) | query | server | Read a principal (an application user). |
| [`communication.getConversation`](communication/getConversation.md) | query | both | Read a conversation. |
| [`communication.members`](communication/members.md) | query | both | List the members of a conversation. |
| [`communication.messages`](communication/messages.md) | query | both | List the messages of a conversation, newest first. A backend key reads the full history, or the history visible to the member named by actAsPrincipalId. |
| [`communication.getMessage`](communication/getMessage.md) | query | both | Read one message. A backend key reads any message, or reads as the member named by actAsPrincipalId. |
| [`communication.events`](communication/events.md) | query | client | Replay committed conversation events after a cursor, in sequence order. |
| [`communication.receipts`](communication/receipts.md) | query | client | List the delivery and read receipts of a conversation. |
| [`communication.inbox`](communication/inbox.md) | query | both | List the conversations visible to the calling user. A backend key must name that user with actAsPrincipalId. |
| [`communication.search`](communication/search.md) | query | both | Search the messages visible to the calling user. A backend key searches as the member named by actAsPrincipalId, or within scope.conversationIds. |
| [`communication.resolveRequest`](communication/resolveRequest.md) | query | both | Look up the stored outcome of an earlier communication mutation by its requestId. |
| [`communication.getOperation`](communication/getOperation.md) | query | both | Read the state of a long-running communication operation. |
| [`communication.conversationMute`](communication/conversationMute.md) | query | both | Read whether a member has muted message push notifications for a conversation. A backend key must name the member with actAsPrincipalId. |
| [`communication.currentLiveSession`](communication/currentLiveSession.md) | query | both | Return the active live session of a conversation, if any. |
| [`communication.liveSession`](communication/liveSession.md) | query | both | Read a live session. |
| [`communication.liveSessions`](communication/liveSessions.md) | query | both | List the live sessions of a conversation. |
| [`communication.liveSessionParticipants`](communication/liveSessionParticipants.md) | query | both | List the participants of a live session. |
| [`communication.liveSessionAlerts`](communication/liveSessionAlerts.md) | query | client | List the live session alerts addressed to the calling user. |
| [`communication.liveSessionOperation`](communication/liveSessionOperation.md) | query | both | Read the state of a live session start or end operation. |
| [`communication.sessionRequestOutcome`](communication/sessionRequestOutcome.md) | query | server | Look up the outcome of an earlier issueSession or renewSession request, including the session it produced. |
| [`communication.createPrincipal`](communication/createPrincipal.md) | mutation | server | Create a principal for an application user. |
| [`communication.disablePrincipal`](communication/disablePrincipal.md) | mutation | server | Disable a principal. |
| [`communication.issueSession`](communication/issueSession.md) | mutation | server | Issue a short-lived user session token for a principal and device. |
| [`communication.renewSession`](communication/renewSession.md) | mutation | server | Renew a user session before it expires. |
| [`communication.revokeSession`](communication/revokeSession.md) | mutation | both | Revoke a user session. |
| [`communication.createConversation`](communication/createConversation.md) | mutation | server | Create a conversation with its initial members. |
| [`communication.updateConversation`](communication/updateConversation.md) | mutation | both | Update the title or properties of a conversation. |
| [`communication.addMember`](communication/addMember.md) | mutation | server | Add a member, or change the role of an active member. |
| [`communication.addMembers`](communication/addMembers.md) | mutation | server | Add several members in one request. |
| [`communication.removeMember`](communication/removeMember.md) | mutation | server | Remove a member from a conversation. |
| [`communication.historyGrant`](communication/historyGrant.md) | mutation | server | Expand the history a member can see to an earlier sequence. |
| [`communication.sendMessage`](communication/sendMessage.md) | mutation | both | Send a message. A backend key sends as its service principal, or as the member named by actAsPrincipalId. |
| [`communication.editMessage`](communication/editMessage.md) | mutation | both | Edit a message. |
| [`communication.deleteMessage`](communication/deleteMessage.md) | mutation | both | Delete a message. |
| [`communication.reportReceipt`](communication/reportReceipt.md) | mutation | client | Report delivery or read progress through a sequence. |
| [`communication.typing`](communication/typing.md) | mutation | client | Send an ephemeral typing signal. |
| [`communication.setBroadcastPermission`](communication/setBroadcastPermission.md) | mutation | server | Allow or deny a member to publish media in live sessions. |
| [`communication.setConversationMute`](communication/setConversationMute.md) | mutation | both | Mute or unmute message push notifications for a member of a conversation, optionally until a time. Calls still ring. A backend key must name the member with actAsPrincipalId. |
| [`communication.startLiveSession`](communication/startLiveSession.md) | mutation | client | Start a live session (a call) in a conversation. Readiness completes asynchronously. |
| [`communication.joinLiveSession`](communication/joinLiveSession.md) | mutation | client | Join a live session. |
| [`communication.alertLiveSession`](communication/alertLiveSession.md) | mutation | both | Alert (ring) conversation members about a live session. |
| [`communication.leaveLiveSession`](communication/leaveLiveSession.md) | mutation | client | Leave a live session. |
| [`communication.endLiveSession`](communication/endLiveSession.md) | mutation | both | End a live session for every participant. Completes asynchronously. |
| [`communication.liveSessionCredentials`](communication/liveSessionCredentials.md) | mutation | client | Obtain a media credential for one connection of the caller's participation. |
| [`communication.redeemCredential`](communication/redeemCredential.md) | mutation | server | Redeem a delivered credential with its delivery permit. |
| [`communication.acknowledgeCredential`](communication/acknowledgeCredential.md) | mutation | server | Acknowledge that a redeemed credential is stored, closing the delivery. |
| [`communication.conversationEvents`](communication/conversationEvents.md) | subscription | client | Subscribe to conversation events in sequence order, resuming after a cursor. |

## Management

Organizations, deployments, projects, backend keys and webhooks.

| Operation | Kind | Layer | Summary |
| --- | --- | --- | --- |
| [`management.capabilities`](management/capabilities.md) | query | server | Describe the management features and limits the authority supports. |
| [`management.organizations`](management/organizations.md) | query | server | List the organizations the caller can access. |
| [`management.getOrganization`](management/getOrganization.md) | query | server | Read an organization. |
| [`management.getDeployment`](management/getDeployment.md) | query | server | Read a deployment. |
| [`management.getProject`](management/getProject.md) | query | server | Read a project. |
| [`management.deploymentHealth`](management/deploymentHealth.md) | query | server | Read the health of a deployment. |
| [`management.deploymentUsage`](management/deploymentUsage.md) | query | server | Read the metered usage of a deployment, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days. |
| [`management.projectUsage`](management/projectUsage.md) | query | server | Read the metered usage of a project. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days. |
| [`management.organizationUsage`](management/organizationUsage.md) | query | server | Read the metered usage of an organization in any status, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days. |
| [`management.organizationBilling`](management/organizationBilling.md) | query | server | Read the billing state of an organization in any status: the plan whose limits apply, whether ConvoHop bills the organization and, when it does, its standing and subscription. |
| [`management.webhookEndpoints`](management/webhookEndpoints.md) | query | server | List the webhook endpoints of a project with their status, signing-secret rotation and delivery health. |
| [`management.webhookDeliveries`](management/webhookDeliveries.md) | query | server | List recent deliveries of a webhook endpoint. |
| [`management.resolveRequest`](management/resolveRequest.md) | query | server | Look up the stored outcome of an earlier management mutation by its requestId. |
| [`management.getOperation`](management/getOperation.md) | query | server | Read the state of a long-running management operation. |
| [`management.createOrganization`](management/createOrganization.md) | mutation | server | Create an organization. |
| [`management.createDeployment`](management/createDeployment.md) | mutation | server | Create a deployment in an organization. Completes asynchronously. |
| [`management.createProject`](management/createProject.md) | mutation | server | Create a project in a ready deployment. Completes asynchronously. |
| [`management.issueBackendKey`](management/issueBackendKey.md) | mutation | server | Issue a scoped backend key. The secret is delivered once through a credential delivery. |
| [`management.revokeBackendKey`](management/revokeBackendKey.md) | mutation | server | Revoke a backend key, optionally revoking the sessions it issued. |
| [`management.projectPolicy`](management/projectPolicy.md) | mutation | server | Change the policy of a project. |
| [`management.credentialPermit`](management/credentialPermit.md) | mutation | server | Issue a signed permit that authorizes redeeming one credential delivery. |
| [`management.pauseOperation`](management/pauseOperation.md) | mutation | server | Pause a long-running operation. |
| [`management.resumeOperation`](management/resumeOperation.md) | mutation | server | Resume a paused operation. |
| [`management.createBillingCheckoutSession`](management/createBillingCheckoutSession.md) | mutation | server | Create a hosted checkout link that subscribes an active organization to a self-service plan. The link grants access to whoever holds it; a retry with the same requestId returns the same link until it expires. |
| [`management.createBillingPortalSession`](management/createBillingPortalSession.md) | mutation | server | Create a hosted billing portal link where an organization manages its payment methods, invoices and subscription. The link grants access to whoever holds it; a retry with the same requestId returns the same link until it expires. |
| [`management.configureWebhook`](management/configureWebhook.md) | mutation | server | Create a webhook endpoint for project events. The signing secret is delivered once through a credential delivery. |
| [`management.updateWebhook`](management/updateWebhook.md) | mutation | server | Change the event types of a webhook endpoint, or enable or disable it. |
| [`management.rotateWebhookSecret`](management/rotateWebhookSecret.md) | mutation | server | Start rotating the signing secret of a webhook endpoint. The next secret is delivered once through a credential delivery. |
| [`management.disableWebhook`](management/disableWebhook.md) | mutation | server | Disable a webhook endpoint. |
| [`management.replayWebhookDeliveries`](management/replayWebhookDeliveries.md) | mutation | server | Redeliver one webhook delivery, or the deliveries of an endpoint in a time range, with their original event IDs. |
