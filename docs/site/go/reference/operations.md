# Go operation coverage

The Go SDK members that send each API operation. 65 of the 81 operations that Go packages can send have a method.

## Communication

Conversations, members, messages, receipts, realtime events and live sessions inside one project.

| Operation | Layer | Members |
| --- | --- | --- |
| [`communication.capabilities`](../../operations/communication/capabilities.md) | both | [`ProjectClient.Capabilities`](relay.md#projectclientcapabilities-method) |
| [`communication.route`](../../operations/communication/route.md) | both | [`ProjectClient.Route`](relay.md#projectclientroute-method), [`ProjectClient.Initialize`](relay.md#projectclientinitialize-method) |
| [`communication.getPrincipal`](../../operations/communication/getPrincipal.md) | server | [`ProjectClient.GetPrincipal`](relay.md#projectclientgetprincipal-method) |
| [`communication.getConversation`](../../operations/communication/getConversation.md) | both | [`ProjectClient.GetConversation`](relay.md#projectclientgetconversation-method) |
| [`communication.members`](../../operations/communication/members.md) | both | [`ProjectClient.Members`](relay.md#projectclientmembers-method), [`ProjectClient.MembersPages`](relay.md#projectclientmemberspages-method) |
| [`communication.messages`](../../operations/communication/messages.md) | both | [`ProjectClient.Messages`](relay.md#projectclientmessages-method), [`ProjectClient.MessagesPages`](relay.md#projectclientmessagespages-method) |
| [`communication.getMessage`](../../operations/communication/getMessage.md) | both | [`ProjectClient.GetMessage`](relay.md#projectclientgetmessage-method) |
| [`communication.inbox`](../../operations/communication/inbox.md) | both | [`ProjectClient.Inbox`](relay.md#projectclientinbox-method), [`ProjectClient.InboxPages`](relay.md#projectclientinboxpages-method) |
| [`communication.search`](../../operations/communication/search.md) | both | [`ProjectClient.Search`](relay.md#projectclientsearch-method), [`ProjectClient.SearchPages`](relay.md#projectclientsearchpages-method) |
| [`communication.resolveRequest`](../../operations/communication/resolveRequest.md) | both | [`ProjectClient.ResolveRequest`](relay.md#projectclientresolverequest-method), [`ProjectClient.Retry`](relay.md#projectclientretry-method) |
| [`communication.getOperation`](../../operations/communication/getOperation.md) | both | [`ProjectClient.GetOperation`](relay.md#projectclientgetoperation-method) |
| [`communication.conversationMute`](../../operations/communication/conversationMute.md) | both | [`ProjectClient.ConversationMute`](relay.md#projectclientconversationmute-method) |
| [`communication.currentLiveSession`](../../operations/communication/currentLiveSession.md) | both | [`ProjectClient.CurrentLiveSession`](relay.md#projectclientcurrentlivesession-method) |
| [`communication.liveSession`](../../operations/communication/liveSession.md) | both | [`ProjectClient.LiveSession`](relay.md#projectclientlivesession-method) |
| [`communication.liveSessions`](../../operations/communication/liveSessions.md) | both | [`ProjectClient.LiveSessions`](relay.md#projectclientlivesessions-method), [`ProjectClient.LiveSessionsPages`](relay.md#projectclientlivesessionspages-method) |
| [`communication.liveSessionParticipants`](../../operations/communication/liveSessionParticipants.md) | both | [`ProjectClient.LiveSessionParticipants`](relay.md#projectclientlivesessionparticipants-method), [`ProjectClient.LiveSessionParticipantsPages`](relay.md#projectclientlivesessionparticipantspages-method) |
| [`communication.liveSessionOperation`](../../operations/communication/liveSessionOperation.md) | both | [`ProjectClient.LiveSessionOperation`](relay.md#projectclientlivesessionoperation-method) |
| [`communication.sessionRequestOutcome`](../../operations/communication/sessionRequestOutcome.md) | server | [`ProjectClient.SessionRequestOutcome`](relay.md#projectclientsessionrequestoutcome-method) |
| [`communication.createPrincipal`](../../operations/communication/createPrincipal.md) | server | [`ProjectClient.CreatePrincipal`](relay.md#projectclientcreateprincipal-method) |
| [`communication.disablePrincipal`](../../operations/communication/disablePrincipal.md) | server | [`ProjectClient.DisablePrincipal`](relay.md#projectclientdisableprincipal-method) |
| [`communication.issueSession`](../../operations/communication/issueSession.md) | server | [`ProjectClient.IssueSession`](relay.md#projectclientissuesession-method) |
| [`communication.renewSession`](../../operations/communication/renewSession.md) | server | [`ProjectClient.RenewSession`](relay.md#projectclientrenewsession-method) |
| [`communication.revokeSession`](../../operations/communication/revokeSession.md) | both | [`ProjectClient.RevokeSession`](relay.md#projectclientrevokesession-method) |
| [`communication.createConversation`](../../operations/communication/createConversation.md) | server | [`ProjectClient.CreateConversation`](relay.md#projectclientcreateconversation-method) |
| [`communication.updateConversation`](../../operations/communication/updateConversation.md) | both | [`ProjectClient.UpdateConversation`](relay.md#projectclientupdateconversation-method) |
| [`communication.addMember`](../../operations/communication/addMember.md) | server | [`ProjectClient.AddMember`](relay.md#projectclientaddmember-method) |
| [`communication.addMembers`](../../operations/communication/addMembers.md) | server | [`ProjectClient.AddMembers`](relay.md#projectclientaddmembers-method) |
| [`communication.removeMember`](../../operations/communication/removeMember.md) | server | [`ProjectClient.RemoveMember`](relay.md#projectclientremovemember-method) |
| [`communication.historyGrant`](../../operations/communication/historyGrant.md) | server | [`ProjectClient.HistoryGrant`](relay.md#projectclienthistorygrant-method) |
| [`communication.sendMessage`](../../operations/communication/sendMessage.md) | both | [`ProjectClient.SendMessage`](relay.md#projectclientsendmessage-method) |
| [`communication.editMessage`](../../operations/communication/editMessage.md) | both | [`ProjectClient.EditMessage`](relay.md#projectclienteditmessage-method) |
| [`communication.deleteMessage`](../../operations/communication/deleteMessage.md) | both | [`ProjectClient.DeleteMessage`](relay.md#projectclientdeletemessage-method) |
| [`communication.setBroadcastPermission`](../../operations/communication/setBroadcastPermission.md) | server | [`ProjectClient.SetBroadcastPermission`](relay.md#projectclientsetbroadcastpermission-method) |
| [`communication.setConversationMute`](../../operations/communication/setConversationMute.md) | both | [`ProjectClient.SetConversationMute`](relay.md#projectclientsetconversationmute-method) |
| [`communication.alertLiveSession`](../../operations/communication/alertLiveSession.md) | both | [`ProjectClient.AlertLiveSession`](relay.md#projectclientalertlivesession-method) |
| [`communication.endLiveSession`](../../operations/communication/endLiveSession.md) | both | [`ProjectClient.EndLiveSession`](relay.md#projectclientendlivesession-method) |
| [`communication.redeemCredential`](../../operations/communication/redeemCredential.md) | server | [`ProjectClient.RedeemCredential`](relay.md#projectclientredeemcredential-method) |
| [`communication.acknowledgeCredential`](../../operations/communication/acknowledgeCredential.md) | server | [`ProjectClient.AcknowledgeCredential`](relay.md#projectclientacknowledgecredential-method) |

## Management

Organizations, deployments, projects, backend keys and webhooks.

| Operation | Layer | Members |
| --- | --- | --- |
| [`management.capabilities`](../../operations/management/capabilities.md) | server | [`ManagementClient.Capabilities`](relay.md#managementclientcapabilities-method) |
| [`management.organizations`](../../operations/management/organizations.md) | server | [`ManagementClient.Organizations`](relay.md#managementclientorganizations-method) |
| [`management.getOrganization`](../../operations/management/getOrganization.md) | server | [`ManagementClient.GetOrganization`](relay.md#managementclientgetorganization-method) |
| [`management.getDeployment`](../../operations/management/getDeployment.md) | server | [`ManagementClient.GetDeployment`](relay.md#managementclientgetdeployment-method) |
| [`management.getProject`](../../operations/management/getProject.md) | server | [`ManagementClient.GetProject`](relay.md#managementclientgetproject-method) |
| [`management.deploymentHealth`](../../operations/management/deploymentHealth.md) | server | [`ManagementClient.DeploymentHealth`](relay.md#managementclientdeploymenthealth-method) |
| [`management.deploymentUsage`](../../operations/management/deploymentUsage.md) | server | [`ManagementClient.DeploymentUsage`](relay.md#managementclientdeploymentusage-method) |
| [`management.projectUsage`](../../operations/management/projectUsage.md) | server | [`ManagementClient.ProjectUsage`](relay.md#managementclientprojectusage-method) |
| [`management.organizationUsage`](../../operations/management/organizationUsage.md) | server | [`ManagementClient.OrganizationUsage`](relay.md#managementclientorganizationusage-method) |
| [`management.organizationBilling`](../../operations/management/organizationBilling.md) | server | Not wrapped by a method |
| [`management.webhookEndpoints`](../../operations/management/webhookEndpoints.md) | server | [`ManagementClient.WebhookEndpoints`](relay.md#managementclientwebhookendpoints-method) |
| [`management.webhookDeliveries`](../../operations/management/webhookDeliveries.md) | server | [`ManagementClient.WebhookDeliveries`](relay.md#managementclientwebhookdeliveries-method) |
| [`management.resolveRequest`](../../operations/management/resolveRequest.md) | server | [`ManagementClient.ResolveRequest`](relay.md#managementclientresolverequest-method), [`ManagementClient.Retry`](relay.md#managementclientretry-method) |
| [`management.getOperation`](../../operations/management/getOperation.md) | server | [`ManagementClient.GetOperation`](relay.md#managementclientgetoperation-method) |
| [`management.agentSignupForApproval`](../../operations/management/agentSignupForApproval.md) | server | Not wrapped by a method |
| [`management.agentSignup`](../../operations/management/agentSignup.md) | server | Not wrapped by a method |
| [`management.agentGrants`](../../operations/management/agentGrants.md) | server | Not wrapped by a method |
| [`management.agentAuditEvents`](../../operations/management/agentAuditEvents.md) | server | Not wrapped by a method |
| [`management.organizationSpend`](../../operations/management/organizationSpend.md) | server | Not wrapped by a method |
| [`management.createOrganization`](../../operations/management/createOrganization.md) | server | [`ManagementClient.CreateOrganization`](relay.md#managementclientcreateorganization-method) |
| [`management.createDeployment`](../../operations/management/createDeployment.md) | server | [`ManagementClient.CreateDeployment`](relay.md#managementclientcreatedeployment-method) |
| [`management.createProject`](../../operations/management/createProject.md) | server | [`ManagementClient.CreateProject`](relay.md#managementclientcreateproject-method) |
| [`management.issueBackendKey`](../../operations/management/issueBackendKey.md) | server | [`ManagementClient.IssueBackendKey`](relay.md#managementclientissuebackendkey-method) |
| [`management.revokeBackendKey`](../../operations/management/revokeBackendKey.md) | server | [`ManagementClient.RevokeBackendKey`](relay.md#managementclientrevokebackendkey-method) |
| [`management.projectPolicy`](../../operations/management/projectPolicy.md) | server | [`ManagementClient.ProjectPolicy`](relay.md#managementclientprojectpolicy-method) |
| [`management.credentialPermit`](../../operations/management/credentialPermit.md) | server | [`ManagementClient.CredentialPermit`](relay.md#managementclientcredentialpermit-method) |
| [`management.pauseOperation`](../../operations/management/pauseOperation.md) | server | [`ManagementClient.PauseOperation`](relay.md#managementclientpauseoperation-method) |
| [`management.resumeOperation`](../../operations/management/resumeOperation.md) | server | [`ManagementClient.ResumeOperation`](relay.md#managementclientresumeoperation-method) |
| [`management.createBillingCheckoutSession`](../../operations/management/createBillingCheckoutSession.md) | server | Not wrapped by a method |
| [`management.createBillingPortalSession`](../../operations/management/createBillingPortalSession.md) | server | Not wrapped by a method |
| [`management.configureWebhook`](../../operations/management/configureWebhook.md) | server | [`ManagementClient.ConfigureWebhook`](relay.md#managementclientconfigurewebhook-method) |
| [`management.updateWebhook`](../../operations/management/updateWebhook.md) | server | [`ManagementClient.UpdateWebhook`](relay.md#managementclientupdatewebhook-method) |
| [`management.rotateWebhookSecret`](../../operations/management/rotateWebhookSecret.md) | server | [`ManagementClient.RotateWebhookSecret`](relay.md#managementclientrotatewebhooksecret-method) |
| [`management.disableWebhook`](../../operations/management/disableWebhook.md) | server | [`ManagementClient.DisableWebhook`](relay.md#managementclientdisablewebhook-method) |
| [`management.replayWebhookDeliveries`](../../operations/management/replayWebhookDeliveries.md) | server | [`ManagementClient.ReplayWebhookDeliveries`](relay.md#managementclientreplaywebhookdeliveries-method) |
| [`management.requestAgentSignup`](../../operations/management/requestAgentSignup.md) | server | Not wrapped by a method |
| [`management.rejectAgentSignup`](../../operations/management/rejectAgentSignup.md) | server | Not wrapped by a method |
| [`management.approveAgentSignup`](../../operations/management/approveAgentSignup.md) | server | Not wrapped by a method |
| [`management.issueAgentKey`](../../operations/management/issueAgentKey.md) | server | Not wrapped by a method |
| [`management.agentCredentialPermit`](../../operations/management/agentCredentialPermit.md) | server | Not wrapped by a method |
| [`management.revokeAgentGrant`](../../operations/management/revokeAgentGrant.md) | server | Not wrapped by a method |
| [`management.setSpendControls`](../../operations/management/setSpendControls.md) | server | Not wrapped by a method |
| [`management.purchaseAgentCredits`](../../operations/management/purchaseAgentCredits.md) | server | Not wrapped by a method |
