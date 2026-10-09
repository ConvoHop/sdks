import Foundation

/// The ICE candidates a media connection may use.
public enum ConvoHopICETransportPolicy: String, Sendable {
    /// Direct and relayed candidates.
    case all
    /// Relayed candidates only: TURN hides the device's addresses.
    case relay
}

/// What a media room reports about the connection it made.
public enum ConvoHopMediaRoomEvent: Sendable, Equatable {
    /// The room lost its connection and is resuming it with the current or a server-refreshed token.
    case resuming
    /// The room resumed. `participantId` is the local participant's server ID after the resume.
    case resumed(participantId: String?)
    /// The room disconnected without ``ConvoHopMediaRoom/disconnect()``.
    case disconnected
}

/// A native media room that joins one LiveKit room with a single-use token.
///
/// `ConvoHopLiveKit` provides ``ConvoHopMediaRoom`` for the official LiveKit Swift SDK. Implement it yourself only to
/// wrap another LiveKit client.
public protocol ConvoHopMediaRoom: AnyObject, Sendable {
    /// Connects once with `token`, without capture. Returns the local participant's server ID.
    ///
    /// Report the connection's events through `onEvent`, in order: ``ConvoHopMediaRoomEvent/resuming`` and
    /// ``ConvoHopMediaRoomEvent/resumed(participantId:)`` around each resume, and
    /// ``ConvoHopMediaRoomEvent/disconnected`` at most once, when the room disconnects without ``disconnect()``. Never
    /// log or store the token, and never connect with it again.
    func connect(
        url: URL, token: String, iceTransportPolicy: ConvoHopICETransportPolicy,
        onEvent: @escaping @Sendable (ConvoHopMediaRoomEvent) -> Void
    ) async throws -> String
    func setMicrophone(enabled: Bool) async throws
    func setCamera(enabled: Bool) async throws
    /// Disconnects, if connected, and releases the room's tracks, renderers and delegates. Reports no event.
    ///
    /// The SDK also calls it after the room disconnected by itself, so it must be safe to call more than once.
    func disconnect() async
}

/// How a participation connects native media.
public struct ConvoHopMediaOptions: Sendable {
    public var iceTransportPolicy: ConvoHopICETransportPolicy
    /// Creates a fresh room for each connection.
    public var makeRoom: @Sendable () -> any ConvoHopMediaRoom
    /// Called when media disconnects unexpectedly. Reconnect with ``MediaConnection/reconnect()``.
    public var onDisconnected: (@Sendable () -> Void)?
    /// Called when the room lost its connection and is resuming it.
    public var onResuming: (@Sendable () -> Void)?
    /// Called when the room resumed the same native connection.
    public var onResumed: (@Sendable () -> Void)?

    public init(
        iceTransportPolicy: ConvoHopICETransportPolicy = .all, onDisconnected: (@Sendable () -> Void)? = nil,
        onResuming: (@Sendable () -> Void)? = nil, onResumed: (@Sendable () -> Void)? = nil,
        makeRoom: @escaping @Sendable () -> any ConvoHopMediaRoom
    ) {
        self.iceTransportPolicy = iceTransportPolicy
        self.onDisconnected = onDisconnected
        self.onResuming = onResuming
        self.onResumed = onResumed
        self.makeRoom = makeRoom
    }
}

