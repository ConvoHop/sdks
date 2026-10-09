import Foundation
import XCTest

@testable import ConvoHop

/// The shared retry and reconnect rules of "Retry and reconnect" in `spec/recovery/README.md`.
final class RetryPolicyTests: XCTestCase {
    private static func problem(
        _ code: ConvoHopErrorCode, status: Int?, outcome: ConvoHopOutcome = .rejected, retryAfter: Int? = nil
    ) -> ConvoHopError {
        ConvoHopError(
            code: code, requestId: uuid(), outcome: outcome, status: status, message: "Problem",
            retryAfter: retryAfter)
    }

    func testRetriesNetworkFailuresTimeoutsRateLimitsAndServerFailures() {
        var retried: [ConvoHopError] = [
            Self.problem(.transportUnknown, status: nil, outcome: .unknown),
            Self.problem(.transportUnknown, status: 0, outcome: .unknown),
            Self.problem(ConvoHopErrorCode(rawValue: "REQUEST_TIMEOUT"), status: 408),
            Self.problem(.rateLimited, status: 429, retryAfter: 4),
            Self.problem(.admissionLimit, status: 429),
            Self.problem(.authorityUnavailable, status: 503, outcome: .unknown),
            Self.problem(.outcomeUnknown, status: 503, outcome: .unknown),
            Self.problem(.retryExhausted, status: 503, outcome: .unknown),
        ]
        for status in [500, 502, 503, 504, 599] {
            retried.append(Self.problem(.httpFailure, status: status, outcome: .unknown))
            retried.append(Self.problem(.invalidResponse, status: status, outcome: .unknown))
        }
        for error in retried {
            XCTAssertEqual(RetryPolicy.reconnectAction(error), .retry, "\(error)")
        }
    }

    func testRoutesAgainAfterWrongRegion() {
        XCTAssertEqual(RetryPolicy.reconnectAction(Self.problem(.wrongRegion, status: 409)), .reroute)
        XCTAssertEqual(RetryPolicy.reconnectAction(Self.problem(.wrongRegion, status: nil)), .reroute)
        let terminal = RealtimeTerminal(error: Self.problem(.wrongRegion, status: nil))
        XCTAssertEqual(RetryPolicy.reconnectAction(terminal), .reroute)
    }

    func testStopsOnLimitsAuthenticationScopeAndOtherRefusals() {
        let stopped: [any Error] = [
            Self.problem(.quotaExceeded, status: 429, retryAfter: 60),
            Self.problem(.planLimitExceeded, status: 403),
            Self.problem(.unauthenticated, status: 401),
            Self.problem(.forbidden, status: 403),
            Self.problem(.scopeRequired, status: 403),
            Self.problem(.invalidRequest, status: 400),
            Self.problem(.notFound, status: 404),
            Self.problem(.recoveryLimit, status: 409),
            // A retryable or unlisted code still stops with a status the rules don't retry.
            Self.problem(.httpFailure, status: 404),
            Self.problem(ConvoHopErrorCode(rawValue: "SOMETHING_NEW"), status: 400),
            RealtimeTerminal(error: Self.problem(.rateLimited, status: 429)),
            URLError(.notConnectedToInternet),
            CancellationError(),
            ProtocolViolation("Malformed"),
        ]
        for error in stopped {
            XCTAssertEqual(RetryPolicy.reconnectAction(error), .stop, "\(error)")
        }
    }

    func testTheSchemaSaysWhichCodesAreRetryable() {
        XCTAssertTrue(RetryPolicy.retryableCode("RATE_LIMITED"))
        XCTAssertTrue(RetryPolicy.retryableCode("TRANSPORT_UNKNOWN"))
        XCTAssertTrue(RetryPolicy.retryableCode("WRONG_REGION"))
        XCTAssertTrue(RetryPolicy.retryableCode("SOMETHING_NEW"))
        XCTAssertFalse(RetryPolicy.retryableCode("QUOTA_EXCEEDED"))
        XCTAssertFalse(RetryPolicy.retryableCode("PLAN_LIMIT_EXCEEDED"))
        XCTAssertFalse(RetryPolicy.retryableCode("FORBIDDEN"))
        XCTAssertFalse(RetryPolicy.retryableCode("RECOVERY_LIMIT"))
    }

