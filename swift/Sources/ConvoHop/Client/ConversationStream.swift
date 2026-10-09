import Foundation

/// Replays one conversation's events from a cursor, then follows new events in real time.
///
/// Each batch reaches `apply` once and in order. The cursor advances, and is stored, only after `apply` returns.
/// When the realtime connection drops, the stream fills the gap from history before it reconnects. Close the stream
/// when you no longer need it.
///
/// When the organization runs out of prepaid credits or reaches its monthly spend cap, the stream closes and reports
/// `CREDITS_EXHAUSTED` or `SPEND_CAP_REACHED` with status 402. `SPEND_UNVERIFIED` goes to `onError` and the stream
/// reconnects no sooner than its `retryAfter`.
public actor ConversationStream {
    public nonisolated let conversationId: String
    private let client: ConvoHopClient
    private let storageKey: String
    private let storage: (any RecoveryStorage)?
    private let environment: ConvoHopEnvironment
    private let factory: any ConvoHopWebSocketFactory
    private let apply: @Sendable ([Event]) async throws -> Void
    private let onError: @Sendable (any Error) -> Void

    /// The cursor after the last applied batch.
    public private(set) var cursor: Cursor?
    /// Whether the stream is closed. A closed stream never reopens.
    public private(set) var isClosed = false
    /// Whether the realtime subscription is open. While it isn't, the stream catches up from history and reconnects
    /// on its own.
    public private(set) var isConnected = false
    private var connectionObservers: [Int: AsyncStream<Bool>.Continuation] = [:]
    private var started = false
    private var paused = false
    private var socket: Socket?
    private var working: (id: Int, task: Task<Bool, Error>)?
    private var round: (generation: Int, id: Int, task: Task<Bool, Error>)?
    private var applying: Task<Void, Error>?
    private var timer: (id: Int, task: Task<Void, Never>)?
    private var serial = 0
    private var reconnectAttempts = 0
    private var pendingPages = 0
    private var generation = 0
    private var currentRoute: ProjectRoute
    private var token: String

    private struct Socket {
        let id: Int
        let connection: any ConvoHopWebSocket
        let subscriptionId: String
        let reader: Task<Void, Never>
    }

    private enum TimerKind: Sendable {
        case pace
        case reconnect
    }

    private static let channel = GraphQLRealtime.conversationEvents
    /// The spend codes a close reason may name. The TypeScript SDK reads any code the schema lists in a close reason;
    /// this stream reads only these, the same way, until it classifies the rest.
    private static let spendCloseCodes: Set = ["CREDITS_EXHAUSTED", "SPEND_CAP_REACHED", "SPEND_UNVERIFIED"]
    /// The longest wait before reconnecting, 2³¹−1 ms (about 24.8 days): what a timer accepts, as in the TypeScript SDK.
    private static let maxReconnectDelayMs = 2_147_483_647

    init(
        client: ConvoHopClient, conversationId: String, route: ProjectRoute, token: String, cursor: Cursor?,
        storageKey: String, apply: @escaping @Sendable ([Event]) async throws -> Void,
        onError: @escaping @Sendable (any Error) -> Void
    ) {
        self.client = client
        self.conversationId = conversationId
        currentRoute = route
        self.token = token
        self.cursor = cursor
        self.storageKey = storageKey
        storage = client.storage
        environment = client.environment
        factory = client.webSocketFactory
        self.apply = apply
        self.onError = onError
    }

    /// Stops replay and realtime delivery. A batch that `apply` is already handling finishes first.
    public func close() {
        shut()
    }

    /// ``isConnected`` now and after each change. The sequence ends when the stream closes.
    public func connectionChanges() -> AsyncStream<Bool> {
        let (changes, continuation) = AsyncStream.makeStream(of: Bool.self, bufferingPolicy: .bufferingNewest(1))
        continuation.yield(isConnected)
        if isClosed {
            continuation.finish()
            return changes
        }
        let id = nextSerial()
        connectionObservers[id] = continuation
        continuation.onTermination = { [weak self] _ in
            Task { await self?.removeConnectionObserver(id) }
        }
        return changes
    }

    /// Runs one bounded catch-up round from history now.
    ///
    /// It throws ``ConvoHopReplayError/workLimitReached`` when more history remains; call it again.
    public func reconcile() async throws {
        do {
            if try await reconcileRound() { throw ConvoHopReplayError.workLimitReached }
        } catch {
            throw publicError(error)
        }
    }

    // MARK: Client coordination

    /// Closes the stream and waits for a batch in progress.
    func retire() async throws {
        shut()
        if let applying { try await applying.value }
    }

    /// Pauses delivery while the client renews its session, and waits for work in progress.
    func suspendForRefresh() async throws {
        paused = true
        cancelTimer()
        dropSocket(code: 1000)
        let applying = self.applying, working = self.working?.task
        var failure: (any Error)?
        if let applying {
            do { try await applying.value } catch { failure = failure ?? error }
        }
        if let working {
            do { _ = try await working.value } catch { failure = failure ?? error }
        }
        generation += 1
        if let failure { throw failure }
    }

    /// Resumes with the verified route and session token.
    func resumeAfterRefresh(route: ProjectRoute, token: String) async throws {
        if isClosed { return }
        currentRoute = route
        self.token = token
        paused = false
        do {
            proceed(try await reconcileRound())
        } catch {
            fail(error)
            throw error
        }
    }

    func start() async throws {
        if isClosed || started { throw ConvoHopReplayError.alreadyStarted }
        started = true
        await client.recoverPending(onError: onError)
        if paused { throw Self.paused("Replay startup was paused by session refresh; open it after verified refresh") }
        let more = try await reconcileRound()
        if paused { throw Self.paused("Replay startup was paused by session refresh; open it after verified refresh") }
        proceed(more)
    }

    func resyncAuthorizedHistory() async throws {
        if isClosed || started || working != nil { throw ConvoHopReplayError.requiresIdle }
        currentRoute = try await client.initializeRoute()
        _ = try await client.rawConversation(conversationId)
        if isClosed { throw ConvoHopReplayError.superseded }
        cursor = nil
        try await start()
    }

    // MARK: State

    private static func paused(_ message: String) -> ConvoHopError {
        ConvoHopError(
            code: .sessionRefreshRequired, requestId: newRequestId(), outcome: .rejected, status: 409, message: message)
    }

    private func isSuperseded(_ generation: Int) -> Bool { isClosed || generation != self.generation }

    private func isStale(_ generation: Int) -> Bool { isSuperseded(generation) || paused }

    private func isCurrent(_ generation: Int) -> Bool { !isStale(generation) }

    private func nextSerial() -> Int {
        serial += 1
        return serial
    }

    private func shut() {
        if isClosed { return }
        isClosed = true
        generation += 1
        cancelTimer()
        dropSocket(code: 1000)
        for observer in connectionObservers.values { observer.finish() }
        connectionObservers = [:]
        if applying == nil { notifyClosed() }
    }

    private func setConnected(_ value: Bool) {
        if isConnected == value { return }
        isConnected = value
        for observer in connectionObservers.values { observer.yield(value) }
    }

    private func removeConnectionObserver(_ id: Int) {
        connectionObservers[id] = nil
    }

    private func notifyClosed() {
        let client = self.client
        Task { await client.removeStream(self) }
    }

    private func fail(_ error: any Error) {
        if isClosed { return }
        generation += 1
        let reported = publicError(error)
        if paused {
            onError(reported)
            return
        }
        let retryable: Bool
        var minimumSeconds = 0
        switch error {
        case let problem as ConvoHopError:
            retryable = problem.status == nil || problem.status == 429 || problem.status == 503 || problem.code == .wrongRegion
            minimumSeconds = problem.retryAfter ?? 0
        case let terminal as RealtimeTerminal:
            retryable = terminal.error.code == .wrongRegion
            minimumSeconds = terminal.error.retryAfter ?? 0
        default:
            retryable = false
        }
        if retryable {
            dropSocket(code: 4000)
            onError(reported)
            retry(minimumSeconds: minimumSeconds)
            return
        }
        shut()
        onError(reported)
    }

    private func applyEvents(_ events: [Event]) async throws -> Bool {
        if isClosed || paused { return false }
        if events.isEmpty { return true }
        let apply = self.apply
        let task = Task<Void, Error> { try await apply(events) }
        applying = task
        do {
            try await task.value
        } catch {
            finishApplying(task)
            throw error
        }
        finishApplying(task)
        return true
    }

    private func finishApplying(_ task: Task<Void, Error>) {
        if applying == task { applying = nil }
        if isClosed { notifyClosed() }
    }

    private func advance(to next: Cursor) async throws {
        cursor = next
        guard let storage else { return }
        do {
            try await storage.setValue(try JSONValue.encoding(next).jsonText(), forKey: storageKey)
        } catch {
            throw CursorStorageFailure(underlying: error)
        }
    }

    // MARK: Rounds and timers

    /// One bounded round of at most ten pages. It returns `true` only when the current replay has more work.
    private func reconcileRound() async throws -> Bool {
        if isClosed { return false }
        if paused { throw Self.paused("Realtime application work is paused until session authority is verified") }
        let generation = self.generation
        // Rounds coalesce only within one stream generation. Earlier queued or superseded work settles first.
        if let round, round.generation == generation { return try await round.task.value }
        let id = nextSerial()
        let previous = working?.task
        let task = Task { () async throws -> Bool in
            defer {
                if self.round?.id == id { self.round = nil }
                if self.working?.id == id { self.working = nil }
            }
            if let previous { _ = try? await previous.value }
            for _ in 0..<10 {
                if self.isStale(generation) { return false }
                let previousCursor = self.cursor
                let result = try await self.client.rawEvents(self.conversationId, after: previousCursor)
                if self.isStale(generation) { return false }
                if result.refreshRequired { throw ConvoHopReplayError.resyncRequired }
                if !result.complete, let previousCursor,
                    ProtocolChecks.compareCounters(result.nextCursor.sequence, previousCursor.sequence) <= 0
                {
                    throw ProtocolViolation("Incomplete replay page did not advance the authoritative frontier")
                }
                let applied = try await self.applyEvents(result.events)
                if !applied || self.isSuperseded(generation) { return false }
                try await self.advance(to: result.nextCursor)
                if result.complete { return false }
            }
            return !self.isStale(generation)
        }
        round = (generation, id, task)
        working = (id, task)
        return try await task.value
    }

    /// Managed catch-up keeps each round bounded and paces the next one instead of failing at the work limit.
    private func proceed(_ more: Bool) {
        if isClosed || paused { return }
        if !more {
            connect()
            return
        }
        if timer != nil { return }
        schedule(.pace, after: 250 + environment.random(250))
    }

    /// Reconnects after backoff, and never sooner than `minimumSeconds`, the `retryAfter` the authority asked for, up
    /// to `maxReconnectDelayMs`.
    private func retry(minimumSeconds: Int = 0) {
        if isClosed || paused || timer != nil { return }
        let attempt = min(reconnectAttempts, 4)
        reconnectAttempts += 1
        let backoff = min(Self.channel.baseDelayMs * (1 << attempt), Self.channel.maxDelayMs)
        let minimum = minimumSeconds > Self.maxReconnectDelayMs / 1000 ? Self.maxReconnectDelayMs : minimumSeconds * 1000
        let delay = max(backoff, minimum) + environment.random(Self.channel.jitterMs)
        schedule(.reconnect, after: min(delay, Self.maxReconnectDelayMs))
    }

    private func schedule(_ kind: TimerKind, after delay: Int) {
        let id = nextSerial()
        let sleep = environment.sleep
        let task = Task { [weak self] in
            do { try await sleep(delay) } catch { return }
            await self?.fire(id, kind)
        }
        timer = (id, task)
    }

    private func cancelTimer() {
        timer?.task.cancel()
        timer = nil
    }

    private func fire(_ id: Int, _ kind: TimerKind) async {
        guard timer?.id == id else { return }
        timer = nil
        if isClosed || paused { return }
        let generation = self.generation
        do {
            switch kind {
            case .pace:
                let next = try await reconcileRound()
                if isCurrent(generation) { proceed(next) }
            case .reconnect:
                let route = try await client.initializeRoute()
                guard isCurrent(generation) else { return }
                currentRoute = route
                await client.recoverPending(onError: onError)
                guard isCurrent(generation) else { return }
                let more = try await reconcileRound()
                if isCurrent(generation) { proceed(more) }
            }
        } catch {
            if isCurrent(generation) { fail(error) }
        }
    }

    // MARK: Realtime

    private func connect() {
        if isClosed || paused || socket != nil { return }
        guard let url = URL(string: currentRoute.wssUrl) else {
            fail(ProtocolViolation("Invalid realtime endpoint"))
            return
        }
        let connection = factory.connect(to: url, subprotocol: GraphQLTransport.webSocketSubprotocol)
        let id = nextSerial()
        let events = connection.events
        let reader = Task { [weak self] in
            for await event in events {
                guard let self else {
                    connection.close(code: 1000)
                    return
                }
                await self.receive(event, from: connection, socket: id)
            }
        }
        socket = Socket(id: id, connection: connection, subscriptionId: newRequestId(), reader: reader)
    }

    private func dropSocket(code: Int) {
        setConnected(false)
        guard let socket else { return }
        self.socket = nil
        socket.connection.close(code: code)
        socket.reader.cancel()
    }

    private func receive(_ event: ConvoHopWebSocketEvent, from connection: any ConvoHopWebSocket, socket id: Int) {
        guard let socket, socket.id == id else {
            if case .open = event { connection.close(code: 1000) }
            return
        }
        switch event {
        case .open(let negotiated):
            if isClosed || paused { return }
            guard negotiated == GraphQLTransport.webSocketSubprotocol else {
                onError(unavailable(socket.subscriptionId))
                connection.close(code: 1002)
                return
            }
            send(
                [
                    "type": "connection_init",
                    "payload": .object([
                        "projectId": .string(client.projectId), "incarnation": .string(currentRoute.incarnation),
                        "token": .string(token),
                    ]),
                ], on: connection)
        case .text(let text):
            if isClosed || paused { return }
            do {
                try handleFrame(text, socket: socket)
            } catch {
                fail(error)
            }
        case .binary:
            if isClosed || paused { return }
            fail(ProtocolViolation("Realtime frames must be text"))
        case .failed:
            setConnected(false)
            if !isClosed && !paused { onError(unavailable(socket.subscriptionId)) }
        case .closed(let code, let reason):
            self.socket = nil
            setConnected(false)
            socket.reader.cancel()
            if isClosed || paused { return }
            // The reason's code decides, not the close code: a spend stop ends the stream, and unverified spend
            // reconnects no sooner than its `retryAfter`.
            if let spend = Self.spendCloseProblem(code, reason, socket.subscriptionId) {
                fail(spend)
            } else if !Self.channel.terminalCloseCodes.contains(code) {
                retry()
            } else {
                fail(
                    ConvoHopError(
                        code: .unauthenticated, requestId: socket.subscriptionId, outcome: .rejected, status: 401,
                        message: "Realtime authorization ended; obtain a current session"))
            }
        }
    }

    private func unavailable(_ subscriptionId: String) -> ConvoHopError {
        ConvoHopError(
            code: .transportUnknown, requestId: subscriptionId, outcome: .unknown, status: nil,
            message: "Realtime connection unavailable; current history remains authoritative")
    }

    /// The problem a close reports when its reason starts with a spend code, such as
    /// `SPEND_UNVERIFIED retryAfter=30 meter=mau`, whatever the close code: that code, the schema's status for it,
    /// and the reason's `retryAfter=` seconds. `nil` for any other reason.
    private static func spendCloseProblem(_ code: Int, _ reason: String?, _ subscriptionId: String) -> ConvoHopError? {
        let words = (reason ?? "").split(whereSeparator: \.isWhitespace).map(String.init)
        guard let name = words.first, spendCloseCodes.contains(name) else { return nil }
        let status = ConvoHopErrorCode.catalog[name]?.status ?? ((4000...4999).contains(code) ? code - 4000 : 0)
        let retryAfter = words.first { $0.hasPrefix("retryAfter=") }.map { String($0.dropFirst("retryAfter=".count)) }
        return ConvoHopError(
            code: ConvoHopErrorCode(rawValue: name), requestId: subscriptionId, outcome: .rejected, status: status,
            message: "Realtime connection closed: " + words.joined(separator: " "),
            retryAfter: ConvoHopTransport.retryDelay(retryAfter.map(JSONValue.string)))
    }

    private func send(_ message: JSONObject, on connection: any ConvoHopWebSocket) {
        connection.send(JSONValue.object(message).jsonText())
    }

    private func handleFrame(_ text: String, socket: Socket) throws {
        if text.utf16.count > Self.channel.maxFrameBytes {
            throw ConvoHopError(
                code: .admissionLimit, requestId: socket.subscriptionId, outcome: .rejected, status: 503,
                message: "Subscription frame exceeds its budget")
        }
        let frame = try ProtocolChecks.object(try JSONParser.parse(text))
        switch frame["type"]?.stringValue {
        case "connection_ack":
            reconnectAttempts = 0
            try subscribe(socket)
            setConnected(true)
        case "ping":
            send(["type": "pong"], on: socket.connection)
        case "next", "error":
            guard frame["id"]?.stringValue == socket.subscriptionId else {
                throw ProtocolViolation("Unknown subscription identity")
            }
            let payload: JSONObject =
                frame["type"]?.stringValue == "error"
                ? ["errors": frame["payload"] ?? .null] : try ProtocolChecks.object(frame["payload"])
            if case .array(let errors)? = payload["errors"], let first = errors.first {
                throw try Self.realtimeProblem(first)
            }
            try page(try ProtocolChecks.object(payload["data"])["conversationEvents"])
        case "complete":
            throw ConvoHopError(
                code: .authorityUnavailable, requestId: socket.subscriptionId, outcome: .unknown, status: 503,
                message: "Resume the subscription from its applied cursor")
        default:
            break
        }
    }

    private static func realtimeProblem(_ value: JSONValue) throws -> any Error {
        let problem = try ProtocolChecks.object(value)
        let extensions = try ProtocolChecks.object(problem["extensions"])
        let code = ConvoHopErrorCode(rawValue: try ProtocolChecks.string(extensions["code"]))
        let requestId = try ProtocolChecks.id(extensions["requestId"])
        let outcome = ConvoHopOutcome(rawValue: try ProtocolChecks.string(extensions["outcome"]))
        let message = try ProtocolChecks.string(problem["message"])
        let retryAfter = ConvoHopTransport.retryDelay(extensions["retryAfter"])
        guard let number = extensions["status"]?.numberValue, ProtocolChecks.isSafeInteger(number) else {
            return RealtimeTerminal(
                error: ConvoHopError(
                    code: code, requestId: requestId, outcome: outcome, status: nil, message: message,
                    retryAfter: retryAfter))
        }
        return ConvoHopError(
            code: code, requestId: requestId, outcome: outcome, status: Int(number), message: message,
            retryAfter: retryAfter)
    }

    private func subscribe(_ socket: Socket) throws {
        let operation = ConvoHopOperations.communicationConversationEvents.descriptor
        var input: JSONObject = [
            "conversationId": .string(conversationId), "limit": .number(Double(Self.channel.subscribeLimit)),
        ]
        if let cursor { input["after"] = try JSONValue.encoding(cursor) }
        send(
            [
                "type": "subscribe", "id": .string(socket.subscriptionId),
                "payload": .object([
                    "query": .string(operation.document), "operationName": .string(operation.operationName),
                    "variables": .object([
                        "context": .object([
                            "requestId": .string(newRequestId()), "projectId": .string(client.projectId),
                            "incarnation": .string(currentRoute.incarnation),
                            "observedServingEpoch": .string(currentRoute.servingEpoch),
                        ]),
                        "input": .object(input),
                    ]),
                ]),
            ], on: socket.connection)
    }

    private func page(_ value: JSONValue?) throws {
        if pendingPages >= Self.channel.maxPendingPages {
            throw ConvoHopError(
                code: .admissionLimit, requestId: newRequestId(), outcome: .unknown, status: 503,
                message: "Application must resume from its applied cursor")
        }
        let frame = try ProtocolChecks.eventPage(
            value, incarnation: currentRoute.incarnation, conversationId: conversationId)
        if frame.refreshRequired { throw ConvoHopReplayError.resyncRequired }
        let events = try frame.events.map { try JSONValue.object($0).decoded(as: Event.self) }
        let next = frame.nextCursor
        let generation = self.generation
        pendingPages += 1
        let id = nextSerial()
        let previous = working?.task
        let task = Task { () async throws -> Bool in
            defer {
                self.pendingPages -= 1
                if self.working?.id == id { self.working = nil }
            }
            do {
                if let previous { _ = try await previous.value }
                if self.isStale(generation) { return false }
                if let cursor = self.cursor, ProtocolChecks.compareCounters(next.sequence, cursor.sequence) < 0 {
                    return false
                }
                let fresh =
                    self.cursor.map { cursor in
                        events.filter { ProtocolChecks.compareCounters($0.sequence, cursor.sequence) > 0 }
                    } ?? events
                let applied = try await self.applyEvents(fresh)
                if !applied || self.isSuperseded(generation) { return false }
                try await self.advance(to: next)
            } catch {
                if generation == self.generation { self.fail(error) }
            }
            return false
        }
        working = (id, task)
    }
}
