import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:convohop/calls.dart';
import 'package:convohop/convohop.dart';
import 'package:convohop/io.dart';
import 'package:convohop/push.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show PlatformException;
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

/// Your backend's ConvoHop session endpoint; see README.md. Your backend
/// signs the user in with your app's own authentication and keeps the
/// ConvoHop backend key, which never belongs in the app.
const sessionUrl = String.fromEnvironment('CONVOHOP_SESSION_URL');

final _navigator = GlobalKey<NavigatorState>();
final _messenger = GlobalKey<ScaffoldMessengerState>();

void main() => runApp(const ExampleApp());

void _showError(Object error) {
  _messenger.currentState?.showSnackBar(SnackBar(content: Text('$error')));
}

class ExampleApp extends StatelessWidget {
  const ExampleApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'ConvoHop example',
    navigatorKey: _navigator,
    scaffoldMessengerKey: _messenger,
    theme: ThemeData(colorSchemeSeed: Colors.indigo),
    home: sessionUrl.isEmpty
        ? const Scaffold(
            body: Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text('Run with --dart-define=CONVOHOP_SESSION_URL=<your backend session endpoint>.'),
              ),
            ),
          )
        : const HomeScreen(),
  );
}

/// Your backend's session endpoints. Add your app's own authentication, such
/// as its sign-in cookie or bearer token, to each request.
final class AppBackend {
  AppBackend(String url) : _base = Uri.parse(url);

  final Uri _base;
  final http.Client _http = http.Client();

  Future<Object?> _post(String path, Map<String, Object?> body) async {
    final url = _base.replace(path: '${_base.path}$path');
    final response = await _http.post(url, headers: const {'content-type': 'application/json'}, body: jsonEncode(body));
    if (response.statusCode ~/ 100 != 2) {
      throw http.ClientException('Your backend answered ${response.statusCode}', url);
    }
    return response.body.isEmpty ? null : jsonDecode(response.body);
  }

  /// Signs the user in to ConvoHop. Your backend answers
  /// `{baseUrl, projectId, bootstrap}`, with the server SDK's `issueSession`
  /// result as `bootstrap`.
  Future<({String baseUrl, String projectId, SessionBootstrap bootstrap})> signIn() async {
    final json = await _post('', const {});
    if (json case {'baseUrl': final String baseUrl, 'projectId': final String projectId, 'bootstrap': final Object b}) {
      return (baseUrl: baseUrl, projectId: projectId, bootstrap: SessionBootstrap.fromJson(b));
    }
    throw const FormatException('Expected baseUrl, projectId and bootstrap');
  }

  /// Renews the session with the server SDK's `sessions.renew`. Your backend
  /// checks that the session is this signed-in user's.
  Future<SessionBootstrap> renew(Session session) async => SessionBootstrap.fromJson(
    await _post('/renew', {
      'sessionId': session.sessionId,
      'principalId': session.principalId,
      'deviceId': session.deviceId,
      'expectedRevision': session.sessionRevision,
    }),
  );

  /// Keeps this device's push registration, so your backend can deliver
  /// ConvoHop's notification events to it.
  Future<void> registerPush(PushRegistration registration) async {
    await _post('/push-registration', registration.toJson());
  }

  void close() => _http.close();
}

/// One signed-in user: their client, outbox, push and session refresh.
final class ChatSession {
  ChatSession._(this.client, this.outbox, this.push, this.refresher, this._subscriptions);

  final ConvoHopClient client;
  final ConvoHopOutbox outbox;
  final ConvoHopPush push;
  final SessionRefresher refresher;
  final List<StreamSubscription<Object?>> _subscriptions;

