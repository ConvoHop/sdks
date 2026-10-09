import Dispatch
import Foundation

extension ConvoHopClient {
    /// Renews the session `lead` seconds before it expires, and again after each renewal, until you cancel or
    /// release the returned schedule.
    ///
    /// A renewal is never due earlier than halfway through the session's remaining life, so a session shorter than
    /// `lead` doesn't renew in a loop. On a client that isn't initialized, the schedule calls ``initialize()`` first
    /// and retries the failures that the SDK's shared classifier retries, such as network failures, timeouts,
    /// `RATE_LIMITED` and 5xx outages, with backoff and never sooner than the authority's `retryAfter`. It routes again
    /// after `WRONG_REGION`. A renewal that fails while the current session is still verified is retried with backoff,
    /// from 1 second doubling to 32, until a second before expiry. Any other failure stops the schedule. Every failure
    /// goes to `onError`.
    ///
    /// The schedule waits on the wall clock, so a renewal that fell due while the app was suspended or the device
    /// slept runs as soon as the app runs again. Callbacks run on a background task. Cancelling suppresses later
    /// callbacks, including those of a renewal in progress, which still completes.
    ///
    /// - Parameters:
    ///   - lead: How long before expiry to renew, in seconds.
    ///   - onRefreshed: Receives each verified replacement session.
    ///   - onError: Receives each failure.
    /// - Throws: `SESSION_REFRESH_REQUIRED` without a ``ConvoHopConfiguration/refreshSession`` callback, or
    ///   ``ConvoHopUsageError`` when `lead` is negative or not finite.
    public nonisolated func scheduleSessionRefresh(
        lead: TimeInterval = 60, onRefreshed: (@Sendable (Session) -> Void)? = nil,
        onError: (@Sendable (any Error) -> Void)? = nil
    ) throws -> ConvoHopSessionRefreshSchedule {
        guard lead.isFinite, lead >= 0, lead * 1000 <= 9_007_199_254_740_991 else {
            throw ConvoHopUsageError("The renewal lead must be a finite number of seconds, 0 or more")
        }
        guard refreshHook != nil else {
            throw ConvoHopError(
                code: .sessionRefreshRequired, requestId: newRequestId(), outcome: .rejected, status: 409,
                message: "Configure refreshSession before scheduling renewal")
        }
        let control = SessionRenewalControl(onRefreshed: onRefreshed, onError: onError)
        let environment = self.environment
        let milliseconds = Int((lead * 1000).rounded())
        // The schedule doesn't keep the client alive, and its task doesn't keep the schedule alive.
        let task = Task { [weak self] in
            defer { control.finish() }
            var renewal = SessionRenewal(lead: milliseconds, control: control, now: environment.now)
            var deadline = environment.now()
            while true {
                do { try await environment.sleepUntil(deadline) } catch { return }
                guard !control.isCancelled, let client = self, let next = await renewal.run(client) else { return }
                deadline = next
            }
        }
        return ConvoHopSessionRefreshSchedule(control: control, task: task)
    }

    /// The bound session, while renewal is ready.
    var readyBinding: Session? { sessionRefreshState == .ready ? sessionBinding : nil }
}

/// A session renewal schedule from ``ConvoHopClient/scheduleSessionRefresh(lead:onRefreshed:onError:)``. Keep it
/// while the session should stay renewed; cancel or release it to stop.
public final class ConvoHopSessionRefreshSchedule: Sendable {
    private let control: SessionRenewalControl
    private let task: Task<Void, Never>

    init(control: SessionRenewalControl, task: Task<Void, Never>) {
        self.control = control
        self.task = task
    }

    deinit { cancel() }

    /// Stops renewal. A renewal in progress still completes, but its callbacks don't run.
    public func cancel() {
        control.cancel()
        task.cancel()
    }

    /// Whether the schedule's task has ended.
    var isFinished: Bool { control.isFinished }
}

/// A schedule's cancellation and callbacks, shared with its task.
final class SessionRenewalControl: @unchecked Sendable {
    private let lock = NSLock()
    private var cancelled = false
    private var finished = false
    private let onRefreshed: (@Sendable (Session) -> Void)?
    private let onError: (@Sendable (any Error) -> Void)?

    init(onRefreshed: (@Sendable (Session) -> Void)?, onError: (@Sendable (any Error) -> Void)?) {
        self.onRefreshed = onRefreshed
        self.onError = onError
    }

    var isCancelled: Bool {
        lock.lock()
        defer { lock.unlock() }
        return cancelled
    }

