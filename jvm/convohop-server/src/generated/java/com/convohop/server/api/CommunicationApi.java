// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.api;

import com.convohop.server.internal.OperationExecutor;
import com.convohop.server.internal.Pages;
import com.convohop.server.internal.Wire;
import com.convohop.server.model.AcknowledgeCredentialReply;
import com.convohop.server.model.AcknowledgeCredentialRequestInput;
import com.convohop.server.model.AddMemberReply;
import com.convohop.server.model.AddMemberRequestInput;
import com.convohop.server.model.AddMembersInput;
import com.convohop.server.model.AddMembersPayload;
import com.convohop.server.model.AlertLiveSessionInput;
import com.convohop.server.model.AlertLiveSessionPayload;
import com.convohop.server.model.CapabilitiesReply;
import com.convohop.server.model.ConversationLiveInput;
import com.convohop.server.model.ConversationMuteInput;
import com.convohop.server.model.ConversationMuteReply;
import com.convohop.server.model.CreateConversationReply;
import com.convohop.server.model.CreateConversationRequestInput;
import com.convohop.server.model.CreatePrincipalReply;
import com.convohop.server.model.CreatePrincipalRequestInput;
import com.convohop.server.model.CurrentLiveSessionReply;
import com.convohop.server.model.DeleteMessageReply;
import com.convohop.server.model.DeleteMessageRequestInput;
import com.convohop.server.model.DisablePrincipalReply;
import com.convohop.server.model.DisablePrincipalRequestInput;
import com.convohop.server.model.EditMessageReply;
import com.convohop.server.model.EditMessageRequestInput;
import com.convohop.server.model.EndLiveSessionInput;
import com.convohop.server.model.EndLiveSessionPayload;
import com.convohop.server.model.GetConversationReply;
import com.convohop.server.model.GetConversationRequestInput;
import com.convohop.server.model.GetMessageReply;
import com.convohop.server.model.GetMessageRequestInput;
import com.convohop.server.model.GetOperationReply;
import com.convohop.server.model.GetOperationRequestInput;
import com.convohop.server.model.GetPrincipalReply;
import com.convohop.server.model.GetPrincipalRequestInput;
import com.convohop.server.model.HistoryGrantReply;
import com.convohop.server.model.HistoryGrantRequestInput;
import com.convohop.server.model.InboxPage;
import com.convohop.server.model.InboxReply;
import com.convohop.server.model.InboxRequestInput;
import com.convohop.server.model.IssueSessionReply;
import com.convohop.server.model.IssueSessionRequestInput;
import com.convohop.server.model.LiveParticipantPage;
import com.convohop.server.model.LiveParticipantPageReply;
import com.convohop.server.model.LiveParticipantsInput;
import com.convohop.server.model.LiveSessionInput;
import com.convohop.server.model.LiveSessionOperationInput;
import com.convohop.server.model.LiveSessionOperationReply;
import com.convohop.server.model.LiveSessionPage;
import com.convohop.server.model.LiveSessionPageReply;
import com.convohop.server.model.LiveSessionReply;
import com.convohop.server.model.LiveSessionsInput;
import com.convohop.server.model.MemberPage;
import com.convohop.server.model.MembersReply;
import com.convohop.server.model.MembersRequestInput;
import com.convohop.server.model.MessagePage;
import com.convohop.server.model.MessagesReply;
import com.convohop.server.model.MessagesRequestInput;
import com.convohop.server.model.RedeemCredentialReply;
import com.convohop.server.model.RedeemCredentialRequestInput;
import com.convohop.server.model.RemoveMemberReply;
import com.convohop.server.model.RemoveMemberRequestInput;
import com.convohop.server.model.RenewSessionReply;
import com.convohop.server.model.RenewSessionRequestInput;
import com.convohop.server.model.ResolveRequestReply;
import com.convohop.server.model.ResolveRequestRequestInput;
import com.convohop.server.model.RevokeSessionReply;
import com.convohop.server.model.RevokeSessionRequestInput;
import com.convohop.server.model.RouteReply;
import com.convohop.server.model.Scalars;
import com.convohop.server.model.SearchPage;
import com.convohop.server.model.SearchReply;
import com.convohop.server.model.SearchRequestInput;
import com.convohop.server.model.SendMessageReply;
import com.convohop.server.model.SendMessageRequestInput;
import com.convohop.server.model.SessionRequestOutcomeReply;
import com.convohop.server.model.SessionRequestOutcomeRequestInput;
import com.convohop.server.model.SetBroadcastPermissionInput;
import com.convohop.server.model.SetBroadcastPermissionPayload;
import com.convohop.server.model.SetConversationMuteInput;
import com.convohop.server.model.SetConversationMutePayload;
import com.convohop.server.model.UpdateConversationReply;
import com.convohop.server.model.UpdateConversationRequestInput;
import java.util.Map;
import org.jspecify.annotations.Nullable;

