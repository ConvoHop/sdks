import Foundation
import XCTest

@testable import ConvoHop

final class ClientConfigurationTests: XCTestCase {
    private func configuration(
        baseURL: String = Fixture.baseURL, projectId: String = TestIDs.project,
        principalId: String = TestIDs.principal, incarnation: String = TestIDs.incarnation,
        token: String = "user-token"
    ) -> ConvoHopConfiguration {
        ConvoHopConfiguration(
            baseURL: URL(string: baseURL)!, projectId: projectId, principalId: principalId, incarnation: incarnation,
            sessionToken: token, httpClient: StubHTTP(), webSocketFactory: FakeWebSocketFactory())
    }

    private func assertUsageError(
        _ configuration: ConvoHopConfiguration, file: StaticString = #filePath, line: UInt = #line
    ) {
        XCTAssertThrowsError(try ConvoHopClient(configuration: configuration), file: file, line: line) { error in
            XCTAssertTrue(error is ConvoHopUsageError, "\(error)", file: file, line: line)
        }
    }

    func testAcceptsCanonicalIdentifiersAndAnHTTPSOrigin() throws {
        let client = try ConvoHopClient(configuration: configuration())
        XCTAssertEqual(client.projectId, TestIDs.project)
        XCTAssertEqual(client.principalId, TestIDs.principal)
        XCTAssertEqual(client.incarnation, TestIDs.incarnation)
    }

    func testRejectsIdentifiersThatAreNotCanonicalUUIDs() {
        assertUsageError(configuration(projectId: TestIDs.project.uppercased()))
        assertUsageError(configuration(principalId: "user-1"))
        assertUsageError(configuration(incarnation: TestIDs.incarnation.replacingOccurrences(of: "-", with: "")))
    }

    func testRejectsUnusableSessionTokens() {
        assertUsageError(configuration(token: ""))
        assertUsageError(configuration(token: "line\nbreak"))
        assertUsageError(configuration(token: String(repeating: "a", count: 16_385)))
    }

    func testRequiresHTTPSExceptOnLoopback() {
        assertUsageError(configuration(baseURL: "http://api.convohop.test"))
        assertUsageError(configuration(baseURL: "https://api.convohop.test/prefix"))
        assertUsageError(configuration(baseURL: "https://user:secret@api.convohop.test"))
        XCTAssertNoThrow(try ConvoHopClient(configuration: configuration(baseURL: "http://127.0.0.1:8080")))
        XCTAssertNoThrow(try ConvoHopClient(configuration: configuration(baseURL: "http://localhost:8080")))
    }
}

final class ClientInitializeTests: XCTestCase {
    func testFetchesTheRouteWithTheSessionToken() async throws {
        let h = try await Harness.make(token: "user-token")
        let route = try await h.client.initialize()
        XCTAssertEqual(route.projectId, TestIDs.project)
        XCTAssertEqual(route.incarnation, TestIDs.incarnation)
        XCTAssertEqual(route.wssUrl, "wss://api.convohop.test/graphql")

        let requests = await h.http.requests("communication.route")
        XCTAssertEqual(requests.count, 1)
        let request = try XCTUnwrap(requests.first)
        XCTAssertEqual(request.request.method, "POST")
        XCTAssertEqual(request.request.url.absoluteString, "https://api.convohop.test/graphql")
        XCTAssertEqual(request.authorization, "Bearer user-token")
        XCTAssertEqual(request.context["projectId"]?.stringValue, TestIDs.project)
        XCTAssertEqual(request.context["incarnation"]?.stringValue, TestIDs.incarnation)
        XCTAssertTrue(ProtocolChecks.isCanonicalUUID(request.requestId))
        let state = await h.client.sessionRefreshState
        XCTAssertEqual(state, .disabled)
    }

