import Foundation
import XCTest

@testable import ConvoHop

/// A session authority like the TypeScript renewal fixture. Each renewal adds a minute to the previous expiry and
/// issues a new token. Only a token for the session's current revision is accepted, until its JWT-second expiry.
private final class RenewalAuthority: @unchecked Sendable {
    typealias Hook = @Sendable (RenewalAuthority) async throws -> SessionBootstrap

    let clock: TestClock
    let start: Int
    private let lock = NSLock()
    private var revision = 1
    private var expiresAt: Int
    private var tokens = ["user-token": 1]
    private var denied: Set<String> = []
    private var outages: [(key: String, status: Int, retryAfter: Int?)] = []
    private var hook: Hook = { authority in try authority.renew() }
    private var calls: [Int] = []
    private var issued: [String] = []

    init(clock: TestClock, expiresIn: Int) {
        self.clock = clock
        start = clock.now
        expiresAt = start + expiresIn
    }

    /// When the renewal callback ran, in milliseconds after the start.
    var hookCalls: [Int] { lock.locked { calls } }
    var renewals: Int { lock.locked { issued.count } }
    var lastToken: String? { lock.locked { issued.last } }

    func setHook(_ hook: @escaping Hook) { lock.locked { self.hook = hook } }
    func deny(_ token: String) { lock.locked { _ = denied.insert(token) } }

    /// Answers a request for `key` with an outage, after the outages queued before it.
    func fail(_ key: String, status: Int, retryAfter: Int? = nil) {
        lock.locked { outages.append((key, status, retryAfter)) }
    }

    /// The client's renewal callback: records the call, then runs the hook.
    func refresh(_ current: Session) async throws -> SessionBootstrap {
        let now = clock.now
        let hook = lock.locked { () -> Hook in
            calls.append(now - start)
            return self.hook
        }
        return try await hook(self)
    }

    /// Renews the session: the next revision and a new token, valid a minute past the previous expiry.
    func renew() throws -> SessionBootstrap {
        let (session, token, expiry) = lock.locked { () -> (JSONValue, String, Int) in
            revision += 1
            expiresAt += 60_000
            let renewed = "renewed-token-\(revision)"
            tokens[renewed] = revision
            issued.append(renewed)
            return (current(), renewed, expiresAt)
        }
        return SessionBootstrap(
            session: try session.decoded(as: Session.self), tokenExpiresAt: timestamp(expiry), sessionToken: token)
    }

    func install(on http: StubHTTP) async {
        for key in ["communication.route", "communication.currentSession"] {
            await http.on(key) { request in self.reply(key, request) }
        }
    }

    private func reply(_ key: String, _ request: RecordedRequest) -> ConvoHopHTTPResponse {
        let token = request.authorization.map { String($0.dropFirst("Bearer ".count)) } ?? ""
        let now = clock.now
        return lock.locked {
            guard tokens[token] == revision, !denied.contains(token), expiresAt / 1000 * 1000 > now else {
                return Reply.failure(status: 401, code: "UNAUTHENTICATED")
            }
            if let outage = outages.first, outage.key == key {
                outages.removeFirst()
                return Reply.failure(
                    status: outage.status, code: outage.status == 429 ? "RATE_LIMITED" : "UNAVAILABLE",
                    retryAfter: outage.retryAfter)
            }
            let result = key == "communication.route" ? Fixture.route(now: now) : current()
            return Reply.ok(request, ["result": result], now: now)
        }
    }

    /// The session as the authority stores it. Call with the lock held.
    private func current() -> JSONValue { Fixture.session(revision: String(revision), expiresAt: expiresAt) }
}

/// A client of a ``RenewalAuthority``, its schedule and what the schedule reported.
private struct RenewalSetup {
    let authority: RenewalAuthority
    let harness: Harness
    let schedule = Shared<ConvoHopSessionRefreshSchedule?>(nil)
    let refreshed = Shared<[Session]>([])
    let errors = Shared<[any Error]>([])

    var client: ConvoHopClient { harness.client }
    var clock: TestClock { harness.clock }
    var errorCodes: [String] { errors.value.map { ($0 as? ConvoHopError)?.code.rawValue ?? "\($0)" } }
    var errorStatuses: [Int?] { errors.value.map { ($0 as? ConvoHopError)?.status } }

    /// A client whose session expires `expiresIn` milliseconds after the start.
    static func make(expiresIn: Int = 120_123) async throws -> RenewalSetup {
        let clock = TestClock()
        let authority = RenewalAuthority(clock: clock, expiresIn: expiresIn)
        let harness = try await Harness.make(
            refresh: { current in try await authority.refresh(current) }, route: false, clock: clock)
        await authority.install(on: harness.http)
        return RenewalSetup(authority: authority, harness: harness)
    }