  /// Signs in and starts push. [onEnded] runs when the session can't be
  /// refreshed any more.
  static Future<ChatSession> start(AppBackend backend, {required void Function() onEnded}) async {
    final (:baseUrl, :projectId, :bootstrap) = await backend.signIn();
    final session = bootstrap.session ?? (throw const FormatException('The bootstrap has no session'));
    final directory = await getApplicationSupportDirectory();
    final client = ConvoHopClient(
      baseUrl: baseUrl,
      projectId: projectId,
      incarnation: session.incarnation,
      principalId: session.principalId,
      sessionToken: bootstrap.sessionToken,
      // Mutation recovery, replay cursors, unsent messages and stored
      // conversations survive restarts here. Tokens are never stored.
      recoveryStorage: FileRecoveryStorage(Directory('${directory.path}/convohop')),
      sessionRefresh: backend.renew,
    );
    final push = ConvoHopPush(onError: _showError);
    final subscriptions = <StreamSubscription<Object?>>[];
    SessionRefresher? refresher;
    ConvoHopOutbox? outbox;
    try {
      await client.initialize();
      refresher = SessionRefresher(
        client,
        onError: (error) {
          _showError(error);
          if (refresher?.active == false) onEnded();
        },
      );
      outbox = ConvoHopOutbox(client, onError: _showError);
      await outbox.initialize();
      final chat = ChatSession._(client, outbox, push, refresher, subscriptions);
      subscriptions
        ..add(
          push.registrations.listen(
            (registration) => unawaited(backend.registerPush(registration).catchError(_showError)),
          ),
        )
        ..add(push.opened.listen(chat._opened))
        ..add(push.callActions.listen(chat._callAction));
      // With another push plugin, such as firebase_messaging, pass each FCM
      // message's data to push.showNotification from its handlers instead.
      await push.start();
      await push.requestPermission();
      try {
        // The registration arrives on push.registrations.
        await push.register();
      } on PlatformException catch (error) {
        // FIREBASE_UNAVAILABLE without Firebase on Android: chat and calls
        // still work, without push.
        _showError(error);
      }
      // Rings through CallKit on iOS. iOS terminates apps that receive a VoIP
      // push without reporting a call, so only apps that ring register.
      if (Platform.isIOS) await push.registerVoip();
      return chat;
    } on Object {
      refresher?.close();
      for (final subscription in subscriptions) {
        unawaited(subscription.cancel());
      }
      unawaited(push.close());
      unawaited(outbox?.close());
      client.close();
      rethrow;
    }
  }

  void _opened(ConvoHopNotification notification) {
    if (!notification.isFor(client)) return;
    switch (notification) {
      case MessageNotification(:final conversationId):
        unawaited(_navigator.currentState?.push(ConversationScreen.route(this, conversationId)));
      case CallNotification(:final conversationId, :final liveSessionId, :final alertId):
        unawaited(
          _navigator.currentState?.push(
            CallScreen.route(this, conversationId, liveSessionId: liveSessionId, alertId: alertId),
          ),
        );
      case CallCancelledNotification():
        break;
    }
  }

  void _callAction(CallAction action) {
    final call = action.call;
    switch (action.kind) {
      case CallActionKind.answer when call != null && call.isFor(client):
        unawaited(
          _navigator.currentState?.push(
            CallScreen.route(this, call.conversationId, liveSessionId: call.liveSessionId, alertId: call.alertId),
          ),
        );
      case CallActionKind.answer:
        _showError('The call already ended');
      case CallActionKind.decline || CallActionKind.end || CallActionKind.mute || CallActionKind.unmute:
        // CallScreen follows its own call's actions.
        break;
    }
  }

  Future<void> close() async {
    refresher.close();
    for (final subscription in _subscriptions) {
      await subscription.cancel();
    }
    await push.close();
    await outbox.close();
    client.close();
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  final AppBackend _backend = AppBackend(sessionUrl);
  ChatSession? _chat;
  List<InboxItem> _inbox = const [];
  Object? _error;
  bool _signingIn = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(_signIn());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final chat = _chat;
    if (state != AppLifecycleState.resumed || chat == null) return;
    // Timers don't fire while the app is suspended.
    unawaited(chat.refresher.check());
    chat.outbox.flush();
  }