    func testRejectsARouteForAnotherIncarnation() async throws {
        let h = try await Harness.make(route: false)
        let clock = h.clock
        await h.http.on("communication.route") { request in
            Reply.ok(
                request, ["result": Fixture.route(now: clock.now, incarnation: TestIDs.otherPrincipal)], now: clock.now)
        }
        let error = await convoHopError { try await h.client.initialize() }
        XCTAssertEqual(error?.code, .incarnationMismatch)
        XCTAssertEqual(error?.outcome, .rejected)
    }

    func testRejectsARouteThatSendsCredentialsElsewhere() async throws {
        let routes = [
            ("https://elsewhere.test", "wss://api.convohop.test/graphql"),
            (Fixture.baseURL, "wss://elsewhere.test/graphql"),
            (Fixture.baseURL, "ws://api.convohop.test/graphql"),
            (Fixture.baseURL, "wss://api.convohop.test:8443/graphql"),
            (Fixture.baseURL, "wss://api.convohop.test/other"),
            (Fixture.baseURL, "wss://api.convohop.test/graphql?token=1"),
        ]
        for (base, socket) in routes {
            let h = try await Harness.make(route: false)
            let clock = h.clock
            await h.http.on("communication.route") { request in
                Reply.ok(
                    request, ["result": Fixture.route(now: clock.now, communicationBase: base, wssUrl: socket)],
                    now: clock.now)
            }
            let error = await convoHopError { try await h.client.initialize() }
            XCTAssertEqual(error?.code, .invalidResponse, "\(base) \(socket)")
        }
    }

    func testBindsTheCurrentSessionWhenItCanRefresh() async throws {
        let h = try await Harness.make(refresh: { _ in throw URLError(.cancelled) })
        let clock = h.clock
        await h.http.on("communication.currentSession") { request in
            Reply.ok(request, ["result": Fixture.session(expiresAt: clock.now + 3_600_000)], now: clock.now)
        }
        var state = await h.client.sessionRefreshState
        XCTAssertEqual(state, .uninitialized)
        try await h.client.initialize()
        state = await h.client.sessionRefreshState
        XCTAssertEqual(state, .ready)
        let binding = await h.client.sessionBinding
        XCTAssertEqual(binding?.sessionId, TestIDs.session)
        XCTAssertEqual(binding?.sessionRevision, "1")
    }

    func testRejectsASessionForAnotherUser() async throws {
        let h = try await Harness.make(refresh: { _ in throw URLError(.cancelled) })
        let clock = h.clock
        await h.http.on("communication.currentSession") { request in
            Reply.ok(
                request,
                ["result": Fixture.session(expiresAt: clock.now + 3_600_000, principalId: TestIDs.otherPrincipal)],
                now: clock.now)
        }
        let error = await convoHopError { try await h.client.initialize() }
        XCTAssertEqual(error?.code, .sessionRefreshRejected)
        let binding = await h.client.sessionBinding
        XCTAssertNil(binding)
    }
}

final class ClientSendTests: XCTestCase {
    func testReturnsTheAcknowledgedReceipt() async throws {
        let h = try await Harness.make()
        try await h.client.initialize()
        let messageId = uuid()
        await h.http.on("communication.sendMessage") { request in
            Reply.ok(request, ["result": Fixture.messageAck(TestIDs.conversation, messageId: messageId, sequence: "7")])
        }
        let receipt = try await h.client.send("Hello", to: TestIDs.conversation, props: ["kind": "note"])
        XCTAssertEqual(receipt.messageId, messageId)
        XCTAssertEqual(receipt.conversationId, TestIDs.conversation)
        XCTAssertEqual(receipt.sequence, "7")
        XCTAssertEqual(receipt.status, "sent")
        XCTAssertEqual(receipt.cursor.sequence, "7")

        let requests = await h.http.requests("communication.sendMessage")
        let request = try XCTUnwrap(requests.first)
        XCTAssertEqual(request.authorization, "Bearer user-token")
        XCTAssertEqual(request.input?["conversationId"]?.stringValue, TestIDs.conversation)
        XCTAssertEqual(request.input?["text"]?.stringValue, "Hello")
        XCTAssertEqual(request.input?["props"], ["kind": "note"])
        XCTAssertEqual(request.context["observedServingEpoch"]?.stringValue, "1")

        let states = try await h.client.recoveryStates()
        XCTAssertEqual(states.map(\.requestId), [request.requestId])
        XCTAssertEqual(states.first?.resolutionState, .committed)
        XCTAssertEqual(states.first?.lastAttemptClassification, "authorityReceipt")
        XCTAssertEqual(states.first?.attemptCount, 1)
    }

