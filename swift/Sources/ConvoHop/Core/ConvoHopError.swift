import Foundation

/// What is known about the effect of a failed request.
///
/// Values that this list doesn't name can still arrive from the authority, so handle unknown outcomes.
public struct ConvoHopOutcome: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
    public let rawValue: String

    public init(rawValue: String) {
        self.rawValue = rawValue
    }

    /// The request had no effect.
    public static let rejected = ConvoHopOutcome(rawValue: "rejected")
    /// The request may or may not have taken effect. Resolve or retry it with the same request ID.
    public static let unknown = ConvoHopOutcome(rawValue: "unknown")
    /// The request committed.
    public static let committed = ConvoHopOutcome(rawValue: "committed")
    /// The request was accepted as a long-running operation.
    public static let accepted = ConvoHopOutcome(rawValue: "accepted")

    public var description: String { rawValue }
}

/// An error from ConvoHop or from the SDK's own protocol checks.
///
/// Classify errors by ``code``. ``outcome`` says whether a mutation may have taken effect; an `unknown` outcome
/// is never a rejection. Messages never contain credentials.
public struct ConvoHopError: Error, Sendable, CustomStringConvertible, LocalizedError {
    public let code: ConvoHopErrorCode
    /// The request ID of the failed request, or a fresh ID for failures that belong to no request.
    public let requestId: String
    public let outcome: ConvoHopOutcome
    /// The HTTP-equivalent status, or `nil` when no status applies, for example after a transport failure.
    public let status: Int?
    public let message: String
    /// Whole seconds to wait before resending the same request, when the authority sent a delay (for example with
    /// `RATE_LIMITED`). The SDK never waits or resends on its own because of it.
    public let retryAfter: Int?
    /// The error that caused this one, such as a failed recovery write or session refresh callback.
    public let underlyingError: (any Error)?

    public init(
        code: ConvoHopErrorCode, requestId: String, outcome: ConvoHopOutcome, status: Int?, message: String,
        retryAfter: Int? = nil, underlyingError: (any Error)? = nil
    ) {
        self.code = code
        self.requestId = requestId
        self.outcome = outcome
        self.status = status == 0 ? nil : status
        self.message = message
        self.retryAfter = retryAfter
        self.underlyingError = underlyingError
    }

    /// For `SCOPE_REQUIRED`, the missing backend-key scope when the message names it in the documented wording.
    public var scope: String? {
        guard code == .scopeRequired else { return nil }
        let prefix = "The backend key requires the current ", suffix = " scope"
        guard message.hasPrefix(prefix), message.hasSuffix(suffix),
            message.count >= prefix.count + suffix.count
        else { return nil }
        let name = String(message.dropFirst(prefix.count).dropLast(suffix.count))
        guard let first = name.unicodeScalars.first, ("a"..."z").contains(first), name.unicodeScalars.count <= 64,
            name.unicodeScalars.allSatisfy({ $0.isASCIIAlphanumeric })
        else { return nil }
        return name
    }

    /// Whether the documented code may succeed when resent with the same request ID.
    public var isRetryable: Bool {
        ConvoHopErrorCode.catalog[code.rawValue]?.retryable ?? false
    }

    public var description: String {
        var text = "\(code.rawValue) (\(outcome.rawValue)"
        if let status { text += ", status \(status)" }
        text += ", request \(requestId)): \(message)"
        return text
    }

    public var errorDescription: String? { description }
}

/// A response or stored value that breaks the protocol. Callers convert it to `INVALID_RESPONSE` or `INVALID_REQUEST`.
struct ProtocolViolation: Error, Sendable, CustomStringConvertible {
    let message: String

    init(_ message: String) {
        self.message = message
    }

    var description: String { message }
}

/// A misuse of the SDK, such as retrying a request it never recorded.
public struct ConvoHopUsageError: Error, Sendable, CustomStringConvertible, LocalizedError {
    public let message: String

    init(_ message: String) {
        self.message = message
    }

    public var description: String { message }
    public var errorDescription: String? { message }
}

extension Unicode.Scalar {
    var isASCIIAlphanumeric: Bool {
        ("a"..."z").contains(self) || ("A"..."Z").contains(self) || ("0"..."9").contains(self)
    }

    var isASCIIDigit: Bool { ("0"..."9").contains(self) }
}

/// A new lowercase request ID.
func newRequestId() -> String {
    UUID().uuidString.lowercased()
}
