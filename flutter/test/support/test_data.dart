import 'dart:async';
import 'dart:convert';

import 'package:convohop/convohop.dart';
import 'package:convohop/src/generated/generated.dart' as generated;
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

const projectId = '8d3f6a2c-1b4e-4f7a-9c0d-5e6f7a8b9c0d';
const principalId = 'b7e2c9d4-3a1f-4e8b-a6c5-0d9f8e7a6b5c';
const otherPrincipalId = 'c4a8e1f2-7d3b-4c9e-b2a1-6f5e4d3c2b1a';
const conversationId = '6f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7c';
const messageId = 'd9b3f7e5-2c8a-4d1f-8e6b-3a2c1b0f9e8d';
const eventId = 'cccbe606-6dbd-41bb-ad43-c30e0b6b89ad';
const requestId = '11111111-1111-4111-8111-111111111111';
const requestIdTwo = '22222222-2222-4222-8222-222222222222';
const incarnation = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const liveSessionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const participationId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const alertId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const operationId = '99999999-9999-4999-8999-999999999999';
const nativeConnectionId = '77777777-7777-4777-8777-777777777777';
const timestamp = '2026-10-10T11:59:55.000Z';
const pushTimestamp = '2026-10-10T11:59:55Z';

int fixedClock() => DateTime.utc(2026, 10, 10, 12).millisecondsSinceEpoch;

Map<String, Object?> cursor({String sequence = '1', String id = conversationId}) => <String, Object?>{
  'incarnation': incarnation,
  'conversationId': id,
  'sequence': sequence,
};

Map<String, Object?> event({String sequence = '1', String type = 'message.created', String id = conversationId}) =>
    <String, Object?>{
      'eventId': eventId,
      'conversationId': id,
      'sequence': sequence,
      'type': type,
      'occurredAt': timestamp,
      'subjectRef': <String, Object?>{'kind': 'message', 'id': messageId},
      'payload': <String, Object?>{
        'messageId': messageId,
        'revision': '1',
        'revisionSequence': null,
        'principalId': null,
        'membershipEpoch': null,
        'visibilityEpoch': null,
        'kind': null,
        'throughSequence': null,
        'callId': null,
        'generation': null,
        'state': null,
        'cutoffEvidence': null,
        'liveSessionId': null,
      },
    };

Map<String, Object?> eventPage({List<Map<String, Object?>>? items, String sequence = '1', bool complete = true}) =>
    <String, Object?>{
      'items': items ?? <Map<String, Object?>>[],
      'complete': complete,
      'refreshRequired': false,
      'nextCursor': cursor(sequence: sequence),
    };

Map<String, Object?> message({String text = 'hello', String sequence = '1', bool deleted = false}) => <String, Object?>{
  'messageId': messageId,
  'conversationId': conversationId,
  'authorId': principalId,
  'sequence': sequence,
  'revision': '1',
  'revisionSequence': sequence,
  'createdAt': timestamp,
  'deleted': deleted,
  'text': deleted ? null : text,
  'props': deleted ? null : <String, Object?>{},
  'editedAt': null,
};

Map<String, Object?> messageAck({String sequence = '1'}) => <String, Object?>{
  'messageId': messageId,
  'conversationId': conversationId,
  'sequence': sequence,
  'revision': '1',
  'status': 'sent',
  'cursor': cursor(sequence: sequence),
};

// Every field of a retained result; the authority sets exactly one.
const _retainedResultFields = <String>[
  'billingCheckoutSession',
  'billingPortalSession',
  'broadcastPermissionChanged',
  'conversation',
  'conversationMemberBatch',
  'conversationMute',
  'credentialDeliveryReceipt',
  'deliveryAck',
  'liveAlertBatch',
  'liveCredentialIssuance',
  'liveSessionEndRequested',
  'liveSessionJoined',
  'liveSessionLeft',
  'liveSessionStarted',
  'member',
  'message',
  'messageAck',
  'organization',
  'principal',
  'readReceipt',
  'sessionBootstrap',
  'sessionRevocation',
  'signedProof',
];

/// A resolution reporting that [resolved] was committed with [ack].
Map<String, Object?> committedResolution(String resolved, Map<String, Object?> ack) => <String, Object?>{
  'requestId': resolved,
  'state': 'committed',
  'checkedAt': timestamp,
  'resultWithheld': false,
  'receipt': <String, Object?>{
    'status': 'committed',
    'requestId': resolved,
    'serverTime': timestamp,
    'receiptId': '33333333-3333-4333-8333-333333333333',
    'committedAt': timestamp,
    'replayed': true,
    'operation': null,
    'resourceRef': null,
    'result': <String, Object?>{for (final field in _retainedResultFields) field: null, 'messageAck': ack},
  },
};

Map<String, Object?> member() => <String, Object?>{
  'conversationId': conversationId,
  'principalId': principalId,
  'role': 'member',
  'status': 'active',
  'membershipEpoch': '1',
  'visibilityEpoch': '1',
  'revision': '1',
  'visibleFromSequence': '1',
  'canStartBroadcast': true,
};

