/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type AcceptCallRequestInput = {
  callId: string;
  generation: string;
  invitationId: string;
};

export type AcknowledgeCredentialRequestInput = {
  deliveryId: string;
};

export type AddMemberRequestInput = {
  conversationId: string;
  expectedRevision: string;
  principalId: string;
  role: string;
};

export type AddMembersInput = {
  conversationId: string;
  members: Array<MemberBatchEntryInput>;
};

export type CallInvitationsRequestInput = {
  cursor?: string | null | undefined;
  limit: number;
};

export type CallMediaInput = {
  audio: boolean;
  video: boolean;
};

export type ConfigureWebhookRequestInput = {
  consentRef: string;
  eventTypes: Array<string>;
  payloadVersion: string;
  projectId: string;
  url: string;
};

export type CreateConversationRequestInput = {
  members: Array<MemberInputInput>;
  props: Record<string, unknown>;
  title: string;
};

export type CreateDeploymentRequestInput = {
  consentRef: string;
  geoId: string;
  installationProfileId: string;
  offering: string;
  orgId: string;
};

export type CreateOrganizationRequestInput = {
  name: string;
  termsRef: string;
};

export type CreatePrincipalRequestInput = {
  externalUserId: string;
};

export type CreateProjectRequestInput = {
  backendPrincipalName: string;
  deploymentId: string;
  environment: string;
  name: string;
};

export type CredentialPermitRequestInput = {
  deliveryId: string;
  projectId: string;
  redemptionRequestId: string;
};

export type CursorInput = {
  conversationId: string;
  incarnation: string;
  sequence: string;
};

export type DeclineCallRequestInput = {
  callId: string;
  generation: string;
  invitationId: string;
};

export type DeleteMessageRequestInput = {
  conversationId: string;
  expectedRevision: string;
  messageId: string;
};

export type DeploymentHealthRequestInput = {
  deploymentId: string;
};

export type DeploymentUsageRequestInput = {
  deploymentId: string;
};

export type DisablePrincipalRequestInput = {
  expectedRevision: string;
  principalId: string;
};

export type DisableWebhookRequestInput = {
  endpointId: string;
  expectedRevision: string;
  projectId: string;
};

export type EditMessageRequestInput = {
  conversationId: string;
  expectedRevision: string;
  messageId: string;
  props?: Record<string, unknown> | null | undefined;
  text?: string | null | undefined;
};

export type EndCallRequestInput = {
  callId: string;
  expectedRevision: string;
  generation: string;
};

export type EventsRequestInput = {
  after?: CursorInput | null | undefined;
  conversationId: string;
  limit: number;
};

export type GetCallRequestInput = {
  callId: string;
};

export type GetConversationRequestInput = {
  conversationId: string;
};

export type GetDeploymentRequestInput = {
  deploymentId: string;
};

export type GetMessageRequestInput = {
  conversationId: string;
  messageId: string;
};

export type GetOperationRequestInput = {
  operationId: string;
};

export type GetOrganizationRequestInput = {
  orgId: string;
};

export type GetPrincipalRequestInput = {
  principalId: string;
};

export type GetProjectRequestInput = {
  projectId: string;
};

export type HistoryGrantRequestInput = {
  conversationId: string;
  expectedRevision: string;
  fromSequence: string;
  membershipEpoch: string;
  principalId: string;
};

export type InboxRequestInput = {
  cursor?: string | null | undefined;
  limit: number;
};

export type InviteCallRequestInput = {
  callId: string;
  expectedRevision: string;
  principalIds: Array<string>;
};

export type IssueBackendKeyRequestInput = {
  expiresAt: string;
  name: string;
  projectId: string;
  scopes: Array<string>;
};

export type IssueSessionRequestInput = {
  deviceId: string;
  principalId: string;
  requestedTtlMs: string;
};

export type LeaveCallRequestInput = {
  callId: string;
  generation: string;
};

export type MediaCredentialsRequestInput = {
  callId: string;
  generation: string;
  mode: string;
  replacementOfConnectionId?: string | null | undefined;
};

export type MemberBatchEntryInput = {
  expectedRevision: string;
  principalId: string;
  role: string;
};

export type MemberInputInput = {
  principalId: string;
  role: string;
};

export type MembersRequestInput = {
  conversationId: string;
  cursor?: string | null | undefined;
  limit: number;
};

export type MessagesRequestInput = {
  beforeSequence?: string | null | undefined;
  conversationId: string;
  limit: number;
};

export type PauseOperationRequestInput = {
  expectedRevision: string;
  operationId: string;
};

export type PolicyChangeInput = {
  holdId?: string | null | undefined;
  kind: string;
  reason?: string | null | undefined;
};

export type ProjectPolicyRequestInput = {
  change: PolicyChangeInput;
  expectedRevision: string;
  projectId: string;
};

export type ReceiptsRequestInput = {
  conversationId: string;
  cursor?: string | null | undefined;
  limit: number;
};

export type RedeemCredentialRequestInput = {
  deliveryId: string;
};

export type RemoveMemberRequestInput = {
  conversationId: string;
  expectedRevision: string;
  principalId: string;
};

export type RenewSessionRequestInput = {
  deviceId: string;
  expectedRevision: string;
  principalId: string;
  requestedTtlMs: string;
  sessionId: string;
};

export type ReportReceiptRequestInput = {
  conversationId: string;
  kind: string;
  membershipEpoch: string;
  throughSequence: string;
  visibilityEpoch: string;
};

export type RequestContextInput = {
  credentialDeliveryPermit?: Record<string, unknown> | null | undefined;
  incarnation?: string | null | undefined;
  observedServingEpoch?: string | null | undefined;
  projectId?: string | null | undefined;
  requestId: string;
};

export type ResolveRequestRequestInput = {
  requestId: string;
};

export type ResumeOperationRequestInput = {
  expectedRevision: string;
  operationId: string;
};

