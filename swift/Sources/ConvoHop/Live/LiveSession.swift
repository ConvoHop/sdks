import Foundation

/// A failure of the call layer's own rules, before or instead of a request.
public enum ConvoHopLiveError: Error, Sendable, Equatable, CustomStringConvertible, LocalizedError {
    /// This participation was left. Resolve the leave's cutoff and join again.
    case leaveRequested
    /// The participation was left while media was connecting; the new connection was closed.
    case leftDuringConnection
    /// A leave is already recorded with another request ID. Resolve it first.
    case leaveIdentityConflict
    /// The connection was closed deliberately, so it can't reconnect. Connect the participation again.
    case connectionClosed
    /// The connection was closed while it reconnected.
    case closedDuringReconnect
    /// The media lease expired before the connection. Connect again for fresh credentials.
    case freshCredentialsRequired
    /// The participation may not publish a microphone, or media isn't connected.
    case microphoneNotAuthorized
    /// The participation may not publish a camera, or media isn't connected.
    case cameraNotAuthorized

    public var description: String {
        switch self {
        case .leaveRequested: "Leave has been requested; resolve its cutoff before rejoining"
        case .leftDuringConnection: "Participation was left during connection"
        case .leaveIdentityConflict: "Resolve the original leave request before replacing its identity"
        case .connectionClosed: "A deliberately closed connection cannot reconnect"
        case .closedDuringReconnect: "Connection was closed during reconnect"
        case .freshCredentialsRequired: "Fresh media credentials are required"
        case .microphoneNotAuthorized: "Microphone is not authorized for this participation"
        case .cameraNotAuthorized: "Camera is not authorized for this participation"
        }
    }

    public var errorDescription: String? { description }
}