/// One native media connection of a participation. Its credential admits exactly one connection.
///
/// A dropped connection resumes within LiveKit while its token allows; ``resuming`` is true meanwhile. A resume must
/// keep the admitted connection: anything else closes it. Then connect again with fresh credentials:
/// call ``reconnect()``.
public actor MediaConnection {
    public nonisolated let participation: LiveParticipationHandle
    /// The room, for rendering tracks and reading statistics. `ConvoHopLiveKit`'s room exposes LiveKit's `Room`.
    public nonisolated let room: any ConvoHopMediaRoom
    public nonisolated let options: ConvoHopMediaOptions
    /// The media server's ID for this connection, once connected.
    public private(set) var nativeConnectionId: String?
    /// Whether the room is resuming this connection after a network interruption.
    public private(set) var resuming = false
    private let permissions: LiveMediaPermissions
    private var closed = false
    private var left = false
    private var reconnecting: Task<MediaConnection, any Error>?
    private var events: AsyncStream<ConvoHopMediaRoomEvent>.Continuation?

    private init(participation: LiveParticipationHandle, options: ConvoHopMediaOptions) {
        self.participation = participation
        self.options = options
        permissions = participation.snapshot.permissions
        room = options.makeRoom()
    }

    /// Admits one native connection: obtains a participation-bound grant, checks where its token may go, records the
    /// attempt durably, and only then creates the room and connects it, once. Connect never starts capture.
    static func open(
        participation: LiveParticipationHandle, options: ConvoHopMediaOptions, requestId: String?
    ) async throws -> MediaConnection {
        let (credentialRequest, grant) = try await participation.connectionGrant(requestId: requestId)
        guard grant.admissionTicket["participationId"]?.stringValue == participation.participationId,
            grant.forwardingLease["participationId"]?.stringValue == participation.participationId
        else { throw ProtocolViolation("Native proof is not participation-bound") }
        let url = try nativeTarget(grant, now: participation.live.client.environment.now())
        // The durable marker precedes the only connection attempt; an uncertain admission is later resolved, never
        // reused.
        try await participation.connectionAttempted()
        let result = MediaConnection(participation: participation, options: options)
        try await result.start(url: url, token: grant.connectToken, requestId: credentialRequest)
        return result
    }

    /// Checks where the single-use connect token may be sent, before anything is sent. Returns the media server URL.
    static func nativeTarget(_ grant: LiveConnectionGrant, now: Int) throws -> URL {
        let url = try mediaURL(grant.livekitUrl)
        guard let leaseExpiry = ProtocolChecks.instant(grant.leaseExpiresAt) else {
            throw ProtocolViolation("Expected an RFC 3339 lease expiry")
        }
        if leaseExpiry <= now { throw ConvoHopLiveError.freshCredentialsRequired }
        guard !grant.connectToken.isEmpty else { throw ProtocolViolation("Missing media connect token") }
        return url
    }

    private func start(url: URL, token: String, requestId: String) async throws {
        var continuation: AsyncStream<ConvoHopMediaRoomEvent>.Continuation?
        let stream = AsyncStream<ConvoHopMediaRoomEvent> { continuation = $0 }
        guard let sink = continuation else { preconditionFailure("AsyncStream builds its continuation synchronously") }
        events = sink
        do {
            let sid = try await room.connect(
                url: url, token: token, iceTransportPolicy: options.iceTransportPolicy,
                onEvent: { sink.yield($0) })
            guard ProtocolChecks.isCanonicalUUID(sid) else { throw ProtocolViolation("Native connection ID is malformed") }
            nativeConnectionId = sid
        } catch {
            await disconnect()
            // The failure is not attached: native SDK errors can carry the token-bearing signaling URL.
            throw ConvoHopError(
                code: .mediaConnectFailed, requestId: requestId, outcome: .unknown, status: nil,
                message:
                    "Native connection failed. The participation reservation remains; resolve and retry connect, or explicitly leave.")
        }
        // The stream holds earlier events until the connection is known, then delivers them in order.
        Task { [weak self] in
            for await event in stream {
                guard let self else { return }
                await self.handle(event)
            }
        }
    }

    /// A `wss` origin, or `ws` on loopback, without a query, fragment or user information.
    static func mediaURL(_ text: String) throws -> URL {
        guard let components = URLComponents(string: text), let host = components.host, let url = components.url,
            components.query == nil, components.fragment == nil, components.user == nil, components.password == nil
        else { throw ProtocolViolation("Invalid media origin") }
        switch components.scheme {
        case "wss": return url
        case "ws" where ["127.0.0.1", "localhost", "[::1]", "::1"].contains(host): return url
        default: throw ProtocolViolation("Invalid media origin")
        }
    }

    private func handle(_ event: ConvoHopMediaRoomEvent) async {
        switch event {
        case .resuming:
            guard !closed else { return }
            resuming = true
            options.onResuming?()
        case .resumed(let participantId):
            resuming = false
            guard !closed else { return }
            // A resume keeps the admitted connection. Any other identity wasn't admitted with this participation's
            // grant.
            guard participantId == nativeConnectionId else {
                await close(deliberate: false)
                options.onDisconnected?()
                return
            }
            options.onResumed?()
        case .disconnected:
            resuming = false
            guard !closed else { return }
            await close(deliberate: false)
            options.onDisconnected?()
        }
    }

    /// Replaces a dropped connection with a new one, using fresh credentials. Concurrent calls share one attempt.
    public func reconnect() async throws -> MediaConnection {
        if let reconnecting { return try await reconnecting.value }
        if left { throw ConvoHopLiveError.connectionClosed }
        let work = Task { () async throws -> MediaConnection in
            defer { self.reconnecting = nil }
            await self.close(deliberate: false)
            if self.left { throw ConvoHopLiveError.closedDuringReconnect }
            let next = try await self.participation.connect(self.options)
            if self.left {
                await next.disconnect()
                throw ConvoHopLiveError.closedDuringReconnect
            }
            return next
        }
        reconnecting = work
        return try await work.value
    }

    /// Whether media is connected and not closed.
    public var connected: Bool { !closed && nativeConnectionId != nil }

    /// Starts or stops the microphone. Ask for microphone permission first.
    public func microphone(_ enabled: Bool) async throws {
        guard connected, permissions.microphone else { throw ConvoHopLiveError.microphoneNotAuthorized }
        try await room.setMicrophone(enabled: enabled)
    }

    /// Starts or stops the camera. Ask for camera permission first.
    public func camera(_ enabled: Bool) async throws {
        guard connected, permissions.camera else { throw ConvoHopLiveError.cameraNotAuthorized }
        try await room.setCamera(enabled: enabled)
    }

    /// Disconnects for good. The participation stays joined until you leave it.
    public func disconnect() async {
        await close(deliberate: true)
    }

    private func close(deliberate: Bool) async {
        closed = true
        resuming = false
        left = left || deliberate
        events?.finish()
        await room.disconnect()
    }
}