    /// Only server operations return these codes, so they have no public member, but the schema still says how to
    /// classify them: the spec's 503 examples that aren't retryable stop.
    func testCodesThatOnlyServerOperationsReturnFollowTheSchema() {
        for name in [
            "BILLING_NOT_CONFIGURED", "MEMBERSHIP_COUNT_INVALID", "SESSION_RECEIPT_BINDING_MISMATCH",
            "SESSION_RECEIPT_INVALID",
        ] {
            XCTAssertFalse(RetryPolicy.retryableCode(name), name)
            let problem = Self.problem(ConvoHopErrorCode(rawValue: name), status: 503)
            XCTAssertEqual(RetryPolicy.reconnectAction(problem), .stop, name)
        }
        let limit = Self.problem(ConvoHopErrorCode(rawValue: "WEBHOOK_ENDPOINT_LIMIT"), status: nil)
        XCTAssertEqual(RetryPolicy.reconnectAction(limit), .stop)
        // A code the schema doesn't list is judged by its status.
        let unlisted = Self.problem(ConvoHopErrorCode(rawValue: "SOMETHING_NEW"), status: 503)
        XCTAssertEqual(RetryPolicy.reconnectAction(unlisted), .retry)
    }

    func testACloseReasonThatNamesACodeReportsIt() throws {
        let limited = try XCTUnwrap(RetryPolicy.closeProblem(code: 4429, reason: "RATE_LIMITED retryAfter=4", requestId: "r"))
        XCTAssertEqual(limited.code, .rateLimited)
        XCTAssertEqual(limited.status, 429)
        XCTAssertEqual(limited.outcome, .rejected)
        XCTAssertEqual(limited.retryAfter, 4)
        XCTAssertEqual(limited.requestId, "r")
        XCTAssertEqual(RetryPolicy.reconnectAction(limited), .retry)

        let quota = try XCTUnwrap(
            RetryPolicy.closeProblem(code: 4429, reason: "QUOTA_EXCEEDED retryAfter=60 meter=messages", requestId: "r"))
        XCTAssertEqual(quota.code, .quotaExceeded)
        XCTAssertEqual(quota.status, 429)
        XCTAssertEqual(quota.retryAfter, 60)
        XCTAssertEqual(quota.message, "Realtime connection closed: QUOTA_EXCEEDED retryAfter=60 meter=messages")
        XCTAssertEqual(RetryPolicy.reconnectAction(quota), .stop)

        let plan = try XCTUnwrap(
            RetryPolicy.closeProblem(code: 4403, reason: "PLAN_LIMIT_EXCEEDED planLimit=conversations", requestId: "r"))
        XCTAssertEqual(plan.code, .planLimitExceeded)
        XCTAssertEqual(plan.status, 403)
        XCTAssertNil(plan.retryAfter)
        XCTAssertEqual(RetryPolicy.reconnectAction(plan), .stop)

        // The close code never overrides the code the reason names.
        let anyClose = try XCTUnwrap(RetryPolicy.closeProblem(code: 1008, reason: " RATE_LIMITED  retryAfter=2 ", requestId: "r"))
        XCTAssertEqual(anyClose.code, .rateLimited)
        XCTAssertEqual(anyClose.status, 429)
        XCTAssertEqual(anyClose.retryAfter, 2)
        XCTAssertEqual(anyClose.message, "Realtime connection closed: RATE_LIMITED retryAfter=2")

        // A code without a documented status takes it from a 4xxx close code.
        let unlisted = try XCTUnwrap(RetryPolicy.closeProblem(code: 4413, reason: "GRAPHQL_ERROR", requestId: "r"))
        XCTAssertEqual(unlisted.status, 413)
        XCTAssertNil(RetryPolicy.closeProblem(code: 1008, reason: "GRAPHQL_ERROR", requestId: "r")?.status)

        for reason in ["RATE_LIMITED retryAfter=soon", "RATE_LIMITED retryAfter=", "RATE_LIMITED retryAfter=-1"] {
            XCTAssertNil(RetryPolicy.closeProblem(code: 4429, reason: reason, requestId: "r")?.retryAfter, reason)
        }
    }

