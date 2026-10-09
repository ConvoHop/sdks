import Foundation

/// Reports, without flooding ConvoHop, how far this user has read one conversation.
///
/// Call ``markRead(through:)`` whenever the user sees newer messages. The reporter only moves forward, waits a second
/// to combine calls, and keeps one report in flight. It reads this user's membership when it needs it, and reads it
/// again once when ConvoHop answers `REVISION_CONFLICT`, for example after the user's visibility changed.
public actor ConvoHopReadReceiptReporter {
    public nonisolated let conversationId: String
    /// The newest sequence ConvoHop confirmed as read by this user, under the current membership.
    public private(set) var confirmedThrough: String?
    /// The latest failure, cleared by the next confirmed report.
    public private(set) var lastError: (any Error)?
    private let client: ConvoHopClient
    private let environment: ConvoHopEnvironment
    private let delay: Int
    private var membership: Member?
    private var target: String?
    private var worker: Task<Void, Never>?

    /// A reporter that waits `delay` milliseconds (0...60000) to combine calls.
    public init(client: ConvoHopClient, conversationId: String, delay: Int = 1_000) throws {
        guard (0...60_000).contains(delay) else { throw ConvoHopUsageError("The receipt delay must be 0...60000 ms") }
        self.conversationId = try ConvoHopClient.requireId(conversationId, "conversation")
        self.client = client
        self.delay = delay
        environment = client.environment
    }

    deinit {
        worker?.cancel()
    }

    /// Notes that this user read the conversation through `sequence`. Older sequences change nothing.
    public func markRead(through sequence: String) throws {
        let sequence = try ConvoHopClient.requireCounter(sequence, "sequence")
        if let pending = target ?? confirmedThrough, ProtocolChecks.compareCounters(pending, sequence) >= 0 { return }
        target = sequence
        guard worker == nil else { return }
        worker = Task { [weak self] in await self?.run() }
    }

    /// Uses `membership` for the next reports, for example from ``ConvoHopClient/getConversation(_:)``. A new
    /// membership or visibility epoch starts a new read position.
    public func update(membership: Member) {
        guard membership.conversationId == conversationId else { return }
        if let current = self.membership {
            if ProtocolChecks.isCanonicalDecimal(current.revision), ProtocolChecks.isCanonicalDecimal(membership.revision),
                current.membershipEpoch == membership.membershipEpoch,
                ProtocolChecks.compareCounters(current.revision, membership.revision) > 0
            {
                return
            }
            if current.membershipEpoch != membership.membershipEpoch
                || current.visibilityEpoch != membership.visibilityEpoch
            {
                confirmedThrough = nil
            }
        }
        self.membership = membership
    }

    private func run() async {
        defer { worker = nil }
        let sleep = environment.sleep
        if delay > 0 {
            do { try await sleep(delay) } catch { return }
        }
        var failures = 0
        while let sequence = target, !Task.isCancelled {
            do {
                try await report(sequence)
                failures = 0
                lastError = nil
                if target == sequence { target = nil }
            } catch {
                lastError = error
                guard let problem = error as? ConvoHopError, problem.isRetryable, failures < 5 else {
                    // Give up on this sequence; a newer one noted meanwhile still gets reported.
                    if target == sequence { target = nil }
                    failures = 0
                    continue
                }
                failures += 1
                let wait = max(min(30_000, 1_000 << failures), min(max(problem.retryAfter ?? 0, 0), 3_600) * 1_000)
                do { try await sleep(wait + environment.random(wait / 5 + 1)) } catch { return }
            }
        }
    }

    private func report(_ sequence: String) async throws {
        let membership = try await currentMembership(refresh: false)
        do {
            let receipt = try await client.reportRead(in: conversationId, membership: membership, through: sequence)
            record(receipt)
        } catch let error as ConvoHopError where error.code == .revisionConflict {
            let fresh = try await currentMembership(refresh: true)
            record(try await client.reportRead(in: conversationId, membership: fresh, through: sequence))
        }
    }

    private func currentMembership(refresh: Bool) async throws -> Member {
        if !refresh, let membership { return membership }
        guard let membership = try await client.getConversation(conversationId).membership else {
            throw ConvoHopError(
                code: .notFound, requestId: newRequestId(), outcome: .rejected, status: 404,
                message: "This user isn't a member of the conversation")
        }
        update(membership: membership)
        return membership
    }

    private func record(_ receipt: ReadReceipt) {
        guard let through = receipt.readThroughSequence else { return }
        if let membership, receipt.membershipEpoch != membership.membershipEpoch
            || receipt.visibilityEpoch != membership.visibilityEpoch
        {
            return
        }
        if let confirmed = confirmedThrough, ProtocolChecks.compareCounters(confirmed, through) >= 0 { return }
        confirmedThrough = through
    }
}
