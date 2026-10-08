import Foundation

/// The signed route to a project's communication endpoints.
public struct ProjectRoute: Codable, Hashable, Sendable {
    public let projectId: String
    public let incarnation: String
    /// The serving epoch the client reports back as `observedServingEpoch`.
    public let servingEpoch: String
    /// The HTTPS origin of the GraphQL endpoint.
    public let communicationBase: String
    /// The `graphql-transport-ws` endpoint for realtime subscriptions.
    public let wssUrl: String
    public let expiresAt: String
    public let signature: String
}

/// Whether a client can renew its session through ``ConvoHopConfiguration/refreshSession``.
public enum SessionRefreshState: String, Hashable, Sendable {
    /// No refresh callback is configured.
    case disabled
    /// ``ConvoHopClient/initialize()`` hasn't bound the original session yet.
    case uninitialized
    /// The session is bound and can be renewed.
    case ready
    /// A renewal is in progress. Requests wait for it.
    case refreshing
    /// A renewal could not be verified. Requests fail with `SESSION_REFRESH_REQUIRED` until the app replaces the client.
    case blocked
}

/// Ordered conversation events with the authoritative frontier after them.
public struct EventBatch: Hashable, Sendable {
    /// Events in increasing sequence order.
    public let events: [Event]
    /// Whether the batch reaches the current end of the conversation.
    public let complete: Bool
    /// Whether the app must resynchronize history explicitly before applying more events.
    public let refreshRequired: Bool
    /// The cursor to resume after once the events are applied.
    public let nextCursor: Cursor
}

/// The receipt for a sent message.
public struct SendReceipt: Hashable, Sendable {
    public let messageId: String
    public let conversationId: String
    public let sequence: String
    public let revision: String
    public let status: String
    /// The conversation cursor at the sent message.
    public let cursor: Cursor
}

/// A snapshot of a mutation's recovery record. Records never contain credentials.
public struct RecoveryState: Hashable, Sendable {
    /// What is known about a recorded mutation.
    public enum Resolution: String, Hashable, Sendable {
        /// Recorded but not yet sent.
        case pending
        /// Sent without a receipt. Resolve or retry it with the same request ID.
        case unknown
        case committed
        case accepted
    }

    public let requestId: String
    public let incarnation: String
    public let payloadFingerprint: String
    /// The operation ID, for example `communication.sendMessage`.
    public let operation: String
    public let projectId: String?
    public let input: JSONObject
    /// Milliseconds since 1970.
    public let firstSubmittedAt: Int
    /// The last time, in milliseconds since 1970, at which the request may be resent.
    public let retryDeadline: Int
    public let attemptCount: Int
    public let lastAttemptAt: Int
    /// `notSubmitted`, `submitted`, `authorityReceipt`, `nativeAdmissionAttempted`, `opaqueTransportFailure` or the
    /// error code of the last attempt.
    public let lastAttemptClassification: String
    public let resolutionState: Resolution
    /// Whether a native media connection was attempted with the credentials this request issued.
    public let mediaAdmissionAttempted: Bool
}
