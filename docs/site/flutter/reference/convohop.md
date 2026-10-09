# `package:convohop/convohop.dart`

Client SDK for Flutter apps on end-user devices: one signed-in user's conversations, realtime events, conversation store, offline outbox, read receipts, typing, recent activity and call control.

**Layer:** Client. **Runtime:** Flutter 3.38 or later (Dart 3.10 or later) on Android 7.0 (API level 24) or later and iOS 13 or later. **Source:** `flutter`.

## Classes

### `ActorRef` class

```dart
final class ActorRef {
  const ActorRef({required String tenantId, required String objectId});
  factory ActorRef.fromJson(Object? json);
  final String tenantId;
  final String objectId;
  Map<String, Object?> toJson();
}
```

### `AggregateFailure` class

```dart
final class AggregateFailure implements Exception
```

More than one failure, for example a failed refresh and a replay that
couldn't resume.

#### `AggregateFailure` constructor

```dart
AggregateFailure(List<Object> errors, String message)
```

#### `AggregateFailure.errors` property

```dart
final List<Object> errors
```

#### `AggregateFailure.message` property

```dart
final String message
```

#### `AggregateFailure.toString` method

```dart
String toString()
```

### `AlertLiveSessionInput` class

```dart
final class AlertLiveSessionInput {
  const AlertLiveSessionInput({
    required String liveSessionId,
    required String expectedGeneration,
    required List<String> principalIds,
  });
  final String liveSessionId;
  final String expectedGeneration;
  final List<String> principalIds;
  Map<String, Object?> toJson();
}
```

### `AlertLiveSessionPayload` class

```dart
final class AlertLiveSessionPayload {
  const AlertLiveSessionPayload({
    required String status,
    required String requestId,
    required String receiptId,
    required String committedAt,
    required bool replayed,
    required LiveAlertBatch result,
  });
  factory AlertLiveSessionPayload.fromJson(Object? json);
  final String status;
  final String requestId;
  final String receiptId;
  final String committedAt;
  final bool replayed;
  final LiveAlertBatch result;
  Map<String, Object?> toJson();
}
```

### `BillingCheckoutSession` class

```dart
final class BillingCheckoutSession {
  const BillingCheckoutSession({
    required String orgId,
    required String planId,
    required String url,
    required String expiresAt,
  });
  factory BillingCheckoutSession.fromJson(Object? json);
  final String orgId;
  final String planId;
  final String url;
  final String expiresAt;
  Map<String, Object?> toJson();
}
```

### `BillingPortalSession` class

```dart
final class BillingPortalSession {
  const BillingPortalSession({
    required String orgId,
    required String url,
    String? expiresAt,
  });
  factory BillingPortalSession.fromJson(Object? json);
  final String orgId;
  final String url;
  final String? expiresAt;
  Map<String, Object?> toJson();
}
```

### `BroadcastPermissionChanged` class

```dart
final class BroadcastPermissionChanged {
  const BroadcastPermissionChanged({
    required Member member,
    LiveMediaCutoff? mediaCutoff,
  });
  factory BroadcastPermissionChanged.fromJson(Object? json);
  final Member member;
  final LiveMediaCutoff? mediaCutoff;
  Map<String, Object?> toJson();
}
```

### `CallCancelledNotification` class

```dart
final class CallCancelledNotification extends RingNotification
```

A ring that stopped for the user.

#### `CallCancelledNotification.reason` property

```dart
final String reason
```

`answered`, `declined`, `ended`, `expired` or a reason this SDK doesn't
know yet, which only stops the ringing.

#### `CallCancelledNotification.eventType` property

```dart
String get eventType
```

`notification.message`, `notification.call` or
`notification.callCancelled`.

#### `CallCancelledNotification.missedCall` property

```dart
bool get missedCall
```

Whether to tell the user they missed the call: the call ended or nobody
answered. Answered and declined rings (on any device) only stop ringing.

#### `CallCancelledNotification.toJson` method

```dart
Map<String, Object?> toJson()
```

The `convohop` object, for handing the notification to native code.

#### `CallCancelledNotification.liveSessionId` property

```dart
final String liveSessionId
```

Inherited from `RingNotification`.

#### `CallCancelledNotification.alertId` property

```dart
final String alertId
```

One ring for one recipient. A later ring of the same call has a new one.

Inherited from `RingNotification`.

#### `CallCancelledNotification.expiresAt` property

```dart
final String expiresAt
```

When the ring stops if nobody answers.

Inherited from `RingNotification`.

#### `CallCancelledNotification.mediaProfile` property

```dart
final String mediaProfile
```

`AUDIO_ONLY`, `AUDIO_VIDEO` or a profile this SDK doesn't know yet.

Inherited from `RingNotification`.

#### `CallCancelledNotification.expiresAtMillis` property

```dart
int get expiresAtMillis
```

`expiresAt` in milliseconds since the epoch, ignoring any fraction.

Inherited from `RingNotification`.

#### `CallCancelledNotification.hasVideo` property

```dart
bool get hasVideo
```

Inherited from `RingNotification`.

#### `CallCancelledNotification.eventId` property

```dart
final String eventId
```

Deduplicate on this: delivery is at least once.

Inherited from `ConvoHopNotification`.

#### `CallCancelledNotification.occurredAt` property

```dart
final String occurredAt
```

Inherited from `ConvoHopNotification`.

#### `CallCancelledNotification.projectId` property

```dart
final String projectId
```

Inherited from `ConvoHopNotification`.

#### `CallCancelledNotification.recipientId` property

```dart
final String recipientId
```

The principal the notification is for.

Inherited from `ConvoHopNotification`.

#### `CallCancelledNotification.conversationId` property

```dart
final String conversationId
```

Inherited from `ConvoHopNotification`.

#### `CallCancelledNotification.senderId` property

```dart
final String senderId
```

Who sent the message or started the ringing.

Inherited from `ConvoHopNotification`.

#### `CallCancelledNotification.title` property

```dart
final String? title
```

Visible title, when the push had one.

Inherited from `ConvoHopNotification`.

#### `CallCancelledNotification.body` property

```dart
final String? body
```

Visible body, when the push had one. With previews off, a message
notification has none.

Inherited from `ConvoHopNotification`.

#### `CallCancelledNotification.isFor` method

```dart
bool isFor(ConvoHopClient client)
```

Whether this notification is for `client`'s user and project.

Inherited from `ConvoHopNotification`.

### `CallNotification` class

```dart
final class CallNotification extends RingNotification
```

An incoming call: a ring for the user.

#### `CallNotification.eventType` property

```dart
String get eventType
```

`notification.message`, `notification.call` or
`notification.callCancelled`.

#### `CallNotification.toJson` method

```dart
Map<String, Object?> toJson()
```

The `convohop` object, for handing the notification to native code.

#### `CallNotification.liveSessionId` property

```dart
final String liveSessionId
```

Inherited from `RingNotification`.

#### `CallNotification.alertId` property

```dart
final String alertId
```

One ring for one recipient. A later ring of the same call has a new one.

Inherited from `RingNotification`.

#### `CallNotification.expiresAt` property

```dart
final String expiresAt
```

When the ring stops if nobody answers.

Inherited from `RingNotification`.

#### `CallNotification.mediaProfile` property

```dart
final String mediaProfile
```

`AUDIO_ONLY`, `AUDIO_VIDEO` or a profile this SDK doesn't know yet.

Inherited from `RingNotification`.

#### `CallNotification.expiresAtMillis` property

```dart
int get expiresAtMillis
```

`expiresAt` in milliseconds since the epoch, ignoring any fraction.

Inherited from `RingNotification`.

#### `CallNotification.hasVideo` property

```dart
bool get hasVideo
```

Inherited from `RingNotification`.

#### `CallNotification.eventId` property

```dart
final String eventId
```

Deduplicate on this: delivery is at least once.

Inherited from `ConvoHopNotification`.

#### `CallNotification.occurredAt` property

```dart
final String occurredAt
```

Inherited from `ConvoHopNotification`.

#### `CallNotification.projectId` property

```dart
final String projectId
```

Inherited from `ConvoHopNotification`.

#### `CallNotification.recipientId` property

```dart
final String recipientId
```

The principal the notification is for.

Inherited from `ConvoHopNotification`.

#### `CallNotification.conversationId` property

```dart
final String conversationId
```

Inherited from `ConvoHopNotification`.

#### `CallNotification.senderId` property

```dart
final String senderId
```

Who sent the message or started the ringing.

Inherited from `ConvoHopNotification`.

#### `CallNotification.title` property

```dart
final String? title
```

Visible title, when the push had one.

Inherited from `ConvoHopNotification`.

#### `CallNotification.body` property

```dart
final String? body
```

Visible body, when the push had one. With previews off, a message
notification has none.

Inherited from `ConvoHopNotification`.

#### `CallNotification.isFor` method

```dart
bool isFor(ConvoHopClient client)
```

Whether this notification is for `client`'s user and project.

Inherited from `ConvoHopNotification`.

### `Capabilities` class

```dart
final class Capabilities {
  const Capabilities({
    required String serverRelease,
    required String capabilityRevision,
    required String limitsRevision,
    Features? features,
    required List<LimitEntry> limits,
    required String environment,
    required bool productionQualified,
    MediaPolicy? mediaPolicy,
    String? geoControlAuthorityId,
    required List<String> offerings,
    required List<String> geos,
    required List<String> installationProfiles,
    String? portalIdentity,
  });
  factory Capabilities.fromJson(Object? json);
  final String serverRelease;
  final String capabilityRevision;
  final String limitsRevision;
  final Features? features;
  final List<LimitEntry> limits;
  final String environment;
  final bool productionQualified;
  final MediaPolicy? mediaPolicy;
  final String? geoControlAuthorityId;
  final List<String> offerings;
  final List<String> geos;
  final List<String> installationProfiles;
  final String? portalIdentity;
  Map<String, Object?> toJson();
}
```

### `CapabilitiesReply` class

```dart
final class CapabilitiesReply {
  const CapabilitiesReply({
    required String status,
    required String requestId,
    String? serverTime,
    String? receiptId,
    String? committedAt,
    bool? replayed,
    OperationRef? operation,
    ResourceRef? resourceRef,
    Capabilities? result,
  });
  factory CapabilitiesReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String? serverTime;
  final String? receiptId;
  final String? committedAt;
  final bool? replayed;
  final OperationRef? operation;
  final ResourceRef? resourceRef;
  final Capabilities? result;
  Map<String, Object?> toJson();
}
```

### `ClientRequests` class

```dart
final class ClientRequests
```

Resolve or retry earlier mutations by their original request ID.

#### `ClientRequests.resolve` method

```dart
Future<RequestResolution> resolve(String requestId)
```

What the authority knows about `requestId` now.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

#### `ClientRequests.retry` method

```dart
Future<RequestResolution> retry(String requestId)
```

Resolves `requestId` and resends the same request only when the
authority hasn't observed it and its retry budget remains.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

### `CommunicationOperations` class

```dart
abstract class CommunicationOperations
```

The `communication` operations a user session can run.

#### `CommunicationOperations` constructor

```dart
const CommunicationOperations()
```

#### `CommunicationOperations.execute` method

```dart
Future<T> execute<T>(
  OperationSpec<T> operation,
  Map<String, Object?> input, {
  String? requestId,
})
```

Runs `operation` with its JSON `input` and returns the decoded result.
Mutations retry with `requestId`, or a new one when it's null.

#### `CommunicationOperations.capabilities` method

```dart
Future<CapabilitiesReply> capabilities({String? requestId})
```

Describe the features, limits and API model the authority supports.

Sends [`communication.capabilities`](../../operations/communication/capabilities.md).

#### `CommunicationOperations.route` method

```dart
Future<RouteReply> route({String? requestId})
```

Return the signed route: project incarnation, serving epoch and realtime endpoint. Call it before other communication operations and again after WRONG_REGION.

Sends [`communication.route`](../../operations/communication/route.md).

#### `CommunicationOperations.currentSession` method

```dart
Future<CurrentSessionReply> currentSession({String? requestId})
```

Return the calling user session.

Sends [`communication.currentSession`](../../operations/communication/currentSession.md).

#### `CommunicationOperations.getConversation` method

```dart
Future<GetConversationReply> getConversation(
  GetConversationRequestInput input, {
  String? requestId,
})
```

Read a conversation.

Sends [`communication.getConversation`](../../operations/communication/getConversation.md).

#### `CommunicationOperations.members` method

```dart
Future<MembersReply> members(MembersRequestInput input, {String? requestId})
```

List the members of a conversation.

Sends [`communication.members`](../../operations/communication/members.md).

#### `CommunicationOperations.messages` method

```dart
Future<MessagesReply> messages(MessagesRequestInput input, {String? requestId})
```

List the messages of a conversation, newest first. A backend key reads the full history, or the history visible to the member named by actAsPrincipalId.

Sends [`communication.messages`](../../operations/communication/messages.md).

#### `CommunicationOperations.getMessage` method

```dart
Future<GetMessageReply> getMessage(
  GetMessageRequestInput input, {
  String? requestId,
})
```

Read one message. A backend key reads any message, or reads as the member named by actAsPrincipalId.

Sends [`communication.getMessage`](../../operations/communication/getMessage.md).

#### `CommunicationOperations.events` method

```dart
Future<EventsReply> events(EventsRequestInput input, {String? requestId})
```

Replay committed conversation events after a cursor, in sequence order.

Sends [`communication.events`](../../operations/communication/events.md).

#### `CommunicationOperations.receipts` method

```dart
Future<ReceiptsReply> receipts(ReceiptsRequestInput input, {String? requestId})
```

List the delivery and read receipts of a conversation.

Sends [`communication.receipts`](../../operations/communication/receipts.md).

#### `CommunicationOperations.inbox` method

```dart
Future<InboxReply> inbox(InboxRequestInput input, {String? requestId})
```

List the conversations visible to the calling user. A backend key must name that user with actAsPrincipalId.

Sends [`communication.inbox`](../../operations/communication/inbox.md).

#### `CommunicationOperations.search` method

```dart
Future<SearchReply> search(SearchRequestInput input, {String? requestId})
```

Search the messages visible to the calling user. A backend key searches as the member named by actAsPrincipalId, or within scope.conversationIds.

Sends [`communication.search`](../../operations/communication/search.md).

#### `CommunicationOperations.resolveRequest` method

```dart
Future<ResolveRequestReply> resolveRequest(
  ResolveRequestRequestInput input, {
  String? requestId,
})
```

Look up the stored outcome of an earlier communication mutation by its requestId.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

#### `CommunicationOperations.getOperation` method

```dart
Future<GetOperationReply> getOperation(
  GetOperationRequestInput input, {
  String? requestId,
})
```

Read the state of a long-running communication operation.

Sends [`communication.getOperation`](../../operations/communication/getOperation.md).

#### `CommunicationOperations.conversationMute` method

```dart
Future<ConversationMuteReply> conversationMute(
  ConversationMuteInput input, {
  String? requestId,
})
```

Read whether a member has muted message push notifications for a conversation. A backend key must name the member with actAsPrincipalId.

Sends [`communication.conversationMute`](../../operations/communication/conversationMute.md).

#### `CommunicationOperations.currentLiveSession` method

```dart
Future<CurrentLiveSessionReply> currentLiveSession(
  ConversationLiveInput input, {
  String? requestId,
})
```

Return the active live session of a conversation, if any.

Sends [`communication.currentLiveSession`](../../operations/communication/currentLiveSession.md).

#### `CommunicationOperations.liveSession` method

```dart
Future<LiveSessionReply> liveSession(
  LiveSessionInput input, {
  String? requestId,
})
```

Read a live session.

Sends [`communication.liveSession`](../../operations/communication/liveSession.md).

#### `CommunicationOperations.liveSessions` method

```dart
Future<LiveSessionPageReply> liveSessions(
  LiveSessionsInput input, {
  String? requestId,
})
```

List the live sessions of a conversation.

Sends [`communication.liveSessions`](../../operations/communication/liveSessions.md).

#### `CommunicationOperations.liveSessionParticipants` method

```dart
Future<LiveParticipantPageReply> liveSessionParticipants(
  LiveParticipantsInput input, {
  String? requestId,
})
```

List the participants of a live session.

Sends [`communication.liveSessionParticipants`](../../operations/communication/liveSessionParticipants.md).

#### `CommunicationOperations.liveSessionAlerts` method

```dart
Future<LiveAlertPageReply> liveSessionAlerts(
  LiveAlertsInput input, {
  String? requestId,
})
```

List the live session alerts addressed to the calling user.

Sends [`communication.liveSessionAlerts`](../../operations/communication/liveSessionAlerts.md).

#### `CommunicationOperations.liveSessionOperation` method

```dart
Future<LiveSessionOperationReply> liveSessionOperation(
  LiveSessionOperationInput input, {
  String? requestId,
})
```

Read the state of a live session start or end operation.

Sends [`communication.liveSessionOperation`](../../operations/communication/liveSessionOperation.md).

#### `CommunicationOperations.revokeSession` method

```dart
Future<RevokeSessionReply> revokeSession(
  RevokeSessionRequestInput input, {
  String? requestId,
})
```

Revoke a user session.

Sends [`communication.revokeSession`](../../operations/communication/revokeSession.md).

#### `CommunicationOperations.updateConversation` method

```dart
Future<UpdateConversationReply> updateConversation(
  UpdateConversationRequestInput input, {
  String? requestId,
})
```

Update the title or properties of a conversation.

Sends [`communication.updateConversation`](../../operations/communication/updateConversation.md).

#### `CommunicationOperations.sendMessage` method

```dart
Future<SendMessageReply> sendMessage(
  SendMessageRequestInput input, {
  String? requestId,
})
```

Send a message. A backend key sends as its service principal, or as the member named by actAsPrincipalId.

Sends [`communication.sendMessage`](../../operations/communication/sendMessage.md).

#### `CommunicationOperations.editMessage` method

```dart
Future<EditMessageReply> editMessage(
  EditMessageRequestInput input, {
  String? requestId,
})
```

Edit a message.

Sends [`communication.editMessage`](../../operations/communication/editMessage.md).

#### `CommunicationOperations.deleteMessage` method

```dart
Future<DeleteMessageReply> deleteMessage(
  DeleteMessageRequestInput input, {
  String? requestId,
})
```

Delete a message.

Sends [`communication.deleteMessage`](../../operations/communication/deleteMessage.md).

#### `CommunicationOperations.reportReceipt` method

```dart
Future<ReportReceiptReply> reportReceipt(
  ReportReceiptRequestInput input, {
  String? requestId,
})
```

Report delivery or read progress through a sequence.

Sends [`communication.reportReceipt`](../../operations/communication/reportReceipt.md).

#### `CommunicationOperations.typing` method

```dart
Future<TypingReply> typing(TypingRequestInput input, {String? requestId})
```

Send an ephemeral typing signal.

Sends [`communication.typing`](../../operations/communication/typing.md).

#### `CommunicationOperations.setConversationMute` method

```dart
Future<SetConversationMutePayload> setConversationMute(
  SetConversationMuteInput input, {
  String? requestId,
})
```

Mute or unmute message push notifications for a member of a conversation, optionally until a time. Calls still ring. A backend key must name the member with actAsPrincipalId.

Sends [`communication.setConversationMute`](../../operations/communication/setConversationMute.md).

#### `CommunicationOperations.startLiveSession` method

```dart
Future<StartLiveSessionPayload> startLiveSession(
  StartLiveSessionInput input, {
  String? requestId,
})
```

Start a live session (a call) in a conversation. Readiness completes asynchronously.

Sends [`communication.startLiveSession`](../../operations/communication/startLiveSession.md).

