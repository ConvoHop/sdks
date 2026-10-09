// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
// dart format off
// ignore_for_file: type=lint, deprecated_member_use_from_same_package
part of 'generated.dart';

/// The `communication` operations a user session can run.
abstract class CommunicationOperations {
  const CommunicationOperations();

  /// Runs [operation] with its JSON [input] and returns the decoded result.
  /// Mutations retry with [requestId], or a new one when it's null.
  Future<T> execute<T>(OperationSpec<T> operation, Map<String, Object?> input, {String? requestId});

  /// Describe the features, limits and API model the authority supports.
  Future<CapabilitiesReply> capabilities({String? requestId}) =>
      execute(Operations.communicationCapabilities, const <String, Object?>{}, requestId: requestId);

  /// Return the signed route: project incarnation, serving epoch and realtime endpoint. Call it before other communication operations and again after WRONG_REGION.
  Future<RouteReply> route({String? requestId}) =>
      execute(Operations.communicationRoute, const <String, Object?>{}, requestId: requestId);

  /// Return the calling user session.
  Future<CurrentSessionReply> currentSession({String? requestId}) =>
      execute(Operations.communicationCurrentSession, const <String, Object?>{}, requestId: requestId);

  /// Read a conversation.
  Future<GetConversationReply> getConversation(GetConversationRequestInput input, {String? requestId}) =>
      execute(Operations.communicationGetConversation, input.toJson(), requestId: requestId);

  /// List the members of a conversation.
  Future<MembersReply> members(MembersRequestInput input, {String? requestId}) =>
      execute(Operations.communicationMembers, input.toJson(), requestId: requestId);

  /// List the messages of a conversation, newest first. A backend key reads the full history, or the history visible to the member named by actAsPrincipalId.
  Future<MessagesReply> messages(MessagesRequestInput input, {String? requestId}) =>
      execute(Operations.communicationMessages, input.toJson(), requestId: requestId);

  /// Read one message. A backend key reads any message, or reads as the member named by actAsPrincipalId.
  Future<GetMessageReply> getMessage(GetMessageRequestInput input, {String? requestId}) =>
      execute(Operations.communicationGetMessage, input.toJson(), requestId: requestId);

  /// Replay committed conversation events after a cursor, in sequence order.
  Future<EventsReply> events(EventsRequestInput input, {String? requestId}) =>
      execute(Operations.communicationEvents, input.toJson(), requestId: requestId);

  /// List the delivery and read receipts of a conversation.
  Future<ReceiptsReply> receipts(ReceiptsRequestInput input, {String? requestId}) =>
      execute(Operations.communicationReceipts, input.toJson(), requestId: requestId);

  /// List the conversations visible to the calling user. A backend key must name that user with actAsPrincipalId.
  Future<InboxReply> inbox(InboxRequestInput input, {String? requestId}) =>
      execute(Operations.communicationInbox, input.toJson(), requestId: requestId);

  /// Search the messages visible to the calling user. A backend key searches as the member named by actAsPrincipalId, or within scope.conversationIds.
  Future<SearchReply> search(SearchRequestInput input, {String? requestId}) =>
      execute(Operations.communicationSearch, input.toJson(), requestId: requestId);

  /// Look up the stored outcome of an earlier communication mutation by its requestId.
  Future<ResolveRequestReply> resolveRequest(ResolveRequestRequestInput input, {String? requestId}) =>
      execute(Operations.communicationResolveRequest, input.toJson(), requestId: requestId);

  /// Read the state of a long-running communication operation.
  Future<GetOperationReply> getOperation(GetOperationRequestInput input, {String? requestId}) =>
      execute(Operations.communicationGetOperation, input.toJson(), requestId: requestId);

  /// Read whether a member has muted message push notifications for a conversation. A backend key must name the member with actAsPrincipalId.
  Future<ConversationMuteReply> conversationMute(ConversationMuteInput input, {String? requestId}) =>
      execute(Operations.communicationConversationMute, input.toJson(), requestId: requestId);

  /// Return the active live session of a conversation, if any.
  Future<CurrentLiveSessionReply> currentLiveSession(ConversationLiveInput input, {String? requestId}) =>
      execute(Operations.communicationCurrentLiveSession, input.toJson(), requestId: requestId);

  /// Read a live session.
  Future<LiveSessionReply> liveSession(LiveSessionInput input, {String? requestId}) =>
      execute(Operations.communicationLiveSession, input.toJson(), requestId: requestId);