Map<String, Object?> conversation() => <String, Object?>{
  'conversationId': conversationId,
  'revision': '1',
  'title': 'General',
  'props': <String, Object?>{},
  'latestSequence': '1',
  'membership': member(),
};

Map<String, Object?> receipt({String through = '1', String id = principalId}) => <String, Object?>{
  'principalId': id,
  'membershipEpoch': '1',
  'visibilityEpoch': '1',
  'deliveredThroughSequence': through,
  'readThroughSequence': through,
  'updatedAt': timestamp,
};

Map<String, Object?> routeResult({String? wssUrl}) => <String, Object?>{
  'projectId': projectId,
  'incarnation': incarnation,
  'servingEpoch': '1',
  'communicationBase': 'https://authority.example',
  'wssUrl': wssUrl ?? 'wss://authority.example/graphql',
  'expiresAt': '2026-10-10T12:10:00.000Z',
  'signature': 'fake-signature',
};

Map<String, Object?> session({
  String token = 'fake-token-new',
  String revision = '1',
  String expiresAt = '2026-10-10T12:10:00.000Z',
}) => <String, Object?>{
  'sessionId': '12345678-1234-4234-8234-123456789abc',
  'principalId': principalId,
  'deviceId': '87654321-4321-4321-8321-cba987654321',
  'incarnation': incarnation,
  'status': 'active',
  'expiresAt': expiresAt,
  'sessionRevision': revision,
};

Map<String, Object?> sessionBootstrap({
  String token = 'fake-token-new',
  String revision = '2',
  String expiresAt = '2026-10-10T12:20:00.000Z',
}) => <String, Object?>{
  'sessionToken': token,
  'tokenExpiresAt': expiresAt,
  'session': session(token: token, revision: revision, expiresAt: expiresAt),
};

Map<String, Object?> liveSession({String? nativeId}) => <String, Object?>{
  'liveSessionId': liveSessionId,
  'conversationId': conversationId,
  'creatorId': principalId,
  'generation': '1',
  'revision': '1',
  'kind': 'INTERACTIVE',
  'mediaProfile': 'AUDIO_VIDEO',
  'state': 'ACTIVE',
  'createdAt': timestamp,
  'expiresAt': '2026-10-10T12:10:00.000Z',
  'mediaCutoff': null,
  'myParticipation': <String, Object?>{
    'participationId': participationId,
    'principalId': principalId,
    'membershipEpoch': '1',
    'role': 'PUBLISHER',
    'state': 'JOINED',
    'permissions': <String, Object?>{'microphone': true, 'camera': true, 'subscribe': true},
    'reservationExpiresAt': '2026-10-10T12:02:00.000Z',
    'nativeConnectionId': nativeId,
    'mediaCutoff': null,
  },
};

Map<String, Object?> grant({String token = 'fake-connect-token'}) => <String, Object?>{
  'liveSessionId': liveSessionId,
  'participationId': participationId,
  'generation': '1',
  'roomName': 'convohop-room',
  'participantIdentity': principalId,
  'livekitUrl': 'wss://media.example/rtc',
  'transportToken': 'fake-transport-token',
  'admissionTicket': <String, Object?>{'ticket': 'fake', 'signature': 'fake-signature'},
  'forwardingLease': <String, Object?>{'lease': 'fake', 'signature': 'fake-signature'},
  'transportExpiresAt': '2026-10-10T12:01:00.000Z',
  'admissionExpiresAt': '2026-10-10T12:01:00.000Z',
  'leaseExpiresAt': '2026-10-10T12:01:00.000Z',
  'leasePolicyId': 'default',
  'connectToken': token,
};

Map<String, Object?> notification({String type = 'notification.message', bool preview = false}) {
  final data = <String, Object?>{
    'eventId': eventId,
    'eventType': type,
    'occurredAt': pushTimestamp,
    'projectId': projectId,
    'recipientId': principalId,
    'conversationId': conversationId,
    'senderId': otherPrincipalId,
  };
  if (type == 'notification.message') {
    data['messageId'] = messageId;
  } else {
    data
      ..['liveSessionId'] = liveSessionId
      ..['alertId'] = alertId
      ..['expiresAt'] = '2026-10-10T12:05:00Z'
      ..['mediaProfile'] = 'AUDIO_VIDEO';
    if (type == 'notification.callCancelled') data['reason'] = 'ended';
  }
  if (preview) {
    data
      ..['title'] = 'Ada'
      ..['body'] = 'Hello';
  }
  return data;
}

Map<String, Object?> gqlEnvelope(String field, String id, Object? result, {String status = 'ok'}) {
  final envelope = <String, Object?>{
    'status': status,
    'requestId': id,
    'serverTime': timestamp,
    'receiptId': null,
    'committedAt': null,
    'replayed': null,
    'operation': null,
    'resourceRef': null,
    'result': result,
  };
  if (status == 'committed') {
    envelope
      ..['receiptId'] = '33333333-3333-4333-8333-333333333333'
      ..['committedAt'] = timestamp
      ..['replayed'] = false;
  }
  return <String, Object?>{
    'data': <String, Object?>{field: envelope},
  };
}

