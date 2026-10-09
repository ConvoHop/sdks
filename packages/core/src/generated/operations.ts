// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
import type * as Generated from "./graphql-types.js";
export interface OperationTypes {
  "communication.capabilities": { variables: Generated.CommunicationCapabilitiesQueryVariables; result: Generated.CommunicationCapabilitiesQuery };
  "communication.route": { variables: Generated.CommunicationRouteQueryVariables; result: Generated.CommunicationRouteQuery };
  "communication.currentSession": { variables: Generated.CommunicationCurrentSessionQueryVariables; result: Generated.CommunicationCurrentSessionQuery };
  "communication.getPrincipal": { variables: Generated.CommunicationGetPrincipalQueryVariables; result: Generated.CommunicationGetPrincipalQuery };
  "communication.getConversation": { variables: Generated.CommunicationGetConversationQueryVariables; result: Generated.CommunicationGetConversationQuery };
  "communication.members": { variables: Generated.CommunicationMembersQueryVariables; result: Generated.CommunicationMembersQuery };
  "communication.messages": { variables: Generated.CommunicationMessagesQueryVariables; result: Generated.CommunicationMessagesQuery };
  "communication.getMessage": { variables: Generated.CommunicationGetMessageQueryVariables; result: Generated.CommunicationGetMessageQuery };
  "communication.events": { variables: Generated.CommunicationEventsQueryVariables; result: Generated.CommunicationEventsQuery };
  "communication.receipts": { variables: Generated.CommunicationReceiptsQueryVariables; result: Generated.CommunicationReceiptsQuery };
  "communication.inbox": { variables: Generated.CommunicationInboxQueryVariables; result: Generated.CommunicationInboxQuery };
  "communication.search": { variables: Generated.CommunicationSearchQueryVariables; result: Generated.CommunicationSearchQuery };
  "communication.resolveRequest": { variables: Generated.CommunicationResolveRequestQueryVariables; result: Generated.CommunicationResolveRequestQuery };
  "communication.getOperation": { variables: Generated.CommunicationGetOperationQueryVariables; result: Generated.CommunicationGetOperationQuery };
  "communication.conversationMute": { variables: Generated.CommunicationConversationMuteQueryVariables; result: Generated.CommunicationConversationMuteQuery };
  "communication.currentLiveSession": { variables: Generated.CommunicationCurrentLiveSessionQueryVariables; result: Generated.CommunicationCurrentLiveSessionQuery };
  "communication.liveSession": { variables: Generated.CommunicationLiveSessionQueryVariables; result: Generated.CommunicationLiveSessionQuery };
  "communication.liveSessions": { variables: Generated.CommunicationLiveSessionsQueryVariables; result: Generated.CommunicationLiveSessionsQuery };
  "communication.liveSessionParticipants": { variables: Generated.CommunicationLiveSessionParticipantsQueryVariables; result: Generated.CommunicationLiveSessionParticipantsQuery };
  "communication.liveSessionAlerts": { variables: Generated.CommunicationLiveSessionAlertsQueryVariables; result: Generated.CommunicationLiveSessionAlertsQuery };
  "communication.liveSessionOperation": { variables: Generated.CommunicationLiveSessionOperationQueryVariables; result: Generated.CommunicationLiveSessionOperationQuery };
  "communication.sessionRequestOutcome": { variables: Generated.CommunicationSessionRequestOutcomeQueryVariables; result: Generated.CommunicationSessionRequestOutcomeQuery };
  "communication.createPrincipal": { variables: Generated.CommunicationCreatePrincipalMutationVariables; result: Generated.CommunicationCreatePrincipalMutation };
  "communication.disablePrincipal": { variables: Generated.CommunicationDisablePrincipalMutationVariables; result: Generated.CommunicationDisablePrincipalMutation };
  "communication.issueSession": { variables: Generated.CommunicationIssueSessionMutationVariables; result: Generated.CommunicationIssueSessionMutation };
  "communication.renewSession": { variables: Generated.CommunicationRenewSessionMutationVariables; result: Generated.CommunicationRenewSessionMutation };
  "communication.revokeSession": { variables: Generated.CommunicationRevokeSessionMutationVariables; result: Generated.CommunicationRevokeSessionMutation };
  "communication.createConversation": { variables: Generated.CommunicationCreateConversationMutationVariables; result: Generated.CommunicationCreateConversationMutation };
  "communication.updateConversation": { variables: Generated.CommunicationUpdateConversationMutationVariables; result: Generated.CommunicationUpdateConversationMutation };
  "communication.addMember": { variables: Generated.CommunicationAddMemberMutationVariables; result: Generated.CommunicationAddMemberMutation };
  "communication.addMembers": { variables: Generated.CommunicationAddMembersMutationVariables; result: Generated.CommunicationAddMembersMutation };
  "communication.removeMember": { variables: Generated.CommunicationRemoveMemberMutationVariables; result: Generated.CommunicationRemoveMemberMutation };
  "communication.historyGrant": { variables: Generated.CommunicationHistoryGrantMutationVariables; result: Generated.CommunicationHistoryGrantMutation };
  "communication.sendMessage": { variables: Generated.CommunicationSendMessageMutationVariables; result: Generated.CommunicationSendMessageMutation };
  "communication.editMessage": { variables: Generated.CommunicationEditMessageMutationVariables; result: Generated.CommunicationEditMessageMutation };
  "communication.deleteMessage": { variables: Generated.CommunicationDeleteMessageMutationVariables; result: Generated.CommunicationDeleteMessageMutation };
  "communication.reportReceipt": { variables: Generated.CommunicationReportReceiptMutationVariables; result: Generated.CommunicationReportReceiptMutation };
  "communication.typing": { variables: Generated.CommunicationTypingMutationVariables; result: Generated.CommunicationTypingMutation };
  "communication.setBroadcastPermission": { variables: Generated.CommunicationSetBroadcastPermissionMutationVariables; result: Generated.CommunicationSetBroadcastPermissionMutation };
  "communication.setConversationMute": { variables: Generated.CommunicationSetConversationMuteMutationVariables; result: Generated.CommunicationSetConversationMuteMutation };
  "communication.startLiveSession": { variables: Generated.CommunicationStartLiveSessionMutationVariables; result: Generated.CommunicationStartLiveSessionMutation };
  "communication.joinLiveSession": { variables: Generated.CommunicationJoinLiveSessionMutationVariables; result: Generated.CommunicationJoinLiveSessionMutation };
  "communication.alertLiveSession": { variables: Generated.CommunicationAlertLiveSessionMutationVariables; result: Generated.CommunicationAlertLiveSessionMutation };
  "communication.leaveLiveSession": { variables: Generated.CommunicationLeaveLiveSessionMutationVariables; result: Generated.CommunicationLeaveLiveSessionMutation };
  "communication.endLiveSession": { variables: Generated.CommunicationEndLiveSessionMutationVariables; result: Generated.CommunicationEndLiveSessionMutation };
  "communication.liveSessionCredentials": { variables: Generated.CommunicationLiveSessionCredentialsMutationVariables; result: Generated.CommunicationLiveSessionCredentialsMutation };
  "communication.redeemCredential": { variables: Generated.CommunicationRedeemCredentialMutationVariables; result: Generated.CommunicationRedeemCredentialMutation };
  "communication.acknowledgeCredential": { variables: Generated.CommunicationAcknowledgeCredentialMutationVariables; result: Generated.CommunicationAcknowledgeCredentialMutation };
  "communication.conversationEvents": { variables: Generated.CommunicationConversationEventsSubscriptionVariables; result: Generated.CommunicationConversationEventsSubscription };
  "management.capabilities": { variables: Generated.ManagementCapabilitiesQueryVariables; result: Generated.ManagementCapabilitiesQuery };
  "management.organizations": { variables: Generated.ManagementOrganizationsQueryVariables; result: Generated.ManagementOrganizationsQuery };
  "management.getOrganization": { variables: Generated.ManagementGetOrganizationQueryVariables; result: Generated.ManagementGetOrganizationQuery };
  "management.getDeployment": { variables: Generated.ManagementGetDeploymentQueryVariables; result: Generated.ManagementGetDeploymentQuery };
  "management.getProject": { variables: Generated.ManagementGetProjectQueryVariables; result: Generated.ManagementGetProjectQuery };
  "management.deploymentHealth": { variables: Generated.ManagementDeploymentHealthQueryVariables; result: Generated.ManagementDeploymentHealthQuery };
  "management.deploymentUsage": { variables: Generated.ManagementDeploymentUsageQueryVariables; result: Generated.ManagementDeploymentUsageQuery };
  "management.projectUsage": { variables: Generated.ManagementProjectUsageQueryVariables; result: Generated.ManagementProjectUsageQuery };
  "management.organizationUsage": { variables: Generated.ManagementOrganizationUsageQueryVariables; result: Generated.ManagementOrganizationUsageQuery };
  "management.organizationBilling": { variables: Generated.ManagementOrganizationBillingQueryVariables; result: Generated.ManagementOrganizationBillingQuery };
  "management.webhookEndpoints": { variables: Generated.ManagementWebhookEndpointsQueryVariables; result: Generated.ManagementWebhookEndpointsQuery };
  "management.webhookDeliveries": { variables: Generated.ManagementWebhookDeliveriesQueryVariables; result: Generated.ManagementWebhookDeliveriesQuery };
  "management.resolveRequest": { variables: Generated.ManagementResolveRequestQueryVariables; result: Generated.ManagementResolveRequestQuery };
  "management.getOperation": { variables: Generated.ManagementGetOperationQueryVariables; result: Generated.ManagementGetOperationQuery };
  "management.agentSignupForApproval": { variables: Generated.ManagementAgentSignupForApprovalQueryVariables; result: Generated.ManagementAgentSignupForApprovalQuery };
  "management.agentSignup": { variables: Generated.ManagementAgentSignupQueryVariables; result: Generated.ManagementAgentSignupQuery };
  "management.agentGrants": { variables: Generated.ManagementAgentGrantsQueryVariables; result: Generated.ManagementAgentGrantsQuery };
  "management.agentAuditEvents": { variables: Generated.ManagementAgentAuditEventsQueryVariables; result: Generated.ManagementAgentAuditEventsQuery };
  "management.organizationSpend": { variables: Generated.ManagementOrganizationSpendQueryVariables; result: Generated.ManagementOrganizationSpendQuery };
  "management.createOrganization": { variables: Generated.ManagementCreateOrganizationMutationVariables; result: Generated.ManagementCreateOrganizationMutation };
  "management.createDeployment": { variables: Generated.ManagementCreateDeploymentMutationVariables; result: Generated.ManagementCreateDeploymentMutation };
  "management.createProject": { variables: Generated.ManagementCreateProjectMutationVariables; result: Generated.ManagementCreateProjectMutation };
  "management.issueBackendKey": { variables: Generated.ManagementIssueBackendKeyMutationVariables; result: Generated.ManagementIssueBackendKeyMutation };
  "management.revokeBackendKey": { variables: Generated.ManagementRevokeBackendKeyMutationVariables; result: Generated.ManagementRevokeBackendKeyMutation };
  "management.projectPolicy": { variables: Generated.ManagementProjectPolicyMutationVariables; result: Generated.ManagementProjectPolicyMutation };
  "management.credentialPermit": { variables: Generated.ManagementCredentialPermitMutationVariables; result: Generated.ManagementCredentialPermitMutation };
  "management.pauseOperation": { variables: Generated.ManagementPauseOperationMutationVariables; result: Generated.ManagementPauseOperationMutation };
  "management.resumeOperation": { variables: Generated.ManagementResumeOperationMutationVariables; result: Generated.ManagementResumeOperationMutation };
  "management.createBillingCheckoutSession": { variables: Generated.ManagementCreateBillingCheckoutSessionMutationVariables; result: Generated.ManagementCreateBillingCheckoutSessionMutation };
  "management.createBillingPortalSession": { variables: Generated.ManagementCreateBillingPortalSessionMutationVariables; result: Generated.ManagementCreateBillingPortalSessionMutation };
  "management.configureWebhook": { variables: Generated.ManagementConfigureWebhookMutationVariables; result: Generated.ManagementConfigureWebhookMutation };
  "management.updateWebhook": { variables: Generated.ManagementUpdateWebhookMutationVariables; result: Generated.ManagementUpdateWebhookMutation };
  "management.rotateWebhookSecret": { variables: Generated.ManagementRotateWebhookSecretMutationVariables; result: Generated.ManagementRotateWebhookSecretMutation };
  "management.disableWebhook": { variables: Generated.ManagementDisableWebhookMutationVariables; result: Generated.ManagementDisableWebhookMutation };
  "management.replayWebhookDeliveries": { variables: Generated.ManagementReplayWebhookDeliveriesMutationVariables; result: Generated.ManagementReplayWebhookDeliveriesMutation };
  "management.requestAgentSignup": { variables: Generated.ManagementRequestAgentSignupMutationVariables; result: Generated.ManagementRequestAgentSignupMutation };
  "management.rejectAgentSignup": { variables: Generated.ManagementRejectAgentSignupMutationVariables; result: Generated.ManagementRejectAgentSignupMutation };
  "management.approveAgentSignup": { variables: Generated.ManagementApproveAgentSignupMutationVariables; result: Generated.ManagementApproveAgentSignupMutation };
  "management.issueAgentKey": { variables: Generated.ManagementIssueAgentKeyMutationVariables; result: Generated.ManagementIssueAgentKeyMutation };
  "management.agentCredentialPermit": { variables: Generated.ManagementAgentCredentialPermitMutationVariables; result: Generated.ManagementAgentCredentialPermitMutation };
  "management.revokeAgentGrant": { variables: Generated.ManagementRevokeAgentGrantMutationVariables; result: Generated.ManagementRevokeAgentGrantMutation };
  "management.setSpendControls": { variables: Generated.ManagementSetSpendControlsMutationVariables; result: Generated.ManagementSetSpendControlsMutation };
  "management.purchaseAgentCredits": { variables: Generated.ManagementPurchaseAgentCreditsMutationVariables; result: Generated.ManagementPurchaseAgentCreditsMutation };
}
export type OperationKey = keyof OperationTypes;
export interface OperationCatalogEntry { plane: string; kind: string; idempotency: string; field: string; operationName: string; query: string; resultType: string; inputFields: readonly string[] }
export type OutputShape = { kind: "scalar" } | { kind: "enum"; values: readonly string[] } | { kind: "object"; fields: Readonly<Record<string, string>> };
export const outputShapes: Readonly<Record<string, OutputShape>> = {
  "AcknowledgeCredentialReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "DeliveryAck"
    }
  },
  "String": {
    "kind": "scalar"
  },
  "Boolean": {
    "kind": "scalar"
  },
  "ActorRef": {
    "kind": "object",
    "fields": {
      "tenantId": "String!",
      "objectId": "String!"
    }
  },
  "AddMemberReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "Member"
    }
  },
  "AddMembersPayload": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "receiptId": "UUID!",
      "committedAt": "String!",
      "replayed": "Boolean!",
      "result": "ConversationMemberBatch!"
    }
  },
  "AgentAuditEvent": {
    "kind": "object",
    "fields": {
      "eventId": "UUID!",
      "orgId": "UUID!",
      "grantId": "UUID",
      "actorKind": "String!",
      "actorId": "UUID",
      "kind": "String!",
      "details": "Properties",
      "occurredAt": "String!"
    }
  },
  "AgentAuditEventPage": {
    "kind": "object",
    "fields": {
      "items": "[AgentAuditEvent!]!",
      "complete": "Boolean!",
      "refreshRequired": "Boolean!",
      "nextCursor": "String"
    }
  },
  "AgentGrant": {
    "kind": "object",
    "fields": {
      "grantId": "UUID!",
      "orgId": "UUID!",
      "signupId": "UUID!",
      "agentActorId": "UUID!",
      "projectId": "UUID",
      "scopes": "[String!]!",
      "expiresAt": "String!",
      "revokedAt": "String",
      "createdAt": "String!",
      "keys": "[AgentKey!]!"
    }
  },
  "AgentGrantPage": {
    "kind": "object",
    "fields": {
      "items": "[AgentGrant!]!",
      "complete": "Boolean!",
      "refreshRequired": "Boolean!",
      "nextCursor": "String"
    }
  },
  "AgentKey": {
    "kind": "object",
    "fields": {
      "operationId": "UUID!",
      "state": "String!",
      "scopes": "[String!]!",
      "expiresAt": "String!",
      "keyId": "String",
      "deliveryId": "UUID",
      "deliveryExpiresAt": "String"
    }
  },
  "AgentPayment": {
    "kind": "object",
    "fields": {
      "paymentId": "UUID!",
      "amount": "String!",
      "currency": "String!",
      "state": "String!"
    }
  },
  "AgentSignupReview": {
    "kind": "object",
    "fields": {
      "signupId": "UUID!",
      "ownerEmail": "String!",
      "organizationName": "String!",
      "agentName": "String!",
      "purpose": "String",
      "suggestedPlan": "String",
      "suggestedScopes": "[String!]!",
      "suggestedMonthlySpendCap": "String",
      "currency": "String!",
      "expiresAt": "String!"
    }
  },
  "AgentSignupStatus": {
    "kind": "object",
    "fields": {
      "signupId": "UUID!",
      "state": "String!",
      "orgId": "UUID",
      "deploymentId": "UUID",
      "projectId": "UUID",
      "nextStep": "String",
      "scopes": "[String!]!",
      "grantExpiresAt": "String",
      "keys": "[AgentKey!]!",
      "incarnation": "UUID",
      "servingEpoch": "Decimal"
    }
  },
  "AgentSignupTicket": {
    "kind": "object",
    "fields": {
      "signupId": "UUID!",
      "confirmationCode": "String!",
      "expiresAt": "String!",
      "pollAfterSeconds": "Int!"
    }
  },
  "Int": {
    "kind": "scalar"
  },
  "AlertLiveSessionPayload": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "receiptId": "UUID!",
      "committedAt": "String!",
      "replayed": "Boolean!",
      "result": "LiveAlertBatch!"
    }
  },
  "BillingCheckoutSession": {
    "kind": "object",
    "fields": {
      "orgId": "UUID!",
      "planId": "String!",
      "url": "String!",
      "expiresAt": "String!"
    }
  },
  "BillingPortalSession": {
    "kind": "object",
    "fields": {
      "orgId": "UUID!",
      "url": "String!",
      "expiresAt": "String"
    }
  },
  "BroadcastPermissionChanged": {
    "kind": "object",
    "fields": {
      "member": "Member!",
      "mediaCutoff": "LiveMediaCutoff"
    }
  },
  "Capabilities": {
    "kind": "object",
    "fields": {
      "serverRelease": "String!",
      "capabilityRevision": "Decimal!",
      "limitsRevision": "Decimal!",
      "features": "Features",
      "limits": "[LimitEntry!]!",
      "environment": "String!",
      "productionQualified": "Boolean!",
      "mediaPolicy": "MediaPolicy",
      "geoControlAuthorityId": "String",
      "offerings": "[String!]!",
      "geos": "[String!]!",
      "installationProfiles": "[String!]!",
      "portalIdentity": "String"
    }
  },
  "CapabilitiesReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "Capabilities"
    }
  },
  "Conversation": {
    "kind": "object",
    "fields": {
      "conversationId": "UUID!",
      "revision": "Decimal!",
      "title": "String!",
      "props": "Properties",
      "latestSequence": "Decimal!",
      "membership": "Member"
    }
  },
  "ConversationMemberBatch": {
    "kind": "object",
    "fields": {
      "items": "[Member!]!"
    }
  },
  "ConversationMute": {
    "kind": "object",
    "fields": {
      "conversationId": "UUID!",
      "principalId": "UUID!",
      "muted": "Boolean!",
      "until": "String"
    }
  },
  "ConversationMuteReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String!",
      "result": "ConversationMute!"
    }
  },
  "CreateConversationReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "Conversation"
    }
  },
  "CreatePrincipalReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "Principal"
    }
  },
  "CredentialCapsule": {
    "kind": "object",
    "fields": {
      "kind": "String!",
      "keyId": "String",
      "backendPrincipalId": "String",
      "backendKey": "String",
      "expiresAt": "String",
      "endpointId": "UUID",
      "secretVersion": "String",
      "secret": "String"
    }
  },
  "CredentialDelivery": {
    "kind": "object",
    "fields": {
      "deliveryId": "UUID!",
      "kind": "String!",
      "projectId": "UUID!",
      "installationId": "String!",
      "resourceRef": "ResourceRef",
      "expiresAt": "String!",
      "payloadDigest": "String!",
      "recipientActorRef": "ActorRef"
    }
  },
  "CredentialDeliveryReceipt": {
    "kind": "object",
    "fields": {
      "deliveryId": "UUID!"
    }
  },
  "CreditsExhaustedProblem": {
    "kind": "object",
    "fields": {
      "code": "String!",
      "status": "Int!",
      "requestId": "UUID!",
      "outcome": "String!",
      "retryable": "Boolean!",
      "meter": "String!",
      "periodEnd": "String!"
    }
  },
  "CurrentLiveSessionReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String!",
      "result": "LiveSession"
    }
  },
  "CurrentSessionReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String!",
      "result": "Session!"
    }
  },
  "Cursor": {
    "kind": "object",
    "fields": {
      "incarnation": "UUID!",
      "conversationId": "UUID!",
      "sequence": "Decimal!"
    }
  },
  "CutoffScope": {
    "kind": "object",
    "fields": {
      "kind": "String!",
      "principalId": "UUID",
      "sessionId": "UUID",
      "deviceId": "UUID",
      "callId": "UUID"
    }
  },
  "Decimal": {
    "kind": "scalar"
  },
  "DeleteMessageReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "Message"
    }
  },
  "DeliveryAck": {
    "kind": "object",
    "fields": {
      "deliveryId": "UUID!",
      "acknowledged": "Boolean!"
    }
  },
  "Deployment": {
    "kind": "object",
    "fields": {
      "deploymentId": "UUID!",
      "orgId": "UUID!",
      "offering": "String!",
      "geoId": "String!",
      "installationId": "String!",
      "resourceOwner": "String!",
      "approvedRegions": "[String!]!",
      "readiness": "String!",
      "revision": "Decimal!",
      "consentRef": "String!",
      "environment": "String!"
    }
  },
  "DeploymentHealth": {
    "kind": "object",
    "fields": {
      "deploymentId": "UUID!",
      "readiness": "String!",
      "observedAt": "String!",
      "services": "[ServiceObservation!]!"
    }
  },
  "DeploymentUsage": {
    "kind": "object",
    "fields": {
      "deploymentId": "UUID!",
      "source": "String!",
      "observedAt": "String!",
      "complete": "Boolean!",
      "reason": "String!",
      "from": "String!",
      "to": "String!",
      "meters": "[UsageMeter!]!",
      "aggregatedThrough": "String"
    }
  },
  "DisablePrincipalReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "Principal"
    }
  },
  "EditMessageReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "Message"
    }
  },
  "EndLiveSessionPayload": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "receiptId": "UUID!",
      "committedAt": "String!",
      "replayed": "Boolean!",
      "operation": "OperationRef!",
      "result": "LiveSessionEndRequested!"
    }
  },
  "Event": {
    "kind": "object",
    "fields": {
      "eventId": "UUID!",
      "conversationId": "UUID!",
      "sequence": "Decimal!",
      "type": "String!",
      "occurredAt": "String!",
      "subjectRef": "ResourceRef",
      "payload": "EventPayload"
    }
  },
  "EventPage": {
    "kind": "object",
    "fields": {
      "items": "[Event!]!",
      "complete": "Boolean!",
      "refreshRequired": "Boolean!",
      "nextCursor": "Cursor"
    }
  },
  "EventPayload": {
    "kind": "object",
    "fields": {
      "messageId": "UUID",
      "revision": "Decimal",
      "revisionSequence": "Decimal",
      "principalId": "UUID",
      "membershipEpoch": "Decimal",
      "visibilityEpoch": "Decimal",
      "kind": "String",
      "throughSequence": "Decimal",
      "callId": "UUID",
      "generation": "Decimal",
      "state": "String",
      "cutoffEvidence": "String",
      "liveSessionId": "UUID"
    }
  },
  "EventsReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "EventPage"
    }
  },
  "Features": {
    "kind": "object",
    "fields": {
      "chat": "Boolean!",
      "inbox": "Boolean!",
      "lexicalSearch": "Boolean!",
      "typing": "Boolean!",
      "webhooks": "Boolean!",
      "liveSessions": "Boolean!",
      "liveBroadcast": "Boolean!"
    }
  },
  "GetConversationReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "Conversation"
    }
  },
  "GetMessageReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "Message"
    }
  },
  "GetOperationReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "Operation"
    }
  },
  "GetPrincipalReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "Principal"
    }
  },
  "HistoryGrantReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "Member"
    }
  },
  "InboxItem": {
    "kind": "object",
    "fields": {
      "conversationId": "UUID!",
      "title": "String!",
      "activityAt": "String",
      "visibilityEpoch": "Decimal!",
      "latestVisibleMessage": "Message",
      "hasUnread": "Boolean!"
    }
  },
  "InboxPage": {
    "kind": "object",
    "fields": {
      "items": "[InboxItem!]!",
      "complete": "Boolean!",
      "refreshRequired": "Boolean!",
      "nextCursor": "String",
      "partialReason": "String"
    }
  },
  "InboxReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "InboxPage"
    }
  },
  "IssueSessionReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "SessionBootstrap"
    }
  },
  "JoinLiveSessionPayload": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "receiptId": "UUID!",
      "committedAt": "String!",
      "replayed": "Boolean!",
      "result": "LiveSessionJoined!"
    }
  },
  "LeaveLiveSessionPayload": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "receiptId": "UUID!",
      "committedAt": "String!",
      "replayed": "Boolean!",
      "result": "LiveSessionLeft!"
    }
  },
  "Limit": {
    "kind": "object",
    "fields": {
      "maximum": "Decimal",
      "unit": "String",
      "scope": "String",
      "milliseconds": "Decimal",
      "policyId": "String",
      "revision": "Decimal"
    }
  },
  "LimitEntry": {
    "kind": "object",
    "fields": {
      "key": "String!",
      "value": "Limit!"
    }
  },
  "LiveAlert": {
    "kind": "object",
    "fields": {
      "alertId": "UUID!",
      "liveSessionId": "UUID!",
      "conversationId": "UUID!",
      "generation": "Decimal!",
      "membershipEpoch": "Decimal!",
      "createdAt": "String!",
      "expiresAt": "String!"
    }
  },
  "LiveAlertBatch": {
    "kind": "object",
    "fields": {
      "liveSessionId": "UUID!",
      "created": "Decimal!",
      "suppressed": "Decimal!"
    }
  },
  "LiveAlertPage": {
    "kind": "object",
    "fields": {
      "items": "[LiveAlert!]!",
      "nextCursor": "String",
      "complete": "Boolean!",
      "partialReason": "String",
      "refreshRequired": "Boolean!"
    }
  },
  "LiveAlertPageReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String!",
      "result": "LiveAlertPage!"
    }
  },
  "LiveConnectionGrant": {
    "kind": "object",
    "fields": {
      "liveSessionId": "UUID!",
      "participationId": "UUID!",
      "generation": "Decimal!",
      "roomName": "String!",
      "participantIdentity": "String!",
      "livekitUrl": "String!",
      "transportToken": "String!",
      "admissionTicket": "SignedProof!",
      "forwardingLease": "SignedProof!",
      "transportExpiresAt": "String!",
      "admissionExpiresAt": "String!",
      "leaseExpiresAt": "String!",
      "leasePolicyId": "String!",
      "connectToken": "String!"
    }
  },
  "LiveConnectionMode": {
    "kind": "enum",
    "values": [
      "INITIAL",
      "RECONNECT"
    ]
  },
  "LiveCredentialIssuance": {
    "kind": "object",
    "fields": {
      "liveSessionId": "UUID!",
      "participationId": "UUID!",
      "generation": "Decimal!",
      "leaseId": "UUID!",
      "grantOrdinal": "Decimal!",
      "admissionExpiresAt": "String!",
      "leaseExpiresAt": "String!"
    }
  },
  "LiveCutoffEvidence": {
    "kind": "enum",
    "values": [
      "NATIVE_FENCE",
      "MONOTONIC_BOOT_RETIREMENT",
      "NO_GRANTS_ISSUED"
    ]
  },
  "LiveCutoffScope": {
    "kind": "object",
    "fields": {
      "kind": "LiveCutoffScopeKind!",
      "liveSessionId": "UUID!",
      "generation": "Decimal!",
      "participationId": "UUID"
    }
  },
  "LiveCutoffScopeKind": {
    "kind": "enum",
    "values": [
      "PARTICIPATION",
      "GENERATION"
    ]
  },
  "LiveCutoffState": {
    "kind": "enum",
    "values": [
      "PENDING",
      "ENFORCED",
      "UNKNOWN"
    ]
  },
  "LiveErrorCode": {
    "kind": "enum",
    "values": [
      "LIVE_SESSION_EXISTS",
      "LIVE_SESSION_CLOSED",
      "LIVE_SESSION_INTERRUPTED",
      "LIVE_SESSION_CAPACITY",
      "LIVE_ALERT_LIMIT",
      "JOINED_ELSEWHERE",
      "PARTICIPATION_DRAINING",
      "PARTICIPATION_MISMATCH",
      "GENERATION_CONFLICT",
      "MEDIA_NOT_READY",
      "CREDENTIAL_REFRESH_REQUIRED",
      "LIVE_START_CANCELLED",
      "LIVE_PREPARATION_FAILED"
    ]
  },
  "LiveMediaCutoff": {
    "kind": "object",
    "fields": {
      "state": "LiveCutoffState!",
      "scope": "LiveCutoffScope!",
      "evidence": "LiveCutoffEvidence",
      "enforcedAt": "String",
      "operationId": "UUID"
    }
  },
  "LiveMediaPermissions": {
    "kind": "object",
    "fields": {
      "microphone": "Boolean!",
      "camera": "Boolean!",
      "subscribe": "Boolean!"
    }
  },
  "LiveMediaProfile": {
    "kind": "enum",
    "values": [
      "AUDIO_ONLY",
      "AUDIO_VIDEO"
    ]
  },
  "LiveOperationFailure": {
    "kind": "object",
    "fields": {
      "code": "LiveErrorCode!",
      "message": "String!"
    }
  },
  "LiveOperationKind": {
    "kind": "enum",
    "values": [
      "START",
      "END"
    ]
  },
  "LiveOperationState": {
    "kind": "enum",
    "values": [
      "RUNNING",
      "COMPLETED",
      "FAILED"
    ]
  },
  "LiveParticipantPage": {
    "kind": "object",
    "fields": {
      "items": "[LiveParticipation!]!",
      "nextCursor": "String",
      "complete": "Boolean!",
      "partialReason": "String",
      "refreshRequired": "Boolean!"
    }
  },
  "LiveParticipantPageReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String!",
      "result": "LiveParticipantPage!"
    }
  },
  "LiveParticipation": {
    "kind": "object",
    "fields": {
      "participationId": "UUID!",
      "principalId": "UUID!",
      "membershipEpoch": "Decimal!",
      "role": "LiveRole!",
      "state": "LiveParticipationState!",
      "permissions": "LiveMediaPermissions!",
      "reservationExpiresAt": "String",
      "nativeConnectionId": "UUID",
      "mediaCutoff": "LiveMediaCutoff"
    }
  },
  "LiveParticipationState": {
    "kind": "enum",
    "values": [
      "JOINED",
      "CONNECTING",
      "CONNECTED",
      "DISCONNECTED",
      "LEAVING",
      "LEFT"
    ]
  },
  "LiveRole": {
    "kind": "enum",
    "values": [
      "PUBLISHER",
      "VIEWER"
    ]
  },
  "LiveSession": {
    "kind": "object",
    "fields": {
      "liveSessionId": "UUID!",
      "conversationId": "UUID!",
      "creatorId": "UUID!",
      "kind": "LiveSessionKind!",
      "mediaProfile": "LiveMediaProfile!",
      "state": "LiveSessionState!",
      "generation": "Decimal!",
      "revision": "Decimal!",
      "createdAt": "String!",
      "expiresAt": "String!",
      "myParticipation": "LiveParticipation",
      "mediaCutoff": "LiveMediaCutoff"
    }
  },
  "LiveSessionCredentialsPayload": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "receiptId": "UUID!",
      "committedAt": "String!",
      "replayed": "Boolean!",
      "result": "LiveConnectionGrant!"
    }
  },
  "LiveSessionEndRequested": {
    "kind": "object",
    "fields": {
      "liveSessionId": "UUID!",
      "operationId": "UUID!",
      "mediaCutoff": "LiveMediaCutoff!"
    }
  },
  "LiveSessionJoined": {
    "kind": "object",
    "fields": {
      "liveSessionId": "UUID!",
      "generation": "Decimal!",
      "participation": "LiveParticipation!"
    }
  },
  "LiveSessionKind": {
    "kind": "enum",
    "values": [
      "INTERACTIVE",
      "BROADCAST"
    ]
  },
  "LiveSessionLeft": {
    "kind": "object",
    "fields": {
      "liveSessionId": "UUID!",
      "participationId": "UUID!",
      "mediaCutoff": "LiveMediaCutoff!"
    }
  },
  "LiveSessionOperation": {
    "kind": "object",
    "fields": {
      "operationId": "UUID!",
      "requestId": "UUID!",
      "liveSessionId": "UUID!",
      "kind": "LiveOperationKind!",
      "state": "LiveOperationState!",
      "revision": "Decimal!",
      "requestedAt": "String!",
      "completedAt": "String",
      "completion": "LiveSessionOperationCompletion",
      "failure": "LiveOperationFailure"
    }
  },
  "LiveSessionOperationCompletion": {
    "kind": "object",
    "fields": {
      "liveSessionId": "UUID!",
      "generation": "Decimal!",
      "state": "LiveSessionState!",
      "revision": "Decimal!",
      "completedAt": "String!",
      "mediaCutoff": "LiveMediaCutoff"
    }
  },
  "LiveSessionOperationReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String!",
      "result": "LiveSessionOperation!"
    }
  },
  "LiveSessionPage": {
    "kind": "object",
    "fields": {
      "items": "[LiveSession!]!",
      "nextCursor": "String",
      "complete": "Boolean!",
      "partialReason": "String",
      "refreshRequired": "Boolean!"
    }
  },
  "LiveSessionPageReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String!",
      "result": "LiveSessionPage!"
    }
  },
  "LiveSessionReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String!",
      "result": "LiveSession!"
    }
  },
  "LiveSessionStarted": {
    "kind": "object",
    "fields": {
      "liveSessionId": "UUID!",
      "conversationId": "UUID!",
      "kind": "LiveSessionKind!",
      "mediaProfile": "LiveMediaProfile!",
      "operationId": "UUID!"
    }
  },
  "LiveSessionState": {
    "kind": "enum",
    "values": [
      "PREPARING",
      "READY",
      "ACTIVE",
      "DRAINING",
      "ENDED",
      "FAILED"
    ]
  },
  "MediaCutoff": {
    "kind": "object",
    "fields": {
      "state": "String!",
      "scope": "CutoffScope"
    }
  },
  "MediaPolicy": {
    "kind": "object",
    "fields": {
      "leasePolicyId": "String!",
      "maxLeaseMs": "Decimal!",
      "renewAttemptMs": "Decimal!",
      "preludeMaxBytes": "String!",
      "preludeTimeoutMs": "String!",
      "clockProfileId": "String!"
    }
  },
  "Member": {
    "kind": "object",
    "fields": {
      "conversationId": "UUID!",
      "principalId": "UUID!",
      "role": "String!",
      "status": "String!",
      "membershipEpoch": "Decimal!",
      "visibilityEpoch": "Decimal!",
      "revision": "Decimal!",
      "visibleFromSequence": "Decimal!",
      "canStartBroadcast": "Boolean!"
    }
  },
  "MemberPage": {
    "kind": "object",
    "fields": {
      "items": "[Member!]!",
      "complete": "Boolean!",
      "refreshRequired": "Boolean!",
      "nextCursor": "String"
    }
  },
  "MembersReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "MemberPage"
    }
  },
  "Message": {
    "kind": "object",
    "fields": {
      "messageId": "UUID!",
      "conversationId": "UUID!",
      "authorId": "String!",
      "sequence": "Decimal!",
      "revision": "Decimal!",
      "revisionSequence": "Decimal!",
      "createdAt": "String!",
      "deleted": "Boolean!",
      "text": "String",
      "props": "Properties",
      "editedAt": "String"
    }
  },
  "MessageAck": {
    "kind": "object",
    "fields": {
      "messageId": "UUID!",
      "conversationId": "UUID!",
      "sequence": "Decimal!",
      "revision": "Decimal!",
      "status": "String!",
      "cursor": "Cursor"
    }
  },
  "MessagePage": {
    "kind": "object",
    "fields": {
      "items": "[Message!]!",
      "complete": "Boolean!",
      "refreshRequired": "Boolean!",
      "nextCursor": "String"
    }
  },
  "MessagesReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "MessagePage"
    }
  },
  "Operation": {
    "kind": "object",
    "fields": {
      "operationId": "UUID!",
      "kind": "String!",
      "targetRef": "ResourceRef",
      "state": "String!",
      "revision": "Decimal!",
      "requestedAt": "String!",
      "updatedAt": "String!",
      "steps": "[OperationStep!]!",
      "result": "OperationResult",
      "blockedReason": "String"
    }
  },
  "OperationRef": {
    "kind": "object",
    "fields": {
      "operationId": "UUID!",
      "owner": "String!",
      "href": "String!",
      "state": "String!"
    }
  },
  "OperationResult": {
    "kind": "object",
    "fields": {
      "projectId": "UUID",
      "incarnation": "UUID",
      "status": "String",
      "backend": "String",
      "environment": "String",
      "policyRevision": "Decimal",
      "expiresAt": "String",
      "kind": "String",
      "resourceRef": "ResourceRef",
      "delivery": "CredentialDelivery",
      "keyId": "String",
      "endpointId": "UUID",
      "enabled": "Boolean",
      "liveSessionCompletion": "LiveSessionOperationCompletion",
      "replayedDeliveries": "Int",
      "skippedDeliveries": "Int",
      "messagePreview": "Boolean"
    }
  },
  "OperationStep": {
    "kind": "object",
    "fields": {
      "stepId": "String!",
      "state": "String!"
    }
  },
  "Organization": {
    "kind": "object",
    "fields": {
      "orgId": "UUID!",
      "name": "String!",
      "status": "String!",
      "revision": "Decimal!"
    }
  },
  "OrganizationBilling": {
    "kind": "object",
    "fields": {
      "orgId": "UUID!",
      "planId": "String",
      "standing": "String",
      "graceUntil": "String",
      "subscriptionStatus": "String",
      "currentPeriodEnd": "String",
      "cancelAtPeriodEnd": "Boolean!",
      "catalogVersion": "String!",
      "configured": "Boolean!",
      "billed": "Boolean!"
    }
  },
  "OrganizationPage": {
    "kind": "object",
    "fields": {
      "items": "[Organization!]!",
      "complete": "Boolean!",
      "refreshRequired": "Boolean!",
      "nextCursor": "String"
    }
  },
  "OrganizationSpend": {
    "kind": "object",
    "fields": {
      "orgId": "UUID!",
      "planId": "String!",
      "currency": "String!",
      "catalogVersion": "String!",
      "monthlySpendCap": "String",
      "agentPurchaseLimit": "String",
      "updatedAt": "String",
      "monthlyMinimum": "String",
      "periodStart": "String",
      "periodEnd": "String",
      "credits": "String",
      "charges": "String",
      "margin": "String",
      "stop": "String",
      "refusedMeters": "[String!]!",
      "evaluatedAt": "String",
      "usageThrough": "String",
      "validUntil": "String",
      "minimumCredit": "String",
      "chargeLimit": "String"
    }
  },
  "OrganizationUsage": {
    "kind": "object",
    "fields": {
      "orgId": "UUID!",
      "source": "String!",
      "observedAt": "String!",
      "complete": "Boolean!",
      "reason": "String!",
      "from": "String!",
      "to": "String!",
      "meters": "[UsageMeter!]!",
      "aggregatedThrough": "String"
    }
  },
  "PageSize": {
    "kind": "scalar"
  },
  "PlanLimitExceededProblem": {
    "kind": "object",
    "fields": {
      "code": "String!",
      "status": "Int!",
      "requestId": "UUID!",
      "outcome": "String!",
      "retryable": "Boolean!",
      "planLimit": "String!",
      "limit": "String!"
    }
  },
  "Principal": {
    "kind": "object",
    "fields": {
      "principalId": "UUID!",
      "externalUserId": "String!",
      "status": "String!",
      "revision": "Decimal!"
    }
  },
  "Project": {
    "kind": "object",
    "fields": {
      "projectId": "UUID!",
      "deploymentId": "UUID!",
      "name": "String!",
      "environment": "String!",
      "incarnation": "UUID!",
      "servingRegion": "String!",
      "servingEpoch": "Decimal!",
      "status": "String!",
      "revision": "Decimal!",
      "policyRevision": "Decimal!",
      "messagePreview": "Boolean!"
    }
  },
  "ProjectUsage": {
    "kind": "object",
    "fields": {
      "projectId": "UUID!",
      "source": "String!",
      "observedAt": "String!",
      "complete": "Boolean!",
      "reason": "String!",
      "from": "String!",
      "to": "String!",
      "meters": "[UsageMeter!]!",
      "aggregatedThrough": "String"
    }
  },
  "Properties": {
    "kind": "scalar"
  },
  "QuotaExceededProblem": {
    "kind": "object",
    "fields": {
      "code": "String!",
      "status": "Int!",
      "requestId": "UUID!",
      "outcome": "String!",
      "retryable": "Boolean!",
      "retryAfter": "Int!",
      "meter": "String!",
      "limit": "Decimal!",
      "periodEnd": "String!"
    }
  },
  "RateLimitedProblem": {
    "kind": "object",
    "fields": {
      "code": "String!",
      "status": "Int!",
      "requestId": "UUID!",
      "outcome": "String!",
      "retryable": "Boolean!",
      "retryAfter": "Int!"
    }
  },
  "ReadReceipt": {
    "kind": "object",
    "fields": {
      "principalId": "UUID!",
      "membershipEpoch": "Decimal!",
      "visibilityEpoch": "Decimal!",
      "deliveredThroughSequence": "Decimal",
      "readThroughSequence": "Decimal",
      "updatedAt": "String"
    }
  },
  "ReceiptPage": {
    "kind": "object",
    "fields": {
      "items": "[ReadReceipt!]!",
      "complete": "Boolean!",
      "refreshRequired": "Boolean!",
      "nextCursor": "String"
    }
  },
  "ReceiptsReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "ReceiptPage"
    }
  },
  "RedeemCredentialReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "CredentialCapsule"
    }
  },
  "RemoveMemberReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "Member"
    }
  },
  "RenewSessionReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "SessionBootstrap"
    }
  },
  "ReportReceiptReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "ReadReceipt"
    }
  },
  "RequestResolution": {
    "kind": "object",
    "fields": {
      "state": "String!",
      "requestId": "UUID!",
      "checkedAt": "String!",
      "resultWithheld": "Boolean!",
      "receipt": "ResolvedReceipt"
    }
  },
  "ResolveRequestReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "RequestResolution"
    }
  },
  "ResolvedReceipt": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "RetainedResult"
    }
  },
  "ResourceRef": {
    "kind": "object",
    "fields": {
      "kind": "String!",
      "id": "String!"
    }
  },
  "RetainedResult": {
    "kind": "object",
    "fields": {
      "agentGrant": "AgentGrant",
      "agentSignupStatus": "AgentSignupStatus",
      "billingCheckoutSession": "BillingCheckoutSession",
      "billingPortalSession": "BillingPortalSession",
      "broadcastPermissionChanged": "BroadcastPermissionChanged",
      "conversation": "Conversation",
      "conversationMemberBatch": "ConversationMemberBatch",
      "conversationMute": "ConversationMute",
      "credentialDeliveryReceipt": "CredentialDeliveryReceipt",
      "deliveryAck": "DeliveryAck",
      "liveAlertBatch": "LiveAlertBatch",
      "liveCredentialIssuance": "LiveCredentialIssuance",
      "liveSessionEndRequested": "LiveSessionEndRequested",
      "liveSessionJoined": "LiveSessionJoined",
      "liveSessionLeft": "LiveSessionLeft",
      "liveSessionStarted": "LiveSessionStarted",
      "member": "Member",
      "message": "Message",
      "messageAck": "MessageAck",
      "organization": "Organization",
      "organizationSpend": "OrganizationSpend",
      "principal": "Principal",
      "readReceipt": "ReadReceipt",
      "sessionBootstrap": "SessionBootstrap",
      "sessionRevocation": "SessionRevocation",
      "signedProof": "SignedProof"
    }
  },
  "RevokeSessionReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "SessionRevocation"
    }
  },
  "RouteReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "SignedProof"
    }
  },
  "SearchHit": {
    "kind": "object",
    "fields": {
      "conversationId": "UUID!",
      "message": "Message"
    }
  },
  "SearchPage": {
    "kind": "object",
    "fields": {
      "items": "[SearchHit!]!",
      "complete": "Boolean!",
      "refreshRequired": "Boolean!",
      "nextCursor": "String"
    }
  },
  "SearchReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "SearchPage"
    }
  },
  "SendMessageReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "MessageAck"
    }
  },
  "ServiceDetails": {
    "kind": "object",
    "fields": {
      "status": "String!"
    }
  },
  "ServiceObservation": {
    "kind": "object",
    "fields": {
      "role": "String!",
      "observedAt": "String!",
      "details": "ServiceDetails"
    }
  },
  "Session": {
    "kind": "object",
    "fields": {
      "sessionId": "UUID!",
      "principalId": "UUID!",
      "deviceId": "UUID!",
      "incarnation": "UUID!",
      "sessionRevision": "Decimal!",
      "expiresAt": "String!",
      "status": "String!"
    }
  },
  "SessionBootstrap": {
    "kind": "object",
    "fields": {
      "session": "Session",
      "tokenExpiresAt": "String!",
      "sessionToken": "String!"
    }
  },
  "SessionRequestOutcome": {
    "kind": "object",
    "fields": {
      "state": "String!",
      "requestId": "UUID!",
      "checkedAt": "String!",
      "operation": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "originalSession": "Session",
      "currentSession": "Session",
      "currentState": "String"
    }
  },
  "SessionRequestOutcomeReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String!",
      "result": "SessionRequestOutcome!"
    }
  },
  "SessionRevocation": {
    "kind": "object",
    "fields": {
      "sessionId": "UUID!",
      "status": "String!",
      "mediaCutoff": "MediaCutoff"
    }
  },
  "SetBroadcastPermissionPayload": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "receiptId": "UUID!",
      "committedAt": "String!",
      "replayed": "Boolean!",
      "result": "BroadcastPermissionChanged!"
    }
  },
  "SetConversationMutePayload": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "receiptId": "UUID!",
      "committedAt": "String!",
      "replayed": "Boolean!",
      "result": "ConversationMute!"
    }
  },
  "SignedProof": {
    "kind": "scalar"
  },
  "SpendCapReachedProblem": {
    "kind": "object",
    "fields": {
      "code": "String!",
      "status": "Int!",
      "requestId": "UUID!",
      "outcome": "String!",
      "retryable": "Boolean!",
      "meter": "String!",
      "periodEnd": "String!"
    }
  },
  "SpendUnverifiedProblem": {
    "kind": "object",
    "fields": {
      "code": "String!",
      "status": "Int!",
      "requestId": "UUID!",
      "outcome": "String!",
      "retryable": "Boolean!",
      "retryAfter": "Int!",
      "meter": "String!",
      "periodEnd": "String!"
    }
  },
  "StartLiveSessionPayload": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "receiptId": "UUID!",
      "committedAt": "String!",
      "replayed": "Boolean!",
      "operation": "OperationRef!",
      "result": "LiveSessionStarted!"
    }
  },
  "TypingReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "TypingStatus"
    }
  },
  "TypingStatus": {
    "kind": "object",
    "fields": {
      "accepted": "Boolean!"
    }
  },
  "UUID": {
    "kind": "scalar"
  },
  "UpdateConversationReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "Conversation"
    }
  },
  "UsageMeter": {
    "kind": "object",
    "fields": {
      "meter": "String!",
      "unit": "String!",
      "quantity": "Decimal!",
      "emitted": "Boolean!"
    }
  },
  "WebhookDelivery": {
    "kind": "object",
    "fields": {
      "effectId": "UUID!",
      "eventId": "UUID!",
      "state": "String!",
      "attempts": "Decimal!",
      "lastOutcome": "String",
      "nextAttemptAt": "String!",
      "eventType": "String",
      "createdAt": "String",
      "replayedAt": "String",
      "lastAttemptAt": "String",
      "lastHttpStatus": "Int",
      "lastLatencyMs": "Int",
      "lastErrorCode": "String"
    }
  },
  "WebhookDeliveryPage": {
    "kind": "object",
    "fields": {
      "items": "[WebhookDelivery!]!",
      "complete": "Boolean!",
      "refreshRequired": "Boolean!",
      "nextCursor": "String",
      "observedAt": "String",
      "partialReason": "String",
      "sourceRevision": "Decimal"
    }
  },
  "WebhookEndpoint": {
    "kind": "object",
    "fields": {
      "endpointId": "UUID!",
      "url": "String!",
      "eventTypes": "[String!]!",
      "enabled": "Boolean!",
      "status": "String!",
      "disabledReason": "String",
      "revision": "Decimal!",
      "secretVersion": "String!",
      "rotationPending": "Boolean!",
      "rotationOverlapUntil": "String",
      "consecutiveFailures": "Int!",
      "failingSince": "String",
      "lastSuccessAt": "String",
      "lastFailureAt": "String"
    }
  },
  "WebhookEndpointPage": {
    "kind": "object",
    "fields": {
      "items": "[WebhookEndpoint!]!",
      "complete": "Boolean!",
      "refreshRequired": "Boolean!",
      "nextCursor": "String",
      "observedAt": "String",
      "partialReason": "String"
    }
  },
  "AgentAuditEventsReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "AgentAuditEventPage"
    }
  },
  "AgentCredentialPermitReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "SignedProof"
    }
  },
  "AgentGrantsReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "AgentGrantPage"
    }
  },
  "AgentSignupForApprovalReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "AgentSignupReview"
    }
  },
  "AgentSignupReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "AgentSignupStatus"
    }
  },
  "ApproveAgentSignupReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "AgentSignupStatus"
    }
  },
  "ConfigureWebhookReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "OperationResult"
    }
  },
  "CreateBillingCheckoutSessionReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "BillingCheckoutSession"
    }
  },
  "CreateBillingPortalSessionReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "BillingPortalSession"
    }
  },
  "CreateDeploymentReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "OperationResult"
    }
  },
  "CreateOrganizationReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "Organization"
    }
  },
  "CreateProjectReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "OperationResult"
    }
  },
  "CredentialPermitReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "SignedProof"
    }
  },
  "DeploymentHealthReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "DeploymentHealth"
    }
  },
  "DeploymentUsageReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "DeploymentUsage"
    }
  },
  "DisableWebhookReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "OperationResult"
    }
  },
  "GetDeploymentReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "Deployment"
    }
  },
  "GetOrganizationReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "Organization"
    }
  },
  "GetProjectReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "Project"
    }
  },
  "IssueAgentKeyReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "AgentKey"
    }
  },
  "IssueBackendKeyReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "OperationResult"
    }
  },
  "OrganizationBillingReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "OrganizationBilling"
    }
  },
  "OrganizationSpendReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "OrganizationSpend"
    }
  },
  "OrganizationUsageReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "OrganizationUsage"
    }
  },
  "OrganizationsReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "OrganizationPage"
    }
  },
  "PauseOperationReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "Operation"
    }
  },
  "ProjectPolicyReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "OperationResult"
    }
  },
  "ProjectUsageReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "ProjectUsage"
    }
  },
  "PurchaseAgentCreditsReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "AgentPayment"
    }
  },
  "RejectAgentSignupReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "AgentSignupStatus"
    }
  },
  "ReplayWebhookDeliveriesReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "OperationResult"
    }
  },
  "RequestAgentSignupReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "AgentSignupTicket"
    }
  },
  "ResumeOperationReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "Operation"
    }
  },
  "RevokeAgentGrantReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "AgentGrant"
    }
  },
  "RevokeBackendKeyReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "OperationResult"
    }
  },
  "RotateWebhookSecretReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "OperationResult"
    }
  },
  "SetSpendControlsReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "OrganizationSpend"
    }
  },
  "UpdateWebhookReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "OperationResult"
    }
  },
  "WebhookDeliveriesReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "WebhookDeliveryPage"
    }
  },
  "WebhookEndpointsReply": {
    "kind": "object",
    "fields": {
      "status": "String!",
      "requestId": "UUID!",
      "serverTime": "String",
      "receiptId": "UUID",
      "committedAt": "String",
      "replayed": "Boolean",
      "operation": "OperationRef",
      "resourceRef": "ResourceRef",
      "result": "WebhookEndpointPage"
    }
  }
};
export const operationCatalog: Record<OperationKey, OperationCatalogEntry> = {
  "communication.capabilities": {
    "plane": "communication",
    "kind": "query",
    "idempotency": "safe",
    "field": "capabilities",
    "operationName": "CommunicationCapabilities",
    "query": "query CommunicationCapabilities($context: RequestContextInput!) {\n  capabilities(context: $context) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      serverRelease\n      capabilityRevision\n      limitsRevision\n      features {\n        chat\n        inbox\n        lexicalSearch\n        typing\n        webhooks\n        liveSessions\n        liveBroadcast\n      }\n      limits {\n        key\n        value {\n          maximum\n          unit\n          scope\n          milliseconds\n          policyId\n          revision\n        }\n      }\n      environment\n      productionQualified\n      mediaPolicy {\n        leasePolicyId\n        maxLeaseMs\n        renewAttemptMs\n        preludeMaxBytes\n        preludeTimeoutMs\n        clockProfileId\n      }\n      geoControlAuthorityId\n      offerings\n      geos\n      installationProfiles\n      portalIdentity\n    }\n  }\n}",
    "resultType": "CapabilitiesReply!",
    "inputFields": []
  },
  "communication.route": {
    "plane": "communication",
    "kind": "query",
    "idempotency": "safe",
    "field": "route",
    "operationName": "CommunicationRoute",
    "query": "query CommunicationRoute($context: RequestContextInput!) {\n  route(context: $context) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result\n  }\n}",
    "resultType": "RouteReply!",
    "inputFields": []
  },
  "communication.currentSession": {
    "plane": "communication",
    "kind": "query",
    "idempotency": "safe",
    "field": "currentSession",
    "operationName": "CommunicationCurrentSession",
    "query": "query CommunicationCurrentSession($context: RequestContextInput!) {\n  currentSession(context: $context) {\n    status\n    requestId\n    serverTime\n    result {\n      sessionId\n      principalId\n      deviceId\n      incarnation\n      sessionRevision\n      expiresAt\n      status\n    }\n  }\n}",
    "resultType": "CurrentSessionReply!",
    "inputFields": []
  },
  "communication.getPrincipal": {
    "plane": "communication",
    "kind": "query",
    "idempotency": "safe",
    "field": "getPrincipal",
    "operationName": "CommunicationGetPrincipal",
    "query": "query CommunicationGetPrincipal($context: RequestContextInput!, $input: GetPrincipalRequestInput!) {\n  getPrincipal(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      principalId\n      externalUserId\n      status\n      revision\n    }\n  }\n}",
    "resultType": "GetPrincipalReply!",
    "inputFields": [
      "principalId"
    ]
  },
  "communication.getConversation": {
    "plane": "communication",
    "kind": "query",
    "idempotency": "safe",
    "field": "getConversation",
    "operationName": "CommunicationGetConversation",
    "query": "query CommunicationGetConversation($context: RequestContextInput!, $input: GetConversationRequestInput!) {\n  getConversation(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      conversationId\n      revision\n      title\n      props\n      latestSequence\n      membership {\n        conversationId\n        principalId\n        role\n        status\n        membershipEpoch\n        visibilityEpoch\n        revision\n        visibleFromSequence\n        canStartBroadcast\n      }\n    }\n  }\n}",
    "resultType": "GetConversationReply!",
    "inputFields": [
      "conversationId"
    ]
  },
  "communication.members": {
    "plane": "communication",
    "kind": "query",
    "idempotency": "safe",
    "field": "members",
    "operationName": "CommunicationMembers",
    "query": "query CommunicationMembers($context: RequestContextInput!, $input: MembersRequestInput!) {\n  members(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      items {\n        conversationId\n        principalId\n        role\n        status\n        membershipEpoch\n        visibilityEpoch\n        revision\n        visibleFromSequence\n        canStartBroadcast\n      }\n      complete\n      refreshRequired\n      nextCursor\n    }\n  }\n}",
    "resultType": "MembersReply!",
    "inputFields": [
      "conversationId",
      "limit",
      "cursor"
    ]
  },
  "communication.messages": {
    "plane": "communication",
    "kind": "query",
    "idempotency": "safe",
    "field": "messages",
    "operationName": "CommunicationMessages",
    "query": "query CommunicationMessages($context: RequestContextInput!, $input: MessagesRequestInput!) {\n  messages(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      items {\n        messageId\n        conversationId\n        authorId\n        sequence\n        revision\n        revisionSequence\n        createdAt\n        deleted\n        text\n        props\n        editedAt\n      }\n      complete\n      refreshRequired\n      nextCursor\n    }\n  }\n}",
    "resultType": "MessagesReply!",
    "inputFields": [
      "conversationId",
      "limit",
      "beforeSequence",
      "actAsPrincipalId"
    ]
  },
  "communication.getMessage": {
    "plane": "communication",
    "kind": "query",
    "idempotency": "safe",
    "field": "getMessage",
    "operationName": "CommunicationGetMessage",
    "query": "query CommunicationGetMessage($context: RequestContextInput!, $input: GetMessageRequestInput!) {\n  getMessage(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      messageId\n      conversationId\n      authorId\n      sequence\n      revision\n      revisionSequence\n      createdAt\n      deleted\n      text\n      props\n      editedAt\n    }\n  }\n}",
    "resultType": "GetMessageReply!",
    "inputFields": [
      "conversationId",
      "messageId",
      "actAsPrincipalId"
    ]
  },
  "communication.events": {
    "plane": "communication",
    "kind": "query",
    "idempotency": "safe",
    "field": "events",
    "operationName": "CommunicationEvents",
    "query": "query CommunicationEvents($context: RequestContextInput!, $input: EventsRequestInput!) {\n  events(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      items {\n        eventId\n        conversationId\n        sequence\n        type\n        occurredAt\n        subjectRef {\n          kind\n          id\n        }\n        payload {\n          messageId\n          revision\n          revisionSequence\n          principalId\n          membershipEpoch\n          visibilityEpoch\n          kind\n          throughSequence\n          callId\n          generation\n          state\n          cutoffEvidence\n          liveSessionId\n        }\n      }\n      complete\n      refreshRequired\n      nextCursor {\n        incarnation\n        conversationId\n        sequence\n      }\n    }\n  }\n}",
    "resultType": "EventsReply!",
    "inputFields": [
      "conversationId",
      "limit",
      "after"
    ]
  },
  "communication.receipts": {
    "plane": "communication",
    "kind": "query",
    "idempotency": "safe",
    "field": "receipts",
    "operationName": "CommunicationReceipts",
    "query": "query CommunicationReceipts($context: RequestContextInput!, $input: ReceiptsRequestInput!) {\n  receipts(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      items {\n        principalId\n        membershipEpoch\n        visibilityEpoch\n        deliveredThroughSequence\n        readThroughSequence\n        updatedAt\n      }\n      complete\n      refreshRequired\n      nextCursor\n    }\n  }\n}",
    "resultType": "ReceiptsReply!",
    "inputFields": [
      "conversationId",
      "limit",
      "cursor"
    ]
  },
  "communication.inbox": {
    "plane": "communication",
    "kind": "query",
    "idempotency": "safe",
    "field": "inbox",
    "operationName": "CommunicationInbox",
    "query": "query CommunicationInbox($context: RequestContextInput!, $input: InboxRequestInput!) {\n  inbox(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      items {\n        conversationId\n        title\n        activityAt\n        visibilityEpoch\n        latestVisibleMessage {\n          messageId\n          conversationId\n          authorId\n          sequence\n          revision\n          revisionSequence\n          createdAt\n          deleted\n          text\n          props\n          editedAt\n        }\n        hasUnread\n      }\n      complete\n      refreshRequired\n      nextCursor\n      partialReason\n    }\n  }\n}",
    "resultType": "InboxReply!",
    "inputFields": [
      "limit",
      "cursor",
      "actAsPrincipalId"
    ]
  },
  "communication.search": {
    "plane": "communication",
    "kind": "query",
    "idempotency": "safe",
    "field": "search",
    "operationName": "CommunicationSearch",
    "query": "query CommunicationSearch($context: RequestContextInput!, $input: SearchRequestInput!) {\n  search(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      items {\n        conversationId\n        message {\n          messageId\n          conversationId\n          authorId\n          sequence\n          revision\n          revisionSequence\n          createdAt\n          deleted\n          text\n          props\n          editedAt\n        }\n      }\n      complete\n      refreshRequired\n      nextCursor\n    }\n  }\n}",
    "resultType": "SearchReply!",
    "inputFields": [
      "query",
      "pageSize",
      "scope",
      "cursor",
      "actAsPrincipalId"
    ]
  },
  "communication.resolveRequest": {
    "plane": "communication",
    "kind": "query",
    "idempotency": "safe",
    "field": "resolveRequest",
    "operationName": "CommunicationResolveRequest",
    "query": "query CommunicationResolveRequest($context: RequestContextInput!, $input: ResolveRequestRequestInput!) {\n  resolveRequest(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      state\n      requestId\n      checkedAt\n      resultWithheld\n      receipt {\n        status\n        requestId\n        serverTime\n        receiptId\n        committedAt\n        replayed\n        operation {\n          operationId\n          owner\n          href\n          state\n        }\n        resourceRef {\n          kind\n          id\n        }\n        result {\n          agentGrant {\n            grantId\n            orgId\n            signupId\n            agentActorId\n            projectId\n            scopes\n            expiresAt\n            revokedAt\n            createdAt\n            keys {\n              operationId\n              state\n              scopes\n              expiresAt\n              keyId\n              deliveryId\n              deliveryExpiresAt\n            }\n          }\n          agentSignupStatus {\n            signupId\n            state\n            orgId\n            deploymentId\n            projectId\n            nextStep\n            scopes\n            grantExpiresAt\n            keys {\n              operationId\n              state\n              scopes\n              expiresAt\n              keyId\n              deliveryId\n              deliveryExpiresAt\n            }\n            incarnation\n            servingEpoch\n          }\n          billingCheckoutSession {\n            orgId\n            planId\n            url\n            expiresAt\n          }\n          billingPortalSession {\n            orgId\n            url\n            expiresAt\n          }\n          broadcastPermissionChanged {\n            member {\n              conversationId\n              principalId\n              role\n              status\n              membershipEpoch\n              visibilityEpoch\n              revision\n              visibleFromSequence\n              canStartBroadcast\n            }\n            mediaCutoff {\n              state\n              scope {\n                kind\n                liveSessionId\n                generation\n                participationId\n              }\n              evidence\n              enforcedAt\n              operationId\n            }\n          }\n          conversation {\n            conversationId\n            revision\n            title\n            props\n            latestSequence\n            membership {\n              conversationId\n              principalId\n              role\n              status\n              membershipEpoch\n              visibilityEpoch\n              revision\n              visibleFromSequence\n              canStartBroadcast\n            }\n          }\n          conversationMemberBatch {\n            items {\n              conversationId\n              principalId\n              role\n              status\n              membershipEpoch\n              visibilityEpoch\n              revision\n              visibleFromSequence\n              canStartBroadcast\n            }\n          }\n          conversationMute {\n            conversationId\n            principalId\n            muted\n            until\n          }\n          credentialDeliveryReceipt {\n            deliveryId\n          }\n          deliveryAck {\n            deliveryId\n            acknowledged\n          }\n          liveAlertBatch {\n            liveSessionId\n            created\n            suppressed\n          }\n          liveCredentialIssuance {\n            liveSessionId\n            participationId\n            generation\n            leaseId\n            grantOrdinal\n            admissionExpiresAt\n            leaseExpiresAt\n          }\n          liveSessionEndRequested {\n            liveSessionId\n            operationId\n            mediaCutoff {\n              state\n              scope {\n                kind\n                liveSessionId\n                generation\n                participationId\n              }\n              evidence\n              enforcedAt\n              operationId\n            }\n          }\n          liveSessionJoined {\n            liveSessionId\n            generation\n            participation {\n              participationId\n              principalId\n              membershipEpoch\n              role\n              state\n              permissions {\n                microphone\n                camera\n                subscribe\n              }\n              reservationExpiresAt\n              nativeConnectionId\n              mediaCutoff {\n                state\n                scope {\n                  kind\n                  liveSessionId\n                  generation\n                  participationId\n                }\n                evidence\n                enforcedAt\n                operationId\n              }\n            }\n          }\n          liveSessionLeft {\n            liveSessionId\n            participationId\n            mediaCutoff {\n              state\n              scope {\n                kind\n                liveSessionId\n                generation\n                participationId\n              }\n              evidence\n              enforcedAt\n              operationId\n            }\n          }\n          liveSessionStarted {\n            liveSessionId\n            conversationId\n            kind\n            mediaProfile\n            operationId\n          }\n          member {\n            conversationId\n            principalId\n            role\n            status\n            membershipEpoch\n            visibilityEpoch\n            revision\n            visibleFromSequence\n            canStartBroadcast\n          }\n          message {\n            messageId\n            conversationId\n            authorId\n            sequence\n            revision\n            revisionSequence\n            createdAt\n            deleted\n            text\n            props\n            editedAt\n          }\n          messageAck {\n            messageId\n            conversationId\n            sequence\n            revision\n            status\n            cursor {\n              incarnation\n              conversationId\n              sequence\n            }\n          }\n          organization {\n            orgId\n            name\n            status\n            revision\n          }\n          organizationSpend {\n            orgId\n            planId\n            currency\n            catalogVersion\n            monthlySpendCap\n            agentPurchaseLimit\n            updatedAt\n            monthlyMinimum\n            periodStart\n            periodEnd\n            credits\n            charges\n            margin\n            stop\n            refusedMeters\n            evaluatedAt\n            usageThrough\n            validUntil\n            minimumCredit\n            chargeLimit\n          }\n          principal {\n            principalId\n            externalUserId\n            status\n            revision\n          }\n          readReceipt {\n            principalId\n            membershipEpoch\n            visibilityEpoch\n            deliveredThroughSequence\n            readThroughSequence\n            updatedAt\n          }\n          sessionBootstrap {\n            session {\n              sessionId\n              principalId\n              deviceId\n              incarnation\n              sessionRevision\n              expiresAt\n              status\n            }\n            tokenExpiresAt\n            sessionToken\n          }\n          sessionRevocation {\n            sessionId\n            status\n            mediaCutoff {\n              state\n              scope {\n                kind\n                principalId\n                sessionId\n                deviceId\n                callId\n              }\n            }\n          }\n          signedProof\n        }\n      }\n    }\n  }\n}",
    "resultType": "ResolveRequestReply!",
    "inputFields": [
      "requestId"
    ]
  },
  "communication.getOperation": {
    "plane": "communication",
    "kind": "query",
    "idempotency": "safe",
    "field": "getOperation",
    "operationName": "CommunicationGetOperation",
    "query": "query CommunicationGetOperation($context: RequestContextInput!, $input: GetOperationRequestInput!) {\n  getOperation(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      operationId\n      kind\n      targetRef {\n        kind\n        id\n      }\n      state\n      revision\n      requestedAt\n      updatedAt\n      steps {\n        stepId\n        state\n      }\n      result {\n        projectId\n        incarnation\n        status\n        backend\n        environment\n        policyRevision\n        expiresAt\n        kind\n        resourceRef {\n          kind\n          id\n        }\n        delivery {\n          deliveryId\n          kind\n          projectId\n          installationId\n          resourceRef {\n            kind\n            id\n          }\n          expiresAt\n          payloadDigest\n          recipientActorRef {\n            tenantId\n            objectId\n          }\n        }\n        keyId\n        endpointId\n        enabled\n        liveSessionCompletion {\n          liveSessionId\n          generation\n          state\n          revision\n          completedAt\n          mediaCutoff {\n            state\n            scope {\n              kind\n              liveSessionId\n              generation\n              participationId\n            }\n            evidence\n            enforcedAt\n            operationId\n          }\n        }\n        replayedDeliveries\n        skippedDeliveries\n        messagePreview\n      }\n      blockedReason\n    }\n  }\n}",
    "resultType": "GetOperationReply!",
    "inputFields": [
      "operationId"
    ]
  },
  "communication.conversationMute": {
    "plane": "communication",
    "kind": "query",
    "idempotency": "safe",
    "field": "conversationMute",
    "operationName": "CommunicationConversationMute",
    "query": "query CommunicationConversationMute($context: RequestContextInput!, $input: ConversationMuteInput!) {\n  conversationMute(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    result {\n      conversationId\n      principalId\n      muted\n      until\n    }\n  }\n}",
    "resultType": "ConversationMuteReply!",
    "inputFields": [
      "conversationId",
      "actAsPrincipalId"
    ]
  },
  "communication.currentLiveSession": {
    "plane": "communication",
    "kind": "query",
    "idempotency": "safe",
    "field": "currentLiveSession",
    "operationName": "CommunicationCurrentLiveSession",
    "query": "query CommunicationCurrentLiveSession($context: RequestContextInput!, $input: ConversationLiveInput!) {\n  currentLiveSession(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    result {\n      liveSessionId\n      conversationId\n      creatorId\n      kind\n      mediaProfile\n      state\n      generation\n      revision\n      createdAt\n      expiresAt\n      myParticipation {\n        participationId\n        principalId\n        membershipEpoch\n        role\n        state\n        permissions {\n          microphone\n          camera\n          subscribe\n        }\n        reservationExpiresAt\n        nativeConnectionId\n        mediaCutoff {\n          state\n          scope {\n            kind\n            liveSessionId\n            generation\n            participationId\n          }\n          evidence\n          enforcedAt\n          operationId\n        }\n      }\n      mediaCutoff {\n        state\n        scope {\n          kind\n          liveSessionId\n          generation\n          participationId\n        }\n        evidence\n        enforcedAt\n        operationId\n      }\n    }\n  }\n}",
    "resultType": "CurrentLiveSessionReply!",
    "inputFields": [
      "conversationId"
    ]
  },
  "communication.liveSession": {
    "plane": "communication",
    "kind": "query",
    "idempotency": "safe",
    "field": "liveSession",
    "operationName": "CommunicationLiveSession",
    "query": "query CommunicationLiveSession($context: RequestContextInput!, $input: LiveSessionInput!) {\n  liveSession(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    result {\n      liveSessionId\n      conversationId\n      creatorId\n      kind\n      mediaProfile\n      state\n      generation\n      revision\n      createdAt\n      expiresAt\n      myParticipation {\n        participationId\n        principalId\n        membershipEpoch\n        role\n        state\n        permissions {\n          microphone\n          camera\n          subscribe\n        }\n        reservationExpiresAt\n        nativeConnectionId\n        mediaCutoff {\n          state\n          scope {\n            kind\n            liveSessionId\n            generation\n            participationId\n          }\n          evidence\n          enforcedAt\n          operationId\n        }\n      }\n      mediaCutoff {\n        state\n        scope {\n          kind\n          liveSessionId\n          generation\n          participationId\n        }\n        evidence\n        enforcedAt\n        operationId\n      }\n    }\n  }\n}",
    "resultType": "LiveSessionReply!",
    "inputFields": [
      "liveSessionId"
    ]
  },
  "communication.liveSessions": {
    "plane": "communication",
    "kind": "query",
    "idempotency": "safe",
    "field": "liveSessions",
    "operationName": "CommunicationLiveSessions",
    "query": "query CommunicationLiveSessions($context: RequestContextInput!, $input: LiveSessionsInput!) {\n  liveSessions(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    result {\n      items {\n        liveSessionId\n        conversationId\n        creatorId\n        kind\n        mediaProfile\n        state\n        generation\n        revision\n        createdAt\n        expiresAt\n        myParticipation {\n          participationId\n          principalId\n          membershipEpoch\n          role\n          state\n          permissions {\n            microphone\n            camera\n            subscribe\n          }\n          reservationExpiresAt\n          nativeConnectionId\n          mediaCutoff {\n            state\n            scope {\n              kind\n              liveSessionId\n              generation\n              participationId\n            }\n            evidence\n            enforcedAt\n            operationId\n          }\n        }\n        mediaCutoff {\n          state\n          scope {\n            kind\n            liveSessionId\n            generation\n            participationId\n          }\n          evidence\n          enforcedAt\n          operationId\n        }\n      }\n      nextCursor\n      complete\n      partialReason\n      refreshRequired\n    }\n  }\n}",
    "resultType": "LiveSessionPageReply!",
    "inputFields": [
      "conversationId",
      "limit",
      "cursor"
    ]
  },
  "communication.liveSessionParticipants": {
    "plane": "communication",
    "kind": "query",
    "idempotency": "safe",
    "field": "liveSessionParticipants",
    "operationName": "CommunicationLiveSessionParticipants",
    "query": "query CommunicationLiveSessionParticipants($context: RequestContextInput!, $input: LiveParticipantsInput!) {\n  liveSessionParticipants(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    result {\n      items {\n        participationId\n        principalId\n        membershipEpoch\n        role\n        state\n        permissions {\n          microphone\n          camera\n          subscribe\n        }\n        reservationExpiresAt\n        nativeConnectionId\n        mediaCutoff {\n          state\n          scope {\n            kind\n            liveSessionId\n            generation\n            participationId\n          }\n          evidence\n          enforcedAt\n          operationId\n        }\n      }\n      nextCursor\n      complete\n      partialReason\n      refreshRequired\n    }\n  }\n}",
    "resultType": "LiveParticipantPageReply!",
    "inputFields": [
      "liveSessionId",
      "limit",
      "cursor"
    ]
  },
  "communication.liveSessionAlerts": {
    "plane": "communication",
    "kind": "query",
    "idempotency": "safe",
    "field": "liveSessionAlerts",
    "operationName": "CommunicationLiveSessionAlerts",
    "query": "query CommunicationLiveSessionAlerts($context: RequestContextInput!, $input: LiveAlertsInput!) {\n  liveSessionAlerts(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    result {\n      items {\n        alertId\n        liveSessionId\n        conversationId\n        generation\n        membershipEpoch\n        createdAt\n        expiresAt\n      }\n      nextCursor\n      complete\n      partialReason\n      refreshRequired\n    }\n  }\n}",
    "resultType": "LiveAlertPageReply!",
    "inputFields": [
      "limit",
      "cursor"
    ]
  },
  "communication.liveSessionOperation": {
    "plane": "communication",
    "kind": "query",
    "idempotency": "safe",
    "field": "liveSessionOperation",
    "operationName": "CommunicationLiveSessionOperation",
    "query": "query CommunicationLiveSessionOperation($context: RequestContextInput!, $input: LiveSessionOperationInput!) {\n  liveSessionOperation(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    result {\n      operationId\n      requestId\n      liveSessionId\n      kind\n      state\n      revision\n      requestedAt\n      completedAt\n      completion {\n        liveSessionId\n        generation\n        state\n        revision\n        completedAt\n        mediaCutoff {\n          state\n          scope {\n            kind\n            liveSessionId\n            generation\n            participationId\n          }\n          evidence\n          enforcedAt\n          operationId\n        }\n      }\n      failure {\n        code\n        message\n      }\n    }\n  }\n}",
    "resultType": "LiveSessionOperationReply!",
    "inputFields": [
      "operationId"
    ]
  },
  "communication.sessionRequestOutcome": {
    "plane": "communication",
    "kind": "query",
    "idempotency": "safe",
    "field": "sessionRequestOutcome",
    "operationName": "CommunicationSessionRequestOutcome",
    "query": "query CommunicationSessionRequestOutcome($context: RequestContextInput!, $input: SessionRequestOutcomeRequestInput!) {\n  sessionRequestOutcome(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    result {\n      state\n      requestId\n      checkedAt\n      operation\n      receiptId\n      committedAt\n      originalSession {\n        sessionId\n        principalId\n        deviceId\n        incarnation\n        sessionRevision\n        expiresAt\n        status\n      }\n      currentSession {\n        sessionId\n        principalId\n        deviceId\n        incarnation\n        sessionRevision\n        expiresAt\n        status\n      }\n      currentState\n    }\n  }\n}",
    "resultType": "SessionRequestOutcomeReply!",
    "inputFields": [
      "requestId"
    ]
  },
  "communication.createPrincipal": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "createPrincipal",
    "operationName": "CommunicationCreatePrincipal",
    "query": "mutation CommunicationCreatePrincipal($context: RequestContextInput!, $input: CreatePrincipalRequestInput!) {\n  createPrincipal(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      principalId\n      externalUserId\n      status\n      revision\n    }\n  }\n}",
    "resultType": "CreatePrincipalReply!",
    "inputFields": [
      "externalUserId"
    ]
  },
  "communication.disablePrincipal": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "disablePrincipal",
    "operationName": "CommunicationDisablePrincipal",
    "query": "mutation CommunicationDisablePrincipal($context: RequestContextInput!, $input: DisablePrincipalRequestInput!) {\n  disablePrincipal(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      principalId\n      externalUserId\n      status\n      revision\n    }\n  }\n}",
    "resultType": "DisablePrincipalReply!",
    "inputFields": [
      "principalId",
      "expectedRevision"
    ]
  },
  "communication.issueSession": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "issueSession",
    "operationName": "CommunicationIssueSession",
    "query": "mutation CommunicationIssueSession($context: RequestContextInput!, $input: IssueSessionRequestInput!) {\n  issueSession(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      session {\n        sessionId\n        principalId\n        deviceId\n        incarnation\n        sessionRevision\n        expiresAt\n        status\n      }\n      tokenExpiresAt\n      sessionToken\n    }\n  }\n}",
    "resultType": "IssueSessionReply!",
    "inputFields": [
      "principalId",
      "deviceId",
      "requestedTtlMs"
    ]
  },
  "communication.renewSession": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "renewSession",
    "operationName": "CommunicationRenewSession",
    "query": "mutation CommunicationRenewSession($context: RequestContextInput!, $input: RenewSessionRequestInput!) {\n  renewSession(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      session {\n        sessionId\n        principalId\n        deviceId\n        incarnation\n        sessionRevision\n        expiresAt\n        status\n      }\n      tokenExpiresAt\n      sessionToken\n    }\n  }\n}",
    "resultType": "RenewSessionReply!",
    "inputFields": [
      "sessionId",
      "principalId",
      "deviceId",
      "expectedRevision",
      "requestedTtlMs"
    ]
  },
  "communication.revokeSession": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "revokeSession",
    "operationName": "CommunicationRevokeSession",
    "query": "mutation CommunicationRevokeSession($context: RequestContextInput!, $input: RevokeSessionRequestInput!) {\n  revokeSession(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      sessionId\n      status\n      mediaCutoff {\n        state\n        scope {\n          kind\n          principalId\n          sessionId\n          deviceId\n          callId\n        }\n      }\n    }\n  }\n}",
    "resultType": "RevokeSessionReply!",
    "inputFields": [
      "sessionId",
      "expectedRevision"
    ]
  },
  "communication.createConversation": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "createConversation",
    "operationName": "CommunicationCreateConversation",
    "query": "mutation CommunicationCreateConversation($context: RequestContextInput!, $input: CreateConversationRequestInput!) {\n  createConversation(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      conversationId\n      revision\n      title\n      props\n      latestSequence\n      membership {\n        conversationId\n        principalId\n        role\n        status\n        membershipEpoch\n        visibilityEpoch\n        revision\n        visibleFromSequence\n        canStartBroadcast\n      }\n    }\n  }\n}",
    "resultType": "CreateConversationReply!",
    "inputFields": [
      "title",
      "props",
      "members"
    ]
  },
  "communication.updateConversation": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "updateConversation",
    "operationName": "CommunicationUpdateConversation",
    "query": "mutation CommunicationUpdateConversation($context: RequestContextInput!, $input: UpdateConversationRequestInput!) {\n  updateConversation(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      conversationId\n      revision\n      title\n      props\n      latestSequence\n      membership {\n        conversationId\n        principalId\n        role\n        status\n        membershipEpoch\n        visibilityEpoch\n        revision\n        visibleFromSequence\n        canStartBroadcast\n      }\n    }\n  }\n}",
    "resultType": "UpdateConversationReply!",
    "inputFields": [
      "conversationId",
      "expectedRevision",
      "title",
      "props"
    ]
  },
  "communication.addMember": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "addMember",
    "operationName": "CommunicationAddMember",
    "query": "mutation CommunicationAddMember($context: RequestContextInput!, $input: AddMemberRequestInput!) {\n  addMember(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      conversationId\n      principalId\n      role\n      status\n      membershipEpoch\n      visibilityEpoch\n      revision\n      visibleFromSequence\n      canStartBroadcast\n    }\n  }\n}",
    "resultType": "AddMemberReply!",
    "inputFields": [
      "conversationId",
      "principalId",
      "role",
      "expectedRevision"
    ]
  },
  "communication.addMembers": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "addMembers",
    "operationName": "CommunicationAddMembers",
    "query": "mutation CommunicationAddMembers($context: RequestContextInput!, $input: AddMembersInput!) {\n  addMembers(context: $context, input: $input) {\n    status\n    requestId\n    receiptId\n    committedAt\n    replayed\n    result {\n      items {\n        conversationId\n        principalId\n        role\n        status\n        membershipEpoch\n        visibilityEpoch\n        revision\n        visibleFromSequence\n        canStartBroadcast\n      }\n    }\n  }\n}",
    "resultType": "AddMembersPayload!",
    "inputFields": [
      "conversationId",
      "members"
    ]
  },
  "communication.removeMember": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "removeMember",
    "operationName": "CommunicationRemoveMember",
    "query": "mutation CommunicationRemoveMember($context: RequestContextInput!, $input: RemoveMemberRequestInput!) {\n  removeMember(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      conversationId\n      principalId\n      role\n      status\n      membershipEpoch\n      visibilityEpoch\n      revision\n      visibleFromSequence\n      canStartBroadcast\n    }\n  }\n}",
    "resultType": "RemoveMemberReply!",
    "inputFields": [
      "conversationId",
      "principalId",
      "expectedRevision"
    ]
  },
  "communication.historyGrant": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "historyGrant",
    "operationName": "CommunicationHistoryGrant",
    "query": "mutation CommunicationHistoryGrant($context: RequestContextInput!, $input: HistoryGrantRequestInput!) {\n  historyGrant(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      conversationId\n      principalId\n      role\n      status\n      membershipEpoch\n      visibilityEpoch\n      revision\n      visibleFromSequence\n      canStartBroadcast\n    }\n  }\n}",
    "resultType": "HistoryGrantReply!",
    "inputFields": [
      "conversationId",
      "principalId",
      "membershipEpoch",
      "expectedRevision",
      "fromSequence"
    ]
  },
  "communication.sendMessage": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "sendMessage",
    "operationName": "CommunicationSendMessage",
    "query": "mutation CommunicationSendMessage($context: RequestContextInput!, $input: SendMessageRequestInput!) {\n  sendMessage(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      messageId\n      conversationId\n      sequence\n      revision\n      status\n      cursor {\n        incarnation\n        conversationId\n        sequence\n      }\n    }\n  }\n}",
    "resultType": "SendMessageReply!",
    "inputFields": [
      "conversationId",
      "text",
      "props",
      "actAsPrincipalId"
    ]
  },
  "communication.editMessage": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "editMessage",
    "operationName": "CommunicationEditMessage",
    "query": "mutation CommunicationEditMessage($context: RequestContextInput!, $input: EditMessageRequestInput!) {\n  editMessage(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      messageId\n      conversationId\n      authorId\n      sequence\n      revision\n      revisionSequence\n      createdAt\n      deleted\n      text\n      props\n      editedAt\n    }\n  }\n}",
    "resultType": "EditMessageReply!",
    "inputFields": [
      "conversationId",
      "messageId",
      "expectedRevision",
      "text",
      "props"
    ]
  },
  "communication.deleteMessage": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "deleteMessage",
    "operationName": "CommunicationDeleteMessage",
    "query": "mutation CommunicationDeleteMessage($context: RequestContextInput!, $input: DeleteMessageRequestInput!) {\n  deleteMessage(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      messageId\n      conversationId\n      authorId\n      sequence\n      revision\n      revisionSequence\n      createdAt\n      deleted\n      text\n      props\n      editedAt\n    }\n  }\n}",
    "resultType": "DeleteMessageReply!",
    "inputFields": [
      "conversationId",
      "messageId",
      "expectedRevision"
    ]
  },
  "communication.reportReceipt": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "reportReceipt",
    "operationName": "CommunicationReportReceipt",
    "query": "mutation CommunicationReportReceipt($context: RequestContextInput!, $input: ReportReceiptRequestInput!) {\n  reportReceipt(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      principalId\n      membershipEpoch\n      visibilityEpoch\n      deliveredThroughSequence\n      readThroughSequence\n      updatedAt\n    }\n  }\n}",
    "resultType": "ReportReceiptReply!",
    "inputFields": [
      "conversationId",
      "kind",
      "membershipEpoch",
      "visibilityEpoch",
      "throughSequence"
    ]
  },
  "communication.typing": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "ephemeral",
    "field": "typing",
    "operationName": "CommunicationTyping",
    "query": "mutation CommunicationTyping($context: RequestContextInput!, $input: TypingRequestInput!) {\n  typing(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      accepted\n    }\n  }\n}",
    "resultType": "TypingReply!",
    "inputFields": [
      "conversationId",
      "isTyping"
    ]
  },
  "communication.setBroadcastPermission": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "setBroadcastPermission",
    "operationName": "CommunicationSetBroadcastPermission",
    "query": "mutation CommunicationSetBroadcastPermission($context: RequestContextInput!, $input: SetBroadcastPermissionInput!) {\n  setBroadcastPermission(context: $context, input: $input) {\n    status\n    requestId\n    receiptId\n    committedAt\n    replayed\n    result {\n      member {\n        conversationId\n        principalId\n        role\n        status\n        membershipEpoch\n        visibilityEpoch\n        revision\n        visibleFromSequence\n        canStartBroadcast\n      }\n      mediaCutoff {\n        state\n        scope {\n          kind\n          liveSessionId\n          generation\n          participationId\n        }\n        evidence\n        enforcedAt\n        operationId\n      }\n    }\n  }\n}",
    "resultType": "SetBroadcastPermissionPayload!",
    "inputFields": [
      "conversationId",
      "principalId",
      "allowed",
      "expectedMembershipRevision"
    ]
  },
  "communication.setConversationMute": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "setConversationMute",
    "operationName": "CommunicationSetConversationMute",
    "query": "mutation CommunicationSetConversationMute($context: RequestContextInput!, $input: SetConversationMuteInput!) {\n  setConversationMute(context: $context, input: $input) {\n    status\n    requestId\n    receiptId\n    committedAt\n    replayed\n    result {\n      conversationId\n      principalId\n      muted\n      until\n    }\n  }\n}",
    "resultType": "SetConversationMutePayload!",
    "inputFields": [
      "conversationId",
      "muted",
      "until",
      "actAsPrincipalId"
    ]
  },
  "communication.startLiveSession": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "startLiveSession",
    "operationName": "CommunicationStartLiveSession",
    "query": "mutation CommunicationStartLiveSession($context: RequestContextInput!, $input: StartLiveSessionInput!) {\n  startLiveSession(context: $context, input: $input) {\n    status\n    requestId\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    result {\n      liveSessionId\n      conversationId\n      kind\n      mediaProfile\n      operationId\n    }\n  }\n}",
    "resultType": "StartLiveSessionPayload!",
    "inputFields": [
      "conversationId",
      "kind",
      "mediaProfile"
    ]
  },
  "communication.joinLiveSession": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "joinLiveSession",
    "operationName": "CommunicationJoinLiveSession",
    "query": "mutation CommunicationJoinLiveSession($context: RequestContextInput!, $input: JoinLiveSessionInput!) {\n  joinLiveSession(context: $context, input: $input) {\n    status\n    requestId\n    receiptId\n    committedAt\n    replayed\n    result {\n      liveSessionId\n      generation\n      participation {\n        participationId\n        principalId\n        membershipEpoch\n        role\n        state\n        permissions {\n          microphone\n          camera\n          subscribe\n        }\n        reservationExpiresAt\n        nativeConnectionId\n        mediaCutoff {\n          state\n          scope {\n            kind\n            liveSessionId\n            generation\n            participationId\n          }\n          evidence\n          enforcedAt\n          operationId\n        }\n      }\n    }\n  }\n}",
    "resultType": "JoinLiveSessionPayload!",
    "inputFields": [
      "liveSessionId",
      "expectedGeneration"
    ]
  },
  "communication.alertLiveSession": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "alertLiveSession",
    "operationName": "CommunicationAlertLiveSession",
    "query": "mutation CommunicationAlertLiveSession($context: RequestContextInput!, $input: AlertLiveSessionInput!) {\n  alertLiveSession(context: $context, input: $input) {\n    status\n    requestId\n    receiptId\n    committedAt\n    replayed\n    result {\n      liveSessionId\n      created\n      suppressed\n    }\n  }\n}",
    "resultType": "AlertLiveSessionPayload!",
    "inputFields": [
      "liveSessionId",
      "expectedGeneration",
      "principalIds"
    ]
  },
  "communication.leaveLiveSession": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "leaveLiveSession",
    "operationName": "CommunicationLeaveLiveSession",
    "query": "mutation CommunicationLeaveLiveSession($context: RequestContextInput!, $input: LeaveLiveSessionInput!) {\n  leaveLiveSession(context: $context, input: $input) {\n    status\n    requestId\n    receiptId\n    committedAt\n    replayed\n    result {\n      liveSessionId\n      participationId\n      mediaCutoff {\n        state\n        scope {\n          kind\n          liveSessionId\n          generation\n          participationId\n        }\n        evidence\n        enforcedAt\n        operationId\n      }\n    }\n  }\n}",
    "resultType": "LeaveLiveSessionPayload!",
    "inputFields": [
      "liveSessionId",
      "expectedGeneration",
      "participationId"
    ]
  },
  "communication.endLiveSession": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "endLiveSession",
    "operationName": "CommunicationEndLiveSession",
    "query": "mutation CommunicationEndLiveSession($context: RequestContextInput!, $input: EndLiveSessionInput!) {\n  endLiveSession(context: $context, input: $input) {\n    status\n    requestId\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    result {\n      liveSessionId\n      operationId\n      mediaCutoff {\n        state\n        scope {\n          kind\n          liveSessionId\n          generation\n          participationId\n        }\n        evidence\n        enforcedAt\n        operationId\n      }\n    }\n  }\n}",
    "resultType": "EndLiveSessionPayload!",
    "inputFields": [
      "liveSessionId",
      "expectedGeneration",
      "expectedRevision"
    ]
  },
  "communication.liveSessionCredentials": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "singleUse",
    "field": "liveSessionCredentials",
    "operationName": "CommunicationLiveSessionCredentials",
    "query": "mutation CommunicationLiveSessionCredentials($context: RequestContextInput!, $input: LiveSessionCredentialsInput!) {\n  liveSessionCredentials(context: $context, input: $input) {\n    status\n    requestId\n    receiptId\n    committedAt\n    replayed\n    result {\n      liveSessionId\n      participationId\n      generation\n      roomName\n      participantIdentity\n      livekitUrl\n      transportToken\n      admissionTicket\n      forwardingLease\n      transportExpiresAt\n      admissionExpiresAt\n      leaseExpiresAt\n      leasePolicyId\n      connectToken\n    }\n  }\n}",
    "resultType": "LiveSessionCredentialsPayload!",
    "inputFields": [
      "liveSessionId",
      "participationId",
      "expectedGeneration",
      "mode",
      "replacementOfConnectionId"
    ]
  },
  "communication.redeemCredential": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "permitBound",
    "field": "redeemCredential",
    "operationName": "CommunicationRedeemCredential",
    "query": "mutation CommunicationRedeemCredential($context: RequestContextInput!, $input: RedeemCredentialRequestInput!) {\n  redeemCredential(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      kind\n      keyId\n      backendPrincipalId\n      backendKey\n      expiresAt\n      endpointId\n      secretVersion\n      secret\n    }\n  }\n}",
    "resultType": "RedeemCredentialReply!",
    "inputFields": [
      "deliveryId"
    ]
  },
  "communication.acknowledgeCredential": {
    "plane": "communication",
    "kind": "mutation",
    "idempotency": "permitBound",
    "field": "acknowledgeCredential",
    "operationName": "CommunicationAcknowledgeCredential",
    "query": "mutation CommunicationAcknowledgeCredential($context: RequestContextInput!, $input: AcknowledgeCredentialRequestInput!) {\n  acknowledgeCredential(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      deliveryId\n      acknowledged\n    }\n  }\n}",
    "resultType": "AcknowledgeCredentialReply!",
    "inputFields": [
      "deliveryId"
    ]
  },
  "communication.conversationEvents": {
    "plane": "communication",
    "kind": "subscription",
    "idempotency": "safe",
    "field": "conversationEvents",
    "operationName": "CommunicationConversationEvents",
    "query": "subscription CommunicationConversationEvents($context: RequestContextInput!, $input: EventsRequestInput!) {\n  conversationEvents(context: $context, input: $input) {\n    items {\n      eventId\n      conversationId\n      sequence\n      type\n      occurredAt\n      subjectRef {\n        kind\n        id\n      }\n      payload {\n        messageId\n        revision\n        revisionSequence\n        principalId\n        membershipEpoch\n        visibilityEpoch\n        kind\n        throughSequence\n        callId\n        generation\n        state\n        cutoffEvidence\n        liveSessionId\n      }\n    }\n    complete\n    refreshRequired\n    nextCursor {\n      incarnation\n      conversationId\n      sequence\n    }\n  }\n}",
    "resultType": "EventPage!",
    "inputFields": [
      "conversationId",
      "limit",
      "after"
    ]
  },
  "management.capabilities": {
    "plane": "management",
    "kind": "query",
    "idempotency": "safe",
    "field": "capabilities",
    "operationName": "ManagementCapabilities",
    "query": "query ManagementCapabilities($context: RequestContextInput!) {\n  capabilities(context: $context) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      serverRelease\n      capabilityRevision\n      limitsRevision\n      features {\n        chat\n        inbox\n        lexicalSearch\n        typing\n        webhooks\n        liveSessions\n        liveBroadcast\n      }\n      limits {\n        key\n        value {\n          maximum\n          unit\n          scope\n          milliseconds\n          policyId\n          revision\n        }\n      }\n      environment\n      productionQualified\n      mediaPolicy {\n        leasePolicyId\n        maxLeaseMs\n        renewAttemptMs\n        preludeMaxBytes\n        preludeTimeoutMs\n        clockProfileId\n      }\n      geoControlAuthorityId\n      offerings\n      geos\n      installationProfiles\n      portalIdentity\n    }\n  }\n}",
    "resultType": "CapabilitiesReply!",
    "inputFields": []
  },
  "management.organizations": {
    "plane": "management",
    "kind": "query",
    "idempotency": "safe",
    "field": "organizations",
    "operationName": "ManagementOrganizations",
    "query": "query ManagementOrganizations($context: RequestContextInput!) {\n  organizations(context: $context) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      items {\n        orgId\n        name\n        status\n        revision\n      }\n      complete\n      refreshRequired\n      nextCursor\n    }\n  }\n}",
    "resultType": "OrganizationsReply!",
    "inputFields": []
  },
  "management.getOrganization": {
    "plane": "management",
    "kind": "query",
    "idempotency": "safe",
    "field": "getOrganization",
    "operationName": "ManagementGetOrganization",
    "query": "query ManagementGetOrganization($context: RequestContextInput!, $input: GetOrganizationRequestInput!) {\n  getOrganization(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      orgId\n      name\n      status\n      revision\n    }\n  }\n}",
    "resultType": "GetOrganizationReply!",
    "inputFields": [
      "orgId"
    ]
  },
  "management.getDeployment": {
    "plane": "management",
    "kind": "query",
    "idempotency": "safe",
    "field": "getDeployment",
    "operationName": "ManagementGetDeployment",
    "query": "query ManagementGetDeployment($context: RequestContextInput!, $input: GetDeploymentRequestInput!) {\n  getDeployment(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      deploymentId\n      orgId\n      offering\n      geoId\n      installationId\n      resourceOwner\n      approvedRegions\n      readiness\n      revision\n      consentRef\n      environment\n    }\n  }\n}",
    "resultType": "GetDeploymentReply!",
    "inputFields": [
      "deploymentId"
    ]
  },
  "management.getProject": {
    "plane": "management",
    "kind": "query",
    "idempotency": "safe",
    "field": "getProject",
    "operationName": "ManagementGetProject",
    "query": "query ManagementGetProject($context: RequestContextInput!, $input: GetProjectRequestInput!) {\n  getProject(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      projectId\n      deploymentId\n      name\n      environment\n      incarnation\n      servingRegion\n      servingEpoch\n      status\n      revision\n      policyRevision\n      messagePreview\n    }\n  }\n}",
    "resultType": "GetProjectReply!",
    "inputFields": [
      "projectId"
    ]
  },
  "management.deploymentHealth": {
    "plane": "management",
    "kind": "query",
    "idempotency": "safe",
    "field": "deploymentHealth",
    "operationName": "ManagementDeploymentHealth",
    "query": "query ManagementDeploymentHealth($context: RequestContextInput!, $input: DeploymentHealthRequestInput!) {\n  deploymentHealth(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      deploymentId\n      readiness\n      observedAt\n      services {\n        role\n        observedAt\n        details {\n          status\n        }\n      }\n    }\n  }\n}",
    "resultType": "DeploymentHealthReply!",
    "inputFields": [
      "deploymentId"
    ]
  },
  "management.deploymentUsage": {
    "plane": "management",
    "kind": "query",
    "idempotency": "safe",
    "field": "deploymentUsage",
    "operationName": "ManagementDeploymentUsage",
    "query": "query ManagementDeploymentUsage($context: RequestContextInput!, $input: DeploymentUsageRequestInput!) {\n  deploymentUsage(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      deploymentId\n      source\n      observedAt\n      complete\n      reason\n      from\n      to\n      meters {\n        meter\n        unit\n        quantity\n        emitted\n      }\n      aggregatedThrough\n    }\n  }\n}",
    "resultType": "DeploymentUsageReply!",
    "inputFields": [
      "deploymentId",
      "from",
      "to"
    ]
  },
  "management.projectUsage": {
    "plane": "management",
    "kind": "query",
    "idempotency": "safe",
    "field": "projectUsage",
    "operationName": "ManagementProjectUsage",
    "query": "query ManagementProjectUsage($context: RequestContextInput!, $input: ProjectUsageRequestInput!) {\n  projectUsage(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      projectId\n      source\n      observedAt\n      complete\n      reason\n      from\n      to\n      meters {\n        meter\n        unit\n        quantity\n        emitted\n      }\n      aggregatedThrough\n    }\n  }\n}",
    "resultType": "ProjectUsageReply!",
    "inputFields": [
      "projectId",
      "from",
      "to"
    ]
  },
  "management.organizationUsage": {
    "plane": "management",
    "kind": "query",
    "idempotency": "safe",
    "field": "organizationUsage",
    "operationName": "ManagementOrganizationUsage",
    "query": "query ManagementOrganizationUsage($context: RequestContextInput!, $input: OrganizationUsageRequestInput!) {\n  organizationUsage(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      orgId\n      source\n      observedAt\n      complete\n      reason\n      from\n      to\n      meters {\n        meter\n        unit\n        quantity\n        emitted\n      }\n      aggregatedThrough\n    }\n  }\n}",
    "resultType": "OrganizationUsageReply!",
    "inputFields": [
      "orgId",
      "from",
      "to"
    ]
  },
  "management.organizationBilling": {
    "plane": "management",
    "kind": "query",
    "idempotency": "safe",
    "field": "organizationBilling",
    "operationName": "ManagementOrganizationBilling",
    "query": "query ManagementOrganizationBilling($context: RequestContextInput!, $input: OrganizationBillingRequestInput!) {\n  organizationBilling(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      orgId\n      planId\n      standing\n      graceUntil\n      subscriptionStatus\n      currentPeriodEnd\n      cancelAtPeriodEnd\n      catalogVersion\n      configured\n      billed\n    }\n  }\n}",
    "resultType": "OrganizationBillingReply!",
    "inputFields": [
      "orgId"
    ]
  },
  "management.webhookEndpoints": {
    "plane": "management",
    "kind": "query",
    "idempotency": "safe",
    "field": "webhookEndpoints",
    "operationName": "ManagementWebhookEndpoints",
    "query": "query ManagementWebhookEndpoints($context: RequestContextInput!, $input: WebhookEndpointsRequestInput!) {\n  webhookEndpoints(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      items {\n        endpointId\n        url\n        eventTypes\n        enabled\n        status\n        disabledReason\n        revision\n        secretVersion\n        rotationPending\n        rotationOverlapUntil\n        consecutiveFailures\n        failingSince\n        lastSuccessAt\n        lastFailureAt\n      }\n      complete\n      refreshRequired\n      nextCursor\n      observedAt\n      partialReason\n    }\n  }\n}",
    "resultType": "WebhookEndpointsReply!",
    "inputFields": [
      "projectId"
    ]
  },
  "management.webhookDeliveries": {
    "plane": "management",
    "kind": "query",
    "idempotency": "safe",
    "field": "webhookDeliveries",
    "operationName": "ManagementWebhookDeliveries",
    "query": "query ManagementWebhookDeliveries($context: RequestContextInput!, $input: WebhookDeliveriesRequestInput!) {\n  webhookDeliveries(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      items {\n        effectId\n        eventId\n        state\n        attempts\n        lastOutcome\n        nextAttemptAt\n        eventType\n        createdAt\n        replayedAt\n        lastAttemptAt\n        lastHttpStatus\n        lastLatencyMs\n        lastErrorCode\n      }\n      complete\n      refreshRequired\n      nextCursor\n      observedAt\n      partialReason\n      sourceRevision\n    }\n  }\n}",
    "resultType": "WebhookDeliveriesReply!",
    "inputFields": [
      "projectId",
      "endpointId"
    ]
  },
  "management.resolveRequest": {
    "plane": "management",
    "kind": "query",
    "idempotency": "safe",
    "field": "resolveRequest",
    "operationName": "ManagementResolveRequest",
    "query": "query ManagementResolveRequest($context: RequestContextInput!, $input: ResolveRequestRequestInput!) {\n  resolveRequest(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      state\n      requestId\n      checkedAt\n      resultWithheld\n      receipt {\n        status\n        requestId\n        serverTime\n        receiptId\n        committedAt\n        replayed\n        operation {\n          operationId\n          owner\n          href\n          state\n        }\n        resourceRef {\n          kind\n          id\n        }\n        result {\n          agentGrant {\n            grantId\n            orgId\n            signupId\n            agentActorId\n            projectId\n            scopes\n            expiresAt\n            revokedAt\n            createdAt\n            keys {\n              operationId\n              state\n              scopes\n              expiresAt\n              keyId\n              deliveryId\n              deliveryExpiresAt\n            }\n          }\n          agentSignupStatus {\n            signupId\n            state\n            orgId\n            deploymentId\n            projectId\n            nextStep\n            scopes\n            grantExpiresAt\n            keys {\n              operationId\n              state\n              scopes\n              expiresAt\n              keyId\n              deliveryId\n              deliveryExpiresAt\n            }\n            incarnation\n            servingEpoch\n          }\n          billingCheckoutSession {\n            orgId\n            planId\n            url\n            expiresAt\n          }\n          billingPortalSession {\n            orgId\n            url\n            expiresAt\n          }\n          broadcastPermissionChanged {\n            member {\n              conversationId\n              principalId\n              role\n              status\n              membershipEpoch\n              visibilityEpoch\n              revision\n              visibleFromSequence\n              canStartBroadcast\n            }\n            mediaCutoff {\n              state\n              scope {\n                kind\n                liveSessionId\n                generation\n                participationId\n              }\n              evidence\n              enforcedAt\n              operationId\n            }\n          }\n          conversation {\n            conversationId\n            revision\n            title\n            props\n            latestSequence\n            membership {\n              conversationId\n              principalId\n              role\n              status\n              membershipEpoch\n              visibilityEpoch\n              revision\n              visibleFromSequence\n              canStartBroadcast\n            }\n          }\n          conversationMemberBatch {\n            items {\n              conversationId\n              principalId\n              role\n              status\n              membershipEpoch\n              visibilityEpoch\n              revision\n              visibleFromSequence\n              canStartBroadcast\n            }\n          }\n          conversationMute {\n            conversationId\n            principalId\n            muted\n            until\n          }\n          credentialDeliveryReceipt {\n            deliveryId\n          }\n          deliveryAck {\n            deliveryId\n            acknowledged\n          }\n          liveAlertBatch {\n            liveSessionId\n            created\n            suppressed\n          }\n          liveCredentialIssuance {\n            liveSessionId\n            participationId\n            generation\n            leaseId\n            grantOrdinal\n            admissionExpiresAt\n            leaseExpiresAt\n          }\n          liveSessionEndRequested {\n            liveSessionId\n            operationId\n            mediaCutoff {\n              state\n              scope {\n                kind\n                liveSessionId\n                generation\n                participationId\n              }\n              evidence\n              enforcedAt\n              operationId\n            }\n          }\n          liveSessionJoined {\n            liveSessionId\n            generation\n            participation {\n              participationId\n              principalId\n              membershipEpoch\n              role\n              state\n              permissions {\n                microphone\n                camera\n                subscribe\n              }\n              reservationExpiresAt\n              nativeConnectionId\n              mediaCutoff {\n                state\n                scope {\n                  kind\n                  liveSessionId\n                  generation\n                  participationId\n                }\n                evidence\n                enforcedAt\n                operationId\n              }\n            }\n          }\n          liveSessionLeft {\n            liveSessionId\n            participationId\n            mediaCutoff {\n              state\n              scope {\n                kind\n                liveSessionId\n                generation\n                participationId\n              }\n              evidence\n              enforcedAt\n              operationId\n            }\n          }\n          liveSessionStarted {\n            liveSessionId\n            conversationId\n            kind\n            mediaProfile\n            operationId\n          }\n          member {\n            conversationId\n            principalId\n            role\n            status\n            membershipEpoch\n            visibilityEpoch\n            revision\n            visibleFromSequence\n            canStartBroadcast\n          }\n          message {\n            messageId\n            conversationId\n            authorId\n            sequence\n            revision\n            revisionSequence\n            createdAt\n            deleted\n            text\n            props\n            editedAt\n          }\n          messageAck {\n            messageId\n            conversationId\n            sequence\n            revision\n            status\n            cursor {\n              incarnation\n              conversationId\n              sequence\n            }\n          }\n          organization {\n            orgId\n            name\n            status\n            revision\n          }\n          organizationSpend {\n            orgId\n            planId\n            currency\n            catalogVersion\n            monthlySpendCap\n            agentPurchaseLimit\n            updatedAt\n            monthlyMinimum\n            periodStart\n            periodEnd\n            credits\n            charges\n            margin\n            stop\n            refusedMeters\n            evaluatedAt\n            usageThrough\n            validUntil\n            minimumCredit\n            chargeLimit\n          }\n          principal {\n            principalId\n            externalUserId\n            status\n            revision\n          }\n          readReceipt {\n            principalId\n            membershipEpoch\n            visibilityEpoch\n            deliveredThroughSequence\n            readThroughSequence\n            updatedAt\n          }\n          sessionBootstrap {\n            session {\n              sessionId\n              principalId\n              deviceId\n              incarnation\n              sessionRevision\n              expiresAt\n              status\n            }\n            tokenExpiresAt\n            sessionToken\n          }\n          sessionRevocation {\n            sessionId\n            status\n            mediaCutoff {\n              state\n              scope {\n                kind\n                principalId\n                sessionId\n                deviceId\n                callId\n              }\n            }\n          }\n          signedProof\n        }\n      }\n    }\n  }\n}",
    "resultType": "ResolveRequestReply!",
    "inputFields": [
      "requestId"
    ]
  },
  "management.getOperation": {
    "plane": "management",
    "kind": "query",
    "idempotency": "safe",
    "field": "getOperation",
    "operationName": "ManagementGetOperation",
    "query": "query ManagementGetOperation($context: RequestContextInput!, $input: GetOperationRequestInput!) {\n  getOperation(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      operationId\n      kind\n      targetRef {\n        kind\n        id\n      }\n      state\n      revision\n      requestedAt\n      updatedAt\n      steps {\n        stepId\n        state\n      }\n      result {\n        projectId\n        incarnation\n        status\n        backend\n        environment\n        policyRevision\n        expiresAt\n        kind\n        resourceRef {\n          kind\n          id\n        }\n        delivery {\n          deliveryId\n          kind\n          projectId\n          installationId\n          resourceRef {\n            kind\n            id\n          }\n          expiresAt\n          payloadDigest\n          recipientActorRef {\n            tenantId\n            objectId\n          }\n        }\n        keyId\n        endpointId\n        enabled\n        liveSessionCompletion {\n          liveSessionId\n          generation\n          state\n          revision\n          completedAt\n          mediaCutoff {\n            state\n            scope {\n              kind\n              liveSessionId\n              generation\n              participationId\n            }\n            evidence\n            enforcedAt\n            operationId\n          }\n        }\n        replayedDeliveries\n        skippedDeliveries\n        messagePreview\n      }\n      blockedReason\n    }\n  }\n}",
    "resultType": "GetOperationReply!",
    "inputFields": [
      "operationId"
    ]
  },
  "management.agentSignupForApproval": {
    "plane": "management",
    "kind": "query",
    "idempotency": "safe",
    "field": "agentSignupForApproval",
    "operationName": "ManagementAgentSignupForApproval",
    "query": "query ManagementAgentSignupForApproval($context: RequestContextInput!, $input: AgentSignupForApprovalRequestInput!) {\n  agentSignupForApproval(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      signupId\n      ownerEmail\n      organizationName\n      agentName\n      purpose\n      suggestedPlan\n      suggestedScopes\n      suggestedMonthlySpendCap\n      currency\n      expiresAt\n    }\n  }\n}",
    "resultType": "AgentSignupForApprovalReply!",
    "inputFields": [
      "approvalToken"
    ]
  },
  "management.agentSignup": {
    "plane": "management",
    "kind": "query",
    "idempotency": "safe",
    "field": "agentSignup",
    "operationName": "ManagementAgentSignup",
    "query": "query ManagementAgentSignup($context: RequestContextInput!) {\n  agentSignup(context: $context) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      signupId\n      state\n      orgId\n      deploymentId\n      projectId\n      nextStep\n      scopes\n      grantExpiresAt\n      keys {\n        operationId\n        state\n        scopes\n        expiresAt\n        keyId\n        deliveryId\n        deliveryExpiresAt\n      }\n      incarnation\n      servingEpoch\n    }\n  }\n}",
    "resultType": "AgentSignupReply!",
    "inputFields": []
  },
  "management.agentGrants": {
    "plane": "management",
    "kind": "query",
    "idempotency": "safe",
    "field": "agentGrants",
    "operationName": "ManagementAgentGrants",
    "query": "query ManagementAgentGrants($context: RequestContextInput!, $input: AgentGrantsRequestInput!) {\n  agentGrants(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      items {\n        grantId\n        orgId\n        signupId\n        agentActorId\n        projectId\n        scopes\n        expiresAt\n        revokedAt\n        createdAt\n        keys {\n          operationId\n          state\n          scopes\n          expiresAt\n          keyId\n          deliveryId\n          deliveryExpiresAt\n        }\n      }\n      complete\n      refreshRequired\n      nextCursor\n    }\n  }\n}",
    "resultType": "AgentGrantsReply!",
    "inputFields": [
      "orgId",
      "limit",
      "cursor"
    ]
  },
  "management.agentAuditEvents": {
    "plane": "management",
    "kind": "query",
    "idempotency": "safe",
    "field": "agentAuditEvents",
    "operationName": "ManagementAgentAuditEvents",
    "query": "query ManagementAgentAuditEvents($context: RequestContextInput!, $input: AgentAuditEventsRequestInput!) {\n  agentAuditEvents(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      items {\n        eventId\n        orgId\n        grantId\n        actorKind\n        actorId\n        kind\n        details\n        occurredAt\n      }\n      complete\n      refreshRequired\n      nextCursor\n    }\n  }\n}",
    "resultType": "AgentAuditEventsReply!",
    "inputFields": [
      "orgId",
      "limit",
      "cursor"
    ]
  },
  "management.organizationSpend": {
    "plane": "management",
    "kind": "query",
    "idempotency": "safe",
    "field": "organizationSpend",
    "operationName": "ManagementOrganizationSpend",
    "query": "query ManagementOrganizationSpend($context: RequestContextInput!, $input: OrganizationSpendRequestInput!) {\n  organizationSpend(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      orgId\n      planId\n      currency\n      catalogVersion\n      monthlySpendCap\n      agentPurchaseLimit\n      updatedAt\n      monthlyMinimum\n      periodStart\n      periodEnd\n      credits\n      charges\n      margin\n      stop\n      refusedMeters\n      evaluatedAt\n      usageThrough\n      validUntil\n      minimumCredit\n      chargeLimit\n    }\n  }\n}",
    "resultType": "OrganizationSpendReply!",
    "inputFields": [
      "orgId"
    ]
  },
  "management.createOrganization": {
    "plane": "management",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "createOrganization",
    "operationName": "ManagementCreateOrganization",
    "query": "mutation ManagementCreateOrganization($context: RequestContextInput!, $input: CreateOrganizationRequestInput!) {\n  createOrganization(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      orgId\n      name\n      status\n      revision\n    }\n  }\n}",
    "resultType": "CreateOrganizationReply!",
    "inputFields": [
      "name",
      "termsRef"
    ]
  },
  "management.createDeployment": {
    "plane": "management",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "createDeployment",
    "operationName": "ManagementCreateDeployment",
    "query": "mutation ManagementCreateDeployment($context: RequestContextInput!, $input: CreateDeploymentRequestInput!) {\n  createDeployment(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      projectId\n      incarnation\n      status\n      backend\n      environment\n      policyRevision\n      expiresAt\n      kind\n      resourceRef {\n        kind\n        id\n      }\n      delivery {\n        deliveryId\n        kind\n        projectId\n        installationId\n        resourceRef {\n          kind\n          id\n        }\n        expiresAt\n        payloadDigest\n        recipientActorRef {\n          tenantId\n          objectId\n        }\n      }\n      keyId\n      endpointId\n      enabled\n      liveSessionCompletion {\n        liveSessionId\n        generation\n        state\n        revision\n        completedAt\n        mediaCutoff {\n          state\n          scope {\n            kind\n            liveSessionId\n            generation\n            participationId\n          }\n          evidence\n          enforcedAt\n          operationId\n        }\n      }\n      replayedDeliveries\n      skippedDeliveries\n      messagePreview\n    }\n  }\n}",
    "resultType": "CreateDeploymentReply!",
    "inputFields": [
      "orgId",
      "offering",
      "geoId",
      "installationProfileId",
      "consentRef"
    ]
  },
  "management.createProject": {
    "plane": "management",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "createProject",
    "operationName": "ManagementCreateProject",
    "query": "mutation ManagementCreateProject($context: RequestContextInput!, $input: CreateProjectRequestInput!) {\n  createProject(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      projectId\n      incarnation\n      status\n      backend\n      environment\n      policyRevision\n      expiresAt\n      kind\n      resourceRef {\n        kind\n        id\n      }\n      delivery {\n        deliveryId\n        kind\n        projectId\n        installationId\n        resourceRef {\n          kind\n          id\n        }\n        expiresAt\n        payloadDigest\n        recipientActorRef {\n          tenantId\n          objectId\n        }\n      }\n      keyId\n      endpointId\n      enabled\n      liveSessionCompletion {\n        liveSessionId\n        generation\n        state\n        revision\n        completedAt\n        mediaCutoff {\n          state\n          scope {\n            kind\n            liveSessionId\n            generation\n            participationId\n          }\n          evidence\n          enforcedAt\n          operationId\n        }\n      }\n      replayedDeliveries\n      skippedDeliveries\n      messagePreview\n    }\n  }\n}",
    "resultType": "CreateProjectReply!",
    "inputFields": [
      "deploymentId",
      "name",
      "environment",
      "backendPrincipalName"
    ]
  },
  "management.issueBackendKey": {
    "plane": "management",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "issueBackendKey",
    "operationName": "ManagementIssueBackendKey",
    "query": "mutation ManagementIssueBackendKey($context: RequestContextInput!, $input: IssueBackendKeyRequestInput!) {\n  issueBackendKey(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      projectId\n      incarnation\n      status\n      backend\n      environment\n      policyRevision\n      expiresAt\n      kind\n      resourceRef {\n        kind\n        id\n      }\n      delivery {\n        deliveryId\n        kind\n        projectId\n        installationId\n        resourceRef {\n          kind\n          id\n        }\n        expiresAt\n        payloadDigest\n        recipientActorRef {\n          tenantId\n          objectId\n        }\n      }\n      keyId\n      endpointId\n      enabled\n      liveSessionCompletion {\n        liveSessionId\n        generation\n        state\n        revision\n        completedAt\n        mediaCutoff {\n          state\n          scope {\n            kind\n            liveSessionId\n            generation\n            participationId\n          }\n          evidence\n          enforcedAt\n          operationId\n        }\n      }\n      replayedDeliveries\n      skippedDeliveries\n      messagePreview\n    }\n  }\n}",
    "resultType": "IssueBackendKeyReply!",
    "inputFields": [
      "projectId",
      "name",
      "scopes",
      "expiresAt"
    ]
  },
  "management.revokeBackendKey": {
    "plane": "management",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "revokeBackendKey",
    "operationName": "ManagementRevokeBackendKey",
    "query": "mutation ManagementRevokeBackendKey($context: RequestContextInput!, $input: RevokeBackendKeyRequestInput!) {\n  revokeBackendKey(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      projectId\n      incarnation\n      status\n      backend\n      environment\n      policyRevision\n      expiresAt\n      kind\n      resourceRef {\n        kind\n        id\n      }\n      delivery {\n        deliveryId\n        kind\n        projectId\n        installationId\n        resourceRef {\n          kind\n          id\n        }\n        expiresAt\n        payloadDigest\n        recipientActorRef {\n          tenantId\n          objectId\n        }\n      }\n      keyId\n      endpointId\n      enabled\n      liveSessionCompletion {\n        liveSessionId\n        generation\n        state\n        revision\n        completedAt\n        mediaCutoff {\n          state\n          scope {\n            kind\n            liveSessionId\n            generation\n            participationId\n          }\n          evidence\n          enforcedAt\n          operationId\n        }\n      }\n      replayedDeliveries\n      skippedDeliveries\n      messagePreview\n    }\n  }\n}",
    "resultType": "RevokeBackendKeyReply!",
    "inputFields": [
      "projectId",
      "keyId",
      "expectedRevision",
      "revokeIssuedSessions"
    ]
  },
  "management.projectPolicy": {
    "plane": "management",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "projectPolicy",
    "operationName": "ManagementProjectPolicy",
    "query": "mutation ManagementProjectPolicy($context: RequestContextInput!, $input: ProjectPolicyRequestInput!) {\n  projectPolicy(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      projectId\n      incarnation\n      status\n      backend\n      environment\n      policyRevision\n      expiresAt\n      kind\n      resourceRef {\n        kind\n        id\n      }\n      delivery {\n        deliveryId\n        kind\n        projectId\n        installationId\n        resourceRef {\n          kind\n          id\n        }\n        expiresAt\n        payloadDigest\n        recipientActorRef {\n          tenantId\n          objectId\n        }\n      }\n      keyId\n      endpointId\n      enabled\n      liveSessionCompletion {\n        liveSessionId\n        generation\n        state\n        revision\n        completedAt\n        mediaCutoff {\n          state\n          scope {\n            kind\n            liveSessionId\n            generation\n            participationId\n          }\n          evidence\n          enforcedAt\n          operationId\n        }\n      }\n      replayedDeliveries\n      skippedDeliveries\n      messagePreview\n    }\n  }\n}",
    "resultType": "ProjectPolicyReply!",
    "inputFields": [
      "projectId",
      "expectedRevision",
      "change"
    ]
  },
  "management.credentialPermit": {
    "plane": "management",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "credentialPermit",
    "operationName": "ManagementCredentialPermit",
    "query": "mutation ManagementCredentialPermit($context: RequestContextInput!, $input: CredentialPermitRequestInput!) {\n  credentialPermit(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result\n  }\n}",
    "resultType": "CredentialPermitReply!",
    "inputFields": [
      "projectId",
      "deliveryId",
      "redemptionRequestId"
    ]
  },
  "management.pauseOperation": {
    "plane": "management",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "pauseOperation",
    "operationName": "ManagementPauseOperation",
    "query": "mutation ManagementPauseOperation($context: RequestContextInput!, $input: PauseOperationRequestInput!) {\n  pauseOperation(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      operationId\n      kind\n      targetRef {\n        kind\n        id\n      }\n      state\n      revision\n      requestedAt\n      updatedAt\n      steps {\n        stepId\n        state\n      }\n      result {\n        projectId\n        incarnation\n        status\n        backend\n        environment\n        policyRevision\n        expiresAt\n        kind\n        resourceRef {\n          kind\n          id\n        }\n        delivery {\n          deliveryId\n          kind\n          projectId\n          installationId\n          resourceRef {\n            kind\n            id\n          }\n          expiresAt\n          payloadDigest\n          recipientActorRef {\n            tenantId\n            objectId\n          }\n        }\n        keyId\n        endpointId\n        enabled\n        liveSessionCompletion {\n          liveSessionId\n          generation\n          state\n          revision\n          completedAt\n          mediaCutoff {\n            state\n            scope {\n              kind\n              liveSessionId\n              generation\n              participationId\n            }\n            evidence\n            enforcedAt\n            operationId\n          }\n        }\n        replayedDeliveries\n        skippedDeliveries\n        messagePreview\n      }\n      blockedReason\n    }\n  }\n}",
    "resultType": "PauseOperationReply!",
    "inputFields": [
      "operationId",
      "expectedRevision"
    ]
  },
  "management.resumeOperation": {
    "plane": "management",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "resumeOperation",
    "operationName": "ManagementResumeOperation",
    "query": "mutation ManagementResumeOperation($context: RequestContextInput!, $input: ResumeOperationRequestInput!) {\n  resumeOperation(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      operationId\n      kind\n      targetRef {\n        kind\n        id\n      }\n      state\n      revision\n      requestedAt\n      updatedAt\n      steps {\n        stepId\n        state\n      }\n      result {\n        projectId\n        incarnation\n        status\n        backend\n        environment\n        policyRevision\n        expiresAt\n        kind\n        resourceRef {\n          kind\n          id\n        }\n        delivery {\n          deliveryId\n          kind\n          projectId\n          installationId\n          resourceRef {\n            kind\n            id\n          }\n          expiresAt\n          payloadDigest\n          recipientActorRef {\n            tenantId\n            objectId\n          }\n        }\n        keyId\n        endpointId\n        enabled\n        liveSessionCompletion {\n          liveSessionId\n          generation\n          state\n          revision\n          completedAt\n          mediaCutoff {\n            state\n            scope {\n              kind\n              liveSessionId\n              generation\n              participationId\n            }\n            evidence\n            enforcedAt\n            operationId\n          }\n        }\n        replayedDeliveries\n        skippedDeliveries\n        messagePreview\n      }\n      blockedReason\n    }\n  }\n}",
    "resultType": "ResumeOperationReply!",
    "inputFields": [
      "operationId",
      "expectedRevision"
    ]
  },
  "management.createBillingCheckoutSession": {
    "plane": "management",
    "kind": "mutation",
    "idempotency": "singleUse",
    "field": "createBillingCheckoutSession",
    "operationName": "ManagementCreateBillingCheckoutSession",
    "query": "mutation ManagementCreateBillingCheckoutSession($context: RequestContextInput!, $input: CreateBillingCheckoutSessionRequestInput!) {\n  createBillingCheckoutSession(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      orgId\n      planId\n      url\n      expiresAt\n    }\n  }\n}",
    "resultType": "CreateBillingCheckoutSessionReply!",
    "inputFields": [
      "orgId",
      "planId"
    ]
  },
  "management.createBillingPortalSession": {
    "plane": "management",
    "kind": "mutation",
    "idempotency": "singleUse",
    "field": "createBillingPortalSession",
    "operationName": "ManagementCreateBillingPortalSession",
    "query": "mutation ManagementCreateBillingPortalSession($context: RequestContextInput!, $input: CreateBillingPortalSessionRequestInput!) {\n  createBillingPortalSession(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      orgId\n      url\n      expiresAt\n    }\n  }\n}",
    "resultType": "CreateBillingPortalSessionReply!",
    "inputFields": [
      "orgId"
    ]
  },
  "management.configureWebhook": {
    "plane": "management",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "configureWebhook",
    "operationName": "ManagementConfigureWebhook",
    "query": "mutation ManagementConfigureWebhook($context: RequestContextInput!, $input: ConfigureWebhookRequestInput!) {\n  configureWebhook(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      projectId\n      incarnation\n      status\n      backend\n      environment\n      policyRevision\n      expiresAt\n      kind\n      resourceRef {\n        kind\n        id\n      }\n      delivery {\n        deliveryId\n        kind\n        projectId\n        installationId\n        resourceRef {\n          kind\n          id\n        }\n        expiresAt\n        payloadDigest\n        recipientActorRef {\n          tenantId\n          objectId\n        }\n      }\n      keyId\n      endpointId\n      enabled\n      liveSessionCompletion {\n        liveSessionId\n        generation\n        state\n        revision\n        completedAt\n        mediaCutoff {\n          state\n          scope {\n            kind\n            liveSessionId\n            generation\n            participationId\n          }\n          evidence\n          enforcedAt\n          operationId\n        }\n      }\n      replayedDeliveries\n      skippedDeliveries\n      messagePreview\n    }\n  }\n}",
    "resultType": "ConfigureWebhookReply!",
    "inputFields": [
      "projectId",
      "url",
      "eventTypes",
      "consentRef"
    ]
  },
  "management.updateWebhook": {
    "plane": "management",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "updateWebhook",
    "operationName": "ManagementUpdateWebhook",
    "query": "mutation ManagementUpdateWebhook($context: RequestContextInput!, $input: UpdateWebhookRequestInput!) {\n  updateWebhook(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      projectId\n      incarnation\n      status\n      backend\n      environment\n      policyRevision\n      expiresAt\n      kind\n      resourceRef {\n        kind\n        id\n      }\n      delivery {\n        deliveryId\n        kind\n        projectId\n        installationId\n        resourceRef {\n          kind\n          id\n        }\n        expiresAt\n        payloadDigest\n        recipientActorRef {\n          tenantId\n          objectId\n        }\n      }\n      keyId\n      endpointId\n      enabled\n      liveSessionCompletion {\n        liveSessionId\n        generation\n        state\n        revision\n        completedAt\n        mediaCutoff {\n          state\n          scope {\n            kind\n            liveSessionId\n            generation\n            participationId\n          }\n          evidence\n          enforcedAt\n          operationId\n        }\n      }\n      replayedDeliveries\n      skippedDeliveries\n      messagePreview\n    }\n  }\n}",
    "resultType": "UpdateWebhookReply!",
    "inputFields": [
      "projectId",
      "endpointId",
      "expectedRevision",
      "eventTypes",
      "enabled"
    ]
  },
  "management.rotateWebhookSecret": {
    "plane": "management",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "rotateWebhookSecret",
    "operationName": "ManagementRotateWebhookSecret",
    "query": "mutation ManagementRotateWebhookSecret($context: RequestContextInput!, $input: RotateWebhookSecretRequestInput!) {\n  rotateWebhookSecret(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      projectId\n      incarnation\n      status\n      backend\n      environment\n      policyRevision\n      expiresAt\n      kind\n      resourceRef {\n        kind\n        id\n      }\n      delivery {\n        deliveryId\n        kind\n        projectId\n        installationId\n        resourceRef {\n          kind\n          id\n        }\n        expiresAt\n        payloadDigest\n        recipientActorRef {\n          tenantId\n          objectId\n        }\n      }\n      keyId\n      endpointId\n      enabled\n      liveSessionCompletion {\n        liveSessionId\n        generation\n        state\n        revision\n        completedAt\n        mediaCutoff {\n          state\n          scope {\n            kind\n            liveSessionId\n            generation\n            participationId\n          }\n          evidence\n          enforcedAt\n          operationId\n        }\n      }\n      replayedDeliveries\n      skippedDeliveries\n      messagePreview\n    }\n  }\n}",
    "resultType": "RotateWebhookSecretReply!",
    "inputFields": [
      "projectId",
      "endpointId",
      "expectedRevision"
    ]
  },
  "management.disableWebhook": {
    "plane": "management",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "disableWebhook",
    "operationName": "ManagementDisableWebhook",
    "query": "mutation ManagementDisableWebhook($context: RequestContextInput!, $input: DisableWebhookRequestInput!) {\n  disableWebhook(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      projectId\n      incarnation\n      status\n      backend\n      environment\n      policyRevision\n      expiresAt\n      kind\n      resourceRef {\n        kind\n        id\n      }\n      delivery {\n        deliveryId\n        kind\n        projectId\n        installationId\n        resourceRef {\n          kind\n          id\n        }\n        expiresAt\n        payloadDigest\n        recipientActorRef {\n          tenantId\n          objectId\n        }\n      }\n      keyId\n      endpointId\n      enabled\n      liveSessionCompletion {\n        liveSessionId\n        generation\n        state\n        revision\n        completedAt\n        mediaCutoff {\n          state\n          scope {\n            kind\n            liveSessionId\n            generation\n            participationId\n          }\n          evidence\n          enforcedAt\n          operationId\n        }\n      }\n      replayedDeliveries\n      skippedDeliveries\n      messagePreview\n    }\n  }\n}",
    "resultType": "DisableWebhookReply!",
    "inputFields": [
      "projectId",
      "endpointId",
      "expectedRevision"
    ]
  },
  "management.replayWebhookDeliveries": {
    "plane": "management",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "replayWebhookDeliveries",
    "operationName": "ManagementReplayWebhookDeliveries",
    "query": "mutation ManagementReplayWebhookDeliveries($context: RequestContextInput!, $input: ReplayWebhookDeliveriesRequestInput!) {\n  replayWebhookDeliveries(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      projectId\n      incarnation\n      status\n      backend\n      environment\n      policyRevision\n      expiresAt\n      kind\n      resourceRef {\n        kind\n        id\n      }\n      delivery {\n        deliveryId\n        kind\n        projectId\n        installationId\n        resourceRef {\n          kind\n          id\n        }\n        expiresAt\n        payloadDigest\n        recipientActorRef {\n          tenantId\n          objectId\n        }\n      }\n      keyId\n      endpointId\n      enabled\n      liveSessionCompletion {\n        liveSessionId\n        generation\n        state\n        revision\n        completedAt\n        mediaCutoff {\n          state\n          scope {\n            kind\n            liveSessionId\n            generation\n            participationId\n          }\n          evidence\n          enforcedAt\n          operationId\n        }\n      }\n      replayedDeliveries\n      skippedDeliveries\n      messagePreview\n    }\n  }\n}",
    "resultType": "ReplayWebhookDeliveriesReply!",
    "inputFields": [
      "projectId",
      "endpointId",
      "effectId",
      "since",
      "until"
    ]
  },
  "management.requestAgentSignup": {
    "plane": "management",
    "kind": "mutation",
    "idempotency": "replayOnly",
    "field": "requestAgentSignup",
    "operationName": "ManagementRequestAgentSignup",
    "query": "mutation ManagementRequestAgentSignup($context: RequestContextInput!, $input: RequestAgentSignupRequestInput!) {\n  requestAgentSignup(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      signupId\n      confirmationCode\n      expiresAt\n      pollAfterSeconds\n    }\n  }\n}",
    "resultType": "RequestAgentSignupReply!",
    "inputFields": [
      "ownerEmail",
      "pollChallenge",
      "organizationName",
      "agentName",
      "purpose",
      "suggestedPlan",
      "suggestedScopes",
      "suggestedMonthlySpendCap"
    ]
  },
  "management.rejectAgentSignup": {
    "plane": "management",
    "kind": "mutation",
    "idempotency": "replayOnly",
    "field": "rejectAgentSignup",
    "operationName": "ManagementRejectAgentSignup",
    "query": "mutation ManagementRejectAgentSignup($context: RequestContextInput!, $input: RejectAgentSignupRequestInput!) {\n  rejectAgentSignup(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      signupId\n      state\n      orgId\n      deploymentId\n      projectId\n      nextStep\n      scopes\n      grantExpiresAt\n      keys {\n        operationId\n        state\n        scopes\n        expiresAt\n        keyId\n        deliveryId\n        deliveryExpiresAt\n      }\n      incarnation\n      servingEpoch\n    }\n  }\n}",
    "resultType": "RejectAgentSignupReply!",
    "inputFields": [
      "approvalToken",
      "suppressFutureRequests"
    ]
  },
  "management.approveAgentSignup": {
    "plane": "management",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "approveAgentSignup",
    "operationName": "ManagementApproveAgentSignup",
    "query": "mutation ManagementApproveAgentSignup($context: RequestContextInput!, $input: ApproveAgentSignupRequestInput!) {\n  approveAgentSignup(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      signupId\n      state\n      orgId\n      deploymentId\n      projectId\n      nextStep\n      scopes\n      grantExpiresAt\n      keys {\n        operationId\n        state\n        scopes\n        expiresAt\n        keyId\n        deliveryId\n        deliveryExpiresAt\n      }\n      incarnation\n      servingEpoch\n    }\n  }\n}",
    "resultType": "ApproveAgentSignupReply!",
    "inputFields": [
      "approvalToken",
      "confirmationCode",
      "termsRef",
      "plan",
      "scopes",
      "monthlySpendCap",
      "agentPurchaseLimit",
      "grantExpiresAt"
    ]
  },
  "management.issueAgentKey": {
    "plane": "management",
    "kind": "mutation",
    "idempotency": "replayOnly",
    "field": "issueAgentKey",
    "operationName": "ManagementIssueAgentKey",
    "query": "mutation ManagementIssueAgentKey($context: RequestContextInput!, $input: IssueAgentKeyRequestInput!) {\n  issueAgentKey(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      operationId\n      state\n      scopes\n      expiresAt\n      keyId\n      deliveryId\n      deliveryExpiresAt\n    }\n  }\n}",
    "resultType": "IssueAgentKeyReply!",
    "inputFields": [
      "scopes",
      "expiresAt"
    ]
  },
  "management.agentCredentialPermit": {
    "plane": "management",
    "kind": "mutation",
    "idempotency": "replayOnly",
    "field": "agentCredentialPermit",
    "operationName": "ManagementAgentCredentialPermit",
    "query": "mutation ManagementAgentCredentialPermit($context: RequestContextInput!, $input: AgentCredentialPermitRequestInput!) {\n  agentCredentialPermit(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result\n  }\n}",
    "resultType": "AgentCredentialPermitReply!",
    "inputFields": [
      "deliveryId",
      "redemptionRequestId"
    ]
  },
  "management.revokeAgentGrant": {
    "plane": "management",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "revokeAgentGrant",
    "operationName": "ManagementRevokeAgentGrant",
    "query": "mutation ManagementRevokeAgentGrant($context: RequestContextInput!, $input: RevokeAgentGrantRequestInput!) {\n  revokeAgentGrant(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      grantId\n      orgId\n      signupId\n      agentActorId\n      projectId\n      scopes\n      expiresAt\n      revokedAt\n      createdAt\n      keys {\n        operationId\n        state\n        scopes\n        expiresAt\n        keyId\n        deliveryId\n        deliveryExpiresAt\n      }\n    }\n  }\n}",
    "resultType": "RevokeAgentGrantReply!",
    "inputFields": [
      "grantId",
      "revokeIssuedSessions"
    ]
  },
  "management.setSpendControls": {
    "plane": "management",
    "kind": "mutation",
    "idempotency": "idempotent",
    "field": "setSpendControls",
    "operationName": "ManagementSetSpendControls",
    "query": "mutation ManagementSetSpendControls($context: RequestContextInput!, $input: SetSpendControlsRequestInput!) {\n  setSpendControls(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      orgId\n      planId\n      currency\n      catalogVersion\n      monthlySpendCap\n      agentPurchaseLimit\n      updatedAt\n      monthlyMinimum\n      periodStart\n      periodEnd\n      credits\n      charges\n      margin\n      stop\n      refusedMeters\n      evaluatedAt\n      usageThrough\n      validUntil\n      minimumCredit\n      chargeLimit\n    }\n  }\n}",
    "resultType": "SetSpendControlsReply!",
    "inputFields": [
      "orgId",
      "monthlySpendCap",
      "agentPurchaseLimit"
    ]
  },
  "management.purchaseAgentCredits": {
    "plane": "management",
    "kind": "mutation",
    "idempotency": "replayOnly",
    "field": "purchaseAgentCredits",
    "operationName": "ManagementPurchaseAgentCredits",
    "query": "mutation ManagementPurchaseAgentCredits($context: RequestContextInput!, $input: PurchaseAgentCreditsRequestInput!) {\n  purchaseAgentCredits(context: $context, input: $input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      paymentId\n      amount\n      currency\n      state\n    }\n  }\n}",
    "resultType": "PurchaseAgentCreditsReply!",
    "inputFields": [
      "amount",
      "sharedPaymentToken"
    ]
  }
};