    func testKeepsTheCallersRequestId() async throws {
        let h = try await Harness.make()
        await h.http.on("communication.sendMessage") { request in
            Reply.ok(request, ["result": Fixture.messageAck(TestIDs.conversation)])
        }
        let requestId = uuid()
        _ = try await h.client.send("Hello", to: TestIDs.conversation, requestId: requestId)
        let requests = await h.http.requests("communication.sendMessage")
        XCTAssertEqual(requests.map(\.requestId), [requestId])
    }

    func testRejectsAReceiptOutsideTheConversation() async throws {
        let acks: [JSONValue] = [
            Fixture.messageAck(TestIDs.otherProject),
            Fixture.messageAck(TestIDs.conversation, status: "pending"),
        ]
        for ack in acks {
            let h = try await Harness.make()
            await h.http.on("communication.sendMessage") { request in Reply.ok(request, ["result": ack]) }
            let requestId = uuid()
            let error = await convoHopError {
                try await h.client.send("Hello", to: TestIDs.conversation, requestId: requestId)
            }
            XCTAssertEqual(error?.code, .invalidResponse)
            XCTAssertEqual(error?.requestId, requestId)
        }
    }

    func testRejectsInvalidIdentifiersWithoutARequest() async throws {
        let h = try await Harness.make()
        let conversation = await thrownError { try await h.client.send("Hello", to: "conversation-1") }
        XCTAssertTrue(conversation is ConvoHopUsageError)
        let request = await thrownError {
            try await h.client.send("Hello", to: TestIDs.conversation, requestId: "REQUEST-1")
        }
        XCTAssertTrue(request is ConvoHopUsageError)
        let sent = await h.http.requests.count
        XCTAssertEqual(sent, 0)
    }

    func testAuthorityErrorsKeepTheirCodeOutcomeAndStatus() async throws {
        let h = try await Harness.make()
        await h.http.on("communication.sendMessage") { _ in
            Reply.graphQLError(code: "FORBIDDEN", outcome: "rejected", status: 403)
        }
        let requestId = uuid()
        let error = await convoHopError { try await h.client.send("Hello", to: TestIDs.conversation, requestId: requestId) }
        XCTAssertEqual(error?.code.rawValue, "FORBIDDEN")
        XCTAssertEqual(error?.outcome, .rejected)
        XCTAssertEqual(error?.status, 403)
        XCTAssertEqual(error?.requestId, requestId)
        let states = try await h.client.recoveryStates()
        XCTAssertEqual(states.first?.lastAttemptClassification, "FORBIDDEN")
    }

    func testHTTPFailuresUseTheirTopLevelCode() async throws {
        let h = try await Harness.make()
        await h.http.on("communication.sendMessage") { _ in
            Reply.failure(status: 503, code: "AUTHORITY_UNAVAILABLE", outcome: "unknown")
        }
        let error = await convoHopError { try await h.client.send("Hello", to: TestIDs.conversation) }
        XCTAssertEqual(error?.code.rawValue, "AUTHORITY_UNAVAILABLE")
        XCTAssertEqual(error?.outcome, .unknown)
        XCTAssertEqual(error?.status, 503)
    }