  /// List the live sessions of a conversation.
  Future<LiveSessionPageReply> liveSessions(LiveSessionsInput input, {String? requestId}) =>
      execute(Operations.communicationLiveSessions, input.toJson(), requestId: requestId);

  /// List the participants of a live session.
  Future<LiveParticipantPageReply> liveSessionParticipants(LiveParticipantsInput input, {String? requestId}) =>
      execute(Operations.communicationLiveSessionParticipants, input.toJson(), requestId: requestId);

  /// List the live session alerts addressed to the calling user.
  Future<LiveAlertPageReply> liveSessionAlerts(LiveAlertsInput input, {String? requestId}) =>
      execute(Operations.communicationLiveSessionAlerts, input.toJson(), requestId: requestId);

  /// Read the state of a live session start or end operation.
  Future<LiveSessionOperationReply> liveSessionOperation(LiveSessionOperationInput input, {String? requestId}) =>
      execute(Operations.communicationLiveSessionOperation, input.toJson(), requestId: requestId);

  /// Revoke a user session.
  Future<RevokeSessionReply> revokeSession(RevokeSessionRequestInput input, {String? requestId}) =>
      execute(Operations.communicationRevokeSession, input.toJson(), requestId: requestId);

  /// Update the title or properties of a conversation.
  Future<UpdateConversationReply> updateConversation(UpdateConversationRequestInput input, {String? requestId}) =>
      execute(Operations.communicationUpdateConversation, input.toJson(), requestId: requestId);

  /// Send a message. A backend key sends as its service principal, or as the member named by actAsPrincipalId.
  Future<SendMessageReply> sendMessage(SendMessageRequestInput input, {String? requestId}) =>
      execute(Operations.communicationSendMessage, input.toJson(), requestId: requestId);

  /// Edit a message.
  Future<EditMessageReply> editMessage(EditMessageRequestInput input, {String? requestId}) =>
      execute(Operations.communicationEditMessage, input.toJson(), requestId: requestId);

  /// Delete a message.
  Future<DeleteMessageReply> deleteMessage(DeleteMessageRequestInput input, {String? requestId}) =>
      execute(Operations.communicationDeleteMessage, input.toJson(), requestId: requestId);

  /// Report delivery or read progress through a sequence.
  Future<ReportReceiptReply> reportReceipt(ReportReceiptRequestInput input, {String? requestId}) =>
      execute(Operations.communicationReportReceipt, input.toJson(), requestId: requestId);

  /// Send an ephemeral typing signal.
  Future<TypingReply> typing(TypingRequestInput input, {String? requestId}) =>
      execute(Operations.communicationTyping, input.toJson(), requestId: requestId);

  /// Mute or unmute message push notifications for a member of a conversation, optionally until a time. Calls still ring. A backend key must name the member with actAsPrincipalId.
  Future<SetConversationMutePayload> setConversationMute(SetConversationMuteInput input, {String? requestId}) =>
      execute(Operations.communicationSetConversationMute, input.toJson(), requestId: requestId);

  /// Start a live session (a call) in a conversation. Readiness completes asynchronously.
  Future<StartLiveSessionPayload> startLiveSession(StartLiveSessionInput input, {String? requestId}) =>
      execute(Operations.communicationStartLiveSession, input.toJson(), requestId: requestId);

  /// Join a live session.
  Future<JoinLiveSessionPayload> joinLiveSession(JoinLiveSessionInput input, {String? requestId}) =>
      execute(Operations.communicationJoinLiveSession, input.toJson(), requestId: requestId);

  /// Alert (ring) conversation members about a live session.
  Future<AlertLiveSessionPayload> alertLiveSession(AlertLiveSessionInput input, {String? requestId}) =>
      execute(Operations.communicationAlertLiveSession, input.toJson(), requestId: requestId);

  /// Leave a live session.
  Future<LeaveLiveSessionPayload> leaveLiveSession(LeaveLiveSessionInput input, {String? requestId}) =>
      execute(Operations.communicationLeaveLiveSession, input.toJson(), requestId: requestId);

  /// End a live session for every participant. Completes asynchronously.
  Future<EndLiveSessionPayload> endLiveSession(EndLiveSessionInput input, {String? requestId}) =>
      execute(Operations.communicationEndLiveSession, input.toJson(), requestId: requestId);

  /// Obtain a media credential for one connection of the caller's participation.
  Future<LiveSessionCredentialsPayload> liveSessionCredentials(LiveSessionCredentialsInput input, {String? requestId}) =>
      execute(Operations.communicationLiveSessionCredentials, input.toJson(), requestId: requestId);
}