    func start(lead: TimeInterval = 60) throws {
        let refreshed = refreshed, errors = errors
        let started = try client.scheduleSessionRefresh(
            lead: lead, onRefreshed: { session in refreshed.update { $0.append(session) } },
            onError: { error in errors.update { $0.append(error) } })
        schedule.update { $0 = started }
    }

    /// Moves the clock to `offset` milliseconds after the start, letting the schedule finish what is due before and
    /// after, like the TypeScript `time.at()`.
    func at(_ offset: Int, file: StaticString = #filePath, line: UInt = #line) async throws {
        try await settle(file: file, line: line)
        let target = authority.start + offset
        XCTAssertGreaterThanOrEqual(target, clock.now, "The clock only moves forward", file: file, line: line)
        clock.advance(by: max(0, target - clock.now))
        try await settle(file: file, line: line)
    }

    /// Waits until the schedule waits for a deadline or has stopped.
    func settle(file: StaticString = #filePath, line: UInt = #line) async throws {
        let schedule = schedule, clock = clock
        try await eventually("the schedule to wait or stop", file: file, line: line) {
            (schedule.value?.isFinished ?? true) || clock.pendingSleeps > 0
        }
    }

    func requestCount() async -> Int { await harness.http.requests.count }
}

final class SessionRefreshScheduleTests: XCTestCase {
    func testValidatesItsLeadAndRequiresTheRenewalCallback() async throws {
        let disabled = try await Harness.make()
        XCTAssertThrowsError(try disabled.client.scheduleSessionRefresh()) { error in
            XCTAssertEqual((error as? ConvoHopError)?.code, .sessionRefreshRequired, "\(error)")
        }
        let setup = try await RenewalSetup.make()
        for lead: TimeInterval in [-1, -.infinity, .infinity, .nan, 1e16] {
            XCTAssertThrowsError(try setup.client.scheduleSessionRefresh(lead: lead), "\(lead)") { error in
                XCTAssertTrue(error is ConvoHopUsageError, "\(error)")
            }
        }
        let sent = await setup.requestCount()
        XCTAssertEqual(sent, 0)
    }

    func testRenewsAMinuteBeforeTheJWTSecondExpiryAndAfterEachRenewalUntilCancelled() async throws {
        let setup = try await RenewalSetup.make(expiresIn: 600_123)
        try await setup.client.initialize()
        try setup.start()
        try await setup.at(539_000)
        XCTAssertEqual(setup.authority.hookCalls, [])
        try await setup.at(540_000)
        XCTAssertEqual(setup.authority.hookCalls, [540_000])
        XCTAssertEqual(setup.refreshed.value.map(\.sessionRevision), ["2"])
        let binding = await setup.client.sessionBinding
        XCTAssertEqual(setup.refreshed.value.first, binding)
        // The renewal added a minute, leaving two: the next one is due a minute later.
        try await setup.at(599_000)
        XCTAssertEqual(setup.authority.hookCalls, [540_000])
        try await setup.at(600_000)
        XCTAssertEqual(setup.authority.hookCalls, [540_000, 600_000])
        let last = await setup.harness.http.requests.last?.authorization
        XCTAssertEqual(last, setup.authority.lastToken.map { "Bearer " + $0 })
        XCTAssertGreaterThan(setup.clock.wallClockSleeps, 0, "The schedule waits on the wall clock")

        setup.schedule.value?.cancel()
        try await setup.at(3_600_000)
        XCTAssertEqual(setup.authority.hookCalls, [540_000, 600_000])
        XCTAssertEqual(setup.refreshed.value.count, 2)
        XCTAssertEqual(setup.errorCodes, [])
        XCTAssertEqual(setup.schedule.value?.isFinished, true)
    }

    func testASessionShorterThanTheLeadRenewsHalfwayThroughItsRemainingLife() async throws {
        let setup = try await RenewalSetup.make()
        try await setup.client.initialize()
        try setup.start(lead: 3600)
        try await setup.at(59_000)
        XCTAssertEqual(setup.authority.hookCalls, [])
        try await setup.at(60_000)
        XCTAssertEqual(setup.authority.hookCalls, [60_000])
        // Expiry moved to 180 s, so half of the remaining two minutes.
        try await setup.at(119_000)
        XCTAssertEqual(setup.authority.hookCalls, [60_000])
        try await setup.at(120_000)
        XCTAssertEqual(setup.authority.hookCalls, [60_000, 120_000])
    }