    func testMalformedRepliesAreInvalidResponses() async throws {
        let field = Catalog.descriptor("communication.sendMessage").field
        let replies: [@Sendable (RecordedRequest) -> ConvoHopHTTPResponse] = [
            { _ in Reply.json(["data": .object([field: ["status": "committed"]])]) },
            { request in
                Reply.ok(request, ["requestId": .string(uuid()), "result": Fixture.messageAck(TestIDs.conversation)])
            },
            { request in Reply.ok(request, ["receiptId": .null, "result": Fixture.messageAck(TestIDs.conversation)]) },
            { _ in ConvoHopHTTPResponse(status: 200, headers: ["Content-Type": "application/json"], body: Data("{".utf8)) },
        ]
        for (index, reply) in replies.enumerated() {
            let h = try await Harness.make()
            await h.http.on("communication.sendMessage") { request in reply(request) }
            let error = await convoHopError { try await h.client.send("Hello", to: TestIDs.conversation) }
            XCTAssertEqual(error?.code, .invalidResponse, "reply \(index)")
        }
    }
}

final class ClientRecoveryTests: XCTestCase {
    private static let storageKey = "convohop.requests:\(TestIDs.project):\(TestIDs.principal)"

    func testAnUncertainSendKeepsARecoveryRecordWithoutTheToken() async throws {
        let h = try await Harness.make(token: "secret-user-token")
        await h.http.on("communication.sendMessage") { _ in throw URLError(.networkConnectionLost) }
        let requestId = uuid()
        let error = await convoHopError { try await h.client.send("Hello", to: TestIDs.conversation, requestId: requestId) }
        XCTAssertEqual(error?.code, .transportUnknown)
        XCTAssertEqual(error?.outcome, .unknown)
        XCTAssertNil(error?.status)
        XCTAssertEqual(error?.requestId, requestId)
        XCTAssertFalse(String(describing: error).contains("secret-user-token"))

        let states = try await h.client.recoveryStates()
        XCTAssertEqual(states.count, 1)
        let state = try XCTUnwrap(states.first)
        XCTAssertEqual(state.requestId, requestId)
        XCTAssertEqual(state.operation, "communication.sendMessage")
        XCTAssertEqual(state.projectId, TestIDs.project)
        XCTAssertEqual(state.resolutionState, .unknown)
        XCTAssertEqual(state.attemptCount, 1)
        XCTAssertEqual(state.lastAttemptClassification, "TRANSPORT_UNKNOWN")
        XCTAssertEqual(state.input["text"]?.stringValue, "Hello")
        XCTAssertEqual(state.retryDeadline, state.firstSubmittedAt + 60_000)

        let stored = await h.storage.value(forKey: Self.storageKey)
        let text = try XCTUnwrap(stored)
        XCTAssertTrue(text.contains(requestId))
        XCTAssertFalse(text.contains("secret-user-token"))
    }

    func testResendingTheSameRequestReusesItsRecord() async throws {
        let h = try await Harness.make()
        let attempts = Shared(0)
        await h.http.on("communication.sendMessage") { request in
            if attempts.update({ $0 += 1; return $0 }) == 1 { throw URLError(.timedOut) }
            return Reply.ok(request, ["result": Fixture.messageAck(TestIDs.conversation)])
        }
        let requestId = uuid()
        _ = await convoHopError { try await h.client.send("Hello", to: TestIDs.conversation, requestId: requestId) }
        _ = try await h.client.send("Hello", to: TestIDs.conversation, requestId: requestId)

        let requests = await h.http.requests("communication.sendMessage")
        XCTAssertEqual(requests.map(\.requestId), [requestId, requestId])
        XCTAssertEqual(requests[0].input, requests[1].input)
        let states = try await h.client.recoveryStates()
        XCTAssertEqual(states.count, 1)
        XCTAssertEqual(states.first?.attemptCount, 2)
        XCTAssertEqual(states.first?.resolutionState, .committed)
    }

