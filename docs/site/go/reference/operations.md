# Go operation coverage

The Go SDK members that send each API operation. 65 of the 65 operations that Go packages can send have a method.

## Communication

Conversations, members, messages, receipts, realtime events and live sessions inside one project.

| Operation | Layer | Members |
| --- | --- | --- |
| [`communication.capabilities`](../../operations/communication/capabilities.md) | both | [`ProjectClient.Capabilities`](convohop.md#projectclientcapabilities-method) |
| [`communication.route`](../../operations/communication/route.md) | both | [`ProjectClient.Route`](convohop.md#projectclientroute-method), [`ProjectClient.Initialize`](convohop.md#projectclientinitialize-method) |
| [`communication.getPrincipal`](../../operations/communication/getPrincipal.md) | server | [`ProjectClient.GetPrincipal`](convohop.md#projectclientgetprincipal-method) |
| [`communication.getConversation`](../../operations/communication/getConversation.md) | both | [`ProjectClient.GetConversation`](convohop.md#projectclientgetconversation-method) |
| [`communication.members`](../../operations/communication/members.md) | both | [`ProjectClient.Members`](convohop.md#projectclientmembers-method), [`ProjectClient.MembersPages`](convohop.md#projectclientmemberspages-method) |
| [`communication.messages`](../../operations/communication/messages.md) | both | [`ProjectClient.Messages`](convohop.md#projectclientmessages-method), [`ProjectClient.MessagesPages`](convohop.md#projectclientmessagespages-method) |
| [`communication.getMessage`](../../operations/communication/getMessage.md) | both | [`ProjectClient.GetMessage`](convohop.md#projectclientgetmessage-method) |
| [`communication.inbox`](../../operations/communication/inbox.md) | both | [`ProjectClient.Inbox`](convohop.md#projectclientinbox-method), [`ProjectClient.InboxPages`](convohop.md#projectclientinboxpages-method) |
| [`communication.search`](../../operations/communication/search.md) | both | [`ProjectClient.Search`](convohop.md#projectclientsearch-method), [`ProjectClient.SearchPages`](convohop.md#projectclientsearchpages-method) |
| [`communication.resolveRequest`](../../operations/communication/resolveRequest.md) | both | [`ProjectClient.ResolveRequest`](convohop.md#projectclientresolverequest-method), [`ProjectClient.Retry`](convohop.md#projectclientretry-method) |
| [`communication.getOperation`](../../operations/communication/getOperation.md) | both | [`ProjectClient.GetOperation`](convohop.md#projectclientgetoperation-method) |
| [`communication.conversationMute`](../../operations/communication/conversationMute.md) | both | [`ProjectClient.ConversationMute`](convohop.md#projectclientconversationmute-method) |
| [`communication.currentLiveSession`](../../operations/communication/currentLiveSession.md) | both | [`ProjectClient.CurrentLiveSession`](convohop.md#projectclientcurrentlivesession-method) |
| [`communication.liveSession`](../../operations/communication/liveSession.md) | both | [`ProjectClient.LiveSession`](convohop.md#projectclientlivesession-method) |
| [`communication.liveSessions`](../../operations/communication/liveSessions.md) | both | [`ProjectClient.LiveSessions`](convohop.md#projectclientlivesessions-method), [`ProjectClient.LiveSessionsPages`](convohop.md#projectclientlivesessionspages-method) |
| [`communication.liveSessionParticipants`](../../operations/communication/liveSessionParticipants.md) | both | [`ProjectClient.LiveSessionParticipants`](convohop.md#projectclientlivesessionparticipants-method), [`ProjectClient.LiveSessionParticipantsPages`](convohop.md#projectclientlivesessionparticipantspages-method) |
| [`communication.liveSessionOperation`](../../operations/communication/liveSessionOperation.md) | both | [`ProjectClient.LiveSessionOperation`](convohop.md#projectclientlivesessionoperation-method) |
| [`communication.sessionRequestOutcome`](../../operations/communication/sessionRequestOutcome.md) | server | [`ProjectClient.SessionRequestOutcome`](convohop.md#projectclientsessionrequestoutcome-method) |
| [`communication.createPrincipal`](../../operations/communication/createPrincipal.md) | server | [`ProjectClient.CreatePrincipal`](convohop.md#projectclientcreateprincipal-method) |
| [`communication.disablePrincipal`](../../operations/communication/disablePrincipal.md) | server | [`ProjectClient.DisablePrincipal`](convohop.md#projectclientdisableprincipal-method) |
| [`communication.issueSession`](../../operations/communication/issueSession.md) | server | [`ProjectClient.IssueSession`](convohop.md#projectclientissuesession-method) |
| [`communication.renewSession`](../../operations/communication/renewSession.md) | server | [`ProjectClient.RenewSession`](convohop.md#projectclientrenewsession-method) |
| [`communication.revokeSession`](../../operations/communication/revokeSession.md) | both | [`ProjectClient.RevokeSession`](convohop.md#projectclientrevokesession-method) |
| [`communication.createConversation`](../../operations/communication/createConversation.md) | server | [`ProjectClient.CreateConversation`](convohop.md#projectclientcreateconversation-method) |
| [`communication.updateConversation`](../../operations/communication/updateConversation.md) | both | [`ProjectClient.UpdateConversation`](convohop.md#projectclientupdateconversation-method) |
| [`communication.addMember`](../../operations/communication/addMember.md) | server | [`ProjectClient.AddMember`](convohop.md#projectclientaddmember-method) |
| [`communication.addMembers`](../../operations/communication/addMembers.md) | server | [`ProjectClient.AddMembers`](convohop.md#projectclientaddmembers-method) |
| [`communication.removeMember`](../../operations/communication/removeMember.md) | server | [`ProjectClient.RemoveMember`](convohop.md#projectclientremovemember-method) |
| [`communication.historyGrant`](../../operations/communication/historyGrant.md) | server | [`ProjectClient.HistoryGrant`](convohop.md#projectclienthistorygrant-method) |
| [`communication.sendMessage`](../../operations/communication/sendMessage.md) | both | [`ProjectClient.SendMessage`](convohop.md#projectclientsendmessage-method) |
| [`communication.editMessage`](../../operations/communication/editMessage.md) | both | [`ProjectClient.EditMessage`](convohop.md#projectclienteditmessage-method) |
| [`communication.deleteMessage`](../../operations/communication/deleteMessage.md) | both | [`ProjectClient.DeleteMessage`](convohop.md#projectclientdeletemessage-method) |
| [`communication.setBroadcastPermission`](../../operations/communication/setBroadcastPermission.md) | server | [`ProjectClient.SetBroadcastPermission`](convohop.md#projectclientsetbroadcastpermission-method) |
| [`communication.setConversationMute`](../../operations/communication/setConversationMute.md) | both | [`ProjectClient.SetConversationMute`](convohop.md#projectclientsetconversationmute-method) |
| [`communication.alertLiveSession`](../../operations/communication/alertLiveSession.md) | both | [`ProjectClient.AlertLiveSession`](convohop.md#projectclientalertlivesession-method) |
| [`communication.endLiveSession`](../../operations/communication/endLiveSession.md) | both | [`ProjectClient.EndLiveSession`](convohop.md#projectclientendlivesession-method) |
| [`communication.redeemCredential`](../../operations/communication/redeemCredential.md) | server | [`ProjectClient.RedeemCredential`](convohop.md#projectclientredeemcredential-method) |
| [`communication.acknowledgeCredential`](../../operations/communication/acknowledgeCredential.md) | server | [`ProjectClient.AcknowledgeCredential`](convohop.md#projectclientacknowledgecredential-method) |

## Management

Organizations, deployments, projects, backend keys and webhooks.

| Operation | Layer | Members |
| --- | --- | --- |
| [`management.capabilities`](../../operations/management/capabilities.md) | server | [`ManagementClient.Capabilities`](convohop.md#managementclientcapabilities-method) |
| [`management.organizations`](../../operations/management/organizations.md) | server | [`ManagementClient.Organizations`](convohop.md#managementclientorganizations-method) |
| [`management.getOrganization`](../../operations/management/getOrganization.md) | server | [`ManagementClient.GetOrganization`](convohop.md#managementclientgetorganization-method) |
| [`management.getDeployment`](../../operations/management/getDeployment.md) | server | [`ManagementClient.GetDeployment`](convohop.md#managementclientgetdeployment-method) |
| [`management.getProject`](../../operations/management/getProject.md) | server | [`ManagementClient.GetProject`](convohop.md#managementclientgetproject-method) |
| [`management.deploymentHealth`](../../operations/management/deploymentHealth.md) | server | [`ManagementClient.DeploymentHealth`](convohop.md#managementclientdeploymenthealth-method) |
| [`management.deploymentUsage`](../../operations/management/deploymentUsage.md) | server | [`ManagementClient.DeploymentUsage`](convohop.md#managementclientdeploymentusage-method) |
| [`management.projectUsage`](../../operations/management/projectUsage.md) | server | [`ManagementClient.ProjectUsage`](convohop.md#managementclientprojectusage-method) |
| [`management.organizationUsage`](../../operations/management/organizationUsage.md) | server | [`ManagementClient.OrganizationUsage`](convohop.md#managementclientorganizationusage-method) |
| [`management.webhookEndpoints`](../../operations/management/webhookEndpoints.md) | server | [`ManagementClient.WebhookEndpoints`](convohop.md#managementclientwebhookendpoints-method) |
| [`management.webhookDeliveries`](../../operations/management/webhookDeliveries.md) | server | [`ManagementClient.WebhookDeliveries`](convohop.md#managementclientwebhookdeliveries-method) |
| [`management.resolveRequest`](../../operations/management/resolveRequest.md) | server | [`ManagementClient.ResolveRequest`](convohop.md#managementclientresolverequest-method), [`ManagementClient.Retry`](convohop.md#managementclientretry-method) |
| [`management.getOperation`](../../operations/management/getOperation.md) | server | [`ManagementClient.GetOperation`](convohop.md#managementclientgetoperation-method) |
| [`management.createOrganization`](../../operations/management/createOrganization.md) | server | [`ManagementClient.CreateOrganization`](convohop.md#managementclientcreateorganization-method) |
| [`management.createDeployment`](../../operations/management/createDeployment.md) | server | [`ManagementClient.CreateDeployment`](convohop.md#managementclientcreatedeployment-method) |
| [`management.createProject`](../../operations/management/createProject.md) | server | [`ManagementClient.CreateProject`](convohop.md#managementclientcreateproject-method) |
| [`management.issueBackendKey`](../../operations/management/issueBackendKey.md) | server | [`ManagementClient.IssueBackendKey`](convohop.md#managementclientissuebackendkey-method) |
| [`management.revokeBackendKey`](../../operations/management/revokeBackendKey.md) | server | [`ManagementClient.RevokeBackendKey`](convohop.md#managementclientrevokebackendkey-method) |
| [`management.projectPolicy`](../../operations/management/projectPolicy.md) | server | [`ManagementClient.ProjectPolicy`](convohop.md#managementclientprojectpolicy-method) |
| [`management.credentialPermit`](../../operations/management/credentialPermit.md) | server | [`ManagementClient.CredentialPermit`](convohop.md#managementclientcredentialpermit-method) |
| [`management.pauseOperation`](../../operations/management/pauseOperation.md) | server | [`ManagementClient.PauseOperation`](convohop.md#managementclientpauseoperation-method) |
| [`management.resumeOperation`](../../operations/management/resumeOperation.md) | server | [`ManagementClient.ResumeOperation`](convohop.md#managementclientresumeoperation-method) |
| [`management.configureWebhook`](../../operations/management/configureWebhook.md) | server | [`ManagementClient.ConfigureWebhook`](convohop.md#managementclientconfigurewebhook-method) |
| [`management.updateWebhook`](../../operations/management/updateWebhook.md) | server | [`ManagementClient.UpdateWebhook`](convohop.md#managementclientupdatewebhook-method) |
| [`management.rotateWebhookSecret`](../../operations/management/rotateWebhookSecret.md) | server | [`ManagementClient.RotateWebhookSecret`](convohop.md#managementclientrotatewebhooksecret-method) |
| [`management.disableWebhook`](../../operations/management/disableWebhook.md) | server | [`ManagementClient.DisableWebhook`](convohop.md#managementclientdisablewebhook-method) |
| [`management.replayWebhookDeliveries`](../../operations/management/replayWebhookDeliveries.md) | server | [`ManagementClient.ReplayWebhookDeliveries`](convohop.md#managementclientreplaywebhookdeliveries-method) |