/**
 * The <code>communication</code> plane: Conversations, members, messages, receipts, realtime events and live sessions inside one project.
 *
 * <p>Obtain an instance from a client; every call blocks until the authority answers or the request fails.
 */
public final class CommunicationApi {
  private final OperationExecutor executor;

  /**
   * Binds the plane to an executor. Clients create instances; applications do not call this.
   *
   * @param executor the executor that sends requests
   */
  public CommunicationApi(OperationExecutor executor) {
    this.executor = Wire.nonNull(executor, "executor");
  }

  /**
   * Describe the features, limits and API model the authority supports.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: userSession, backendKey.
   *
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public CapabilitiesReply capabilities() {
    return this.executor.execute(Operations.COMMUNICATION_CAPABILITIES, null, null, null);
  }

  /**
   * Return the signed route: project incarnation, serving epoch and realtime endpoint. Call it before other communication operations and again after WRONG_REGION.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: userSession, backendKey.
   *
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public RouteReply route() {
    return this.executor.execute(Operations.COMMUNICATION_ROUTE, null, null, null);
  }

  /**
   * Read a principal (an application user).
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: backendKey (scopes principalManage).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public GetPrincipalReply getPrincipal(GetPrincipalRequestInput input) {
    return this.executor.execute(Operations.COMMUNICATION_GET_PRINCIPAL, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Read a conversation.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: userSession (condition member), backendKey (scopes conversationManage).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public GetConversationReply getConversation(GetConversationRequestInput input) {
    return this.executor.execute(Operations.COMMUNICATION_GET_CONVERSATION, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * List the members of a conversation.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: userSession (condition member), backendKey (scopes membershipManage).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public MembersReply members(MembersRequestInput input) {
    return this.executor.execute(Operations.COMMUNICATION_MEMBERS, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Every page of {@link #members(MembersRequestInput)}, each requested when iteration reaches it. Later requests set <code>cursor</code> to the previous page's <code>nextCursor</code>, and iteration ends after the page whose <code>complete</code> is true. Each iteration starts again from <code>input</code>, and every request has a new request ID.
   *
   * <p>Pagination: <code>cursor</code>. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true.
   *
   * <p>Iteration throws {@link com.convohop.server.ConvoHopProblem} if the authority rejects a request or a page is malformed or does not advance, and {@link IllegalStateException} if a page reports <code>refreshRequired</code>: start again from current state, not from the cursor.
   *
   * @param input the first page's input
   * @return the pages, in order
   * @throws IllegalArgumentException if the input's <code>cursor</code> is not a valid cursor
   */
  public Iterable<MemberPage> membersPages(MembersRequestInput input) {
    return Pages.<MembersReply, MemberPage>of(
        this.executor, Operations.COMMUNICATION_MEMBERS, Wire.nonNull(input, "input").toJson(), "cursor", Wire.STRING,
        Pages.Order.OPAQUE, MembersReply::getResult, MemberPage::getComplete, MemberPage::getRefreshRequired,
        MemberPage::getNextCursor);
  }