  Future<void> _signIn() async {
    if (_signingIn) return;
    _signingIn = true;
    final previous = _chat;
    if (previous != null || _error != null) {
      setState(() {
        _chat = null;
        _error = null;
      });
    }
    try {
      if (previous != null) {
        // Screens still open use the old client.
        _navigator.currentState?.popUntil((route) => route.isFirst);
        await previous.close();
      }
      final chat = await ChatSession.start(_backend, onEnded: () => unawaited(_signIn()));
      if (!mounted) {
        await chat.close();
        return;
      }
      setState(() => _chat = chat);
      await _refresh();
    } on Object catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      _signingIn = false;
    }
  }

  Future<void> _refresh() async {
    final chat = _chat;
    if (chat == null) return;
    try {
      final page = await chat.client.inbox();
      if (mounted) setState(() => _inbox = page.items);
    } on Object catch (error) {
      _showError(error);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_chat?.close());
    _backend.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final chat = _chat;
    return Scaffold(
      appBar: AppBar(title: const Text('Conversations')),
      body: switch ((chat, _error)) {
        (null, final Object error) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(padding: const EdgeInsets.all(16), child: Text('Sign-in failed: $error')),
              FilledButton(onPressed: _signIn, child: const Text('Try again')),
            ],
          ),
        ),
        (null, _) => const Center(child: CircularProgressIndicator()),
        (final ChatSession chat, _) => RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            children: [
              for (final item in _inbox)
                ListTile(
                  title: Text(item.title),
                  // Deleted and unloaded messages have no text.
                  subtitle: Text(item.latestVisibleMessage?.text ?? '', maxLines: 1, overflow: TextOverflow.ellipsis),
                  trailing: item.hasUnread ? const Icon(Icons.circle, size: 12) : null,
                  onTap: () => Navigator.of(context).push(ConversationScreen.route(chat, item.conversationId)),
                ),
            ],
          ),
        ),
      },
    );
  }
}

class ConversationScreen extends StatefulWidget {
  const ConversationScreen({super.key, required this.chat, required this.conversationId});

  static Route<void> route(ChatSession chat, String conversationId) => MaterialPageRoute(
    builder: (_) => ConversationScreen(chat: chat, conversationId: conversationId),
  );

  final ChatSession chat;
  final String conversationId;

  @override
  State<ConversationScreen> createState() => _ConversationScreenState();
}

class _ConversationScreenState extends State<ConversationScreen> {
  // Shows stored messages at once, follows realtime with resume after
  // reconnects, and shows the outbox's optimistic sends.
  late final ConversationStore _store = ConversationStore(
    widget.chat.client,
    widget.conversationId,
    outbox: widget.chat.outbox,
    persist: true,
    onError: _showError,
  );
  late final TypingIndicator _typing = TypingIndicator(widget.chat.client, widget.conversationId);
  late ConversationSnapshot _snapshot = _store.snapshot;
  late final StreamSubscription<ConversationSnapshot> _changes;
  late final StreamSubscription<Event> _events;
  final TextEditingController _draft = TextEditingController();

  ConvoHopPush get _push => widget.chat.push;

  @override
  void initState() {
    super.initState();
    _changes = _store.changes.listen((snapshot) {
      setState(() => _snapshot = snapshot);
      if (snapshot.status == ConversationStoreStatus.ready && snapshot.unreadCount > 0) {
        unawaited(_store.markRead().catchError(_showError));
      }
    });
    // Pushes don't always report that a ring stopped: live.ended does.
    _events = _store.events.listen(_push.notifications.applyEvent);
    // No notifications for the open conversation while the app is in front.
    unawaited(_push.setActiveConversation(widget.conversationId).catchError(_showError));
    unawaited(_push.removeDeliveredNotifications(conversationId: widget.conversationId).catchError(_showError));
  }

  @override
  void dispose() {
    unawaited(_push.setActiveConversation(null).catchError(_showError));
    unawaited(_changes.cancel());
    unawaited(_events.cancel());
    unawaited(_typing.close());
    unawaited(_store.close());
    _draft.dispose();
    super.dispose();
  }

  void _send() {
    final text = _draft.text.trim();
    if (text.isEmpty) return;
    _draft.clear();
    _typing.stop();
    // Shows at once in snapshot.pending and sends in the background, also
    // after the app restarts.
    unawaited(_store.send(text).then<void>((_) {}, onError: _showError));
  }

