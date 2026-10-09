// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.api;

import com.convohop.server.internal.OperationCatalog;
import com.convohop.server.internal.OperationDescriptor;
import com.convohop.server.internal.Wire;
import com.convohop.server.model.AcknowledgeCredentialReply;
import com.convohop.server.model.AddMemberReply;
import com.convohop.server.model.AddMembersPayload;
import com.convohop.server.model.AgentAuditEventsReply;
import com.convohop.server.model.AgentCredentialPermitReply;
import com.convohop.server.model.AgentGrantsReply;
import com.convohop.server.model.AgentSignupForApprovalReply;
import com.convohop.server.model.AgentSignupReply;
import com.convohop.server.model.AlertLiveSessionPayload;
import com.convohop.server.model.ApproveAgentSignupReply;
import com.convohop.server.model.CapabilitiesReply;
import com.convohop.server.model.ConfigureWebhookReply;
import com.convohop.server.model.ConversationMuteReply;
import com.convohop.server.model.CreateBillingCheckoutSessionReply;
import com.convohop.server.model.CreateBillingPortalSessionReply;
import com.convohop.server.model.CreateConversationReply;
import com.convohop.server.model.CreateDeploymentReply;
import com.convohop.server.model.CreateOrganizationReply;
import com.convohop.server.model.CreatePrincipalReply;
import com.convohop.server.model.CreateProjectReply;
import com.convohop.server.model.CredentialPermitReply;
import com.convohop.server.model.CurrentLiveSessionReply;
import com.convohop.server.model.DeleteMessageReply;
import com.convohop.server.model.DeploymentHealthReply;
import com.convohop.server.model.DeploymentUsageReply;
import com.convohop.server.model.DisablePrincipalReply;
import com.convohop.server.model.DisableWebhookReply;
import com.convohop.server.model.EditMessageReply;
import com.convohop.server.model.EndLiveSessionPayload;
import com.convohop.server.model.GetConversationReply;
import com.convohop.server.model.GetDeploymentReply;
import com.convohop.server.model.GetMessageReply;
import com.convohop.server.model.GetOperationReply;
import com.convohop.server.model.GetOrganizationReply;
import com.convohop.server.model.GetPrincipalReply;
import com.convohop.server.model.GetProjectReply;
import com.convohop.server.model.HistoryGrantReply;
import com.convohop.server.model.InboxReply;
import com.convohop.server.model.IssueAgentKeyReply;
import com.convohop.server.model.IssueBackendKeyReply;
import com.convohop.server.model.IssueSessionReply;
import com.convohop.server.model.LiveParticipantPageReply;
import com.convohop.server.model.LiveSessionOperationReply;
import com.convohop.server.model.LiveSessionPageReply;
import com.convohop.server.model.LiveSessionReply;
import com.convohop.server.model.MembersReply;
import com.convohop.server.model.MessagesReply;
import com.convohop.server.model.OrganizationBillingReply;
import com.convohop.server.model.OrganizationSpendReply;
import com.convohop.server.model.OrganizationUsageReply;
import com.convohop.server.model.OrganizationsReply;
import com.convohop.server.model.PauseOperationReply;
import com.convohop.server.model.ProjectPolicyReply;
import com.convohop.server.model.ProjectUsageReply;
import com.convohop.server.model.PurchaseAgentCreditsReply;
import com.convohop.server.model.RedeemCredentialReply;
import com.convohop.server.model.RejectAgentSignupReply;
import com.convohop.server.model.RemoveMemberReply;
import com.convohop.server.model.RenewSessionReply;
import com.convohop.server.model.ReplayWebhookDeliveriesReply;
import com.convohop.server.model.RequestAgentSignupReply;
import com.convohop.server.model.ResolveRequestReply;
import com.convohop.server.model.ResumeOperationReply;
import com.convohop.server.model.RevokeAgentGrantReply;
import com.convohop.server.model.RevokeBackendKeyReply;
import com.convohop.server.model.RevokeSessionReply;
import com.convohop.server.model.RotateWebhookSecretReply;
import com.convohop.server.model.RouteReply;
import com.convohop.server.model.SearchReply;
import com.convohop.server.model.SendMessageReply;
import com.convohop.server.model.SessionRequestOutcomeReply;
import com.convohop.server.model.SetBroadcastPermissionPayload;
import com.convohop.server.model.SetConversationMutePayload;
import com.convohop.server.model.SetSpendControlsReply;
import com.convohop.server.model.UpdateConversationReply;
import com.convohop.server.model.UpdateWebhookReply;
import com.convohop.server.model.WebhookDeliveriesReply;
import com.convohop.server.model.WebhookEndpointsReply;
import java.util.List;
import java.util.Map;

/** Descriptors of the server-layer queries and mutations, and each plane's resolve operation. */
public final class Operations {
  private Operations() {}