  /**
   * List the messages of a conversation, newest first. A backend key reads the full history, or the history visible to the member named by actAsPrincipalId.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: userSession (condition member), backendKey (scopes messageRead).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public MessagesReply messages(MessagesRequestInput input) {
    return this.executor.execute(Operations.COMMUNICATION_MESSAGES, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Every page of {@link #messages(MessagesRequestInput)}, each requested when iteration reaches it. Later requests set <code>beforeSequence</code> to the previous page's <code>nextCursor</code>, and iteration ends after the page whose <code>complete</code> is true. Each iteration starts again from <code>input</code>, and every request has a new request ID.
   *
   * <p>Pagination: <code>sequence</code>. Newest first. Pass nextCursor back as the sequence cursor input to read older items until complete is true.
   *
   * <p>Iteration throws {@link com.convohop.server.ConvoHopProblem} if the authority rejects a request or a page is malformed or does not advance, and {@link IllegalStateException} if a page reports <code>refreshRequired</code>: start again from current state, not from the cursor.
   *
   * @param input the first page's input
   * @return the pages, in order
   * @throws IllegalArgumentException if the input's <code>beforeSequence</code> is not a valid cursor
   */
  public Iterable<MessagePage> messagesPages(MessagesRequestInput input) {
    return Pages.<MessagesReply, MessagePage>of(
        this.executor, Operations.COMMUNICATION_MESSAGES, Wire.nonNull(input, "input").toJson(), "beforeSequence", Scalars.DECIMAL,
        Pages.Order.DESCENDING, MessagesReply::getResult, MessagePage::getComplete, MessagePage::getRefreshRequired,
        MessagePage::getNextCursor);
  }

  /**
   * Read one message. A backend key reads any message, or reads as the member named by actAsPrincipalId.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: userSession (condition member), backendKey (scopes messageRead).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public GetMessageReply getMessage(GetMessageRequestInput input) {
    return this.executor.execute(Operations.COMMUNICATION_GET_MESSAGE, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * List the conversations visible to the calling user. A backend key must name that user with actAsPrincipalId.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: userSession, backendKey (scopes messageRead).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public InboxReply inbox(InboxRequestInput input) {
    return this.executor.execute(Operations.COMMUNICATION_INBOX, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Every page of {@link #inbox(InboxRequestInput)}, each requested when iteration reaches it. Later requests set <code>cursor</code> to the previous page's <code>nextCursor</code>, and iteration ends after the page whose <code>complete</code> is true. Each iteration starts again from <code>input</code>, and every request has a new request ID.
   *
   * <p>Pagination: <code>cursor</code>. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true.
   *
   * <p>Iteration throws {@link com.convohop.server.ConvoHopProblem} if the authority rejects a request or a page is malformed or does not advance, and {@link IllegalStateException} if a page reports <code>refreshRequired</code>: start again from current state, not from the cursor.
   *
   * @param input the first page's input
   * @return the pages, in order
   * @throws IllegalArgumentException if the input's <code>cursor</code> is not a valid cursor
   */
  public Iterable<InboxPage> inboxPages(InboxRequestInput input) {
    return Pages.<InboxReply, InboxPage>of(
        this.executor, Operations.COMMUNICATION_INBOX, Wire.nonNull(input, "input").toJson(), "cursor", Wire.STRING,
        Pages.Order.OPAQUE, InboxReply::getResult, InboxPage::getComplete, InboxPage::getRefreshRequired,
        InboxPage::getNextCursor);
  }

  /**
   * Search the messages visible to the calling user. A backend key searches as the member named by actAsPrincipalId, or within scope.conversationIds.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: userSession, backendKey (scopes messageRead).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public SearchReply search(SearchRequestInput input) {
    return this.executor.execute(Operations.COMMUNICATION_SEARCH, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Every page of {@link #search(SearchRequestInput)}, each requested when iteration reaches it. Later requests set <code>cursor</code> to the previous page's <code>nextCursor</code>, and iteration ends after the page whose <code>complete</code> is true. Each iteration starts again from <code>input</code>, and every request has a new request ID.
   *
   * <p>Pagination: <code>cursor</code>. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true.
   *
   * <p>Iteration throws {@link com.convohop.server.ConvoHopProblem} if the authority rejects a request or a page is malformed or does not advance, and {@link IllegalStateException} if a page reports <code>refreshRequired</code>: start again from current state, not from the cursor.
   *
   * @param input the first page's input
   * @return the pages, in order
   * @throws IllegalArgumentException if the input's <code>cursor</code> is not a valid cursor
   */
  public Iterable<SearchPage> searchPages(SearchRequestInput input) {
    return Pages.<SearchReply, SearchPage>of(
        this.executor, Operations.COMMUNICATION_SEARCH, Wire.nonNull(input, "input").toJson(), "cursor", Wire.STRING,
        Pages.Order.OPAQUE, SearchReply::getResult, SearchPage::getComplete, SearchPage::getRefreshRequired,
        SearchPage::getNextCursor);
  }

