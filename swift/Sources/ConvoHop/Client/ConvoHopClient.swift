import Foundation

/// Renews the user's session through your backend.
///
/// ConvoHop calls it with the current session. Ask your backend to renew that session with a server SDK and return
/// the bootstrap it receives. Never put backend keys in the app.
public typealias ConvoHopSessionRefresh = @Sendable (_ current: Session) async throws -> SessionBootstrap

/// Settings for a ``ConvoHopClient``.
public struct ConvoHopConfiguration: Sendable {
    /// The authority origin, for example `https://api.convohop.example`. Plain HTTP is accepted only for loopback.
    public var baseURL: URL
    public var projectId: String
    public var principalId: String
    public var incarnation: String
    /// The user's short-lived session token from your backend. Never use a backend key here.
    public var sessionToken: String
    /// Durable storage for mutation recovery records and replay cursors. Without it, both last as long as the
    /// client.
    public var recoveryStorage: (any RecoveryStorage)?
    /// Renews the session before it expires. Without it, create a new client with a new session instead.
    public var refreshSession: ConvoHopSessionRefresh?
    public var httpClient: any ConvoHopHTTPClient
    public var webSocketFactory: any ConvoHopWebSocketFactory

    public init(
        baseURL: URL, projectId: String, principalId: String, incarnation: String, sessionToken: String,
        recoveryStorage: (any RecoveryStorage)? = nil, refreshSession: ConvoHopSessionRefresh? = nil,
        httpClient: any ConvoHopHTTPClient = URLSessionHTTPClient(),
        webSocketFactory: any ConvoHopWebSocketFactory = URLSessionWebSocketFactory()
    ) {
        self.baseURL = baseURL
        self.projectId = projectId
        self.principalId = principalId
        self.incarnation = incarnation
        self.sessionToken = sessionToken
        self.recoveryStorage = recoveryStorage
        self.refreshSession = refreshSession
        self.httpClient = httpClient
        self.webSocketFactory = webSocketFactory
    }
}

/// Clock, timers and randomness. Tests replace them.
struct ConvoHopEnvironment: Sendable {
    var now: @Sendable () -> Int
    var sleep: @Sendable (_ milliseconds: Int) async throws -> Void
    var random: @Sendable (_ upperBound: Int) -> Int

    static let live = ConvoHopEnvironment(
        now: { Int((Date().timeIntervalSince1970 * 1000).rounded(.down)) },
        sleep: { milliseconds in try await Task.sleep(nanoseconds: UInt64(max(0, milliseconds)) * 1_000_000) },
        random: { upperBound in upperBound > 0 ? Int.random(in: 0..<upperBound) : 0 })
}

/// A replay that can't continue as requested.
public enum ConvoHopReplayError: Error, Sendable, Equatable, CustomStringConvertible, LocalizedError {
    /// The authority requires an explicit resynchronization of authorized history. Call
    /// ``ConvoHopClient/resyncAuthorizedHistory(_:apply:onError:)``. The cursor is never reset silently.
    case resyncRequired
    /// A newer resynchronization of the same conversation replaced this replay.
    case superseded
    /// One round reached its page limit. Call ``ConversationStream/reconcile()`` again.
    case workLimitReached
    /// The replay was already started or closed.
    case alreadyStarted
    /// Resynchronization needs a new replay that hasn't started.
    case requiresIdle

    public var description: String {
        switch self {
        case .resyncRequired: return "Explicit authorized history resynchronization required"
        case .superseded: return "History watcher superseded by explicit resynchronization"
        case .workLimitReached: return "Replay work limit reached; explicitly reconcile again"
        case .alreadyStarted: return "Replay is already started or closed"
        case .requiresIdle: return "History resynchronization requires a new idle replay"
        }
    }

    public var errorDescription: String? { description }
}

/// Several failures from one call, such as a failed session refresh and a replay that couldn't resume. The first
/// error is the primary one.
public struct ConvoHopAggregateError: Error, Sendable, CustomStringConvertible, LocalizedError {
    public let errors: [any Error]

    public var description: String {
        "Session refresh or replay restoration failed: " + errors.map { String(describing: $0) }.joined(separator: "; ")
    }

    public var errorDescription: String? { description }
}

/// A replay cursor write the storage didn't confirm.
struct CursorStorageFailure: Error {
    let underlying: any Error
}

/// A realtime error frame without a status. It ends the stream.
struct RealtimeTerminal: Error {
    let error: ConvoHopError
}