/// One call occurrence. A handle stays bound to the generation it was read at.
public actor LiveSessionHandle {
    public nonisolated let client: ConvoHopClient
    /// The call as it was when this handle was created.
    public nonisolated let snapshot: LiveSession
    public nonisolated let liveSessionId: String
    public nonisolated let generation: String
    public nonisolated let conversationId: String
    private var endRequest: String? {
        didSet { retainer.hold(endRequest.map { [$0] } ?? []) }
    }
    /// Keeps the record of the end request, which holds its original revision, while the app keeps this handle.
    private let retainer = RecoveryRetainer()

    init(client: ConvoHopClient, snapshot: LiveSession) throws {
        guard ProtocolChecks.isCanonicalUUID(snapshot.liveSessionId),
            ProtocolChecks.isCanonicalUUID(snapshot.conversationId),
            ProtocolChecks.isCanonicalDecimal(snapshot.generation)
        else { throw ProtocolViolation("Live session identity is malformed") }
        self.client = client
        self.snapshot = snapshot
        liveSessionId = snapshot.liveSessionId
        generation = snapshot.generation
        conversationId = snapshot.conversationId
        client.transport.retention.add(retainer)
    }

    static func load(client: ConvoHopClient, liveSessionId: String) async throws -> LiveSessionHandle {
        let id = try ConvoHopClient.requireId(liveSessionId, "live session")
        let session = try client.required(
            try await client.execute(ConvoHopOperations.communicationLiveSession, LiveSessionInput(liveSessionId: id)),
            as: LiveSession.self)
        guard session.liveSessionId == id else { throw ProtocolViolation("Live session does not match the request") }
        return try LiveSessionHandle(client: client, snapshot: session)
    }

    /// The call's current state.
    public func get() async throws -> LiveSession {
        try await publicErrors { try await current() }
    }

    func current() async throws -> LiveSession {
        let current = try await Self.load(client: client, liveSessionId: liveSessionId).snapshot
        guard current.generation == generation, current.conversationId == conversationId else {
            throw ProtocolViolation("Live occurrence identity changed")
        }
        return current
    }

    /// Joins the call. Then connect media with ``LiveParticipationHandle/connect(_:requestId:)``.
    public func join(requestId: String? = nil) async throws -> LiveParticipationHandle {
        let requestId = try ConvoHopClient.requireRequestId(requestId)
        return try await publicErrors(requestId: requestId) {
            let joined = try client.required(
                try await client.execute(
                    ConvoHopOperations.communicationJoinLiveSession,
                    JoinLiveSessionInput(liveSessionId: liveSessionId, expectedGeneration: generation),
                    requestId: requestId),
                as: LiveSessionJoined.self)
            guard joined.liveSessionId == liveSessionId, joined.generation == generation,
                joined.participation.principalId == client.principalId
            else { throw ProtocolViolation("Joined participation does not match the request") }
            return try await LiveParticipationHandle.load(live: self, snapshot: joined.participation)
        }
    }

    /// This user's participation, or `nil` when they haven't joined.
    public func participation() async throws -> LiveParticipationHandle? {
        try await publicErrors {
            guard let current = try await current().myParticipation else { return nil }
            return try await LiveParticipationHandle.load(live: self, snapshot: current)
        }
    }

    /// The call's participants.
    public func participants(limit: Int = 50, cursor: String? = nil) async throws -> LiveParticipantPage {
        try await publicErrors {
            let input = LiveParticipantsInput(
                liveSessionId: liveSessionId, limit: try requirePageLimit(limit), cursor: cursor)
            return try client.page(
                try await client.execute(ConvoHopOperations.communicationLiveSessionParticipants, input),
                as: LiveParticipantPage.self)
        }
    }

    /// Rings conversation members.
    public nonisolated var alerts: LiveSessionAlerts { LiveSessionAlerts(live: self) }

    /// Ends the call for everyone. Await ``LiveAction/completed(timeout:)`` on the result for media cutoff.
    ///
    /// Without `requestId`, an end that is already recorded for this call is resent with its original ID.
    public func end(requestId: String? = nil) async throws -> LiveEndOperation {
        let requested = try ConvoHopClient.requireRequestId(requestId)
        return try await publicErrors(requestId: requested ?? endRequest) {
            let states = try await client.transport.recoveryStates()
            let request =
                requested ?? endRequest
                ?? states.last(where: {
                    $0.operation == "communication.endLiveSession"
                        && $0.input["liveSessionId"]?.stringValue == liveSessionId
                })?.requestId ?? newRequestId()
            endRequest = request
            let revision: String
            if let saved = states.first(where: { $0.requestId == request }) {
                guard let value = saved.input["expectedRevision"]?.stringValue else {
                    throw ConvoHopError(
                        code: .recoveryStorageFailure, requestId: request, outcome: .unknown, status: nil,
                        message: "Missing original end revision")
                }
                revision = value
            } else {
                revision = try await current().revision
            }
            let reply = try await client.execute(
                ConvoHopOperations.communicationEndLiveSession,
                EndLiveSessionInput(liveSessionId: liveSessionId, expectedGeneration: generation, expectedRevision: revision),
                requestId: request)
            let ended = try client.required(reply, as: LiveSessionEndRequested.self)
            guard ended.liveSessionId == liveSessionId else {
                throw ProtocolViolation("Ended call does not match the request")
            }
            return LiveEndOperation(
                action: try LiveAction(
                    client: client, operationId: ended.operationId, liveSessionId: liveSessionId, kind: .end,
                    requestId: reply["requestId"]?.stringValue ?? request),
                requested: ended)
        }
    }
}

/// Rings for one call.
public struct LiveSessionAlerts: Sendable {
    public let live: LiveSessionHandle

    /// Rings `principalIds`. Each gets a `notification.call` event, which your backend turns into a push.
    public func send(_ principalIds: [String], requestId: String? = nil) async throws -> LiveAlertBatch {
        let requestId = try ConvoHopClient.requireRequestId(requestId)
        let ids = try principalIds.map { try ConvoHopClient.requireId($0, "principal") }
        let client = live.client
        return try await publicErrors(requestId: requestId) {
            let batch = try client.required(
                try await client.execute(
                    ConvoHopOperations.communicationAlertLiveSession,
                    AlertLiveSessionInput(
                        liveSessionId: live.liveSessionId, expectedGeneration: live.generation, principalIds: ids),
                    requestId: requestId),
                as: LiveAlertBatch.self)
            guard batch.liveSessionId == live.liveSessionId else {
                throw ProtocolViolation("Call alert does not match the request")
            }
            return batch
        }
    }
}

