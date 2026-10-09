import 'store.dart';

/// Members' recent activity in a conversation, from what its store holds.
///
/// ConvoHop doesn't publish online status to clients. This reflects what
/// members visibly did in this conversation, the messages they wrote or
/// edited and the receipts they reported, so treat it as "recently active",
/// not "online". It only covers what the store has loaded.
extension ConversationActivity on ConversationSnapshot {
  /// When each member last wrote, edited or reported a receipt here, in UTC.
  Map<String, DateTime> get lastActive {
    final result = <String, DateTime>{};
    void note(String principalId, String? at) {
      final time = at == null ? null : DateTime.tryParse(at)?.toUtc();
      if (time == null) return;
      final current = result[principalId];
      if (current == null || time.isAfter(current)) result[principalId] = time;
    }

    for (final message in messages) {
      note(message.authorId, message.createdAt);
      note(message.authorId, message.editedAt);
    }
    for (final receipt in receipts.values) {
      note(receipt.principalId, receipt.updatedAt);
    }
    return Map<String, DateTime>.unmodifiable(result);
  }

  /// Whether [principalId] was active here within [within] of [now].
  bool isRecentlyActive(String principalId, {Duration within = const Duration(minutes: 5), DateTime? now}) {
    final last = lastActive[principalId];
    return last != null && (now ?? DateTime.now()).toUtc().difference(last) <= within;
  }
}