    func testReusingARequestIdForAnotherMessageIsAConflict() async throws {
        let h = try await Harness.make()
        await h.http.on("communication.sendMessage") { _ in throw URLError(.timedOut) }
        let requestId = uuid()
        _ = await convoHopError { try await h.client.send("Hello", to: TestIDs.conversation, requestId: requestId) }
        let error = await convoHopError {
            try await h.client.send("Goodbye", to: TestIDs.conversation, requestId: requestId)
        }
        XCTAssertEqual(error?.code, .idempotencyConflict)
        XCTAssertEqual(error?.outcome, .unknown)
        XCTAssertEqual(error?.requestId, requestId)
        let sent = await h.http.count("communication.sendMessage")
        XCTAssertEqual(sent, 1)
    }

    func testTheRetryBudgetEndsAfterThreeAttempts() async throws {
        let h = try await Harness.make()
        await h.http.on("communication.sendMessage") { _ in throw URLError(.timedOut) }
        let requestId = uuid()
        for _ in 0..<3 {
            let error = await convoHopError {
                try await h.client.send("Hello", to: TestIDs.conversation, requestId: requestId)
            }
            XCTAssertEqual(error?.code, .transportUnknown)
        }
        let error = await convoHopError { try await h.client.send("Hello", to: TestIDs.conversation, requestId: requestId) }
        XCTAssertEqual(error?.code, .resolutionRequired)
        let sent = await h.http.count("communication.sendMessage")
        XCTAssertEqual(sent, 3)
    }

    func testTheRetryWindowEndsAfterAMinute() async throws {
        let h = try await Harness.make()
        await h.http.on("communication.sendMessage") { _ in throw URLError(.timedOut) }
        let requestId = uuid()
        _ = await convoHopError { try await h.client.send("Hello", to: TestIDs.conversation, requestId: requestId) }
        h.clock.advance(by: 60_001)
        let error = await convoHopError { try await h.client.send("Hello", to: TestIDs.conversation, requestId: requestId) }
        XCTAssertEqual(error?.code, .resolutionRequired)
        let sent = await h.http.count("communication.sendMessage")
        XCTAssertEqual(sent, 1)
    }

    func testRetryResendsARequestTheAuthorityNeverSaw() async throws {
        let h = try await Harness.make()
        await h.http.on("communication.sendMessage") { _ in throw URLError(.timedOut) }
        let requestId = uuid()
        _ = await convoHopError { try await h.client.send("Hello", to: TestIDs.conversation, requestId: requestId) }

        // The app restarts: a new client reads the same recovery storage.
        let relaunched = try await Harness.make(clock: h.clock, storage: h.storage)
        let resent = Shared(false)
        await relaunched.http.on("communication.sendMessage") { request in
            resent.update { $0 = true }
            return Reply.ok(request, ["result": Fixture.messageAck(TestIDs.conversation)])
        }
        await relaunched.http.on("communication.resolveRequest") { request in
            let target = request.input?["requestId"]?.stringValue ?? ""
            let state = resent.value ? "committed" : "notObservedYet"
            return Reply.ok(
                request,
                ["result": Fixture.resolution(target, state, retained: ["messageAck": Fixture.messageAck(TestIDs.conversation)])])
        }
        let resolution = try await relaunched.client.retryRequest(requestId)
        XCTAssertEqual(resolution.state, "committed")
        XCTAssertEqual(resolution.requestId, requestId)

        let original = await h.http.requests("communication.sendMessage")
        let resends = await relaunched.http.requests("communication.sendMessage")
        XCTAssertEqual(resends.map(\.requestId), [requestId])
        XCTAssertEqual(resends.first?.input, original.first?.input)
        let lookups = await relaunched.http.requests("communication.resolveRequest")
        XCTAssertEqual(lookups.count, 2)
        XCTAssertFalse(lookups.contains { $0.requestId == requestId }, "Lookups use their own request IDs")
        let states = try await relaunched.client.recoveryStates()
        XCTAssertEqual(states.first?.attemptCount, 2)
        XCTAssertEqual(states.first?.resolutionState, .committed)
    }