#### `CommunicationOperations.joinLiveSession` method

```dart
Future<JoinLiveSessionPayload> joinLiveSession(
  JoinLiveSessionInput input, {
  String? requestId,
})
```

Join a live session.

Sends [`communication.joinLiveSession`](../../operations/communication/joinLiveSession.md).

#### `CommunicationOperations.alertLiveSession` method

```dart
Future<AlertLiveSessionPayload> alertLiveSession(
  AlertLiveSessionInput input, {
  String? requestId,
})
```

Alert (ring) conversation members about a live session.

Sends [`communication.alertLiveSession`](../../operations/communication/alertLiveSession.md).

#### `CommunicationOperations.leaveLiveSession` method

```dart
Future<LeaveLiveSessionPayload> leaveLiveSession(
  LeaveLiveSessionInput input, {
  String? requestId,
})
```

Leave a live session.

Sends [`communication.leaveLiveSession`](../../operations/communication/leaveLiveSession.md).

#### `CommunicationOperations.endLiveSession` method

```dart
Future<EndLiveSessionPayload> endLiveSession(
  EndLiveSessionInput input, {
  String? requestId,
})
```

End a live session for every participant. Completes asynchronously.

Sends [`communication.endLiveSession`](../../operations/communication/endLiveSession.md).

#### `CommunicationOperations.liveSessionCredentials` method

```dart
Future<LiveSessionCredentialsPayload> liveSessionCredentials(
  LiveSessionCredentialsInput input, {
  String? requestId,
})
```

Obtain a media credential for one connection of the caller's participation.

Sends [`communication.liveSessionCredentials`](../../operations/communication/liveSessionCredentials.md).

### `Conversation` class

```dart
final class Conversation {
  const Conversation({
    required String conversationId,
    required String revision,
    required String title,
    Map<String, Object?>? props,
    required String latestSequence,
    Member? membership,
  });
  factory Conversation.fromJson(Object? json);
  final String conversationId;
  final String revision;
  final String title;
  final Map<String, Object?>? props;
  final String latestSequence;
  final Member? membership;
  Map<String, Object?> toJson();
}
```

### `ConversationHandle` class

```dart
final class ConversationHandle
```

One conversation: its messages, this user's mute and its calls.

#### `ConversationHandle.client` property

```dart
final ConvoHopClient client
```

#### `ConversationHandle.conversationId` property

```dart
final String conversationId
```

#### `ConversationHandle.messages` property

```dart
late final ConversationMessages messages
```

#### `ConversationHandle.mute` property

```dart
late final ConversationMuteControl mute
```

This user's mute of message push notifications for the conversation.
Calls still ring a muted member.

#### `ConversationHandle.live` property

```dart
late final ConversationLive live
```

#### `ConversationHandle.get` method

```dart
Future<Conversation> get()
```

Sends [`communication.getConversation`](../../operations/communication/getConversation.md).

### `ConversationLive` class

```dart
final class ConversationLive
```

A conversation's calls.

#### `ConversationLive.conversation` property

```dart
final ConversationHandle conversation
```

#### `ConversationLive.current` method

```dart
Future<LiveSessionHandle?> current()
```

The conversation's current call, if there is one.

Sends [`communication.currentLiveSession`](../../operations/communication/currentLiveSession.md).

#### `ConversationLive.history` method

```dart
Future<LiveSessionPage> history({int? limit, String? cursor})
```

Sends [`communication.liveSessions`](../../operations/communication/liveSessions.md).

#### `ConversationLive.startVoice` method

```dart
Future<LiveStartOperation> startVoice({String? requestId})
```

Sends [`communication.startLiveSession`](../../operations/communication/startLiveSession.md).

#### `ConversationLive.startVideo` method

```dart
Future<LiveStartOperation> startVideo({String? requestId})
```

Sends [`communication.startLiveSession`](../../operations/communication/startLiveSession.md).

#### `ConversationLive.startBroadcast` method

```dart
Future<LiveStartOperation> startBroadcast({
  required LiveMediaProfile mediaProfile,
  String? requestId,
})
```

Sends [`communication.startLiveSession`](../../operations/communication/startLiveSession.md).

### `ConversationLiveInput` class

```dart
final class ConversationLiveInput {
  const ConversationLiveInput({required String conversationId});
  final String conversationId;
  Map<String, Object?> toJson();
}
```

### `ConversationMemberBatch` class

```dart
final class ConversationMemberBatch {
  const ConversationMemberBatch({required List<Member> items});
  factory ConversationMemberBatch.fromJson(Object? json);
  final List<Member> items;
  Map<String, Object?> toJson();
}
```

### `ConversationMessages` class

```dart
final class ConversationMessages
```

#### `ConversationMessages.send` method

```dart
Future<MessageAck> send(
  String text, {
  Map<String, Object?> props = const {},
  String? requestId,
})
```

Sends [`communication.sendMessage`](../../operations/communication/sendMessage.md).

#### `ConversationMessages.list` method

```dart
Future<MessagePage> list({String? beforeSequence})
```

Sends [`communication.messages`](../../operations/communication/messages.md).

#### `ConversationMessages.edit` method

```dart
Future<Message> edit(Message message, String text, {String? requestId})
```

Sends [`communication.editMessage`](../../operations/communication/editMessage.md).

#### `ConversationMessages.delete` method

```dart
Future<Message> delete(Message message, {String? requestId})
```

Sends [`communication.deleteMessage`](../../operations/communication/deleteMessage.md).

### `ConversationMute` class

```dart
final class ConversationMute {
  const ConversationMute({
    required String conversationId,
    required String principalId,
    required bool muted,
    String? until,
  });
  factory ConversationMute.fromJson(Object? json);
  final String conversationId;
  final String principalId;
  final bool muted;
  final String? until;
  Map<String, Object?> toJson();
}
```

### `ConversationMuteControl` class

```dart
final class ConversationMuteControl
```

#### `ConversationMuteControl.get` method

```dart
Future<ConversationMute> get()
```

Sends [`communication.conversationMute`](../../operations/communication/conversationMute.md).

#### `ConversationMuteControl.set` method

```dart
Future<ConversationMute> set({
  required bool muted,
  String? until,
  String? requestId,
})
```

Mutes or unmutes message push notifications. `until` (RFC 3339, in the
future) applies only to a mute.

Sends [`communication.setConversationMute`](../../operations/communication/setConversationMute.md).

### `ConversationMuteInput` class

```dart
final class ConversationMuteInput {
  const ConversationMuteInput({
    required String conversationId,
    String? actAsPrincipalId,
  });
  final String conversationId;
  final String? actAsPrincipalId;
  Map<String, Object?> toJson();
}
```

### `ConversationMuteReply` class

```dart
final class ConversationMuteReply {
  const ConversationMuteReply({
    required String status,
    required String requestId,
    required String serverTime,
    required ConversationMute result,
  });
  factory ConversationMuteReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String serverTime;
  final ConversationMute result;
  Map<String, Object?> toJson();
}
```

### `ConversationSnapshot` class

```dart
final class ConversationSnapshot
```

What a `ConversationStore` shows at one moment. It doesn't change.

#### `ConversationSnapshot.conversationId` property

```dart
final String conversationId
```

#### `ConversationSnapshot.principalId` property

```dart
final String principalId
```

This user.

#### `ConversationSnapshot.status` property

```dart
final ConversationStoreStatus status
```

#### `ConversationSnapshot.connected` property

```dart
final bool connected
```

Whether the store is following the authority now. While it isn't, the
store reconnects by itself unless `status` is
`ConversationStoreStatus.resyncRequired` or
`ConversationStoreStatus.failed`.

#### `ConversationSnapshot.conversation` property

```dart
final Conversation? conversation
```

#### `ConversationSnapshot.messages` property

```dart
final List<Message> messages
```

Committed messages the store holds, oldest first. Deleted messages stay
as tombstones with `Message.deleted` set.

#### `ConversationSnapshot.pending` property

```dart
final List<OutboxItem> pending
```

This user's messages that aren't in `messages` yet, in the order they
were sent: show them after `messages` as optimistic messages.

#### `ConversationSnapshot.receipts` property

```dart
final Map<String, ReadReceipt> receipts
```

Each member's latest delivery and read progress, by principal ID.

#### `ConversationSnapshot.hasOlder` property

```dart
final bool hasOlder
```

Whether the conversation has messages older than `messages`.
`ConversationStore.loadOlder` loads them.

#### `ConversationSnapshot.error` property

```dart
final Object? error
```

The last error, until the store recovers from it.

#### `ConversationSnapshot.ownReceipt` property

```dart
ReadReceipt? get ownReceipt
```

This user's receipt.

#### `ConversationSnapshot.readBy` method

```dart
List<String> readBy(Message message)
```

The members other than its author whose read receipt covers `message`.

#### `ConversationSnapshot.unreadCount` property

```dart
int get unreadCount
```

Messages in `messages` that others wrote after this user's read receipt.

### `ConversationStore` class

```dart
final class ConversationStore
```

A conversation kept current on this device: its newest messages, each
member's receipts and this user's optimistic sends.

The store loads the conversation's newest messages and receipts, then
follows its events with `ConvoHopClient.watch` from that point, fetching
each new or changed message. After a transient failure it reconnects with
backoff and resumes after the last event it applied. It never skips
history on its own: when the authority can't continue from its position,
the status becomes `ConversationStoreStatus.resyncRequired` until you call
`resync`.

Pass the app's `ConvoHopOutbox` to `send` through it: queued, failed and
unknown messages show in `ConversationSnapshot.pending` until their
committed message arrives.

With `persist` on and `ConvoHopClient.storage` set, the store keeps up to
200 of the newest messages, including their text, with its receipts and
position under `convohop.store:<project>:<principal>:<conversation>`, and
shows them at once next time while it catches up. A stored conversation
from another incarnation is discarded.

Use one store per conversation and client. Don't call
`ConvoHopClient.resyncAuthorizedHistory` for a conversation a store
follows; call `resync`.

#### `ConversationStore` constructor

```dart
ConversationStore(
  ConvoHopClient client,
  String conversationId, {
  ConvoHopOutbox? outbox,
  bool persist = false,
  int maxMessages = 1000,
  ErrorListener? onError,
  Random? random,
})
```

Sends [`communication.getConversation`](../../operations/communication/getConversation.md), [`communication.messages`](../../operations/communication/messages.md), [`communication.getMessage`](../../operations/communication/getMessage.md), [`communication.events`](../../operations/communication/events.md), [`communication.receipts`](../../operations/communication/receipts.md), [`communication.resolveRequest`](../../operations/communication/resolveRequest.md) and [`communication.conversationEvents`](../../operations/communication/conversationEvents.md).

#### `ConversationStore.client` property

```dart
final ConvoHopClient client
```

#### `ConversationStore.conversationId` property

```dart
final String conversationId
```

#### `ConversationStore.snapshot` property

```dart
ConversationSnapshot get snapshot
```

What the store shows now.

#### `ConversationStore.changes` property

```dart
Stream<ConversationSnapshot> get changes
```

Every new `snapshot`.

#### `ConversationStore.events` property

```dart
Stream<Event> get events
```

Each event the store applied, once `snapshot` reflects it, for example
`live.*` events for call UI.

#### `ConversationStore.send` method

```dart
Future<OutboxItem> send(String text, {Map<String, Object?> props = const {}})
```

Queues `text` in the outbox. It shows in `ConversationSnapshot.pending`
at once.

Sends [`communication.getMessage`](../../operations/communication/getMessage.md), [`communication.resolveRequest`](../../operations/communication/resolveRequest.md) and [`communication.sendMessage`](../../operations/communication/sendMessage.md).

#### `ConversationStore.loadOlder` method

```dart
Future<bool> loadOlder()
```

Loads the next page of older messages. Resolves whether even older ones
remain.

Sends [`communication.messages`](../../operations/communication/messages.md).

#### `ConversationStore.markRead` method

```dart
Future<void> markRead()
```

Reports that this user read through the newest message, unless their
receipt already covers it. Calls while one is in flight coalesce.

Sends [`communication.getConversation`](../../operations/communication/getConversation.md) and [`communication.reportReceipt`](../../operations/communication/reportReceipt.md).

#### `ConversationStore.reconnect` method

```dart
Future<void> reconnect()
```

Reconnects now, for example when connectivity returns, instead of
waiting for the backoff. After `ConversationStoreStatus.failed`, tries
again.

Sends [`communication.getConversation`](../../operations/communication/getConversation.md), [`communication.messages`](../../operations/communication/messages.md), [`communication.getMessage`](../../operations/communication/getMessage.md), [`communication.events`](../../operations/communication/events.md), [`communication.receipts`](../../operations/communication/receipts.md), [`communication.resolveRequest`](../../operations/communication/resolveRequest.md) and [`communication.conversationEvents`](../../operations/communication/conversationEvents.md).

#### `ConversationStore.resync` method

```dart
Future<void> resync()
```

Drops everything the store holds and loads the conversation's current
state again. Use it after `ConversationStoreStatus.resyncRequired`.

Sends [`communication.getConversation`](../../operations/communication/getConversation.md), [`communication.messages`](../../operations/communication/messages.md), [`communication.getMessage`](../../operations/communication/getMessage.md), [`communication.events`](../../operations/communication/events.md), [`communication.receipts`](../../operations/communication/receipts.md), [`communication.resolveRequest`](../../operations/communication/resolveRequest.md) and [`communication.conversationEvents`](../../operations/communication/conversationEvents.md).

#### `ConversationStore.close` method

```dart
Future<void> close()
```

Stops following the conversation, and completes once the store has
stopped writing. Stored state stays for next time. Every call returns
the same future.

### `ConversationStream` class

```dart
final class ConversationStream
```

One conversation's history: replayed over HTTP from the applied cursor,
then followed over realtime.

Events reach the applier in order, at most once per stream, and the
cursor advances (and is stored) only after a page is applied. It
reconnects with backoff and resumes after its cursor. Close it when you
no longer need it.

#### `ConversationStream.client` property

```dart
final ConvoHopClient client
```

#### `ConversationStream.conversationId` property

```dart
final String conversationId
```

#### `ConversationStream.cursor` property

```dart
Cursor? get cursor
```

The cursor after the last applied page.

#### `ConversationStream.closed` property

```dart
bool get closed
```

#### `ConversationStream.retire` method

```dart
Future<void> retire()
```

Closes the stream and waits for an application in progress.

#### `ConversationStream.reconcile` method

```dart
Future<void> reconcile()
```

Replays one bounded round of missed history now.

Sends [`communication.events`](../../operations/communication/events.md).

#### `ConversationStream.close` method

```dart
void close()
```

Stops replay and realtime. Events already being applied finish.

### `ConvoHopClient` class

```dart
final class ConvoHopClient
```

A user-session client for one project, principal and device.

It keeps mutation recovery, replays conversation history from a stored
cursor, continues it over realtime and renews the session through
`SessionRefresh`. Never give it a backend or operator key.

#### `ConvoHopClient` constructor

```dart
factory ConvoHopClient({
  required String baseUrl,
  required String projectId,
  required String sessionToken,
  required String incarnation,
  required String principalId,
  RecoveryStorage? recoveryStorage,
  http.Client? httpClient,
  SessionRefresh? sessionRefresh,
  RealtimeConnector? realtimeConnector,
  Clock clock = systemClock,
})
```

Creates a client for `principalId`'s session in `projectId`.

`baseUrl` is the authority origin (HTTPS, or loopback HTTP for local
development). `recoveryStorage` keeps mutation recovery and replay
cursors across restarts; it never receives tokens.

#### `ConvoHopClient.projectId` property

```dart
final String projectId
```

#### `ConvoHopClient.principalId` property

```dart
final String principalId
```

#### `ConvoHopClient.transport` property

```dart
final ConvoHopTransport transport
```

The transport that runs this client's operations and keeps recovery.

#### `ConvoHopClient.storage` property

```dart
final RecoveryStorage? storage
```

Where recovery records and replay cursors are kept, if anywhere.

#### `ConvoHopClient.operations` property

```dart
late final CommunicationOperations operations
```

The generated operations, bound to this project and session.

#### `ConvoHopClient.requests` property

```dart
late final ClientRequests requests
```

Resolve or retry earlier mutations by request ID.

#### `ConvoHopClient.liveAlerts` property

```dart
late final LiveAlerts liveAlerts
```

Call alerts sent to this user.

#### `ConvoHopClient.sessionBinding` property

```dart
Session? get sessionBinding
```

The session this client verified, once `initialize` ran with
`SessionRefresh` configured.

#### `ConvoHopClient.sessionRefreshState` property

```dart
SessionRefreshState get sessionRefreshState
```

#### `ConvoHopClient.initialize` method

```dart
Future<ProjectRoute> initialize()
```

Reads and checks the signed route. With `SessionRefresh` configured, it
also verifies the current session once.

Sends [`communication.route`](../../operations/communication/route.md) and [`communication.currentSession`](../../operations/communication/currentSession.md).

#### `ConvoHopClient.refreshSession` method

```dart
Future<Session> refreshSession()
```

Replaces the session token through `SessionRefresh` before it expires.

Requests wait while it runs and replay streams pause, then resume with
the new token. When neither the replacement nor the original session can
be verified, the client stays blocked: retire it and bootstrap a new one.

Sends [`communication.route`](../../operations/communication/route.md) and [`communication.currentSession`](../../operations/communication/currentSession.md).

#### `ConvoHopClient.conversation` method

```dart
ConversationHandle conversation(String id)
```

A handle for one conversation: messages, mute and calls.

#### `ConvoHopClient.getConversation` method

```dart
Future<Conversation> getConversation(String id)
```

Sends [`communication.getConversation`](../../operations/communication/getConversation.md).

#### `ConvoHopClient.liveSession` method

```dart
Future<LiveSessionHandle> liveSession(String id)
```

The call `id`, as this user sees it now.

Sends [`communication.liveSession`](../../operations/communication/liveSession.md).

#### `ConvoHopClient.messages` method

```dart
Future<MessagePage> messages(String id, {String? beforeSequence})
```

One page of messages, newest first. Pass the oldest `beforeSequence`
you have to read further back.

Sends [`communication.messages`](../../operations/communication/messages.md).

#### `ConvoHopClient.send` method

```dart
Future<MessageAck> send(
  String id,
  String text, {
  Map<String, Object?> props = const {},
  String? requestId,
})
```

Sends `text`. Pass the original `requestId` to retry the same send.
Empty or oversized text is the authority's call: it rejects it as
`INVALID_REQUEST`.

Sends [`communication.sendMessage`](../../operations/communication/sendMessage.md).

#### `ConvoHopClient.edit` method

```dart
Future<Message> edit(Message message, String text, {String? requestId})
```

Replaces `message`'s text. Fails with `REVISION_CONFLICT` when the
message changed since you read it.

Sends [`communication.editMessage`](../../operations/communication/editMessage.md).

#### `ConvoHopClient.delete` method

```dart
Future<Message> delete(Message message, {String? requestId})
```

Sends [`communication.deleteMessage`](../../operations/communication/deleteMessage.md).

#### `ConvoHopClient.getMessage` method

```dart
Future<Message> getMessage(String conversationId, String messageId)
```

One message, by ID.

Sends [`communication.getMessage`](../../operations/communication/getMessage.md).

#### `ConvoHopClient.events` method

```dart
Future<EventPage> events(String id, {Cursor? after})
```

Up to 100 events after `after`, checked to stay in this conversation and
in order.

Sends [`communication.events`](../../operations/communication/events.md).

#### `ConvoHopClient.reportRead` method

```dart
Future<ReadReceipt> reportRead(
  String id,
  Member membership,
  String throughSequence,
)
```