    func testFailuresThatLeaveTheSessionVerifiedRetryWithBackoffNeverPastExpiry() async throws {
        let setup = try await RenewalSetup.make()
        try await setup.client.initialize()
        setup.authority.setHook { _ in throw URLError(.notConnectedToInternet) }
        try setup.start(lead: 30)
        // Expiry is 120 s: retries back off 1, 2, 4 and 8 s, and the last one runs a second before expiry.
        let expected = [90_000, 91_000, 93_000, 97_000, 105_000, 119_000]
        for (index, offset) in expected.enumerated() {
            try await setup.at(offset - 1000)
            XCTAssertEqual(setup.authority.hookCalls.count, index, "before \(offset)")
            try await setup.at(offset)
            XCTAssertEqual(setup.authority.hookCalls.count, index + 1, "at \(offset)")
        }
        try await setup.at(600_000)
        XCTAssertEqual(setup.authority.hookCalls, expected)
        XCTAssertEqual(setup.errorCodes, expected.map { _ in "SESSION_REFRESH_FAILED" })
        let state = await setup.client.sessionRefreshState
        XCTAssertEqual(state, .ready)
        let binding = await setup.client.sessionBinding
        XCTAssertEqual(binding?.sessionRevision, "1")
        XCTAssertEqual(setup.schedule.value?.isFinished, true)
    }

    func testASuccessfulRenewalResetsTheBackoff() async throws {
        let setup = try await RenewalSetup.make()
        try await setup.client.initialize()
        setup.authority.setHook { authority in
            if authority.hookCalls.count % 2 == 1 { throw URLError(.notConnectedToInternet) }
            return try authority.renew()
        }
        try setup.start(lead: 30)
        for offset in [90_000, 91_000, 150_000, 151_000] { try await setup.at(offset) }
        XCTAssertEqual(setup.authority.hookCalls, [90_000, 91_000, 150_000, 151_000])
        XCTAssertEqual(setup.errorCodes, ["SESSION_REFRESH_FAILED", "SESSION_REFRESH_FAILED"])
        XCTAssertEqual(setup.authority.renewals, 2)
    }

    func testAnUnverifiedRenewalBlocksTheClientAndStopsTheSchedule() async throws {
        let setup = try await RenewalSetup.make()
        try await setup.client.initialize()
        setup.authority.setHook { authority in
            _ = try authority.renew()
            throw URLError(.networkConnectionLost)
        }
        try setup.start(lead: 30)
        try await setup.at(90_000)
        XCTAssertEqual(setup.authority.hookCalls.count, 1)
        XCTAssertEqual(setup.errorCodes, ["SESSION_REFRESH_UNVERIFIED"])
        let state = await setup.client.sessionRefreshState
        XCTAssertEqual(state, .blocked)
        try await setup.at(600_000)
        XCTAssertEqual(setup.authority.hookCalls.count, 1)
        XCTAssertEqual(setup.errorCodes.count, 1)
        XCTAssertEqual(setup.schedule.value?.isFinished, true)
    }

    func testAnUninitializedClientProvesItsBearerFirstRetryingOnlyTransientFailures() async throws {
        let setup = try await RenewalSetup.make()
        setup.authority.fail("communication.route", status: 503)
        setup.authority.fail("communication.currentSession", status: 429, retryAfter: 5)
        try setup.start(lead: 30)
        try await setup.at(0)
        XCTAssertEqual(setup.errorStatuses, [503])
        try await setup.at(999)
        var sent = await setup.requestCount()
        XCTAssertEqual(sent, 1)
        try await setup.at(1000)
        XCTAssertEqual(setup.errorStatuses, [503, 429])
        // The authority's retryAfter outranks the two-second backoff.
        try await setup.at(5999)
        sent = await setup.requestCount()
        XCTAssertEqual(sent, 3)
        var state = await setup.client.sessionRefreshState
        XCTAssertEqual(state, .uninitialized)
        try await setup.at(6000)
        state = await setup.client.sessionRefreshState
        XCTAssertEqual(state, .ready)
        let keys = await setup.harness.http.requests.map(\.key)
        XCTAssertEqual(keys, [
            "communication.route", "communication.route", "communication.currentSession", "communication.route",
            "communication.currentSession",
        ])

        setup.authority.setHook { authority in
            if authority.hookCalls.count == 1 { throw URLError(.notConnectedToInternet) }
            return try authority.renew()
        }
        try await setup.at(89_000)
        XCTAssertEqual(setup.authority.hookCalls.count, 0)
        try await setup.at(90_000)
        XCTAssertEqual(setup.authority.hookCalls.count, 1)
        // Initializing reset the backoff, so the failed renewal is retried after one second.
        try await setup.at(91_000)
        XCTAssertEqual(setup.authority.renewals, 1)
        XCTAssertEqual(setup.errorCodes, ["UNAVAILABLE", "RATE_LIMITED", "SESSION_REFRESH_FAILED"])
    }