    func testRetryDoesNotResendACommittedRequest() async throws {
        let h = try await Harness.make()
        await h.http.on("communication.sendMessage") { _ in throw URLError(.timedOut) }
        await h.http.on("communication.resolveRequest") { request in
            let target = request.input?["requestId"]?.stringValue ?? ""
            return Reply.ok(request, ["result": Fixture.resolution(target, "committed")])
        }
        let requestId = uuid()
        _ = await convoHopError { try await h.client.send("Hello", to: TestIDs.conversation, requestId: requestId) }
        let resolution = try await h.client.retryRequest(requestId)
        XCTAssertEqual(resolution.state, "committed")
        let sent = await h.http.count("communication.sendMessage")
        XCTAssertEqual(sent, 1)
    }

    func testRetryNeedsARecord() async throws {
        let h = try await Harness.make()
        let error = await thrownError { try await h.client.retryRequest(uuid()) }
        XCTAssertTrue(error is ConvoHopUsageError, "\(String(describing: error))")
        let sent = await h.http.requests.count
        XCTAssertEqual(sent, 0)
    }

    func testRecoverPendingFollowsUpRetryableRefusalsAndLeavesFinalOnesAlone() async throws {
        let limited = uuid(), admitted = uuid(), forbidden = uuid()
        let storage = try await Fixture.recoveryStorage([
            Fixture.recoveryRecord(limited, resolution: "rejected", classification: "RATE_LIMITED"),
            Fixture.recoveryRecord(admitted, resolution: "rejected", classification: "ADMISSION_LIMIT"),
            Fixture.recoveryRecord(forbidden, resolution: "rejected", classification: "FORBIDDEN"),
        ])
        let h = try await Harness.make(storage: storage)
        let resent = Shared<Set<String>>([])
        await h.http.on("communication.sendMessage") { request in
            resent.update { _ = $0.insert(request.requestId) }
            return Reply.ok(request, ["result": Fixture.messageAck(TestIDs.conversation)])
        }
        await h.http.on("communication.resolveRequest") { request in
            let target = request.input?["requestId"]?.stringValue ?? ""
            let state = resent.value.contains(target) ? "committed" : "notObservedYet"
            return Reply.ok(request, ["result": Fixture.resolution(target, state)])
        }
        let errors = Shared<[String]>([])
        await h.client.recoverPending { error in errors.update { $0.append(String(describing: error)) } }

        XCTAssertEqual(errors.value, [])
        // A transient refusal is resent within its budget once ConvoHop confirms it never saw it. A rate-limited one
        // is looked up. A refusal that can't succeed later is final, so it is left alone.
        let sends = await h.http.requests("communication.sendMessage")
        XCTAssertEqual(sends.map(\.requestId), [admitted])
        let lookups = await h.http.requests("communication.resolveRequest")
        XCTAssertEqual(lookups.compactMap { $0.input?["requestId"]?.stringValue }, [limited, admitted, admitted])
        let states = try await h.client.recoveryStates()
        XCTAssertEqual(states.map(\.requestId), [limited, admitted, forbidden])
        XCTAssertEqual(states.map(\.resolutionState), [.rejected, .committed, .rejected])
    }
}

final class ClientSessionRefreshTests: XCTestCase {
    /// An authority that knows each token's session, and a client for it.
    private struct Setup {
        let harness: Harness
        /// Each token's session, as `communication.currentSession` reports it.
        let sessions: Shared<[String: JSONValue]>
        /// The sessions the refresh callback received.
        let calls: Shared<[Session]>
    }

    private static let firstExpiry = 3_600_000
    private static let renewedExpiry = 7_200_000