/// The public form of an internal error. Protocol violations become `INVALID_RESPONSE`.
func publicError(_ error: any Error, requestId: String? = nil) -> any Error {
    switch error {
    case let violation as ProtocolViolation:
        return ConvoHopError(
            code: .invalidResponse, requestId: requestId ?? newRequestId(), outcome: .unknown, status: nil,
            message: violation.message)
    case is DecodingError, is JSONSyntaxError, is UnsafeJSONNumber:
        return ConvoHopError(
            code: .invalidResponse, requestId: requestId ?? newRequestId(), outcome: .unknown, status: nil,
            message: "Response does not match the generated schema", underlyingError: error)
    case let failure as CursorStorageFailure:
        return ConvoHopError(
            code: .recoveryStorageFailure, requestId: requestId ?? newRequestId(), outcome: .unknown, status: nil,
            message: "Replay cursor storage did not confirm durability; applied events may be delivered again",
            underlyingError: failure.underlying)
    case let terminal as RealtimeTerminal:
        return terminal.error
    default:
        return error
    }
}

/// A ConvoHop user session: conversations, messages, realtime replay, recovery and calls.
///
/// Create one client per signed-in user and session. Every request carries the user's session token; the SDK never
/// accepts backend keys. Mutations keep their request ID across retries, so an uncertain outcome can be resolved
/// instead of being sent twice.
public actor ConvoHopClient {
    public nonisolated let projectId: String
    public nonisolated let principalId: String
    public nonisolated let incarnation: String

    let transport: ConvoHopTransport
    let storage: (any RecoveryStorage)?
    let environment: ConvoHopEnvironment
    let webSocketFactory: any ConvoHopWebSocketFactory
    private let refreshHook: ConvoHopSessionRefresh?
    private(set) var token: String
    private var session: Session?
    private var sessionInitialization: Task<Session, Error>?
    private var refreshing: (id: UUID, task: Task<Session, Error>)?
    private var quiescing: Quiescing?
    /// The route from the latest ``initialize()``.
    public private(set) var route: ProjectRoute?
    private var blocked = false
    private var streams: [ConversationStream] = []
    private var replayGenerations: [String: Int] = [:]

    private struct Quiescing {
        var replays: [ConversationStream]
        var work: [Task<Void, Error>]
    }

    /// Creates a client. It sends nothing until the first call.
    public init(configuration: ConvoHopConfiguration) throws {
        try self.init(configuration: configuration, environment: .live)
    }

    init(configuration: ConvoHopConfiguration, environment: ConvoHopEnvironment) throws {
        guard ProtocolChecks.isCanonicalUUID(configuration.projectId),
            ProtocolChecks.isCanonicalUUID(configuration.principalId),
            ProtocolChecks.isCanonicalUUID(configuration.incarnation)
        else { throw ConvoHopUsageError("Project, principal and incarnation must be canonical lowercase UUIDs") }
        guard Self.isValidToken(configuration.sessionToken) else {
            throw ConvoHopUsageError("The session token must be 1 to 16384 characters without line breaks")
        }
        do {
            transport = try ConvoHopTransport(
                baseUrl: configuration.baseURL.absoluteString, credential: configuration.sessionToken,
                namespace: configuration.projectId + ":" + configuration.principalId,
                incarnation: configuration.incarnation, http: configuration.httpClient,
                storage: configuration.recoveryStorage, clock: environment.now)
        } catch {
            throw ConvoHopUsageError("Use an HTTPS origin, or explicit loopback HTTP for local development")
        }
        projectId = configuration.projectId
        principalId = configuration.principalId
        incarnation = configuration.incarnation
        storage = configuration.recoveryStorage
        self.environment = environment
        webSocketFactory = configuration.webSocketFactory
        refreshHook = configuration.refreshSession
        token = configuration.sessionToken
    }

    static func isValidToken(_ token: String) -> Bool {
        !token.isEmpty && token.utf16.count <= 16384
            && !token.unicodeScalars.contains { $0 == "\r" || $0 == "\n" }
    }

    // MARK: Session

    /// Where session renewal stands.
    public var sessionRefreshState: SessionRefreshState {
        if refreshHook == nil { return .disabled }
        if refreshing != nil { return .refreshing }
        if blocked { return .blocked }
        if session != nil && route != nil { return .ready }
        return .uninitialized
    }

    /// The verified session this client renews, after ``initialize()`` with a refresh callback.
    public var sessionBinding: Session? { session }

    /// Fetches and checks the project route. With a refresh callback it also binds the current session.
    @discardableResult
    public func initialize() async throws -> ProjectRoute {
        try await guarded { try await initializeRoute() }
    }

    func initializeRoute() async throws -> ProjectRoute {
        let reply = try await transport.execute("communication.route", projectId: projectId, input: [:])
        let route = try validateRoute(reply["result"])
        await transport.setServingEpoch(route.servingEpoch)
        if refreshHook != nil {
            let task: Task<Session, Error>
            if let sessionInitialization {
                task = sessionInitialization
            } else {
                task = Task { try await self.bindSession() }
                sessionInitialization = task
            }
            do {
                _ = try await task.value
            } catch {
                // A rejected binding is final for this client. Other failures can be retried.
                if sessionInitialization == task, (error as? ConvoHopError)?.code != .sessionRefreshRejected {
                    sessionInitialization = nil
                }
                throw error
            }
        }
        await transport.setServingEpoch(route.servingEpoch)
        self.route = route
        return route
    }

    private func bindSession() async throws -> Session {
        let reply = try await transport.execute("communication.currentSession", projectId: projectId, input: [:])
        let current = try ProtocolChecks.currentSession(reply, now: environment.now())
        guard current.principalId == principalId, current.incarnation == incarnation else {
            throw ConvoHopError(
                code: .sessionRefreshRejected, requestId: reply["requestId"]?.stringValue ?? newRequestId(),
                outcome: .rejected, status: 409,
                message: "Original session authority does not match this client's principal and incarnation")
        }
        session = current
        return current
    }

    private func validateRoute(_ value: JSONValue?) throws -> ProjectRoute {
        let route = try ProtocolChecks.route(value)
        guard route.projectId == projectId, route.incarnation == incarnation else {
            throw ConvoHopError(
                code: .incarnationMismatch, requestId: newRequestId(), outcome: .rejected, status: 409,
                message: "Explicit session/route recovery required")
        }
        let violation = ProtocolViolation(
            "Route cannot redirect this client's credentials to another origin or an unsafe socket")
        guard (try? ProtocolChecks.origin(route.communicationBase)) == transport.baseUrl,
            let base = URLComponents(string: transport.baseUrl), let socket = URLComponents(string: route.wssUrl),
            let baseScheme = base.scheme?.lowercased(), let socketScheme = socket.scheme?.lowercased(),
            socketScheme == (baseScheme == "https" ? "wss" : "ws"),
            let baseHost = base.host.map(Self.hostName), let socketHost = socket.host.map(Self.hostName),
            baseHost == socketHost,
            (socket.port ?? (socketScheme == "wss" ? 443 : 80)) == (base.port ?? (baseScheme == "https" ? 443 : 80)),
            socket.percentEncodedPath == GraphQLTransport.path, socket.user == nil, socket.password == nil,
            socket.query == nil, socket.fragment == nil
        else { throw violation }
        return route
    }

    private static func hostName(_ host: String) -> String {
        var text = host.lowercased()
        if text.hasPrefix("[") && text.hasSuffix("]") { text = String(text.dropFirst().dropLast()) }
        return text
    }

    /// Renews the session through the refresh callback and verifies the replacement with the authority.
    ///
    /// Requests and replays wait while it runs. If the replacement can't be verified and the original session can't
    /// be confirmed either, the client stays blocked with `SESSION_REFRESH_UNVERIFIED`; replace it with a new client.
    @discardableResult
    public func refreshSession() async throws -> Session {
        try await guarded {
            if let refreshing { return try await refreshing.task.value }
            guard let hook = refreshHook, let binding = session, let currentRoute = route,
                ProtocolChecks.sessionExpiry(binding) > environment.now(), binding.incarnation == incarnation
            else {
                throw ConvoHopError(
                    code: .sessionRefreshRequired, requestId: newRequestId(), outcome: .rejected, status: 409,
                    message: "Configure refreshSession and initialize with the original valid bearer before renewal or expiry")
            }
            let id = UUID()
            let task = Task { () async throws -> Session in
                defer { if self.refreshing?.id == id { self.refreshing = nil } }
                return try await self.performRefresh(hook: hook, binding: binding, oldRoute: currentRoute)
            }
            refreshing = (id, task)
            return try await task.value
        }
    }

    private func suspendForRefresh(_ stream: ConversationStream) {
        guard quiescing != nil, quiescing?.replays.contains(where: { $0 === stream }) == false else { return }
        quiescing?.replays.append(stream)
        quiescing?.work.append(Task { try await stream.suspendForRefresh() })
    }

    private func performRefresh(
        hook: ConvoHopSessionRefresh, binding: Session, oldRoute: ProjectRoute
    ) async throws -> Session {
        let oldToken = token
        quiescing = Quiescing(replays: [], work: [])
        var raised = false
        var replacement: Session?
        var invalidated = false
        var failure: ConvoHopError?
        var replayRoute = oldRoute
        do {
            for stream in streams { suspendForRefresh(stream) }
            var index = 0
            var suspension: (any Error)?
            while let work = quiescing?.work, index < work.count {
                do { try await work[index].value } catch { suspension = suspension ?? error }
                index += 1
            }
            if let suspension { throw suspension }
            if !raised {
                raised = true
                await transport.raiseBarrier()
            }
            await transport.drainActive()
            guard ProtocolChecks.sessionExpiry(binding) > environment.now() else {
                throw ConvoHopError(
                    code: .sessionRefreshRequired, requestId: newRequestId(), outcome: .rejected, status: 409,
                    message: "Original bearer expired while work drained; explicitly retire and bootstrap a new client")
            }
            let supplied: SessionBootstrap
            do {
                supplied = try await hook(binding)
            } catch {
                throw ConvoHopError(
                    code: .sessionRefreshFailed, requestId: newRequestId(), outcome: .unknown, status: nil,
                    message: "Session renewal hook failed; retain the original renewal request and verify its outcome",
                    underlyingError: error)
            }
            let encoded = try JSONValue.encoding(supplied)
            try ProtocolChecks.validateOutput(encoded, "SessionBootstrap!")
            let members = try ProtocolChecks.object(encoded)
            let candidate = try ProtocolChecks.sessionMetadata(members["session"])
            let candidateToken = try ProtocolChecks.string(members["sessionToken"])
            let tokenExpiresAt = try ProtocolChecks.timestamp(members["tokenExpiresAt"])
            guard Self.isValidToken(candidateToken) else { throw ProtocolViolation("Invalid replacement credential") }
            let nextRoute = try validateRoute(
                try await transport.probe("communication.route", projectId: projectId, credential: candidateToken)["result"])
            let proof = try await transport.probe(
                "communication.currentSession", projectId: projectId, credential: candidateToken,
                observedServingEpoch: nextRoute.servingEpoch)
            let metadata = try ProtocolChecks.sessionMetadata(proof["result"])
            invalidated = proof["status"] == .string("ok") && ProtocolChecks.sameSession(binding, metadata)
                && ProtocolChecks.compareCounters(metadata.sessionRevision, binding.sessionRevision) > 0
            let verified = try ProtocolChecks.currentSession(proof, now: environment.now())
            guard ProtocolChecks.sameSession(binding, verified), binding.incarnation == incarnation,
                ProtocolChecks.compareCounters(verified.sessionRevision, binding.sessionRevision) > 0,
                ProtocolChecks.sessionExpiry(verified) > ProtocolChecks.sessionExpiry(binding), verified == candidate,
                tokenExpiresAt == verified.expiresAt,
                (ProtocolChecks.millisecondTimestamp(nextRoute.expiresAt) ?? 0) > environment.now()
            else {
                throw ConvoHopError(
                    code: .sessionRefreshRejected, requestId: proof["requestId"]?.stringValue ?? newRequestId(),
                    outcome: .unknown, status: 409,
                    message: "Replacement must preserve the original session, advance its live revision and expiry, and match authority metadata")
            }
            token = candidateToken
            await transport.replaceCredential(candidateToken)
            session = verified
            replacement = verified
            route = nextRoute
            replayRoute = nextRoute
            await transport.setServingEpoch(nextRoute.servingEpoch)
            await setBlocked(false)
        } catch {
            let primary =
                error as? ConvoHopError
                ?? ConvoHopError(
                    code: .sessionRefreshRejected, requestId: newRequestId(), outcome: .unknown, status: 409,
                    message: "Session replacement or application retirement could not be verified",
                    underlyingError: error)
            failure = primary
            if !raised {
                raised = true
                await transport.raiseBarrier()
            }
            await transport.drainActive()
            await setBlocked(true)
            if !invalidated {
                do {
                    let old = try ProtocolChecks.currentSession(
                        try await transport.probe("communication.currentSession", projectId: projectId, credential: oldToken),
                        now: environment.now())
                    guard old == binding else { throw ProtocolViolation("Original session authority changed") }
                    await setBlocked(false)
                } catch {
                    failure = ConvoHopError(
                        code: .sessionRefreshUnverified, requestId: primary.requestId, outcome: .unknown, status: nil,
                        message: "Renewal and original session authority are unverified; HTTP and realtime remain refresh-blocked",
                        underlyingError: primary)
                }
            } else {
                failure = ConvoHopError(
                    code: .sessionRefreshUnverified, requestId: primary.requestId, outcome: .unknown, status: nil,
                    message: "Authority observed a renewed original session; the old bearer cannot be restored",
                    underlyingError: primary)
            }
        }
        let resumed = quiescing?.replays ?? []
        quiescing = nil
        if raised { await transport.releaseBarrier() }
        if !blocked {
            let resumeRoute = replayRoute, resumeToken = token
            let resumeErrors = await withTaskGroup(of: (any Error)?.self, returning: [any Error].self) { group in
                for stream in resumed {
                    group.addTask {
                        do {
                            try await stream.resumeAfterRefresh(route: resumeRoute, token: resumeToken)
                            return nil
                        } catch {
                            return error
                        }
                    }
                }
                var collected: [any Error] = []
                for await case let error? in group { collected.append(publicError(error)) }
                return collected
            }
            let errors: [any Error] = (failure.map { [$0] } ?? []) + resumeErrors
            if errors.count > 1 { throw ConvoHopAggregateError(errors: errors) }
            if let first = errors.first { throw first }
        }
        if let failure { throw failure }
        guard let replacement else { throw ConvoHopUsageError("Missing verified session replacement") }
        return replacement
    }

    private func setBlocked(_ value: Bool) async {
        blocked = value
        await transport.setBlocked(value)
    }

    // MARK: Requests

    private func guarded<T: Sendable>(_ requestId: String? = nil, _ work: () async throws -> T) async throws -> T {
        do {
            return try await work()
        } catch {
            throw publicError(error, requestId: requestId)
        }
    }

    /// Sends a generated operation with its typed input.
    func execute<Input, Output>(
        _ operation: GraphQLOperation<Input, Output>, _ input: Input, requestId: String? = nil
    ) async throws -> JSONObject {
        let members: JSONObject
        do {
            members = try JSONValue.encoding(input).objectValue ?? [:]
        } catch {
            throw ConvoHopUsageError("Operation input can't be encoded as JSON")
        }
        return try await transport.execute(
            operation.descriptor.key, projectId: projectId, input: members, requestId: requestId)
    }

    /// The non-null result of a validated reply.
    nonisolated func required<T: Decodable>(_ reply: JSONObject, as _: T.Type) throws -> T {
        do {
            guard let value = reply["result"], !value.isNull else { throw ProtocolViolation("Missing operation result") }
            return try value.decoded(as: T.self)
        } catch {
            throw publicError(error, requestId: reply["requestId"]?.stringValue)
        }
    }

    /// The result of a validated reply, which may be null.
    nonisolated func optional<T: Decodable>(_ reply: JSONObject, as _: T.Type) throws -> T? {
        guard let value = reply["result"], !value.isNull else { return nil }
        return try required(reply, as: T.self)
    }

    /// A bounded page result.
    nonisolated func page<T: Decodable>(_ reply: JSONObject, as _: T.Type) throws -> T {
        do {
            _ = try ProtocolChecks.page(reply["result"])
        } catch {
            throw publicError(error, requestId: reply["requestId"]?.stringValue)
        }
        return try required(reply, as: T.self)
    }

    static func requireId(_ value: String, _ name: String) throws -> String {
        guard ProtocolChecks.isCanonicalUUID(value) else { throw ConvoHopUsageError("Invalid \(name) ID") }
        return value
    }

    static func requireCounter(_ value: String, _ name: String) throws -> String {
        guard ProtocolChecks.isCanonicalDecimal(value) else { throw ConvoHopUsageError("Invalid \(name)") }
        return value
    }

    static func requireRequestId(_ value: String?) throws -> String? {
        guard let value else { return nil }
        return try requireId(value, "request")
    }

    // MARK: Conversations and messages

    /// A handle for one conversation's messages, mute and calls.
    public nonisolated func conversation(_ conversationId: String) throws -> ConversationHandle {
        ConversationHandle(client: self, conversationId: try Self.requireId(conversationId, "conversation"))
    }

    public func getConversation(_ conversationId: String) async throws -> Conversation {
        try await guarded { try await rawConversation(conversationId) }
    }

    func rawConversation(_ conversationId: String) async throws -> Conversation {
        let id = try Self.requireId(conversationId, "conversation")
        return try required(
            try await execute(ConvoHopOperations.communicationGetConversation, .init(conversationId: id)),
            as: Conversation.self)
    }

    /// Up to 100 messages before `sequence`, newest first.
    public func messages(in conversationId: String, before sequence: String? = nil) async throws -> MessagePage {
        try await guarded {
            let input = MessagesRequestInput(
                conversationId: try Self.requireId(conversationId, "conversation"), limit: 100,
                beforeSequence: try sequence.map { try Self.requireCounter($0, "sequence") })
            return try page(try await execute(ConvoHopOperations.communicationMessages, input), as: MessagePage.self)
        }
    }

    /// One message, or `nil` when it isn't visible to this user.
    public func getMessage(_ messageId: String, in conversationId: String) async throws -> Message? {
        try await guarded {
            let input = GetMessageRequestInput(
                conversationId: try Self.requireId(conversationId, "conversation"),
                messageId: try Self.requireId(messageId, "message"))
            let message = try optional(
                try await execute(ConvoHopOperations.communicationGetMessage, input), as: Message.self)
            if let message, message.conversationId != input.conversationId || message.messageId != input.messageId {
                throw ProtocolViolation("Message is outside the requested scope")
            }
            return message
        }
    }

    /// Sends a message. Pass the same `requestId` to resend after an uncertain outcome.
    public func send(
        _ text: String, to conversationId: String, props: JSONObject = [:], requestId: String? = nil
    ) async throws -> SendReceipt {
        let requestId = try Self.requireRequestId(requestId)
        return try await guarded(requestId) {
            let id = try Self.requireId(conversationId, "conversation")
            let reply = try await execute(
                ConvoHopOperations.communicationSendMessage,
                SendMessageRequestInput(conversationId: id, text: text, props: props), requestId: requestId)
            let ack = try required(reply, as: MessageAck.self)
            guard let cursor = ack.cursor, ack.status == "sent", ack.conversationId == id, cursor.conversationId == id,
                cursor.sequence == ack.sequence, cursor.incarnation == incarnation
            else {
                throw publicError(
                    ProtocolViolation("Invalid send receipt scope"), requestId: reply["requestId"]?.stringValue)
            }
            return SendReceipt(
                messageId: ack.messageId, conversationId: ack.conversationId, sequence: ack.sequence,
                revision: ack.revision, status: ack.status, cursor: cursor)
        }
    }

    /// Replaces a message's text. It fails with `REVISION_CONFLICT` if the message changed since `message`.
    public func edit(_ message: Message, text: String, requestId: String? = nil) async throws -> Message {
        let requestId = try Self.requireRequestId(requestId)
        return try await guarded(requestId) {
            let input = EditMessageRequestInput(
                conversationId: try Self.requireId(message.conversationId, "conversation"),
                messageId: try Self.requireId(message.messageId, "message"),
                expectedRevision: try Self.requireCounter(message.revision, "revision"), text: text)
            return try required(
                try await execute(ConvoHopOperations.communicationEditMessage, input, requestId: requestId),
                as: Message.self)
        }
    }

    /// Deletes a message. It fails with `REVISION_CONFLICT` if the message changed since `message`.
    public func delete(_ message: Message, requestId: String? = nil) async throws -> Message {
        let requestId = try Self.requireRequestId(requestId)
        return try await guarded(requestId) {
            let input = DeleteMessageRequestInput(
                conversationId: try Self.requireId(message.conversationId, "conversation"),
                messageId: try Self.requireId(message.messageId, "message"),
                expectedRevision: try Self.requireCounter(message.revision, "revision"))
            return try required(
                try await execute(ConvoHopOperations.communicationDeleteMessage, input, requestId: requestId),
                as: Message.self)
        }
    }

    /// Up to 100 events after `cursor`, with the authoritative frontier.
    public func events(in conversationId: String, after cursor: Cursor? = nil) async throws -> EventBatch {
        try await guarded { try await rawEvents(conversationId, after: cursor) }
    }

    func rawEvents(_ conversationId: String, after cursor: Cursor?) async throws -> EventBatch {
        let id = try Self.requireId(conversationId, "conversation")
        let input = EventsRequestInput(
            conversationId: id, limit: 100,
            after: cursor.map { CursorInput(incarnation: $0.incarnation, conversationId: $0.conversationId, sequence: $0.sequence) })
        let reply = try await execute(ConvoHopOperations.communicationEvents, input)
        do {
            let frame = try ProtocolChecks.eventPage(
                reply["result"], incarnation: incarnation, conversationId: id, after: cursor)
            return EventBatch(
                events: try frame.events.map { try JSONValue.object($0).decoded(as: Event.self) },
                complete: frame.complete, refreshRequired: frame.refreshRequired, nextCursor: frame.nextCursor)
        } catch {
            throw publicError(error, requestId: reply["requestId"]?.stringValue)
        }
    }

    /// Reports that this user read the conversation through `sequence`.
    public func reportRead(
        in conversationId: String, membership: Member, through sequence: String
    ) async throws -> ReadReceipt {
        try await guarded {
            let input = ReportReceiptRequestInput(
                conversationId: try Self.requireId(conversationId, "conversation"), kind: "read",
                membershipEpoch: try Self.requireCounter(membership.membershipEpoch, "membership epoch"),
                visibilityEpoch: try Self.requireCounter(membership.visibilityEpoch, "visibility epoch"),
                throughSequence: try Self.requireCounter(sequence, "sequence"))
            return try required(
                try await execute(ConvoHopOperations.communicationReportReceipt, input), as: ReadReceipt.self)
        }
    }

    /// Up to 100 members' read receipts.
    public func receipts(in conversationId: String, cursor: String? = nil) async throws -> ReceiptPage {
        try await guarded {
            let input = ReceiptsRequestInput(
                conversationId: try Self.requireId(conversationId, "conversation"), limit: 100, cursor: cursor)
            return try page(try await execute(ConvoHopOperations.communicationReceipts, input), as: ReceiptPage.self)
        }
    }

    /// Up to 100 members.
    public func members(in conversationId: String, cursor: String? = nil) async throws -> MemberPage {
        try await guarded {
            let input = MembersRequestInput(
                conversationId: try Self.requireId(conversationId, "conversation"), limit: 100, cursor: cursor)
            return try page(try await execute(ConvoHopOperations.communicationMembers, input), as: MemberPage.self)
        }
    }

    /// This user's conversations, most recent activity first.
    public func inbox(cursor: String? = nil) async throws -> InboxPage {
        try await guarded {
            try page(
                try await execute(ConvoHopOperations.communicationInbox, InboxRequestInput(limit: 100, cursor: cursor)),
                as: InboxPage.self)
        }
    }

    /// Searches visible messages, optionally in some conversations only.
    public func search(_ query: String, in conversationIds: [String]? = nil, cursor: String? = nil) async throws
        -> SearchPage
    {
        try await guarded {
            let scope = try conversationIds.map {
                SearchScopeInput(conversationIds: try $0.map { try Self.requireId($0, "conversation") })
            }
            let reply = try await execute(
                ConvoHopOperations.communicationSearch,
                SearchRequestInput(query: query, pageSize: 100, scope: scope, cursor: cursor))
            let result = try page(reply, as: SearchPage.self)
            for hit in result.items {
                guard let message = hit.message, message.conversationId == hit.conversationId else {
                    throw publicError(
                        ProtocolViolation("Search hit conversation scope does not match its message"),
                        requestId: reply["requestId"]?.stringValue)
                }
            }
            return result
        }
    }

    /// Tells other members whether this user is typing. Typing is a signal: it is never stored, resent or resolved.
    @discardableResult
    public func setTyping(_ isTyping: Bool, in conversationId: String) async throws -> Bool {
        try await guarded {
            let input = TypingRequestInput(
                conversationId: try Self.requireId(conversationId, "conversation"), isTyping: isTyping)
            return try required(
                try await execute(ConvoHopOperations.communicationTyping, input), as: TypingStatus.self
            ).accepted
        }
    }

    /// The features, limits and API model the authority supports.
    public func capabilities() async throws -> Capabilities {
        try await guarded {
            try required(
                try await execute(ConvoHopOperations.communicationCapabilities, NoInput()), as: Capabilities.self)
        }
    }

    /// Call alerts for this user.
    public func liveAlerts(limit: Int = 50, cursor: String? = nil) async throws -> LiveAlertPage {
        try await guarded {
            guard (1...100).contains(limit) else { throw ConvoHopUsageError("Page limit must be 1...100") }
            return try page(
                try await execute(
                    ConvoHopOperations.communicationLiveSessionAlerts, LiveAlertsInput(limit: limit, cursor: cursor)),
                as: LiveAlertPage.self)
        }
    }

    /// A handle for a call.
    public func liveSession(_ liveSessionId: String) async throws -> LiveSessionHandle {
        try await guarded { try await LiveSessionHandle.load(client: self, liveSessionId: liveSessionId) }
    }

    // MARK: Recovery

    /// Looks up a recorded request's outcome without resending it.
    public func resolveRequest(_ requestId: String) async throws -> RequestResolution {
        try await guarded(requestId) { try await rawResolve(requestId) }
    }

    func rawResolve(_ requestId: String) async throws -> RequestResolution {
        let id = try Self.requireId(requestId, "request")
        let reply = try await execute(
            ConvoHopOperations.communicationResolveRequest, ResolveRequestRequestInput(requestId: id))
        guard let resolution = try optional(reply, as: RequestResolution.self) else {
            throw publicError(
                ProtocolViolation("Missing current request resolution"), requestId: reply["requestId"]?.stringValue)
        }
        return resolution
    }

    /// Resends a recorded request with its original ID and payload, within its retry budget.
    public func retryRequest(_ requestId: String) async throws -> RequestResolution {
        try await guarded(requestId) {
            let resolution = try await transport.retry(try Self.requireId(requestId, "request"))
            do {
                return try JSONValue.object(resolution).decoded(as: RequestResolution.self)
            } catch {
                throw publicError(error, requestId: requestId)
            }
        }
    }

    /// The recorded mutations, oldest first.
    public func recoveryStates() async throws -> [RecoveryState] {
        try await guarded { try await transport.recoveryStates() }
    }

    /// Resends or resolves up to 16 recorded mutations with uncertain outcomes. Errors go to `onError`.
    public func recoverPending(onError: @escaping @Sendable (any Error) -> Void) async {
        let states: [RecoveryState]
        do {
            states = try await transport.recoveryStates()
        } catch {
            onError(publicError(error))
            return
        }
        let transient: Set<String> = [
            "submitted", "TRANSPORT_UNKNOWN", "OUTCOME_UNKNOWN", "AUTHORITY_UNAVAILABLE", "RETRY_EXHAUSTED",
            "ADMISSION_LIMIT", "HTTP_FAILURE", "INVALID_RESPONSE",
        ]
        for state in states.filter({ $0.resolutionState == .pending || $0.resolutionState == .unknown }).prefix(16) {
            let now = environment.now()
            let resend = transient.contains(state.lastAttemptClassification) && state.attemptCount < 3
                && now >= state.lastAttemptAt && now >= state.firstSubmittedAt && now <= state.retryDeadline
            do {
                if resend { _ = try await transport.retry(state.requestId) } else { _ = try await rawResolve(state.requestId) }
            } catch {
                onError(publicError(error, requestId: state.requestId))
            }
        }
    }

    /// Marks that a native media connection used a credential, so it is resolved instead of reused.
    func markMediaAdmissionAttempted(_ requestId: String) async throws {
        try await transport.markMediaAdmissionAttempted(requestId)
    }

    // MARK: Replay

    /// Replays a conversation's events from its stored cursor, then follows them in real time.
    ///
    /// `apply` receives each ordered batch once; the cursor advances only after it returns. Make it idempotent:
    /// after a crash, events after the last stored cursor are delivered again. Close the stream when you're done.
    public func watch(
        _ conversationId: String, apply: @escaping @Sendable ([Event]) async throws -> Void,
        onError: @escaping @Sendable (any Error) -> Void
    ) async throws -> ConversationStream {
        try await guarded {
            try await openReplay(
                try Self.requireId(conversationId, "conversation"), apply: apply, onError: onError, resync: false)
        }
    }

    /// Replaces a conversation's replays with one that starts from the beginning of authorized history.
    ///
    /// Use it after ``ConvoHopReplayError/resyncRequired``, for example when this user's visibility changed.
    public func resyncAuthorizedHistory(
        _ conversationId: String, apply: @escaping @Sendable ([Event]) async throws -> Void,
        onError: @escaping @Sendable (any Error) -> Void
    ) async throws -> ConversationStream {
        try await guarded {
            try checkReplayAdmission()
            let id = try Self.requireId(conversationId, "conversation")
            replayGenerations[id, default: 0] += 1
            for stream in streams where stream.conversationId == id { await stream.close() }
            return try await openReplay(id, apply: apply, onError: onError, resync: true)
        }
    }

    private func checkReplayAdmission() throws {
        if blocked || quiescing != nil {
            throw ConvoHopError(
                code: .sessionRefreshRequired, requestId: newRequestId(), outcome: .rejected, status: 409,
                message: "Session refresh holds replay admission; await verified refresh before opening or resynchronizing history")
        }
    }

    private func openReplay(
        _ conversationId: String, apply: @escaping @Sendable ([Event]) async throws -> Void,
        onError: @escaping @Sendable (any Error) -> Void, resync: Bool
    ) async throws -> ConversationStream {
        try checkReplayAdmission()
        let generation = replayGenerations[conversationId, default: 0]
        var retiring: [ConversationStream] = []
        for stream in streams where stream.conversationId == conversationId {
            if await stream.isClosed { retiring.append(stream) }
        }
        for stream in retiring { try await stream.retire() }
        let route: ProjectRoute
        if let current = self.route { route = current } else { route = try await initializeRoute() }
        try checkReplayAdmission()
        guard generation == replayGenerations[conversationId, default: 0] else { throw ConvoHopReplayError.superseded }
        let key = "convohop.cursor:\(projectId):\(principalId):\(conversationId)"
        let cursor = resync ? nil : try await storedCursor(key, conversationId: conversationId)
        try checkReplayAdmission()
        guard generation == replayGenerations[conversationId, default: 0] else { throw ConvoHopReplayError.superseded }
        let stream = ConversationStream(
            client: self, conversationId: conversationId, route: route, token: token, cursor: cursor,
            storageKey: key, apply: apply, onError: onError)
        streams.append(stream)
        if quiescing != nil { suspendForRefresh(stream) }
        do {
            if resync { try await stream.resyncAuthorizedHistory() } else { try await stream.start() }
            try checkReplayAdmission()
            guard generation == replayGenerations[conversationId, default: 0] else {
                throw ConvoHopReplayError.superseded
            }
            return stream
        } catch {
            await stream.close()
            throw error
        }
    }

    private func storedCursor(_ key: String, conversationId: String) async throws -> Cursor? {
        guard let storage else { return nil }
        let saved: String?
        do {
            saved = try await storage.value(forKey: key)
        } catch {
            throw ConvoHopError(
                code: .recoveryStorageFailure, requestId: newRequestId(), outcome: .rejected, status: nil,
                message: "Replay cursor storage is unavailable; no history was requested", underlyingError: error)
        }
        guard let saved, !saved.isEmpty else { return nil }
        do {
            let cursor = try ProtocolChecks.cursor(try JSONParser.parse(saved))
            guard cursor.incarnation == incarnation, cursor.conversationId == conversationId else {
                throw ProtocolViolation("Stored replay cursor belongs to another scope")
            }
            return cursor
        } catch {
            throw ConvoHopError(
                code: .recoveryStorageFailure, requestId: newRequestId(), outcome: .rejected, status: nil,
                message: "Stored replay cursor is corrupt; resynchronize authorized history", underlyingError: error)
        }
    }

    func removeStream(_ stream: ConversationStream) {
        streams.removeAll { $0 === stream }
    }
}