    var isFinished: Bool {
        lock.lock()
        defer { lock.unlock() }
        return finished
    }

    func cancel() {
        lock.lock()
        cancelled = true
        lock.unlock()
    }

    func finish() {
        lock.lock()
        finished = true
        lock.unlock()
    }

    func refreshed(_ session: Session) {
        if !isCancelled { onRefreshed?(session) }
    }

    func report(_ error: any Error) {
        if !isCancelled { onError?(error) }
    }
}

/// A schedule's renewal state, owned by its task.
private struct SessionRenewal {
    let lead: Int
    let control: SessionRenewalControl
    let now: @Sendable () -> Int
    private var failures = 0
    /// One target per session revision.
    private var target: (revision: String, at: Int)?

    init(lead: Int, control: SessionRenewalControl, now: @escaping @Sendable () -> Int) {
        self.lead = lead
        self.control = control
        self.now = now
    }

    /// Does the work that is due, and returns when to run again or `nil` to stop.
    mutating func run(_ client: ConvoHopClient) async -> Int? {
        guard let binding = await client.sessionBinding else {
            do {
                try await client.initialize()
                failures = 0
                return now()
            } catch {
                control.report(error)
                guard RetryPolicy.reconnectAction(error) != .stop, let problem = error as? ConvoHopError else {
                    return nil
                }
                return now() + max(backoff(), RetryPolicy.retryAfterMilliseconds(problem.retryAfter))
            }
        }
        let current = now()
        if target?.revision != binding.sessionRevision {
            // Never earlier than halfway through the remaining life, so short sessions don't renew in a loop.
            let remaining = ProtocolChecks.sessionExpiry(binding) - current
            target = (binding.sessionRevision, current + max(remaining - lead, remaining / 2))
        }
        if let target, target.at > current { return target.at }
        do {
            let session = try await client.refreshSession()
            failures = 0
            control.refreshed(session)
            return now()
        } catch {
            control.report(error)
            guard !control.isCancelled, let binding = await client.readyBinding else { return nil }
            let remaining = ProtocolChecks.sessionExpiry(binding) - now()
            return remaining > 1000 ? now() + min(backoff(), remaining - 1000) : nil
        }
    }

    /// One second, doubling with each failure up to 32.
    private mutating func backoff() -> Int {
        defer { failures += 1 }
        return 1000 << min(failures, 5)
    }
}

/// The wall clock, in Unix milliseconds.
///
/// Dispatch's wall-clock timers keep counting while the device sleeps, unlike `Task.sleep`, so a deadline that
/// passed meanwhile fires as soon as the app runs again.
enum WallClock {
    static func now() -> Int { Int((Date().timeIntervalSince1970 * 1000).rounded(.down)) }

    /// Returns once ``now()`` reaches `deadline`. Throws `CancellationError` when the task is cancelled.
    static func sleep(until deadline: Int) async throws {
        while true {
            try Task.checkCancellation()
            if now() >= deadline { return }
            let wait = WallClockWait()
            try await withTaskCancellationHandler {
                try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, any Error>) in
                    wait.start(deadline: deadline, continuation)
                }
            } onCancel: {
                wait.cancel()
            }
        }
    }
}

/// One wall-clock timer. It resumes its continuation once: when it fires or when its task is cancelled.
private final class WallClockWait: @unchecked Sendable {
    private let lock = NSLock()
    private var continuation: CheckedContinuation<Void, any Error>?
    private var timer: (any DispatchSourceTimer)?
    private var cancelled = false

    func start(deadline: Int, _ continuation: CheckedContinuation<Void, any Error>) {
        lock.lock()
        defer { lock.unlock() }
        guard !cancelled else {
            continuation.resume(throwing: CancellationError())
            return
        }
        let timer = DispatchSource.makeTimerSource()
        timer.setEventHandler { self.finish(nil) }
        timer.schedule(
            wallDeadline: DispatchWallTime(
                timespec: timespec(tv_sec: deadline / 1000, tv_nsec: deadline % 1000 * 1_000_000)))
        self.continuation = continuation
        self.timer = timer
        timer.resume()
    }

    func cancel() {
        lock.lock()
        cancelled = true
        lock.unlock()
        finish(CancellationError())
    }

    private func finish(_ error: (any Error)?) {
        lock.lock()
        let continuation = self.continuation
        let timer = self.timer
        self.continuation = nil
        self.timer = nil
        lock.unlock()
        timer?.cancel()
        if let error { continuation?.resume(throwing: error) } else { continuation?.resume() }
    }
}
