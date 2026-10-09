import Foundation

/// Runs `work` on the caller's isolation and converts internal failures into public errors.
func publicErrors<T: Sendable>(
    isolation: isolated (any Actor)? = #isolation, requestId: String? = nil, _ work: () async throws -> T
) async throws -> T {
    do {
        return try await work()
    } catch {
        throw publicError(error, requestId: requestId)
    }
}

/// Checks a page size against the schema's `PageSize` range.
func requirePageLimit(_ limit: Int) throws -> Int {
    guard (1...100).contains(limit) else { throw ConvoHopUsageError("Page limit must be 1...100") }
    return limit
}

/// One conversation: its messages, this user's mute and its calls.
public struct ConversationHandle: Sendable {
    public let client: ConvoHopClient
    public let conversationId: String

    init(client: ConvoHopClient, conversationId: String) {
        self.client = client
        self.conversationId = conversationId
    }

    /// The conversation's current state.
    public func get() async throws -> Conversation {
        try await client.getConversation(conversationId)
    }

    /// Sends, lists, edits and deletes messages.
    public var messages: ConversationMessages { ConversationMessages(conversation: self) }
    /// This user's mute of message push notifications. Calls still ring a muted member.
    public var mute: ConversationMuteSetting { ConversationMuteSetting(conversation: self) }
    /// Calls in this conversation.
    public var live: ConversationLive { ConversationLive(conversation: self) }
}

/// The messages of one conversation.
public struct ConversationMessages: Sendable {
    public let conversation: ConversationHandle

    /// Sends a text message. Keep `requestId` to resend the same message after an uncertain outcome.
    public func send(_ text: String, props: JSONObject = [:], requestId: String? = nil) async throws -> SendReceipt {
        try await conversation.client.send(text, to: conversation.conversationId, props: props, requestId: requestId)
    }

    /// Up to 100 messages before `sequence`, newest first.
    public func list(before sequence: String? = nil) async throws -> MessagePage {
        try await conversation.client.messages(in: conversation.conversationId, before: sequence)
    }

    /// One message, or `nil` when it isn't visible to this user.
    public func get(_ messageId: String) async throws -> Message? {
        try await conversation.client.getMessage(messageId, in: conversation.conversationId)
    }

    public func edit(_ message: Message, text: String, requestId: String? = nil) async throws -> Message {
        guard message.conversationId == conversation.conversationId else {
            throw ConvoHopUsageError("Message is outside this conversation")
        }
        return try await conversation.client.edit(message, text: text, requestId: requestId)
    }

    public func delete(_ message: Message, requestId: String? = nil) async throws -> Message {
        guard message.conversationId == conversation.conversationId else {
            throw ConvoHopUsageError("Message is outside this conversation")
        }
        return try await conversation.client.delete(message, requestId: requestId)
    }
}

/// This user's mute of message push notifications for one conversation.
public struct ConversationMuteSetting: Sendable {
    public let conversation: ConversationHandle

    public func get() async throws -> ConversationMute {
        let client = conversation.client
        return try await publicErrors {
            let reply = try await client.execute(
                ConvoHopOperations.communicationConversationMute,
                ConversationMuteInput(conversationId: conversation.conversationId))
            return try own(client.required(reply, as: ConversationMute.self))
        }
    }

    /// Mutes or unmutes. `until` (RFC 3339, in the future) applies only to a mute.
    public func set(_ muted: Bool, until: String? = nil, requestId: String? = nil) async throws -> ConversationMute {
        let client = conversation.client
        let requestId = try ConvoHopClient.requireRequestId(requestId)
        return try await publicErrors(requestId: requestId) {
            let reply = try await client.execute(
                ConvoHopOperations.communicationSetConversationMute,
                SetConversationMuteInput(conversationId: conversation.conversationId, muted: muted, until: until),
                requestId: requestId)
            return try own(client.required(reply, as: ConversationMute.self))
        }
    }

    private func own(_ mute: ConversationMute) throws -> ConversationMute {
        guard mute.conversationId == conversation.conversationId,
            mute.principalId == conversation.client.principalId
        else { throw ProtocolViolation("Conversation mute does not match the request") }
        return mute
    }
}

/// Calls in one conversation.
public struct ConversationLive: Sendable {
    public let conversation: ConversationHandle

    /// The conversation's active call, if any.
    public func current() async throws -> LiveSessionHandle? {
        let client = conversation.client
        return try await publicErrors {
            let reply = try await client.execute(
                ConvoHopOperations.communicationCurrentLiveSession,
                ConversationLiveInput(conversationId: conversation.conversationId))
            guard let session = try client.optional(reply, as: LiveSession.self) else { return nil }
            return try LiveSessionHandle(client: client, snapshot: session)
        }
    }

    /// The conversation's calls, newest first.
    public func history(limit: Int = 50, cursor: String? = nil) async throws -> LiveSessionPage {
        let client = conversation.client
        return try await publicErrors {
            let input = LiveSessionsInput(
                conversationId: conversation.conversationId, limit: try requirePageLimit(limit), cursor: cursor)
            return try client.page(
                try await client.execute(ConvoHopOperations.communicationLiveSessions, input),
                as: LiveSessionPage.self)
        }
    }

    /// Starts an audio call. Readiness completes asynchronously; await ``LiveStartOperation/ready(timeout:)``.
    public func startVoice(requestId: String? = nil) async throws -> LiveStartOperation {
        try await start(.interactive, .audioOnly, requestId: requestId)
    }