export type RevokeBackendKeyRequestInput = {
  expectedRevision: string;
  keyId: string;
  projectId: string;
  revokeIssuedSessions: boolean;
};

export type RevokeSessionRequestInput = {
  expectedRevision: string;
  sessionId: string;
};

export type RingCallRequestInput = {
  callId: string;
  generation: string;
  invitationId: string;
};

export type SearchRequestInput = {
  cursor?: string | null | undefined;
  pageSize: number;
  query: string;
  scope?: SearchScopeInput | null | undefined;
};

export type SearchScopeInput = {
  conversationIds: Array<string>;
};

export type SendMessageRequestInput = {
  conversationId: string;
  props: Record<string, unknown>;
  text: string;
};

export type StartCallRequestInput = {
  conversationId: string;
  invitedPrincipalIds: Array<string>;
  media: CallMediaInput;
};

export type TypingRequestInput = {
  conversationId: string;
  isTyping: boolean;
};

export type UpdateConversationRequestInput = {
  conversationId: string;
  expectedRevision: string;
  props?: Record<string, unknown> | null | undefined;
  title?: string | null | undefined;
};

export type WebhookDeliveriesRequestInput = {
  endpointId: string;
  projectId: string;
};

export type CommunicationCapabilitiesQueryVariables = Exact<{
  context: RequestContextInput;
}>;


export type CommunicationCapabilitiesQuery = { capabilities: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { contractVersion: string, serverRelease: string, publicApiVersion: string, wssVersions: Array<string>, capabilityRevision: string, limitsRevision: string, environment: string, productionQualified: boolean, geoControlAuthorityId: string | null, offerings: Array<string>, geos: Array<string>, installationProfiles: Array<string>, portalIdentity: string | null, features: { chat: boolean, inbox: boolean, lexicalSearch: boolean, typing: boolean, foregroundCalls: boolean, webhooks: boolean } | null, limits: Array<{ key: string, value: { maximum: string | null, unit: string | null, scope: string | null, milliseconds: string | null, policyId: string | null, revision: string | null } }>, mediaPolicy: { leasePolicyId: string, leaseProtocolVersion: string, maxLeaseMs: string, renewAttemptMs: string, preludeMaxBytes: string, preludeTimeoutMs: string, clockProfileId: string } | null } | null } };

export type CommunicationRouteQueryVariables = Exact<{
  context: RequestContextInput;
}>;


export type CommunicationRouteQuery = { route: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, result: Record<string, unknown> | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null } };

export type CommunicationGetPrincipalQueryVariables = Exact<{
  context: RequestContextInput;
  input: GetPrincipalRequestInput;
}>;


export type CommunicationGetPrincipalQuery = { getPrincipal: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { principalId: string, externalUserId: string, status: string, revision: string } | null } };

export type CommunicationGetConversationQueryVariables = Exact<{
  context: RequestContextInput;
  input: GetConversationRequestInput;
}>;


export type CommunicationGetConversationQuery = { getConversation: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { conversationId: string, revision: string, title: string, props: Record<string, unknown> | null, latestSequence: string, membership: { conversationId: string, principalId: string, role: string, status: string, membershipEpoch: string, visibilityEpoch: string, revision: string, visibleFromSequence: string, canStartBroadcast: boolean } | null } | null } };

export type CommunicationMembersQueryVariables = Exact<{
  context: RequestContextInput;
  input: MembersRequestInput;
}>;


export type CommunicationMembersQuery = { members: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { complete: boolean, refreshRequired: boolean, nextCursor: string | null, items: Array<{ conversationId: string, principalId: string, role: string, status: string, membershipEpoch: string, visibilityEpoch: string, revision: string, visibleFromSequence: string, canStartBroadcast: boolean }> } | null } };

export type CommunicationMessagesQueryVariables = Exact<{
  context: RequestContextInput;
  input: MessagesRequestInput;
}>;


export type CommunicationMessagesQuery = { messages: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { complete: boolean, refreshRequired: boolean, nextCursor: string | null, items: Array<{ messageId: string, conversationId: string, authorId: string, sequence: string, revision: string, revisionSequence: string, createdAt: string, deleted: boolean, text: string | null, props: Record<string, unknown> | null, editedAt: string | null }> } | null } };

export type CommunicationGetMessageQueryVariables = Exact<{
  context: RequestContextInput;
  input: GetMessageRequestInput;
}>;


export type CommunicationGetMessageQuery = { getMessage: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { messageId: string, conversationId: string, authorId: string, sequence: string, revision: string, revisionSequence: string, createdAt: string, deleted: boolean, text: string | null, props: Record<string, unknown> | null, editedAt: string | null } | null } };

export type CommunicationEventsQueryVariables = Exact<{
  context: RequestContextInput;
  input: EventsRequestInput;
}>;


export type CommunicationEventsQuery = { events: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { complete: boolean, refreshRequired: boolean, items: Array<{ eventId: string, conversationId: string, sequence: string, eventVersion: string, type: string, occurredAt: string, subjectRef: { kind: string, id: string } | null, payload: { messageId: string | null, revision: string | null, revisionSequence: string | null, principalId: string | null, membershipEpoch: string | null, visibilityEpoch: string | null, kind: string | null, throughSequence: string | null, callId: string | null, generation: string | null, state: string | null, cutoffEvidence: string | null } | null }>, nextCursor: { incarnation: string, conversationId: string, sequence: string } | null } | null } };

export type CommunicationReceiptsQueryVariables = Exact<{
  context: RequestContextInput;
  input: ReceiptsRequestInput;
}>;


export type CommunicationReceiptsQuery = { receipts: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { complete: boolean, refreshRequired: boolean, nextCursor: string | null, items: Array<{ principalId: string, membershipEpoch: string, visibilityEpoch: string, deliveredThroughSequence: string | null, readThroughSequence: string | null, updatedAt: string | null }> } | null } };

export type CommunicationInboxQueryVariables = Exact<{
  context: RequestContextInput;
  input: InboxRequestInput;
}>;