Reports that this user read through `throughSequence`. `membership` is
the user's current membership, as `getConversation` returns it.

Sends [`communication.reportReceipt`](../../operations/communication/reportReceipt.md).

#### `ConvoHopClient.receipts` method

```dart
Future<ReceiptPage> receipts(String id, {String? cursor})
```

Sends [`communication.receipts`](../../operations/communication/receipts.md).

#### `ConvoHopClient.sendTyping` method

```dart
Future<TypingStatus> sendTyping(String id, {required bool isTyping})
```

Sends a typing signal once. It is never recorded or retried.

Sends [`communication.typing`](../../operations/communication/typing.md).

#### `ConvoHopClient.inbox` method

```dart
Future<InboxPage> inbox({int limit = 50, String? cursor})
```

This user's conversations, most recently active first.

Sends [`communication.inbox`](../../operations/communication/inbox.md).

#### `ConvoHopClient.search` method

```dart
Future<SearchPage> search(
  String query, {
  List<String>? conversationIds,
  String? cursor,
})
```

Sends [`communication.search`](../../operations/communication/search.md).

#### `ConvoHopClient.recoverPending` method

```dart
Future<void> recoverPending(ErrorListener onError)
```

Resolves up to 16 pending or unknown mutations, resending a request only
while its original retry budget remains. Errors go to `onError`.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

#### `ConvoHopClient.watch` method

```dart
Future<ConversationStream> watch(
  String conversationId,
  EventApplier apply,
  ErrorListener onError, {
  Cursor? startAfter,
})
```

Replays `conversationId`'s history after the stored cursor through
`apply`, then follows it over realtime. Resolves after the first
reconciliation. Errors that end or interrupt the stream go to `onError`.

Pass `startAfter` when your state is already current through it, for
example the conversation's `latestSequence` after you loaded its newest
messages; the replay then starts after it instead of the stored cursor.
Without either, it starts at the beginning of the visible history.

Sends [`communication.events`](../../operations/communication/events.md), [`communication.resolveRequest`](../../operations/communication/resolveRequest.md) and [`communication.conversationEvents`](../../operations/communication/conversationEvents.md).

#### `ConvoHopClient.storedCursor` method

```dart
Future<Cursor?> storedCursor(String conversationId)
```

The replay cursor stored for `conversationId`: how far applied history
reached. Null without storage or before anything was applied.

#### `ConvoHopClient.resyncAuthorizedHistory` method

```dart
Future<ConversationStream> resyncAuthorizedHistory(
  String conversationId,
  EventApplier apply,
  ErrorListener onError,
)
```

Closes `conversationId`'s streams and replays its currently visible
history from the beginning. Use it after `HistoryResyncRequired`.

Sends [`communication.route`](../../operations/communication/route.md), [`communication.getConversation`](../../operations/communication/getConversation.md), [`communication.events`](../../operations/communication/events.md), [`communication.resolveRequest`](../../operations/communication/resolveRequest.md) and [`communication.conversationEvents`](../../operations/communication/conversationEvents.md).

#### `ConvoHopClient.close` method

```dart
void close()
```

Closes every stream and, when the client created it, the HTTP client.

### `ConvoHopNotification` class

```dart
sealed class ConvoHopNotification
```

A ConvoHop notification, parsed from a push payload's `convohop` object.

Notifications carry identifiers. They carry message text only when the
project opted in to message previews (off by default) or your backend
added its own text, so `title` and `body` are often null: show your own
generic text and fetch content with the user's session.

#### `ConvoHopNotification.eventId` property

```dart
final String eventId
```

Deduplicate on this: delivery is at least once.

#### `ConvoHopNotification.eventType` property

```dart
String get eventType
```

`notification.message`, `notification.call` or
`notification.callCancelled`.

#### `ConvoHopNotification.occurredAt` property

```dart
final String occurredAt
```

#### `ConvoHopNotification.projectId` property

```dart
final String projectId
```

#### `ConvoHopNotification.recipientId` property

```dart
final String recipientId
```

The principal the notification is for.

#### `ConvoHopNotification.conversationId` property

```dart
final String conversationId
```

#### `ConvoHopNotification.senderId` property

```dart
final String senderId
```

Who sent the message or started the ringing.

#### `ConvoHopNotification.title` property

```dart
final String? title
```

Visible title, when the push had one.

#### `ConvoHopNotification.body` property

```dart
final String? body
```

Visible body, when the push had one. With previews off, a message
notification has none.

#### `ConvoHopNotification.isFor` method

```dart
bool isFor(ConvoHopClient client)
```

Whether this notification is for `client`'s user and project.

#### `ConvoHopNotification.toJson` method

```dart
Map<String, Object?> toJson()
```

The `convohop` object, for handing the notification to native code.

### `ConvoHopNotifications` class

```dart
final class ConvoHopNotifications
```

Handles ConvoHop push payloads on the device: parses and validates them,
deduplicates on `eventId`, and tracks which calls are ringing.

Delivery is at least once and unordered, so a cancellation can arrive
before its call. A call stops ringing once a cancellation with its
`alertId` was seen or its `expiresAt` passed.

#### `ConvoHopNotifications` constructor

```dart
ConvoHopNotifications({Clock? clock, int capacity = 1024})
```

`capacity` bounds how many event IDs are remembered for deduplication.

#### `ConvoHopNotifications.rings` property

```dart
Stream<RingUpdate> get rings
```

Ring changes: a call starts or stops ringing.

#### `ConvoHopNotifications.ringing` property

```dart
List<CallNotification> get ringing
```

Calls that are ringing now.

#### `ConvoHopNotifications.isRinging` method

```dart
bool isRinging(String alertId)
```

Whether the ring `alertId` is on.

#### `ConvoHopNotifications.handleNotification` method

```dart
HandledNotification? handleNotification(Map<Object?, Object?> payload)
```

Parses and records `payload`. Returns null when it isn't a ConvoHop
payload, and throws a `FormatException` when it breaks the contract.

#### `ConvoHopNotifications.record` method

```dart
HandledNotification record(ConvoHopNotification notification)
```

Records an already parsed `notification`.

#### `ConvoHopNotifications.stopRinging` method

```dart
bool stopRinging(String alertId, {String reason = 'declined'})
```

Stops the ring `alertId` locally, for example after the user declined
it in the call UI. Returns whether it was ringing.

#### `ConvoHopNotifications.stopCall` method

```dart
bool stopCall(String liveSessionId, {String reason = 'ended'})
```

Stops every ring of the call `liveSessionId`, for example when the
call ended. Returns whether any was ringing.

#### `ConvoHopNotifications.applyEvent` method

```dart
bool applyEvent(Event event)
```

Applies a conversation event from the user's realtime connection: a
`live.ended` event stops the call's rings. Pass every event of the
conversations the user can be called in, for example from
`ConversationStore.events`, because pushes don't always report that a
ring stopped. Returns whether a ring stopped.

#### `ConvoHopNotifications.close` method

```dart
void close()
```

Cancels ring timers and stops reporting on `rings`. Payloads are still
parsed, deduplicated and tracked.

### `ConvoHopOutbox` class

```dart
final class ConvoHopOutbox
```

Sends messages in the background so the UI can show them at once
(optimistic sends), in order within each conversation, across lost
connectivity and app restarts.

Each message keeps one request ID for life. The outbox resends it only
within the transport's original three-attempt, 60-second budget, and only
after a read-only check found that no earlier attempt was committed. It
never invents a new request ID on its own: `resend` does that when the
user asks.

While the authority is unreachable, it checks read-only before a
message's first submission, so waiting offline doesn't spend the budget.
Call `flush` when connectivity returns.

With `ConvoHopClient.storage` set and `persist` on, unsent messages,
including their text, are stored under
`convohop.outbox:<project>:<principal>` until sent or discarded.

#### `ConvoHopOutbox` constructor

```dart
ConvoHopOutbox(
  ConvoHopClient client, {
  ErrorListener? onError,
  bool persist = true,
  Clock clock = systemClock,
  Random? random,
})
```

#### `ConvoHopOutbox.maxItems` static property

```dart
static const int maxItems
```

Unsent messages the outbox holds at most. Sending more throws a
`StateError` until some are sent, resent or discarded.

#### `ConvoHopOutbox.client` property

```dart
final ConvoHopClient client
```

#### `ConvoHopOutbox.changes` property

```dart
Stream<OutboxItem> get changes
```

Every change to an item, including a sent or discarded item after the
outbox drops it. `items` has the current list.

#### `ConvoHopOutbox.items` property

```dart
List<OutboxItem> get items
```

Unsent messages, in the order the user sent them.

#### `ConvoHopOutbox.itemsFor` method

```dart
List<OutboxItem> itemsFor(String conversationId)
```

`conversationId`'s unsent messages, in the order the user sent them.

#### `ConvoHopOutbox.offline` property

```dart
bool get offline
```

Whether the last attempt to reach the authority failed without a
response.

#### `ConvoHopOutbox.initialize` method

```dart
Future<void> initialize()
```

Loads stored messages and starts sending. `send` awaits it too.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md) and [`communication.sendMessage`](../../operations/communication/sendMessage.md).

#### `ConvoHopOutbox.send` method

```dart
Future<OutboxItem> send(
  String conversationId,
  String text, {
  Map<String, Object?> props = const {},
})
```

Queues `text` for `conversationId` and returns the queued item at once.
It is stored before this returns.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md) and [`communication.sendMessage`](../../operations/communication/sendMessage.md).

#### `ConvoHopOutbox.flush` method

```dart
void flush()
```

Retries every queued message now, for example when connectivity
returns, and checks read-only whether `OutboxState.unknown` messages
were committed.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md) and [`communication.sendMessage`](../../operations/communication/sendMessage.md).

#### `ConvoHopOutbox.resolve` method

```dart
Future<OutboxItem> resolve(String requestId)
```

Asks the authority, read-only, whether `requestId`'s
`OutboxState.unknown` or `OutboxState.failed` message was committed.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

#### `ConvoHopOutbox.resend` method

```dart
Future<OutboxItem> resend(String requestId)
```

Sends a `OutboxState.failed` or `OutboxState.unknown` message again as
a new message with a new request ID, at the end of its conversation's
queue. Resending an unknown message can duplicate it; ask the user
first.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md) and [`communication.sendMessage`](../../operations/communication/sendMessage.md).

#### `ConvoHopOutbox.discard` method

```dart
Future<void> discard(String requestId)
```

Drops `requestId`'s message. A message that is sending, or that isn't
sent while an earlier attempt may have reached the authority
(`OutboxItem.uncertain`), could still be committed, so it throws a
`StateError` until the outcome is known.

#### `ConvoHopOutbox.close` method

```dart
Future<void> close()
```

Stops sending, and completes once the outbox has stopped writing: what
it was loading, sending and saving has settled. So on sign-out, await
it before clearing the storage. Every call returns the same future,
which never fails.

A send in flight finishes, but the outbox emits no more changes and
reports no more errors. Unsent messages stay stored for the next
outbox.

### `ConvoHopProblem` class

```dart
class ConvoHopProblem implements Exception
```

A failure reported by the ConvoHop authority or detected by the SDK.

Classify problems by `code`. `outcome` says what is known about a
mutation: `rejected` (not applied), `committed` or `accepted` (applied),
or `unknown` (resolve the original `requestId` before trying anything
else). Messages never contain credentials.

#### `ConvoHopProblem` constructor

```dart
ConvoHopProblem(
  String code,
  String requestId,
  String outcome,
  int status,
  String message, {
  int? retryAfter,
  Object? cause,
})
```

#### `ConvoHopProblem.code` property

```dart
final String code
```

#### `ConvoHopProblem.requestId` property

```dart
final String requestId
```

The request the problem belongs to. Retry or resolve with this ID.

#### `ConvoHopProblem.outcome` property

```dart
final String outcome
```

#### `ConvoHopProblem.status` property

```dart
final int status
```

The HTTP status, or 0 when no authority response was observed.

#### `ConvoHopProblem.message` property

```dart
final String message
```

#### `ConvoHopProblem.retryAfter` property

```dart
final int? retryAfter
```

Whole seconds to wait before resending the same request, when the
authority sent a delay (for example with `RATE_LIMITED`). The SDK never
waits or resends on its own because of it.

#### `ConvoHopProblem.cause` property

```dart
final Object? cause
```

The underlying failure, when there is one.

#### `ConvoHopProblem.toString` method

```dart
String toString()
```

### `ConvoHopTransport` class

```dart
final class ConvoHopTransport
```

Sends generated operations to `/graphql` and keeps mutation recovery.

A mutation keeps its request ID, payload, incarnation and retry budget
(three attempts within 60 seconds) across retries and restarts. When the
outcome is unknown, resolve the original request ID; the transport never
treats a lost response as a rejection or a commit.

#### `ConvoHopTransport` constructor

```dart
ConvoHopTransport({
  required String baseUrl,
  required String namespace,
  required String incarnation,
  String? credential,
  RecoveryStorage? recoveryStorage,
  http.Client? httpClient,
  Clock clock = systemClock,
})
```

#### `ConvoHopTransport.baseUrl` property

```dart
final String baseUrl
```

#### `ConvoHopTransport.incarnation` property

```dart
String incarnation
```

The project incarnation every request is bound to.

#### `ConvoHopTransport.servingEpoch` property

```dart
String? servingEpoch
```

The serving epoch from the latest route, sent as `observedServingEpoch`.

#### `ConvoHopTransport.durableRecovery` property

```dart
bool get durableRecovery
```

#### `ConvoHopTransport.initializeRecovery` method

```dart
Future<void> initializeRecovery()
```

Loads stored recovery records. Every operation awaits it first.

#### `ConvoHopTransport.recoveryStates` property

```dart
List<RecoveryState> get recoveryStates
```

Copies of the stored recovery records. Await `initializeRecovery` first.

#### `ConvoHopTransport.markMediaAdmissionAttempted` method

```dart
Future<void> markMediaAdmissionAttempted(String requestId)
```

Records that a call connection used the committed credential grant from
`requestId`. That grant is never reused for another connection.

#### `ConvoHopTransport.execute` method

```dart
Future<T> execute<T>(
  OperationSpec<T> spec,
  String projectId,
  Map<String, Object?> input, {
  String? requestId,
})
```

Runs `spec` in `projectId` with `input`. A mutation uses `requestId`
(or a new one) and records it for recovery before sending.

#### `ConvoHopTransport.retry` method

```dart
Future<RequestResolution> retry(String requestId)
```

Resolves `requestId` and resends the same request only when the
authority hasn't observed it and its retry budget remains.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

#### `ConvoHopTransport.close` method

```dart
void close()
```

Rejects later requests and closes the HTTP client when the transport
created it.

### `CredentialDelivery` class

```dart
final class CredentialDelivery {
  const CredentialDelivery({
    required String deliveryId,
    required String kind,
    required String projectId,
    required String installationId,
    ResourceRef? resourceRef,
    required String expiresAt,
    required String payloadDigest,
    ActorRef? recipientActorRef,
  });
  factory CredentialDelivery.fromJson(Object? json);
  final String deliveryId;
  final String kind;
  final String projectId;
  final String installationId;
  final ResourceRef? resourceRef;
  final String expiresAt;
  final String payloadDigest;
  final ActorRef? recipientActorRef;
  Map<String, Object?> toJson();
}
```

### `CredentialDeliveryReceipt` class

```dart
final class CredentialDeliveryReceipt {
  const CredentialDeliveryReceipt({required String deliveryId});
  factory CredentialDeliveryReceipt.fromJson(Object? json);
  final String deliveryId;
  Map<String, Object?> toJson();
}
```

### `CurrentLiveSessionReply` class

```dart
final class CurrentLiveSessionReply {
  const CurrentLiveSessionReply({
    required String status,
    required String requestId,
    required String serverTime,
    LiveSession? result,
  });
  factory CurrentLiveSessionReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String serverTime;
  final LiveSession? result;
  Map<String, Object?> toJson();
}
```

### `CurrentSessionReply` class

```dart
final class CurrentSessionReply {
  const CurrentSessionReply({
    required String status,
    required String requestId,
    required String serverTime,
    required Session result,
  });
  factory CurrentSessionReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String serverTime;
  final Session result;
  Map<String, Object?> toJson();
}
```

### `Cursor` class

```dart
final class Cursor {
  const Cursor({
    required String incarnation,
    required String conversationId,
    required String sequence,
  });
  factory Cursor.fromJson(Object? json);
  final String incarnation;
  final String conversationId;
  final String sequence;
  Map<String, Object?> toJson();
}
```

### `CursorInput` class

```dart
final class CursorInput {
  const CursorInput({
    required String incarnation,
    required String conversationId,
    required String sequence,
  });
  final String incarnation;
  final String conversationId;
  final String sequence;
  Map<String, Object?> toJson();
}
```

### `CutoffScope` class

```dart
final class CutoffScope {
  const CutoffScope({
    required String kind,
    String? principalId,
    String? sessionId,
    String? deviceId,
    String? callId,
  });
  factory CutoffScope.fromJson(Object? json);
  final String kind;
  final String? principalId;
  final String? sessionId;
  final String? deviceId;
  final String? callId;
  Map<String, Object?> toJson();
}
```

### `DeleteMessageReply` class

```dart
final class DeleteMessageReply {
  const DeleteMessageReply({
    required String status,
    required String requestId,
    String? serverTime,
    String? receiptId,
    String? committedAt,
    bool? replayed,
    OperationRef? operation,
    ResourceRef? resourceRef,
    Message? result,
  });
  factory DeleteMessageReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String? serverTime;
  final String? receiptId;
  final String? committedAt;
  final bool? replayed;
  final OperationRef? operation;
  final ResourceRef? resourceRef;
  final Message? result;
  Map<String, Object?> toJson();
}
```

### `DeleteMessageRequestInput` class

```dart
final class DeleteMessageRequestInput {
  const DeleteMessageRequestInput({
    required String conversationId,
    required String messageId,
    required String expectedRevision,
  });
  final String conversationId;
  final String messageId;
  final String expectedRevision;
  Map<String, Object?> toJson();
}
```

### `DeliveryAck` class

```dart
final class DeliveryAck {
  const DeliveryAck({required String deliveryId, required bool acknowledged});
  factory DeliveryAck.fromJson(Object? json);
  final String deliveryId;
  final bool acknowledged;
  Map<String, Object?> toJson();
}
```

### `EditMessageReply` class

```dart
final class EditMessageReply {
  const EditMessageReply({
    required String status,
    required String requestId,
    String? serverTime,
    String? receiptId,
    String? committedAt,
    bool? replayed,
    OperationRef? operation,
    ResourceRef? resourceRef,
    Message? result,
  });
  factory EditMessageReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String? serverTime;
  final String? receiptId;
  final String? committedAt;
  final bool? replayed;
  final OperationRef? operation;
  final ResourceRef? resourceRef;
  final Message? result;
  Map<String, Object?> toJson();
}
```

### `EditMessageRequestInput` class

```dart
final class EditMessageRequestInput {
  const EditMessageRequestInput({
    required String conversationId,
    required String messageId,
    required String expectedRevision,
    String? text,
    Map<String, Object?>? props,
  });
  final String conversationId;
  final String messageId;
  final String expectedRevision;
  final String? text;
  final Map<String, Object?>? props;
  Map<String, Object?> toJson();
}
```

### `EndLiveSessionInput` class

```dart
final class EndLiveSessionInput {
  const EndLiveSessionInput({
    required String liveSessionId,
    required String expectedGeneration,
    required String expectedRevision,
  });
  final String liveSessionId;
  final String expectedGeneration;
  final String expectedRevision;
  Map<String, Object?> toJson();
}
```

### `EndLiveSessionPayload` class