    private func authority(
        revision: String = "2", hook: (@Sendable () throws -> Void)? = nil
    ) async throws -> Setup {
        let clock = TestClock()
        let renewedAt = clock.now + Self.renewedExpiry
        let renewed = Fixture.session(revision: revision, expiresAt: renewedAt)
        let sessions = Shared<[String: JSONValue]>([
            "user-token": Fixture.session(expiresAt: clock.now + Self.firstExpiry)
        ])
        let calls = Shared<[Session]>([])
        let harness = try await Harness.make(
            refresh: { current in
                calls.update { $0.append(current) }
                try hook?()
                sessions.update { $0["renewed-token"] = renewed }
                return SessionBootstrap(
                    session: try renewed.decoded(as: Session.self), tokenExpiresAt: timestamp(renewedAt),
                    sessionToken: "renewed-token")
            }, clock: clock)
        await harness.http.on("communication.currentSession") { request in
            let token = request.authorization.map { String($0.dropFirst("Bearer ".count)) } ?? ""
            guard let session = sessions.value[token] else {
                return Reply.failure(status: 401, code: "UNAUTHENTICATED")
            }
            return Reply.ok(request, ["result": session], now: clock.now)
        }
        await harness.http.on("communication.sendMessage") { request in
            Reply.ok(request, ["result": Fixture.messageAck(TestIDs.conversation)])
        }
        try await harness.client.initialize()
        return Setup(harness: harness, sessions: sessions, calls: calls)
    }

    private func lastSendAuthorization(_ h: Harness) async throws -> String? {
        _ = try await h.client.send("Hello", to: TestIDs.conversation)
        return await h.http.requests("communication.sendMessage").last?.authorization
    }

    func testSwapsInAVerifiedReplacement() async throws {
        let setup = try await authority()
        let h = setup.harness
        let renewed = try await h.client.refreshSession()
        XCTAssertEqual(renewed.sessionRevision, "2")
        XCTAssertEqual(setup.calls.value.map(\.sessionRevision), ["1"])
        let binding = await h.client.sessionBinding
        XCTAssertEqual(binding, renewed)
        let state = await h.client.sessionRefreshState
        XCTAssertEqual(state, .ready)

        let routes = await h.http.requests("communication.route")
        XCTAssertEqual(routes.last?.authorization, "Bearer renewed-token")
        let authorization = try await lastSendAuthorization(h)
        XCTAssertEqual(authorization, "Bearer renewed-token")
    }

    func testRefreshesOnceForConcurrentCallers() async throws {
        let setup = try await authority()
        let client = setup.harness.client
        async let first = client.refreshSession()
        async let second = client.refreshSession()
        let (a, b) = try await (first, second)
        XCTAssertEqual(a, b)
        XCTAssertEqual(setup.calls.value.count, 1)
    }

    func testAFailedCallbackKeepsTheOriginalSession() async throws {
        let setup = try await authority(hook: { throw URLError(.notConnectedToInternet) })
        let h = setup.harness
        let error = await convoHopError { try await h.client.refreshSession() }
        XCTAssertEqual(error?.code, .sessionRefreshFailed)
        XCTAssertEqual(error?.outcome, .unknown)
        let state = await h.client.sessionRefreshState
        XCTAssertEqual(state, .ready)
        let authorization = try await lastSendAuthorization(h)
        XCTAssertEqual(authorization, "Bearer user-token")
    }

    func testRejectsAReplacementThatDoesNotAdvanceTheRevision() async throws {
        let setup = try await authority(revision: "1")
        let h = setup.harness
        let error = await convoHopError { try await h.client.refreshSession() }
        XCTAssertEqual(error?.code, .sessionRefreshRejected)
        let binding = await h.client.sessionBinding
        XCTAssertEqual(binding?.sessionRevision, "1")
        let authorization = try await lastSendAuthorization(h)
        XCTAssertEqual(authorization, "Bearer user-token")
    }

    func testBlocksRequestsWhenNeitherSessionCanBeVerified() async throws {
        let setup = try await authority(hook: { throw URLError(.notConnectedToInternet) })
        let h = setup.harness
        setup.sessions.update { $0["user-token"] = nil }
        let error = await convoHopError { try await h.client.refreshSession() }
        XCTAssertEqual(error?.code, .sessionRefreshUnverified)
        let state = await h.client.sessionRefreshState
        XCTAssertEqual(state, .blocked)

        let sent = await h.http.count("communication.sendMessage")
        let blocked = await convoHopError { try await h.client.send("Hello", to: TestIDs.conversation) }
        XCTAssertEqual(blocked?.code, .sessionRefreshRequired)
        let after = await h.http.count("communication.sendMessage")
        XCTAssertEqual(after, sent)
    }