http.Response jsonResponse(Map<String, Object?> body, {int status = 200, Map<String, String>? headers}) =>
    http.Response(jsonEncode(body), status, headers: headers ?? <String, String>{'content-type': 'application/json'});

/// A GraphQL error response carrying an authority problem.
Map<String, Object?> gqlError(
  String code, {
  int status = 409,
  String outcome = 'rejected',
  String? retryAfter,
}) => <String, Object?>{
  'errors': <Object?>[
    <String, Object?>{
      'message': code,
      'extensions': <String, Object?>{'code': code, 'status': status, 'outcome': outcome, 'retryAfter': ?retryAfter},
    },
  ],
  'data': null,
};

typedef RequestHandler = FutureOr<http.Response> Function(http.Request request, Map<String, Object?> body);

MockClient mockGraphQL(RequestHandler handler, {List<Map<String, Object?>>? bodies}) => MockClient((request) async {
  final body = jsonDecode(request.body) as Map<String, Object?>;
  bodies?.add(body);
  return handler(request, body);
});

ConvoHopClient clientWith(
  http.Client httpClient, {
  RecoveryStorage? storage,
  RealtimeConnector? realtime,
  int Function() clock = fixedClock,
}) => ConvoHopClient(
  baseUrl: 'https://authority.example',
  projectId: projectId,
  principalId: principalId,
  sessionToken: 'fake-session-token',
  incarnation: incarnation,
  recoveryStorage: storage,
  httpClient: httpClient,
  realtimeConnector: realtime,
  clock: clock,
);

Map<String, Object?> okFor(String operationName, String id, Map<String, Object?> input) {
  switch (operationName) {
    case 'CommunicationRoute':
      return gqlEnvelope('route', id, routeResult());
    case 'CommunicationCurrentSession':
      return gqlEnvelope('currentSession', id, session());
    case 'CommunicationGetConversation':
      return gqlEnvelope('getConversation', id, conversation());
    case 'CommunicationMessages':
      return gqlEnvelope('messages', id, <String, Object?>{
        'items': <Object?>[message()],
        'complete': true,
        'refreshRequired': false,
        'nextCursor': null,
      });
    case 'CommunicationGetMessage':
      return gqlEnvelope('getMessage', id, message());
    case 'CommunicationEvents':
      return gqlEnvelope('events', id, eventPage());
    case 'CommunicationReceipts':
      return gqlEnvelope('receipts', id, <String, Object?>{
        'items': <Object?>[receipt()],
        'complete': true,
        'refreshRequired': false,
        'nextCursor': null,
      });
    case 'CommunicationInbox':
      return gqlEnvelope('inbox', id, <String, Object?>{
        'items': <Object?>[
          <String, Object?>{
            'conversationId': conversationId,
            'title': 'General',
            'activityAt': timestamp,
            'visibilityEpoch': '1',
            'latestVisibleMessage': message(),
            'hasUnread': true,
          },
        ],
        'complete': true,
        'refreshRequired': false,
        'nextCursor': null,
        'partialReason': null,
      });
    case 'CommunicationSearch':
      return gqlEnvelope('search', id, <String, Object?>{
        'items': <Object?>[
          <String, Object?>{'conversationId': conversationId, 'message': message()},
        ],
        'complete': true,
        'refreshRequired': false,
        'nextCursor': null,
      });
    case 'CommunicationSendMessage':
      return gqlEnvelope('sendMessage', id, messageAck(), status: 'committed');
    case 'CommunicationEditMessage':
      return gqlEnvelope('editMessage', id, message(text: input['text'] as String), status: 'committed');
    case 'CommunicationDeleteMessage':
      return gqlEnvelope('deleteMessage', id, message(deleted: true), status: 'committed');
    case 'CommunicationReportReceipt':
      return gqlEnvelope(
        'reportReceipt',
        id,
        receipt(through: input['throughSequence'] as String),
        status: 'committed',
      );
    case 'CommunicationTyping':
      return gqlEnvelope('typing', id, <String, Object?>{'accepted': true});
    case 'CommunicationResolveRequest':
      return gqlEnvelope('resolveRequest', id, <String, Object?>{
        'requestId': input['requestId'],
        'state': 'notObservedYet',
        'checkedAt': timestamp,
        'resultWithheld': false,
        'receipt': null,
      });
    case 'CommunicationLiveSession':
      return gqlEnvelope('liveSession', id, liveSession());
    case 'CommunicationLiveSessionCredentials':
      return gqlEnvelope('liveSessionCredentials', id, grant(), status: 'committed');
    default:
      throw StateError('Unhandled operation $operationName');
  }
}

generated.OperationSpec<Object?> specByName(String operationName) {
  for (final spec in generated.operationCatalog.values) {
    if (spec.operationName == operationName) return spec;
  }
  throw StateError('Unknown operation $operationName');
}