```dart
final class EndLiveSessionPayload {
  const EndLiveSessionPayload({
    required String status,
    required String requestId,
    required String receiptId,
    required String committedAt,
    required bool replayed,
    required OperationRef operation,
    required LiveSessionEndRequested result,
  });
  factory EndLiveSessionPayload.fromJson(Object? json);
  final String status;
  final String requestId;
  final String receiptId;
  final String committedAt;
  final bool replayed;
  final OperationRef operation;
  final LiveSessionEndRequested result;
  Map<String, Object?> toJson();
}
```

### `ErrorCodeSpec` class

```dart
final class ErrorCodeSpec {
  const ErrorCodeSpec({
    required String code,
    required String summary,
    required String origin,
    required int? status,
    required bool retryable,
  });
  final String code;
  final String summary;
  final String origin;
  final int? status;
  final bool retryable;
}
```

An error code and how to handle it.

### `ErrorCodes` class

```dart
abstract final class ErrorCodes {
  static const String admissionLimit;
  static const String alreadyConnected;
  static const String alreadyExists;
  static const String authorityUnavailable;
  static const String billingCatalogConflict;
  static const String billingCatalogNotSynced;
  static const String billingCustomerMissing;
  static const String billingLinkExpired;
  static const String billingNotConfigured;
  static const String billingPlanUnavailable;
  static const String billingProviderChanged;
  static const String billingProviderRejected;
  static const String billingSubscriptionActive;
  static const String billingSuspended;
  static const String credentialDeliveryExpired;
  static const String credentialExpired;
  static const String credentialRefreshRequired;
  static const String credentialRequired;
  static const String cursorAhead;
  static const String cursorExpired;
  static const String cursorInvalid;
  static const String cursorMismatch;
  static const String cursorScopeMismatch;
  static const String deliveryConsumed;
  static const String deliveryNotRedeemed;
  static const String deploymentNotReady;
  static const String featureUnsupported;
  static const String forbidden;
  static const String generationConflict;
  static const String graphqlError;
  static const String graphqlInvalidRequest;
  static const String graphqlQueryLimit;
  static const String graphqlResponseLimit;
  static const String httpFailure;
  static const String idempotencyConflict;
  static const String incarnationMismatch;
  static const String invalidReplacement;
  static const String invalidRequest;
  static const String invalidResponse;
  static const String liveAlertLimit;
  static const String liveSessionClosed;
  static const String liveSessionExists;
  static const String mediaConnectFailed;
  static const String mediaFenceRequired;
  static const String mediaNotReady;
  static const String mediaRecovering;
  static const String membershipCountInvalid;
  static const String memberLimit;
  static const String messageDeleted;
  static const String notASessionRequest;
  static const String notFound;
  static const String outcomeUnknown;
  static const String pageItemTooLarge;
  static const String participationMismatch;
  static const String permitExpired;
  static const String planLimitExceeded;
  static const String quotaExceeded;
  static const String rateLimited;
  static const String recoveryLimit;
  static const String recoveryStorageFailure;
  static const String requestExpired;
  static const String requestTooLarge;
  static const String resolutionRequired;
  static const String responseTooLarge;
  static const String resyncRequired;
  static const String retryExhausted;
  static const String revisionConflict;
  static const String scopeRequired;
  static const String sessionReceiptBindingMismatch;
  static const String sessionReceiptInvalid;
  static const String sessionRefreshFailed;
  static const String sessionRefreshRejected;
  static const String sessionRefreshRequired;
  static const String sessionRefreshUnverified;
  static const String transportUnknown;
  static const String unauthenticated;
  static const String webhookDestinationDenied;
  static const String webhookEndpointDisabled;
  static const String webhookEndpointLimit;
  static const String webhookRotationPending;
  static const String webhookSecretUnacknowledged;
  static const String wrongRegion;
}
```

Error codes, for comparing with `ConvoHopProblem.code`.

### `Event` class

```dart
final class Event {
  const Event({
    required String eventId,
    required String conversationId,
    required String sequence,
    required String type,
    required String occurredAt,
    ResourceRef? subjectRef,
    EventPayload? payload,
  });
  factory Event.fromJson(Object? json);
  final String eventId;
  final String conversationId;
  final String sequence;
  final String type;
  final String occurredAt;
  final ResourceRef? subjectRef;
  final EventPayload? payload;
  Map<String, Object?> toJson();
}
```

### `EventPage` class

```dart
final class EventPage {
  const EventPage({
    required List<Event> items,
    required bool complete,
    required bool refreshRequired,
    Cursor? nextCursor,
  });
  factory EventPage.fromJson(Object? json);
  final List<Event> items;
  final bool complete;
  final bool refreshRequired;
  final Cursor? nextCursor;
  Map<String, Object?> toJson();
}
```

### `EventPayload` class

```dart
final class EventPayload {
  const EventPayload({
    String? messageId,
    String? revision,
    String? revisionSequence,
    String? principalId,
    String? membershipEpoch,
    String? visibilityEpoch,
    String? kind,
    String? throughSequence,
    String? callId,
    String? generation,
    String? state,
    String? cutoffEvidence,
    String? liveSessionId,
  });
  factory EventPayload.fromJson(Object? json);
  final String? messageId;
  final String? revision;
  final String? revisionSequence;
  final String? principalId;
  final String? membershipEpoch;
  final String? visibilityEpoch;
  final String? kind;
  final String? throughSequence;
  final String? callId;
  final String? generation;
  final String? state;
  final String? cutoffEvidence;
  final String? liveSessionId;
  Map<String, Object?> toJson();
}
```

### `EventsReply` class

```dart
final class EventsReply {
  const EventsReply({
    required String status,
    required String requestId,
    String? serverTime,
    String? receiptId,
    String? committedAt,
    bool? replayed,
    OperationRef? operation,
    ResourceRef? resourceRef,
    EventPage? result,
  });
  factory EventsReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String? serverTime;
  final String? receiptId;
  final String? committedAt;
  final bool? replayed;
  final OperationRef? operation;
  final ResourceRef? resourceRef;
  final EventPage? result;
  Map<String, Object?> toJson();
}
```

### `EventsRequestInput` class

```dart
final class EventsRequestInput {
  const EventsRequestInput({
    required String conversationId,
    required int limit,
    CursorInput? after,
  });
  final String conversationId;
  final int limit;
  final CursorInput? after;
  Map<String, Object?> toJson();
}
```

### `Features` class

```dart
final class Features {
  const Features({
    required bool chat,
    required bool inbox,
    required bool lexicalSearch,
    required bool typing,
    required bool webhooks,
    required bool liveSessions,
    required bool liveBroadcast,
  });
  factory Features.fromJson(Object? json);
  final bool chat;
  final bool inbox;
  final bool lexicalSearch;
  final bool typing;
  final bool webhooks;
  final bool liveSessions;
  final bool liveBroadcast;
  Map<String, Object?> toJson();
}
```

### `GetConversationReply` class

```dart
final class GetConversationReply {
  const GetConversationReply({
    required String status,
    required String requestId,
    String? serverTime,
    String? receiptId,
    String? committedAt,
    bool? replayed,
    OperationRef? operation,
    ResourceRef? resourceRef,
    Conversation? result,
  });
  factory GetConversationReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String? serverTime;
  final String? receiptId;
  final String? committedAt;
  final bool? replayed;
  final OperationRef? operation;
  final ResourceRef? resourceRef;
  final Conversation? result;
  Map<String, Object?> toJson();
}
```

### `GetConversationRequestInput` class

```dart
final class GetConversationRequestInput {
  const GetConversationRequestInput({required String conversationId});
  final String conversationId;
  Map<String, Object?> toJson();
}
```

### `GetMessageReply` class

```dart
final class GetMessageReply {
  const GetMessageReply({
    required String status,
    required String requestId,
    String? serverTime,
    String? receiptId,
    String? committedAt,
    bool? replayed,
    OperationRef? operation,
    ResourceRef? resourceRef,
    Message? result,
  });
  factory GetMessageReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String? serverTime;
  final String? receiptId;
  final String? committedAt;
  final bool? replayed;
  final OperationRef? operation;
  final ResourceRef? resourceRef;
  final Message? result;
  Map<String, Object?> toJson();
}
```

### `GetMessageRequestInput` class

```dart
final class GetMessageRequestInput {
  const GetMessageRequestInput({
    required String conversationId,
    required String messageId,
    String? actAsPrincipalId,
  });
  final String conversationId;
  final String messageId;
  final String? actAsPrincipalId;
  Map<String, Object?> toJson();
}
```

### `GetOperationReply` class

```dart
final class GetOperationReply {
  const GetOperationReply({
    required String status,
    required String requestId,
    String? serverTime,
    String? receiptId,
    String? committedAt,
    bool? replayed,
    OperationRef? operation,
    ResourceRef? resourceRef,
    Operation? result,
  });
  factory GetOperationReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String? serverTime;
  final String? receiptId;
  final String? committedAt;
  final bool? replayed;
  final OperationRef? operation;
  final ResourceRef? resourceRef;
  final Operation? result;
  Map<String, Object?> toJson();
}
```

### `GetOperationRequestInput` class

```dart
final class GetOperationRequestInput {
  const GetOperationRequestInput({required String operationId});
  final String operationId;
  Map<String, Object?> toJson();
}
```

### `HandledNotification` class

```dart
final class HandledNotification
```

What `ConvoHopNotifications.handleNotification` found.

#### `HandledNotification.notification` property

```dart
final ConvoHopNotification notification
```

#### `HandledNotification.duplicate` property

```dart
final bool duplicate
```

Whether an earlier payload had the same event ID. Act on a notification
once.

#### `HandledNotification.ringing` property

```dart
final bool ringing
```

For a `CallNotification`: whether the ring is still on, with no
cancellation for its alert seen and its `expiresAt` in the future.

### `HistoryResyncRequired` class

```dart
final class HistoryResyncRequired implements Exception
```

The authority can't continue this history from the applied cursor, for
example after the user's visible history changed. Call
`ConvoHopClient.resyncAuthorizedHistory` to replay what is visible now.

#### `HistoryResyncRequired` constructor

```dart
const HistoryResyncRequired()
```

#### `HistoryResyncRequired.message` property

```dart
String get message
```

#### `HistoryResyncRequired.toString` method

```dart
String toString()
```

### `IdempotencyClasses` class

```dart
abstract final class IdempotencyClasses {
  static const IdempotencySpec ephemeral;
  static const IdempotencySpec idempotent;
  static const IdempotencySpec permitBound;
  static const IdempotencySpec safe;
  static const IdempotencySpec singleUse;
}
```

The idempotency classes.

### `IdempotencySpec` class

```dart
final class IdempotencySpec {
  const IdempotencySpec({
    required String name,
    required String retry,
    required bool resolvable,
    required int? maxAttempts,
    required int? windowMs,
  });
  final String name;
  final String retry;
  final bool resolvable;
  final int? maxAttempts;
  final int? windowMs;
}
```

How a request may be retried.

### `InboxItem` class

```dart
final class InboxItem {
  const InboxItem({
    required String conversationId,
    required String title,
    String? activityAt,
    required String visibilityEpoch,
    Message? latestVisibleMessage,
    required bool hasUnread,
  });
  factory InboxItem.fromJson(Object? json);
  final String conversationId;
  final String title;
  final String? activityAt;
  final String visibilityEpoch;
  final Message? latestVisibleMessage;
  final bool hasUnread;
  Map<String, Object?> toJson();
}
```

### `InboxPage` class

```dart
final class InboxPage {
  const InboxPage({
    required List<InboxItem> items,
    required bool complete,
    required bool refreshRequired,
    String? nextCursor,
    String? partialReason,
  });
  factory InboxPage.fromJson(Object? json);
  final List<InboxItem> items;
  final bool complete;
  final bool refreshRequired;
  final String? nextCursor;
  final String? partialReason;
  Map<String, Object?> toJson();
}
```

### `InboxReply` class

```dart
final class InboxReply {
  const InboxReply({
    required String status,
    required String requestId,
    String? serverTime,
    String? receiptId,
    String? committedAt,
    bool? replayed,
    OperationRef? operation,
    ResourceRef? resourceRef,
    InboxPage? result,
  });
  factory InboxReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String? serverTime;
  final String? receiptId;
  final String? committedAt;
  final bool? replayed;
  final OperationRef? operation;
  final ResourceRef? resourceRef;
  final InboxPage? result;
  Map<String, Object?> toJson();
}
```

### `InboxRequestInput` class

```dart
final class InboxRequestInput {
  const InboxRequestInput({
    required int limit,
    String? cursor,
    String? actAsPrincipalId,
  });
  final int limit;
  final String? cursor;
  final String? actAsPrincipalId;
  Map<String, Object?> toJson();
}
```

### `JoinLiveSessionInput` class

```dart
final class JoinLiveSessionInput {
  const JoinLiveSessionInput({
    required String liveSessionId,
    required String expectedGeneration,
  });
  final String liveSessionId;
  final String expectedGeneration;
  Map<String, Object?> toJson();
}
```

### `JoinLiveSessionPayload` class

```dart
final class JoinLiveSessionPayload {
  const JoinLiveSessionPayload({
    required String status,
    required String requestId,
    required String receiptId,
    required String committedAt,
    required bool replayed,
    required LiveSessionJoined result,
  });
  factory JoinLiveSessionPayload.fromJson(Object? json);
  final String status;
  final String requestId;
  final String receiptId;
  final String committedAt;
  final bool replayed;
  final LiveSessionJoined result;
  Map<String, Object?> toJson();
}
```

### `LeaveLiveSessionInput` class

```dart
final class LeaveLiveSessionInput {
  const LeaveLiveSessionInput({
    required String liveSessionId,
    required String expectedGeneration,
    required String participationId,
  });
  final String liveSessionId;
  final String expectedGeneration;
  final String participationId;
  Map<String, Object?> toJson();
}
```

### `LeaveLiveSessionPayload` class

```dart
final class LeaveLiveSessionPayload {
  const LeaveLiveSessionPayload({
    required String status,
    required String requestId,
    required String receiptId,
    required String committedAt,
    required bool replayed,
    required LiveSessionLeft result,
  });
  factory LeaveLiveSessionPayload.fromJson(Object? json);
  final String status;
  final String requestId;
  final String receiptId;
  final String committedAt;
  final bool replayed;
  final LiveSessionLeft result;
  Map<String, Object?> toJson();
}
```

### `Limit` class

```dart
final class Limit {
  const Limit({
    String? maximum,
    String? unit,
    String? scope,
    String? milliseconds,
    String? policyId,
    String? revision,
  });
  factory Limit.fromJson(Object? json);
  final String? maximum;
  final String? unit;
  final String? scope;
  final String? milliseconds;
  final String? policyId;
  final String? revision;
  Map<String, Object?> toJson();
}
```

### `LimitEntry` class

```dart
final class LimitEntry {
  const LimitEntry({required String key, required Limit value});
  factory LimitEntry.fromJson(Object? json);
  final String key;
  final Limit value;
  Map<String, Object?> toJson();
}
```

### `LiveAction` class

```dart
sealed class LiveAction
```

A call start or end that the authority completes asynchronously.

#### `LiveAction.client` property

```dart
final ConvoHopClient client
```

#### `LiveAction.operationId` property

```dart
final String operationId
```

#### `LiveAction.liveSessionId` property

```dart
final String liveSessionId
```

#### `LiveAction.kind` property

```dart
final LiveOperationKind kind
```

#### `LiveAction.requestId` property

```dart
final String requestId
```

The original request, for resolving the action later.

#### `LiveAction.get` method

```dart
Future<LiveSessionOperation> get()
```

Sends [`communication.liveSessionOperation`](../../operations/communication/liveSessionOperation.md).

#### `LiveAction.completed` method

```dart
Future<LiveSessionOperationCompletion> completed({
  Duration timeout = const Duration(seconds: 45),
  Future<void>? abortTrigger,
})
```

Polls every 500 ms until the action completes. A failed action throws
its reason as a `ConvoHopProblem`; `RESOLUTION_REQUIRED` means it is
still running when `timeout` (at most 300 seconds) passes. Completing
`abortTrigger` stops the wait with `LiveWaitAborted`.

Sends [`communication.liveSessionOperation`](../../operations/communication/liveSessionOperation.md).

### `LiveAlert` class

```dart
final class LiveAlert {
  const LiveAlert({
    required String alertId,
    required String liveSessionId,
    required String conversationId,
    required String generation,
    required String membershipEpoch,
    required String createdAt,
    required String expiresAt,
  });
  factory LiveAlert.fromJson(Object? json);
  final String alertId;
  final String liveSessionId;
  final String conversationId;
  final String generation;
  final String membershipEpoch;
  final String createdAt;
  final String expiresAt;
  Map<String, Object?> toJson();
}
```

### `LiveAlertBatch` class

```dart
final class LiveAlertBatch {
  const LiveAlertBatch({
    required String liveSessionId,
    required String created,
    required String suppressed,
  });
  factory LiveAlertBatch.fromJson(Object? json);
  final String liveSessionId;
  final String created;
  final String suppressed;
  Map<String, Object?> toJson();
}
```

### `LiveAlertPage` class

```dart
final class LiveAlertPage {
  const LiveAlertPage({
    required List<LiveAlert> items,
    String? nextCursor,
    required bool complete,
    String? partialReason,
    required bool refreshRequired,
  });
  factory LiveAlertPage.fromJson(Object? json);
  final List<LiveAlert> items;
  final String? nextCursor;
  final bool complete;
  final String? partialReason;
  final bool refreshRequired;
  Map<String, Object?> toJson();
}
```

### `LiveAlertPageReply` class

```dart
final class LiveAlertPageReply {
  const LiveAlertPageReply({
    required String status,
    required String requestId,
    required String serverTime,
    required LiveAlertPage result,
  });
  factory LiveAlertPageReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String serverTime;
  final LiveAlertPage result;
  Map<String, Object?> toJson();
}
```

### `LiveAlerts` class

```dart
final class LiveAlerts
```

Call alerts sent to this user.

#### `LiveAlerts.list` method

```dart
Future<LiveAlertPage> list({int? limit, String? cursor})
```

Sends [`communication.liveSessionAlerts`](../../operations/communication/liveSessionAlerts.md).

### `LiveAlertsInput` class

```dart
final class LiveAlertsInput {
  const LiveAlertsInput({int? limit, String? cursor});
  final int? limit;
  final String? cursor;
  Map<String, Object?> toJson();
}
```

### `LiveConnectionGrant` class

```dart
final class LiveConnectionGrant {
  const LiveConnectionGrant({
    required String liveSessionId,
    required String participationId,
    required String generation,
    required String roomName,
    required String participantIdentity,
    required String livekitUrl,
    required String transportToken,
    required Map<String, Object?> admissionTicket,
    required Map<String, Object?> forwardingLease,
    required String transportExpiresAt,
    required String admissionExpiresAt,
    required String leaseExpiresAt,
    required String leasePolicyId,
    required String connectToken,
  });
  factory LiveConnectionGrant.fromJson(Object? json);
  final String liveSessionId;
  final String participationId;
  final String generation;
  final String roomName;
  final String participantIdentity;
  final String livekitUrl;
  final String transportToken;
  final Map<String, Object?> admissionTicket;
  final Map<String, Object?> forwardingLease;
  final String transportExpiresAt;
  final String admissionExpiresAt;
  final String leaseExpiresAt;
  final String leasePolicyId;
  final String connectToken;
  Map<String, Object?> toJson();
}
```

### `LiveCredentialIssuance` class