  /**
   * Look up the stored outcome of an earlier communication mutation by its requestId.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: userSession (condition ownRequest), backendKey (condition ownRequest).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public ResolveRequestReply resolveRequest(ResolveRequestRequestInput input) {
    return this.executor.execute(Operations.COMMUNICATION_RESOLVE_REQUEST, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Read the state of a long-running communication operation.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: userSession (condition operationParticipant), backendKey (condition operationParticipant).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public GetOperationReply getOperation(GetOperationRequestInput input) {
    return this.executor.execute(Operations.COMMUNICATION_GET_OPERATION, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Read whether a member has muted message push notifications for a conversation. A backend key must name the member with actAsPrincipalId.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: userSession (condition member), backendKey (scopes membershipManage).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public ConversationMuteReply conversationMute(ConversationMuteInput input) {
    return this.executor.execute(Operations.COMMUNICATION_CONVERSATION_MUTE, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Return the active live session of a conversation, if any.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: userSession (condition member), backendKey (scopes callRead), backendKey (scopes callManage).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public CurrentLiveSessionReply currentLiveSession(ConversationLiveInput input) {
    return this.executor.execute(Operations.COMMUNICATION_CURRENT_LIVE_SESSION, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Read a live session.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: userSession (condition member), backendKey (scopes callRead), backendKey (scopes callManage).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public LiveSessionReply liveSession(LiveSessionInput input) {
    return this.executor.execute(Operations.COMMUNICATION_LIVE_SESSION, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * List the live sessions of a conversation.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: userSession (condition member), backendKey (scopes callRead), backendKey (scopes callManage).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public LiveSessionPageReply liveSessions(LiveSessionsInput input) {
    return this.executor.execute(Operations.COMMUNICATION_LIVE_SESSIONS, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Every page of {@link #liveSessions(LiveSessionsInput)}, each requested when iteration reaches it. Later requests set <code>cursor</code> to the previous page's <code>nextCursor</code>, and iteration ends after the page whose <code>complete</code> is true. Each iteration starts again from <code>input</code>, and every request has a new request ID.
   *
   * <p>Pagination: <code>cursor</code>. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true.
   *
   * <p>Iteration throws {@link com.convohop.server.ConvoHopProblem} if the authority rejects a request or a page is malformed or does not advance, and {@link IllegalStateException} if a page reports <code>refreshRequired</code>: start again from current state, not from the cursor.
   *
   * @param input the first page's input
   * @return the pages, in order
   * @throws IllegalArgumentException if the input's <code>cursor</code> is not a valid cursor
   */
  public Iterable<LiveSessionPage> liveSessionsPages(LiveSessionsInput input) {
    return Pages.<LiveSessionPageReply, LiveSessionPage>of(
        this.executor, Operations.COMMUNICATION_LIVE_SESSIONS, Wire.nonNull(input, "input").toJson(), "cursor", Wire.STRING,
        Pages.Order.OPAQUE, LiveSessionPageReply::getResult, LiveSessionPage::getComplete, LiveSessionPage::getRefreshRequired,
        LiveSessionPage::getNextCursor);
  }

  /**
   * List the participants of a live session.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: userSession (condition member), backendKey (scopes callRead), backendKey (scopes callManage).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public LiveParticipantPageReply liveSessionParticipants(LiveParticipantsInput input) {
    return this.executor.execute(Operations.COMMUNICATION_LIVE_SESSION_PARTICIPANTS, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Every page of {@link #liveSessionParticipants(LiveParticipantsInput)}, each requested when iteration reaches it. Later requests set <code>cursor</code> to the previous page's <code>nextCursor</code>, and iteration ends after the page whose <code>complete</code> is true. Each iteration starts again from <code>input</code>, and every request has a new request ID.
   *
   * <p>Pagination: <code>cursor</code>. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true.
   *
   * <p>Iteration throws {@link com.convohop.server.ConvoHopProblem} if the authority rejects a request or a page is malformed or does not advance, and {@link IllegalStateException} if a page reports <code>refreshRequired</code>: start again from current state, not from the cursor.
   *
   * @param input the first page's input
   * @return the pages, in order
   * @throws IllegalArgumentException if the input's <code>cursor</code> is not a valid cursor
   */
  public Iterable<LiveParticipantPage> liveSessionParticipantsPages(LiveParticipantsInput input) {
    return Pages.<LiveParticipantPageReply, LiveParticipantPage>of(
        this.executor, Operations.COMMUNICATION_LIVE_SESSION_PARTICIPANTS, Wire.nonNull(input, "input").toJson(), "cursor", Wire.STRING,
        Pages.Order.OPAQUE, LiveParticipantPageReply::getResult, LiveParticipantPage::getComplete, LiveParticipantPage::getRefreshRequired,
        LiveParticipantPage::getNextCursor);
  }

