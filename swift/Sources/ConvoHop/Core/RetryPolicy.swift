import Foundation

/// What to do after a failure of initialization, a realtime connection or a queued send.
enum ReconnectAction: Sendable, Equatable {
    /// Wait, then try again.
    case retry
    /// Wait, route again, then try again.
    case reroute
    /// Stop and report the failure.
    case stop
}

/// The retry and reconnect rules every SDK shares. See "Retry and reconnect" in `spec/recovery/README.md`.
enum RetryPolicy {
    /// The longest wait, in milliseconds: 2³¹ − 1, about 24.8 days. It matches the TypeScript reference, whose
    /// JavaScript timers accept no longer, and keeps a wait in nanoseconds far from overflowing.
    static let maximumDelay = 2_147_483_647

    /// Whether a later attempt of a request may still succeed after a problem with `code`. The schema says so for
    /// each code it lists; `WRONG_REGION` succeeds once the client routes again. A code the schema doesn't list
    /// counts as retryable.
    static func retryableCode(_ code: String) -> Bool {
        code == ConvoHopErrorCode.wrongRegion.rawValue || ConvoHopErrorCode.catalog[code]?.retryable != false
    }

    /// Classifies a failure of initialization, a realtime connection or a queued send.
    ///
    /// Only a ``ConvoHopError`` whose code is retryable and whose status is absent (no response), 408, 429 or 5xx is
    /// retried; `WRONG_REGION` routes again first. Anything else stops: `QUOTA_EXCEEDED`, `PLAN_LIMIT_EXCEEDED`,
    /// authentication and scope problems, a realtime error without a status, and errors that aren't a
    /// ``ConvoHopError``.
    static func reconnectAction(_ error: any Error) -> ReconnectAction {
        switch error {
        case let problem as ConvoHopError:
            if problem.code == .wrongRegion { return .reroute }
            if !retryableCode(problem.code.rawValue) { return .stop }
            guard let status = problem.status else { return .retry }
            return status == 408 || status == 429 || (500...599).contains(status) ? .retry : .stop
        case let terminal as RealtimeTerminal:
            return terminal.error.code == .wrongRegion ? .reroute : .stop
        default:
            return .stop
        }
    }

    /// `retryAfter` seconds in milliseconds, 0 without a delay and never more than ``maximumDelay``.
    static func retryAfterMilliseconds(_ retryAfter: Int?) -> Int {
        min(min(max(retryAfter ?? 0, 0), maximumDelay / 1000 + 1) * 1000, maximumDelay)
    }

    /// The wait before reconnection attempt `attempt`, counted from 0: 1 s doubling to at most 10 s, never less than
    /// the authority's `retryAfter` seconds, plus `jitter` milliseconds, which callers draw below 0.5 s.
    static func reconnectDelay(attempt: Int, retryAfter: Int?, jitter: Int) -> Int {
        let policy = GraphQLRealtime.conversationEvents
        let backoff = min(policy.baseDelayMs << min(max(attempt, 0), 4), policy.maxDelayMs)
        return min(max(backoff, retryAfterMilliseconds(retryAfter)) + jitter, maximumDelay)
    }

    /// The problem a realtime close reports, if any.
    ///
    /// A reason that starts with an error code the schema lists, such as `QUOTA_EXCEEDED retryAfter=60
    /// meter=messages`, reports that code with its `retryAfter=` seconds, whatever the close code. Otherwise a close
    /// code that ends realtime authorization reports `UNAUTHENTICATED`, and any other close reports nothing, so the
    /// stream reconnects.
    static func closeProblem(code: Int, reason: String, requestId: String) -> ConvoHopError? {
        let words = reason.split(whereSeparator: \.isWhitespace).map(String.init)
        if let name = words.first, let known = ConvoHopErrorCode.catalog[name] {
            let prefix = "retryAfter="
            let retryAfter = words.first { $0.hasPrefix(prefix) }.flatMap {
                ConvoHopTransport.retryDelay(.string(String($0.dropFirst(prefix.count))))
            }
            return ConvoHopError(
                code: ConvoHopErrorCode(rawValue: name), requestId: requestId, outcome: .rejected,
                status: known.status ?? ((4000...4999).contains(code) ? code - 4000 : nil),
                message: "Realtime connection closed: " + words.joined(separator: " "), retryAfter: retryAfter)
        }
        if GraphQLRealtime.conversationEvents.terminalCloseCodes.contains(code) {
            return ConvoHopError(
                code: .unauthenticated, requestId: requestId, outcome: .rejected, status: 401,
                message: "Realtime authorization ended; obtain a current session")
        }
        return nil
    }
}

/// The callers that hold request IDs across calls, such as outboxes and live handles. A full recovery journal never
/// evicts the records they retain. See "Retention" in `spec/recovery/README.md`.
final class RecoveryRetention: @unchecked Sendable {
    private struct Entry {
        weak var retainer: RecoveryRetainer?
    }

    private let lock = NSLock()
    private var entries: [Entry] = []

    /// Counts `retainer`'s request IDs for as long as it lives.
    func add(_ retainer: RecoveryRetainer) {
        lock.lock()
        defer { lock.unlock() }
        entries.removeAll { $0.retainer == nil || $0.retainer === retainer }
        entries.append(Entry(retainer: retainer))
    }

    /// The request IDs that live retainers hold.
    var requestIds: Set<String> {
        lock.lock()
        let retainers = entries.compactMap(\.retainer)
        lock.unlock()
        var requestIds = Set<String>()
        for retainer in retainers { requestIds.formUnion(retainer.requestIds) }
        return requestIds
    }
}

/// The request IDs that one caller holds. The caller replaces them whenever they change. Retention ends when the
/// caller holds other IDs or releases the retainer.
final class RecoveryRetainer: @unchecked Sendable {
    private let lock = NSLock()
    private var held: Set<String> = []

    /// Holds `requestIds` in place of those held before.
    func hold(_ requestIds: some Sequence<String>) {
        let next = Set(requestIds)
        lock.lock()
        held = next
        lock.unlock()
    }

    var requestIds: Set<String> {
        lock.lock()
        defer { lock.unlock() }
        return held
    }
}