```dart
final class LiveCredentialIssuance {
  const LiveCredentialIssuance({
    required String liveSessionId,
    required String participationId,
    required String generation,
    required String leaseId,
    required String grantOrdinal,
    required String admissionExpiresAt,
    required String leaseExpiresAt,
  });
  factory LiveCredentialIssuance.fromJson(Object? json);
  final String liveSessionId;
  final String participationId;
  final String generation;
  final String leaseId;
  final String grantOrdinal;
  final String admissionExpiresAt;
  final String leaseExpiresAt;
  Map<String, Object?> toJson();
}
```

### `LiveCutoffScope` class

```dart
final class LiveCutoffScope {
  const LiveCutoffScope({
    required LiveCutoffScopeKind kind,
    required String liveSessionId,
    required String generation,
    String? participationId,
  });
  factory LiveCutoffScope.fromJson(Object? json);
  final LiveCutoffScopeKind kind;
  final String liveSessionId;
  final String generation;
  final String? participationId;
  Map<String, Object?> toJson();
}
```

### `LiveEndOperation` class

```dart
final class LiveEndOperation extends LiveAction
```

#### `LiveEndOperation.receipt` property

```dart
final EndLiveSessionPayload receipt
```

#### `LiveEndOperation.client` property

```dart
final ConvoHopClient client
```

Inherited from `LiveAction`.

#### `LiveEndOperation.operationId` property

```dart
final String operationId
```

Inherited from `LiveAction`.

#### `LiveEndOperation.liveSessionId` property

```dart
final String liveSessionId
```

Inherited from `LiveAction`.

#### `LiveEndOperation.kind` property

```dart
final LiveOperationKind kind
```

Inherited from `LiveAction`.

#### `LiveEndOperation.requestId` property

```dart
final String requestId
```

The original request, for resolving the action later.

Inherited from `LiveAction`.

#### `LiveEndOperation.get` method

```dart
Future<LiveSessionOperation> get()
```

Inherited from `LiveAction`.

#### `LiveEndOperation.completed` method

```dart
Future<LiveSessionOperationCompletion> completed({
  Duration timeout = const Duration(seconds: 45),
  Future<void>? abortTrigger,
})
```

Polls every 500 ms until the action completes. A failed action throws
its reason as a `ConvoHopProblem`; `RESOLUTION_REQUIRED` means it is
still running when `timeout` (at most 300 seconds) passes. Completing
`abortTrigger` stops the wait with `LiveWaitAborted`.

Inherited from `LiveAction`.

### `LiveMediaConnection` class

```dart
final class LiveMediaConnection<R extends LiveMediaRoom>
```

A call's media connection through a stock LiveKit room.

Each connection uses one fresh credential grant: LiveKit's own resume
continues it, and anything else (a full reconnect, a not-allowed error, a
restart) needs `reconnect`. The connect token is never logged or stored.

#### `LiveMediaConnection.participation` property

```dart
final LiveParticipationHandle participation
```

#### `LiveMediaConnection.nativeConnectionId` property

```dart
String? nativeConnectionId
```

The participation's native connection, once connected.

#### `LiveMediaConnection.room` property

```dart
R get room
```

The LiveKit room, for rendering tracks.

#### `LiveMediaConnection.connected` property

```dart
bool get connected
```

#### `LiveMediaConnection.reconnect` method

```dart
Future<LiveMediaConnection<R>> reconnect()
```

Connects again with new credentials, after the room disconnected or
LiveKit couldn't resume.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md), [`communication.liveSession`](../../operations/communication/liveSession.md) and [`communication.liveSessionCredentials`](../../operations/communication/liveSessionCredentials.md).

#### `LiveMediaConnection.microphone` method

```dart
Future<void> microphone(bool enabled)
```

#### `LiveMediaConnection.camera` method

```dart
Future<void> camera(bool enabled)
```

#### `LiveMediaConnection.disconnect` method

```dart
Future<void> disconnect()
```

Disconnects for good. The participation remains until you leave.

### `LiveMediaCutoff` class

```dart
final class LiveMediaCutoff {
  const LiveMediaCutoff({
    required LiveCutoffState state,
    required LiveCutoffScope scope,
    LiveCutoffEvidence? evidence,
    String? enforcedAt,
    String? operationId,
  });
  factory LiveMediaCutoff.fromJson(Object? json);
  final LiveCutoffState state;
  final LiveCutoffScope scope;
  final LiveCutoffEvidence? evidence;
  final String? enforcedAt;
  final String? operationId;
  Map<String, Object?> toJson();
}
```

### `LiveMediaPermissions` class

```dart
final class LiveMediaPermissions {
  const LiveMediaPermissions({
    required bool microphone,
    required bool camera,
    required bool subscribe,
  });
  factory LiveMediaPermissions.fromJson(Object? json);
  final bool microphone;
  final bool camera;
  final bool subscribe;
  Map<String, Object?> toJson();
}
```

### `LiveOperationFailure` class

```dart
final class LiveOperationFailure {
  const LiveOperationFailure({
    required LiveErrorCode code,
    required String message,
  });
  factory LiveOperationFailure.fromJson(Object? json);
  final LiveErrorCode code;
  final String message;
  Map<String, Object?> toJson();
}
```

### `LiveParticipantPage` class

```dart
final class LiveParticipantPage {
  const LiveParticipantPage({
    required List<LiveParticipation> items,
    String? nextCursor,
    required bool complete,
    String? partialReason,
    required bool refreshRequired,
  });
  factory LiveParticipantPage.fromJson(Object? json);
  final List<LiveParticipation> items;
  final String? nextCursor;
  final bool complete;
  final String? partialReason;
  final bool refreshRequired;
  Map<String, Object?> toJson();
}
```

### `LiveParticipantPageReply` class

```dart
final class LiveParticipantPageReply {
  const LiveParticipantPageReply({
    required String status,
    required String requestId,
    required String serverTime,
    required LiveParticipantPage result,
  });
  factory LiveParticipantPageReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String serverTime;
  final LiveParticipantPage result;
  Map<String, Object?> toJson();
}
```

### `LiveParticipantsInput` class

```dart
final class LiveParticipantsInput {
  const LiveParticipantsInput({
    required String liveSessionId,
    int? limit,
    String? cursor,
  });
  final String liveSessionId;
  final int? limit;
  final String? cursor;
  Map<String, Object?> toJson();
}
```

### `LiveParticipation` class

```dart
final class LiveParticipation {
  const LiveParticipation({
    required String participationId,
    required String principalId,
    required String membershipEpoch,
    required LiveRole role,
    required LiveParticipationState state,
    required LiveMediaPermissions permissions,
    String? reservationExpiresAt,
    String? nativeConnectionId,
    LiveMediaCutoff? mediaCutoff,
  });
  factory LiveParticipation.fromJson(Object? json);
  final String participationId;
  final String principalId;
  final String membershipEpoch;
  final LiveRole role;
  final LiveParticipationState state;
  final LiveMediaPermissions permissions;
  final String? reservationExpiresAt;
  final String? nativeConnectionId;
  final LiveMediaCutoff? mediaCutoff;
  Map<String, Object?> toJson();
}
```

### `LiveParticipationHandle` class

```dart
final class LiveParticipationHandle
```

This user's participation in a call.

#### `LiveParticipationHandle.live` property

```dart
final LiveSessionHandle live
```

#### `LiveParticipationHandle.snapshot` property

```dart
final LiveParticipation snapshot
```

#### `LiveParticipationHandle.participationId` property

```dart
final String participationId
```

#### `LiveParticipationHandle.get` method

```dart
Future<LiveParticipation> get()
```

The participation now. Throws `PARTICIPATION_MISMATCH` when it is no
longer current.

Sends [`communication.liveSession`](../../operations/communication/liveSession.md).

#### `LiveParticipationHandle.connect` method

```dart
Future<LiveMediaConnection<R>> connect<R extends LiveMediaRoom>(
  LiveMediaRoomFactory<R> createRoom, {
  String? requestId,
  void Function()? onDisconnected,
})
```

Connects the call's media with new single-use credentials. Connecting
never starts the microphone or camera.

`createRoom` makes the LiveKit room; see `package:convohop/calls.dart`.
`onDisconnected` runs when the room disconnects on its own; call
`LiveMediaConnection.reconnect` to continue with new credentials.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md), [`communication.liveSession`](../../operations/communication/liveSession.md) and [`communication.liveSessionCredentials`](../../operations/communication/liveSessionCredentials.md).

#### `LiveParticipationHandle.leave` method

```dart
Future<LeaveLiveSessionPayload> leave({String? requestId})
```

Leaves the call and disconnects its media. A retry reuses the original
leave request.

Sends [`communication.leaveLiveSession`](../../operations/communication/leaveLiveSession.md).

### `LiveSession` class

```dart
final class LiveSession {
  const LiveSession({
    required String liveSessionId,
    required String conversationId,
    required String creatorId,
    required LiveSessionKind kind,
    required LiveMediaProfile mediaProfile,
    required LiveSessionState state,
    required String generation,
    required String revision,
    required String createdAt,
    required String expiresAt,
    LiveParticipation? myParticipation,
    LiveMediaCutoff? mediaCutoff,
  });
  factory LiveSession.fromJson(Object? json);
  final String liveSessionId;
  final String conversationId;
  final String creatorId;
  final LiveSessionKind kind;
  final LiveMediaProfile mediaProfile;
  final LiveSessionState state;
  final String generation;
  final String revision;
  final String createdAt;
  final String expiresAt;
  final LiveParticipation? myParticipation;
  final LiveMediaCutoff? mediaCutoff;
  Map<String, Object?> toJson();
}
```

### `LiveSessionAlerts` class

```dart
final class LiveSessionAlerts
```

#### `LiveSessionAlerts.send` method

```dart
Future<AlertLiveSessionPayload> send(
  List<String> principalIds, {
  String? requestId,
})
```

Rings `principalIds` for this call.

Sends [`communication.alertLiveSession`](../../operations/communication/alertLiveSession.md).

### `LiveSessionCredentialsInput` class

```dart
final class LiveSessionCredentialsInput {
  const LiveSessionCredentialsInput({
    required String liveSessionId,
    required String participationId,
    required String expectedGeneration,
    required LiveConnectionMode mode,
    String? replacementOfConnectionId,
  });
  final String liveSessionId;
  final String participationId;
  final String expectedGeneration;
  final LiveConnectionMode mode;
  final String? replacementOfConnectionId;
  Map<String, Object?> toJson();
}
```

### `LiveSessionCredentialsPayload` class

```dart
final class LiveSessionCredentialsPayload {
  const LiveSessionCredentialsPayload({
    required String status,
    required String requestId,
    required String receiptId,
    required String committedAt,
    required bool replayed,
    required LiveConnectionGrant result,
  });
  factory LiveSessionCredentialsPayload.fromJson(Object? json);
  final String status;
  final String requestId;
  final String receiptId;
  final String committedAt;
  final bool replayed;
  final LiveConnectionGrant result;
  Map<String, Object?> toJson();
}
```

### `LiveSessionEndRequested` class

```dart
final class LiveSessionEndRequested {
  const LiveSessionEndRequested({
    required String liveSessionId,
    required String operationId,
    required LiveMediaCutoff mediaCutoff,
  });
  factory LiveSessionEndRequested.fromJson(Object? json);
  final String liveSessionId;
  final String operationId;
  final LiveMediaCutoff mediaCutoff;
  Map<String, Object?> toJson();
}
```

### `LiveSessionHandle` class

```dart
final class LiveSessionHandle
```

One call (one generation of a live session).

#### `LiveSessionHandle.client` property

```dart
final ConvoHopClient client
```

#### `LiveSessionHandle.snapshot` property

```dart
final LiveSession snapshot
```

#### `LiveSessionHandle.liveSessionId` property

```dart
final String liveSessionId
```

#### `LiveSessionHandle.generation` property

```dart
final String generation
```

#### `LiveSessionHandle.conversationId` property

```dart
final String conversationId
```

#### `LiveSessionHandle.alerts` property

```dart
late final LiveSessionAlerts alerts
```

#### `LiveSessionHandle.get` method

```dart
Future<LiveSession> get()
```

The call now. Throws when it is no longer the same occurrence.

Sends [`communication.liveSession`](../../operations/communication/liveSession.md).

#### `LiveSessionHandle.join` method

```dart
Future<LiveParticipationHandle> join({String? requestId})
```

Sends [`communication.joinLiveSession`](../../operations/communication/joinLiveSession.md).

#### `LiveSessionHandle.participation` method

```dart
Future<LiveParticipationHandle?> participation()
```

This user's current participation, if any.

Sends [`communication.liveSession`](../../operations/communication/liveSession.md).

#### `LiveSessionHandle.participants` method

```dart
Future<LiveParticipantPage> participants({int? limit, String? cursor})
```

Sends [`communication.liveSessionParticipants`](../../operations/communication/liveSessionParticipants.md).

#### `LiveSessionHandle.end` method

```dart
Future<LiveEndOperation> end({String? requestId})
```

Ends the call. A retry reuses the original end request until it is
resolved.

Sends [`communication.liveSession`](../../operations/communication/liveSession.md) and [`communication.endLiveSession`](../../operations/communication/endLiveSession.md).

### `LiveSessionInput` class

```dart
final class LiveSessionInput {
  const LiveSessionInput({required String liveSessionId});
  final String liveSessionId;
  Map<String, Object?> toJson();
}
```

### `LiveSessionJoined` class

```dart
final class LiveSessionJoined {
  const LiveSessionJoined({
    required String liveSessionId,
    required String generation,
    required LiveParticipation participation,
  });
  factory LiveSessionJoined.fromJson(Object? json);
  final String liveSessionId;
  final String generation;
  final LiveParticipation participation;
  Map<String, Object?> toJson();
}
```

### `LiveSessionLeft` class

```dart
final class LiveSessionLeft {
  const LiveSessionLeft({
    required String liveSessionId,
    required String participationId,
    required LiveMediaCutoff mediaCutoff,
  });
  factory LiveSessionLeft.fromJson(Object? json);
  final String liveSessionId;
  final String participationId;
  final LiveMediaCutoff mediaCutoff;
  Map<String, Object?> toJson();
}
```

### `LiveSessionOperation` class

```dart
final class LiveSessionOperation {
  const LiveSessionOperation({
    required String operationId,
    required String requestId,
    required String liveSessionId,
    required LiveOperationKind kind,
    required LiveOperationState state,
    required String revision,
    required String requestedAt,
    String? completedAt,
    LiveSessionOperationCompletion? completion,
    LiveOperationFailure? failure,
  });
  factory LiveSessionOperation.fromJson(Object? json);
  final String operationId;
  final String requestId;
  final String liveSessionId;
  final LiveOperationKind kind;
  final LiveOperationState state;
  final String revision;
  final String requestedAt;
  final String? completedAt;
  final LiveSessionOperationCompletion? completion;
  final LiveOperationFailure? failure;
  Map<String, Object?> toJson();
}
```

### `LiveSessionOperationCompletion` class

```dart
final class LiveSessionOperationCompletion {
  const LiveSessionOperationCompletion({
    required String liveSessionId,
    required String generation,
    required LiveSessionState state,
    required String revision,
    required String completedAt,
    LiveMediaCutoff? mediaCutoff,
  });
  factory LiveSessionOperationCompletion.fromJson(Object? json);
  final String liveSessionId;
  final String generation;
  final LiveSessionState state;
  final String revision;
  final String completedAt;
  final LiveMediaCutoff? mediaCutoff;
  Map<String, Object?> toJson();
}
```

### `LiveSessionOperationInput` class

```dart
final class LiveSessionOperationInput {
  const LiveSessionOperationInput({required String operationId});
  final String operationId;
  Map<String, Object?> toJson();
}
```

### `LiveSessionOperationReply` class

```dart
final class LiveSessionOperationReply {
  const LiveSessionOperationReply({
    required String status,
    required String requestId,
    required String serverTime,
    required LiveSessionOperation result,
  });
  factory LiveSessionOperationReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String serverTime;
  final LiveSessionOperation result;
  Map<String, Object?> toJson();
}
```

### `LiveSessionPage` class

```dart
final class LiveSessionPage {
  const LiveSessionPage({
    required List<LiveSession> items,
    String? nextCursor,
    required bool complete,
    String? partialReason,
    required bool refreshRequired,
  });
  factory LiveSessionPage.fromJson(Object? json);
  final List<LiveSession> items;
  final String? nextCursor;
  final bool complete;
  final String? partialReason;
  final bool refreshRequired;
  Map<String, Object?> toJson();
}
```

### `LiveSessionPageReply` class

```dart
final class LiveSessionPageReply {
  const LiveSessionPageReply({
    required String status,
    required String requestId,
    required String serverTime,
    required LiveSessionPage result,
  });
  factory LiveSessionPageReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String serverTime;
  final LiveSessionPage result;
  Map<String, Object?> toJson();
}
```

### `LiveSessionReply` class

```dart
final class LiveSessionReply {
  const LiveSessionReply({
    required String status,
    required String requestId,
    required String serverTime,
    required LiveSession result,
  });
  factory LiveSessionReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String serverTime;
  final LiveSession result;
  Map<String, Object?> toJson();
}
```

### `LiveSessionStarted` class

```dart
final class LiveSessionStarted {
  const LiveSessionStarted({
    required String liveSessionId,
    required String conversationId,
    required LiveSessionKind kind,
    required LiveMediaProfile mediaProfile,
    required String operationId,
  });
  factory LiveSessionStarted.fromJson(Object? json);
  final String liveSessionId;
  final String conversationId;
  final LiveSessionKind kind;
  final LiveMediaProfile mediaProfile;
  final String operationId;
  Map<String, Object?> toJson();
}
```

### `LiveSessionsInput` class

```dart
final class LiveSessionsInput {
  const LiveSessionsInput({
    required String conversationId,
    int? limit,
    String? cursor,
  });
  final String conversationId;
  final int? limit;
  final String? cursor;
  Map<String, Object?> toJson();
}
```

### `LiveStartOperation` class

```dart
final class LiveStartOperation extends LiveAction
```

#### `LiveStartOperation.receipt` property

```dart
final StartLiveSessionPayload receipt
```

#### `LiveStartOperation.ready` method

```dart
Future<LiveSessionHandle> ready({
  Duration timeout = const Duration(seconds: 45),
  Future<void>? abortTrigger,
})
```

Waits for the call to start and returns it.

Sends [`communication.liveSession`](../../operations/communication/liveSession.md) and [`communication.liveSessionOperation`](../../operations/communication/liveSessionOperation.md).

#### `LiveStartOperation.client` property

```dart
final ConvoHopClient client
```

Inherited from `LiveAction`.

#### `LiveStartOperation.operationId` property

```dart
final String operationId
```

Inherited from `LiveAction`.

#### `LiveStartOperation.liveSessionId` property

```dart
final String liveSessionId
```

Inherited from `LiveAction`.

#### `LiveStartOperation.kind` property

```dart
final LiveOperationKind kind
```

Inherited from `LiveAction`.

#### `LiveStartOperation.requestId` property

```dart
final String requestId
```

The original request, for resolving the action later.

Inherited from `LiveAction`.

#### `LiveStartOperation.get` method

```dart
Future<LiveSessionOperation> get()
```

Inherited from `LiveAction`.

#### `LiveStartOperation.completed` method

```dart
Future<LiveSessionOperationCompletion> completed({
  Duration timeout = const Duration(seconds: 45),
  Future<void>? abortTrigger,
})
```

Polls every 500 ms until the action completes. A failed action throws
its reason as a `ConvoHopProblem`; `RESOLUTION_REQUIRED` means it is
still running when `timeout` (at most 300 seconds) passes. Completing
`abortTrigger` stops the wait with `LiveWaitAborted`.

Inherited from `LiveAction`.