    func testAnAuthorizationCloseWithoutACodeIsUnauthenticated() throws {
        for code in [4400, 4401, 4403, 4408, 4409] {
            for reason in ["", "Forbidden", "rate_limited"] {
                let problem = try XCTUnwrap(RetryPolicy.closeProblem(code: code, reason: reason, requestId: "r"))
                XCTAssertEqual(problem.code, .unauthenticated, "\(code) \(reason)")
                XCTAssertEqual(problem.status, 401)
                XCTAssertEqual(RetryPolicy.reconnectAction(problem), .stop)
            }
        }
    }

    func testAnyOtherCloseReconnects() {
        for (code, reason) in [(1000, ""), (1001, "Going away"), (1006, ""), (1011, "Internal error"), (1012, ""),
            (4429, ""), (4429, "Too many"), (4500, "")]
        {
            XCTAssertNil(RetryPolicy.closeProblem(code: code, reason: reason, requestId: "r"), "\(code) \(reason)")
        }
    }

    func testReconnectDelaysDoubleToTenSecondsWithRetryAfterAsAFloor() {
        let backoff = (0..<7).map { RetryPolicy.reconnectDelay(attempt: $0, retryAfter: nil, jitter: 0) }
        XCTAssertEqual(backoff, [1000, 2000, 4000, 8000, 10000, 10000, 10000])
        XCTAssertEqual(RetryPolicy.reconnectDelay(attempt: -1, retryAfter: nil, jitter: 0), 1000)
        XCTAssertEqual(RetryPolicy.reconnectDelay(attempt: 0, retryAfter: 6, jitter: 0), 6000)
        XCTAssertEqual(RetryPolicy.reconnectDelay(attempt: 0, retryAfter: 6, jitter: 250), 6250)
        XCTAssertEqual(RetryPolicy.reconnectDelay(attempt: 4, retryAfter: 3, jitter: 100), 10100)
        XCTAssertEqual(RetryPolicy.reconnectDelay(attempt: 1, retryAfter: -5, jitter: 0), 2000)
        XCTAssertEqual(RetryPolicy.reconnectDelay(attempt: 1, retryAfter: 0, jitter: 0), 2000)
        XCTAssertEqual(RetryPolicy.reconnectDelay(attempt: 0, retryAfter: Int.max, jitter: 499), RetryPolicy.maximumDelay)
        XCTAssertEqual(RetryPolicy.reconnectDelay(attempt: Int.max, retryAfter: nil, jitter: 0), 10000)
    }

    func testRetryAfterBecomesABoundedTimerDelay() {
        XCTAssertEqual(RetryPolicy.retryAfterMilliseconds(nil), 0)
        XCTAssertEqual(RetryPolicy.retryAfterMilliseconds(-5), 0)
        XCTAssertEqual(RetryPolicy.retryAfterMilliseconds(0), 0)
        XCTAssertEqual(RetryPolicy.retryAfterMilliseconds(7), 7000)
        XCTAssertEqual(RetryPolicy.retryAfterMilliseconds(2_147_483), 2_147_483_000)
        XCTAssertEqual(RetryPolicy.retryAfterMilliseconds(2_147_484), RetryPolicy.maximumDelay)
        XCTAssertEqual(RetryPolicy.retryAfterMilliseconds(Int.max), RetryPolicy.maximumDelay)
    }

    func testRetentionCountsTheRequestIdsOfLiveRetainers() {
        let retention = RecoveryRetention()
        var first: RecoveryRetainer? = RecoveryRetainer()
        let second = RecoveryRetainer()
        retention.add(first!)
        retention.add(second)
        retention.add(second)
        first?.hold(["a", "b"])
        second.hold(["b", "c"])
        XCTAssertEqual(retention.requestIds, ["a", "b", "c"])
        second.hold(["d"])
        XCTAssertEqual(retention.requestIds, ["a", "b", "d"])
        first = nil
        XCTAssertEqual(retention.requestIds, ["d"])
        second.hold([])
        XCTAssertEqual(retention.requestIds, [])
    }
}