    func testAnInitializationTheAuthorityRejectsIsReportedOnceAndNotRetried() async throws {
        let setup = try await RenewalSetup.make()
        setup.authority.deny("user-token")
        try setup.start()
        try await setup.at(0)
        try await setup.at(600_000)
        XCTAssertEqual(setup.errorCodes, ["UNAUTHENTICATED"])
        XCTAssertEqual(setup.errorStatuses, [401])
        let sent = await setup.requestCount()
        XCTAssertEqual(sent, 1)
        let state = await setup.client.sessionRefreshState
        XCTAssertEqual(state, .uninitialized)
        XCTAssertEqual(setup.schedule.value?.isFinished, true)
    }

    func testCancellingDuringARenewalSuppressesItsSuccessAndLaterRenewals() async throws {
        try await cancelDuringRenewal(failing: false)
    }

    func testCancellingDuringARenewalSuppressesItsFailureAndLaterRenewals() async throws {
        try await cancelDuringRenewal(failing: true)
    }

    private func cancelDuringRenewal(failing: Bool) async throws {
        let setup = try await RenewalSetup.make()
        try await setup.client.initialize()
        let gate = Gate()
        setup.authority.setHook { authority in
            await gate.wait()
            if failing { throw URLError(.notConnectedToInternet) }
            return try authority.renew()
        }
        try setup.start(lead: 30)
        try await setup.settle()
        setup.clock.advance(by: setup.authority.start + 90_000 - setup.clock.now)
        try await eventually("the renewal to start") { setup.authority.hookCalls.count == 1 }
        let state = await setup.client.sessionRefreshState
        XCTAssertEqual(state, .refreshing)

        setup.schedule.value?.cancel()
        gate.open()
        try await eventually("the renewal to finish") { await setup.client.sessionRefreshState == .ready }
        try await setup.at(600_000)
        XCTAssertEqual(setup.authority.hookCalls.count, 1)
        XCTAssertEqual(setup.authority.renewals, failing ? 0 : 1)
        XCTAssertEqual(setup.refreshed.value.count, 0)
        XCTAssertEqual(setup.errorCodes, [])
        XCTAssertEqual(setup.schedule.value?.isFinished, true)
    }

    func testReleasingTheScheduleStopsRenewal() async throws {
        let setup = try await RenewalSetup.make()
        try await setup.client.initialize()
        try setup.start(lead: 30)
        try await setup.settle()
        XCTAssertEqual(setup.clock.deadlines, [setup.authority.start + 90_000])

        setup.schedule.update { $0 = nil }
        try await eventually("the schedule to stop waiting") { setup.clock.pendingSleeps == 0 }
        setup.clock.advance(by: 600_000)
        XCTAssertEqual(setup.authority.hookCalls, [])
    }
}

final class WallClockTests: XCTestCase {
    func testSleepsUntilTheDeadline() async throws {
        let live = ConvoHopEnvironment.live
        let deadline = live.now() + 50
        try await live.sleepUntil(deadline)
        XCTAssertGreaterThanOrEqual(live.now(), deadline)
    }

    func testReturnsAtOnceForAPastDeadline() async throws {
        let started = Date()
        try await WallClock.sleep(until: WallClock.now() - 1000)
        XCTAssertLessThan(Date().timeIntervalSince(started), 1)
    }

    func testThrowsWhenCancelledWhileWaiting() async throws {
        let started = Date()
        let waiting = Task { try await WallClock.sleep(until: WallClock.now() + 60_000) }
        try await Task.sleep(nanoseconds: 20_000_000)
        waiting.cancel()
        let result = await waiting.result
        XCTAssertThrowsError(try result.get()) { error in XCTAssertTrue(error is CancellationError, "\(error)") }
        XCTAssertLessThan(Date().timeIntervalSince(started), 10)
    }

    func testThrowsWhenCancelledBeforeWaiting() async throws {
        let waiting = Task {
            withUnsafeCurrentTask { $0?.cancel() }
            try await WallClock.sleep(until: WallClock.now() + 60_000)
        }
        let result = await waiting.result
        XCTAssertThrowsError(try result.get()) { error in XCTAssertTrue(error is CancellationError, "\(error)") }
    }
}
