import Foundation

/// A per-user cache of each conversation's newest messages and of the inbox, so screens can show content before the
/// network answers and while the device is offline.
///
/// The cache is never the source of truth. Show it, then load from the server and replace or merge. Entries written
/// under another data incarnation, and entries that fail to decode or validate, read as empty and are removed.
///
/// The store writes message text and properties to `storage` exactly as the server sent them. Use storage that your app
/// protects at rest, such as ``FileRecoveryStorage`` (excluded from backups and, on iOS, protected until the first unlock
/// after a restart), and call ``removeAll()`` when the user signs out. ``removeAll()`` finds conversations through an
/// index entry; to erase everything regardless of the index, delete the storage itself.
public actor ConvoHopLocalStore {
    /// The most messages kept per conversation. Newer messages push out older ones.
    public nonisolated let messageLimit: Int
    private let storage: any RecoveryStorage
    private let namespace: String
    private let incarnation: String
    private var tail: Task<Void, Never>?

    private struct MessagesEntry: Codable {
        var incarnation: String
        var messages: [Message]
    }

    private struct InboxEntry: Codable {
        var incarnation: String
        var items: [InboxItem]
    }

    /// A store for `client`'s project, user and data incarnation. `messageLimit` must be 1...10000.
    public init(client: ConvoHopClient, storage: any RecoveryStorage, messageLimit: Int = 200) throws {
        guard (1...10_000).contains(messageLimit) else { throw ConvoHopUsageError("The message limit must be 1...10000") }
        self.messageLimit = messageLimit
        self.storage = storage
        namespace = client.projectId + ":" + client.principalId
        incarnation = client.incarnation
    }

    // MARK: Messages

    /// A conversation's cached messages, oldest first.
    public func messages(in conversationId: String) async throws -> [Message] {
        let id = try ConvoHopClient.requireId(conversationId, "conversation")
        return try await serialized { try await self.loadMessages(id) }
    }

    /// Merges messages into a conversation's cache. A cached copy with a newer revision wins.
    public func save(_ messages: [Message], in conversationId: String) async throws {
        let id = try ConvoHopClient.requireId(conversationId, "conversation")
        guard Self.isValid(messages, in: id, ordered: false) else {
            throw ConvoHopUsageError("Messages must belong to the conversation and come from the server")
        }
        guard !messages.isEmpty else { return }
        try await serialized {
            let merged = Self.merge(try await self.loadMessages(id), messages, limit: self.messageLimit)
            try await self.storeMessages(merged, in: id)
        }
    }

    /// Replaces a conversation's cache, for example with a fresh page of its newest messages.
    public func replaceMessages(_ messages: [Message], in conversationId: String) async throws {
        let id = try ConvoHopClient.requireId(conversationId, "conversation")
        guard Self.isValid(messages, in: id, ordered: false) else {
            throw ConvoHopUsageError("Messages must belong to the conversation and come from the server")
        }
        try await serialized {
            let merged = Self.merge([], messages, limit: self.messageLimit)
            if merged.isEmpty {
                try await self.remove(self.messagesKey(id))
            } else {
                try await self.storeMessages(merged, in: id)
            }
        }
    }

    /// Removes some messages from a conversation's cache.
    public func remove(messageIds: Set<String>, in conversationId: String) async throws {
        let id = try ConvoHopClient.requireId(conversationId, "conversation")
        guard !messageIds.isEmpty else { return }
        try await serialized {
            let cached = try await self.loadMessages(id)
            let kept = cached.filter { !messageIds.contains($0.messageId) }
            guard kept.count != cached.count else { return }
            if kept.isEmpty {
                try await self.remove(self.messagesKey(id))
            } else {
                try await self.storeMessages(kept, in: id)
            }
        }
    }

    /// Removes a conversation's cached messages, for example after the user leaves it or its history must be
    /// resynchronized.
    public func removeMessages(in conversationId: String) async throws {
        let id = try ConvoHopClient.requireId(conversationId, "conversation")
        try await serialized { try await self.remove(self.messagesKey(id)) }
    }

    // MARK: Inbox

    /// The cached inbox, in the order it was saved.
    public func inbox() async throws -> [InboxItem] {
        try await serialized { try await self.loadInbox() }
    }

    /// Replaces the cached inbox.
    public func saveInbox(_ items: [InboxItem]) async throws {
        guard items.allSatisfy({ ProtocolChecks.isCanonicalUUID($0.conversationId) }),
            Set(items.map(\.conversationId)).count == items.count
        else { throw ConvoHopUsageError("Inbox items must come from the server, one per conversation") }
        try await serialized {
            try await self.write(InboxEntry(incarnation: self.incarnation, items: items), key: self.inboxKey)
        }
    }

    // MARK: Erasing

    /// Removes every cached conversation and the inbox. Call it when the user signs out.
    public func removeAll() async throws {
        try await serialized {
            for id in try await self.loadIndex() { try await self.remove(self.messagesKey(id)) }
            try await self.remove(self.inboxKey)
            try await self.remove(self.indexKey)
        }
    }

    // MARK: Internals

    static func merge(_ cached: [Message], _ incoming: [Message], limit: Int) -> [Message] {
        var byId: [String: Message] = [:]
        for message in cached { byId[message.messageId] = message }
        for message in incoming {
            if let current = byId[message.messageId],
                ProtocolChecks.compareCounters(current.revision, message.revision) > 0
            {
                continue
            }
            byId[message.messageId] = message
        }
        let ordered = byId.values.sorted { ProtocolChecks.compareCounters($0.sequence, $1.sequence) < 0 }
        return Array(ordered.suffix(limit))
    }

    static func isValid(_ messages: [Message], in conversationId: String, ordered: Bool) -> Bool {
        var seen = Set<String>()
        var previous: String?
        for message in messages {
            guard message.conversationId == conversationId, ProtocolChecks.isCanonicalUUID(message.messageId),
                ProtocolChecks.isCanonicalUUID(message.authorId),
                ProtocolChecks.isCanonicalDecimal(message.sequence), ProtocolChecks.isCanonicalDecimal(message.revision),
                ProtocolChecks.isCanonicalDecimal(message.revisionSequence),
                seen.insert(message.messageId).inserted
            else { return false }
            if ordered {
                if let previous, ProtocolChecks.compareCounters(previous, message.sequence) >= 0 { return false }
                previous = message.sequence
            }
        }
        return true
    }

    private var inboxKey: String { "convohop.local.inbox:" + namespace }
    private var indexKey: String { "convohop.local.index:" + namespace }

    private func messagesKey(_ conversationId: String) -> String {
        "convohop.local.messages:" + namespace + ":" + conversationId
    }

    private func loadMessages(_ id: String) async throws -> [Message] {
        let key = messagesKey(id)
        guard let text = try await read(key) else { return [] }
        if let entry = try? JSONDecoder().decode(MessagesEntry.self, from: Data(text.utf8)),
            entry.incarnation == incarnation, entry.messages.count <= messageLimit,
            Self.isValid(entry.messages, in: id, ordered: true)
        {
            return entry.messages
        }
        try await remove(key)
        return []
    }

    private func storeMessages(_ messages: [Message], in id: String) async throws {
        // Index first, so a crash never leaves messages that removeAll() can't find.
        var index = try await loadIndex()
        if !index.contains(id) {
            index.append(id)
            try await write(index, key: indexKey)
        }
        try await write(MessagesEntry(incarnation: incarnation, messages: messages), key: messagesKey(id))
    }

    private func loadInbox() async throws -> [InboxItem] {
        guard let text = try await read(inboxKey) else { return [] }
        if let entry = try? JSONDecoder().decode(InboxEntry.self, from: Data(text.utf8)), entry.incarnation == incarnation {
            return entry.items
        }
        try await remove(inboxKey)
        return []
    }

    private func loadIndex() async throws -> [String] {
        guard let text = try await read(indexKey),
            let ids = try? JSONDecoder().decode([String].self, from: Data(text.utf8))
        else { return [] }
        return ids.filter(ProtocolChecks.isCanonicalUUID)
    }

    private func read(_ key: String) async throws -> String? {
        do {
            return try await storage.value(forKey: key)
        } catch {
            throw Self.storageFailure(error, "Local store could not read its storage", outcome: .rejected)
        }
    }

    private func write<T: Encodable>(_ value: T, key: String) async throws {
        let text: String
        do {
            text = String(decoding: try JSONEncoder().encode(value), as: UTF8.self)
        } catch {
            throw Self.storageFailure(error, "Local store could not encode the value", outcome: .rejected)
        }
        do {
            try await storage.setValue(text, forKey: key)
        } catch {
            throw Self.storageFailure(error, "Local store storage did not confirm the write", outcome: .unknown)
        }
    }

    private func remove(_ key: String) async throws {
        do {
            try await storage.removeValue(forKey: key)
        } catch {
            throw Self.storageFailure(error, "Local store storage did not confirm the removal", outcome: .unknown)
        }
    }

    private static func storageFailure(_ error: any Error, _ message: String, outcome: ConvoHopOutcome) -> ConvoHopError {
        ConvoHopError(
            code: .recoveryStorageFailure, requestId: newRequestId(), outcome: outcome, status: nil, message: message,
            underlyingError: error)
    }

    /// Runs operations one at a time, in call order, so concurrent read-modify-write calls can't lose updates.
    private func serialized<T: Sendable>(_ operation: @escaping @Sendable () async throws -> T) async throws -> T {
        let previous = tail
        let task = Task<T, any Error> {
            await previous?.value
            return try await operation()
        }
        tail = Task { _ = await task.result }
        return try await task.value
    }
}