  /**
   * Read the state of a live session start or end operation.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: userSession (condition member), backendKey (scopes callRead), backendKey (scopes callManage).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public LiveSessionOperationReply liveSessionOperation(LiveSessionOperationInput input) {
    return this.executor.execute(Operations.COMMUNICATION_LIVE_SESSION_OPERATION, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Look up the outcome of an earlier issueSession or renewSession request, including the session it produced.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: backendKey (scopes sessionIssue, sessionManage).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public SessionRequestOutcomeReply sessionRequestOutcome(SessionRequestOutcomeRequestInput input) {
    return this.executor.execute(Operations.COMMUNICATION_SESSION_REQUEST_OUTCOME, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Create a principal for an application user.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: backendKey (scopes principalManage).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public CreatePrincipalReply createPrincipal(CreatePrincipalRequestInput input) {
    return this.createPrincipal(input, null);
  }

  /**
   * Create a principal for an application user.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: backendKey (scopes principalManage).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public CreatePrincipalReply createPrincipal(CreatePrincipalRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.COMMUNICATION_CREATE_PRINCIPAL, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Disable a principal.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: backendKey (scopes principalManage).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public DisablePrincipalReply disablePrincipal(DisablePrincipalRequestInput input) {
    return this.disablePrincipal(input, null);
  }

  /**
   * Disable a principal.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: backendKey (scopes principalManage).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public DisablePrincipalReply disablePrincipal(DisablePrincipalRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.COMMUNICATION_DISABLE_PRINCIPAL, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Issue a short-lived user session token for a principal and device.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: backendKey (scopes sessionIssue).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public IssueSessionReply issueSession(IssueSessionRequestInput input) {
    return this.issueSession(input, null);
  }

  /**
   * Issue a short-lived user session token for a principal and device.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: backendKey (scopes sessionIssue).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public IssueSessionReply issueSession(IssueSessionRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.COMMUNICATION_ISSUE_SESSION, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Renew a user session before it expires.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: backendKey (scopes sessionIssue).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public RenewSessionReply renewSession(RenewSessionRequestInput input) {
    return this.renewSession(input, null);
  }

  /**
   * Renew a user session before it expires.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: backendKey (scopes sessionIssue).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public RenewSessionReply renewSession(RenewSessionRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.COMMUNICATION_RENEW_SESSION, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Revoke a user session.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: userSession (condition ownSession), backendKey (scopes sessionManage).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public RevokeSessionReply revokeSession(RevokeSessionRequestInput input) {
    return this.revokeSession(input, null);
  }

  /**
   * Revoke a user session.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: userSession (condition ownSession), backendKey (scopes sessionManage).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public RevokeSessionReply revokeSession(RevokeSessionRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.COMMUNICATION_REVOKE_SESSION, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Create a conversation with its initial members.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: backendKey (scopes conversationManage).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public CreateConversationReply createConversation(CreateConversationRequestInput input) {
    return this.createConversation(input, null);
  }

  /**
   * Create a conversation with its initial members.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: backendKey (scopes conversationManage).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public CreateConversationReply createConversation(CreateConversationRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.COMMUNICATION_CREATE_CONVERSATION, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Update the title or properties of a conversation.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: userSession (condition moderator), backendKey (scopes conversationManage).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public UpdateConversationReply updateConversation(UpdateConversationRequestInput input) {
    return this.updateConversation(input, null);
  }

  /**
   * Update the title or properties of a conversation.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: userSession (condition moderator), backendKey (scopes conversationManage).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public UpdateConversationReply updateConversation(UpdateConversationRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.COMMUNICATION_UPDATE_CONVERSATION, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Add a member, or change the role of an active member.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: backendKey (scopes membershipManage).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public AddMemberReply addMember(AddMemberRequestInput input) {
    return this.addMember(input, null);
  }

  /**
   * Add a member, or change the role of an active member.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: backendKey (scopes membershipManage).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public AddMemberReply addMember(AddMemberRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.COMMUNICATION_ADD_MEMBER, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Add several members in one request.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: backendKey (scopes membershipManage).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public AddMembersPayload addMembers(AddMembersInput input) {
    return this.addMembers(input, null);
  }

  /**
   * Add several members in one request.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: backendKey (scopes membershipManage).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public AddMembersPayload addMembers(AddMembersInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.COMMUNICATION_ADD_MEMBERS, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Remove a member from a conversation.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: backendKey (scopes membershipManage).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public RemoveMemberReply removeMember(RemoveMemberRequestInput input) {
    return this.removeMember(input, null);
  }

  /**
   * Remove a member from a conversation.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: backendKey (scopes membershipManage).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public RemoveMemberReply removeMember(RemoveMemberRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.COMMUNICATION_REMOVE_MEMBER, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Expand the history a member can see to an earlier sequence.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: backendKey (scopes historyManage).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public HistoryGrantReply historyGrant(HistoryGrantRequestInput input) {
    return this.historyGrant(input, null);
  }

  /**
   * Expand the history a member can see to an earlier sequence.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: backendKey (scopes historyManage).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public HistoryGrantReply historyGrant(HistoryGrantRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.COMMUNICATION_HISTORY_GRANT, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Send a message. A backend key sends as its service principal, or as the member named by actAsPrincipalId.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: userSession (condition member), backendKey (scopes messageWrite).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public SendMessageReply sendMessage(SendMessageRequestInput input) {
    return this.sendMessage(input, null);
  }

  /**
   * Send a message. A backend key sends as its service principal, or as the member named by actAsPrincipalId.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: userSession (condition member), backendKey (scopes messageWrite).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public SendMessageReply sendMessage(SendMessageRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.COMMUNICATION_SEND_MESSAGE, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Edit a message.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: userSession (condition authorOrModerator), backendKey (scopes moderation).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public EditMessageReply editMessage(EditMessageRequestInput input) {
    return this.editMessage(input, null);
  }

  /**
   * Edit a message.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: userSession (condition authorOrModerator), backendKey (scopes moderation).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public EditMessageReply editMessage(EditMessageRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.COMMUNICATION_EDIT_MESSAGE, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Delete a message.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: userSession (condition authorOrModerator), backendKey (scopes moderation).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public DeleteMessageReply deleteMessage(DeleteMessageRequestInput input) {
    return this.deleteMessage(input, null);
  }

  /**
   * Delete a message.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: userSession (condition authorOrModerator), backendKey (scopes moderation).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public DeleteMessageReply deleteMessage(DeleteMessageRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.COMMUNICATION_DELETE_MESSAGE, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Allow or deny a member to publish media in live sessions.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: backendKey (scopes membershipManage).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public SetBroadcastPermissionPayload setBroadcastPermission(SetBroadcastPermissionInput input) {
    return this.setBroadcastPermission(input, null);
  }

  /**
   * Allow or deny a member to publish media in live sessions.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: backendKey (scopes membershipManage).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public SetBroadcastPermissionPayload setBroadcastPermission(SetBroadcastPermissionInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.COMMUNICATION_SET_BROADCAST_PERMISSION, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Mute or unmute message push notifications for a member of a conversation, optionally until a time. Calls still ring. A backend key must name the member with actAsPrincipalId.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: userSession (condition member), backendKey (scopes membershipManage).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public SetConversationMutePayload setConversationMute(SetConversationMuteInput input) {
    return this.setConversationMute(input, null);
  }

  /**
   * Mute or unmute message push notifications for a member of a conversation, optionally until a time. Calls still ring. A backend key must name the member with actAsPrincipalId.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: userSession (condition member), backendKey (scopes membershipManage).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public SetConversationMutePayload setConversationMute(SetConversationMuteInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.COMMUNICATION_SET_CONVERSATION_MUTE, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Alert (ring) conversation members about a live session.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: userSession (condition creatorOrModerator), backendKey (scopes callManage).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public AlertLiveSessionPayload alertLiveSession(AlertLiveSessionInput input) {
    return this.alertLiveSession(input, null);
  }

  /**
   * Alert (ring) conversation members about a live session.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: userSession (condition creatorOrModerator), backendKey (scopes callManage).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public AlertLiveSessionPayload alertLiveSession(AlertLiveSessionInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.COMMUNICATION_ALERT_LIVE_SESSION, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * End a live session for every participant. Completes asynchronously.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: userSession (condition creatorOrModerator), backendKey (scopes callManage).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public EndLiveSessionPayload endLiveSession(EndLiveSessionInput input) {
    return this.endLiveSession(input, null);
  }

  /**
   * End a live session for every participant. Completes asynchronously.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: userSession (condition creatorOrModerator), backendKey (scopes callManage).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public EndLiveSessionPayload endLiveSession(EndLiveSessionInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.COMMUNICATION_END_LIVE_SESSION, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Redeem a delivered credential with its delivery permit.
   *
   * <p>Idempotency: <code>permitBound</code>. Authorized by a single-delivery permit. Retry with the same requestId and permit; outcomes cannot be resolved by lookup.
   *
   * <p>Authorization: deliveryPermit.
   *
   * @param input the operation input
   * @param credentialDeliveryPermit the <code>credentialDeliveryPermit</code> credential, passed unchanged in the request context
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public RedeemCredentialReply redeemCredential(RedeemCredentialRequestInput input, Map<String, @Nullable Object> credentialDeliveryPermit) {
    return this.redeemCredential(input, credentialDeliveryPermit, null);
  }

  /**
   * Redeem a delivered credential with its delivery permit.
   *
   * <p>Idempotency: <code>permitBound</code>. Authorized by a single-delivery permit. Retry with the same requestId and permit; outcomes cannot be resolved by lookup.
   *
   * <p>Authorization: deliveryPermit.
   *
   * @param input the operation input
   * @param credentialDeliveryPermit the <code>credentialDeliveryPermit</code> credential, passed unchanged in the request context
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public RedeemCredentialReply redeemCredential(RedeemCredentialRequestInput input, Map<String, @Nullable Object> credentialDeliveryPermit, @Nullable String requestId) {
    return this.executor.execute(Operations.COMMUNICATION_REDEEM_CREDENTIAL, Wire.nonNull(input, "input").toJson(), requestId, Wire.nonNull(credentialDeliveryPermit, "credentialDeliveryPermit"));
  }

  /**
   * Acknowledge that a redeemed credential is stored, closing the delivery.
   *
   * <p>Idempotency: <code>permitBound</code>. Authorized by a single-delivery permit. Retry with the same requestId and permit; outcomes cannot be resolved by lookup.
   *
   * <p>Authorization: deliveryPermit.
   *
   * @param input the operation input
   * @param credentialDeliveryPermit the <code>credentialDeliveryPermit</code> credential, passed unchanged in the request context
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public AcknowledgeCredentialReply acknowledgeCredential(AcknowledgeCredentialRequestInput input, Map<String, @Nullable Object> credentialDeliveryPermit) {
    return this.acknowledgeCredential(input, credentialDeliveryPermit, null);
  }

  /**
   * Acknowledge that a redeemed credential is stored, closing the delivery.
   *
   * <p>Idempotency: <code>permitBound</code>. Authorized by a single-delivery permit. Retry with the same requestId and permit; outcomes cannot be resolved by lookup.
   *
   * <p>Authorization: deliveryPermit.
   *
   * @param input the operation input
   * @param credentialDeliveryPermit the <code>credentialDeliveryPermit</code> credential, passed unchanged in the request context
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public AcknowledgeCredentialReply acknowledgeCredential(AcknowledgeCredentialRequestInput input, Map<String, @Nullable Object> credentialDeliveryPermit, @Nullable String requestId) {
    return this.executor.execute(Operations.COMMUNICATION_ACKNOWLEDGE_CREDENTIAL, Wire.nonNull(input, "input").toJson(), requestId, Wire.nonNull(credentialDeliveryPermit, "credentialDeliveryPermit"));
  }
}