    /// Starts a video call.
    public func startVideo(requestId: String? = nil) async throws -> LiveStartOperation {
        try await start(.interactive, .audioVideo, requestId: requestId)
    }

    /// Starts a broadcast: publishers send, viewers only subscribe.
    public func startBroadcast(
        mediaProfile: LiveMediaProfile, requestId: String? = nil
    ) async throws -> LiveStartOperation {
        try await start(.broadcast, mediaProfile, requestId: requestId)
    }

    private func start(
        _ kind: LiveSessionKind, _ mediaProfile: LiveMediaProfile, requestId: String?
    ) async throws -> LiveStartOperation {
        let client = conversation.client
        let requestId = try ConvoHopClient.requireRequestId(requestId)
        return try await publicErrors(requestId: requestId) {
            let reply = try await client.execute(
                ConvoHopOperations.communicationStartLiveSession,
                StartLiveSessionInput(
                    conversationId: conversation.conversationId, kind: kind, mediaProfile: mediaProfile),
                requestId: requestId)
            let started = try client.required(reply, as: LiveSessionStarted.self)
            guard started.conversationId == conversation.conversationId, let receiptRequest = reply["requestId"]?.stringValue
            else { throw ProtocolViolation("Started call does not match the request") }
            return try LiveStartOperation(
                action: LiveAction(
                    client: client, operationId: started.operationId, liveSessionId: started.liveSessionId,
                    kind: .start, requestId: receiptRequest),
                started: started)
        }
    }
}

/// A call start or end that completes asynchronously.
public struct LiveAction: Sendable {
    public let client: ConvoHopClient
    public let operationId: String
    public let liveSessionId: String
    public let kind: LiveOperationKind
    /// The request ID of the command that created the action.
    public let requestId: String

    init(
        client: ConvoHopClient, operationId: String, liveSessionId: String, kind: LiveOperationKind,
        requestId: String
    ) throws {
        guard ProtocolChecks.isCanonicalUUID(operationId), ProtocolChecks.isCanonicalUUID(liveSessionId),
            ProtocolChecks.isCanonicalUUID(requestId)
        else { throw ProtocolViolation("Live action identifiers must be canonical UUIDs") }
        self.client = client
        self.operationId = operationId
        self.liveSessionId = liveSessionId
        self.kind = kind
        self.requestId = requestId
    }

    /// The action's current state.
    public func get() async throws -> LiveSessionOperation {
        try await publicErrors { try await fetch() }
    }

    private func fetch() async throws -> LiveSessionOperation {
        let reply = try await client.execute(
            ConvoHopOperations.communicationLiveSessionOperation, LiveSessionOperationInput(operationId: operationId))
        let result = try client.required(reply, as: LiveSessionOperation.self)
        guard result.liveSessionId == liveSessionId, result.operationId == operationId, result.kind == kind else {
            throw ProtocolViolation("Live action scope changed")
        }
        return result
    }

    /// Polls every 500 ms until the action completes, fails or `timeout` passes.
    ///
    /// A timeout throws `RESOLUTION_REQUIRED`: keep the operation ID and query it again. Elapsed time is not cutoff.
    /// Cancelling the calling task stops polling.
    public func completed(timeout: TimeInterval = 45) async throws -> LiveSessionOperationCompletion {
        guard timeout.isFinite, timeout > 0, timeout <= 300 else {
            throw ConvoHopUsageError("Wait timeout must be more than 0 and at most 300 seconds")
        }
        let milliseconds = max(1, Int((timeout * 1000).rounded(.up)))
        return try await publicErrors {
            let environment = client.environment
            let deadline = environment.now() + milliseconds
            repeat {
                try Task.checkCancellation()
                let action = try await fetch()
                switch action.state {
                case .completed:
                    guard let completion = action.completion,
                        kind != .end || completion.mediaCutoff?.state == .enforced
                    else { throw ProtocolViolation("Completed action is missing its original completion evidence") }
                    return completion
                case .failed:
                    guard let failure = action.failure else {
                        throw ProtocolViolation("Failed live action is missing its reason")
                    }
                    throw ConvoHopError(
                        code: ConvoHopErrorCode(rawValue: failure.code.rawValue), requestId: requestId,
                        outcome: .accepted, status: 409, message: failure.message)
                case .running:
                    try await environment.sleep(500)
                }
            } while environment.now() < deadline
            throw ConvoHopError(
                code: .resolutionRequired, requestId: requestId, outcome: .accepted, status: 409,
                message:
                    "Action remains unresolved; retain this operation ID and query it again. Elapsed time is not cutoff.")
        }
    }
}

/// A call start. Await ``ready(timeout:)`` before joining.
public struct LiveStartOperation: Sendable {
    public let action: LiveAction
    public let started: LiveSessionStarted

    public var operationId: String { action.operationId }
    public var liveSessionId: String { action.liveSessionId }
    public var requestId: String { action.requestId }

    /// Waits until the call is ready, then returns its handle.
    public func ready(timeout: TimeInterval = 45) async throws -> LiveSessionHandle {
        _ = try await action.completed(timeout: timeout)
        return try await LiveSessionHandle.load(client: action.client, liveSessionId: liveSessionId)
    }
}

/// A call end. ``LiveAction/completed(timeout:)`` returns once media cutoff is enforced.
public struct LiveEndOperation: Sendable {
    public let action: LiveAction
    public let requested: LiveSessionEndRequested
}