  /** <code>communication.capabilities</code>: Describe the features, limits and API model the authority supports. */
  public static final OperationDescriptor<CapabilitiesReply> COMMUNICATION_CAPABILITIES =
      OperationDescriptor.builder("communication.capabilities", Wire.required(CapabilitiesReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("capabilities")
          .operationName("CommunicationCapabilities")
          .resultType("CapabilitiesReply!")
          .inputFields(List.of())
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query CommunicationCapabilities($context: RequestContextInput!) {\n"
              + "  capabilities(context: $context) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      serverRelease\n"
              + "      capabilityRevision\n"
              + "      limitsRevision\n"
              + "      features {\n"
              + "        chat\n"
              + "        inbox\n"
              + "        lexicalSearch\n"
              + "        typing\n"
              + "        webhooks\n"
              + "        liveSessions\n"
              + "        liveBroadcast\n"
              + "      }\n"
              + "      limits {\n"
              + "        key\n"
              + "        value {\n"
              + "          maximum\n"
              + "          unit\n"
              + "          scope\n"
              + "          milliseconds\n"
              + "          policyId\n"
              + "          revision\n"
              + "        }\n"
              + "      }\n"
              + "      environment\n"
              + "      productionQualified\n"
              + "      mediaPolicy {\n"
              + "        leasePolicyId\n"
              + "        maxLeaseMs\n"
              + "        renewAttemptMs\n"
              + "        preludeMaxBytes\n"
              + "        preludeTimeoutMs\n"
              + "        clockProfileId\n"
              + "      }\n"
              + "      geoControlAuthorityId\n"
              + "      offerings\n"
              + "      geos\n"
              + "      installationProfiles\n"
              + "      portalIdentity\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.route</code>: Return the signed route: project incarnation, serving epoch and realtime endpoint. Call it before other communication operations and again after WRONG_REGION. */
  public static final OperationDescriptor<RouteReply> COMMUNICATION_ROUTE =
      OperationDescriptor.builder("communication.route", Wire.required(RouteReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("route")
          .operationName("CommunicationRoute")
          .resultType("RouteReply!")
          .inputFields(List.of())
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query CommunicationRoute($context: RequestContextInput!) {\n"
              + "  route(context: $context) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.getPrincipal</code>: Read a principal (an application user). */
  public static final OperationDescriptor<GetPrincipalReply> COMMUNICATION_GET_PRINCIPAL =
      OperationDescriptor.builder("communication.getPrincipal", Wire.required(GetPrincipalReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("getPrincipal")
          .operationName("CommunicationGetPrincipal")
          .resultType("GetPrincipalReply!")
          .inputFields(List.of("principalId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query CommunicationGetPrincipal($context: RequestContextInput!, $input: GetPrincipalRequestInput!) {\n"
              + "  getPrincipal(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      principalId\n"
              + "      externalUserId\n"
              + "      status\n"
              + "      revision\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.getConversation</code>: Read a conversation. */
  public static final OperationDescriptor<GetConversationReply> COMMUNICATION_GET_CONVERSATION =
      OperationDescriptor.builder("communication.getConversation", Wire.required(GetConversationReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("getConversation")
          .operationName("CommunicationGetConversation")
          .resultType("GetConversationReply!")
          .inputFields(List.of("conversationId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query CommunicationGetConversation($context: RequestContextInput!, $input: GetConversationRequestInput!) {\n"
              + "  getConversation(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      conversationId\n"
              + "      revision\n"
              + "      title\n"
              + "      props\n"
              + "      latestSequence\n"
              + "      membership {\n"
              + "        conversationId\n"
              + "        principalId\n"
              + "        role\n"
              + "        status\n"
              + "        membershipEpoch\n"
              + "        visibilityEpoch\n"
              + "        revision\n"
              + "        visibleFromSequence\n"
              + "        canStartBroadcast\n"
              + "      }\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.members</code>: List the members of a conversation. */
  public static final OperationDescriptor<MembersReply> COMMUNICATION_MEMBERS =
      OperationDescriptor.builder("communication.members", Wire.required(MembersReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("members")
          .operationName("CommunicationMembers")
          .resultType("MembersReply!")
          .inputFields(List.of("conversationId", "limit", "cursor"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query CommunicationMembers($context: RequestContextInput!, $input: MembersRequestInput!) {\n"
              + "  members(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      items {\n"
              + "        conversationId\n"
              + "        principalId\n"
              + "        role\n"
              + "        status\n"
              + "        membershipEpoch\n"
              + "        visibilityEpoch\n"
              + "        revision\n"
              + "        visibleFromSequence\n"
              + "        canStartBroadcast\n"
              + "      }\n"
              + "      complete\n"
              + "      refreshRequired\n"
              + "      nextCursor\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.messages</code>: List the messages of a conversation, newest first. A backend key reads the full history, or the history visible to the member named by actAsPrincipalId. */
  public static final OperationDescriptor<MessagesReply> COMMUNICATION_MESSAGES =
      OperationDescriptor.builder("communication.messages", Wire.required(MessagesReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("messages")
          .operationName("CommunicationMessages")
          .resultType("MessagesReply!")
          .inputFields(List.of("conversationId", "limit", "beforeSequence", "actAsPrincipalId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query CommunicationMessages($context: RequestContextInput!, $input: MessagesRequestInput!) {\n"
              + "  messages(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      items {\n"
              + "        messageId\n"
              + "        conversationId\n"
              + "        authorId\n"
              + "        sequence\n"
              + "        revision\n"
              + "        revisionSequence\n"
              + "        createdAt\n"
              + "        deleted\n"
              + "        text\n"
              + "        props\n"
              + "        editedAt\n"
              + "      }\n"
              + "      complete\n"
              + "      refreshRequired\n"
              + "      nextCursor\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.getMessage</code>: Read one message. A backend key reads any message, or reads as the member named by actAsPrincipalId. */
  public static final OperationDescriptor<GetMessageReply> COMMUNICATION_GET_MESSAGE =
      OperationDescriptor.builder("communication.getMessage", Wire.required(GetMessageReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("getMessage")
          .operationName("CommunicationGetMessage")
          .resultType("GetMessageReply!")
          .inputFields(List.of("conversationId", "messageId", "actAsPrincipalId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query CommunicationGetMessage($context: RequestContextInput!, $input: GetMessageRequestInput!) {\n"
              + "  getMessage(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      messageId\n"
              + "      conversationId\n"
              + "      authorId\n"
              + "      sequence\n"
              + "      revision\n"
              + "      revisionSequence\n"
              + "      createdAt\n"
              + "      deleted\n"
              + "      text\n"
              + "      props\n"
              + "      editedAt\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.inbox</code>: List the conversations visible to the calling user. A backend key must name that user with actAsPrincipalId. */
  public static final OperationDescriptor<InboxReply> COMMUNICATION_INBOX =
      OperationDescriptor.builder("communication.inbox", Wire.required(InboxReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("inbox")
          .operationName("CommunicationInbox")
          .resultType("InboxReply!")
          .inputFields(List.of("limit", "cursor", "actAsPrincipalId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query CommunicationInbox($context: RequestContextInput!, $input: InboxRequestInput!) {\n"
              + "  inbox(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      items {\n"
              + "        conversationId\n"
              + "        title\n"
              + "        activityAt\n"
              + "        visibilityEpoch\n"
              + "        latestVisibleMessage {\n"
              + "          messageId\n"
              + "          conversationId\n"
              + "          authorId\n"
              + "          sequence\n"
              + "          revision\n"
              + "          revisionSequence\n"
              + "          createdAt\n"
              + "          deleted\n"
              + "          text\n"
              + "          props\n"
              + "          editedAt\n"
              + "        }\n"
              + "        hasUnread\n"
              + "      }\n"
              + "      complete\n"
              + "      refreshRequired\n"
              + "      nextCursor\n"
              + "      partialReason\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.search</code>: Search the messages visible to the calling user. A backend key searches as the member named by actAsPrincipalId, or within scope.conversationIds. */
  public static final OperationDescriptor<SearchReply> COMMUNICATION_SEARCH =
      OperationDescriptor.builder("communication.search", Wire.required(SearchReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("search")
          .operationName("CommunicationSearch")
          .resultType("SearchReply!")
          .inputFields(List.of("query", "pageSize", "scope", "cursor", "actAsPrincipalId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query CommunicationSearch($context: RequestContextInput!, $input: SearchRequestInput!) {\n"
              + "  search(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      items {\n"
              + "        conversationId\n"
              + "        message {\n"
              + "          messageId\n"
              + "          conversationId\n"
              + "          authorId\n"
              + "          sequence\n"
              + "          revision\n"
              + "          revisionSequence\n"
              + "          createdAt\n"
              + "          deleted\n"
              + "          text\n"
              + "          props\n"
              + "          editedAt\n"
              + "        }\n"
              + "      }\n"
              + "      complete\n"
              + "      refreshRequired\n"
              + "      nextCursor\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.resolveRequest</code>: Look up the stored outcome of an earlier communication mutation by its requestId. */
  public static final OperationDescriptor<ResolveRequestReply> COMMUNICATION_RESOLVE_REQUEST =
      OperationDescriptor.builder("communication.resolveRequest", Wire.required(ResolveRequestReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("resolveRequest")
          .operationName("CommunicationResolveRequest")
          .resultType("ResolveRequestReply!")
          .inputFields(List.of("requestId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query CommunicationResolveRequest($context: RequestContextInput!, $input: ResolveRequestRequestInput!) {\n"
              + "  resolveRequest(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      state\n"
              + "      requestId\n"
              + "      checkedAt\n"
              + "      resultWithheld\n"
              + "      receipt {\n"
              + "        status\n"
              + "        requestId\n"
              + "        serverTime\n"
              + "        receiptId\n"
              + "        committedAt\n"
              + "        replayed\n"
              + "        operation {\n"
              + "          operationId\n"
              + "          owner\n"
              + "          href\n"
              + "          state\n"
              + "        }\n"
              + "        resourceRef {\n"
              + "          kind\n"
              + "          id\n"
              + "        }\n"
              + "        result {\n"
              + "          agentGrant {\n"
              + "            grantId\n"
              + "            orgId\n"
              + "            signupId\n"
              + "            agentActorId\n"
              + "            projectId\n"
              + "            scopes\n"
              + "            expiresAt\n"
              + "            revokedAt\n"
              + "            createdAt\n"
              + "            keys {\n"
              + "              operationId\n"
              + "              state\n"
              + "              scopes\n"
              + "              expiresAt\n"
              + "              keyId\n"
              + "              deliveryId\n"
              + "              deliveryExpiresAt\n"
              + "            }\n"
              + "          }\n"
              + "          agentSignupStatus {\n"
              + "            signupId\n"
              + "            state\n"
              + "            orgId\n"
              + "            deploymentId\n"
              + "            projectId\n"
              + "            nextStep\n"
              + "            scopes\n"
              + "            grantExpiresAt\n"
              + "            keys {\n"
              + "              operationId\n"
              + "              state\n"
              + "              scopes\n"
              + "              expiresAt\n"
              + "              keyId\n"
              + "              deliveryId\n"
              + "              deliveryExpiresAt\n"
              + "            }\n"
              + "            incarnation\n"
              + "            servingEpoch\n"
              + "          }\n"
              + "          billingCheckoutSession {\n"
              + "            orgId\n"
              + "            planId\n"
              + "            url\n"
              + "            expiresAt\n"
              + "          }\n"
              + "          billingPortalSession {\n"
              + "            orgId\n"
              + "            url\n"
              + "            expiresAt\n"
              + "          }\n"
              + "          broadcastPermissionChanged {\n"
              + "            member {\n"
              + "              conversationId\n"
              + "              principalId\n"
              + "              role\n"
              + "              status\n"
              + "              membershipEpoch\n"
              + "              visibilityEpoch\n"
              + "              revision\n"
              + "              visibleFromSequence\n"
              + "              canStartBroadcast\n"
              + "            }\n"
              + "            mediaCutoff {\n"
              + "              state\n"
              + "              scope {\n"
              + "                kind\n"
              + "                liveSessionId\n"
              + "                generation\n"
              + "                participationId\n"
              + "              }\n"
              + "              evidence\n"
              + "              enforcedAt\n"
              + "              operationId\n"
              + "            }\n"
              + "          }\n"
              + "          conversation {\n"
              + "            conversationId\n"
              + "            revision\n"
              + "            title\n"
              + "            props\n"
              + "            latestSequence\n"
              + "            membership {\n"
              + "              conversationId\n"
              + "              principalId\n"
              + "              role\n"
              + "              status\n"
              + "              membershipEpoch\n"
              + "              visibilityEpoch\n"
              + "              revision\n"
              + "              visibleFromSequence\n"
              + "              canStartBroadcast\n"
              + "            }\n"
              + "          }\n"
              + "          conversationMemberBatch {\n"
              + "            items {\n"
              + "              conversationId\n"
              + "              principalId\n"
              + "              role\n"
              + "              status\n"
              + "              membershipEpoch\n"
              + "              visibilityEpoch\n"
              + "              revision\n"
              + "              visibleFromSequence\n"
              + "              canStartBroadcast\n"
              + "            }\n"
              + "          }\n"
              + "          conversationMute {\n"
              + "            conversationId\n"
              + "            principalId\n"
              + "            muted\n"
              + "            until\n"
              + "          }\n"
              + "          credentialDeliveryReceipt {\n"
              + "            deliveryId\n"
              + "          }\n"
              + "          deliveryAck {\n"
              + "            deliveryId\n"
              + "            acknowledged\n"
              + "          }\n"
              + "          liveAlertBatch {\n"
              + "            liveSessionId\n"
              + "            created\n"
              + "            suppressed\n"
              + "          }\n"
              + "          liveCredentialIssuance {\n"
              + "            liveSessionId\n"
              + "            participationId\n"
              + "            generation\n"
              + "            leaseId\n"
              + "            grantOrdinal\n"
              + "            admissionExpiresAt\n"
              + "            leaseExpiresAt\n"
              + "          }\n"
              + "          liveSessionEndRequested {\n"
              + "            liveSessionId\n"
              + "            operationId\n"
              + "            mediaCutoff {\n"
              + "              state\n"
              + "              scope {\n"
              + "                kind\n"
              + "                liveSessionId\n"
              + "                generation\n"
              + "                participationId\n"
              + "              }\n"
              + "              evidence\n"
              + "              enforcedAt\n"
              + "              operationId\n"
              + "            }\n"
              + "          }\n"
              + "          liveSessionJoined {\n"
              + "            liveSessionId\n"
              + "            generation\n"
              + "            participation {\n"
              + "              participationId\n"
              + "              principalId\n"
              + "              membershipEpoch\n"
              + "              role\n"
              + "              state\n"
              + "              permissions {\n"
              + "                microphone\n"
              + "                camera\n"
              + "                subscribe\n"
              + "              }\n"
              + "              reservationExpiresAt\n"
              + "              nativeConnectionId\n"
              + "              mediaCutoff {\n"
              + "                state\n"
              + "                scope {\n"
              + "                  kind\n"
              + "                  liveSessionId\n"
              + "                  generation\n"
              + "                  participationId\n"
              + "                }\n"
              + "                evidence\n"
              + "                enforcedAt\n"
              + "                operationId\n"
              + "              }\n"
              + "            }\n"
              + "          }\n"
              + "          liveSessionLeft {\n"
              + "            liveSessionId\n"
              + "            participationId\n"
              + "            mediaCutoff {\n"
              + "              state\n"
              + "              scope {\n"
              + "                kind\n"
              + "                liveSessionId\n"
              + "                generation\n"
              + "                participationId\n"
              + "              }\n"
              + "              evidence\n"
              + "              enforcedAt\n"
              + "              operationId\n"
              + "            }\n"
              + "          }\n"
              + "          liveSessionStarted {\n"
              + "            liveSessionId\n"
              + "            conversationId\n"
              + "            kind\n"
              + "            mediaProfile\n"
              + "            operationId\n"
              + "          }\n"
              + "          member {\n"
              + "            conversationId\n"
              + "            principalId\n"
              + "            role\n"
              + "            status\n"
              + "            membershipEpoch\n"
              + "            visibilityEpoch\n"
              + "            revision\n"
              + "            visibleFromSequence\n"
              + "            canStartBroadcast\n"
              + "          }\n"
              + "          message {\n"
              + "            messageId\n"
              + "            conversationId\n"
              + "            authorId\n"
              + "            sequence\n"
              + "            revision\n"
              + "            revisionSequence\n"
              + "            createdAt\n"
              + "            deleted\n"
              + "            text\n"
              + "            props\n"
              + "            editedAt\n"
              + "          }\n"
              + "          messageAck {\n"
              + "            messageId\n"
              + "            conversationId\n"
              + "            sequence\n"
              + "            revision\n"
              + "            status\n"
              + "            cursor {\n"
              + "              incarnation\n"
              + "              conversationId\n"
              + "              sequence\n"
              + "            }\n"
              + "          }\n"
              + "          organization {\n"
              + "            orgId\n"
              + "            name\n"
              + "            status\n"
              + "            revision\n"
              + "          }\n"
              + "          organizationSpend {\n"
              + "            orgId\n"
              + "            planId\n"
              + "            currency\n"
              + "            catalogVersion\n"
              + "            monthlySpendCap\n"
              + "            agentPurchaseLimit\n"
              + "            updatedAt\n"
              + "            monthlyMinimum\n"
              + "            periodStart\n"
              + "            periodEnd\n"
              + "            credits\n"
              + "            charges\n"
              + "            margin\n"
              + "            stop\n"
              + "            refusedMeters\n"
              + "            evaluatedAt\n"
              + "            usageThrough\n"
              + "            validUntil\n"
              + "            minimumCredit\n"
              + "            chargeLimit\n"
              + "          }\n"
              + "          principal {\n"
              + "            principalId\n"
              + "            externalUserId\n"
              + "            status\n"
              + "            revision\n"
              + "          }\n"
              + "          readReceipt {\n"
              + "            principalId\n"
              + "            membershipEpoch\n"
              + "            visibilityEpoch\n"
              + "            deliveredThroughSequence\n"
              + "            readThroughSequence\n"
              + "            updatedAt\n"
              + "          }\n"
              + "          sessionBootstrap {\n"
              + "            session {\n"
              + "              sessionId\n"
              + "              principalId\n"
              + "              deviceId\n"
              + "              incarnation\n"
              + "              sessionRevision\n"
              + "              expiresAt\n"
              + "              status\n"
              + "            }\n"
              + "            tokenExpiresAt\n"
              + "            sessionToken\n"
              + "          }\n"
              + "          sessionRevocation {\n"
              + "            sessionId\n"
              + "            status\n"
              + "            mediaCutoff {\n"
              + "              state\n"
              + "              scope {\n"
              + "                kind\n"
              + "                principalId\n"
              + "                sessionId\n"
              + "                deviceId\n"
              + "                callId\n"
              + "              }\n"
              + "            }\n"
              + "          }\n"
              + "          signedProof\n"
              + "        }\n"
              + "      }\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.getOperation</code>: Read the state of a long-running communication operation. */
  public static final OperationDescriptor<GetOperationReply> COMMUNICATION_GET_OPERATION =
      OperationDescriptor.builder("communication.getOperation", Wire.required(GetOperationReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("getOperation")
          .operationName("CommunicationGetOperation")
          .resultType("GetOperationReply!")
          .inputFields(List.of("operationId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query CommunicationGetOperation($context: RequestContextInput!, $input: GetOperationRequestInput!) {\n"
              + "  getOperation(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      operationId\n"
              + "      kind\n"
              + "      targetRef {\n"
              + "        kind\n"
              + "        id\n"
              + "      }\n"
              + "      state\n"
              + "      revision\n"
              + "      requestedAt\n"
              + "      updatedAt\n"
              + "      steps {\n"
              + "        stepId\n"
              + "        state\n"
              + "      }\n"
              + "      result {\n"
              + "        projectId\n"
              + "        incarnation\n"
              + "        status\n"
              + "        backend\n"
              + "        environment\n"
              + "        policyRevision\n"
              + "        expiresAt\n"
              + "        kind\n"
              + "        resourceRef {\n"
              + "          kind\n"
              + "          id\n"
              + "        }\n"
              + "        delivery {\n"
              + "          deliveryId\n"
              + "          kind\n"
              + "          projectId\n"
              + "          installationId\n"
              + "          resourceRef {\n"
              + "            kind\n"
              + "            id\n"
              + "          }\n"
              + "          expiresAt\n"
              + "          payloadDigest\n"
              + "          recipientActorRef {\n"
              + "            tenantId\n"
              + "            objectId\n"
              + "          }\n"
              + "        }\n"
              + "        keyId\n"
              + "        endpointId\n"
              + "        enabled\n"
              + "        liveSessionCompletion {\n"
              + "          liveSessionId\n"
              + "          generation\n"
              + "          state\n"
              + "          revision\n"
              + "          completedAt\n"
              + "          mediaCutoff {\n"
              + "            state\n"
              + "            scope {\n"
              + "              kind\n"
              + "              liveSessionId\n"
              + "              generation\n"
              + "              participationId\n"
              + "            }\n"
              + "            evidence\n"
              + "            enforcedAt\n"
              + "            operationId\n"
              + "          }\n"
              + "        }\n"
              + "        replayedDeliveries\n"
              + "        skippedDeliveries\n"
              + "        messagePreview\n"
              + "      }\n"
              + "      blockedReason\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.conversationMute</code>: Read whether a member has muted message push notifications for a conversation. A backend key must name the member with actAsPrincipalId. */
  public static final OperationDescriptor<ConversationMuteReply> COMMUNICATION_CONVERSATION_MUTE =
      OperationDescriptor.builder("communication.conversationMute", Wire.required(ConversationMuteReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("conversationMute")
          .operationName("CommunicationConversationMute")
          .resultType("ConversationMuteReply!")
          .inputFields(List.of("conversationId", "actAsPrincipalId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query CommunicationConversationMute($context: RequestContextInput!, $input: ConversationMuteInput!) {\n"
              + "  conversationMute(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    result {\n"
              + "      conversationId\n"
              + "      principalId\n"
              + "      muted\n"
              + "      until\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.currentLiveSession</code>: Return the active live session of a conversation, if any. */
  public static final OperationDescriptor<CurrentLiveSessionReply> COMMUNICATION_CURRENT_LIVE_SESSION =
      OperationDescriptor.builder("communication.currentLiveSession", Wire.required(CurrentLiveSessionReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("currentLiveSession")
          .operationName("CommunicationCurrentLiveSession")
          .resultType("CurrentLiveSessionReply!")
          .inputFields(List.of("conversationId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query CommunicationCurrentLiveSession($context: RequestContextInput!, $input: ConversationLiveInput!) {\n"
              + "  currentLiveSession(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    result {\n"
              + "      liveSessionId\n"
              + "      conversationId\n"
              + "      creatorId\n"
              + "      kind\n"
              + "      mediaProfile\n"
              + "      state\n"
              + "      generation\n"
              + "      revision\n"
              + "      createdAt\n"
              + "      expiresAt\n"
              + "      myParticipation {\n"
              + "        participationId\n"
              + "        principalId\n"
              + "        membershipEpoch\n"
              + "        role\n"
              + "        state\n"
              + "        permissions {\n"
              + "          microphone\n"
              + "          camera\n"
              + "          subscribe\n"
              + "        }\n"
              + "        reservationExpiresAt\n"
              + "        nativeConnectionId\n"
              + "        mediaCutoff {\n"
              + "          state\n"
              + "          scope {\n"
              + "            kind\n"
              + "            liveSessionId\n"
              + "            generation\n"
              + "            participationId\n"
              + "          }\n"
              + "          evidence\n"
              + "          enforcedAt\n"
              + "          operationId\n"
              + "        }\n"
              + "      }\n"
              + "      mediaCutoff {\n"
              + "        state\n"
              + "        scope {\n"
              + "          kind\n"
              + "          liveSessionId\n"
              + "          generation\n"
              + "          participationId\n"
              + "        }\n"
              + "        evidence\n"
              + "        enforcedAt\n"
              + "        operationId\n"
              + "      }\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.liveSession</code>: Read a live session. */
  public static final OperationDescriptor<LiveSessionReply> COMMUNICATION_LIVE_SESSION =
      OperationDescriptor.builder("communication.liveSession", Wire.required(LiveSessionReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("liveSession")
          .operationName("CommunicationLiveSession")
          .resultType("LiveSessionReply!")
          .inputFields(List.of("liveSessionId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query CommunicationLiveSession($context: RequestContextInput!, $input: LiveSessionInput!) {\n"
              + "  liveSession(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    result {\n"
              + "      liveSessionId\n"
              + "      conversationId\n"
              + "      creatorId\n"
              + "      kind\n"
              + "      mediaProfile\n"
              + "      state\n"
              + "      generation\n"
              + "      revision\n"
              + "      createdAt\n"
              + "      expiresAt\n"
              + "      myParticipation {\n"
              + "        participationId\n"
              + "        principalId\n"
              + "        membershipEpoch\n"
              + "        role\n"
              + "        state\n"
              + "        permissions {\n"
              + "          microphone\n"
              + "          camera\n"
              + "          subscribe\n"
              + "        }\n"
              + "        reservationExpiresAt\n"
              + "        nativeConnectionId\n"
              + "        mediaCutoff {\n"
              + "          state\n"
              + "          scope {\n"
              + "            kind\n"
              + "            liveSessionId\n"
              + "            generation\n"
              + "            participationId\n"
              + "          }\n"
              + "          evidence\n"
              + "          enforcedAt\n"
              + "          operationId\n"
              + "        }\n"
              + "      }\n"
              + "      mediaCutoff {\n"
              + "        state\n"
              + "        scope {\n"
              + "          kind\n"
              + "          liveSessionId\n"
              + "          generation\n"
              + "          participationId\n"
              + "        }\n"
              + "        evidence\n"
              + "        enforcedAt\n"
              + "        operationId\n"
              + "      }\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.liveSessions</code>: List the live sessions of a conversation. */
  public static final OperationDescriptor<LiveSessionPageReply> COMMUNICATION_LIVE_SESSIONS =
      OperationDescriptor.builder("communication.liveSessions", Wire.required(LiveSessionPageReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("liveSessions")
          .operationName("CommunicationLiveSessions")
          .resultType("LiveSessionPageReply!")
          .inputFields(List.of("conversationId", "limit", "cursor"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query CommunicationLiveSessions($context: RequestContextInput!, $input: LiveSessionsInput!) {\n"
              + "  liveSessions(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    result {\n"
              + "      items {\n"
              + "        liveSessionId\n"
              + "        conversationId\n"
              + "        creatorId\n"
              + "        kind\n"
              + "        mediaProfile\n"
              + "        state\n"
              + "        generation\n"
              + "        revision\n"
              + "        createdAt\n"
              + "        expiresAt\n"
              + "        myParticipation {\n"
              + "          participationId\n"
              + "          principalId\n"
              + "          membershipEpoch\n"
              + "          role\n"
              + "          state\n"
              + "          permissions {\n"
              + "            microphone\n"
              + "            camera\n"
              + "            subscribe\n"
              + "          }\n"
              + "          reservationExpiresAt\n"
              + "          nativeConnectionId\n"
              + "          mediaCutoff {\n"
              + "            state\n"
              + "            scope {\n"
              + "              kind\n"
              + "              liveSessionId\n"
              + "              generation\n"
              + "              participationId\n"
              + "            }\n"
              + "            evidence\n"
              + "            enforcedAt\n"
              + "            operationId\n"
              + "          }\n"
              + "        }\n"
              + "        mediaCutoff {\n"
              + "          state\n"
              + "          scope {\n"
              + "            kind\n"
              + "            liveSessionId\n"
              + "            generation\n"
              + "            participationId\n"
              + "          }\n"
              + "          evidence\n"
              + "          enforcedAt\n"
              + "          operationId\n"
              + "        }\n"
              + "      }\n"
              + "      nextCursor\n"
              + "      complete\n"
              + "      partialReason\n"
              + "      refreshRequired\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.liveSessionParticipants</code>: List the participants of a live session. */
  public static final OperationDescriptor<LiveParticipantPageReply> COMMUNICATION_LIVE_SESSION_PARTICIPANTS =
      OperationDescriptor.builder("communication.liveSessionParticipants", Wire.required(LiveParticipantPageReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("liveSessionParticipants")
          .operationName("CommunicationLiveSessionParticipants")
          .resultType("LiveParticipantPageReply!")
          .inputFields(List.of("liveSessionId", "limit", "cursor"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query CommunicationLiveSessionParticipants($context: RequestContextInput!, $input: LiveParticipantsInput!) {\n"
              + "  liveSessionParticipants(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    result {\n"
              + "      items {\n"
              + "        participationId\n"
              + "        principalId\n"
              + "        membershipEpoch\n"
              + "        role\n"
              + "        state\n"
              + "        permissions {\n"
              + "          microphone\n"
              + "          camera\n"
              + "          subscribe\n"
              + "        }\n"
              + "        reservationExpiresAt\n"
              + "        nativeConnectionId\n"
              + "        mediaCutoff {\n"
              + "          state\n"
              + "          scope {\n"
              + "            kind\n"
              + "            liveSessionId\n"
              + "            generation\n"
              + "            participationId\n"
              + "          }\n"
              + "          evidence\n"
              + "          enforcedAt\n"
              + "          operationId\n"
              + "        }\n"
              + "      }\n"
              + "      nextCursor\n"
              + "      complete\n"
              + "      partialReason\n"
              + "      refreshRequired\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.liveSessionOperation</code>: Read the state of a live session start or end operation. */
  public static final OperationDescriptor<LiveSessionOperationReply> COMMUNICATION_LIVE_SESSION_OPERATION =
      OperationDescriptor.builder("communication.liveSessionOperation", Wire.required(LiveSessionOperationReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("liveSessionOperation")
          .operationName("CommunicationLiveSessionOperation")
          .resultType("LiveSessionOperationReply!")
          .inputFields(List.of("operationId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query CommunicationLiveSessionOperation($context: RequestContextInput!, $input: LiveSessionOperationInput!) {\n"
              + "  liveSessionOperation(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    result {\n"
              + "      operationId\n"
              + "      requestId\n"
              + "      liveSessionId\n"
              + "      kind\n"
              + "      state\n"
              + "      revision\n"
              + "      requestedAt\n"
              + "      completedAt\n"
              + "      completion {\n"
              + "        liveSessionId\n"
              + "        generation\n"
              + "        state\n"
              + "        revision\n"
              + "        completedAt\n"
              + "        mediaCutoff {\n"
              + "          state\n"
              + "          scope {\n"
              + "            kind\n"
              + "            liveSessionId\n"
              + "            generation\n"
              + "            participationId\n"
              + "          }\n"
              + "          evidence\n"
              + "          enforcedAt\n"
              + "          operationId\n"
              + "        }\n"
              + "      }\n"
              + "      failure {\n"
              + "        code\n"
              + "        message\n"
              + "      }\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.sessionRequestOutcome</code>: Look up the outcome of an earlier issueSession or renewSession request, including the session it produced. */
  public static final OperationDescriptor<SessionRequestOutcomeReply> COMMUNICATION_SESSION_REQUEST_OUTCOME =
      OperationDescriptor.builder("communication.sessionRequestOutcome", Wire.required(SessionRequestOutcomeReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("sessionRequestOutcome")
          .operationName("CommunicationSessionRequestOutcome")
          .resultType("SessionRequestOutcomeReply!")
          .inputFields(List.of("requestId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query CommunicationSessionRequestOutcome($context: RequestContextInput!, $input: SessionRequestOutcomeRequestInput!) {\n"
              + "  sessionRequestOutcome(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    result {\n"
              + "      state\n"
              + "      requestId\n"
              + "      checkedAt\n"
              + "      operation\n"
              + "      receiptId\n"
              + "      committedAt\n"
              + "      originalSession {\n"
              + "        sessionId\n"
              + "        principalId\n"
              + "        deviceId\n"
              + "        incarnation\n"
              + "        sessionRevision\n"
              + "        expiresAt\n"
              + "        status\n"
              + "      }\n"
              + "      currentSession {\n"
              + "        sessionId\n"
              + "        principalId\n"
              + "        deviceId\n"
              + "        incarnation\n"
              + "        sessionRevision\n"
              + "        expiresAt\n"
              + "        status\n"
              + "      }\n"
              + "      currentState\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.createPrincipal</code>: Create a principal for an application user. */
  public static final OperationDescriptor<CreatePrincipalReply> COMMUNICATION_CREATE_PRINCIPAL =
      OperationDescriptor.builder("communication.createPrincipal", Wire.required(CreatePrincipalReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("createPrincipal")
          .operationName("CommunicationCreatePrincipal")
          .resultType("CreatePrincipalReply!")
          .inputFields(List.of("externalUserId"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation CommunicationCreatePrincipal($context: RequestContextInput!, $input: CreatePrincipalRequestInput!) {\n"
              + "  createPrincipal(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      principalId\n"
              + "      externalUserId\n"
              + "      status\n"
              + "      revision\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.disablePrincipal</code>: Disable a principal. */
  public static final OperationDescriptor<DisablePrincipalReply> COMMUNICATION_DISABLE_PRINCIPAL =
      OperationDescriptor.builder("communication.disablePrincipal", Wire.required(DisablePrincipalReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("disablePrincipal")
          .operationName("CommunicationDisablePrincipal")
          .resultType("DisablePrincipalReply!")
          .inputFields(List.of("principalId", "expectedRevision"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation CommunicationDisablePrincipal($context: RequestContextInput!, $input: DisablePrincipalRequestInput!) {\n"
              + "  disablePrincipal(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      principalId\n"
              + "      externalUserId\n"
              + "      status\n"
              + "      revision\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.issueSession</code>: Issue a short-lived user session token for a principal and device. */
  public static final OperationDescriptor<IssueSessionReply> COMMUNICATION_ISSUE_SESSION =
      OperationDescriptor.builder("communication.issueSession", Wire.required(IssueSessionReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("issueSession")
          .operationName("CommunicationIssueSession")
          .resultType("IssueSessionReply!")
          .inputFields(List.of("principalId", "deviceId", "requestedTtlMs"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation CommunicationIssueSession($context: RequestContextInput!, $input: IssueSessionRequestInput!) {\n"
              + "  issueSession(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      session {\n"
              + "        sessionId\n"
              + "        principalId\n"
              + "        deviceId\n"
              + "        incarnation\n"
              + "        sessionRevision\n"
              + "        expiresAt\n"
              + "        status\n"
              + "      }\n"
              + "      tokenExpiresAt\n"
              + "      sessionToken\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.renewSession</code>: Renew a user session before it expires. */
  public static final OperationDescriptor<RenewSessionReply> COMMUNICATION_RENEW_SESSION =
      OperationDescriptor.builder("communication.renewSession", Wire.required(RenewSessionReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("renewSession")
          .operationName("CommunicationRenewSession")
          .resultType("RenewSessionReply!")
          .inputFields(List.of("sessionId", "principalId", "deviceId", "expectedRevision", "requestedTtlMs"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation CommunicationRenewSession($context: RequestContextInput!, $input: RenewSessionRequestInput!) {\n"
              + "  renewSession(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      session {\n"
              + "        sessionId\n"
              + "        principalId\n"
              + "        deviceId\n"
              + "        incarnation\n"
              + "        sessionRevision\n"
              + "        expiresAt\n"
              + "        status\n"
              + "      }\n"
              + "      tokenExpiresAt\n"
              + "      sessionToken\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.revokeSession</code>: Revoke a user session. */
  public static final OperationDescriptor<RevokeSessionReply> COMMUNICATION_REVOKE_SESSION =
      OperationDescriptor.builder("communication.revokeSession", Wire.required(RevokeSessionReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("revokeSession")
          .operationName("CommunicationRevokeSession")
          .resultType("RevokeSessionReply!")
          .inputFields(List.of("sessionId", "expectedRevision"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation CommunicationRevokeSession($context: RequestContextInput!, $input: RevokeSessionRequestInput!) {\n"
              + "  revokeSession(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      sessionId\n"
              + "      status\n"
              + "      mediaCutoff {\n"
              + "        state\n"
              + "        scope {\n"
              + "          kind\n"
              + "          principalId\n"
              + "          sessionId\n"
              + "          deviceId\n"
              + "          callId\n"
              + "        }\n"
              + "      }\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.createConversation</code>: Create a conversation with its initial members. */
  public static final OperationDescriptor<CreateConversationReply> COMMUNICATION_CREATE_CONVERSATION =
      OperationDescriptor.builder("communication.createConversation", Wire.required(CreateConversationReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("createConversation")
          .operationName("CommunicationCreateConversation")
          .resultType("CreateConversationReply!")
          .inputFields(List.of("title", "props", "members"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation CommunicationCreateConversation($context: RequestContextInput!, $input: CreateConversationRequestInput!) {\n"
              + "  createConversation(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      conversationId\n"
              + "      revision\n"
              + "      title\n"
              + "      props\n"
              + "      latestSequence\n"
              + "      membership {\n"
              + "        conversationId\n"
              + "        principalId\n"
              + "        role\n"
              + "        status\n"
              + "        membershipEpoch\n"
              + "        visibilityEpoch\n"
              + "        revision\n"
              + "        visibleFromSequence\n"
              + "        canStartBroadcast\n"
              + "      }\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.updateConversation</code>: Update the title or properties of a conversation. */
  public static final OperationDescriptor<UpdateConversationReply> COMMUNICATION_UPDATE_CONVERSATION =
      OperationDescriptor.builder("communication.updateConversation", Wire.required(UpdateConversationReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("updateConversation")
          .operationName("CommunicationUpdateConversation")
          .resultType("UpdateConversationReply!")
          .inputFields(List.of("conversationId", "expectedRevision", "title", "props"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation CommunicationUpdateConversation($context: RequestContextInput!, $input: UpdateConversationRequestInput!) {\n"
              + "  updateConversation(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      conversationId\n"
              + "      revision\n"
              + "      title\n"
              + "      props\n"
              + "      latestSequence\n"
              + "      membership {\n"
              + "        conversationId\n"
              + "        principalId\n"
              + "        role\n"
              + "        status\n"
              + "        membershipEpoch\n"
              + "        visibilityEpoch\n"
              + "        revision\n"
              + "        visibleFromSequence\n"
              + "        canStartBroadcast\n"
              + "      }\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.addMember</code>: Add a member, or change the role of an active member. */
  public static final OperationDescriptor<AddMemberReply> COMMUNICATION_ADD_MEMBER =
      OperationDescriptor.builder("communication.addMember", Wire.required(AddMemberReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("addMember")
          .operationName("CommunicationAddMember")
          .resultType("AddMemberReply!")
          .inputFields(List.of("conversationId", "principalId", "role", "expectedRevision"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation CommunicationAddMember($context: RequestContextInput!, $input: AddMemberRequestInput!) {\n"
              + "  addMember(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      conversationId\n"
              + "      principalId\n"
              + "      role\n"
              + "      status\n"
              + "      membershipEpoch\n"
              + "      visibilityEpoch\n"
              + "      revision\n"
              + "      visibleFromSequence\n"
              + "      canStartBroadcast\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.addMembers</code>: Add several members in one request. */
  public static final OperationDescriptor<AddMembersPayload> COMMUNICATION_ADD_MEMBERS =
      OperationDescriptor.builder("communication.addMembers", Wire.required(AddMembersPayload::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("addMembers")
          .operationName("CommunicationAddMembers")
          .resultType("AddMembersPayload!")
          .inputFields(List.of("conversationId", "members"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation CommunicationAddMembers($context: RequestContextInput!, $input: AddMembersInput!) {\n"
              + "  addMembers(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    result {\n"
              + "      items {\n"
              + "        conversationId\n"
              + "        principalId\n"
              + "        role\n"
              + "        status\n"
              + "        membershipEpoch\n"
              + "        visibilityEpoch\n"
              + "        revision\n"
              + "        visibleFromSequence\n"
              + "        canStartBroadcast\n"
              + "      }\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.removeMember</code>: Remove a member from a conversation. */
  public static final OperationDescriptor<RemoveMemberReply> COMMUNICATION_REMOVE_MEMBER =
      OperationDescriptor.builder("communication.removeMember", Wire.required(RemoveMemberReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("removeMember")
          .operationName("CommunicationRemoveMember")
          .resultType("RemoveMemberReply!")
          .inputFields(List.of("conversationId", "principalId", "expectedRevision"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation CommunicationRemoveMember($context: RequestContextInput!, $input: RemoveMemberRequestInput!) {\n"
              + "  removeMember(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      conversationId\n"
              + "      principalId\n"
              + "      role\n"
              + "      status\n"
              + "      membershipEpoch\n"
              + "      visibilityEpoch\n"
              + "      revision\n"
              + "      visibleFromSequence\n"
              + "      canStartBroadcast\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.historyGrant</code>: Expand the history a member can see to an earlier sequence. */
  public static final OperationDescriptor<HistoryGrantReply> COMMUNICATION_HISTORY_GRANT =
      OperationDescriptor.builder("communication.historyGrant", Wire.required(HistoryGrantReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("historyGrant")
          .operationName("CommunicationHistoryGrant")
          .resultType("HistoryGrantReply!")
          .inputFields(List.of("conversationId", "principalId", "membershipEpoch", "expectedRevision", "fromSequence"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation CommunicationHistoryGrant($context: RequestContextInput!, $input: HistoryGrantRequestInput!) {\n"
              + "  historyGrant(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      conversationId\n"
              + "      principalId\n"
              + "      role\n"
              + "      status\n"
              + "      membershipEpoch\n"
              + "      visibilityEpoch\n"
              + "      revision\n"
              + "      visibleFromSequence\n"
              + "      canStartBroadcast\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.sendMessage</code>: Send a message. A backend key sends as its service principal, or as the member named by actAsPrincipalId. */
  public static final OperationDescriptor<SendMessageReply> COMMUNICATION_SEND_MESSAGE =
      OperationDescriptor.builder("communication.sendMessage", Wire.required(SendMessageReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("sendMessage")
          .operationName("CommunicationSendMessage")
          .resultType("SendMessageReply!")
          .inputFields(List.of("conversationId", "text", "props", "actAsPrincipalId"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation CommunicationSendMessage($context: RequestContextInput!, $input: SendMessageRequestInput!) {\n"
              + "  sendMessage(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      messageId\n"
              + "      conversationId\n"
              + "      sequence\n"
              + "      revision\n"
              + "      status\n"
              + "      cursor {\n"
              + "        incarnation\n"
              + "        conversationId\n"
              + "        sequence\n"
              + "      }\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.editMessage</code>: Edit a message. */
  public static final OperationDescriptor<EditMessageReply> COMMUNICATION_EDIT_MESSAGE =
      OperationDescriptor.builder("communication.editMessage", Wire.required(EditMessageReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("editMessage")
          .operationName("CommunicationEditMessage")
          .resultType("EditMessageReply!")
          .inputFields(List.of("conversationId", "messageId", "expectedRevision", "text", "props"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation CommunicationEditMessage($context: RequestContextInput!, $input: EditMessageRequestInput!) {\n"
              + "  editMessage(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      messageId\n"
              + "      conversationId\n"
              + "      authorId\n"
              + "      sequence\n"
              + "      revision\n"
              + "      revisionSequence\n"
              + "      createdAt\n"
              + "      deleted\n"
              + "      text\n"
              + "      props\n"
              + "      editedAt\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.deleteMessage</code>: Delete a message. */
  public static final OperationDescriptor<DeleteMessageReply> COMMUNICATION_DELETE_MESSAGE =
      OperationDescriptor.builder("communication.deleteMessage", Wire.required(DeleteMessageReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("deleteMessage")
          .operationName("CommunicationDeleteMessage")
          .resultType("DeleteMessageReply!")
          .inputFields(List.of("conversationId", "messageId", "expectedRevision"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation CommunicationDeleteMessage($context: RequestContextInput!, $input: DeleteMessageRequestInput!) {\n"
              + "  deleteMessage(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      messageId\n"
              + "      conversationId\n"
              + "      authorId\n"
              + "      sequence\n"
              + "      revision\n"
              + "      revisionSequence\n"
              + "      createdAt\n"
              + "      deleted\n"
              + "      text\n"
              + "      props\n"
              + "      editedAt\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.setBroadcastPermission</code>: Allow or deny a member to publish media in live sessions. */
  public static final OperationDescriptor<SetBroadcastPermissionPayload> COMMUNICATION_SET_BROADCAST_PERMISSION =
      OperationDescriptor.builder("communication.setBroadcastPermission", Wire.required(SetBroadcastPermissionPayload::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("setBroadcastPermission")
          .operationName("CommunicationSetBroadcastPermission")
          .resultType("SetBroadcastPermissionPayload!")
          .inputFields(List.of("conversationId", "principalId", "allowed", "expectedMembershipRevision"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation CommunicationSetBroadcastPermission($context: RequestContextInput!, $input: SetBroadcastPermissionInput!) {\n"
              + "  setBroadcastPermission(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    result {\n"
              + "      member {\n"
              + "        conversationId\n"
              + "        principalId\n"
              + "        role\n"
              + "        status\n"
              + "        membershipEpoch\n"
              + "        visibilityEpoch\n"
              + "        revision\n"
              + "        visibleFromSequence\n"
              + "        canStartBroadcast\n"
              + "      }\n"
              + "      mediaCutoff {\n"
              + "        state\n"
              + "        scope {\n"
              + "          kind\n"
              + "          liveSessionId\n"
              + "          generation\n"
              + "          participationId\n"
              + "        }\n"
              + "        evidence\n"
              + "        enforcedAt\n"
              + "        operationId\n"
              + "      }\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.setConversationMute</code>: Mute or unmute message push notifications for a member of a conversation, optionally until a time. Calls still ring. A backend key must name the member with actAsPrincipalId. */
  public static final OperationDescriptor<SetConversationMutePayload> COMMUNICATION_SET_CONVERSATION_MUTE =
      OperationDescriptor.builder("communication.setConversationMute", Wire.required(SetConversationMutePayload::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("setConversationMute")
          .operationName("CommunicationSetConversationMute")
          .resultType("SetConversationMutePayload!")
          .inputFields(List.of("conversationId", "muted", "until", "actAsPrincipalId"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation CommunicationSetConversationMute($context: RequestContextInput!, $input: SetConversationMuteInput!) {\n"
              + "  setConversationMute(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    result {\n"
              + "      conversationId\n"
              + "      principalId\n"
              + "      muted\n"
              + "      until\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.alertLiveSession</code>: Alert (ring) conversation members about a live session. */
  public static final OperationDescriptor<AlertLiveSessionPayload> COMMUNICATION_ALERT_LIVE_SESSION =
      OperationDescriptor.builder("communication.alertLiveSession", Wire.required(AlertLiveSessionPayload::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("alertLiveSession")
          .operationName("CommunicationAlertLiveSession")
          .resultType("AlertLiveSessionPayload!")
          .inputFields(List.of("liveSessionId", "expectedGeneration", "principalIds"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation CommunicationAlertLiveSession($context: RequestContextInput!, $input: AlertLiveSessionInput!) {\n"
              + "  alertLiveSession(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    result {\n"
              + "      liveSessionId\n"
              + "      created\n"
              + "      suppressed\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.endLiveSession</code>: End a live session for every participant. Completes asynchronously. */
  public static final OperationDescriptor<EndLiveSessionPayload> COMMUNICATION_END_LIVE_SESSION =
      OperationDescriptor.builder("communication.endLiveSession", Wire.required(EndLiveSessionPayload::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("endLiveSession")
          .operationName("CommunicationEndLiveSession")
          .resultType("EndLiveSessionPayload!")
          .inputFields(List.of("liveSessionId", "expectedGeneration", "expectedRevision"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation CommunicationEndLiveSession($context: RequestContextInput!, $input: EndLiveSessionInput!) {\n"
              + "  endLiveSession(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    result {\n"
              + "      liveSessionId\n"
              + "      operationId\n"
              + "      mediaCutoff {\n"
              + "        state\n"
              + "        scope {\n"
              + "          kind\n"
              + "          liveSessionId\n"
              + "          generation\n"
              + "          participationId\n"
              + "        }\n"
              + "        evidence\n"
              + "        enforcedAt\n"
              + "        operationId\n"
              + "      }\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.redeemCredential</code>: Redeem a delivered credential with its delivery permit. */
  public static final OperationDescriptor<RedeemCredentialReply> COMMUNICATION_REDEEM_CREDENTIAL =
      OperationDescriptor.builder("communication.redeemCredential", Wire.required(RedeemCredentialReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("redeemCredential")
          .operationName("CommunicationRedeemCredential")
          .resultType("RedeemCredentialReply!")
          .inputFields(List.of("deliveryId"))
          .idempotency("permitBound", OperationDescriptor.Retry.SAME_REQUEST, false, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.REQUIRED)
          .permitField("credentialDeliveryPermit")
          .document(
              "mutation CommunicationRedeemCredential($context: RequestContextInput!, $input: RedeemCredentialRequestInput!) {\n"
              + "  redeemCredential(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      kind\n"
              + "      keyId\n"
              + "      backendPrincipalId\n"
              + "      backendKey\n"
              + "      expiresAt\n"
              + "      endpointId\n"
              + "      secretVersion\n"
              + "      secret\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>communication.acknowledgeCredential</code>: Acknowledge that a redeemed credential is stored, closing the delivery. */
  public static final OperationDescriptor<AcknowledgeCredentialReply> COMMUNICATION_ACKNOWLEDGE_CREDENTIAL =
      OperationDescriptor.builder("communication.acknowledgeCredential", Wire.required(AcknowledgeCredentialReply::decode))
          .plane("communication")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("acknowledgeCredential")
          .operationName("CommunicationAcknowledgeCredential")
          .resultType("AcknowledgeCredentialReply!")
          .inputFields(List.of("deliveryId"))
          .idempotency("permitBound", OperationDescriptor.Retry.SAME_REQUEST, false, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.REQUIRED)
          .context("incarnation", OperationDescriptor.Use.REQUIRED)
          .context("observedServingEpoch", OperationDescriptor.Use.REQUIRED)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.REQUIRED)
          .permitField("credentialDeliveryPermit")
          .document(
              "mutation CommunicationAcknowledgeCredential($context: RequestContextInput!, $input: AcknowledgeCredentialRequestInput!) {\n"
              + "  acknowledgeCredential(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      deliveryId\n"
              + "      acknowledged\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.capabilities</code>: Describe the management features and limits the authority supports. */
  public static final OperationDescriptor<CapabilitiesReply> MANAGEMENT_CAPABILITIES =
      OperationDescriptor.builder("management.capabilities", Wire.required(CapabilitiesReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("capabilities")
          .operationName("ManagementCapabilities")
          .resultType("CapabilitiesReply!")
          .inputFields(List.of())
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query ManagementCapabilities($context: RequestContextInput!) {\n"
              + "  capabilities(context: $context) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      serverRelease\n"
              + "      capabilityRevision\n"
              + "      limitsRevision\n"
              + "      features {\n"
              + "        chat\n"
              + "        inbox\n"
              + "        lexicalSearch\n"
              + "        typing\n"
              + "        webhooks\n"
              + "        liveSessions\n"
              + "        liveBroadcast\n"
              + "      }\n"
              + "      limits {\n"
              + "        key\n"
              + "        value {\n"
              + "          maximum\n"
              + "          unit\n"
              + "          scope\n"
              + "          milliseconds\n"
              + "          policyId\n"
              + "          revision\n"
              + "        }\n"
              + "      }\n"
              + "      environment\n"
              + "      productionQualified\n"
              + "      mediaPolicy {\n"
              + "        leasePolicyId\n"
              + "        maxLeaseMs\n"
              + "        renewAttemptMs\n"
              + "        preludeMaxBytes\n"
              + "        preludeTimeoutMs\n"
              + "        clockProfileId\n"
              + "      }\n"
              + "      geoControlAuthorityId\n"
              + "      offerings\n"
              + "      geos\n"
              + "      installationProfiles\n"
              + "      portalIdentity\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.organizations</code>: List the organizations the caller can access. */
  public static final OperationDescriptor<OrganizationsReply> MANAGEMENT_ORGANIZATIONS =
      OperationDescriptor.builder("management.organizations", Wire.required(OrganizationsReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("organizations")
          .operationName("ManagementOrganizations")
          .resultType("OrganizationsReply!")
          .inputFields(List.of())
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query ManagementOrganizations($context: RequestContextInput!) {\n"
              + "  organizations(context: $context) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      items {\n"
              + "        orgId\n"
              + "        name\n"
              + "        status\n"
              + "        revision\n"
              + "      }\n"
              + "      complete\n"
              + "      refreshRequired\n"
              + "      nextCursor\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.getOrganization</code>: Read an organization. */
  public static final OperationDescriptor<GetOrganizationReply> MANAGEMENT_GET_ORGANIZATION =
      OperationDescriptor.builder("management.getOrganization", Wire.required(GetOrganizationReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("getOrganization")
          .operationName("ManagementGetOrganization")
          .resultType("GetOrganizationReply!")
          .inputFields(List.of("orgId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query ManagementGetOrganization($context: RequestContextInput!, $input: GetOrganizationRequestInput!) {\n"
              + "  getOrganization(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      orgId\n"
              + "      name\n"
              + "      status\n"
              + "      revision\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.getDeployment</code>: Read a deployment. */
  public static final OperationDescriptor<GetDeploymentReply> MANAGEMENT_GET_DEPLOYMENT =
      OperationDescriptor.builder("management.getDeployment", Wire.required(GetDeploymentReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("getDeployment")
          .operationName("ManagementGetDeployment")
          .resultType("GetDeploymentReply!")
          .inputFields(List.of("deploymentId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query ManagementGetDeployment($context: RequestContextInput!, $input: GetDeploymentRequestInput!) {\n"
              + "  getDeployment(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      deploymentId\n"
              + "      orgId\n"
              + "      offering\n"
              + "      geoId\n"
              + "      installationId\n"
              + "      resourceOwner\n"
              + "      approvedRegions\n"
              + "      readiness\n"
              + "      revision\n"
              + "      consentRef\n"
              + "      environment\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.getProject</code>: Read a project. */
  public static final OperationDescriptor<GetProjectReply> MANAGEMENT_GET_PROJECT =
      OperationDescriptor.builder("management.getProject", Wire.required(GetProjectReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("getProject")
          .operationName("ManagementGetProject")
          .resultType("GetProjectReply!")
          .inputFields(List.of("projectId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query ManagementGetProject($context: RequestContextInput!, $input: GetProjectRequestInput!) {\n"
              + "  getProject(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      projectId\n"
              + "      deploymentId\n"
              + "      name\n"
              + "      environment\n"
              + "      incarnation\n"
              + "      servingRegion\n"
              + "      servingEpoch\n"
              + "      status\n"
              + "      revision\n"
              + "      policyRevision\n"
              + "      messagePreview\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.deploymentHealth</code>: Read the health of a deployment. */
  public static final OperationDescriptor<DeploymentHealthReply> MANAGEMENT_DEPLOYMENT_HEALTH =
      OperationDescriptor.builder("management.deploymentHealth", Wire.required(DeploymentHealthReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("deploymentHealth")
          .operationName("ManagementDeploymentHealth")
          .resultType("DeploymentHealthReply!")
          .inputFields(List.of("deploymentId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query ManagementDeploymentHealth($context: RequestContextInput!, $input: DeploymentHealthRequestInput!) {\n"
              + "  deploymentHealth(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      deploymentId\n"
              + "      readiness\n"
              + "      observedAt\n"
              + "      services {\n"
              + "        role\n"
              + "        observedAt\n"
              + "        details {\n"
              + "          status\n"
              + "        }\n"
              + "      }\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.deploymentUsage</code>: Read the metered usage of a deployment, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days. */
  public static final OperationDescriptor<DeploymentUsageReply> MANAGEMENT_DEPLOYMENT_USAGE =
      OperationDescriptor.builder("management.deploymentUsage", Wire.required(DeploymentUsageReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("deploymentUsage")
          .operationName("ManagementDeploymentUsage")
          .resultType("DeploymentUsageReply!")
          .inputFields(List.of("deploymentId", "from", "to"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query ManagementDeploymentUsage($context: RequestContextInput!, $input: DeploymentUsageRequestInput!) {\n"
              + "  deploymentUsage(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      deploymentId\n"
              + "      source\n"
              + "      observedAt\n"
              + "      complete\n"
              + "      reason\n"
              + "      from\n"
              + "      to\n"
              + "      meters {\n"
              + "        meter\n"
              + "        unit\n"
              + "        quantity\n"
              + "        emitted\n"
              + "      }\n"
              + "      aggregatedThrough\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.projectUsage</code>: Read the metered usage of a project. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days. */
  public static final OperationDescriptor<ProjectUsageReply> MANAGEMENT_PROJECT_USAGE =
      OperationDescriptor.builder("management.projectUsage", Wire.required(ProjectUsageReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("projectUsage")
          .operationName("ManagementProjectUsage")
          .resultType("ProjectUsageReply!")
          .inputFields(List.of("projectId", "from", "to"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query ManagementProjectUsage($context: RequestContextInput!, $input: ProjectUsageRequestInput!) {\n"
              + "  projectUsage(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      projectId\n"
              + "      source\n"
              + "      observedAt\n"
              + "      complete\n"
              + "      reason\n"
              + "      from\n"
              + "      to\n"
              + "      meters {\n"
              + "        meter\n"
              + "        unit\n"
              + "        quantity\n"
              + "        emitted\n"
              + "      }\n"
              + "      aggregatedThrough\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.organizationUsage</code>: Read the metered usage of an organization in any status, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days. */
  public static final OperationDescriptor<OrganizationUsageReply> MANAGEMENT_ORGANIZATION_USAGE =
      OperationDescriptor.builder("management.organizationUsage", Wire.required(OrganizationUsageReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("organizationUsage")
          .operationName("ManagementOrganizationUsage")
          .resultType("OrganizationUsageReply!")
          .inputFields(List.of("orgId", "from", "to"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query ManagementOrganizationUsage($context: RequestContextInput!, $input: OrganizationUsageRequestInput!) {\n"
              + "  organizationUsage(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      orgId\n"
              + "      source\n"
              + "      observedAt\n"
              + "      complete\n"
              + "      reason\n"
              + "      from\n"
              + "      to\n"
              + "      meters {\n"
              + "        meter\n"
              + "        unit\n"
              + "        quantity\n"
              + "        emitted\n"
              + "      }\n"
              + "      aggregatedThrough\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.organizationBilling</code>: Read the billing state of an organization in any status: the plan whose limits apply, whether ConvoHop bills the organization and, when it does, its standing and subscription. */
  public static final OperationDescriptor<OrganizationBillingReply> MANAGEMENT_ORGANIZATION_BILLING =
      OperationDescriptor.builder("management.organizationBilling", Wire.required(OrganizationBillingReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("organizationBilling")
          .operationName("ManagementOrganizationBilling")
          .resultType("OrganizationBillingReply!")
          .inputFields(List.of("orgId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query ManagementOrganizationBilling($context: RequestContextInput!, $input: OrganizationBillingRequestInput!) {\n"
              + "  organizationBilling(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      orgId\n"
              + "      planId\n"
              + "      standing\n"
              + "      graceUntil\n"
              + "      subscriptionStatus\n"
              + "      currentPeriodEnd\n"
              + "      cancelAtPeriodEnd\n"
              + "      catalogVersion\n"
              + "      configured\n"
              + "      billed\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.webhookEndpoints</code>: List the webhook endpoints of a project with their status, signing-secret rotation and delivery health. */
  public static final OperationDescriptor<WebhookEndpointsReply> MANAGEMENT_WEBHOOK_ENDPOINTS =
      OperationDescriptor.builder("management.webhookEndpoints", Wire.required(WebhookEndpointsReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("webhookEndpoints")
          .operationName("ManagementWebhookEndpoints")
          .resultType("WebhookEndpointsReply!")
          .inputFields(List.of("projectId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query ManagementWebhookEndpoints($context: RequestContextInput!, $input: WebhookEndpointsRequestInput!) {\n"
              + "  webhookEndpoints(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      items {\n"
              + "        endpointId\n"
              + "        url\n"
              + "        eventTypes\n"
              + "        enabled\n"
              + "        status\n"
              + "        disabledReason\n"
              + "        revision\n"
              + "        secretVersion\n"
              + "        rotationPending\n"
              + "        rotationOverlapUntil\n"
              + "        consecutiveFailures\n"
              + "        failingSince\n"
              + "        lastSuccessAt\n"
              + "        lastFailureAt\n"
              + "      }\n"
              + "      complete\n"
              + "      refreshRequired\n"
              + "      nextCursor\n"
              + "      observedAt\n"
              + "      partialReason\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.webhookDeliveries</code>: List recent deliveries of a webhook endpoint. */
  public static final OperationDescriptor<WebhookDeliveriesReply> MANAGEMENT_WEBHOOK_DELIVERIES =
      OperationDescriptor.builder("management.webhookDeliveries", Wire.required(WebhookDeliveriesReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("webhookDeliveries")
          .operationName("ManagementWebhookDeliveries")
          .resultType("WebhookDeliveriesReply!")
          .inputFields(List.of("projectId", "endpointId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query ManagementWebhookDeliveries($context: RequestContextInput!, $input: WebhookDeliveriesRequestInput!) {\n"
              + "  webhookDeliveries(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      items {\n"
              + "        effectId\n"
              + "        eventId\n"
              + "        state\n"
              + "        attempts\n"
              + "        lastOutcome\n"
              + "        nextAttemptAt\n"
              + "        eventType\n"
              + "        createdAt\n"
              + "        replayedAt\n"
              + "        lastAttemptAt\n"
              + "        lastHttpStatus\n"
              + "        lastLatencyMs\n"
              + "        lastErrorCode\n"
              + "      }\n"
              + "      complete\n"
              + "      refreshRequired\n"
              + "      nextCursor\n"
              + "      observedAt\n"
              + "      partialReason\n"
              + "      sourceRevision\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.resolveRequest</code>: Look up the stored outcome of an earlier management mutation by its requestId. */
  public static final OperationDescriptor<ResolveRequestReply> MANAGEMENT_RESOLVE_REQUEST =
      OperationDescriptor.builder("management.resolveRequest", Wire.required(ResolveRequestReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("resolveRequest")
          .operationName("ManagementResolveRequest")
          .resultType("ResolveRequestReply!")
          .inputFields(List.of("requestId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query ManagementResolveRequest($context: RequestContextInput!, $input: ResolveRequestRequestInput!) {\n"
              + "  resolveRequest(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      state\n"
              + "      requestId\n"
              + "      checkedAt\n"
              + "      resultWithheld\n"
              + "      receipt {\n"
              + "        status\n"
              + "        requestId\n"
              + "        serverTime\n"
              + "        receiptId\n"
              + "        committedAt\n"
              + "        replayed\n"
              + "        operation {\n"
              + "          operationId\n"
              + "          owner\n"
              + "          href\n"
              + "          state\n"
              + "        }\n"
              + "        resourceRef {\n"
              + "          kind\n"
              + "          id\n"
              + "        }\n"
              + "        result {\n"
              + "          agentGrant {\n"
              + "            grantId\n"
              + "            orgId\n"
              + "            signupId\n"
              + "            agentActorId\n"
              + "            projectId\n"
              + "            scopes\n"
              + "            expiresAt\n"
              + "            revokedAt\n"
              + "            createdAt\n"
              + "            keys {\n"
              + "              operationId\n"
              + "              state\n"
              + "              scopes\n"
              + "              expiresAt\n"
              + "              keyId\n"
              + "              deliveryId\n"
              + "              deliveryExpiresAt\n"
              + "            }\n"
              + "          }\n"
              + "          agentSignupStatus {\n"
              + "            signupId\n"
              + "            state\n"
              + "            orgId\n"
              + "            deploymentId\n"
              + "            projectId\n"
              + "            nextStep\n"
              + "            scopes\n"
              + "            grantExpiresAt\n"
              + "            keys {\n"
              + "              operationId\n"
              + "              state\n"
              + "              scopes\n"
              + "              expiresAt\n"
              + "              keyId\n"
              + "              deliveryId\n"
              + "              deliveryExpiresAt\n"
              + "            }\n"
              + "            incarnation\n"
              + "            servingEpoch\n"
              + "          }\n"
              + "          billingCheckoutSession {\n"
              + "            orgId\n"
              + "            planId\n"
              + "            url\n"
              + "            expiresAt\n"
              + "          }\n"
              + "          billingPortalSession {\n"
              + "            orgId\n"
              + "            url\n"
              + "            expiresAt\n"
              + "          }\n"
              + "          broadcastPermissionChanged {\n"
              + "            member {\n"
              + "              conversationId\n"
              + "              principalId\n"
              + "              role\n"
              + "              status\n"
              + "              membershipEpoch\n"
              + "              visibilityEpoch\n"
              + "              revision\n"
              + "              visibleFromSequence\n"
              + "              canStartBroadcast\n"
              + "            }\n"
              + "            mediaCutoff {\n"
              + "              state\n"
              + "              scope {\n"
              + "                kind\n"
              + "                liveSessionId\n"
              + "                generation\n"
              + "                participationId\n"
              + "              }\n"
              + "              evidence\n"
              + "              enforcedAt\n"
              + "              operationId\n"
              + "            }\n"
              + "          }\n"
              + "          conversation {\n"
              + "            conversationId\n"
              + "            revision\n"
              + "            title\n"
              + "            props\n"
              + "            latestSequence\n"
              + "            membership {\n"
              + "              conversationId\n"
              + "              principalId\n"
              + "              role\n"
              + "              status\n"
              + "              membershipEpoch\n"
              + "              visibilityEpoch\n"
              + "              revision\n"
              + "              visibleFromSequence\n"
              + "              canStartBroadcast\n"
              + "            }\n"
              + "          }\n"
              + "          conversationMemberBatch {\n"
              + "            items {\n"
              + "              conversationId\n"
              + "              principalId\n"
              + "              role\n"
              + "              status\n"
              + "              membershipEpoch\n"
              + "              visibilityEpoch\n"
              + "              revision\n"
              + "              visibleFromSequence\n"
              + "              canStartBroadcast\n"
              + "            }\n"
              + "          }\n"
              + "          conversationMute {\n"
              + "            conversationId\n"
              + "            principalId\n"
              + "            muted\n"
              + "            until\n"
              + "          }\n"
              + "          credentialDeliveryReceipt {\n"
              + "            deliveryId\n"
              + "          }\n"
              + "          deliveryAck {\n"
              + "            deliveryId\n"
              + "            acknowledged\n"
              + "          }\n"
              + "          liveAlertBatch {\n"
              + "            liveSessionId\n"
              + "            created\n"
              + "            suppressed\n"
              + "          }\n"
              + "          liveCredentialIssuance {\n"
              + "            liveSessionId\n"
              + "            participationId\n"
              + "            generation\n"
              + "            leaseId\n"
              + "            grantOrdinal\n"
              + "            admissionExpiresAt\n"
              + "            leaseExpiresAt\n"
              + "          }\n"
              + "          liveSessionEndRequested {\n"
              + "            liveSessionId\n"
              + "            operationId\n"
              + "            mediaCutoff {\n"
              + "              state\n"
              + "              scope {\n"
              + "                kind\n"
              + "                liveSessionId\n"
              + "                generation\n"
              + "                participationId\n"
              + "              }\n"
              + "              evidence\n"
              + "              enforcedAt\n"
              + "              operationId\n"
              + "            }\n"
              + "          }\n"
              + "          liveSessionJoined {\n"
              + "            liveSessionId\n"
              + "            generation\n"
              + "            participation {\n"
              + "              participationId\n"
              + "              principalId\n"
              + "              membershipEpoch\n"
              + "              role\n"
              + "              state\n"
              + "              permissions {\n"
              + "                microphone\n"
              + "                camera\n"
              + "                subscribe\n"
              + "              }\n"
              + "              reservationExpiresAt\n"
              + "              nativeConnectionId\n"
              + "              mediaCutoff {\n"
              + "                state\n"
              + "                scope {\n"
              + "                  kind\n"
              + "                  liveSessionId\n"
              + "                  generation\n"
              + "                  participationId\n"
              + "                }\n"
              + "                evidence\n"
              + "                enforcedAt\n"
              + "                operationId\n"
              + "              }\n"
              + "            }\n"
              + "          }\n"
              + "          liveSessionLeft {\n"
              + "            liveSessionId\n"
              + "            participationId\n"
              + "            mediaCutoff {\n"
              + "              state\n"
              + "              scope {\n"
              + "                kind\n"
              + "                liveSessionId\n"
              + "                generation\n"
              + "                participationId\n"
              + "              }\n"
              + "              evidence\n"
              + "              enforcedAt\n"
              + "              operationId\n"
              + "            }\n"
              + "          }\n"
              + "          liveSessionStarted {\n"
              + "            liveSessionId\n"
              + "            conversationId\n"
              + "            kind\n"
              + "            mediaProfile\n"
              + "            operationId\n"
              + "          }\n"
              + "          member {\n"
              + "            conversationId\n"
              + "            principalId\n"
              + "            role\n"
              + "            status\n"
              + "            membershipEpoch\n"
              + "            visibilityEpoch\n"
              + "            revision\n"
              + "            visibleFromSequence\n"
              + "            canStartBroadcast\n"
              + "          }\n"
              + "          message {\n"
              + "            messageId\n"
              + "            conversationId\n"
              + "            authorId\n"
              + "            sequence\n"
              + "            revision\n"
              + "            revisionSequence\n"
              + "            createdAt\n"
              + "            deleted\n"
              + "            text\n"
              + "            props\n"
              + "            editedAt\n"
              + "          }\n"
              + "          messageAck {\n"
              + "            messageId\n"
              + "            conversationId\n"
              + "            sequence\n"
              + "            revision\n"
              + "            status\n"
              + "            cursor {\n"
              + "              incarnation\n"
              + "              conversationId\n"
              + "              sequence\n"
              + "            }\n"
              + "          }\n"
              + "          organization {\n"
              + "            orgId\n"
              + "            name\n"
              + "            status\n"
              + "            revision\n"
              + "          }\n"
              + "          organizationSpend {\n"
              + "            orgId\n"
              + "            planId\n"
              + "            currency\n"
              + "            catalogVersion\n"
              + "            monthlySpendCap\n"
              + "            agentPurchaseLimit\n"
              + "            updatedAt\n"
              + "            monthlyMinimum\n"
              + "            periodStart\n"
              + "            periodEnd\n"
              + "            credits\n"
              + "            charges\n"
              + "            margin\n"
              + "            stop\n"
              + "            refusedMeters\n"
              + "            evaluatedAt\n"
              + "            usageThrough\n"
              + "            validUntil\n"
              + "            minimumCredit\n"
              + "            chargeLimit\n"
              + "          }\n"
              + "          principal {\n"
              + "            principalId\n"
              + "            externalUserId\n"
              + "            status\n"
              + "            revision\n"
              + "          }\n"
              + "          readReceipt {\n"
              + "            principalId\n"
              + "            membershipEpoch\n"
              + "            visibilityEpoch\n"
              + "            deliveredThroughSequence\n"
              + "            readThroughSequence\n"
              + "            updatedAt\n"
              + "          }\n"
              + "          sessionBootstrap {\n"
              + "            session {\n"
              + "              sessionId\n"
              + "              principalId\n"
              + "              deviceId\n"
              + "              incarnation\n"
              + "              sessionRevision\n"
              + "              expiresAt\n"
              + "              status\n"
              + "            }\n"
              + "            tokenExpiresAt\n"
              + "            sessionToken\n"
              + "          }\n"
              + "          sessionRevocation {\n"
              + "            sessionId\n"
              + "            status\n"
              + "            mediaCutoff {\n"
              + "              state\n"
              + "              scope {\n"
              + "                kind\n"
              + "                principalId\n"
              + "                sessionId\n"
              + "                deviceId\n"
              + "                callId\n"
              + "              }\n"
              + "            }\n"
              + "          }\n"
              + "          signedProof\n"
              + "        }\n"
              + "      }\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.getOperation</code>: Read the state of a long-running management operation. */
  public static final OperationDescriptor<GetOperationReply> MANAGEMENT_GET_OPERATION =
      OperationDescriptor.builder("management.getOperation", Wire.required(GetOperationReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("getOperation")
          .operationName("ManagementGetOperation")
          .resultType("GetOperationReply!")
          .inputFields(List.of("operationId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query ManagementGetOperation($context: RequestContextInput!, $input: GetOperationRequestInput!) {\n"
              + "  getOperation(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      operationId\n"
              + "      kind\n"
              + "      targetRef {\n"
              + "        kind\n"
              + "        id\n"
              + "      }\n"
              + "      state\n"
              + "      revision\n"
              + "      requestedAt\n"
              + "      updatedAt\n"
              + "      steps {\n"
              + "        stepId\n"
              + "        state\n"
              + "      }\n"
              + "      result {\n"
              + "        projectId\n"
              + "        incarnation\n"
              + "        status\n"
              + "        backend\n"
              + "        environment\n"
              + "        policyRevision\n"
              + "        expiresAt\n"
              + "        kind\n"
              + "        resourceRef {\n"
              + "          kind\n"
              + "          id\n"
              + "        }\n"
              + "        delivery {\n"
              + "          deliveryId\n"
              + "          kind\n"
              + "          projectId\n"
              + "          installationId\n"
              + "          resourceRef {\n"
              + "            kind\n"
              + "            id\n"
              + "          }\n"
              + "          expiresAt\n"
              + "          payloadDigest\n"
              + "          recipientActorRef {\n"
              + "            tenantId\n"
              + "            objectId\n"
              + "          }\n"
              + "        }\n"
              + "        keyId\n"
              + "        endpointId\n"
              + "        enabled\n"
              + "        liveSessionCompletion {\n"
              + "          liveSessionId\n"
              + "          generation\n"
              + "          state\n"
              + "          revision\n"
              + "          completedAt\n"
              + "          mediaCutoff {\n"
              + "            state\n"
              + "            scope {\n"
              + "              kind\n"
              + "              liveSessionId\n"
              + "              generation\n"
              + "              participationId\n"
              + "            }\n"
              + "            evidence\n"
              + "            enforcedAt\n"
              + "            operationId\n"
              + "          }\n"
              + "        }\n"
              + "        replayedDeliveries\n"
              + "        skippedDeliveries\n"
              + "        messagePreview\n"
              + "      }\n"
              + "      blockedReason\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.agentSignupForApproval</code>: Read a pending agent signup request for its approval page, with the agent's suggested plan, scopes and monthly spend cap. */
  public static final OperationDescriptor<AgentSignupForApprovalReply> MANAGEMENT_AGENT_SIGNUP_FOR_APPROVAL =
      OperationDescriptor.builder("management.agentSignupForApproval", Wire.required(AgentSignupForApprovalReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("agentSignupForApproval")
          .operationName("ManagementAgentSignupForApproval")
          .resultType("AgentSignupForApprovalReply!")
          .inputFields(List.of("approvalToken"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query ManagementAgentSignupForApproval($context: RequestContextInput!, $input: AgentSignupForApprovalRequestInput!) {\n"
              + "  agentSignupForApproval(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      signupId\n"
              + "      ownerEmail\n"
              + "      organizationName\n"
              + "      agentName\n"
              + "      purpose\n"
              + "      suggestedPlan\n"
              + "      suggestedScopes\n"
              + "      suggestedMonthlySpendCap\n"
              + "      currency\n"
              + "      expiresAt\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.agentSignup</code>: Read the agent's own signup: its state and, once approved, the organization, project, grant scopes and expiry, and keys. Poll no more often than the ticket's pollAfterSeconds. */
  public static final OperationDescriptor<AgentSignupReply> MANAGEMENT_AGENT_SIGNUP =
      OperationDescriptor.builder("management.agentSignup", Wire.required(AgentSignupReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("agentSignup")
          .operationName("ManagementAgentSignup")
          .resultType("AgentSignupReply!")
          .inputFields(List.of())
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query ManagementAgentSignup($context: RequestContextInput!) {\n"
              + "  agentSignup(context: $context) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      signupId\n"
              + "      state\n"
              + "      orgId\n"
              + "      deploymentId\n"
              + "      projectId\n"
              + "      nextStep\n"
              + "      scopes\n"
              + "      grantExpiresAt\n"
              + "      keys {\n"
              + "        operationId\n"
              + "        state\n"
              + "        scopes\n"
              + "        expiresAt\n"
              + "        keyId\n"
              + "        deliveryId\n"
              + "        deliveryExpiresAt\n"
              + "      }\n"
              + "      incarnation\n"
              + "      servingEpoch\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.agentGrants</code>: List an organization's agent grants with their keys, newest first. */
  public static final OperationDescriptor<AgentGrantsReply> MANAGEMENT_AGENT_GRANTS =
      OperationDescriptor.builder("management.agentGrants", Wire.required(AgentGrantsReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("agentGrants")
          .operationName("ManagementAgentGrants")
          .resultType("AgentGrantsReply!")
          .inputFields(List.of("orgId", "limit", "cursor"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query ManagementAgentGrants($context: RequestContextInput!, $input: AgentGrantsRequestInput!) {\n"
              + "  agentGrants(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      items {\n"
              + "        grantId\n"
              + "        orgId\n"
              + "        signupId\n"
              + "        agentActorId\n"
              + "        projectId\n"
              + "        scopes\n"
              + "        expiresAt\n"
              + "        revokedAt\n"
              + "        createdAt\n"
              + "        keys {\n"
              + "          operationId\n"
              + "          state\n"
              + "          scopes\n"
              + "          expiresAt\n"
              + "          keyId\n"
              + "          deliveryId\n"
              + "          deliveryExpiresAt\n"
              + "        }\n"
              + "      }\n"
              + "      complete\n"
              + "      refreshRequired\n"
              + "      nextCursor\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.agentAuditEvents</code>: List an organization's agent audit trail, newest first: the approval, provisioning, keys, revocations, spend-control changes and purchases. */
  public static final OperationDescriptor<AgentAuditEventsReply> MANAGEMENT_AGENT_AUDIT_EVENTS =
      OperationDescriptor.builder("management.agentAuditEvents", Wire.required(AgentAuditEventsReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("agentAuditEvents")
          .operationName("ManagementAgentAuditEvents")
          .resultType("AgentAuditEventsReply!")
          .inputFields(List.of("orgId", "limit", "cursor"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query ManagementAgentAuditEvents($context: RequestContextInput!, $input: AgentAuditEventsRequestInput!) {\n"
              + "  agentAuditEvents(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      items {\n"
              + "        eventId\n"
              + "        orgId\n"
              + "        grantId\n"
              + "        actorKind\n"
              + "        actorId\n"
              + "        kind\n"
              + "        details\n"
              + "        occurredAt\n"
              + "      }\n"
              + "      complete\n"
              + "      refreshRequired\n"
              + "      nextCursor\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.organizationSpend</code>: Read the organization's spend this month: its cap, credits, minimum credit, charge limit, charges, margin, spend stop and the freshness of its usage. */
  public static final OperationDescriptor<OrganizationSpendReply> MANAGEMENT_ORGANIZATION_SPEND =
      OperationDescriptor.builder("management.organizationSpend", Wire.required(OrganizationSpendReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("organizationSpend")
          .operationName("ManagementOrganizationSpend")
          .resultType("OrganizationSpendReply!")
          .inputFields(List.of("orgId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "query ManagementOrganizationSpend($context: RequestContextInput!, $input: OrganizationSpendRequestInput!) {\n"
              + "  organizationSpend(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      orgId\n"
              + "      planId\n"
              + "      currency\n"
              + "      catalogVersion\n"
              + "      monthlySpendCap\n"
              + "      agentPurchaseLimit\n"
              + "      updatedAt\n"
              + "      monthlyMinimum\n"
              + "      periodStart\n"
              + "      periodEnd\n"
              + "      credits\n"
              + "      charges\n"
              + "      margin\n"
              + "      stop\n"
              + "      refusedMeters\n"
              + "      evaluatedAt\n"
              + "      usageThrough\n"
              + "      validUntil\n"
              + "      minimumCredit\n"
              + "      chargeLimit\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.createOrganization</code>: Create an organization. */
  public static final OperationDescriptor<CreateOrganizationReply> MANAGEMENT_CREATE_ORGANIZATION =
      OperationDescriptor.builder("management.createOrganization", Wire.required(CreateOrganizationReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("createOrganization")
          .operationName("ManagementCreateOrganization")
          .resultType("CreateOrganizationReply!")
          .inputFields(List.of("name", "termsRef"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation ManagementCreateOrganization($context: RequestContextInput!, $input: CreateOrganizationRequestInput!) {\n"
              + "  createOrganization(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      orgId\n"
              + "      name\n"
              + "      status\n"
              + "      revision\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.createDeployment</code>: Create a deployment in an organization. Completes asynchronously. */
  public static final OperationDescriptor<CreateDeploymentReply> MANAGEMENT_CREATE_DEPLOYMENT =
      OperationDescriptor.builder("management.createDeployment", Wire.required(CreateDeploymentReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("createDeployment")
          .operationName("ManagementCreateDeployment")
          .resultType("CreateDeploymentReply!")
          .inputFields(List.of("orgId", "offering", "geoId", "installationProfileId", "consentRef"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation ManagementCreateDeployment($context: RequestContextInput!, $input: CreateDeploymentRequestInput!) {\n"
              + "  createDeployment(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      projectId\n"
              + "      incarnation\n"
              + "      status\n"
              + "      backend\n"
              + "      environment\n"
              + "      policyRevision\n"
              + "      expiresAt\n"
              + "      kind\n"
              + "      resourceRef {\n"
              + "        kind\n"
              + "        id\n"
              + "      }\n"
              + "      delivery {\n"
              + "        deliveryId\n"
              + "        kind\n"
              + "        projectId\n"
              + "        installationId\n"
              + "        resourceRef {\n"
              + "          kind\n"
              + "          id\n"
              + "        }\n"
              + "        expiresAt\n"
              + "        payloadDigest\n"
              + "        recipientActorRef {\n"
              + "          tenantId\n"
              + "          objectId\n"
              + "        }\n"
              + "      }\n"
              + "      keyId\n"
              + "      endpointId\n"
              + "      enabled\n"
              + "      liveSessionCompletion {\n"
              + "        liveSessionId\n"
              + "        generation\n"
              + "        state\n"
              + "        revision\n"
              + "        completedAt\n"
              + "        mediaCutoff {\n"
              + "          state\n"
              + "          scope {\n"
              + "            kind\n"
              + "            liveSessionId\n"
              + "            generation\n"
              + "            participationId\n"
              + "          }\n"
              + "          evidence\n"
              + "          enforcedAt\n"
              + "          operationId\n"
              + "        }\n"
              + "      }\n"
              + "      replayedDeliveries\n"
              + "      skippedDeliveries\n"
              + "      messagePreview\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.createProject</code>: Create a project in a ready deployment. Completes asynchronously. */
  public static final OperationDescriptor<CreateProjectReply> MANAGEMENT_CREATE_PROJECT =
      OperationDescriptor.builder("management.createProject", Wire.required(CreateProjectReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("createProject")
          .operationName("ManagementCreateProject")
          .resultType("CreateProjectReply!")
          .inputFields(List.of("deploymentId", "name", "environment", "backendPrincipalName"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation ManagementCreateProject($context: RequestContextInput!, $input: CreateProjectRequestInput!) {\n"
              + "  createProject(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      projectId\n"
              + "      incarnation\n"
              + "      status\n"
              + "      backend\n"
              + "      environment\n"
              + "      policyRevision\n"
              + "      expiresAt\n"
              + "      kind\n"
              + "      resourceRef {\n"
              + "        kind\n"
              + "        id\n"
              + "      }\n"
              + "      delivery {\n"
              + "        deliveryId\n"
              + "        kind\n"
              + "        projectId\n"
              + "        installationId\n"
              + "        resourceRef {\n"
              + "          kind\n"
              + "          id\n"
              + "        }\n"
              + "        expiresAt\n"
              + "        payloadDigest\n"
              + "        recipientActorRef {\n"
              + "          tenantId\n"
              + "          objectId\n"
              + "        }\n"
              + "      }\n"
              + "      keyId\n"
              + "      endpointId\n"
              + "      enabled\n"
              + "      liveSessionCompletion {\n"
              + "        liveSessionId\n"
              + "        generation\n"
              + "        state\n"
              + "        revision\n"
              + "        completedAt\n"
              + "        mediaCutoff {\n"
              + "          state\n"
              + "          scope {\n"
              + "            kind\n"
              + "            liveSessionId\n"
              + "            generation\n"
              + "            participationId\n"
              + "          }\n"
              + "          evidence\n"
              + "          enforcedAt\n"
              + "          operationId\n"
              + "        }\n"
              + "      }\n"
              + "      replayedDeliveries\n"
              + "      skippedDeliveries\n"
              + "      messagePreview\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.issueBackendKey</code>: Issue a scoped backend key. The secret is delivered once through a credential delivery. */
  public static final OperationDescriptor<IssueBackendKeyReply> MANAGEMENT_ISSUE_BACKEND_KEY =
      OperationDescriptor.builder("management.issueBackendKey", Wire.required(IssueBackendKeyReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("issueBackendKey")
          .operationName("ManagementIssueBackendKey")
          .resultType("IssueBackendKeyReply!")
          .inputFields(List.of("projectId", "name", "scopes", "expiresAt"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation ManagementIssueBackendKey($context: RequestContextInput!, $input: IssueBackendKeyRequestInput!) {\n"
              + "  issueBackendKey(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      projectId\n"
              + "      incarnation\n"
              + "      status\n"
              + "      backend\n"
              + "      environment\n"
              + "      policyRevision\n"
              + "      expiresAt\n"
              + "      kind\n"
              + "      resourceRef {\n"
              + "        kind\n"
              + "        id\n"
              + "      }\n"
              + "      delivery {\n"
              + "        deliveryId\n"
              + "        kind\n"
              + "        projectId\n"
              + "        installationId\n"
              + "        resourceRef {\n"
              + "          kind\n"
              + "          id\n"
              + "        }\n"
              + "        expiresAt\n"
              + "        payloadDigest\n"
              + "        recipientActorRef {\n"
              + "          tenantId\n"
              + "          objectId\n"
              + "        }\n"
              + "      }\n"
              + "      keyId\n"
              + "      endpointId\n"
              + "      enabled\n"
              + "      liveSessionCompletion {\n"
              + "        liveSessionId\n"
              + "        generation\n"
              + "        state\n"
              + "        revision\n"
              + "        completedAt\n"
              + "        mediaCutoff {\n"
              + "          state\n"
              + "          scope {\n"
              + "            kind\n"
              + "            liveSessionId\n"
              + "            generation\n"
              + "            participationId\n"
              + "          }\n"
              + "          evidence\n"
              + "          enforcedAt\n"
              + "          operationId\n"
              + "        }\n"
              + "      }\n"
              + "      replayedDeliveries\n"
              + "      skippedDeliveries\n"
              + "      messagePreview\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.revokeBackendKey</code>: Revoke a backend key, optionally revoking the sessions it issued. */
  public static final OperationDescriptor<RevokeBackendKeyReply> MANAGEMENT_REVOKE_BACKEND_KEY =
      OperationDescriptor.builder("management.revokeBackendKey", Wire.required(RevokeBackendKeyReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("revokeBackendKey")
          .operationName("ManagementRevokeBackendKey")
          .resultType("RevokeBackendKeyReply!")
          .inputFields(List.of("projectId", "keyId", "expectedRevision", "revokeIssuedSessions"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation ManagementRevokeBackendKey($context: RequestContextInput!, $input: RevokeBackendKeyRequestInput!) {\n"
              + "  revokeBackendKey(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      projectId\n"
              + "      incarnation\n"
              + "      status\n"
              + "      backend\n"
              + "      environment\n"
              + "      policyRevision\n"
              + "      expiresAt\n"
              + "      kind\n"
              + "      resourceRef {\n"
              + "        kind\n"
              + "        id\n"
              + "      }\n"
              + "      delivery {\n"
              + "        deliveryId\n"
              + "        kind\n"
              + "        projectId\n"
              + "        installationId\n"
              + "        resourceRef {\n"
              + "          kind\n"
              + "          id\n"
              + "        }\n"
              + "        expiresAt\n"
              + "        payloadDigest\n"
              + "        recipientActorRef {\n"
              + "          tenantId\n"
              + "          objectId\n"
              + "        }\n"
              + "      }\n"
              + "      keyId\n"
              + "      endpointId\n"
              + "      enabled\n"
              + "      liveSessionCompletion {\n"
              + "        liveSessionId\n"
              + "        generation\n"
              + "        state\n"
              + "        revision\n"
              + "        completedAt\n"
              + "        mediaCutoff {\n"
              + "          state\n"
              + "          scope {\n"
              + "            kind\n"
              + "            liveSessionId\n"
              + "            generation\n"
              + "            participationId\n"
              + "          }\n"
              + "          evidence\n"
              + "          enforcedAt\n"
              + "          operationId\n"
              + "        }\n"
              + "      }\n"
              + "      replayedDeliveries\n"
              + "      skippedDeliveries\n"
              + "      messagePreview\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.projectPolicy</code>: Change the policy of a project. */
  public static final OperationDescriptor<ProjectPolicyReply> MANAGEMENT_PROJECT_POLICY =
      OperationDescriptor.builder("management.projectPolicy", Wire.required(ProjectPolicyReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("projectPolicy")
          .operationName("ManagementProjectPolicy")
          .resultType("ProjectPolicyReply!")
          .inputFields(List.of("projectId", "expectedRevision", "change"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation ManagementProjectPolicy($context: RequestContextInput!, $input: ProjectPolicyRequestInput!) {\n"
              + "  projectPolicy(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      projectId\n"
              + "      incarnation\n"
              + "      status\n"
              + "      backend\n"
              + "      environment\n"
              + "      policyRevision\n"
              + "      expiresAt\n"
              + "      kind\n"
              + "      resourceRef {\n"
              + "        kind\n"
              + "        id\n"
              + "      }\n"
              + "      delivery {\n"
              + "        deliveryId\n"
              + "        kind\n"
              + "        projectId\n"
              + "        installationId\n"
              + "        resourceRef {\n"
              + "          kind\n"
              + "          id\n"
              + "        }\n"
              + "        expiresAt\n"
              + "        payloadDigest\n"
              + "        recipientActorRef {\n"
              + "          tenantId\n"
              + "          objectId\n"
              + "        }\n"
              + "      }\n"
              + "      keyId\n"
              + "      endpointId\n"
              + "      enabled\n"
              + "      liveSessionCompletion {\n"
              + "        liveSessionId\n"
              + "        generation\n"
              + "        state\n"
              + "        revision\n"
              + "        completedAt\n"
              + "        mediaCutoff {\n"
              + "          state\n"
              + "          scope {\n"
              + "            kind\n"
              + "            liveSessionId\n"
              + "            generation\n"
              + "            participationId\n"
              + "          }\n"
              + "          evidence\n"
              + "          enforcedAt\n"
              + "          operationId\n"
              + "        }\n"
              + "      }\n"
              + "      replayedDeliveries\n"
              + "      skippedDeliveries\n"
              + "      messagePreview\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.credentialPermit</code>: Issue a signed permit that authorizes redeeming one credential delivery. */
  public static final OperationDescriptor<CredentialPermitReply> MANAGEMENT_CREDENTIAL_PERMIT =
      OperationDescriptor.builder("management.credentialPermit", Wire.required(CredentialPermitReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("credentialPermit")
          .operationName("ManagementCredentialPermit")
          .resultType("CredentialPermitReply!")
          .inputFields(List.of("projectId", "deliveryId", "redemptionRequestId"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation ManagementCredentialPermit($context: RequestContextInput!, $input: CredentialPermitRequestInput!) {\n"
              + "  credentialPermit(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.pauseOperation</code>: Pause a long-running operation. */
  public static final OperationDescriptor<PauseOperationReply> MANAGEMENT_PAUSE_OPERATION =
      OperationDescriptor.builder("management.pauseOperation", Wire.required(PauseOperationReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("pauseOperation")
          .operationName("ManagementPauseOperation")
          .resultType("PauseOperationReply!")
          .inputFields(List.of("operationId", "expectedRevision"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation ManagementPauseOperation($context: RequestContextInput!, $input: PauseOperationRequestInput!) {\n"
              + "  pauseOperation(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      operationId\n"
              + "      kind\n"
              + "      targetRef {\n"
              + "        kind\n"
              + "        id\n"
              + "      }\n"
              + "      state\n"
              + "      revision\n"
              + "      requestedAt\n"
              + "      updatedAt\n"
              + "      steps {\n"
              + "        stepId\n"
              + "        state\n"
              + "      }\n"
              + "      result {\n"
              + "        projectId\n"
              + "        incarnation\n"
              + "        status\n"
              + "        backend\n"
              + "        environment\n"
              + "        policyRevision\n"
              + "        expiresAt\n"
              + "        kind\n"
              + "        resourceRef {\n"
              + "          kind\n"
              + "          id\n"
              + "        }\n"
              + "        delivery {\n"
              + "          deliveryId\n"
              + "          kind\n"
              + "          projectId\n"
              + "          installationId\n"
              + "          resourceRef {\n"
              + "            kind\n"
              + "            id\n"
              + "          }\n"
              + "          expiresAt\n"
              + "          payloadDigest\n"
              + "          recipientActorRef {\n"
              + "            tenantId\n"
              + "            objectId\n"
              + "          }\n"
              + "        }\n"
              + "        keyId\n"
              + "        endpointId\n"
              + "        enabled\n"
              + "        liveSessionCompletion {\n"
              + "          liveSessionId\n"
              + "          generation\n"
              + "          state\n"
              + "          revision\n"
              + "          completedAt\n"
              + "          mediaCutoff {\n"
              + "            state\n"
              + "            scope {\n"
              + "              kind\n"
              + "              liveSessionId\n"
              + "              generation\n"
              + "              participationId\n"
              + "            }\n"
              + "            evidence\n"
              + "            enforcedAt\n"
              + "            operationId\n"
              + "          }\n"
              + "        }\n"
              + "        replayedDeliveries\n"
              + "        skippedDeliveries\n"
              + "        messagePreview\n"
              + "      }\n"
              + "      blockedReason\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.resumeOperation</code>: Resume a paused or blocked operation. */
  public static final OperationDescriptor<ResumeOperationReply> MANAGEMENT_RESUME_OPERATION =
      OperationDescriptor.builder("management.resumeOperation", Wire.required(ResumeOperationReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("resumeOperation")
          .operationName("ManagementResumeOperation")
          .resultType("ResumeOperationReply!")
          .inputFields(List.of("operationId", "expectedRevision"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation ManagementResumeOperation($context: RequestContextInput!, $input: ResumeOperationRequestInput!) {\n"
              + "  resumeOperation(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      operationId\n"
              + "      kind\n"
              + "      targetRef {\n"
              + "        kind\n"
              + "        id\n"
              + "      }\n"
              + "      state\n"
              + "      revision\n"
              + "      requestedAt\n"
              + "      updatedAt\n"
              + "      steps {\n"
              + "        stepId\n"
              + "        state\n"
              + "      }\n"
              + "      result {\n"
              + "        projectId\n"
              + "        incarnation\n"
              + "        status\n"
              + "        backend\n"
              + "        environment\n"
              + "        policyRevision\n"
              + "        expiresAt\n"
              + "        kind\n"
              + "        resourceRef {\n"
              + "          kind\n"
              + "          id\n"
              + "        }\n"
              + "        delivery {\n"
              + "          deliveryId\n"
              + "          kind\n"
              + "          projectId\n"
              + "          installationId\n"
              + "          resourceRef {\n"
              + "            kind\n"
              + "            id\n"
              + "          }\n"
              + "          expiresAt\n"
              + "          payloadDigest\n"
              + "          recipientActorRef {\n"
              + "            tenantId\n"
              + "            objectId\n"
              + "          }\n"
              + "        }\n"
              + "        keyId\n"
              + "        endpointId\n"
              + "        enabled\n"
              + "        liveSessionCompletion {\n"
              + "          liveSessionId\n"
              + "          generation\n"
              + "          state\n"
              + "          revision\n"
              + "          completedAt\n"
              + "          mediaCutoff {\n"
              + "            state\n"
              + "            scope {\n"
              + "              kind\n"
              + "              liveSessionId\n"
              + "              generation\n"
              + "              participationId\n"
              + "            }\n"
              + "            evidence\n"
              + "            enforcedAt\n"
              + "            operationId\n"
              + "          }\n"
              + "        }\n"
              + "        replayedDeliveries\n"
              + "        skippedDeliveries\n"
              + "        messagePreview\n"
              + "      }\n"
              + "      blockedReason\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.createBillingCheckoutSession</code>: Create a hosted checkout link that subscribes an active organization to a self-service plan. The link grants access to whoever holds it; a retry with the same requestId returns the same link until it expires. */
  public static final OperationDescriptor<CreateBillingCheckoutSessionReply> MANAGEMENT_CREATE_BILLING_CHECKOUT_SESSION =
      OperationDescriptor.builder("management.createBillingCheckoutSession", Wire.required(CreateBillingCheckoutSessionReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("createBillingCheckoutSession")
          .operationName("ManagementCreateBillingCheckoutSession")
          .resultType("CreateBillingCheckoutSessionReply!")
          .inputFields(List.of("orgId", "planId"))
          .idempotency("singleUse", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation ManagementCreateBillingCheckoutSession($context: RequestContextInput!, $input: CreateBillingCheckoutSessionRequestInput!) {\n"
              + "  createBillingCheckoutSession(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      orgId\n"
              + "      planId\n"
              + "      url\n"
              + "      expiresAt\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.createBillingPortalSession</code>: Create a hosted billing portal link where an organization manages its payment methods, invoices and subscription. The link grants access to whoever holds it; a retry with the same requestId returns the same link until it expires. */
  public static final OperationDescriptor<CreateBillingPortalSessionReply> MANAGEMENT_CREATE_BILLING_PORTAL_SESSION =
      OperationDescriptor.builder("management.createBillingPortalSession", Wire.required(CreateBillingPortalSessionReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("createBillingPortalSession")
          .operationName("ManagementCreateBillingPortalSession")
          .resultType("CreateBillingPortalSessionReply!")
          .inputFields(List.of("orgId"))
          .idempotency("singleUse", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation ManagementCreateBillingPortalSession($context: RequestContextInput!, $input: CreateBillingPortalSessionRequestInput!) {\n"
              + "  createBillingPortalSession(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      orgId\n"
              + "      url\n"
              + "      expiresAt\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.configureWebhook</code>: Create a webhook endpoint for project events. The signing secret is delivered once through a credential delivery. */
  public static final OperationDescriptor<ConfigureWebhookReply> MANAGEMENT_CONFIGURE_WEBHOOK =
      OperationDescriptor.builder("management.configureWebhook", Wire.required(ConfigureWebhookReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("configureWebhook")
          .operationName("ManagementConfigureWebhook")
          .resultType("ConfigureWebhookReply!")
          .inputFields(List.of("projectId", "url", "eventTypes", "consentRef"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation ManagementConfigureWebhook($context: RequestContextInput!, $input: ConfigureWebhookRequestInput!) {\n"
              + "  configureWebhook(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      projectId\n"
              + "      incarnation\n"
              + "      status\n"
              + "      backend\n"
              + "      environment\n"
              + "      policyRevision\n"
              + "      expiresAt\n"
              + "      kind\n"
              + "      resourceRef {\n"
              + "        kind\n"
              + "        id\n"
              + "      }\n"
              + "      delivery {\n"
              + "        deliveryId\n"
              + "        kind\n"
              + "        projectId\n"
              + "        installationId\n"
              + "        resourceRef {\n"
              + "          kind\n"
              + "          id\n"
              + "        }\n"
              + "        expiresAt\n"
              + "        payloadDigest\n"
              + "        recipientActorRef {\n"
              + "          tenantId\n"
              + "          objectId\n"
              + "        }\n"
              + "      }\n"
              + "      keyId\n"
              + "      endpointId\n"
              + "      enabled\n"
              + "      liveSessionCompletion {\n"
              + "        liveSessionId\n"
              + "        generation\n"
              + "        state\n"
              + "        revision\n"
              + "        completedAt\n"
              + "        mediaCutoff {\n"
              + "          state\n"
              + "          scope {\n"
              + "            kind\n"
              + "            liveSessionId\n"
              + "            generation\n"
              + "            participationId\n"
              + "          }\n"
              + "          evidence\n"
              + "          enforcedAt\n"
              + "          operationId\n"
              + "        }\n"
              + "      }\n"
              + "      replayedDeliveries\n"
              + "      skippedDeliveries\n"
              + "      messagePreview\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.updateWebhook</code>: Change the event types of a webhook endpoint, or enable or disable it. */
  public static final OperationDescriptor<UpdateWebhookReply> MANAGEMENT_UPDATE_WEBHOOK =
      OperationDescriptor.builder("management.updateWebhook", Wire.required(UpdateWebhookReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("updateWebhook")
          .operationName("ManagementUpdateWebhook")
          .resultType("UpdateWebhookReply!")
          .inputFields(List.of("projectId", "endpointId", "expectedRevision", "eventTypes", "enabled"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation ManagementUpdateWebhook($context: RequestContextInput!, $input: UpdateWebhookRequestInput!) {\n"
              + "  updateWebhook(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      projectId\n"
              + "      incarnation\n"
              + "      status\n"
              + "      backend\n"
              + "      environment\n"
              + "      policyRevision\n"
              + "      expiresAt\n"
              + "      kind\n"
              + "      resourceRef {\n"
              + "        kind\n"
              + "        id\n"
              + "      }\n"
              + "      delivery {\n"
              + "        deliveryId\n"
              + "        kind\n"
              + "        projectId\n"
              + "        installationId\n"
              + "        resourceRef {\n"
              + "          kind\n"
              + "          id\n"
              + "        }\n"
              + "        expiresAt\n"
              + "        payloadDigest\n"
              + "        recipientActorRef {\n"
              + "          tenantId\n"
              + "          objectId\n"
              + "        }\n"
              + "      }\n"
              + "      keyId\n"
              + "      endpointId\n"
              + "      enabled\n"
              + "      liveSessionCompletion {\n"
              + "        liveSessionId\n"
              + "        generation\n"
              + "        state\n"
              + "        revision\n"
              + "        completedAt\n"
              + "        mediaCutoff {\n"
              + "          state\n"
              + "          scope {\n"
              + "            kind\n"
              + "            liveSessionId\n"
              + "            generation\n"
              + "            participationId\n"
              + "          }\n"
              + "          evidence\n"
              + "          enforcedAt\n"
              + "          operationId\n"
              + "        }\n"
              + "      }\n"
              + "      replayedDeliveries\n"
              + "      skippedDeliveries\n"
              + "      messagePreview\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.rotateWebhookSecret</code>: Start rotating the signing secret of a webhook endpoint. The next secret is delivered once through a credential delivery. */
  public static final OperationDescriptor<RotateWebhookSecretReply> MANAGEMENT_ROTATE_WEBHOOK_SECRET =
      OperationDescriptor.builder("management.rotateWebhookSecret", Wire.required(RotateWebhookSecretReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("rotateWebhookSecret")
          .operationName("ManagementRotateWebhookSecret")
          .resultType("RotateWebhookSecretReply!")
          .inputFields(List.of("projectId", "endpointId", "expectedRevision"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation ManagementRotateWebhookSecret($context: RequestContextInput!, $input: RotateWebhookSecretRequestInput!) {\n"
              + "  rotateWebhookSecret(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      projectId\n"
              + "      incarnation\n"
              + "      status\n"
              + "      backend\n"
              + "      environment\n"
              + "      policyRevision\n"
              + "      expiresAt\n"
              + "      kind\n"
              + "      resourceRef {\n"
              + "        kind\n"
              + "        id\n"
              + "      }\n"
              + "      delivery {\n"
              + "        deliveryId\n"
              + "        kind\n"
              + "        projectId\n"
              + "        installationId\n"
              + "        resourceRef {\n"
              + "          kind\n"
              + "          id\n"
              + "        }\n"
              + "        expiresAt\n"
              + "        payloadDigest\n"
              + "        recipientActorRef {\n"
              + "          tenantId\n"
              + "          objectId\n"
              + "        }\n"
              + "      }\n"
              + "      keyId\n"
              + "      endpointId\n"
              + "      enabled\n"
              + "      liveSessionCompletion {\n"
              + "        liveSessionId\n"
              + "        generation\n"
              + "        state\n"
              + "        revision\n"
              + "        completedAt\n"
              + "        mediaCutoff {\n"
              + "          state\n"
              + "          scope {\n"
              + "            kind\n"
              + "            liveSessionId\n"
              + "            generation\n"
              + "            participationId\n"
              + "          }\n"
              + "          evidence\n"
              + "          enforcedAt\n"
              + "          operationId\n"
              + "        }\n"
              + "      }\n"
              + "      replayedDeliveries\n"
              + "      skippedDeliveries\n"
              + "      messagePreview\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.disableWebhook</code>: Disable a webhook endpoint. */
  public static final OperationDescriptor<DisableWebhookReply> MANAGEMENT_DISABLE_WEBHOOK =
      OperationDescriptor.builder("management.disableWebhook", Wire.required(DisableWebhookReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("disableWebhook")
          .operationName("ManagementDisableWebhook")
          .resultType("DisableWebhookReply!")
          .inputFields(List.of("projectId", "endpointId", "expectedRevision"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation ManagementDisableWebhook($context: RequestContextInput!, $input: DisableWebhookRequestInput!) {\n"
              + "  disableWebhook(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      projectId\n"
              + "      incarnation\n"
              + "      status\n"
              + "      backend\n"
              + "      environment\n"
              + "      policyRevision\n"
              + "      expiresAt\n"
              + "      kind\n"
              + "      resourceRef {\n"
              + "        kind\n"
              + "        id\n"
              + "      }\n"
              + "      delivery {\n"
              + "        deliveryId\n"
              + "        kind\n"
              + "        projectId\n"
              + "        installationId\n"
              + "        resourceRef {\n"
              + "          kind\n"
              + "          id\n"
              + "        }\n"
              + "        expiresAt\n"
              + "        payloadDigest\n"
              + "        recipientActorRef {\n"
              + "          tenantId\n"
              + "          objectId\n"
              + "        }\n"
              + "      }\n"
              + "      keyId\n"
              + "      endpointId\n"
              + "      enabled\n"
              + "      liveSessionCompletion {\n"
              + "        liveSessionId\n"
              + "        generation\n"
              + "        state\n"
              + "        revision\n"
              + "        completedAt\n"
              + "        mediaCutoff {\n"
              + "          state\n"
              + "          scope {\n"
              + "            kind\n"
              + "            liveSessionId\n"
              + "            generation\n"
              + "            participationId\n"
              + "          }\n"
              + "          evidence\n"
              + "          enforcedAt\n"
              + "          operationId\n"
              + "        }\n"
              + "      }\n"
              + "      replayedDeliveries\n"
              + "      skippedDeliveries\n"
              + "      messagePreview\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.replayWebhookDeliveries</code>: Redeliver one webhook delivery, or the deliveries of an endpoint in a time range, with their original event IDs. */
  public static final OperationDescriptor<ReplayWebhookDeliveriesReply> MANAGEMENT_REPLAY_WEBHOOK_DELIVERIES =
      OperationDescriptor.builder("management.replayWebhookDeliveries", Wire.required(ReplayWebhookDeliveriesReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("replayWebhookDeliveries")
          .operationName("ManagementReplayWebhookDeliveries")
          .resultType("ReplayWebhookDeliveriesReply!")
          .inputFields(List.of("projectId", "endpointId", "effectId", "since", "until"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation ManagementReplayWebhookDeliveries($context: RequestContextInput!, $input: ReplayWebhookDeliveriesRequestInput!) {\n"
              + "  replayWebhookDeliveries(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      projectId\n"
              + "      incarnation\n"
              + "      status\n"
              + "      backend\n"
              + "      environment\n"
              + "      policyRevision\n"
              + "      expiresAt\n"
              + "      kind\n"
              + "      resourceRef {\n"
              + "        kind\n"
              + "        id\n"
              + "      }\n"
              + "      delivery {\n"
              + "        deliveryId\n"
              + "        kind\n"
              + "        projectId\n"
              + "        installationId\n"
              + "        resourceRef {\n"
              + "          kind\n"
              + "          id\n"
              + "        }\n"
              + "        expiresAt\n"
              + "        payloadDigest\n"
              + "        recipientActorRef {\n"
              + "          tenantId\n"
              + "          objectId\n"
              + "        }\n"
              + "      }\n"
              + "      keyId\n"
              + "      endpointId\n"
              + "      enabled\n"
              + "      liveSessionCompletion {\n"
              + "        liveSessionId\n"
              + "        generation\n"
              + "        state\n"
              + "        revision\n"
              + "        completedAt\n"
              + "        mediaCutoff {\n"
              + "          state\n"
              + "          scope {\n"
              + "            kind\n"
              + "            liveSessionId\n"
              + "            generation\n"
              + "            participationId\n"
              + "          }\n"
              + "          evidence\n"
              + "          enforcedAt\n"
              + "          operationId\n"
              + "        }\n"
              + "      }\n"
              + "      replayedDeliveries\n"
              + "      skippedDeliveries\n"
              + "      messagePreview\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.requestAgentSignup</code>: Request an organization for a named human owner, who approves it from an emailed link. Nothing is usable before approval. */
  public static final OperationDescriptor<RequestAgentSignupReply> MANAGEMENT_REQUEST_AGENT_SIGNUP =
      OperationDescriptor.builder("management.requestAgentSignup", Wire.required(RequestAgentSignupReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("requestAgentSignup")
          .operationName("ManagementRequestAgentSignup")
          .resultType("RequestAgentSignupReply!")
          .inputFields(List.of("ownerEmail", "pollChallenge", "organizationName", "agentName", "purpose", "suggestedPlan", "suggestedScopes", "suggestedMonthlySpendCap"))
          .idempotency("replayOnly", OperationDescriptor.Retry.SAME_REQUEST, false, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation ManagementRequestAgentSignup($context: RequestContextInput!, $input: RequestAgentSignupRequestInput!) {\n"
              + "  requestAgentSignup(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      signupId\n"
              + "      confirmationCode\n"
              + "      expiresAt\n"
              + "      pollAfterSeconds\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.rejectAgentSignup</code>: Reject a signup request from its approval link, optionally suppressing future requests to the email. */
  public static final OperationDescriptor<RejectAgentSignupReply> MANAGEMENT_REJECT_AGENT_SIGNUP =
      OperationDescriptor.builder("management.rejectAgentSignup", Wire.required(RejectAgentSignupReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("rejectAgentSignup")
          .operationName("ManagementRejectAgentSignup")
          .resultType("RejectAgentSignupReply!")
          .inputFields(List.of("approvalToken", "suppressFutureRequests"))
          .idempotency("replayOnly", OperationDescriptor.Retry.SAME_REQUEST, false, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation ManagementRejectAgentSignup($context: RequestContextInput!, $input: RejectAgentSignupRequestInput!) {\n"
              + "  rejectAgentSignup(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      signupId\n"
              + "      state\n"
              + "      orgId\n"
              + "      deploymentId\n"
              + "      projectId\n"
              + "      nextStep\n"
              + "      scopes\n"
              + "      grantExpiresAt\n"
              + "      keys {\n"
              + "        operationId\n"
              + "        state\n"
              + "        scopes\n"
              + "        expiresAt\n"
              + "        keyId\n"
              + "        deliveryId\n"
              + "        deliveryExpiresAt\n"
              + "      }\n"
              + "      incarnation\n"
              + "      servingEpoch\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.approveAgentSignup</code>: Approve a signup request with its approval token and the agent's confirmation code, choosing the plan, scopes, monthly spend cap, agent purchase limit and grant expiry. The signed-in approver becomes the owner. */
  public static final OperationDescriptor<ApproveAgentSignupReply> MANAGEMENT_APPROVE_AGENT_SIGNUP =
      OperationDescriptor.builder("management.approveAgentSignup", Wire.required(ApproveAgentSignupReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("approveAgentSignup")
          .operationName("ManagementApproveAgentSignup")
          .resultType("ApproveAgentSignupReply!")
          .inputFields(List.of("approvalToken", "confirmationCode", "termsRef", "plan", "scopes", "monthlySpendCap", "agentPurchaseLimit", "grantExpiresAt"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation ManagementApproveAgentSignup($context: RequestContextInput!, $input: ApproveAgentSignupRequestInput!) {\n"
              + "  approveAgentSignup(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      signupId\n"
              + "      state\n"
              + "      orgId\n"
              + "      deploymentId\n"
              + "      projectId\n"
              + "      nextStep\n"
              + "      scopes\n"
              + "      grantExpiresAt\n"
              + "      keys {\n"
              + "        operationId\n"
              + "        state\n"
              + "        scopes\n"
              + "        expiresAt\n"
              + "        keyId\n"
              + "        deliveryId\n"
              + "        deliveryExpiresAt\n"
              + "      }\n"
              + "      incarnation\n"
              + "      servingEpoch\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.issueAgentKey</code>: Issue a backend key for the agent within its grant's scopes and expiry. The result is the pending key; poll agentSignup until it shows the key's delivery, then redeem it with agentCredentialPermit. */
  public static final OperationDescriptor<IssueAgentKeyReply> MANAGEMENT_ISSUE_AGENT_KEY =
      OperationDescriptor.builder("management.issueAgentKey", Wire.required(IssueAgentKeyReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("issueAgentKey")
          .operationName("ManagementIssueAgentKey")
          .resultType("IssueAgentKeyReply!")
          .inputFields(List.of("scopes", "expiresAt"))
          .idempotency("replayOnly", OperationDescriptor.Retry.SAME_REQUEST, false, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation ManagementIssueAgentKey($context: RequestContextInput!, $input: IssueAgentKeyRequestInput!) {\n"
              + "  issueAgentKey(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      operationId\n"
              + "      state\n"
              + "      scopes\n"
              + "      expiresAt\n"
              + "      keyId\n"
              + "      deliveryId\n"
              + "      deliveryExpiresAt\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.agentCredentialPermit</code>: Issue a permit that authorizes the agent to redeem one of its key deliveries. */
  public static final OperationDescriptor<AgentCredentialPermitReply> MANAGEMENT_AGENT_CREDENTIAL_PERMIT =
      OperationDescriptor.builder("management.agentCredentialPermit", Wire.required(AgentCredentialPermitReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("agentCredentialPermit")
          .operationName("ManagementAgentCredentialPermit")
          .resultType("AgentCredentialPermitReply!")
          .inputFields(List.of("deliveryId", "redemptionRequestId"))
          .idempotency("replayOnly", OperationDescriptor.Retry.SAME_REQUEST, false, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation ManagementAgentCredentialPermit($context: RequestContextInput!, $input: AgentCredentialPermitRequestInput!) {\n"
              + "  agentCredentialPermit(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.revokeAgentGrant</code>: Revoke an agent grant and every key issued under it. */
  public static final OperationDescriptor<RevokeAgentGrantReply> MANAGEMENT_REVOKE_AGENT_GRANT =
      OperationDescriptor.builder("management.revokeAgentGrant", Wire.required(RevokeAgentGrantReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("revokeAgentGrant")
          .operationName("ManagementRevokeAgentGrant")
          .resultType("RevokeAgentGrantReply!")
          .inputFields(List.of("grantId", "revokeIssuedSessions"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation ManagementRevokeAgentGrant($context: RequestContextInput!, $input: RevokeAgentGrantRequestInput!) {\n"
              + "  revokeAgentGrant(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      grantId\n"
              + "      orgId\n"
              + "      signupId\n"
              + "      agentActorId\n"
              + "      projectId\n"
              + "      scopes\n"
              + "      expiresAt\n"
              + "      revokedAt\n"
              + "      createdAt\n"
              + "      keys {\n"
              + "        operationId\n"
              + "        state\n"
              + "        scopes\n"
              + "        expiresAt\n"
              + "        keyId\n"
              + "        deliveryId\n"
              + "        deliveryExpiresAt\n"
              + "      }\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.setSpendControls</code>: Set the organization's monthly spend cap and agent purchase limit. */
  public static final OperationDescriptor<SetSpendControlsReply> MANAGEMENT_SET_SPEND_CONTROLS =
      OperationDescriptor.builder("management.setSpendControls", Wire.required(SetSpendControlsReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("setSpendControls")
          .operationName("ManagementSetSpendControls")
          .resultType("SetSpendControlsReply!")
          .inputFields(List.of("orgId", "monthlySpendCap", "agentPurchaseLimit"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation ManagementSetSpendControls($context: RequestContextInput!, $input: SetSpendControlsRequestInput!) {\n"
              + "  setSpendControls(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      orgId\n"
              + "      planId\n"
              + "      currency\n"
              + "      catalogVersion\n"
              + "      monthlySpendCap\n"
              + "      agentPurchaseLimit\n"
              + "      updatedAt\n"
              + "      monthlyMinimum\n"
              + "      periodStart\n"
              + "      periodEnd\n"
              + "      credits\n"
              + "      charges\n"
              + "      margin\n"
              + "      stop\n"
              + "      refusedMeters\n"
              + "      evaluatedAt\n"
              + "      usageThrough\n"
              + "      validUntil\n"
              + "      minimumCredit\n"
              + "      chargeLimit\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>management.purchaseAgentCredits</code>: Buy prepaid credits with a Shared Payment Token, within the owner's agent purchase limit. */
  public static final OperationDescriptor<PurchaseAgentCreditsReply> MANAGEMENT_PURCHASE_AGENT_CREDITS =
      OperationDescriptor.builder("management.purchaseAgentCredits", Wire.required(PurchaseAgentCreditsReply::decode))
          .plane("management")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("purchaseAgentCredits")
          .operationName("ManagementPurchaseAgentCredits")
          .resultType("PurchaseAgentCreditsReply!")
          .inputFields(List.of("amount", "sharedPaymentToken"))
          .idempotency("replayOnly", OperationDescriptor.Retry.SAME_REQUEST, false, 3, 60000L)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("projectId", OperationDescriptor.Use.FORBIDDEN)
          .context("incarnation", OperationDescriptor.Use.OPTIONAL)
          .context("observedServingEpoch", OperationDescriptor.Use.OPTIONAL)
          .context("credentialDeliveryPermit", OperationDescriptor.Use.FORBIDDEN)
          .document(
              "mutation ManagementPurchaseAgentCredits($context: RequestContextInput!, $input: PurchaseAgentCreditsRequestInput!) {\n"
              + "  purchaseAgentCredits(context: $context, input: $input) {\n"
              + "    status\n"
              + "    requestId\n"
              + "    serverTime\n"
              + "    receiptId\n"
              + "    committedAt\n"
              + "    replayed\n"
              + "    operation {\n"
              + "      operationId\n"
              + "      owner\n"
              + "      href\n"
              + "      state\n"
              + "    }\n"
              + "    resourceRef {\n"
              + "      kind\n"
              + "      id\n"
              + "    }\n"
              + "    result {\n"
              + "      paymentId\n"
              + "      amount\n"
              + "      currency\n"
              + "      state\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  private static final OperationCatalog CATALOG = new OperationCatalog(
      List.of(COMMUNICATION_CAPABILITIES,
          COMMUNICATION_ROUTE,
          COMMUNICATION_GET_PRINCIPAL,
          COMMUNICATION_GET_CONVERSATION,
          COMMUNICATION_MEMBERS,
          COMMUNICATION_MESSAGES,
          COMMUNICATION_GET_MESSAGE,
          COMMUNICATION_INBOX,
          COMMUNICATION_SEARCH,
          COMMUNICATION_RESOLVE_REQUEST,
          COMMUNICATION_GET_OPERATION,
          COMMUNICATION_CONVERSATION_MUTE,
          COMMUNICATION_CURRENT_LIVE_SESSION,
          COMMUNICATION_LIVE_SESSION,
          COMMUNICATION_LIVE_SESSIONS,
          COMMUNICATION_LIVE_SESSION_PARTICIPANTS,
          COMMUNICATION_LIVE_SESSION_OPERATION,
          COMMUNICATION_SESSION_REQUEST_OUTCOME,
          COMMUNICATION_CREATE_PRINCIPAL,
          COMMUNICATION_DISABLE_PRINCIPAL,
          COMMUNICATION_ISSUE_SESSION,
          COMMUNICATION_RENEW_SESSION,
          COMMUNICATION_REVOKE_SESSION,
          COMMUNICATION_CREATE_CONVERSATION,
          COMMUNICATION_UPDATE_CONVERSATION,
          COMMUNICATION_ADD_MEMBER,
          COMMUNICATION_ADD_MEMBERS,
          COMMUNICATION_REMOVE_MEMBER,
          COMMUNICATION_HISTORY_GRANT,
          COMMUNICATION_SEND_MESSAGE,
          COMMUNICATION_EDIT_MESSAGE,
          COMMUNICATION_DELETE_MESSAGE,
          COMMUNICATION_SET_BROADCAST_PERMISSION,
          COMMUNICATION_SET_CONVERSATION_MUTE,
          COMMUNICATION_ALERT_LIVE_SESSION,
          COMMUNICATION_END_LIVE_SESSION,
          COMMUNICATION_REDEEM_CREDENTIAL,
          COMMUNICATION_ACKNOWLEDGE_CREDENTIAL,
          MANAGEMENT_CAPABILITIES,
          MANAGEMENT_ORGANIZATIONS,
          MANAGEMENT_GET_ORGANIZATION,
          MANAGEMENT_GET_DEPLOYMENT,
          MANAGEMENT_GET_PROJECT,
          MANAGEMENT_DEPLOYMENT_HEALTH,
          MANAGEMENT_DEPLOYMENT_USAGE,
          MANAGEMENT_PROJECT_USAGE,
          MANAGEMENT_ORGANIZATION_USAGE,
          MANAGEMENT_ORGANIZATION_BILLING,
          MANAGEMENT_WEBHOOK_ENDPOINTS,
          MANAGEMENT_WEBHOOK_DELIVERIES,
          MANAGEMENT_RESOLVE_REQUEST,
          MANAGEMENT_GET_OPERATION,
          MANAGEMENT_AGENT_SIGNUP_FOR_APPROVAL,
          MANAGEMENT_AGENT_SIGNUP,
          MANAGEMENT_AGENT_GRANTS,
          MANAGEMENT_AGENT_AUDIT_EVENTS,
          MANAGEMENT_ORGANIZATION_SPEND,
          MANAGEMENT_CREATE_ORGANIZATION,
          MANAGEMENT_CREATE_DEPLOYMENT,
          MANAGEMENT_CREATE_PROJECT,
          MANAGEMENT_ISSUE_BACKEND_KEY,
          MANAGEMENT_REVOKE_BACKEND_KEY,
          MANAGEMENT_PROJECT_POLICY,
          MANAGEMENT_CREDENTIAL_PERMIT,
          MANAGEMENT_PAUSE_OPERATION,
          MANAGEMENT_RESUME_OPERATION,
          MANAGEMENT_CREATE_BILLING_CHECKOUT_SESSION,
          MANAGEMENT_CREATE_BILLING_PORTAL_SESSION,
          MANAGEMENT_CONFIGURE_WEBHOOK,
          MANAGEMENT_UPDATE_WEBHOOK,
          MANAGEMENT_ROTATE_WEBHOOK_SECRET,
          MANAGEMENT_DISABLE_WEBHOOK,
          MANAGEMENT_REPLAY_WEBHOOK_DELIVERIES,
          MANAGEMENT_REQUEST_AGENT_SIGNUP,
          MANAGEMENT_REJECT_AGENT_SIGNUP,
          MANAGEMENT_APPROVE_AGENT_SIGNUP,
          MANAGEMENT_ISSUE_AGENT_KEY,
          MANAGEMENT_AGENT_CREDENTIAL_PERMIT,
          MANAGEMENT_REVOKE_AGENT_GRANT,
          MANAGEMENT_SET_SPEND_CONTROLS,
          MANAGEMENT_PURCHASE_AGENT_CREDITS),
      Map.ofEntries(Map.entry("communication", "communication.resolveRequest"),
          Map.entry("management", "management.resolveRequest")),
      Map.ofEntries(Map.entry("ADMISSION_LIMIT", true),
          Map.entry("AGENTIC_NOT_CONFIGURED", false),
          Map.entry("AGENT_CONFIRMATION_CODE_INVALID", false),
          Map.entry("AGENT_GRANT_EXPIRED", false),
          Map.entry("AGENT_GRANT_REVOKED", false),
          Map.entry("AGENT_KEY_LIMIT", false),
          Map.entry("AGENT_PURCHASE_LIMIT_EXCEEDED", false),
          Map.entry("AGENT_SCOPE_NOT_GRANTED", false),
          Map.entry("AGENT_SIGNUP_CLOSED", false),
          Map.entry("AGENT_SIGNUP_EMAIL_REJECTED", false),
          Map.entry("AGENT_SIGNUP_NOT_READY", false),
          Map.entry("AGENT_SIGNUP_SUPPRESSED", false),
          Map.entry("ALREADY_CONNECTED", false),
          Map.entry("ALREADY_EXISTS", false),
          Map.entry("AUTHORITY_UNAVAILABLE", true),
          Map.entry("BILLING_CATALOG_CONFLICT", false),
          Map.entry("BILLING_CATALOG_NOT_SYNCED", false),
          Map.entry("BILLING_CUSTOMER_MISSING", false),
          Map.entry("BILLING_LINK_EXPIRED", false),
          Map.entry("BILLING_NOT_CONFIGURED", false),
          Map.entry("BILLING_PLAN_UNAVAILABLE", false),
          Map.entry("BILLING_PROVIDER_CHANGED", false),
          Map.entry("BILLING_PROVIDER_REJECTED", false),
          Map.entry("BILLING_SUBSCRIPTION_ACTIVE", false),
          Map.entry("BILLING_SUSPENDED", false),
          Map.entry("CREDENTIAL_DELIVERY_EXPIRED", false),
          Map.entry("CREDENTIAL_EXPIRED", false),
          Map.entry("CREDENTIAL_REFRESH_REQUIRED", false),
          Map.entry("CREDENTIAL_REQUIRED", false),
          Map.entry("CREDITS_EXHAUSTED", false),
          Map.entry("CREDITS_REQUIRE_METERED_PLAN", false),
          Map.entry("CREDIT_AMOUNT_OUT_OF_RANGE", false),
          Map.entry("CREDIT_GRANT_LIMIT_REACHED", false),
          Map.entry("CURSOR_AHEAD", false),
          Map.entry("CURSOR_EXPIRED", false),
          Map.entry("CURSOR_INVALID", false),
          Map.entry("CURSOR_MISMATCH", false),
          Map.entry("CURSOR_SCOPE_MISMATCH", false),
          Map.entry("DELIVERY_CONSUMED", false),
          Map.entry("DELIVERY_NOT_REDEEMED", false),
          Map.entry("DEPLOYMENT_NOT_READY", false),
          Map.entry("FEATURE_UNSUPPORTED", false),
          Map.entry("FORBIDDEN", false),
          Map.entry("GENERATION_CONFLICT", false),
          Map.entry("GRAPHQL_ERROR", false),
          Map.entry("GRAPHQL_INVALID_REQUEST", false),
          Map.entry("GRAPHQL_QUERY_LIMIT", false),
          Map.entry("GRAPHQL_RESPONSE_LIMIT", false),
          Map.entry("HTTP_FAILURE", true),
          Map.entry("IDEMPOTENCY_CONFLICT", false),
          Map.entry("INCARNATION_MISMATCH", false),
          Map.entry("INVALID_REPLACEMENT", false),
          Map.entry("INVALID_REQUEST", false),
          Map.entry("INVALID_RESPONSE", true),
          Map.entry("LIVE_ALERT_LIMIT", false),
          Map.entry("LIVE_SESSION_CLOSED", false),
          Map.entry("LIVE_SESSION_EXISTS", false),
          Map.entry("MEDIA_CONNECT_FAILED", false),
          Map.entry("MEDIA_FENCE_REQUIRED", false),
          Map.entry("MEDIA_NOT_READY", false),
          Map.entry("MEDIA_RECOVERING", false),
          Map.entry("MEMBERSHIP_COUNT_INVALID", false),
          Map.entry("MEMBER_LIMIT", false),
          Map.entry("MESSAGE_DELETED", false),
          Map.entry("NOT_A_SESSION_REQUEST", false),
          Map.entry("NOT_FOUND", false),
          Map.entry("OUTCOME_UNKNOWN", true),
          Map.entry("PAGE_ITEM_TOO_LARGE", false),
          Map.entry("PARTICIPATION_MISMATCH", false),
          Map.entry("PAYMENT_DECLINED", false),
          Map.entry("PAYMENT_RAIL_NOT_CONFIGURED", false),
          Map.entry("PERMIT_EXPIRED", false),
          Map.entry("PLAN_LIMIT_EXCEEDED", false),
          Map.entry("QUOTA_EXCEEDED", false),
          Map.entry("RATE_LIMITED", true),
          Map.entry("RECOVERY_LIMIT", false),
          Map.entry("RECOVERY_STORAGE_FAILURE", false),
          Map.entry("REQUEST_EXPIRED", false),
          Map.entry("REQUEST_TOO_LARGE", false),
          Map.entry("RESOLUTION_REQUIRED", false),
          Map.entry("RESPONSE_TOO_LARGE", false),
          Map.entry("RESYNC_REQUIRED", false),
          Map.entry("RETRY_EXHAUSTED", true),
          Map.entry("REVISION_CONFLICT", false),
          Map.entry("SCOPE_REQUIRED", false),
          Map.entry("SESSION_RECEIPT_BINDING_MISMATCH", false),
          Map.entry("SESSION_RECEIPT_INVALID", false),
          Map.entry("SESSION_REFRESH_FAILED", false),
          Map.entry("SESSION_REFRESH_REJECTED", false),
          Map.entry("SESSION_REFRESH_REQUIRED", false),
          Map.entry("SESSION_REFRESH_UNVERIFIED", false),
          Map.entry("SPEND_CAP_REACHED", false),
          Map.entry("SPEND_UNVERIFIED", true),
          Map.entry("TRANSPORT_UNKNOWN", true),
          Map.entry("UNAUTHENTICATED", false),
          Map.entry("WEBHOOK_DESTINATION_DENIED", false),
          Map.entry("WEBHOOK_ENDPOINT_DISABLED", false),
          Map.entry("WEBHOOK_ENDPOINT_LIMIT", false),
          Map.entry("WEBHOOK_ROTATION_PENDING", false),
          Map.entry("WEBHOOK_SECRET_UNACKNOWLEDGED", false),
          Map.entry("WRONG_REGION", false)));

  /**
   * Every descriptor, keyed by operation id, with each plane's resolve operation and whether the schema marks each error
   * code retryable.
   *
   * @return the catalog
   */
  public static OperationCatalog catalog() {
    return CATALOG;
  }
}
