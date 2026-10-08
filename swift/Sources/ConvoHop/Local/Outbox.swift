import Foundation

/// A durable queue of outgoing messages. It sends them in order per conversation, survives restarts and waits out
/// lost connectivity, so screens can show a message the moment the user sends it.
///
/// Each message keeps one request ID across its retries, so a resend after an uncertain outcome can't post it twice.
/// The outbox gives a message a new request ID on its own only after ConvoHop confirmed that it never saw the previous
/// one and every earlier attempt was refused outright. When an attempt's outcome stays unknown and ConvoHop hasn't seen
/// the request, the item becomes ``State/unresolved``: the outbox rechecks it when connectivity returns, and
/// ``resend(_:)`` sends it again under a new request ID once the user or app accepts the small risk of a duplicate.
///
/// The queue is saved in the client's recovery storage, with the message text, so use storage your app protects at
/// rest and call ``removeAll()`` when the user signs out. Without recovery storage the queue lives in memory only.
///
/// The outbox never renews the session. When a send fails because the session needs renewal, the whole queue pauses
/// and ``pauseReason`` holds the error: call ``ConvoHopClient/refreshSession()``, then ``resume()``.
public actor ConvoHopOutbox {
    /// One outgoing message.
    public struct Item: Hashable, Sendable, Identifiable {
        /// A local identity that stays the same for the item's lifetime.
        public let id: UUID
        /// The request ID of the current attempt.
        public let requestId: String
        public let conversationId: String
        public let text: String
        public let props: JSONObject
        public let createdAt: Date
        public let state: State
        /// The server's message ID, once the message is stored.
        public let messageId: String?
        /// The message's sequence, when the server returned it.
        public let sequence: String?
        /// Why the latest attempt didn't succeed, if it didn't.
        public let failure: Failure?
    }

    public enum State: String, Hashable, Sendable, Codable {
        /// Waiting to be sent, or to be retried after a delay.
        case queued
        /// An attempt is in flight.
        case sending
        /// ConvoHop stored the message. Sent items leave the queue after a minute.
        case sent
        /// ConvoHop refused the message. ``ConvoHopOutbox/resend(_:)`` or ``ConvoHopOutbox/discard(_:)`` it.
        case failed
        /// The outbox couldn't learn whether ConvoHop stored the message. It rechecks when connectivity returns;
        /// ``ConvoHopOutbox/resend(_:)`` or ``ConvoHopOutbox/discard(_:)`` it.
        case unresolved
    }

    /// Why an attempt didn't succeed.
    public struct Failure: Hashable, Sendable {
        /// The ConvoHop error code, when the failure came from ConvoHop.
        public let code: ConvoHopErrorCode?
        public let message: String
    }

    /// The queue at one moment.
    public struct Snapshot: Sendable {
        /// Every item, in the order it was queued.
        public let items: [Item]
        /// The error that paused the queue, if it is paused.
        public let pauseReason: ConvoHopError?
        /// Whether the network monitor reports a usable network.
        public let isReachable: Bool
    }

    struct Entry: Codable, Sendable {
        var id: UUID
        var requestId: String
        var conversationId: String
        var text: String
        var props: JSONObject
        var createdAt: Int
        var state: State
        var messageId: String?
        var sequence: String?
        var failureCode: String?
        var failureMessage: String?
        /// An attempt may have reached ConvoHop without a definite answer.
        var uncertain = false
        /// The request ID can't be sent again; look up its outcome first.
        var mustResolve = false
        var rotations = 0
        /// The incarnation the current request ID was first submitted in.
        var submittedIncarnation: String?
        var notBefore = 0
        var failures = 0
        var sentAt: Int?

        enum CodingKeys: String, CodingKey {
            case id, requestId, conversationId, text, props, createdAt, state, messageId, sequence, failureCode
            case failureMessage, uncertain, mustResolve, rotations, submittedIncarnation
        }
    }

    private struct Saved: Codable {
        var items: [Entry]
    }

    /// The most unsent items the queue holds.
    public nonisolated let capacity: Int
    private let client: ConvoHopClient
    private let network: any ConvoHopNetworkMonitor
    private let storage: (any RecoveryStorage)?
    private let environment: ConvoHopEnvironment
    private let incarnation: String
    private let storageKey: String

    private var entries: [Entry] = []
    private var loaded = false
    private var loading: Task<Void, any Error>?
    private var started = false
    private var reachable = false
    private var forced = false
    /// The error that paused the queue. Fix its cause, then call ``resume()``.
    public private(set) var pauseReason: ConvoHopError?
    private var inFlight: UUID?
    private var attemptTask: Task<Void, Never>?
    private var timer: (id: UUID, task: Task<Void, Never>)?
    private var monitorTask: Task<Void, Never>?
    private var recheckTask: (id: UUID, task: Task<Void, Never>)?
    private var writes: Task<Void, any Error>?
    private var observers: [UUID: AsyncStream<Snapshot>.Continuation] = [:]

    static let sentRetention = 60_000
    static let maximumRotations = 2
    static let sessionCodes: Set<ConvoHopErrorCode> = [
        .unauthenticated, .sessionRefreshFailed, .sessionRefreshRejected, .sessionRefreshRequired,
        .sessionRefreshUnverified,
    ]
    static let unconfirmed = "ConvoHop couldn't confirm whether this message was sent"

    /// An outbox for `client`'s user. `capacity` must be 1...10000.
    ///
    /// Without a `network` monitor, the outbox uses `NWPathMonitor`. It sends nothing until ``start()``.
    public init(client: ConvoHopClient, network: (any ConvoHopNetworkMonitor)? = nil, capacity: Int = 500) throws {
        guard (1...10_000).contains(capacity) else { throw ConvoHopUsageError("The outbox capacity must be 1...10000") }
        self.client = client
        self.capacity = capacity
        #if canImport(Network)
            self.network = network ?? SystemNetworkMonitor()
        #else
            self.network = network ?? AlwaysReachableNetworkMonitor()
        #endif
        storage = client.storage
        environment = client.environment
        incarnation = client.incarnation
        storageKey = "convohop.outbox:" + client.projectId + ":" + client.principalId
    }

    deinit {
        attemptTask?.cancel()
        timer?.task.cancel()
        monitorTask?.cancel()
        recheckTask?.task.cancel()
        for observer in observers.values { observer.finish() }
    }

    // MARK: Lifecycle

    /// Loads the saved queue and starts sending. Calling it again does nothing.
    ///
    /// It throws `RECOVERY_STORAGE_FAILURE` when the saved queue can't be read. The outbox never drops it silently:
    /// retry, or call ``removeAll()`` to discard it.
    public func start() async throws {
        try await ensureLoaded()
        guard !started else { return }
        started = true
        let changes = network.reachability()
        monitorTask = Task { [weak self] in
            for await reachable in changes {
                guard let self else { return }
                await self.setReachable(reachable)
            }
        }
        recheckUnresolved()
        schedule()
    }

    /// Stops starting attempts. An attempt in flight finishes. The queue stays saved.
    public func stop() {
        started = false
        reachable = false
        forced = false
        monitorTask?.cancel()
        monitorTask = nil
        timer?.task.cancel()
        timer = nil
        recheckTask?.task.cancel()
        recheckTask = nil
        emit()
    }

    // MARK: Queue

    /// Queues a message and returns it at once, for an optimistic display.
    ///
    /// If the queue can't be saved, the item stays queued in memory and ``Item/failure`` says why.
    @discardableResult
    public func enqueue(_ text: String, to conversationId: String, props: JSONObject = [:]) async throws -> Item {
        let conversation = try ConvoHopClient.requireId(conversationId, "conversation")
        guard (try? JSONEncoder().encode(props)) != nil else {
            throw ConvoHopUsageError("Message properties must be finite JSON values")
        }
        try await ensureLoaded()
        guard entries.lazy.filter({ $0.state != .sent }).count < capacity else {
            throw ConvoHopUsageError("The outbox is full; wait for queued messages to send, or discard some")
        }
        let entry = Entry(
            id: UUID(), requestId: newRequestId(), conversationId: conversation, text: text, props: props,
            createdAt: environment.now(), state: .queued)
        entries.append(entry)
        emit()
        do {
            try await persist()
        } catch {
            if let index = position(of: entry.id) { entries[index].note(error) }
            emit()
        }
        schedule()
        return Self.item(self.entry(entry.id) ?? entry)
    }

    /// Every item, or one conversation's items, in the order they were queued.
    public func items(in conversationId: String? = nil) async throws -> [Item] {
        try await ensureLoaded()
        return entries.filter { conversationId == nil || $0.conversationId == conversationId }.map(Self.item)
    }

    /// The queue now.
    public var snapshot: Snapshot {
        Snapshot(items: entries.map(Self.item), pauseReason: pauseReason, isReachable: reachable)
    }

    /// The current snapshot, then one after each change. When updates arrive faster than you read them, you get the
    /// newest.
    public func updates() -> AsyncStream<Snapshot> {
        let (stream, continuation) = AsyncStream.makeStream(of: Snapshot.self, bufferingPolicy: .bufferingNewest(1))
        continuation.yield(snapshot)
        let id = UUID()
        observers[id] = continuation
        continuation.onTermination = { [weak self] _ in
            Task { await self?.removeObserver(id) }
        }
        return stream
    }

    /// Resumes a paused queue, for example after ``ConvoHopClient/refreshSession()`` succeeded.
    public func resume() {
        guard pauseReason != nil else { return }
        pauseReason = nil
        emit()
        schedule()
    }

    /// Resumes the queue and tries every queued item now, even when the network monitor reports no network, for
    /// example when the user pulls to refresh. It also rechecks unresolved items.
    public func flush() {
        pauseReason = nil
        for index in entries.indices where entries[index].state == .queued { entries[index].notBefore = 0 }
        forced = true
        emit()
        recheckUnresolved()
        schedule()
    }

    /// Sends a failed or unresolved item again under a new request ID, keeping its place in the queue.
    ///
    /// For an unresolved item, it first asks ConvoHop about the previous request ID and marks the item sent if
    /// ConvoHop stored it. If an earlier attempt is still in transit, a resend can post the message twice.
    public func resend(_ id: UUID) async throws {
        try await ensureLoaded()
        guard let entry = entry(id), entry.state == .failed || entry.state == .unresolved, inFlight != id else {
            throw ConvoHopUsageError("Only failed or unresolved messages can be resent")
        }
        if entry.state == .unresolved, entry.submittedIncarnation == incarnation {
            let resolution = try await client.resolveRequest(entry.requestId)
            guard let index = position(of: id), entries[index].state == .unresolved,
                entries[index].requestId == entry.requestId
            else { return }
            switch resolution.state {
            case "committed", "accepted":
                markSent(at: index, resolution)
                emit()
                try? await persist()
                return
            case "notObservedYet":
                break
            default:
                throw ConvoHopError(
                    code: .invalidResponse, requestId: entry.requestId, outcome: .unknown, status: nil,
                    message: "Unknown request resolution state")
            }
        }
        guard let index = position(of: id), entries[index].state == entry.state, inFlight != id else { return }
        entries[index].restart()
        emit()
        do {
            try await persist()
        } catch {
            if let index = position(of: id) { entries[index].note(error) }
            emit()
        }
        schedule()
    }

    /// Removes an item that isn't being sent. It returns `false` when the item is gone or in flight.
    @discardableResult
    public func discard(_ id: UUID) async throws -> Bool {
        try await ensureLoaded()
        guard let index = position(of: id), inFlight != id, entries[index].state != .sending else { return false }
        entries.remove(at: index)
        emit()
        try await persist()
        return true
    }

    /// Removes every item and the saved queue. Call it when the user signs out, or to discard a saved queue that
    /// can't be read. An attempt in flight still finishes.
    public func removeAll() async throws {
        loaded = true
        entries.removeAll()
        pauseReason = nil
        emit()
        try await persist()
    }

    // MARK: Scheduling

    private func schedule() {
        timer?.task.cancel()
        timer = nil
        guard started else { return }
        let now = environment.now()
        let count = entries.count
        entries.removeAll { entry in entry.sentAt.map { now - $0 >= Self.sentRetention } ?? false }
        if entries.count != count { emit() }
        var wake = entries.compactMap { entry in entry.sentAt.map { $0 + Self.sentRetention } }.min()
        if inFlight == nil, pauseReason == nil, reachable || forced {
            let heads = self.heads()
            if let ready = heads.first(where: { $0.notBefore <= now }) {
                let id = ready.id
                inFlight = id
                attemptTask = Task { [weak self] in await self?.attempt(id) }
            } else if let next = heads.map(\.notBefore).min() {
                wake = min(wake ?? next, next)
            } else {
                forced = false
            }
        }
        guard let wake else { return }
        let token = UUID()
        let delay = max(0, wake - now)
        let sleep = environment.sleep
        timer = (
            token,
            Task { [weak self] in
                do { try await sleep(delay) } catch { return }
                await self?.timerFired(token)
            }
        )
    }

    /// The oldest queued or sending item of each conversation, when it is queued.
    private func heads() -> [Entry] {
        var seen = Set<String>()
        var heads: [Entry] = []
        for entry in entries where entry.state == .queued || entry.state == .sending {
            if seen.insert(entry.conversationId).inserted, entry.state == .queued { heads.append(entry) }
        }
        return heads
    }

    private func timerFired(_ token: UUID) {
        guard timer?.id == token else { return }
        timer = nil
        schedule()
    }

    private func setReachable(_ value: Bool) {
        guard value != reachable else { return }
        reachable = value
        emit()
        if value { recheckUnresolved() }
        schedule()
    }

    // MARK: Attempts

    private func attempt(_ id: UUID) async {
        defer {
            if inFlight == id {
                inFlight = nil
                attemptTask = nil
            }
            schedule()
        }
        guard let index = position(of: id), entries[index].state == .queued else { return }
        if entries[index].mustResolve {
            await resolvePending(id)
            return
        }
        entries[index].state = .sending
        entries[index].submittedIncarnation = incarnation
        let entry = entries[index]
        emit()
        // The attempt must be durable before it can reach ConvoHop, so a crash leaves it for resolution.
        do {
            try await persist()
        } catch {
            if let index = self.position(of: id) {
                entries[index].state = .queued
                entries[index].note(error)
                backoff(&entries[index], uncertain: false)
            }
            emit()
            return
        }
        do {
            let receipt = try await client.send(
                entry.text, to: entry.conversationId, props: entry.props, requestId: entry.requestId)
            if let index = self.position(of: id) {
                markSent(at: index, messageId: receipt.messageId, sequence: receipt.sequence)
            }
        } catch {
            sendFailed(id, error)
        }
        emit()
        try? await persist()
    }

    private func sendFailed(_ id: UUID, _ error: any Error) {
        guard let index = position(of: id) else { return }
        var entry = entries[index]
        entry.state = .queued
        switch error {
        case let usage as ConvoHopUsageError:
            entry.state = .failed
            entry.note(code: nil, message: usage.message)
        case let error as ConvoHopError:
            entry.note(code: error.code, message: error.message)
            if Self.sessionCodes.contains(error.code) {
                if error.outcome != .rejected { entry.uncertain = true }
                pauseReason = error
            } else if error.outcome == .committed || error.outcome == .accepted {
                entry.uncertain = true
                entry.mustResolve = true
            } else if error.code == .resolutionRequired, error.outcome == .rejected {
                // The transport holds too many unresolved requests to record another one; nothing was sent.
                pauseReason = error
            } else if error.code == .resolutionRequired || error.code == .requestExpired {
                entry.mustResolve = true
            } else if error.code == .idempotencyConflict || error.code == .incarnationMismatch {
                entry.state = .unresolved
            } else if error.code == .recoveryStorageFailure {
                if error.outcome != .rejected { entry.uncertain = true }
                backoff(&entry, uncertain: false)
            } else if error.outcome == .rejected {
                if error.isRetryable {
                    backoff(&entry, minimum: Self.retryDelay(error), uncertain: false)
                } else {
                    entry.state = .failed
                }
            } else {
                entry.uncertain = true
                forced = false
                if error.isRetryable {
                    backoff(&entry, minimum: Self.retryDelay(error), uncertain: true)
                } else {
                    entry.mustResolve = true
                }
            }
        default:
            entry.uncertain = true
            forced = false
            entry.note(code: nil, message: "The message couldn't be sent yet")
            if !(error is CancellationError) { backoff(&entry, uncertain: true) }
        }
        entries[index] = entry
    }

    /// Looks up a request ID that can't be sent again, then marks the item sent, gives it a new request ID or leaves
    /// the decision to the app.
    private func resolvePending(_ id: UUID) async {
        guard let requestId = entry(id)?.requestId else { return }
        let resolution: RequestResolution
        do {
            resolution = try await client.resolveRequest(requestId)
        } catch {
            resolveFailed(id, requestId: requestId, error)
            emit()
            try? await persist()
            return
        }
        guard let index = position(of: id), entries[index].requestId == requestId, entries[index].state == .queued else {
            return
        }
        switch resolution.state {
        case "committed", "accepted":
            markSent(at: index, resolution)
        case "notObservedYet" where !entries[index].uncertain:
            // Every attempt was refused outright, so a new request ID can't post the message twice.
            if entries[index].rotations < Self.maximumRotations {
                entries[index].requestId = newRequestId()
                entries[index].rotations += 1
                entries[index].mustResolve = false
                entries[index].submittedIncarnation = nil
                entries[index].notBefore = 0
            } else {
                entries[index].state = .failed
                entries[index].mustResolve = false
                if entries[index].failureMessage == nil {
                    entries[index].note(code: nil, message: "The message couldn't be sent")
                }
            }
        default:
            entries[index].state = .unresolved
            entries[index].note(code: nil, message: Self.unconfirmed)
        }
        emit()
        try? await persist()
    }

    private func resolveFailed(_ id: UUID, requestId: String, _ error: any Error) {
        guard let index = position(of: id), entries[index].requestId == requestId, entries[index].state == .queued else {
            return
        }
        var entry = entries[index]
        switch error {
        case let error as ConvoHopError:
            entry.note(code: error.code, message: error.message)
            if Self.sessionCodes.contains(error.code) {
                pauseReason = error
            } else if error.code == .incarnationMismatch || error.code == .resolutionRequired
                || error.code == .idempotencyConflict
                || (error.outcome == .rejected && !error.isRetryable && error.code != .recoveryStorageFailure)
            {
                entry.state = .unresolved
            } else {
                if error.outcome != .rejected { forced = false }
                backoff(&entry, minimum: Self.retryDelay(error), uncertain: false)
            }
        case let usage as ConvoHopUsageError:
            entry.note(code: nil, message: usage.message)
            entry.state = .unresolved
        default:
            forced = false
            if !(error is CancellationError) { backoff(&entry, uncertain: false) }
        }
        entries[index] = entry
    }

    /// Looks up unresolved items read-only, and marks the ones ConvoHop stored as sent.
    private func recheckUnresolved() {
        guard started, recheckTask == nil else { return }
        let targets = entries.filter { $0.state == .unresolved && $0.submittedIncarnation == incarnation }
            .map { (id: $0.id, requestId: $0.requestId) }
        guard !targets.isEmpty else { return }
        let token = UUID()
        recheckTask = (
            token,
            Task { [weak self] in
                for target in targets {
                    guard !Task.isCancelled, let self else { return }
                    await self.recheck(target.id, requestId: target.requestId)
                }
                await self?.recheckFinished(token)
            }
        )
    }

    private func recheck(_ id: UUID, requestId: String) async {
        guard let resolution = try? await client.resolveRequest(requestId),
            resolution.state == "committed" || resolution.state == "accepted",
            let index = position(of: id), entries[index].state == .unresolved, entries[index].requestId == requestId
        else { return }
        markSent(at: index, resolution)
        emit()
        try? await persist()
    }

    private func recheckFinished(_ token: UUID) {
        if recheckTask?.id == token { recheckTask = nil }
    }

    private func markSent(at index: Int, _ resolution: RequestResolution) {
        let conversationId = entries[index].conversationId
        if let ack = resolution.receipt?.result?.messageAck, ack.conversationId == conversationId,
            ProtocolChecks.isCanonicalUUID(ack.messageId), ProtocolChecks.isCanonicalDecimal(ack.sequence)
        {
            markSent(at: index, messageId: ack.messageId, sequence: ack.sequence)
        } else if let reference = resolution.receipt?.resourceRef, reference.kind == "message",
            ProtocolChecks.isCanonicalUUID(reference.id)
        {
            markSent(at: index, messageId: reference.id, sequence: nil)
        } else {
            markSent(at: index, messageId: nil, sequence: nil)
        }
    }

    private func markSent(at index: Int, messageId: String?, sequence: String?) {
        entries[index].state = .sent
        entries[index].messageId = messageId
        entries[index].sequence = sequence
        entries[index].failureCode = nil
        entries[index].failureMessage = nil
        entries[index].uncertain = false
        entries[index].mustResolve = false
        entries[index].sentAt = environment.now()
    }

    /// Delays the next attempt. After an uncertain outcome the delays keep the transport's three attempts per request
    /// ID inside its 60-second retry window.
    private func backoff(_ entry: inout Entry, minimum: Int = 0, uncertain: Bool) {
        entry.failures += 1
        let base =
            uncertain
            ? (entry.failures <= 1 ? 3_000 : 12_000)
            : min(30_000, 1_000 << min(entry.failures - 1, 5))
        let delay = max(minimum, base)
        entry.notBefore = environment.now() + delay + environment.random(delay / 5 + 1)
    }

    private static func retryDelay(_ error: ConvoHopError) -> Int {
        min(max(error.retryAfter ?? 0, 0), 3_600) * 1_000
    }

    // MARK: Storage

    private func ensureLoaded() async throws {
        if loaded { return }
        if let loading { return try await loading.value }
        let task = Task<Void, any Error> { try await self.load() }
        loading = task
        defer { loading = nil }
        try await task.value
    }

    private func load() async throws {
        var restored: [Entry] = []
        if let storage {
            let text: String?
            do {
                text = try await storage.value(forKey: storageKey)
            } catch {
                throw ConvoHopError(
                    code: .recoveryStorageFailure, requestId: newRequestId(), outcome: .rejected, status: nil,
                    message: "The outbox could not read its storage", underlyingError: error)
            }
            if let text {
                guard let saved = try? JSONDecoder().decode(Saved.self, from: Data(text.utf8)),
                    Self.isValid(saved.items)
                else {
                    if loaded { return }
                    throw ConvoHopError(
                        code: .recoveryStorageFailure, requestId: newRequestId(), outcome: .rejected, status: nil,
                        message: "The saved outbox can't be read; retry, or call removeAll() to discard it")
                }
                restored = saved.items.compactMap { Self.restore($0, incarnation: incarnation) }
            }
        }
        guard !loaded else { return }
        entries = restored
        loaded = true
        emit()
    }

    static func isValid(_ entries: [Entry]) -> Bool {
        var ids = Set<UUID>()
        var requestIds = Set<String>()
        for entry in entries {
            guard ids.insert(entry.id).inserted, requestIds.insert(entry.requestId).inserted,
                ProtocolChecks.isCanonicalUUID(entry.requestId), ProtocolChecks.isCanonicalUUID(entry.conversationId),
                entry.messageId.map(ProtocolChecks.isCanonicalUUID) ?? true,
                entry.sequence.map(ProtocolChecks.isCanonicalDecimal) ?? true,
                entry.submittedIncarnation.map(ProtocolChecks.isCanonicalUUID) ?? true,
                entry.rotations >= 0, entry.createdAt >= 0
            else { return false }
        }
        return true
    }

    /// A saved item as the restarted queue sees it: an attempt that was in flight may have reached ConvoHop, and a
    /// request from another incarnation can't be looked up from this one.
    static func restore(_ saved: Entry, incarnation: String) -> Entry? {
        var entry = saved
        entry.notBefore = 0
        entry.failures = 0
        entry.sentAt = nil
        switch entry.state {
        case .sent: return nil
        case .sending:
            entry.state = .queued
            entry.uncertain = true
        case .queued, .failed, .unresolved: break
        }
        if entry.state == .queued, let submitted = entry.submittedIncarnation, submitted != incarnation {
            if entry.uncertain || entry.mustResolve {
                entry.state = .unresolved
                entry.note(code: .incarnationMismatch, message: unconfirmed)
            } else {
                entry.requestId = newRequestId()
                entry.submittedIncarnation = nil
            }
        }
        return entry
    }

    /// Saves the unsent items. Writes run in call order, so the last one always holds the newest queue.
    private func persist() async throws {
        guard let storage else { return }
        let unsent = entries.filter { $0.state != .sent }
        let text: String?
        if unsent.isEmpty {
            text = nil
        } else {
            do {
                text = String(decoding: try JSONEncoder().encode(Saved(items: unsent)), as: UTF8.self)
            } catch {
                throw ConvoHopError(
                    code: .recoveryStorageFailure, requestId: newRequestId(), outcome: .unknown, status: nil,
                    message: "The outbox could not encode its queue", underlyingError: error)
            }
        }
        let previous = writes, key = storageKey
        let write = Task<Void, any Error> {
            _ = await previous?.result
            if let text {
                try await storage.setValue(text, forKey: key)
            } else {
                try await storage.removeValue(forKey: key)
            }
        }
        writes = write
        do {
            try await write.value
        } catch {
            throw ConvoHopError(
                code: .recoveryStorageFailure, requestId: newRequestId(), outcome: .unknown, status: nil,
                message: "Outbox storage did not confirm the write", underlyingError: error)
        }
    }

    // MARK: Helpers

    private func position(of id: UUID) -> Int? {
        entries.firstIndex { $0.id == id }
    }

    private func entry(_ id: UUID) -> Entry? {
        position(of: id).map { entries[$0] }
    }

    private func emit() {
        guard !observers.isEmpty else { return }
        let snapshot = self.snapshot
        for observer in observers.values { observer.yield(snapshot) }
    }

    private func removeObserver(_ id: UUID) {
        observers[id] = nil
    }

    static func item(_ entry: Entry) -> Item {
        Item(
            id: entry.id, requestId: entry.requestId, conversationId: entry.conversationId, text: entry.text,
            props: entry.props, createdAt: Date(timeIntervalSince1970: Double(entry.createdAt) / 1000),
            state: entry.state, messageId: entry.messageId, sequence: entry.sequence,
            failure: entry.failureMessage.map {
                Failure(code: entry.failureCode.map(ConvoHopErrorCode.init(rawValue:)), message: $0)
            })
    }
}

extension ConvoHopOutbox.Entry {
    mutating func note(code: ConvoHopErrorCode?, message: String) {
        failureCode = code?.rawValue
        failureMessage = message
    }

    mutating func note(_ error: any Error) {
        if let error = error as? ConvoHopError {
            note(code: error.code, message: error.message)
        } else {
            note(code: nil, message: "The outbox could not save its queue")
        }
    }

    /// Starts over under a new request ID.
    mutating func restart() {
        requestId = newRequestId()
        state = .queued
        uncertain = false
        mustResolve = false
        rotations = 0
        failures = 0
        notBefore = 0
        submittedIncarnation = nil
        failureCode = nil
        failureMessage = nil
    }
}