export type CommunicationInboxQuery = { inbox: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { complete: boolean, refreshRequired: boolean, nextCursor: string | null, partialReason: string | null, items: Array<{ conversationId: string, title: string, activityAt: string | null, visibilityEpoch: string, hasUnread: boolean, latestVisibleMessage: { messageId: string, conversationId: string, authorId: string, sequence: string, revision: string, revisionSequence: string, createdAt: string, deleted: boolean, text: string | null, props: Record<string, unknown> | null, editedAt: string | null } | null }> } | null } };

export type CommunicationSearchQueryVariables = Exact<{
  context: RequestContextInput;
  input: SearchRequestInput;
}>;


export type CommunicationSearchQuery = { search: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { complete: boolean, refreshRequired: boolean, nextCursor: string | null, items: Array<{ conversationId: string, message: { messageId: string, conversationId: string, authorId: string, sequence: string, revision: string, revisionSequence: string, createdAt: string, deleted: boolean, text: string | null, props: Record<string, unknown> | null, editedAt: string | null } | null }> } | null } };

export type CommunicationResolveRequestQueryVariables = Exact<{
  context: RequestContextInput;
  input: ResolveRequestRequestInput;
}>;


export type CommunicationResolveRequestQuery = { resolveRequest: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { state: string, requestId: string, checkedAt: string, resultWithheld: boolean, receipt: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { signedProof: Record<string, unknown> | null, call: { callId: string, conversationId: string, revision: string, generation: string, state: string, creatorId: string, errorCode: string | null, media: { audio: boolean, video: boolean } | null, invitation: { invitationId: string, callId: string, generation: string, principalId: string, status: string, expiresAt: string } | null, participation: { principalId: string, sessionId: string | null, deviceId: string | null, status: string, nativeConnectionId: string | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null, callSummary: { callId: string, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null, conversation: { conversationId: string, revision: string, title: string, props: Record<string, unknown> | null, latestSequence: string, membership: { conversationId: string, principalId: string, role: string, status: string, membershipEpoch: string, visibilityEpoch: string, revision: string, visibleFromSequence: string, canStartBroadcast: boolean } | null } | null, conversationMemberBatch: { items: Array<{ conversationId: string, principalId: string, role: string, status: string, membershipEpoch: string, visibilityEpoch: string, revision: string, visibleFromSequence: string, canStartBroadcast: boolean }> } | null, credentialDeliveryReceipt: { deliveryId: string } | null, deliveryAck: { deliveryId: string, acknowledged: boolean } | null, mediaGrant: { callId: string, generation: string, roomName: string, participantIdentity: string, livekitUrl: string, transportToken: string, forwardingLease: Record<string, unknown> | null, admissionTicket: Record<string, unknown> | null, transportExpiresAt: string, admissionExpiresAt: string, leaseExpiresAt: string, leasePolicyId: string } | null, member: { conversationId: string, principalId: string, role: string, status: string, membershipEpoch: string, visibilityEpoch: string, revision: string, visibleFromSequence: string, canStartBroadcast: boolean } | null, message: { messageId: string, conversationId: string, authorId: string, sequence: string, revision: string, revisionSequence: string, createdAt: string, deleted: boolean, text: string | null, props: Record<string, unknown> | null, editedAt: string | null } | null, messageAck: { messageId: string, conversationId: string, sequence: string, revision: string, status: string, cursor: { incarnation: string, conversationId: string, sequence: string } | null } | null, organization: { orgId: string, name: string, status: string, revision: string } | null, principal: { principalId: string, externalUserId: string, status: string, revision: string } | null, readReceipt: { principalId: string, membershipEpoch: string, visibilityEpoch: string, deliveredThroughSequence: string | null, readThroughSequence: string | null, updatedAt: string | null } | null, sessionBootstrap: { tokenExpiresAt: string, sessionToken: string, session: { sessionId: string, principalId: string, deviceId: string, incarnation: string, sessionRevision: string, expiresAt: string, status: string } | null } | null, sessionRevocation: { sessionId: string, status: string, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null } | null } | null } | null } };

export type CommunicationGetOperationQueryVariables = Exact<{
  context: RequestContextInput;
  input: GetOperationRequestInput;
}>;


export type CommunicationGetOperationQuery = { getOperation: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { operationId: string, kind: string, state: string, revision: string, requestedAt: string, updatedAt: string, blockedReason: string | null, targetRef: { kind: string, id: string } | null, steps: Array<{ stepId: string, state: string }>, result: { projectId: string | null, incarnation: string | null, status: string | null, backend: string | null, environment: string | null, policyRevision: string | null, expiresAt: string | null, kind: string | null, keyId: string | null, endpointId: string | null, enabled: boolean | null, callId: string | null, conversationId: string | null, revision: string | null, generation: string | null, state: string | null, creatorId: string | null, errorCode: string | null, resourceRef: { kind: string, id: string } | null, delivery: { deliveryId: string, kind: string, projectId: string, installationId: string, expiresAt: string, payloadDigest: string, resourceRef: { kind: string, id: string } | null, recipientActorRef: { tenantId: string, objectId: string } | null } | null, media: { audio: boolean, video: boolean } | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null } | null } };

export type CommunicationGetCallQueryVariables = Exact<{
  context: RequestContextInput;
  input: GetCallRequestInput;
}>;


export type CommunicationGetCallQuery = { getCall: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { callId: string, conversationId: string, revision: string, generation: string, state: string, creatorId: string, errorCode: string | null, media: { audio: boolean, video: boolean } | null, invitation: { invitationId: string, callId: string, generation: string, principalId: string, status: string, expiresAt: string } | null, participation: { principalId: string, sessionId: string | null, deviceId: string | null, status: string, nativeConnectionId: string | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null } };

export type CommunicationCallInvitationsQueryVariables = Exact<{
  context: RequestContextInput;
  input: CallInvitationsRequestInput;
}>;


export type CommunicationCallInvitationsQuery = { callInvitations: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { complete: boolean, refreshRequired: boolean, nextCursor: string | null, items: Array<{ callId: string, conversationId: string, revision: string, generation: string, state: string, creatorId: string, errorCode: string | null, media: { audio: boolean, video: boolean } | null, invitation: { invitationId: string, callId: string, generation: string, principalId: string, status: string, expiresAt: string } | null, participation: { principalId: string, sessionId: string | null, deviceId: string | null, status: string, nativeConnectionId: string | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null }> } | null } };

export type CommunicationCreatePrincipalMutationVariables = Exact<{
  context: RequestContextInput;
  input: CreatePrincipalRequestInput;
}>;


export type CommunicationCreatePrincipalMutation = { createPrincipal: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { principalId: string, externalUserId: string, status: string, revision: string } | null } };

export type CommunicationDisablePrincipalMutationVariables = Exact<{
  context: RequestContextInput;
  input: DisablePrincipalRequestInput;
}>;


export type CommunicationDisablePrincipalMutation = { disablePrincipal: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { principalId: string, externalUserId: string, status: string, revision: string } | null } };

export type CommunicationIssueSessionMutationVariables = Exact<{
  context: RequestContextInput;
  input: IssueSessionRequestInput;
}>;


export type CommunicationIssueSessionMutation = { issueSession: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { tokenExpiresAt: string, sessionToken: string, session: { sessionId: string, principalId: string, deviceId: string, incarnation: string, sessionRevision: string, expiresAt: string, status: string } | null } | null } };