    func testNeedsACallbackAndABinding() async throws {
        let h = try await Harness.make()
        let withoutCallback = await convoHopError { try await h.client.refreshSession() }
        XCTAssertEqual(withoutCallback?.code, .sessionRefreshRequired)

        let unbound = try await Harness.make(refresh: { _ in throw URLError(.cancelled) })
        let withoutBinding = await convoHopError { try await unbound.client.refreshSession() }
        XCTAssertEqual(withoutBinding?.code, .sessionRefreshRequired)
    }
}

final class ClientNotificationTests: XCTestCase {
    private func payload(
        projectId: String = TestIDs.project, recipientId: String = TestIDs.principal, eventId: String = uuid(),
        eventType: String = "notification.message", messageId: String = uuid()
    ) -> [AnyHashable: Any] {
        [
            "aps": ["alert": ["loc-key": "CONVOHOP_MESSAGE"] as [String: Any], "mutable-content": 1] as [String: Any],
            "convohop": [
                "eventId": eventId, "eventType": eventType, "occurredAt": "2026-10-10T11:59:55Z",
                "projectId": projectId, "recipientId": recipientId, "conversationId": TestIDs.conversation,
                "senderId": TestIDs.otherPrincipal, "messageId": messageId,
            ] as [String: Any],
        ]
    }

    private func ledger() -> ConvoHopNotificationLedger {
        let suite = "com.convohop.tests.\(uuid())"
        addTeardownBlock { UserDefaults.standard.removePersistentDomain(forName: suite) }
        return ConvoHopNotificationLedger(suiteName: suite)
    }

    func testOpensTheMessage() async throws {
        let h = try await Harness.make()
        let messageId = uuid()
        let target = try h.client.handleNotification(payload(messageId: messageId))
        guard case .message(let conversation, let routed)? = target else {
            return XCTFail("Expected a message target, got \(String(describing: target))")
        }
        XCTAssertEqual(conversation.conversationId, TestIDs.conversation)
        XCTAssertEqual(routed, messageId)
        XCTAssertEqual(target?.conversation.conversationId, TestIDs.conversation)
    }

    func testIgnoresOtherProjectsAndUsers() async throws {
        let h = try await Harness.make()
        XCTAssertNil(try h.client.handleNotification(payload(projectId: TestIDs.otherProject)))
        XCTAssertNil(try h.client.handleNotification(payload(recipientId: TestIDs.otherPrincipal)))
    }

    func testIgnoresOtherPushesAndUnsupportedEvents() async throws {
        let h = try await Harness.make()
        XCTAssertNil(try h.client.handleNotification(["aps": ["alert": "Hello"] as [String: Any]]))
        XCTAssertNil(try h.client.handleNotification(payload(eventType: "notification.future")))
    }

    func testRejectsMalformedPayloads() async throws {
        let h = try await Harness.make()
        var malformed = payload()
        var fields = try XCTUnwrap(malformed["convohop"] as? [String: Any])
        fields["eventId"] = "not-a-uuid"
        malformed["convohop"] = fields
        XCTAssertThrowsError(try h.client.handleNotification(malformed)) { error in
            XCTAssertEqual(error as? ConvoHopPushPayloadError, .invalidField("eventId"))
        }
    }

    func testTheLedgerDropsRepeatedDeliveries() async throws {
        let h = try await Harness.make()
        let ledger = ledger()
        let push = payload()
        XCTAssertNotNil(try h.client.handleNotification(push, ledger: ledger))
        XCTAssertNil(try h.client.handleNotification(push, ledger: ledger))
        XCTAssertNotNil(try h.client.handleNotification(push), "Taps route without a ledger")
        XCTAssertNotNil(try h.client.handleNotification(payload(), ledger: ledger))
    }
}
