import Foundation

/// The ICE candidates a media connection may use.
public enum ConvoHopICETransportPolicy: String, Sendable {
    /// Direct and relayed candidates.
    case all
    /// Relayed candidates only: TURN hides the device's addresses.
    case relay
}

/// A native media room that joins one LiveKit room with a single-use token.
///
/// `ConvoHopLiveKit` provides ``ConvoHopMediaRoom`` for the official LiveKit Swift SDK. Implement it yourself only to
/// wrap another LiveKit client.
public protocol ConvoHopMediaRoom: AnyObject, Sendable {
    /// Connects once with `token`, without capture. Returns the local participant's server ID.
    ///
    /// Call `onDisconnected` at most once, when the room disconnects without ``disconnect()``. Never log or store the
    /// token, and never connect with it again.
    func connect(
        url: URL, token: String, iceTransportPolicy: ConvoHopICETransportPolicy,
        onDisconnected: @escaping @Sendable () -> Void
    ) async throws -> String
    func setMicrophone(enabled: Bool) async throws
    func setCamera(enabled: Bool) async throws
    /// Disconnects and releases the room's tracks, renderers and delegates.
    func disconnect() async
}

/// How a participation connects native media.
public struct ConvoHopMediaOptions: Sendable {
    public var iceTransportPolicy: ConvoHopICETransportPolicy
    /// Creates a fresh room for each connection.
    public var makeRoom: @Sendable () -> any ConvoHopMediaRoom
    /// Called when media disconnects unexpectedly. Reconnect with ``MediaConnection/reconnect()``.
    public var onDisconnected: (@Sendable () -> Void)?

    public init(
        iceTransportPolicy: ConvoHopICETransportPolicy = .all, onDisconnected: (@Sendable () -> Void)? = nil,
        makeRoom: @escaping @Sendable () -> any ConvoHopMediaRoom
    ) {
        self.iceTransportPolicy = iceTransportPolicy
        self.onDisconnected = onDisconnected
        self.makeRoom = makeRoom
    }
}

/// One native media connection of a participation. Its credential admits exactly one connection.
///
/// A dropped connection resumes within LiveKit while its token allows. Anything else needs a new connection with fresh
/// credentials: call ``reconnect()``.
public actor MediaConnection {
    public nonisolated let participation: LiveParticipationHandle
    /// The room, for rendering tracks and reading statistics. `ConvoHopLiveKit`'s room exposes LiveKit's `Room`.
    public nonisolated let room: any ConvoHopMediaRoom
    public nonisolated let options: ConvoHopMediaOptions
    /// The media server's ID for this connection, once connected.
    public private(set) var nativeConnectionId: String?
    private let permissions: LiveMediaPermissions
    private var closed = false
    private var left = false
    private var reconnecting: Task<MediaConnection, any Error>?

    private init(participation: LiveParticipationHandle, options: ConvoHopMediaOptions) {
        self.participation = participation
        self.options = options
        permissions = participation.snapshot.permissions
        room = options.makeRoom()
    }

    /// Connect never starts capture.
    static func open(
        participation: LiveParticipationHandle, options: ConvoHopMediaOptions, requestId: String?
    ) async throws -> MediaConnection {
        let result = MediaConnection(participation: participation, options: options)
        let (credentialRequest, grant) = try await participation.connectionGrant(requestId: requestId)
        guard grant.admissionTicket["participationId"]?.stringValue == participation.participationId,
            grant.forwardingLease["participationId"]?.stringValue == participation.participationId
        else { throw ProtocolViolation("Native proof is not participation-bound") }
        try await participation.connectionAttempted()
        try await result.start(grant, requestId: credentialRequest)
        return result
    }

    private func start(_ grant: LiveConnectionGrant, requestId: String) async throws {
        let url = try Self.mediaURL(grant.livekitUrl)
        guard let leaseExpiry = ProtocolChecks.instant(grant.leaseExpiresAt) else {
            throw ProtocolViolation("Expected an RFC 3339 lease expiry")
        }
        if leaseExpiry <= participation.live.client.environment.now() {
            throw ConvoHopLiveError.freshCredentialsRequired
        }
        do {
            let sid = try await room.connect(
                url: url, token: grant.connectToken, iceTransportPolicy: options.iceTransportPolicy,
                onDisconnected: { [weak self] in
                    guard let self else { return }
                    Task { await self.roomDisconnected() }
                })
            guard ProtocolChecks.isCanonicalUUID(sid) else { throw ProtocolViolation("Native connection ID is malformed") }
            nativeConnectionId = sid
        } catch {
            await disconnect()
            throw ConvoHopError(
                code: .mediaConnectFailed, requestId: requestId, outcome: .unknown, status: nil,
                message:
                    "Native connection failed. The participation reservation remains; resolve and retry connect, or explicitly leave.",
                underlyingError: error)
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

    private func roomDisconnected() {
        guard !closed, nativeConnectionId != nil else { return }
        closed = true
        options.onDisconnected?()
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
        left = left || deliberate
        await room.disconnect()
    }
}