### `LiveWaitAborted` class

```dart
final class LiveWaitAborted implements Exception
```

A wait for a call action that was aborted through its `abortTrigger`.

#### `LiveWaitAborted` constructor

```dart
const LiveWaitAborted()
```

#### `LiveWaitAborted.toString` method

```dart
String toString()
```

### `MediaCutoff` class

```dart
final class MediaCutoff {
  const MediaCutoff({required String state, CutoffScope? scope});
  factory MediaCutoff.fromJson(Object? json);
  final String state;
  final CutoffScope? scope;
  Map<String, Object?> toJson();
}
```

### `MediaPolicy` class

```dart
final class MediaPolicy {
  const MediaPolicy({
    required String leasePolicyId,
    required String maxLeaseMs,
    required String renewAttemptMs,
    required String preludeMaxBytes,
    required String preludeTimeoutMs,
    required String clockProfileId,
  });
  factory MediaPolicy.fromJson(Object? json);
  final String leasePolicyId;
  final String maxLeaseMs;
  final String renewAttemptMs;
  final String preludeMaxBytes;
  final String preludeTimeoutMs;
  final String clockProfileId;
  Map<String, Object?> toJson();
}
```

### `Member` class

```dart
final class Member {
  const Member({
    required String conversationId,
    required String principalId,
    required String role,
    required String status,
    required String membershipEpoch,
    required String visibilityEpoch,
    required String revision,
    required String visibleFromSequence,
    required bool canStartBroadcast,
  });
  factory Member.fromJson(Object? json);
  final String conversationId;
  final String principalId;
  final String role;
  final String status;
  final String membershipEpoch;
  final String visibilityEpoch;
  final String revision;
  final String visibleFromSequence;
  final bool canStartBroadcast;
  Map<String, Object?> toJson();
}
```

### `MemberPage` class

```dart
final class MemberPage {
  const MemberPage({
    required List<Member> items,
    required bool complete,
    required bool refreshRequired,
    String? nextCursor,
  });
  factory MemberPage.fromJson(Object? json);
  final List<Member> items;
  final bool complete;
  final bool refreshRequired;
  final String? nextCursor;
  Map<String, Object?> toJson();
}
```

### `MembersReply` class

```dart
final class MembersReply {
  const MembersReply({
    required String status,
    required String requestId,
    String? serverTime,
    String? receiptId,
    String? committedAt,
    bool? replayed,
    OperationRef? operation,
    ResourceRef? resourceRef,
    MemberPage? result,
  });
  factory MembersReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String? serverTime;
  final String? receiptId;
  final String? committedAt;
  final bool? replayed;
  final OperationRef? operation;
  final ResourceRef? resourceRef;
  final MemberPage? result;
  Map<String, Object?> toJson();
}
```

### `MembersRequestInput` class

```dart
final class MembersRequestInput {
  const MembersRequestInput({
    required String conversationId,
    required int limit,
    String? cursor,
  });
  final String conversationId;
  final int limit;
  final String? cursor;
  Map<String, Object?> toJson();
}
```

### `MemoryRecoveryStorage` class

```dart
final class MemoryRecoveryStorage implements RecoveryStorage
```

In-memory `RecoveryStorage`. State survives a client restart within the
same process only; use it in tests or when nothing must outlive the app.

#### `MemoryRecoveryStorage` constructor

```dart
MemoryRecoveryStorage()
```

#### `MemoryRecoveryStorage.items` property

```dart
Map<String, String> get items
```

A copy of the stored items.

#### `MemoryRecoveryStorage.getItem` method

```dart
String? getItem(String key)
```

#### `MemoryRecoveryStorage.setItem` method

```dart
void setItem(String key, String value)
```

#### `MemoryRecoveryStorage.removeItem` method

```dart
void removeItem(String key)
```

### `Message` class

```dart
final class Message {
  const Message({
    required String messageId,
    required String conversationId,
    required String authorId,
    required String sequence,
    required String revision,
    required String revisionSequence,
    required String createdAt,
    required bool deleted,
    String? text,
    Map<String, Object?>? props,
    String? editedAt,
  });
  factory Message.fromJson(Object? json);
  final String messageId;
  final String conversationId;
  final String authorId;
  final String sequence;
  final String revision;
  final String revisionSequence;
  final String createdAt;
  final bool deleted;
  final String? text;
  final Map<String, Object?>? props;
  final String? editedAt;
  Map<String, Object?> toJson();
}
```

### `MessageAck` class

```dart
final class MessageAck {
  const MessageAck({
    required String messageId,
    required String conversationId,
    required String sequence,
    required String revision,
    required String status,
    Cursor? cursor,
  });
  factory MessageAck.fromJson(Object? json);
  final String messageId;
  final String conversationId;
  final String sequence;
  final String revision;
  final String status;
  final Cursor? cursor;
  Map<String, Object?> toJson();
}
```

### `MessageNotification` class

```dart
final class MessageNotification extends ConvoHopNotification
```

A new message for the user.

#### `MessageNotification.messageId` property

```dart
final String messageId
```

#### `MessageNotification.eventType` property

```dart
String get eventType
```

`notification.message`, `notification.call` or
`notification.callCancelled`.

#### `MessageNotification.fetchMessage` method

```dart
Future<Message> fetchMessage(ConvoHopClient client)
```

Fetches the message with the user's own session, for example when
`body` is null because previews are off.

Sends [`communication.getMessage`](../../operations/communication/getMessage.md).

#### `MessageNotification.toJson` method

```dart
Map<String, Object?> toJson()
```

The `convohop` object, for handing the notification to native code.

#### `MessageNotification.eventId` property

```dart
final String eventId
```

Deduplicate on this: delivery is at least once.

Inherited from `ConvoHopNotification`.

#### `MessageNotification.occurredAt` property

```dart
final String occurredAt
```

Inherited from `ConvoHopNotification`.

#### `MessageNotification.projectId` property

```dart
final String projectId
```

Inherited from `ConvoHopNotification`.

#### `MessageNotification.recipientId` property

```dart
final String recipientId
```

The principal the notification is for.

Inherited from `ConvoHopNotification`.

#### `MessageNotification.conversationId` property

```dart
final String conversationId
```

Inherited from `ConvoHopNotification`.

#### `MessageNotification.senderId` property

```dart
final String senderId
```

Who sent the message or started the ringing.

Inherited from `ConvoHopNotification`.

#### `MessageNotification.title` property

```dart
final String? title
```

Visible title, when the push had one.

Inherited from `ConvoHopNotification`.

#### `MessageNotification.body` property

```dart
final String? body
```

Visible body, when the push had one. With previews off, a message
notification has none.

Inherited from `ConvoHopNotification`.

#### `MessageNotification.isFor` method

```dart
bool isFor(ConvoHopClient client)
```

Whether this notification is for `client`'s user and project.

Inherited from `ConvoHopNotification`.

### `MessagePage` class

```dart
final class MessagePage {
  const MessagePage({
    required List<Message> items,
    required bool complete,
    required bool refreshRequired,
    String? nextCursor,
  });
  factory MessagePage.fromJson(Object? json);
  final List<Message> items;
  final bool complete;
  final bool refreshRequired;
  final String? nextCursor;
  Map<String, Object?> toJson();
}
```

### `MessagesReply` class

```dart
final class MessagesReply {
  const MessagesReply({
    required String status,
    required String requestId,
    String? serverTime,
    String? receiptId,
    String? committedAt,
    bool? replayed,
    OperationRef? operation,
    ResourceRef? resourceRef,
    MessagePage? result,
  });
  factory MessagesReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String? serverTime;
  final String? receiptId;
  final String? committedAt;
  final bool? replayed;
  final OperationRef? operation;
  final ResourceRef? resourceRef;
  final MessagePage? result;
  Map<String, Object?> toJson();
}
```

### `MessagesRequestInput` class

```dart
final class MessagesRequestInput {
  const MessagesRequestInput({
    required String conversationId,
    required int limit,
    String? beforeSequence,
    String? actAsPrincipalId,
  });
  final String conversationId;
  final int limit;
  final String? beforeSequence;
  final String? actAsPrincipalId;
  Map<String, Object?> toJson();
}
```

### `Operation` class

```dart
final class Operation {
  const Operation({
    required String operationId,
    required String kind,
    ResourceRef? targetRef,
    required String state,
    required String revision,
    required String requestedAt,
    required String updatedAt,
    required List<OperationStep> steps,
    OperationResult? result,
    String? blockedReason,
  });
  factory Operation.fromJson(Object? json);
  final String operationId;
  final String kind;
  final ResourceRef? targetRef;
  final String state;
  final String revision;
  final String requestedAt;
  final String updatedAt;
  final List<OperationStep> steps;
  final OperationResult? result;
  final String? blockedReason;
  Map<String, Object?> toJson();
}
```

### `OperationRef` class

```dart
final class OperationRef {
  const OperationRef({
    required String operationId,
    required String owner,
    required String href,
    required String state,
  });
  factory OperationRef.fromJson(Object? json);
  final String operationId;
  final String owner;
  final String href;
  final String state;
  Map<String, Object?> toJson();
}
```

### `OperationResult` class

```dart
final class OperationResult {
  const OperationResult({
    String? projectId,
    String? incarnation,
    String? status,
    String? backend,
    String? environment,
    String? policyRevision,
    String? expiresAt,
    String? kind,
    ResourceRef? resourceRef,
    CredentialDelivery? delivery,
    String? keyId,
    String? endpointId,
    bool? enabled,
    LiveSessionOperationCompletion? liveSessionCompletion,
    int? replayedDeliveries,
    int? skippedDeliveries,
    bool? messagePreview,
  });
  factory OperationResult.fromJson(Object? json);
  final String? projectId;
  final String? incarnation;
  final String? status;
  final String? backend;
  final String? environment;
  final String? policyRevision;
  final String? expiresAt;
  final String? kind;
  final ResourceRef? resourceRef;
  final CredentialDelivery? delivery;
  final String? keyId;
  final String? endpointId;
  final bool? enabled;
  final LiveSessionOperationCompletion? liveSessionCompletion;
  final int? replayedDeliveries;
  final int? skippedDeliveries;
  final bool? messagePreview;
  Map<String, Object?> toJson();
}
```

### `OperationSpec` class

```dart
final class OperationSpec<T> {
  const OperationSpec({
    required String id,
    required String plane,
    required OperationKind kind,
    required String field,
    required String operationName,
    required String document,
    required String resultType,
    required String? contextArgument,
    required Map<String, String> contextFields,
    required String? inputArgument,
    required bool inputRequired,
    required List<String> inputFields,
    required IdempotencySpec idempotency,
    required String pagination,
    required String realtime,
    required List<String> errorCodes,
    required T Function(Object? json) decode,
  });
  final String id;
  final String plane;
  final OperationKind kind;
  final String field;
  final String operationName;
  final String document;
  final String resultType;
  final String? contextArgument;
  final Map<String, String> contextFields;
  final String? inputArgument;
  final bool inputRequired;
  final List<String> inputFields;
  final IdempotencySpec idempotency;
  final String pagination;
  final String realtime;
  final List<String> errorCodes;
  final T Function(Object? json) decode;
}
```

A generated GraphQL operation: its document, request rules and result decoder.

### `OperationStep` class

```dart
final class OperationStep {
  const OperationStep({required String stepId, required String state});
  factory OperationStep.fromJson(Object? json);
  final String stepId;
  final String state;
  Map<String, Object?> toJson();
}
```

### `Operations` class

```dart
abstract final class Operations {
  static const OperationSpec<CapabilitiesReply> communicationCapabilities;
  static const OperationSpec<RouteReply> communicationRoute;
  static const OperationSpec<CurrentSessionReply> communicationCurrentSession;
  static const OperationSpec<GetConversationReply> communicationGetConversation;
  static const OperationSpec<MembersReply> communicationMembers;
  static const OperationSpec<MessagesReply> communicationMessages;
  static const OperationSpec<GetMessageReply> communicationGetMessage;
  static const OperationSpec<EventsReply> communicationEvents;
  static const OperationSpec<ReceiptsReply> communicationReceipts;
  static const OperationSpec<InboxReply> communicationInbox;
  static const OperationSpec<SearchReply> communicationSearch;
  static const OperationSpec<ResolveRequestReply> communicationResolveRequest;
  static const OperationSpec<GetOperationReply> communicationGetOperation;
  static const OperationSpec<ConversationMuteReply> communicationConversationMute;
  static const OperationSpec<CurrentLiveSessionReply> communicationCurrentLiveSession;
  static const OperationSpec<LiveSessionReply> communicationLiveSession;
  static const OperationSpec<LiveSessionPageReply> communicationLiveSessions;
  static const OperationSpec<LiveParticipantPageReply> communicationLiveSessionParticipants;
  static const OperationSpec<LiveAlertPageReply> communicationLiveSessionAlerts;
  static const OperationSpec<LiveSessionOperationReply> communicationLiveSessionOperation;
  static const OperationSpec<RevokeSessionReply> communicationRevokeSession;
  static const OperationSpec<UpdateConversationReply> communicationUpdateConversation;
  static const OperationSpec<SendMessageReply> communicationSendMessage;
  static const OperationSpec<EditMessageReply> communicationEditMessage;
  static const OperationSpec<DeleteMessageReply> communicationDeleteMessage;
  static const OperationSpec<ReportReceiptReply> communicationReportReceipt;
  static const OperationSpec<TypingReply> communicationTyping;
  static const OperationSpec<SetConversationMutePayload> communicationSetConversationMute;
  static const OperationSpec<StartLiveSessionPayload> communicationStartLiveSession;
  static const OperationSpec<JoinLiveSessionPayload> communicationJoinLiveSession;
  static const OperationSpec<AlertLiveSessionPayload> communicationAlertLiveSession;
  static const OperationSpec<LeaveLiveSessionPayload> communicationLeaveLiveSession;
  static const OperationSpec<EndLiveSessionPayload> communicationEndLiveSession;
  static const OperationSpec<LiveSessionCredentialsPayload> communicationLiveSessionCredentials;
  static const OperationSpec<EventPage> communicationConversationEvents;
}
```

The operations a user session can run.

### `Organization` class

```dart
final class Organization {
  const Organization({
    required String orgId,
    required String name,
    required String status,
    required String revision,
  });
  factory Organization.fromJson(Object? json);
  final String orgId;
  final String name;
  final String status;
  final String revision;
  Map<String, Object?> toJson();
}
```

### `OutboxItem` class

```dart
final class OutboxItem
```

One message the user sent, as the outbox knows it.

#### `OutboxItem.requestId` property

```dart
final String requestId
```

The send's request ID. Every attempt reuses it, so it also identifies
the optimistic message on this device.

#### `OutboxItem.conversationId` property

```dart
final String conversationId
```

#### `OutboxItem.text` property

```dart
final String text
```

#### `OutboxItem.props` property

```dart
final Map<String, Object?> props
```

#### `OutboxItem.createdAt` property

```dart
final int createdAt
```

When the user sent it, in milliseconds since the epoch by this device's
clock.

#### `OutboxItem.state` property

```dart
final OutboxState state
```

#### `OutboxItem.attempts` property

```dart
final int attempts
```

Submissions so far. Read-only checks don't count.

#### `OutboxItem.uncertain` property

```dart
final bool uncertain
```

Whether an attempt may have reached the authority without an answer.

#### `OutboxItem.ack` property

```dart
final MessageAck? ack
```

The receipt, once `OutboxState.sent`, when the authority returned one.

#### `OutboxItem.errorCode` property

```dart
final String? errorCode
```

The last failure's code, such as `RATE_LIMITED`.

#### `OutboxItem.error` property

```dart
final Object? error
```

The last failure. It isn't kept across restarts.

#### `OutboxItem.nextAttemptAt` property

```dart
final int? nextAttemptAt
```

When a queued item's next attempt is due, in milliseconds since the
epoch, while it backs off.

#### `OutboxItem.toString` method

```dart
String toString()
```

### `Principal` class

```dart
final class Principal {
  const Principal({
    required String principalId,
    required String externalUserId,
    required String status,
    required String revision,
  });
  factory Principal.fromJson(Object? json);
  final String principalId;
  final String externalUserId;
  final String status;
  final String revision;
  Map<String, Object?> toJson();
}
```

### `ReadReceipt` class

```dart
final class ReadReceipt {
  const ReadReceipt({
    required String principalId,
    required String membershipEpoch,
    required String visibilityEpoch,
    String? deliveredThroughSequence,
    String? readThroughSequence,
    String? updatedAt,
  });
  factory ReadReceipt.fromJson(Object? json);
  final String principalId;
  final String membershipEpoch;
  final String visibilityEpoch;
  final String? deliveredThroughSequence;
  final String? readThroughSequence;
  final String? updatedAt;
  Map<String, Object?> toJson();
}
```

### `RealtimeChannelSpec` class

```dart
final class RealtimeChannelSpec {
  const RealtimeChannelSpec({
    required String name,
    required String subscription,
    required String replay,
    required String pageType,
    required String endpointOperation,
    required String endpointField,
    required List<String> connectionInit,
    required int maxFrameBytes,
    required int maxPendingPages,
    required int subscribeLimit,
    required int replayLimit,
    required int baseDelayMs,
    required int maxDelayMs,
    required int jitterMs,
    required List<int> terminalCloseCodes,
  });
  final String name;
  final String subscription;
  final String replay;
  final String pageType;
  final String endpointOperation;
  final String endpointField;
  final List<String> connectionInit;
  final int maxFrameBytes;
  final int maxPendingPages;
  final int subscribeLimit;
  final int replayLimit;
  final int baseDelayMs;
  final int maxDelayMs;
  final int jitterMs;
  final List<int> terminalCloseCodes;
}
```

A realtime channel: its subscription, replay operation, limits and reconnect policy.

### `RealtimeEnvelopeSpec` class

```dart
final class RealtimeEnvelopeSpec {
  const RealtimeEnvelopeSpec({
    required String plane,
    required String type,
    required String discriminator,
    required String payload,
    required String payloadType,
    required String subject,
    required String subjectType,
    required String unknownTypes,
  });
  final String plane;
  final String type;
  final String discriminator;
  final String payload;
  final String payloadType;
  final String subject;
  final String subjectType;
  final String unknownTypes;
}
```

Where realtime events keep their type, payload and subject.

### `RealtimeEventSpec` class

```dart
final class RealtimeEventSpec {
  const RealtimeEventSpec({
    required String type,
    required String subject,
    required List<String> requiredFields,
    required List<String> optionalFields,
  });
  final String type;
  final String subject;
  final List<String> requiredFields;
  final List<String> optionalFields;
}
```

A realtime event type and its payload fields.

### `ReceiptPage` class

```dart
final class ReceiptPage {
  const ReceiptPage({
    required List<ReadReceipt> items,
    required bool complete,
    required bool refreshRequired,
    String? nextCursor,
  });
  factory ReceiptPage.fromJson(Object? json);
  final List<ReadReceipt> items;
  final bool complete;
  final bool refreshRequired;
  final String? nextCursor;
  Map<String, Object?> toJson();
}
```

### `ReceiptsReply` class

```dart
final class ReceiptsReply {
  const ReceiptsReply({
    required String status,
    required String requestId,
    String? serverTime,
    String? receiptId,
    String? committedAt,
    bool? replayed,
    OperationRef? operation,
    ResourceRef? resourceRef,
    ReceiptPage? result,
  });
  factory ReceiptsReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String? serverTime;
  final String? receiptId;
  final String? committedAt;
  final bool? replayed;
  final OperationRef? operation;
  final ResourceRef? resourceRef;
  final ReceiptPage? result;
  Map<String, Object?> toJson();
}
```