export type CommunicationRenewSessionMutationVariables = Exact<{
  context: RequestContextInput;
  input: RenewSessionRequestInput;
}>;


export type CommunicationRenewSessionMutation = { renewSession: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { tokenExpiresAt: string, sessionToken: string, session: { sessionId: string, principalId: string, deviceId: string, incarnation: string, sessionRevision: string, expiresAt: string, status: string } | null } | null } };

export type CommunicationRevokeSessionMutationVariables = Exact<{
  context: RequestContextInput;
  input: RevokeSessionRequestInput;
}>;


export type CommunicationRevokeSessionMutation = { revokeSession: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { sessionId: string, status: string, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null } };

export type CommunicationCreateConversationMutationVariables = Exact<{
  context: RequestContextInput;
  input: CreateConversationRequestInput;
}>;


export type CommunicationCreateConversationMutation = { createConversation: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { conversationId: string, revision: string, title: string, props: Record<string, unknown> | null, latestSequence: string, membership: { conversationId: string, principalId: string, role: string, status: string, membershipEpoch: string, visibilityEpoch: string, revision: string, visibleFromSequence: string, canStartBroadcast: boolean } | null } | null } };

export type CommunicationUpdateConversationMutationVariables = Exact<{
  context: RequestContextInput;
  input: UpdateConversationRequestInput;
}>;


export type CommunicationUpdateConversationMutation = { updateConversation: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { conversationId: string, revision: string, title: string, props: Record<string, unknown> | null, latestSequence: string, membership: { conversationId: string, principalId: string, role: string, status: string, membershipEpoch: string, visibilityEpoch: string, revision: string, visibleFromSequence: string, canStartBroadcast: boolean } | null } | null } };

export type CommunicationAddMemberMutationVariables = Exact<{
  context: RequestContextInput;
  input: AddMemberRequestInput;
}>;


export type CommunicationAddMemberMutation = { addMember: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { conversationId: string, principalId: string, role: string, status: string, membershipEpoch: string, visibilityEpoch: string, revision: string, visibleFromSequence: string, canStartBroadcast: boolean } | null } };

export type CommunicationAddMembersMutationVariables = Exact<{
  context: RequestContextInput;
  input: AddMembersInput;
}>;


export type CommunicationAddMembersMutation = { addMembers: { status: string, requestId: string, receiptId: string, committedAt: string, replayed: boolean, result: { items: Array<{ conversationId: string, principalId: string, role: string, status: string, membershipEpoch: string, visibilityEpoch: string, revision: string, visibleFromSequence: string, canStartBroadcast: boolean }> } } };

export type CommunicationRemoveMemberMutationVariables = Exact<{
  context: RequestContextInput;
  input: RemoveMemberRequestInput;
}>;


export type CommunicationRemoveMemberMutation = { removeMember: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { conversationId: string, principalId: string, role: string, status: string, membershipEpoch: string, visibilityEpoch: string, revision: string, visibleFromSequence: string, canStartBroadcast: boolean } | null } };

export type CommunicationHistoryGrantMutationVariables = Exact<{
  context: RequestContextInput;
  input: HistoryGrantRequestInput;
}>;


export type CommunicationHistoryGrantMutation = { historyGrant: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { conversationId: string, principalId: string, role: string, status: string, membershipEpoch: string, visibilityEpoch: string, revision: string, visibleFromSequence: string, canStartBroadcast: boolean } | null } };

export type CommunicationSendMessageMutationVariables = Exact<{
  context: RequestContextInput;
  input: SendMessageRequestInput;
}>;


export type CommunicationSendMessageMutation = { sendMessage: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { messageId: string, conversationId: string, sequence: string, revision: string, status: string, cursor: { incarnation: string, conversationId: string, sequence: string } | null } | null } };

export type CommunicationEditMessageMutationVariables = Exact<{
  context: RequestContextInput;
  input: EditMessageRequestInput;
}>;


export type CommunicationEditMessageMutation = { editMessage: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { messageId: string, conversationId: string, authorId: string, sequence: string, revision: string, revisionSequence: string, createdAt: string, deleted: boolean, text: string | null, props: Record<string, unknown> | null, editedAt: string | null } | null } };

export type CommunicationDeleteMessageMutationVariables = Exact<{
  context: RequestContextInput;
  input: DeleteMessageRequestInput;
}>;