  @override
  Widget build(BuildContext context) {
    final snapshot = _snapshot;
    // ConvoHop doesn't publish online status: this is who wrote or read here
    // in the last five minutes.
    final active = snapshot.lastActive.keys
        .where((id) => id != snapshot.principalId && snapshot.isRecentlyActive(id))
        .length;
    return Scaffold(
      appBar: AppBar(
        title: Text(snapshot.conversation?.title ?? 'Conversation'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(20),
          child: Text(snapshot.connected ? '$active recently active' : 'Connecting…'),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.call),
            tooltip: 'Voice call',
            // ConvoHop rings the members you name, and any member can join
            // without a ring. Your app knows the conversation's members; this
            // example rings the others the store has receipts for.
            onPressed: () => Navigator.of(context).push(
              CallScreen.route(
                widget.chat,
                widget.conversationId,
                ring: [
                  for (final id in snapshot.receipts.keys)
                    if (id != snapshot.principalId) id,
                ],
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          if (snapshot.status == ConversationStoreStatus.resyncRequired)
            MaterialBanner(
              content: const Text('This conversation changed while you were away.'),
              actions: [TextButton(onPressed: _store.resync, child: const Text('Reload'))],
            ),
          if (snapshot.status == ConversationStoreStatus.failed)
            MaterialBanner(
              content: Text('Stopped: ${snapshot.error}'),
              actions: [TextButton(onPressed: _store.reconnect, child: const Text('Retry'))],
            ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(8),
              children: [
                if (snapshot.hasOlder)
                  TextButton(onPressed: () => unawaited(_store.loadOlder()), child: const Text('Load earlier')),
                for (final message in snapshot.messages) _message(snapshot, message),
                for (final item in snapshot.pending) _pending(item),
              ],
            ),
          ),
          SafeArea(
            child: Row(
              children: [
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: TextField(
                      controller: _draft,
                      decoration: const InputDecoration(hintText: 'Message'),
                      onChanged: (text) => text.isEmpty ? _typing.stop() : _typing.keystroke(),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                ),
                IconButton(icon: const Icon(Icons.send), tooltip: 'Send', onPressed: _send),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _message(ConversationSnapshot snapshot, Message message) {
    final mine = message.authorId == snapshot.principalId;
    final readBy = mine ? snapshot.readBy(message).length : 0;
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(message.deleted ? 'Message deleted' : message.text ?? ''),
              if (readBy > 0) Text('Read by $readBy', style: Theme.of(context).textTheme.labelSmall),
            ],
          ),
        ),
      ),
    );
  }

  Widget _pending(OutboxItem item) {
    final outbox = widget.chat.outbox;
    return Align(
      alignment: Alignment.centerRight,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(item.text),
              switch (item.state) {
                OutboxState.queued || OutboxState.sending || OutboxState.sent => const Icon(Icons.schedule, size: 14),
                OutboxState.failed => TextButton(
                  onPressed: () => unawaited(outbox.resend(item.requestId).then<void>((_) {}, onError: _showError)),
                  child: const Text('Not sent. Send again'),
                ),
                // Sending it again could duplicate it: ask the authority.
                OutboxState.unknown => TextButton(
                  onPressed: () => unawaited(outbox.resolve(item.requestId).then<void>((_) {}, onError: _showError)),
                  child: const Text('Not confirmed. Check'),
                ),
              },
            ],
          ),
        ),
      ),
    );
  }
}

class CallScreen extends StatefulWidget {
  const CallScreen({
    super.key,
    required this.chat,
    required this.conversationId,
    this.liveSessionId,
    this.alertId,
    this.ring = const [],
  });

  static Route<void> route(
    ChatSession chat,
    String conversationId, {
    String? liveSessionId,
    String? alertId,
    List<String> ring = const [],
  }) => MaterialPageRoute(
    builder: (_) => CallScreen(
      chat: chat,
      conversationId: conversationId,
      liveSessionId: liveSessionId,
      alertId: alertId,
      ring: ring,
    ),
  );

  final ChatSession chat;
  final String conversationId;