### `ReceiptsRequestInput` class

```dart
final class ReceiptsRequestInput {
  const ReceiptsRequestInput({
    required String conversationId,
    required int limit,
    String? cursor,
  });
  final String conversationId;
  final int limit;
  final String? cursor;
  Map<String, Object?> toJson();
}
```

### `RecoveryState` class

```dart
final class RecoveryState
```

What the SDK durably remembers about one mutation, so that it can retry
the same request or resolve its outcome after a crash or a lost response.

It never holds a credential.

#### `RecoveryState` constructor

```dart
const RecoveryState({
  required String requestId,
  required String incarnation,
  required String payloadFingerprint,
  required String operation,
  required String projectId,
  required Map<String, Object?> input,
  required int firstSubmittedAt,
  required int retryDeadline,
  required int attemptCount,
  required int lastAttemptAt,
  required String lastAttemptClassification,
  required String resolutionState,
  bool mediaAdmissionAttempted = false,
})
```

#### `RecoveryState.requestId` property

```dart
final String requestId
```

#### `RecoveryState.incarnation` property

```dart
final String incarnation
```

#### `RecoveryState.payloadFingerprint` property

```dart
final String payloadFingerprint
```

#### `RecoveryState.operation` property

```dart
final String operation
```

The operation ID, such as `communication.sendMessage`.

#### `RecoveryState.projectId` property

```dart
final String projectId
```

#### `RecoveryState.input` property

```dart
final Map<String, Object?> input
```

#### `RecoveryState.firstSubmittedAt` property

```dart
final int firstSubmittedAt
```

#### `RecoveryState.retryDeadline` property

```dart
final int retryDeadline
```

#### `RecoveryState.attemptCount` property

```dart
final int attemptCount
```

#### `RecoveryState.lastAttemptAt` property

```dart
final int lastAttemptAt
```

#### `RecoveryState.lastAttemptClassification` property

```dart
final String lastAttemptClassification
```

`notSubmitted`, `submitted`, `authorityReceipt`, an error code, or
`nativeAdmissionAttempted` once a call connection used its grant.

#### `RecoveryState.resolutionState` property

```dart
final String resolutionState
```

`pending` (never sent), `unknown` (sent, outcome not observed),
`committed` or `accepted`.

#### `RecoveryState.mediaAdmissionAttempted` property

```dart
final bool mediaAdmissionAttempted
```

#### `RecoveryState.toJson` method

```dart
Map<String, Object?> toJson()
```

### `ReportReceiptReply` class

```dart
final class ReportReceiptReply {
  const ReportReceiptReply({
    required String status,
    required String requestId,
    String? serverTime,
    String? receiptId,
    String? committedAt,
    bool? replayed,
    OperationRef? operation,
    ResourceRef? resourceRef,
    ReadReceipt? result,
  });
  factory ReportReceiptReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String? serverTime;
  final String? receiptId;
  final String? committedAt;
  final bool? replayed;
  final OperationRef? operation;
  final ResourceRef? resourceRef;
  final ReadReceipt? result;
  Map<String, Object?> toJson();
}
```

### `ReportReceiptRequestInput` class

```dart
final class ReportReceiptRequestInput {
  const ReportReceiptRequestInput({
    required String conversationId,
    required String kind,
    required String membershipEpoch,
    required String visibilityEpoch,
    required String throughSequence,
  });
  final String conversationId;
  final String kind;
  final String membershipEpoch;
  final String visibilityEpoch;
  final String throughSequence;
  Map<String, Object?> toJson();
}
```

### `RequestResolution` class

```dart
final class RequestResolution {
  const RequestResolution({
    required String state,
    required String requestId,
    required String checkedAt,
    required bool resultWithheld,
    ResolvedReceipt? receipt,
  });
  factory RequestResolution.fromJson(Object? json);
  final String state;
  final String requestId;
  final String checkedAt;
  final bool resultWithheld;
  final ResolvedReceipt? receipt;
  Map<String, Object?> toJson();
}
```

### `ResolveRequestReply` class

```dart
final class ResolveRequestReply {
  const ResolveRequestReply({
    required String status,
    required String requestId,
    String? serverTime,
    String? receiptId,
    String? committedAt,
    bool? replayed,
    OperationRef? operation,
    ResourceRef? resourceRef,
    RequestResolution? result,
  });
  factory ResolveRequestReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String? serverTime;
  final String? receiptId;
  final String? committedAt;
  final bool? replayed;
  final OperationRef? operation;
  final ResourceRef? resourceRef;
  final RequestResolution? result;
  Map<String, Object?> toJson();
}
```

### `ResolveRequestRequestInput` class

```dart
final class ResolveRequestRequestInput {
  const ResolveRequestRequestInput({required String requestId});
  final String requestId;
  Map<String, Object?> toJson();
}
```

### `ResolvedReceipt` class

```dart
final class ResolvedReceipt {
  const ResolvedReceipt({
    required String status,
    required String requestId,
    String? serverTime,
    String? receiptId,
    String? committedAt,
    bool? replayed,
    OperationRef? operation,
    ResourceRef? resourceRef,
    RetainedResult? result,
  });
  factory ResolvedReceipt.fromJson(Object? json);
  final String status;
  final String requestId;
  final String? serverTime;
  final String? receiptId;
  final String? committedAt;
  final bool? replayed;
  final OperationRef? operation;
  final ResourceRef? resourceRef;
  final RetainedResult? result;
  Map<String, Object?> toJson();
}
```

### `ResourceRef` class

```dart
final class ResourceRef {
  const ResourceRef({required String kind, required String id});
  factory ResourceRef.fromJson(Object? json);
  final String kind;
  final String id;
  Map<String, Object?> toJson();
}
```

### `RetainedResult` class

```dart
final class RetainedResult {
  const RetainedResult({
    BillingCheckoutSession? billingCheckoutSession,
    BillingPortalSession? billingPortalSession,
    BroadcastPermissionChanged? broadcastPermissionChanged,
    Conversation? conversation,
    ConversationMemberBatch? conversationMemberBatch,
    ConversationMute? conversationMute,
    CredentialDeliveryReceipt? credentialDeliveryReceipt,
    DeliveryAck? deliveryAck,
    LiveAlertBatch? liveAlertBatch,
    LiveCredentialIssuance? liveCredentialIssuance,
    LiveSessionEndRequested? liveSessionEndRequested,
    LiveSessionJoined? liveSessionJoined,
    LiveSessionLeft? liveSessionLeft,
    LiveSessionStarted? liveSessionStarted,
    Member? member,
    Message? message,
    MessageAck? messageAck,
    Organization? organization,
    Principal? principal,
    ReadReceipt? readReceipt,
    SessionBootstrap? sessionBootstrap,
    SessionRevocation? sessionRevocation,
    Map<String, Object?>? signedProof,
  });
  factory RetainedResult.fromJson(Object? json);
  final BillingCheckoutSession? billingCheckoutSession;
  final BillingPortalSession? billingPortalSession;
  final BroadcastPermissionChanged? broadcastPermissionChanged;
  final Conversation? conversation;
  final ConversationMemberBatch? conversationMemberBatch;
  final ConversationMute? conversationMute;
  final CredentialDeliveryReceipt? credentialDeliveryReceipt;
  final DeliveryAck? deliveryAck;
  final LiveAlertBatch? liveAlertBatch;
  final LiveCredentialIssuance? liveCredentialIssuance;
  final LiveSessionEndRequested? liveSessionEndRequested;
  final LiveSessionJoined? liveSessionJoined;
  final LiveSessionLeft? liveSessionLeft;
  final LiveSessionStarted? liveSessionStarted;
  final Member? member;
  final Message? message;
  final MessageAck? messageAck;
  final Organization? organization;
  final Principal? principal;
  final ReadReceipt? readReceipt;
  final SessionBootstrap? sessionBootstrap;
  final SessionRevocation? sessionRevocation;
  final Map<String, Object?>? signedProof;
  Map<String, Object?> toJson();
}
```

Exactly one typed field contains the retained, currently authorized receipt result.

### `RevokeSessionReply` class

```dart
final class RevokeSessionReply {
  const RevokeSessionReply({
    required String status,
    required String requestId,
    String? serverTime,
    String? receiptId,
    String? committedAt,
    bool? replayed,
    OperationRef? operation,
    ResourceRef? resourceRef,
    SessionRevocation? result,
  });
  factory RevokeSessionReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String? serverTime;
  final String? receiptId;
  final String? committedAt;
  final bool? replayed;
  final OperationRef? operation;
  final ResourceRef? resourceRef;
  final SessionRevocation? result;
  Map<String, Object?> toJson();
}
```

### `RevokeSessionRequestInput` class

```dart
final class RevokeSessionRequestInput {
  const RevokeSessionRequestInput({
    required String sessionId,
    required String expectedRevision,
  });
  final String sessionId;
  final String expectedRevision;
  Map<String, Object?> toJson();
}
```

### `RingNotification` class

```dart
sealed class RingNotification extends ConvoHopNotification
```

A notification about one ring of a call.

#### `RingNotification.liveSessionId` property

```dart
final String liveSessionId
```

#### `RingNotification.alertId` property

```dart
final String alertId
```

One ring for one recipient. A later ring of the same call has a new one.

#### `RingNotification.expiresAt` property

```dart
final String expiresAt
```

When the ring stops if nobody answers.

#### `RingNotification.mediaProfile` property

```dart
final String mediaProfile
```

`AUDIO_ONLY`, `AUDIO_VIDEO` or a profile this SDK doesn't know yet.

#### `RingNotification.expiresAtMillis` property

```dart
int get expiresAtMillis
```

`expiresAt` in milliseconds since the epoch, ignoring any fraction.

#### `RingNotification.hasVideo` property

```dart
bool get hasVideo
```

#### `RingNotification.eventId` property

```dart
final String eventId
```

Deduplicate on this: delivery is at least once.

Inherited from `ConvoHopNotification`.

#### `RingNotification.eventType` property

```dart
String get eventType
```

`notification.message`, `notification.call` or
`notification.callCancelled`.

Inherited from `ConvoHopNotification`.

#### `RingNotification.occurredAt` property

```dart
final String occurredAt
```

Inherited from `ConvoHopNotification`.

#### `RingNotification.projectId` property

```dart
final String projectId
```

Inherited from `ConvoHopNotification`.

#### `RingNotification.recipientId` property

```dart
final String recipientId
```

The principal the notification is for.

Inherited from `ConvoHopNotification`.

#### `RingNotification.conversationId` property

```dart
final String conversationId
```

Inherited from `ConvoHopNotification`.

#### `RingNotification.senderId` property

```dart
final String senderId
```

Who sent the message or started the ringing.

Inherited from `ConvoHopNotification`.

#### `RingNotification.title` property

```dart
final String? title
```

Visible title, when the push had one.

Inherited from `ConvoHopNotification`.

#### `RingNotification.body` property

```dart
final String? body
```

Visible body, when the push had one. With previews off, a message
notification has none.

Inherited from `ConvoHopNotification`.

#### `RingNotification.isFor` method

```dart
bool isFor(ConvoHopClient client)
```

Whether this notification is for `client`'s user and project.

Inherited from `ConvoHopNotification`.

#### `RingNotification.toJson` method

```dart
Map<String, Object?> toJson()
```

The `convohop` object, for handing the notification to native code.

Inherited from `ConvoHopNotification`.

### `RingUpdate` class

```dart
final class RingUpdate
```

A change in a ring's state.

#### `RingUpdate.call` property

```dart
final CallNotification call
```

#### `RingUpdate.ringing` property

```dart
final bool ringing
```

#### `RingUpdate.reason` property

```dart
final String? reason
```

Why the ring stopped: the cancellation's reason, or `expired` when its
`expiresAt` passed. Null while it rings.

### `RouteReply` class

```dart
final class RouteReply {
  const RouteReply({
    required String status,
    required String requestId,
    String? serverTime,
    String? receiptId,
    String? committedAt,
    bool? replayed,
    OperationRef? operation,
    ResourceRef? resourceRef,
    Map<String, Object?>? result,
  });
  factory RouteReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String? serverTime;
  final String? receiptId;
  final String? committedAt;
  final bool? replayed;
  final OperationRef? operation;
  final ResourceRef? resourceRef;
  final Map<String, Object?>? result;
  Map<String, Object?> toJson();
}
```

### `ScopeRequiredProblem` class

```dart
final class ScopeRequiredProblem extends ConvoHopProblem
```

`SCOPE_REQUIRED`: a credential lacks a scope the operation requires.

#### `ScopeRequiredProblem` constructor

```dart
ScopeRequiredProblem(
  String requestId,
  String outcome,
  int status,
  String message, {
  int? retryAfter,
  Object? cause,
})
```

#### `ScopeRequiredProblem.scope` property

```dart
final String? scope
```

The missing scope, or null when the message doesn't name it.

#### `ScopeRequiredProblem.code` property

```dart
final String code
```

Inherited from `ConvoHopProblem`.

#### `ScopeRequiredProblem.requestId` property

```dart
final String requestId
```

The request the problem belongs to. Retry or resolve with this ID.

Inherited from `ConvoHopProblem`.

#### `ScopeRequiredProblem.outcome` property

```dart
final String outcome
```

Inherited from `ConvoHopProblem`.

#### `ScopeRequiredProblem.status` property

```dart
final int status
```

The HTTP status, or 0 when no authority response was observed.

Inherited from `ConvoHopProblem`.

#### `ScopeRequiredProblem.message` property

```dart
final String message
```

Inherited from `ConvoHopProblem`.

#### `ScopeRequiredProblem.retryAfter` property

```dart
final int? retryAfter
```

Whole seconds to wait before resending the same request, when the
authority sent a delay (for example with `RATE_LIMITED`). The SDK never
waits or resends on its own because of it.

Inherited from `ConvoHopProblem`.

#### `ScopeRequiredProblem.cause` property

```dart
final Object? cause
```

The underlying failure, when there is one.

Inherited from `ConvoHopProblem`.

#### `ScopeRequiredProblem.toString` method

```dart
String toString()
```

Inherited from `ConvoHopProblem`.

### `SearchHit` class

```dart
final class SearchHit {
  const SearchHit({required String conversationId, Message? message});
  factory SearchHit.fromJson(Object? json);
  final String conversationId;
  final Message? message;
  Map<String, Object?> toJson();
}
```

### `SearchPage` class

```dart
final class SearchPage {
  const SearchPage({
    required List<SearchHit> items,
    required bool complete,
    required bool refreshRequired,
    String? nextCursor,
  });
  factory SearchPage.fromJson(Object? json);
  final List<SearchHit> items;
  final bool complete;
  final bool refreshRequired;
  final String? nextCursor;
  Map<String, Object?> toJson();
}
```

### `SearchReply` class

```dart
final class SearchReply {
  const SearchReply({
    required String status,
    required String requestId,
    String? serverTime,
    String? receiptId,
    String? committedAt,
    bool? replayed,
    OperationRef? operation,
    ResourceRef? resourceRef,
    SearchPage? result,
  });
  factory SearchReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String? serverTime;
  final String? receiptId;
  final String? committedAt;
  final bool? replayed;
  final OperationRef? operation;
  final ResourceRef? resourceRef;
  final SearchPage? result;
  Map<String, Object?> toJson();
}
```

### `SearchRequestInput` class

```dart
final class SearchRequestInput {
  const SearchRequestInput({
    required String query,
    required int pageSize,
    SearchScopeInput? scope,
    String? cursor,
    String? actAsPrincipalId,
  });
  final String query;
  final int pageSize;
  final SearchScopeInput? scope;
  final String? cursor;
  final String? actAsPrincipalId;
  Map<String, Object?> toJson();
}
```

### `SearchScopeInput` class

```dart
final class SearchScopeInput {
  const SearchScopeInput({required List<String> conversationIds});
  final List<String> conversationIds;
  Map<String, Object?> toJson();
}
```

### `SendMessageReply` class

```dart
final class SendMessageReply {
  const SendMessageReply({
    required String status,
    required String requestId,
    String? serverTime,
    String? receiptId,
    String? committedAt,
    bool? replayed,
    OperationRef? operation,
    ResourceRef? resourceRef,
    MessageAck? result,
  });
  factory SendMessageReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String? serverTime;
  final String? receiptId;
  final String? committedAt;
  final bool? replayed;
  final OperationRef? operation;
  final ResourceRef? resourceRef;
  final MessageAck? result;
  Map<String, Object?> toJson();
}
```

### `SendMessageRequestInput` class

```dart
final class SendMessageRequestInput {
  const SendMessageRequestInput({
    required String conversationId,
    required String text,
    required Map<String, Object?> props,
    String? actAsPrincipalId,
  });
  final String conversationId;
  final String text;
  final Map<String, Object?> props;
  final String? actAsPrincipalId;
  Map<String, Object?> toJson();
}
```

### `Session` class

```dart
final class Session {
  const Session({
    required String sessionId,
    required String principalId,
    required String deviceId,
    required String incarnation,
    required String sessionRevision,
    required String expiresAt,
    required String status,
  });
  factory Session.fromJson(Object? json);
  final String sessionId;
  final String principalId;
  final String deviceId;
  final String incarnation;
  final String sessionRevision;
  final String expiresAt;
  final String status;
  Map<String, Object?> toJson();
}
```

### `SessionBootstrap` class

```dart
final class SessionBootstrap {
  const SessionBootstrap({
    Session? session,
    required String tokenExpiresAt,
    required String sessionToken,
  });
  factory SessionBootstrap.fromJson(Object? json);
  final Session? session;
  final String tokenExpiresAt;
  final String sessionToken;
  Map<String, Object?> toJson();
}
```

### `SessionRefresher` class

```dart
final class SessionRefresher
```

Refreshes a client's session through its `SessionRefresh` before the
session expires, so the app doesn't schedule
`ConvoHopClient.refreshSession` itself.

Create it once `ConvoHopClient.initialize` verified the session. It
refreshes when `lead` is left before the session expires, or halfway
through a session that lasts less than twice `lead`, and again before
each replacement expires. After a failure that left the client usable,
it tries again with backoff while the session is still valid.

It stops for good once the session can't be refreshed any more: the
session expired, or neither the replacement nor the original session
could be verified. `active` is false by the time the error listener
receives the failure that stopped it. Then retire the client and
bootstrap a new one. Errors the listener throws are ignored.

Timers don't fire while the app is suspended, so call `check` when the
app returns to the foreground. Close the refresher before the client.

#### `SessionRefresher` constructor

```dart
SessionRefresher(
  ConvoHopClient client, {
  Duration lead = const Duration(minutes: 5),
  ErrorListener? onError,
  Clock clock = systemClock,
  Random? random,
})
```

Throws a `SESSION_REFRESH_REQUIRED` `ConvoHopProblem` when the session
expires within a second.

Sends [`communication.route`](../../operations/communication/route.md) and [`communication.currentSession`](../../operations/communication/currentSession.md).

#### `SessionRefresher.client` property

```dart
final ConvoHopClient client
```

#### `SessionRefresher.lead` property

```dart
final Duration lead
```

How long before the session expires it refreshes.

#### `SessionRefresher.active` property

```dart
bool get active
```

Whether it still keeps the session fresh.

#### `SessionRefresher.nextRefresh` property

```dart
DateTime? get nextRefresh
```

When it refreshes next, in UTC, while `active`.

#### `SessionRefresher.check` method

```dart
Future<void> check()
```

Refreshes now when it's due, for example when the app returns to the
foreground after missing a timer, and otherwise waits again. Failures
go to the error listener.

Sends [`communication.route`](../../operations/communication/route.md) and [`communication.currentSession`](../../operations/communication/currentSession.md).

#### `SessionRefresher.close` method