export type CommunicationDeleteMessageMutation = { deleteMessage: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { messageId: string, conversationId: string, authorId: string, sequence: string, revision: string, revisionSequence: string, createdAt: string, deleted: boolean, text: string | null, props: Record<string, unknown> | null, editedAt: string | null } | null } };

export type CommunicationReportReceiptMutationVariables = Exact<{
  context: RequestContextInput;
  input: ReportReceiptRequestInput;
}>;


export type CommunicationReportReceiptMutation = { reportReceipt: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { principalId: string, membershipEpoch: string, visibilityEpoch: string, deliveredThroughSequence: string | null, readThroughSequence: string | null, updatedAt: string | null } | null } };

export type CommunicationTypingMutationVariables = Exact<{
  context: RequestContextInput;
  input: TypingRequestInput;
}>;


export type CommunicationTypingMutation = { typing: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { accepted: boolean } | null } };

export type CommunicationStartCallMutationVariables = Exact<{
  context: RequestContextInput;
  input: StartCallRequestInput;
}>;


export type CommunicationStartCallMutation = { startCall: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { callId: string, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null } };

export type CommunicationInviteCallMutationVariables = Exact<{
  context: RequestContextInput;
  input: InviteCallRequestInput;
}>;


export type CommunicationInviteCallMutation = { inviteCall: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { callId: string, conversationId: string, revision: string, generation: string, state: string, creatorId: string, errorCode: string | null, media: { audio: boolean, video: boolean } | null, invitation: { invitationId: string, callId: string, generation: string, principalId: string, status: string, expiresAt: string } | null, participation: { principalId: string, sessionId: string | null, deviceId: string | null, status: string, nativeConnectionId: string | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null } };

export type CommunicationRingCallMutationVariables = Exact<{
  context: RequestContextInput;
  input: RingCallRequestInput;
}>;


export type CommunicationRingCallMutation = { ringCall: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { callId: string, conversationId: string, revision: string, generation: string, state: string, creatorId: string, errorCode: string | null, media: { audio: boolean, video: boolean } | null, invitation: { invitationId: string, callId: string, generation: string, principalId: string, status: string, expiresAt: string } | null, participation: { principalId: string, sessionId: string | null, deviceId: string | null, status: string, nativeConnectionId: string | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null } };

export type CommunicationAcceptCallMutationVariables = Exact<{
  context: RequestContextInput;
  input: AcceptCallRequestInput;
}>;


export type CommunicationAcceptCallMutation = { acceptCall: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { callId: string, conversationId: string, revision: string, generation: string, state: string, creatorId: string, errorCode: string | null, media: { audio: boolean, video: boolean } | null, invitation: { invitationId: string, callId: string, generation: string, principalId: string, status: string, expiresAt: string } | null, participation: { principalId: string, sessionId: string | null, deviceId: string | null, status: string, nativeConnectionId: string | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null } };

export type CommunicationDeclineCallMutationVariables = Exact<{
  context: RequestContextInput;
  input: DeclineCallRequestInput;
}>;


export type CommunicationDeclineCallMutation = { declineCall: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { callId: string, conversationId: string, revision: string, generation: string, state: string, creatorId: string, errorCode: string | null, media: { audio: boolean, video: boolean } | null, invitation: { invitationId: string, callId: string, generation: string, principalId: string, status: string, expiresAt: string } | null, participation: { principalId: string, sessionId: string | null, deviceId: string | null, status: string, nativeConnectionId: string | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null } };

export type CommunicationMediaCredentialsMutationVariables = Exact<{
  context: RequestContextInput;
  input: MediaCredentialsRequestInput;
}>;


export type CommunicationMediaCredentialsMutation = { mediaCredentials: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { callId: string, generation: string, roomName: string, participantIdentity: string, livekitUrl: string, transportToken: string, forwardingLease: Record<string, unknown> | null, admissionTicket: Record<string, unknown> | null, transportExpiresAt: string, admissionExpiresAt: string, leaseExpiresAt: string, leasePolicyId: string } | null } };

export type CommunicationLeaveCallMutationVariables = Exact<{
  context: RequestContextInput;
  input: LeaveCallRequestInput;
}>;


export type CommunicationLeaveCallMutation = { leaveCall: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { callId: string, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null } };

export type CommunicationEndCallMutationVariables = Exact<{
  context: RequestContextInput;
  input: EndCallRequestInput;
}>;


export type CommunicationEndCallMutation = { endCall: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { callId: string, conversationId: string | null, revision: string | null, generation: string | null, state: string | null, creatorId: string | null, errorCode: string | null, media: { audio: boolean, video: boolean } | null, invitation: { invitationId: string, callId: string, generation: string, principalId: string, status: string, expiresAt: string } | null, participation: { principalId: string, sessionId: string | null, deviceId: string | null, status: string, nativeConnectionId: string | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null } };

export type CommunicationRedeemCredentialMutationVariables = Exact<{
  context: RequestContextInput;
  input: RedeemCredentialRequestInput;
}>;


export type CommunicationRedeemCredentialMutation = { redeemCredential: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { kind: string, keyId: string | null, backendPrincipalId: string | null, backendKey: string | null, expiresAt: string | null, endpointId: string | null, secretVersion: string | null, secret: string | null } | null } };

export type CommunicationAcknowledgeCredentialMutationVariables = Exact<{
  context: RequestContextInput;
  input: AcknowledgeCredentialRequestInput;
}>;


export type CommunicationAcknowledgeCredentialMutation = { acknowledgeCredential: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { deliveryId: string, acknowledged: boolean } | null } };

export type CommunicationConversationEventsSubscriptionVariables = Exact<{
  context: RequestContextInput;
  input: EventsRequestInput;
}>;


export type CommunicationConversationEventsSubscription = { conversationEvents: { complete: boolean, refreshRequired: boolean, items: Array<{ eventId: string, conversationId: string, sequence: string, eventVersion: string, type: string, occurredAt: string, subjectRef: { kind: string, id: string } | null, payload: { messageId: string | null, revision: string | null, revisionSequence: string | null, principalId: string | null, membershipEpoch: string | null, visibilityEpoch: string | null, kind: string | null, throughSequence: string | null, callId: string | null, generation: string | null, state: string | null, cutoffEvidence: string | null } | null }>, nextCursor: { incarnation: string, conversationId: string, sequence: string } | null } };

export type ManagementCapabilitiesQueryVariables = Exact<{
  context: RequestContextInput;
}>;


export type ManagementCapabilitiesQuery = { capabilities: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { contractVersion: string, serverRelease: string, publicApiVersion: string, wssVersions: Array<string>, capabilityRevision: string, limitsRevision: string, environment: string, productionQualified: boolean, geoControlAuthorityId: string | null, offerings: Array<string>, geos: Array<string>, installationProfiles: Array<string>, portalIdentity: string | null, features: { chat: boolean, inbox: boolean, lexicalSearch: boolean, typing: boolean, foregroundCalls: boolean, webhooks: boolean } | null, limits: Array<{ key: string, value: { maximum: string | null, unit: string | null, scope: string | null, milliseconds: string | null, policyId: string | null, revision: string | null } }>, mediaPolicy: { leasePolicyId: string, leaseProtocolVersion: string, maxLeaseMs: string, renewAttemptMs: string, preludeMaxBytes: string, preludeTimeoutMs: string, clockProfileId: string } | null } | null } };

export type ManagementOrganizationsQueryVariables = Exact<{
  context: RequestContextInput;
}>;


export type ManagementOrganizationsQuery = { organizations: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { complete: boolean, refreshRequired: boolean, nextCursor: string | null, items: Array<{ orgId: string, name: string, status: string, revision: string }> } | null } };

