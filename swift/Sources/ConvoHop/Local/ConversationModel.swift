#if canImport(Combine)
    import Combine
    import Foundation

    /// One conversation for SwiftUI or UIKit: its messages, this user's outgoing messages, read receipts and connection
    /// state, kept current from the conversation's events.
    ///
    /// ``start()`` shows the local cache first when you pass a store, then loads the conversation, its newest messages
    /// and its read receipts, and follows its events. When ConvoHop can't be reached, or the session needs renewal, the
    /// model retries on its own. With an outbox, messages appear at the end of ``entries`` from the moment they're
    /// queued until ConvoHop stores them. Call ``stop()`` when the screen goes away.
    ///
    /// ConvoHop's client API has no presence and doesn't deliver other members' typing state. ``isConnected`` says
    /// whether this device follows the conversation in real time, and ``lastActivity(of:)`` derives when a member last
    /// sent or read a message.
    ///
    /// The first time a device follows a conversation, ConvoHop replays the conversation's events from the beginning
    /// before it delivers new ones in real time. The model skips events for messages older than those it loaded, but
    /// new messages from other members appear only once that replay finishes.
    @MainActor
    public final class ConvoHopConversationModel: ObservableObject {
        /// A row of the conversation.
        public enum Entry: Identifiable, Hashable, Sendable {
            /// A message ConvoHop stored.
            case message(Message)
            /// A message in the outbox that ConvoHop hasn't confirmed yet, or that isn't loaded yet.
            case outgoing(ConvoHopOutbox.Item)

            public var id: String {
                switch self {
                case .message(let message): return message.messageId
                case .outgoing(let item): return "outgoing:" + item.id.uuidString
                }
            }
        }

        public enum Phase: Hashable, Sendable {
            /// Not started, or stopped.
            case idle
            /// Loading the conversation.
            case loading
            /// Following the conversation's events.
            case live
            /// Waiting to try again. ``ConvoHopConversationModel/lastError`` says why; when it is a session error,
            /// renew the session. ``ConvoHopConversationModel/start()`` tries again at once.
            case retrying
            /// This user's authorized history changed and the model cleared its messages. Call
            /// ``ConvoHopConversationModel/resync()``.
            case resyncRequired
            /// This user left the conversation.
            case left
            /// The model stopped because of ``ConvoHopConversationModel/lastError``. Call
            /// ``ConvoHopConversationModel/start()`` to try again.
            case failed
        }

        public nonisolated let conversationId: String
        /// Loaded messages, oldest first, then outgoing messages in the order they were queued.
        @Published public private(set) var entries: [Entry] = []
        @Published public private(set) var phase: Phase = .idle
        /// The conversation, with this user's membership.
        @Published public private(set) var conversation: Conversation?
        /// Whether the model follows the conversation in real time. While it doesn't, it catches up from history.
        @Published public private(set) var isConnected = false
        /// Members' read and delivery positions, by principal ID.
        @Published public private(set) var receipts: [String: ReadReceipt] = [:]
        /// Whether messages older than the first loaded one may exist. Call ``loadOlder()``.
        @Published public private(set) var hasOlder = false
        /// The latest error. A later success doesn't clear it.
        @Published public private(set) var lastError: (any Error)?

        /// Sends this user's typing state. ``textChanged()`` and ``send(_:props:)`` drive it.
        public let typing: ConvoHopTypingIndicator
        /// Reports this user's read position. ``markRead()`` drives it.
        public let readReceipts: ConvoHopReadReceiptReporter
        private let client: ConvoHopClient
        private let store: ConvoHopLocalStore?
        private let outbox: ConvoHopOutbox?
        private let environment: ConvoHopEnvironment
        private var stream: ConversationStream?
        private var window: [Message] = []
        private var outgoing: [ConvoHopOutbox.Item] = []
        private var generation = 0
        private var connecting = false
        private var resyncing = false
        private var loadingOlder = false
        private var fetching: Set<String> = []
        private var outboxTask: Task<Void, Never>?
        private var connectionTask: Task<Void, Never>?
        private var retryTask: Task<Void, Never>?
        private var typingTask: Task<Void, Never>?

        private struct Wanted {
            var sequence: String
            var revision: String
            var revisionSequence: String?
        }

        /// A model of one conversation. Pass a store to show cached messages first and keep the cache current, and an
        /// outbox to send through it.
        public init(
            client: ConvoHopClient, conversationId: String, store: ConvoHopLocalStore? = nil,
            outbox: ConvoHopOutbox? = nil
        ) throws {
            let id = try ConvoHopClient.requireId(conversationId, "conversation")
            self.conversationId = id
            self.client = client
            self.store = store
            self.outbox = outbox
            environment = client.environment
            typing = try ConvoHopTypingIndicator(client: client, conversationId: id)
            readReceipts = try ConvoHopReadReceiptReporter(client: client, conversationId: id)
        }

        deinit {
            outboxTask?.cancel()
            connectionTask?.cancel()
            retryTask?.cancel()
            if let stream { Task { await stream.close() } }
        }

        // MARK: Lifecycle

        /// Shows cached messages, loads the conversation, then follows its events. It returns once the model is live
        /// or knows why it isn't. While the model is ``Phase/retrying``, it tries again at once.
        public func start() async {
            switch phase {
            case .loading, .live, .resyncRequired:
                return
            case .retrying:
                retryTask?.cancel()
                retryTask = nil
                await attempt(generation, failures: 0)
            case .idle, .left, .failed:
                await open(resync: false)
            }
        }

        /// Resynchronizes this user's authorized history after ``Phase/resyncRequired``.
        public func resync() async {
            guard phase == .resyncRequired else { return }
            await open(resync: true)
        }

        /// Stops following the conversation and reports that this user stopped typing. The loaded entries stay.
        public func stop() {
            generation += 1
            outboxTask?.cancel()
            outboxTask = nil
            shutDown(.idle)
        }

        private func open(resync: Bool) async {
            generation += 1
            let generation = self.generation
            phase = .loading
            resyncing = resync
            observeOutbox(generation)
            if resync {
                try? await store?.removeMessages(in: conversationId)
            } else if window.isEmpty, let store, let cached = try? await store.messages(in: conversationId),
                isCurrent(generation), window.isEmpty, !cached.isEmpty
            {
                window = cached
                hasOlder = true
                publish()
            }
            guard isCurrent(generation) else { return }
            await attempt(generation, failures: 0)
        }

        private func attempt(_ generation: Int, failures: Int) async {
            guard isCurrent(generation), !connecting else { return }
            connecting = true
            defer { connecting = false }
            do {
                try await connect(generation)
            } catch {
                guard isCurrent(generation) else { return }
                lastError = error
                if (error as? ConvoHopReplayError) == .resyncRequired {
                    requireResync()
                    return
                }
                guard Self.isTransient(error) else {
                    phase = .failed
                    return
                }
                phase = .retrying
                let base = min(30_000, 1_000 << min(failures, 5))
                let delay = base + environment.random(base / 5 + 1), sleep = environment.sleep
                retryTask = Task { [weak self] in
                    do { try await sleep(delay) } catch { return }
                    await self?.attempt(generation, failures: failures + 1)
                }
            }
        }

        private func connect(_ generation: Int) async throws {
            let conversation = try await client.getConversation(conversationId)
            guard isCurrent(generation) else { return }
            setConversation(conversation)
            let page = try await client.messages(in: conversationId)
            guard isCurrent(generation) else { return }
            if page.refreshRequired { throw ConvoHopReplayError.resyncRequired }
            window = Self.ordered(page.items.filter { $0.conversationId == conversationId })
            hasOlder = !page.complete
            publish()
            try? await store?.replaceMessages(window, in: conversationId)
            guard isCurrent(generation) else { return }
            await loadReceipts(generation)
            guard isCurrent(generation) else { return }
            let apply: @Sendable ([Event]) async throws -> Void = { [weak self] events in
                try await self?.apply(events, generation)
            }
            let onError: @Sendable (any Error) -> Void = { [weak self] error in
                guard let self else { return }
                Task { @MainActor in self.streamFailed(error, generation) }
            }
            let stream =
                resyncing
                ? try await client.resyncAuthorizedHistory(conversationId, apply: apply, onError: onError)
                : try await client.watch(conversationId, apply: apply, onError: onError)
            guard isCurrent(generation) else {
                await stream.close()
                return
            }
            self.stream = stream
            resyncing = false
            phase = .live
            observeConnection(stream, generation)
        }

        private func shutDown(_ phase: Phase) {
            connectionTask?.cancel()
            connectionTask = nil
            retryTask?.cancel()
            retryTask = nil
            let stream = self.stream
            self.stream = nil
            isConnected = false
            self.phase = phase
            if let stream { Task { await stream.close() } }
            chainTyping { await $0.stop() }
        }

        private func requireResync() {
            shutDown(.resyncRequired)
            resyncing = true
            window = []
            receipts = [:]
            hasOlder = false
            publish()
            let store = self.store, id = conversationId
            Task { try? await store?.removeMessages(in: id) }
        }

        private func leave() {
            shutDown(.left)
            window = []
            receipts = [:]
            hasOlder = false
            publish()
            let store = self.store, id = conversationId
            Task { try? await store?.removeMessages(in: id) }
        }

        private func streamFailed(_ error: any Error, _ generation: Int) {
            guard isCurrent(generation) else { return }
            lastError = error
            if (error as? ConvoHopReplayError) == .resyncRequired {
                requireResync()
                return
            }
            guard let stream else { return }
            Task { [weak self] in
                guard await stream.isClosed, let self, self.isCurrent(generation), self.stream === stream else { return }
                // The stream retries transient failures itself, so a closed stream failed for good.
                self.shutDown(.failed)
            }
        }

        private func isCurrent(_ generation: Int) -> Bool {
            generation == self.generation && (phase == .loading || phase == .live || phase == .retrying)
        }

        static func isTransient(_ error: any Error) -> Bool {
            guard let error = error as? ConvoHopError else { return false }
            // Session errors last until the app renews the session; the client then admits requests again.
            return error.isRetryable || ConvoHopOutbox.sessionCodes.contains(error.code)
        }

        // MARK: Actions

        /// Loads up to 100 messages older than the first loaded one.
        public func loadOlder() async {
            guard hasOlder, !loadingOlder, phase != .resyncRequired, phase != .left else { return }
            loadingOlder = true
            defer { loadingOlder = false }
            let generation = self.generation
            do {
                let page = try await client.messages(in: conversationId, before: window.first?.sequence)
                guard generation == self.generation, phase != .resyncRequired, phase != .left else { return }
                if page.refreshRequired {
                    requireResync()
                    return
                }
                merge(page.items)
                hasOlder = !page.complete
                publish()
            } catch {
                if generation == self.generation { lastError = error }
            }
        }

        /// Sends a message and reports that this user stopped typing.
        ///
        /// With an outbox, the message appears in ``entries`` at once and survives restarts and lost connectivity.
        /// Without one, it's sent directly and appears once ConvoHop confirms it; an error with an `unknown` outcome
        /// leaves it unclear whether ConvoHop stored it.
        public func send(_ text: String, props: JSONObject = [:]) async throws {
            chainTyping { await $0.stop() }
            if let outbox {
                let item = try await outbox.enqueue(text, to: conversationId, props: props)
                if !outgoing.contains(where: { $0.id == item.id }) {
                    outgoing.append(item)
                    publish()
                }
                return
            }
            let receipt = try await client.send(text, to: conversationId, props: props)
            let generation = self.generation
            guard let message = try? await client.getMessage(receipt.messageId, in: conversationId),
                generation == self.generation, phase != .resyncRequired, phase != .left
            else { return }
            merge([message])
            publish()
            try? await store?.save([message], in: conversationId)
        }

        /// Notes an edit of the composer, so other members can learn that this user is typing.
        public func textChanged() {
            chainTyping { await $0.textChanged() }
        }

        /// Reports that this user read every loaded message.
        public func markRead() {
            guard let last = window.last?.sequence else { return }
            let reporter = readReceipts
            Task { try? await reporter.markRead(through: last) }
        }

        /// When a member last sent a loaded message or reported a read or delivery position, if known. ConvoHop has no
        /// presence, so use it only for "last seen" hints.
        public func lastActivity(of principalId: String) -> Date? {
            let sent = window.last(where: { $0.authorId == principalId }).flatMap { RFC3339.date($0.createdAt) }
            let read = receipts[principalId]?.updatedAt.flatMap { RFC3339.date($0) }
            return [sent, read].compactMap { $0 }.max()
        }

        /// Runs typing updates one at a time, in call order.
        private func chainTyping(_ update: @escaping @Sendable (ConvoHopTypingIndicator) async -> Void) {
            let previous = typingTask, typing = self.typing
            typingTask = Task {
                await previous?.value
                await update(typing)
            }
        }

        // MARK: Events

        private func apply(_ events: [Event], _ generation: Int) async throws {
            guard isCurrent(generation) else { return }
            var wanted: [String: Wanted] = [:]
            var refresh = false
            var left = false
            for event in events where event.conversationId == conversationId {
                let type = ConversationEventType(rawValue: event.type)
                let payload = event.payload
                switch type {
                case .messageCreated, .messageEdited, .messageDeleted:
                    guard let messageId = payload?.messageId, let revision = payload?.revision,
                        ProtocolChecks.isCanonicalUUID(messageId), ProtocolChecks.isCanonicalDecimal(revision)
                    else { continue }
                    if var want = wanted[messageId] {
                        if ProtocolChecks.compareCounters(want.revision, revision) < 0 {
                            want.revision = revision
                            want.revisionSequence = payload?.revisionSequence
                            wanted[messageId] = want
                        }
                    } else if let current = message(messageId) {
                        if ProtocolChecks.compareCounters(current.revision, revision) < 0 {
                            wanted[messageId] = Wanted(
                                sequence: current.sequence, revision: revision,
                                revisionSequence: payload?.revisionSequence)
                        }
                    } else if type == .messageCreated {
                        // Older messages than the loaded ones load on demand, so the first replay costs no fetches.
                        if hasOlder, let oldest = window.first,
                            ProtocolChecks.compareCounters(event.sequence, oldest.sequence) < 0
                        {
                            continue
                        }
                        wanted[messageId] = Wanted(
                            sequence: event.sequence, revision: revision, revisionSequence: payload?.revisionSequence)
                    }
                case .receiptReported:
                    applyReceipt(event)
                case .memberRemoved:
                    guard let principal = payload?.principalId else { continue }
                    if principal == client.principalId {
                        left = true
                    } else if let current = receipts[principal] {
                        let epoch = payload?.membershipEpoch
                        if epoch.map({
                            !ProtocolChecks.isCanonicalDecimal($0)
                                || ProtocolChecks.compareCounters($0, current.membershipEpoch) >= 0
                        }) ?? true {
                            receipts[principal] = nil
                        }
                    }
                case .memberAdded, .memberRoleChanged, .memberBroadcastPermissionChanged, .memberHistoryExpanded:
                    guard payload?.principalId == client.principalId else { continue }
                    if type == .memberAdded { left = false }
                    if type == .memberHistoryExpanded { hasOlder = true }
                    refresh = true
                case .conversationUpdated:
                    refresh = true
                default:
                    continue
                }
            }
            if left {
                leave()
                return
            }
            if !wanted.isEmpty { try await fetch(wanted, generation) }
            guard isCurrent(generation) else { return }
            if refresh {
                do {
                    let conversation = try await client.getConversation(conversationId)
                    if isCurrent(generation) { setConversation(conversation) }
                } catch {
                    if isCurrent(generation) { lastError = error }
                }
            }
            publish()
        }

        /// Loads the messages that events created or changed: a few one by one, more by pages from the newest.
        private func fetch(_ wanted: [String: Wanted], _ generation: Int) async throws {
            var remaining = wanted
            var found: [Message] = []
            var hidden = Set<String>()
            if remaining.count > 3,
                let oldest = remaining.values.map(\.sequence).min(by: { ProtocolChecks.compareCounters($0, $1) < 0 })
            {
                var before: String?
                for _ in 0..<10 {
                    let page = try await client.messages(in: conversationId, before: before)
                    guard isCurrent(generation) else { return }
                    if page.refreshRequired { throw ConvoHopReplayError.resyncRequired }
                    for message in page.items where remaining[message.messageId] != nil {
                        remaining[message.messageId] = nil
                        found.append(message)
                    }
                    guard !remaining.isEmpty, !page.complete, let next = page.nextCursor,
                        ProtocolChecks.compareCounters(next, oldest) > 0
                    else { break }
                    before = next
                }
            }
            for (messageId, want) in remaining {
                do {
                    if let message = try await client.getMessage(messageId, in: conversationId) {
                        found.append(message)
                    } else {
                        hidden.insert(messageId)
                    }
                } catch let error as ConvoHopError where error.code == .notFound {
                    hidden.insert(messageId)
                } catch let error as ConvoHopError where error.code == .messageDeleted {
                    if let tombstone = tombstone(messageId, want) { found.append(tombstone) }
                }
                guard isCurrent(generation) else { return }
            }
            merge(found)
            if !hidden.isEmpty { window.removeAll { hidden.contains($0.messageId) } }
            try? await store?.save(found.filter { $0.conversationId == conversationId }, in: conversationId)
            if !hidden.isEmpty { try? await store?.remove(messageIds: hidden, in: conversationId) }
        }

        /// A deleted message as ConvoHop shows it, when only the deletion's revision is known.
        private func tombstone(_ messageId: String, _ want: Wanted) -> Message? {
            guard var message = message(messageId) else { return nil }
            message.deleted = true
            message.text = ""
            message.props = [:]
            message.revision = want.revision
            if let sequence = want.revisionSequence, ProtocolChecks.isCanonicalDecimal(sequence) {
                message.revisionSequence = sequence
            }
            return message
        }

        private func applyReceipt(_ event: Event) {
            guard let payload = event.payload, let principal = payload.principalId,
                ProtocolChecks.isCanonicalUUID(principal), let membershipEpoch = payload.membershipEpoch,
                let visibilityEpoch = payload.visibilityEpoch, let through = payload.throughSequence,
                payload.kind == "read" || payload.kind == "delivered"
            else { return }
            let receipt = ReadReceipt(
                principalId: principal, membershipEpoch: membershipEpoch, visibilityEpoch: visibilityEpoch,
                deliveredThroughSequence: payload.kind == "delivered" ? through : nil,
                readThroughSequence: payload.kind == "read" ? through : nil, updatedAt: event.occurredAt)
            guard Self.isValid(receipt) else { return }
            receipts[principal] = Self.merge(receipts[principal], receipt)
        }

        private func loadReceipts(_ generation: Int) async {
            var loaded: [String: ReadReceipt] = [:]
            var cursor: String?
            do {
                for _ in 0..<5 {
                    let page = try await client.receipts(in: conversationId, cursor: cursor)
                    guard isCurrent(generation) else { return }
                    for receipt in page.items where Self.isValid(receipt) {
                        loaded[receipt.principalId] = Self.merge(loaded[receipt.principalId], receipt)
                    }
                    guard !page.complete, let next = page.nextCursor else { break }
                    cursor = next
                }
            } catch {
                if isCurrent(generation) { lastError = error }
                return
            }
            receipts = loaded
        }

        // MARK: Outbox and connection

        private func observeOutbox(_ generation: Int) {
            outboxTask?.cancel()
            guard let outbox else { return }
            outboxTask = Task { [weak self] in
                for await snapshot in await outbox.updates() {
                    guard let self, self.generation == generation else { return }
                    self.outboxChanged(snapshot, generation)
                }
            }
        }

        private func outboxChanged(_ snapshot: ConvoHopOutbox.Snapshot, _ generation: Int) {
            outgoing = snapshot.items.filter { $0.conversationId == conversationId }
            publish()
            guard isCurrent(generation) else { return }
            // Load sent messages now rather than when their events arrive, so they never vanish when the outbox
            // forgets them.
            let loaded = Set(window.map(\.messageId))
            for item in outgoing where item.state == .sent {
                guard let messageId = item.messageId, !loaded.contains(messageId),
                    fetching.insert(messageId).inserted
                else { continue }
                Task { [weak self] in await self?.fetchSent(messageId, generation) }
            }
        }

        private func fetchSent(_ messageId: String, _ generation: Int) async {
            defer { fetching.remove(messageId) }
            guard let message = try? await client.getMessage(messageId, in: conversationId), isCurrent(generation)
            else { return }
            merge([message])
            publish()
            try? await store?.save([message], in: conversationId)
        }

        private func observeConnection(_ stream: ConversationStream, _ generation: Int) {
            connectionTask?.cancel()
            connectionTask = Task { [weak self] in
                for await connected in await stream.connectionChanges() {
                    guard let self, self.isCurrent(generation) else { return }
                    self.isConnected = connected
                }
            }
        }

        // MARK: State

        private func setConversation(_ conversation: Conversation) {
            self.conversation = conversation
            guard let membership = conversation.membership else { return }
            let reporter = readReceipts
            Task { await reporter.update(membership: membership) }
        }

        private func message(_ messageId: String) -> Message? {
            window.first { $0.messageId == messageId }
        }

        private func merge(_ messages: [Message]) {
            let incoming = messages.filter { $0.conversationId == conversationId }
            guard !incoming.isEmpty else { return }
            window = ConvoHopLocalStore.merge(window, incoming, limit: Int.max)
        }

        private func publish() {
            let loaded = Set(window.map(\.messageId))
            var rows = window.map(Entry.message)
            for item in outgoing where !(item.messageId.map(loaded.contains) ?? false) {
                rows.append(.outgoing(item))
            }
            if rows != entries { entries = rows }
        }

        static func ordered(_ messages: [Message]) -> [Message] {
            ConvoHopLocalStore.merge([], messages, limit: Int.max)
        }

        static func isValid(_ receipt: ReadReceipt) -> Bool {
            ProtocolChecks.isCanonicalUUID(receipt.principalId)
                && ProtocolChecks.isCanonicalDecimal(receipt.membershipEpoch)
                && ProtocolChecks.isCanonicalDecimal(receipt.visibilityEpoch)
                && (receipt.readThroughSequence.map(ProtocolChecks.isCanonicalDecimal) ?? true)
                && (receipt.deliveredThroughSequence.map(ProtocolChecks.isCanonicalDecimal) ?? true)
        }

        /// Combines two receipts of one member. A newer membership or visibility epoch starts over; within one epoch,
        /// positions only move forward.
        static func merge(_ current: ReadReceipt?, _ incoming: ReadReceipt) -> ReadReceipt {
            guard let current else { return incoming }
            let membership = ProtocolChecks.compareCounters(incoming.membershipEpoch, current.membershipEpoch)
            let visibility = ProtocolChecks.compareCounters(incoming.visibilityEpoch, current.visibilityEpoch)
            if membership > 0 || (membership == 0 && visibility > 0) { return incoming }
            if membership < 0 || visibility < 0 { return current }
            var merged = current
            merged.readThroughSequence = later(current.readThroughSequence, incoming.readThroughSequence)
            merged.deliveredThroughSequence = later(current.deliveredThroughSequence, incoming.deliveredThroughSequence)
            if let updated = incoming.updatedAt,
                (current.updatedAt.flatMap(RFC3339.milliseconds) ?? Int.min) < (RFC3339.milliseconds(updated) ?? Int.min)
            {
                merged.updatedAt = updated
            }
            return merged
        }

        private static func later(_ left: String?, _ right: String?) -> String? {
            guard let left else { return right }
            guard let right else { return left }
            return ProtocolChecks.compareCounters(left, right) >= 0 ? left : right
        }
    }
#endif