```dart
void close()
```

Stops refreshing. A refresh in flight still completes.

### `SessionRevocation` class

```dart
final class SessionRevocation {
  const SessionRevocation({
    required String sessionId,
    required String status,
    MediaCutoff? mediaCutoff,
  });
  factory SessionRevocation.fromJson(Object? json);
  final String sessionId;
  final String status;
  final MediaCutoff? mediaCutoff;
  Map<String, Object?> toJson();
}
```

### `SetConversationMuteInput` class

```dart
final class SetConversationMuteInput {
  const SetConversationMuteInput({
    required String conversationId,
    required bool muted,
    String? until,
    String? actAsPrincipalId,
  });
  final String conversationId;
  final bool muted;
  final String? until;
  final String? actAsPrincipalId;
  Map<String, Object?> toJson();
}
```

### `SetConversationMutePayload` class

```dart
final class SetConversationMutePayload {
  const SetConversationMutePayload({
    required String status,
    required String requestId,
    required String receiptId,
    required String committedAt,
    required bool replayed,
    required ConversationMute result,
  });
  factory SetConversationMutePayload.fromJson(Object? json);
  final String status;
  final String requestId;
  final String receiptId;
  final String committedAt;
  final bool replayed;
  final ConversationMute result;
  Map<String, Object?> toJson();
}
```

### `StartLiveSessionInput` class

```dart
final class StartLiveSessionInput {
  const StartLiveSessionInput({
    required String conversationId,
    LiveSessionKind? kind,
    LiveMediaProfile? mediaProfile,
  });
  final String conversationId;
  final LiveSessionKind? kind;
  final LiveMediaProfile? mediaProfile;
  Map<String, Object?> toJson();
}
```

### `StartLiveSessionPayload` class

```dart
final class StartLiveSessionPayload {
  const StartLiveSessionPayload({
    required String status,
    required String requestId,
    required String receiptId,
    required String committedAt,
    required bool replayed,
    required OperationRef operation,
    required LiveSessionStarted result,
  });
  factory StartLiveSessionPayload.fromJson(Object? json);
  final String status;
  final String requestId;
  final String receiptId;
  final String committedAt;
  final bool replayed;
  final OperationRef operation;
  final LiveSessionStarted result;
  Map<String, Object?> toJson();
}
```

### `TypingIndicator` class

```dart
final class TypingIndicator
```

Sends this user's typing signals for one conversation.

Call `keystroke` as the user edits the draft and `stop` when they send or
clear it. While typing, it signals at most once per `throttle`, and it
stops by itself after `idle` without a keystroke. Each signal is a single
attempt that's never retried, because a late typing signal is worse than
none, and at most one waits behind the one in flight.

Signals are outbound only: the authority doesn't deliver other members'
typing to clients, so there's nothing to subscribe to.

#### `TypingIndicator` constructor

```dart
TypingIndicator(
  ConvoHopClient client,
  String conversationId, {
  Duration throttle = const Duration(seconds: 3),
  Duration idle = const Duration(seconds: 5),
  ErrorListener? onError,
  Clock clock = systemClock,
})
```

#### `TypingIndicator.client` property

```dart
final ConvoHopClient client
```

#### `TypingIndicator.conversationId` property

```dart
final String conversationId
```

#### `TypingIndicator.throttle` property

```dart
final Duration throttle
```

The shortest time between two signals while the user keeps typing.

#### `TypingIndicator.idle` property

```dart
final Duration idle
```

How long after the last keystroke typing stops by itself.

#### `TypingIndicator.typing` property

```dart
bool get typing
```

Whether this user is typing, as last signalled.

#### `TypingIndicator.supported` property

```dart
bool get supported
```

False once the authority said it doesn't support typing signals. They
stop then.

#### `TypingIndicator.keystroke` method

```dart
void keystroke()
```

Notes a keystroke, and signals typing unless it did within `throttle`.

Sends [`communication.typing`](../../operations/communication/typing.md).

#### `TypingIndicator.stop` method

```dart
void stop()
```

Signals that this user stopped typing, if they were.

Sends [`communication.typing`](../../operations/communication/typing.md).

#### `TypingIndicator.close` method

```dart
Future<void> close()
```

Signals a stop if needed, then waits for signals in flight.

Sends [`communication.typing`](../../operations/communication/typing.md).

### `TypingReply` class

```dart
final class TypingReply {
  const TypingReply({
    required String status,
    required String requestId,
    String? serverTime,
    String? receiptId,
    String? committedAt,
    bool? replayed,
    OperationRef? operation,
    ResourceRef? resourceRef,
    TypingStatus? result,
  });
  factory TypingReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String? serverTime;
  final String? receiptId;
  final String? committedAt;
  final bool? replayed;
  final OperationRef? operation;
  final ResourceRef? resourceRef;
  final TypingStatus? result;
  Map<String, Object?> toJson();
}
```

### `TypingRequestInput` class

```dart
final class TypingRequestInput {
  const TypingRequestInput({
    required String conversationId,
    required bool isTyping,
  });
  final String conversationId;
  final bool isTyping;
  Map<String, Object?> toJson();
}
```

### `TypingStatus` class

```dart
final class TypingStatus {
  const TypingStatus({required bool accepted});
  factory TypingStatus.fromJson(Object? json);
  final bool accepted;
  Map<String, Object?> toJson();
}
```

### `UpdateConversationReply` class

```dart
final class UpdateConversationReply {
  const UpdateConversationReply({
    required String status,
    required String requestId,
    String? serverTime,
    String? receiptId,
    String? committedAt,
    bool? replayed,
    OperationRef? operation,
    ResourceRef? resourceRef,
    Conversation? result,
  });
  factory UpdateConversationReply.fromJson(Object? json);
  final String status;
  final String requestId;
  final String? serverTime;
  final String? receiptId;
  final String? committedAt;
  final bool? replayed;
  final OperationRef? operation;
  final ResourceRef? resourceRef;
  final Conversation? result;
  Map<String, Object?> toJson();
}
```

### `UpdateConversationRequestInput` class

```dart
final class UpdateConversationRequestInput {
  const UpdateConversationRequestInput({
    required String conversationId,
    required String expectedRevision,
    String? title,
    Map<String, Object?>? props,
  });
  final String conversationId;
  final String expectedRevision;
  final String? title;
  final Map<String, Object?>? props;
  Map<String, Object?> toJson();
}
```

## Interfaces

### `LiveMediaRoom` interface

```dart
abstract interface class LiveMediaRoom
```

A LiveKit room, as a call connection drives it.

`package:convohop/calls.dart` provides one built on the official
`livekit_client` package. The connection never starts capture on its own.

#### `LiveMediaRoom.connect` method

```dart
Future<void> connect(String url, String token)
```

Connects to `url` with the single-use `token`. Throws when the room
doesn't connect.

#### `LiveMediaRoom.localParticipantSid` property

```dart
String? get localParticipantSid
```

The connected local participant's SID. ConvoHop's media server makes it
the participation's `nativeConnectionId`.

#### `LiveMediaRoom.setMicrophoneEnabled` method

```dart
Future<void> setMicrophoneEnabled(bool enabled)
```

#### `LiveMediaRoom.setCameraEnabled` method

```dart
Future<void> setCameraEnabled(bool enabled)
```

#### `LiveMediaRoom.disconnect` method

```dart
Future<void> disconnect()
```

Leaves the room and releases its tracks. Calling it again does nothing.

### `RealtimeSocket` interface

```dart
abstract interface class RealtimeSocket
```

One realtime WebSocket connection, as the SDK uses it.

Implement it to carry realtime traffic over your own networking stack, or
to test without a server. The SDK closes only with code 1000 or 4000.

#### `RealtimeSocket.ready` property

```dart
Future<void> get ready
```

Completes when the connection is open; fails when it can't open.

#### `RealtimeSocket.stream` property

```dart
Stream<Object?> get stream
```

Incoming frames: text as `String`, binary as `List<int>`. Connection
failures arrive as errors, and the stream is done once the connection
closes.

#### `RealtimeSocket.protocol` property

```dart
String? get protocol
```

The subprotocol the server selected, once `ready` completes.

#### `RealtimeSocket.closeCode` property

```dart
int? get closeCode
```

The close code the server sent, once `stream` is done.

#### `RealtimeSocket.send` method

```dart
void send(String text)
```

#### `RealtimeSocket.close` method

```dart
void close([int? code, String? reason])
```

Closes the connection. Calling it again does nothing.

### `RecoveryStorage` interface

```dart
abstract interface class RecoveryStorage
```

Durable key-value storage that the SDK uses for mutation recovery
records, replay cursors and the offline outbox.

Values are JSON text. The SDK never stores session tokens or call
credentials here. Implement it over the platform storage your app trusts
(for example a file in the app's support directory); writes should be
durable when the returned future completes.

#### `RecoveryStorage.getItem` method

```dart
FutureOr<String?> getItem(String key)
```

#### `RecoveryStorage.setItem` method

```dart
FutureOr<void> setItem(String key, String value)
```

#### `RecoveryStorage.removeItem` method

```dart
FutureOr<void> removeItem(String key)
```

## Enums

### `ConversationStoreStatus` enum

```dart
enum ConversationStoreStatus
```

Where a `ConversationStore` is.

#### `ConversationStoreStatus.loading` case

```dart
loading
```

Nothing to show yet.

#### `ConversationStoreStatus.ready` case

```dart
ready
```

The conversation is shown. `ConversationSnapshot.connected` says whether
the store is following the authority right now.

#### `ConversationStoreStatus.resyncRequired` case

```dart
resyncRequired
```

The authority can't continue from the store's position, for example
after this user's visibility changed or retained history expired. What
the store shows may include history this user can't see any more. Call
`ConversationStore.resync`.

#### `ConversationStoreStatus.failed` case

```dart
failed
```

Stopped on an error that won't clear by itself, in
`ConversationSnapshot.error`. `ConversationStore.reconnect` tries again.

#### `ConversationStoreStatus.closed` case

```dart
closed
```

`ConversationStore.close` was called.

### `LiveConnectionMode` enum

```dart
enum LiveConnectionMode {
  initial('INITIAL'),
  reconnect('RECONNECT');
  factory LiveConnectionMode.fromJson(Object? json);
  final String wire;
  String toJson();
}
```

### `LiveCutoffEvidence` enum

```dart
enum LiveCutoffEvidence {
  nativeFence('NATIVE_FENCE'),
  monotonicBootRetirement('MONOTONIC_BOOT_RETIREMENT'),
  noGrantsIssued('NO_GRANTS_ISSUED');
  factory LiveCutoffEvidence.fromJson(Object? json);
  final String wire;
  String toJson();
}
```

### `LiveCutoffScopeKind` enum

```dart
enum LiveCutoffScopeKind {
  participation('PARTICIPATION'),
  generation('GENERATION');
  factory LiveCutoffScopeKind.fromJson(Object? json);
  final String wire;
  String toJson();
}
```

### `LiveCutoffState` enum

```dart
enum LiveCutoffState {
  pending('PENDING'),
  enforced('ENFORCED'),
  unknown('UNKNOWN');
  factory LiveCutoffState.fromJson(Object? json);
  final String wire;
  String toJson();
}
```

### `LiveErrorCode` enum

```dart
enum LiveErrorCode {
  liveSessionExists('LIVE_SESSION_EXISTS'),
  liveSessionClosed('LIVE_SESSION_CLOSED'),
  liveSessionInterrupted('LIVE_SESSION_INTERRUPTED'),
  liveSessionCapacity('LIVE_SESSION_CAPACITY'),
  liveAlertLimit('LIVE_ALERT_LIMIT'),
  joinedElsewhere('JOINED_ELSEWHERE'),
  participationDraining('PARTICIPATION_DRAINING'),
  participationMismatch('PARTICIPATION_MISMATCH'),
  generationConflict('GENERATION_CONFLICT'),
  mediaNotReady('MEDIA_NOT_READY'),
  credentialRefreshRequired('CREDENTIAL_REFRESH_REQUIRED'),
  liveStartCancelled('LIVE_START_CANCELLED'),
  livePreparationFailed('LIVE_PREPARATION_FAILED');
  factory LiveErrorCode.fromJson(Object? json);
  final String wire;
  String toJson();
}
```

### `LiveMediaProfile` enum

```dart
enum LiveMediaProfile {
  audioOnly('AUDIO_ONLY'),
  audioVideo('AUDIO_VIDEO');
  factory LiveMediaProfile.fromJson(Object? json);
  final String wire;
  String toJson();
}
```

### `LiveOperationKind` enum

```dart
enum LiveOperationKind {
  start('START'),
  end('END');
  factory LiveOperationKind.fromJson(Object? json);
  final String wire;
  String toJson();
}
```

### `LiveOperationState` enum

```dart
enum LiveOperationState {
  running('RUNNING'),
  completed('COMPLETED'),
  failed('FAILED');
  factory LiveOperationState.fromJson(Object? json);
  final String wire;
  String toJson();
}
```

### `LiveParticipationState` enum

```dart
enum LiveParticipationState {
  joined('JOINED'),
  connecting('CONNECTING'),
  connected('CONNECTED'),
  disconnected('DISCONNECTED'),
  leaving('LEAVING'),
  left('LEFT');
  factory LiveParticipationState.fromJson(Object? json);
  final String wire;
  String toJson();
}
```

### `LiveRole` enum

```dart
enum LiveRole {
  publisher('PUBLISHER'),
  viewer('VIEWER');
  factory LiveRole.fromJson(Object? json);
  final String wire;
  String toJson();
}
```

### `LiveSessionKind` enum

```dart
enum LiveSessionKind {
  interactive('INTERACTIVE'),
  broadcast('BROADCAST');
  factory LiveSessionKind.fromJson(Object? json);
  final String wire;
  String toJson();
}
```

### `LiveSessionState` enum

```dart
enum LiveSessionState {
  preparing('PREPARING'),
  ready('READY'),
  active('ACTIVE'),
  draining('DRAINING'),
  ended('ENDED'),
  failed('FAILED');
  factory LiveSessionState.fromJson(Object? json);
  final String wire;
  String toJson();
}
```

### `OperationKind` enum

```dart
enum OperationKind {
  query,
  mutation,
  subscription
}
```

The GraphQL operation type.

### `OutboxState` enum

```dart
enum OutboxState
```

Where a message in the `ConvoHopOutbox` is.

#### `OutboxState.queued` case

```dart
queued
```

Waiting for its turn, the network or a backoff.

#### `OutboxState.sending` case

```dart
sending
```

An attempt is in flight.

#### `OutboxState.sent` case

```dart
sent
```

The authority committed it. `OutboxItem.ack` has its sequence when the
authority still reported one.

#### `OutboxState.failed` case

```dart
failed
```

The authority rejected it, and no attempt is in doubt, so it wasn't
committed. `ConvoHopOutbox.resend` sends the text as a new message.

#### `OutboxState.unknown` case

```dart
unknown
```

An attempt reached the authority without an answer, and the retry budget
is spent, so it may or may not be committed. `ConvoHopOutbox.resolve`
asks again. Resending it as a new message can duplicate it.

### `SessionRefreshState` enum

```dart
enum SessionRefreshState
```

#### `SessionRefreshState.disabled` case

```dart
disabled
```

#### `SessionRefreshState.uninitialized` case

```dart
uninitialized
```

#### `SessionRefreshState.ready` case

```dart
ready
```

#### `SessionRefreshState.refreshing` case

```dart
refreshing
```

#### `SessionRefreshState.blocked` case

```dart
blocked
```

## Types

### `Clock` type

```dart
typedef Clock = int Function()
```

Milliseconds since the Unix epoch. Inject a clock in tests.

### `ErrorListener` type

```dart
typedef ErrorListener = void Function(Object error)
```

Receives realtime and recovery errors that don't belong to a caller.

### `EventApplier` type

```dart
typedef EventApplier = Future<void> Function(List<Event> events)
```

Applies a page of conversation events. The replay cursor advances only
after it completes.

### `LiveMediaRoomFactory` type

```dart
typedef LiveMediaRoomFactory<R extends LiveMediaRoom> = R Function(
  void Function() onDisconnected,
)
```

Creates the room for one connection. The room calls `onDisconnected` once
when it disconnects on its own, after LiveKit's own resume gave up.

### `RealtimeConnector` type

```dart
typedef RealtimeConnector = RealtimeSocket Function(Uri url, String protocol)
```

Opens a realtime connection to `url` that offers `protocol`.

### `SessionRefresh` type

```dart
typedef SessionRefresh = Future<SessionBootstrap> Function(Session binding)
```

Renews the session through your backend. It receives the current session
binding and returns the bootstrap your backend got from the server SDK's
`sessions.renew` for that session, with the binding's `sessionRevision`
as `expectedRevision`. A bootstrap for another session is rejected.

## Functions

### `authorityProblem` function

```dart
ConvoHopProblem authorityProblem(
  String code,
  String requestId,
  String outcome,
  int status,
  String message, {
  int? retryAfter,
})
```

Builds the most specific problem for an authority error code.

### `connectRealtime` function

```dart
RealtimeSocket connectRealtime(Uri url, String protocol)
```

The default connector, built on `package:web_socket_channel`.

### `newRequestId` function

```dart
String newRequestId()
```

A new random request ID (a version 4 UUID).

### `notificationEpochSeconds` function

```dart
int? notificationEpochSeconds(String value)
```

Unix seconds of an RFC 3339 timestamp with an uppercase `T`, and `Z` or an
offset, ignoring any fraction, or null when the value isn't one. The date
must exist, and second 60 isn't accepted.

### `parseNotificationPayload` function

```dart
ConvoHopNotification? parseNotificationPayload(Map<Object?, Object?> payload)
```

Parses a push payload: an APNs `userInfo` (`{aps, convohop: {...}}`), FCM
data (`{convohop: "<JSON>"}`) or a Web Push payload.

Returns null when the payload isn't ConvoHop's, and throws a
`FormatException` naming the first invalid field when it breaks the push
payload contract. Fields it doesn't know are ignored, as the contract
requires of consumers.

### `systemClock` function

```dart
int systemClock()
```

## Constants

### `convoHopPackageVersion` constant

```dart
const String convoHopPackageVersion
```

This package's version, the `version` in its pubspec.

### `errorCodes` constant

```dart
const Map<String, ErrorCodeSpec> errorCodes
```

Every error code, by code.

### `operationCatalog` constant

```dart
const Map<String, OperationSpec<Object?>> operationCatalog
```

`Operations` by ID.

### `realtimeChannels` constant

```dart
const Map<String, RealtimeChannelSpec> realtimeChannels
```

The realtime channels a user session can subscribe to, by name.

### `realtimeEnvelope` constant

```dart
const RealtimeEnvelopeSpec realtimeEnvelope
```

The realtime event envelope.

### `realtimeEvents` constant

```dart
const Map<String, RealtimeEventSpec> realtimeEvents
```

The realtime event types, by type.

## Namespaces

### `ConversationActivity` namespace

```dart
extension ConversationActivity on ConversationSnapshot
```

Members' recent activity in a conversation, from what its store holds.

ConvoHop doesn't publish online status to clients. This reflects what
members visibly did in this conversation, the messages they wrote or
edited and the receipts they reported, so treat it as "recently active",
not "online". It only covers what the store has loaded.

#### `ConversationActivity.lastActive` property

```dart
Map<String, DateTime> get lastActive
```

When each member last wrote, edited or reported a receipt here, in UTC.

#### `ConversationActivity.isRecentlyActive` method

```dart
bool isRecentlyActive(
  String principalId, {
  Duration within = const Duration(minutes: 5),
  DateTime? now,
})
```

Whether `principalId` was active here within `within` of `now`.