export type ManagementGetOrganizationQueryVariables = Exact<{
  context: RequestContextInput;
  input: GetOrganizationRequestInput;
}>;


export type ManagementGetOrganizationQuery = { getOrganization: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { orgId: string, name: string, status: string, revision: string } | null } };

export type ManagementGetDeploymentQueryVariables = Exact<{
  context: RequestContextInput;
  input: GetDeploymentRequestInput;
}>;


export type ManagementGetDeploymentQuery = { getDeployment: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { deploymentId: string, orgId: string, offering: string, geoId: string, installationId: string, resourceOwner: string, approvedRegions: Array<string>, readiness: string, revision: string, consentRef: string, environment: string } | null } };

export type ManagementGetProjectQueryVariables = Exact<{
  context: RequestContextInput;
  input: GetProjectRequestInput;
}>;


export type ManagementGetProjectQuery = { getProject: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { projectId: string, deploymentId: string, name: string, environment: string, incarnation: string, servingRegion: string, servingEpoch: string, status: string, revision: string, policyRevision: string } | null } };

export type ManagementDeploymentHealthQueryVariables = Exact<{
  context: RequestContextInput;
  input: DeploymentHealthRequestInput;
}>;


export type ManagementDeploymentHealthQuery = { deploymentHealth: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { deploymentId: string, readiness: string, observedAt: string, services: Array<{ role: string, observedAt: string, details: { status: string } | null }> } | null } };

export type ManagementDeploymentUsageQueryVariables = Exact<{
  context: RequestContextInput;
  input: DeploymentUsageRequestInput;
}>;


export type ManagementDeploymentUsageQuery = { deploymentUsage: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { deploymentId: string, source: string, observedAt: string, complete: boolean, reason: string } | null } };

export type ManagementWebhookDeliveriesQueryVariables = Exact<{
  context: RequestContextInput;
  input: WebhookDeliveriesRequestInput;
}>;


export type ManagementWebhookDeliveriesQuery = { webhookDeliveries: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { complete: boolean, refreshRequired: boolean, nextCursor: string | null, items: Array<{ effectId: string, eventId: string, state: string, attempts: string, lastOutcome: string | null, nextAttemptAt: string }> } | null } };

export type ManagementResolveRequestQueryVariables = Exact<{
  context: RequestContextInput;
  input: ResolveRequestRequestInput;
}>;