  /// The call to join, or null to join the conversation's current call or
  /// start one.
  final String? liveSessionId;

  /// The ring this screen answers, to end it in the system call UI.
  final String? alertId;

  /// Whom to ring when this screen starts a new call.
  final List<String> ring;

  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> {
  LiveParticipationHandle? _participation;
  LiveMediaConnection<LiveKitMediaRoom>? _connection;
  StreamSubscription<CallAction>? _actions;
  String _status = 'Joining…';
  bool _muted = false;
  bool _leaving = false;

  @override
  void initState() {
    super.initState();
    _actions = widget.chat.push.callActions.listen((action) {
      if (action.alertId != widget.alertId) return;
      switch (action.kind) {
        case CallActionKind.end || CallActionKind.decline:
          unawaited(_leave());
        case CallActionKind.mute || CallActionKind.unmute:
          unawaited(_setMuted(action.kind == CallActionKind.mute).catchError(_showError));
        case CallActionKind.answer:
          break;
      }
    });
    unawaited(_join());
  }

  Future<void> _join() async {
    try {
      final client = widget.chat.client;
      final id = widget.liveSessionId;
      final live = client.conversation(widget.conversationId).live;
      final current = id != null ? await client.liveSession(id) : await live.current();
      final LiveSessionHandle call;
      if (current != null) {
        call = current;
      } else {
        call = await (await live.startVoice()).ready();
        if (widget.ring.isNotEmpty) {
          unawaited(call.alerts.send(widget.ring).then<void>((_) {}, onError: _showError));
        }
      }
      final participation = _participation = await call.join();
      // Left while joining: _leave had no participation to leave yet.
      if (_leaving) {
        await participation.leave();
        return;
      }
      // Each connection admits once with fresh single-use credentials.
      final connection = await participation.connect(liveKitRooms(), onDisconnected: _reconnect);
      _connection = connection;
      await connection.microphone(true);
      if (mounted) setState(() => _status = 'In call');
    } on Object catch (error) {
      if (_leaving) return;
      _showError(error);
      if (mounted) setState(() => _status = 'Could not join');
    }
  }

  void _reconnect() => unawaited(_reconnectNow());

  Future<void> _reconnectNow() async {
    final connection = _connection;
    if (connection == null || _leaving) return;
    if (mounted) setState(() => _status = 'Reconnecting…');
    try {
      final next = _connection = await connection.reconnect();
      await next.microphone(!_muted);
      if (mounted) setState(() => _status = 'In call');
    } on Object catch (error) {
      if (_leaving) return;
      _showError(error);
      if (mounted) setState(() => _status = 'Disconnected');
    }
  }

  Future<void> _setMuted(bool muted) async {
    final connection = _connection;
    if (connection == null || !connection.connected) return;
    await connection.microphone(!muted);
    if (mounted) setState(() => _muted = muted);
  }

  Future<void> _leave({bool pop = true}) async {
    if (_leaving) return;
    _leaving = true;
    final alertId = widget.alertId;
    // Ends the call in the system call UI too.
    if (alertId != null) unawaited(widget.chat.push.endCall(alertId).catchError(_showError));
    try {
      await _participation?.leave();
    } on Object catch (error) {
      _showError(error);
    }
    if (pop && mounted) Navigator.of(context).pop();
  }

  @override
  void dispose() {
    unawaited(_actions?.cancel());
    unawaited(_leave(pop: false));
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Voice call')),
    body: Center(child: Text(_status)),
    floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    floatingActionButton: Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        FloatingActionButton(
          heroTag: 'mute',
          tooltip: _muted ? 'Unmute' : 'Mute',
          onPressed: () => unawaited(_setMuted(!_muted).catchError(_showError)),
          child: Icon(_muted ? Icons.mic_off : Icons.mic),
        ),
        const SizedBox(width: 24),
        FloatingActionButton(
          heroTag: 'leave',
          tooltip: 'Leave',
          backgroundColor: Colors.red,
          onPressed: _leave,
          child: const Icon(Icons.call_end),
        ),
      ],
    ),
  );
}