/// This user's participation in a call: native media credentials, connection and leave.
public actor LiveParticipationHandle {
    public nonisolated let live: LiveSessionHandle
    /// The participation as it was when this handle was created.
    public nonisolated let snapshot: LiveParticipation
    public nonisolated let participationId: String

    struct CredentialAttempt {
        let requestId: String
        let mode: LiveConnectionMode
        let replacementOfConnectionId: String?
        var used: Bool
    }

    private var attempt: CredentialAttempt? {
        didSet { retain() }
    }
    private var connection: MediaConnection?
    private var connecting: Task<MediaConnection, any Error>?
    private var leaveRequest: String? {
        didSet { retain() }
    }
    /// Keeps the records of the leave request and the current credential attempt while the app keeps this handle: the
    /// handle reads the attempt's record again for its budget and native admission.
    private let retainer = RecoveryRetainer()

    private init(live: LiveSessionHandle, snapshot: LiveParticipation, leaveRequest: String?) {
        self.live = live
        self.snapshot = snapshot
        participationId = snapshot.participationId
        self.leaveRequest = leaveRequest
        retainer.hold(leaveRequest.map { [$0] } ?? [])
        live.client.transport.retention.add(retainer)
    }

    private func retain() {
        retainer.hold([leaveRequest, attempt?.requestId].compactMap { $0 })
    }

    static func load(live: LiveSessionHandle, snapshot: LiveParticipation) async throws -> LiveParticipationHandle {
        guard ProtocolChecks.isCanonicalUUID(snapshot.participationId) else {
            throw ProtocolViolation("Participation ID must be a canonical UUID")
        }
        let leave = try await live.client.transport.recoveryStates().last(where: {
            $0.operation == "communication.leaveLiveSession"
                && $0.input["participationId"]?.stringValue == snapshot.participationId
        })?.requestId
        return LiveParticipationHandle(live: live, snapshot: snapshot, leaveRequest: leave)
    }

    /// The participation's current state. Throws `PARTICIPATION_MISMATCH` once it is no longer current.
    public func get() async throws -> LiveParticipation {
        try await publicErrors { try await current() }
    }

    func current() async throws -> LiveParticipation {
        guard let current = try await live.current().myParticipation, current.participationId == participationId else {
            throw ConvoHopError(
                code: .participationMismatch, requestId: newRequestId(), outcome: .rejected, status: 409,
                message: "This participation is no longer current")
        }
        return current
    }

    /// Connects native media with a fresh single-use credential. Connecting never starts capture.
    ///
    /// Concurrent calls share one attempt, and a connected connection is returned as is. A failed connection throws
    /// `MEDIA_CONNECT_FAILED` and keeps the reservation: connect again, which resolves the old credential first, or
    /// leave.
    public func connect(_ options: ConvoHopMediaOptions, requestId: String? = nil) async throws -> MediaConnection {
        let requestId = try ConvoHopClient.requireRequestId(requestId)
        if leaveRequest != nil { throw ConvoHopLiveError.leaveRequested }
        if let connecting { return try await connecting.value }
        if let connection, await connection.connected { return connection }
        if let connecting { return try await connecting.value }
        let work = Task { () async throws -> MediaConnection in
            defer { self.connecting = nil }
            let next = try await publicErrors(requestId: requestId) {
                try await MediaConnection.open(participation: self, options: options, requestId: requestId)
            }
            if self.leaveRequest != nil {
                await next.disconnect()
                throw ConvoHopLiveError.leftDuringConnection
            }
            self.connection = next
            return next
        }
        connecting = work
        return try await work.value
    }

    /// Obtains a credential, keeping each credential command separate from native connection attempts.
    func connectionGrant(requestId: String?) async throws -> (requestId: String, grant: LiveConnectionGrant) {
        let client = live.client
        let current = try await current()
        let states = try await client.transport.recoveryStates()
        if attempt == nil,
            let previous = states.last(where: {
                $0.operation == "communication.liveSessionCredentials"
                    && $0.input["participationId"]?.stringValue == participationId
            })
        {
            guard let mode = previous.input["mode"]?.stringValue.flatMap(LiveConnectionMode.init(rawValue:)) else {
                throw Self.storageFailure(previous.requestId, "Unknown stored credential operation")
            }
            var replacement: String?
            if let stored = previous.input["replacementOfConnectionId"], !stored.isNull {
                guard let value = stored.stringValue, ProtocolChecks.isCanonicalUUID(value) else {
                    throw Self.storageFailure(previous.requestId, "Unknown stored credential operation")
                }
                replacement = value
            }
            attempt = CredentialAttempt(
                requestId: previous.requestId, mode: mode, replacementOfConnectionId: replacement,
                used: previous.mediaAdmissionAttempted || current.nativeConnectionId != nil)
        }
        let now = client.environment.now()
        let saved = attempt.flatMap { attempt in states.first { $0.requestId == attempt.requestId } }
        let needsResolution =
            saved.map {
                $0.attemptCount >= 3 || now > $0.retryDeadline || now < $0.firstSubmittedAt || now < $0.lastAttemptAt
                    || $0.lastAttemptClassification == "CREDENTIAL_REFRESH_REQUIRED"
            } ?? false
        if let old = attempt, old.used || needsResolution || (requestId != nil && requestId != old.requestId) {
            let resolution = try await client.rawResolve(old.requestId)
            guard let issuance = resolution.receipt?.result?.liveCredentialIssuance,
                issuance.participationId == participationId, issuance.liveSessionId == live.liveSessionId
            else {
                throw ConvoHopError(
                    code: .resolutionRequired, requestId: old.requestId, outcome: .unknown, status: 409,
                    message: "Resolve the original credential attempt before obtaining another grant")
            }
            let unobserved =
                current.nativeConnectionId == nil
                || (old.mode == .reconnect && current.nativeConnectionId == old.replacementOfConnectionId)
            guard let admissionExpiry = ProtocolChecks.instant(issuance.admissionExpiresAt),
                let checkedAt = ProtocolChecks.instant(resolution.checkedAt)
            else { throw ProtocolViolation("Expected RFC 3339 timestamps") }
            if unobserved && admissionExpiry > checkedAt {
                throw ConvoHopError(
                    code: .resolutionRequired, requestId: old.requestId, outcome: .committed, status: 409,
                    message: "Native admission remains unresolved; keep this reservation and retry or explicitly leave")
            }
            if requestId == old.requestId {
                throw ConvoHopError(
                    code: .credentialRefreshRequired, requestId: old.requestId, outcome: .committed, status: 409,
                    message: "The resolved old credential requires a separately identified fresh attempt")
            }
            attempt = nil
        }
        let next =
            attempt
            ?? CredentialAttempt(
                requestId: requestId ?? newRequestId(), mode: current.nativeConnectionId == nil ? .initial : .reconnect,
                replacementOfConnectionId: current.nativeConnectionId, used: false)
        attempt = next
        let grant = try client.required(
            try await client.execute(
                ConvoHopOperations.communicationLiveSessionCredentials,
                LiveSessionCredentialsInput(
                    liveSessionId: live.liveSessionId, participationId: participationId,
                    expectedGeneration: live.generation, mode: next.mode,
                    replacementOfConnectionId: next.replacementOfConnectionId),
                requestId: next.requestId),
            as: LiveConnectionGrant.self)
        guard grant.liveSessionId == live.liveSessionId, grant.participationId == participationId,
            grant.generation == live.generation
        else { throw ProtocolViolation("Native credential scope differs from the participation") }
        return (next.requestId, grant)
    }

    /// Records that a native connection used the credential, so it is resolved instead of reused.
    func connectionAttempted() async throws {
        guard var current = attempt else { throw ConvoHopUsageError("No credential attempt exists") }
        current.used = true
        attempt = current
        try await live.client.markMediaAdmissionAttempted(current.requestId)
    }

    /// Leaves the call and disconnects media. Keep `requestId` to resolve an uncertain leave.
    public func leave(requestId: String? = nil) async throws -> LiveSessionLeft {
        let requestId = try ConvoHopClient.requireRequestId(requestId)
        if let leaveRequest, let requestId, requestId != leaveRequest {
            throw ConvoHopLiveError.leaveIdentityConflict
        }
        let request = leaveRequest ?? requestId ?? newRequestId()
        leaveRequest = request
        let client = live.client
        return try await publicErrors(requestId: request) {
            await connection?.disconnect()
            let left = try client.required(
                try await client.execute(
                    ConvoHopOperations.communicationLeaveLiveSession,
                    LeaveLiveSessionInput(
                        liveSessionId: live.liveSessionId, expectedGeneration: live.generation,
                        participationId: participationId),
                    requestId: request),
                as: LiveSessionLeft.self)
            guard left.liveSessionId == live.liveSessionId, left.participationId == participationId else {
                throw ProtocolViolation("Leave does not match the request")
            }
            return left
        }
    }

    private static func storageFailure(_ requestId: String, _ message: String) -> ConvoHopError {
        ConvoHopError(
            code: .recoveryStorageFailure, requestId: requestId, outcome: .unknown, status: nil, message: message)
    }
}