export type ManagementResolveRequestQuery = { resolveRequest: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { state: string, requestId: string, checkedAt: string, resultWithheld: boolean, receipt: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { signedProof: Record<string, unknown> | null, call: { callId: string, conversationId: string, revision: string, generation: string, state: string, creatorId: string, errorCode: string | null, media: { audio: boolean, video: boolean } | null, invitation: { invitationId: string, callId: string, generation: string, principalId: string, status: string, expiresAt: string } | null, participation: { principalId: string, sessionId: string | null, deviceId: string | null, status: string, nativeConnectionId: string | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null, callSummary: { callId: string, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null, conversation: { conversationId: string, revision: string, title: string, props: Record<string, unknown> | null, latestSequence: string, membership: { conversationId: string, principalId: string, role: string, status: string, membershipEpoch: string, visibilityEpoch: string, revision: string, visibleFromSequence: string, canStartBroadcast: boolean } | null } | null, conversationMemberBatch: { items: Array<{ conversationId: string, principalId: string, role: string, status: string, membershipEpoch: string, visibilityEpoch: string, revision: string, visibleFromSequence: string, canStartBroadcast: boolean }> } | null, credentialDeliveryReceipt: { deliveryId: string } | null, deliveryAck: { deliveryId: string, acknowledged: boolean } | null, mediaGrant: { callId: string, generation: string, roomName: string, participantIdentity: string, livekitUrl: string, transportToken: string, forwardingLease: Record<string, unknown> | null, admissionTicket: Record<string, unknown> | null, transportExpiresAt: string, admissionExpiresAt: string, leaseExpiresAt: string, leasePolicyId: string } | null, member: { conversationId: string, principalId: string, role: string, status: string, membershipEpoch: string, visibilityEpoch: string, revision: string, visibleFromSequence: string, canStartBroadcast: boolean } | null, message: { messageId: string, conversationId: string, authorId: string, sequence: string, revision: string, revisionSequence: string, createdAt: string, deleted: boolean, text: string | null, props: Record<string, unknown> | null, editedAt: string | null } | null, messageAck: { messageId: string, conversationId: string, sequence: string, revision: string, status: string, cursor: { incarnation: string, conversationId: string, sequence: string } | null } | null, organization: { orgId: string, name: string, status: string, revision: string } | null, principal: { principalId: string, externalUserId: string, status: string, revision: string } | null, readReceipt: { principalId: string, membershipEpoch: string, visibilityEpoch: string, deliveredThroughSequence: string | null, readThroughSequence: string | null, updatedAt: string | null } | null, sessionBootstrap: { tokenExpiresAt: string, sessionToken: string, session: { sessionId: string, principalId: string, deviceId: string, incarnation: string, sessionRevision: string, expiresAt: string, status: string } | null } | null, sessionRevocation: { sessionId: string, status: string, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null } | null } | null } | null } };

export type ManagementGetOperationQueryVariables = Exact<{
  context: RequestContextInput;
  input: GetOperationRequestInput;
}>;


export type ManagementGetOperationQuery = { getOperation: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { operationId: string, kind: string, state: string, revision: string, requestedAt: string, updatedAt: string, blockedReason: string | null, targetRef: { kind: string, id: string } | null, steps: Array<{ stepId: string, state: string }>, result: { projectId: string | null, incarnation: string | null, status: string | null, backend: string | null, environment: string | null, policyRevision: string | null, expiresAt: string | null, kind: string | null, keyId: string | null, endpointId: string | null, enabled: boolean | null, callId: string | null, conversationId: string | null, revision: string | null, generation: string | null, state: string | null, creatorId: string | null, errorCode: string | null, resourceRef: { kind: string, id: string } | null, delivery: { deliveryId: string, kind: string, projectId: string, installationId: string, expiresAt: string, payloadDigest: string, resourceRef: { kind: string, id: string } | null, recipientActorRef: { tenantId: string, objectId: string } | null } | null, media: { audio: boolean, video: boolean } | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null } | null } };

export type ManagementCreateOrganizationMutationVariables = Exact<{
  context: RequestContextInput;
  input: CreateOrganizationRequestInput;
}>;


export type ManagementCreateOrganizationMutation = { createOrganization: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { orgId: string, name: string, status: string, revision: string } | null } };

export type ManagementCreateDeploymentMutationVariables = Exact<{
  context: RequestContextInput;
  input: CreateDeploymentRequestInput;
}>;


export type ManagementCreateDeploymentMutation = { createDeployment: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { projectId: string | null, incarnation: string | null, status: string | null, backend: string | null, environment: string | null, policyRevision: string | null, expiresAt: string | null, kind: string | null, keyId: string | null, endpointId: string | null, enabled: boolean | null, callId: string | null, conversationId: string | null, revision: string | null, generation: string | null, state: string | null, creatorId: string | null, errorCode: string | null, resourceRef: { kind: string, id: string } | null, delivery: { deliveryId: string, kind: string, projectId: string, installationId: string, expiresAt: string, payloadDigest: string, resourceRef: { kind: string, id: string } | null, recipientActorRef: { tenantId: string, objectId: string } | null } | null, media: { audio: boolean, video: boolean } | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null } };

export type ManagementCreateProjectMutationVariables = Exact<{
  context: RequestContextInput;
  input: CreateProjectRequestInput;
}>;


export type ManagementCreateProjectMutation = { createProject: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { projectId: string | null, incarnation: string | null, status: string | null, backend: string | null, environment: string | null, policyRevision: string | null, expiresAt: string | null, kind: string | null, keyId: string | null, endpointId: string | null, enabled: boolean | null, callId: string | null, conversationId: string | null, revision: string | null, generation: string | null, state: string | null, creatorId: string | null, errorCode: string | null, resourceRef: { kind: string, id: string } | null, delivery: { deliveryId: string, kind: string, projectId: string, installationId: string, expiresAt: string, payloadDigest: string, resourceRef: { kind: string, id: string } | null, recipientActorRef: { tenantId: string, objectId: string } | null } | null, media: { audio: boolean, video: boolean } | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null } };

export type ManagementIssueBackendKeyMutationVariables = Exact<{
  context: RequestContextInput;
  input: IssueBackendKeyRequestInput;
}>;


export type ManagementIssueBackendKeyMutation = { issueBackendKey: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { projectId: string | null, incarnation: string | null, status: string | null, backend: string | null, environment: string | null, policyRevision: string | null, expiresAt: string | null, kind: string | null, keyId: string | null, endpointId: string | null, enabled: boolean | null, callId: string | null, conversationId: string | null, revision: string | null, generation: string | null, state: string | null, creatorId: string | null, errorCode: string | null, resourceRef: { kind: string, id: string } | null, delivery: { deliveryId: string, kind: string, projectId: string, installationId: string, expiresAt: string, payloadDigest: string, resourceRef: { kind: string, id: string } | null, recipientActorRef: { tenantId: string, objectId: string } | null } | null, media: { audio: boolean, video: boolean } | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null } };

export type ManagementRevokeBackendKeyMutationVariables = Exact<{
  context: RequestContextInput;
  input: RevokeBackendKeyRequestInput;
}>;


export type ManagementRevokeBackendKeyMutation = { revokeBackendKey: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { projectId: string | null, incarnation: string | null, status: string | null, backend: string | null, environment: string | null, policyRevision: string | null, expiresAt: string | null, kind: string | null, keyId: string | null, endpointId: string | null, enabled: boolean | null, callId: string | null, conversationId: string | null, revision: string | null, generation: string | null, state: string | null, creatorId: string | null, errorCode: string | null, resourceRef: { kind: string, id: string } | null, delivery: { deliveryId: string, kind: string, projectId: string, installationId: string, expiresAt: string, payloadDigest: string, resourceRef: { kind: string, id: string } | null, recipientActorRef: { tenantId: string, objectId: string } | null } | null, media: { audio: boolean, video: boolean } | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null } };

export type ManagementProjectPolicyMutationVariables = Exact<{
  context: RequestContextInput;
  input: ProjectPolicyRequestInput;
}>;


export type ManagementProjectPolicyMutation = { projectPolicy: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { projectId: string | null, incarnation: string | null, status: string | null, backend: string | null, environment: string | null, policyRevision: string | null, expiresAt: string | null, kind: string | null, keyId: string | null, endpointId: string | null, enabled: boolean | null, callId: string | null, conversationId: string | null, revision: string | null, generation: string | null, state: string | null, creatorId: string | null, errorCode: string | null, resourceRef: { kind: string, id: string } | null, delivery: { deliveryId: string, kind: string, projectId: string, installationId: string, expiresAt: string, payloadDigest: string, resourceRef: { kind: string, id: string } | null, recipientActorRef: { tenantId: string, objectId: string } | null } | null, media: { audio: boolean, video: boolean } | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null } };

export type ManagementCredentialPermitMutationVariables = Exact<{
  context: RequestContextInput;
  input: CredentialPermitRequestInput;
}>;


export type ManagementCredentialPermitMutation = { credentialPermit: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, result: Record<string, unknown> | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null } };

export type ManagementPauseOperationMutationVariables = Exact<{
  context: RequestContextInput;
  input: PauseOperationRequestInput;
}>;


export type ManagementPauseOperationMutation = { pauseOperation: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { operationId: string, kind: string, state: string, revision: string, requestedAt: string, updatedAt: string, blockedReason: string | null, targetRef: { kind: string, id: string } | null, steps: Array<{ stepId: string, state: string }>, result: { projectId: string | null, incarnation: string | null, status: string | null, backend: string | null, environment: string | null, policyRevision: string | null, expiresAt: string | null, kind: string | null, keyId: string | null, endpointId: string | null, enabled: boolean | null, callId: string | null, conversationId: string | null, revision: string | null, generation: string | null, state: string | null, creatorId: string | null, errorCode: string | null, resourceRef: { kind: string, id: string } | null, delivery: { deliveryId: string, kind: string, projectId: string, installationId: string, expiresAt: string, payloadDigest: string, resourceRef: { kind: string, id: string } | null, recipientActorRef: { tenantId: string, objectId: string } | null } | null, media: { audio: boolean, video: boolean } | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null } | null } };

export type ManagementResumeOperationMutationVariables = Exact<{
  context: RequestContextInput;
  input: ResumeOperationRequestInput;
}>;


export type ManagementResumeOperationMutation = { resumeOperation: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { operationId: string, kind: string, state: string, revision: string, requestedAt: string, updatedAt: string, blockedReason: string | null, targetRef: { kind: string, id: string } | null, steps: Array<{ stepId: string, state: string }>, result: { projectId: string | null, incarnation: string | null, status: string | null, backend: string | null, environment: string | null, policyRevision: string | null, expiresAt: string | null, kind: string | null, keyId: string | null, endpointId: string | null, enabled: boolean | null, callId: string | null, conversationId: string | null, revision: string | null, generation: string | null, state: string | null, creatorId: string | null, errorCode: string | null, resourceRef: { kind: string, id: string } | null, delivery: { deliveryId: string, kind: string, projectId: string, installationId: string, expiresAt: string, payloadDigest: string, resourceRef: { kind: string, id: string } | null, recipientActorRef: { tenantId: string, objectId: string } | null } | null, media: { audio: boolean, video: boolean } | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null } | null } };

export type ManagementConfigureWebhookMutationVariables = Exact<{
  context: RequestContextInput;
  input: ConfigureWebhookRequestInput;
}>;


export type ManagementConfigureWebhookMutation = { configureWebhook: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { projectId: string | null, incarnation: string | null, status: string | null, backend: string | null, environment: string | null, policyRevision: string | null, expiresAt: string | null, kind: string | null, keyId: string | null, endpointId: string | null, enabled: boolean | null, callId: string | null, conversationId: string | null, revision: string | null, generation: string | null, state: string | null, creatorId: string | null, errorCode: string | null, resourceRef: { kind: string, id: string } | null, delivery: { deliveryId: string, kind: string, projectId: string, installationId: string, expiresAt: string, payloadDigest: string, resourceRef: { kind: string, id: string } | null, recipientActorRef: { tenantId: string, objectId: string } | null } | null, media: { audio: boolean, video: boolean } | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null } };

export type ManagementDisableWebhookMutationVariables = Exact<{
  context: RequestContextInput;
  input: DisableWebhookRequestInput;
}>;


export type ManagementDisableWebhookMutation = { disableWebhook: { status: string, requestId: string, serverTime: string | null, receiptId: string | null, committedAt: string | null, replayed: boolean | null, operation: { operationId: string, owner: string, href: string, state: string } | null, resourceRef: { kind: string, id: string } | null, result: { projectId: string | null, incarnation: string | null, status: string | null, backend: string | null, environment: string | null, policyRevision: string | null, expiresAt: string | null, kind: string | null, keyId: string | null, endpointId: string | null, enabled: boolean | null, callId: string | null, conversationId: string | null, revision: string | null, generation: string | null, state: string | null, creatorId: string | null, errorCode: string | null, resourceRef: { kind: string, id: string } | null, delivery: { deliveryId: string, kind: string, projectId: string, installationId: string, expiresAt: string, payloadDigest: string, resourceRef: { kind: string, id: string } | null, recipientActorRef: { tenantId: string, objectId: string } | null } | null, media: { audio: boolean, video: boolean } | null, mediaCutoff: { state: string, scope: { kind: string, principalId: string | null, sessionId: string | null, deviceId: string | null, callId: string | null } | null } | null } | null } };
