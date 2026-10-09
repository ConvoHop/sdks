import Foundation
import XCTest

@testable import ConvoHop

// Replay and realtime delivery of ConversationStream, driven by a scripted authority, fake sockets and a manual clock.

private let cursorKey = "convohop.cursor:\(TestIDs.project):\(TestIDs.principal):\(TestIDs.conversation)"

/// One conversation's event log. It answers `communication.events` and builds realtime pages.
private final class EventLog: @unchecked Sendable {
    let conversationId: String
    private let lock = NSLock()
    private var log: [JSONValue] = []
    private let pageSize: Int

    init(events: Int = 0, pageSize: Int = 100, conversationId: String = TestIDs.conversation) {
        self.conversationId = conversationId
        self.pageSize = pageSize
        append(events)
    }

    /// Adds `count` events after the latest one.
    func append(_ count: Int) {
        lock.locked {
            let first = log.count + 1
            log += (first..<(first + count)).map { Fixture.event(conversationId, String($0)) }
        }
    }

    /// The logged events with sequences in `range`.
    func events(_ range: ClosedRange<Int>) -> [JSONValue] {
        lock.locked { Array(log[(range.lowerBound - 1)..<range.upperBound]) }
    }

    /// The history page after sequence `after`, as the authority serves it.
    func page(after: Int) -> JSONValue {
        lock.locked {
            let end = min(after + pageSize, log.count)
            let items = end > after ? Array(log[after..<end]) : []
            return Self.page(items, complete: end >= log.count, next: max(end, after), conversationId: conversationId)
        }
    }

    /// Answers `communication.events` from the log.
    func serve(_ http: StubHTTP) async {
        await http.on("communication.events") { request in
            Reply.ok(request, ["result": self.page(after: Self.after(request) ?? 0)])
        }
    }

    /// The `after` sequence of an events request.
    static func after(_ request: RecordedRequest) -> Int? {
        request.input?["after"]?.objectValue?["sequence"]?.stringValue.flatMap { Int($0) }
    }

    static func page(
        _ items: [JSONValue], complete: Bool = true, refreshRequired: Bool = false, next: Int,
        conversationId: String = TestIDs.conversation
    ) -> JSONValue {
        Fixture.full("EventPage", [
            "items": .array(items), "complete": .bool(complete), "refreshRequired": .bool(refreshRequired),
            "nextCursor": cursor(next, conversationId: conversationId),
        ])
    }

    static func cursor(
        _ sequence: Int, conversationId: String = TestIDs.conversation, incarnation: String = TestIDs.incarnation
    ) -> JSONValue {
        Fixture.full("Cursor", [
            "incarnation": .string(incarnation), "conversationId": .string(conversationId),
            "sequence": .string(String(sequence)),
        ])
    }
}

private struct AppFailure: Error {}

/// What a stream delivered to the app.
private final class Delivery: @unchecked Sendable {
    private let applied = Shared<[String]>([])
    private let reported = Shared<[any Error]>([])
    /// `apply` throws this while it's set.
    let failure = Shared<(any Error)?>(nil)
    /// `apply` waits while this is `true`.
    let held = Shared(false)

    /// The sequences `apply` received, in order.
    var sequences: [String] { applied.value }
    var errors: [any Error] { reported.value }
    var problems: [ConvoHopError] { errors.compactMap { $0 as? ConvoHopError } }

    func apply(_ events: [Event]) async throws {
        while held.value { try await Task.sleep(nanoseconds: 1_000_000) }
        if let failure = failure.value { throw failure }
        applied.update { $0 += events.map(\.sequence) }
    }

    func report(_ error: any Error) {
        reported.update { $0.append(error) }
    }

    func watch(_ client: ConvoHopClient) async throws -> ConversationStream {
        try await client.watch(
            TestIDs.conversation, apply: { try await self.apply($0) }, onError: { self.report($0) })
    }

    func resync(_ client: ConvoHopClient) async throws -> ConversationStream {
        try await client.resyncAuthorizedHistory(
            TestIDs.conversation, apply: { try await self.apply($0) }, onError: { self.report($0) })
    }
}

/// Recovery storage whose cursor reads or writes fail on demand.
private actor FlakyStorage: RecoveryStorage {
    struct Unavailable: Error {}

    private var values: [String: String] = [:]
    private var failsReads = false
    private var failsWrites = false

    func failCursorReads() { failsReads = true }
    func failCursorWrites() { failsWrites = true }

    func value(forKey key: String) throws -> String? {
        if failsReads && key.hasPrefix("convohop.cursor:") { throw Unavailable() }
        return values[key]
    }

    func setValue(_ value: String, forKey key: String) throws {
        if failsWrites && key.hasPrefix("convohop.cursor:") { throw Unavailable() }
        values[key] = value
    }

    func removeValue(forKey key: String) {
        values[key] = nil
    }
}

/// A client that keeps its recovery state in `storage`, and its fakes.
private func client(
    storage: any RecoveryStorage
) async throws -> (client: ConvoHopClient, http: StubHTTP, sockets: FakeWebSocketFactory) {
    let clock = TestClock()
    let http = StubHTTP()
    await http.on("communication.route") { request in
        Reply.ok(request, ["result": Fixture.route(now: clock.now)], now: clock.now)
    }
    let sockets = FakeWebSocketFactory()
    let configuration = ConvoHopConfiguration(
        baseURL: URL(string: Fixture.baseURL)!, projectId: TestIDs.project, principalId: TestIDs.principal,
        incarnation: TestIDs.incarnation, sessionToken: "user-token", recoveryStorage: storage, httpClient: http,
        webSocketFactory: sockets)
    return (try ConvoHopClient(configuration: configuration, environment: clock.environment), http, sockets)
}

/// The subscription a stream opened.
private struct Subscription {
    let id: String
    let message: JSONObject

    var variables: JSONObject? { message["payload"]?.objectValue?["variables"]?.objectValue }
    var input: JSONObject? { variables?["input"]?.objectValue }
}

/// Opens `socket`, acknowledges the connection and returns the subscription the stream sent.
private func subscribe(_ socket: FakeWebSocket, _ stream: ConversationStream) async throws -> Subscription {
    let before = socket.sentMessages.count
    socket.open()
    try await eventually("connection_init") { socket.sentMessages.count > before }
    socket.receive(["type": "connection_ack"])
    try await eventually("subscription") { await stream.isConnected }
    let message = try XCTUnwrap(socket.sentMessages.last { $0["type"]?.stringValue == "subscribe" })
    return Subscription(id: try XCTUnwrap(message["id"]?.stringValue), message: message)
}

/// A realtime frame that carries `page`.
private func next(_ subscriptionId: String, _ page: JSONValue) -> JSONValue {
    ["type": "next", "id": .string(subscriptionId), "payload": ["data": ["conversationEvents": page]]]
}

/// A GraphQL error as realtime frames carry it.
private func problem(_ code: String, status: Int?, retryAfter: Int? = nil) -> JSONValue {
    var extensions: JSONObject = ["code": .string(code), "requestId": .string(uuid()), "outcome": "rejected"]
    if let status { extensions["status"] = .number(Double(status)) }
    if let retryAfter { extensions["retryAfter"] = .number(Double(retryAfter)) }
    return ["message": "Denied", "extensions": .object(extensions)]
}

private func storedCursor(_ storage: InMemoryRecoveryStorage) async throws -> Cursor? {
    guard let text = await storage.value(forKey: cursorKey) else { return nil }
    return try ProtocolChecks.cursor(try JSONParser.parse(text))
}

private func cursor(_ sequence: String) -> Cursor {
    Cursor(incarnation: TestIDs.incarnation, conversationId: TestIDs.conversation, sequence: sequence)
}

final class ConversationStreamReplayTests: XCTestCase {
    func testReplaysHistoryAndStoresTheCursorBeforeGoingLive() async throws {
        let h = try await Harness.make()
        await EventLog(events: 3).serve(h.http)
        let delivery = Delivery()
        let stream = try await delivery.watch(h.client)

        XCTAssertEqual(delivery.sequences, ["1", "2", "3"])
        let requests = await h.http.requests("communication.events")
        XCTAssertEqual(requests.count, 1)
        XCTAssertEqual(requests.first?.input?["conversationId"]?.stringValue, TestIDs.conversation)
        XCTAssertEqual(requests.first?.input?["limit"]?.numberValue, 100)
        XCTAssertNil(requests.first.flatMap { EventLog.after($0) }, "A new replay starts at the beginning")
        let current = await stream.cursor
        XCTAssertEqual(current, cursor("3"))
        let stored = try await storedCursor(h.storage)
        XCTAssertEqual(stored, cursor("3"))

        let socket = try await h.sockets.connection(0)
        XCTAssertEqual(socket.url.absoluteString, "wss://api.convohop.test/graphql")
        XCTAssertEqual(socket.subprotocol, "graphql-transport-ws")
        let connected = await stream.isConnected
        XCTAssertFalse(connected, "The stream is connected only once the subscription is acknowledged")
        XCTAssertTrue(delivery.errors.isEmpty)
        await stream.close()
    }

    func testResumesFromTheStoredCursorAfterARelaunch() async throws {
        let first = try await Harness.make()
        let log = EventLog(events: 3)
        await log.serve(first.http)
        let original = try await Delivery().watch(first.client)
        await original.close()

        log.append(2)
        let relaunched = try await Harness.make(clock: first.clock, storage: first.storage)
        await log.serve(relaunched.http)
        let delivery = Delivery()
        let stream = try await delivery.watch(relaunched.client)

        XCTAssertEqual(delivery.sequences, ["4", "5"])
        let requests = await relaunched.http.requests("communication.events")
        XCTAssertEqual(requests.first?.input?["after"], EventLog.cursor(3))
        let stored = try await storedCursor(relaunched.storage)
        XCTAssertEqual(stored, cursor("5"))
        await stream.close()
    }

    func testRejectsAStoredCursorItCannotTrustWithoutRequestingHistory() async throws {
        let untrusted = [
            "{not json",
            EventLog.cursor(3, conversationId: uuid()).jsonText(),
            EventLog.cursor(3, incarnation: uuid()).jsonText(),
            #"{"incarnation":"\#(TestIDs.incarnation)","conversationId":"\#(TestIDs.conversation)","sequence":"03"}"#,
        ]
        for saved in untrusted {
            let h = try await Harness.make()
            await EventLog(events: 1).serve(h.http)
            await h.storage.setValue(saved, forKey: cursorKey)
            let error = await convoHopError { try await Delivery().watch(h.client) }
            XCTAssertEqual(error?.code, .recoveryStorageFailure, saved)
            XCTAssertEqual(error?.outcome, .rejected, saved)
            let requested = await h.http.count("communication.events")
            XCTAssertEqual(requested, 0, saved)
            XCTAssertTrue(h.sockets.connections.isEmpty, saved)
            let kept = await h.storage.value(forKey: cursorKey)
            XCTAssertEqual(kept, saved, "The SDK never resets a cursor silently")
        }
    }

    func testReportsUnreadableCursorStorageWithoutRequestingHistory() async throws {
        let storage = FlakyStorage()
        await storage.failCursorReads()
        let fakes = try await client(storage: storage)
        await EventLog(events: 1).serve(fakes.http)
        let error = await convoHopError { try await Delivery().watch(fakes.client) }
        XCTAssertEqual(error?.code, .recoveryStorageFailure)
        XCTAssertEqual(error?.outcome, .rejected)
        let requested = await fakes.http.count("communication.events")
        XCTAssertEqual(requested, 0)
        XCTAssertTrue(fakes.sockets.connections.isEmpty)
    }

    func testReportsACursorThatCouldNotBeStored() async throws {
        let storage = FlakyStorage()
        await storage.failCursorWrites()
        let fakes = try await client(storage: storage)
        await EventLog(events: 2).serve(fakes.http)
        let delivery = Delivery()
        let error = await convoHopError { try await delivery.watch(fakes.client) }
        XCTAssertEqual(error?.code, .recoveryStorageFailure)
        XCTAssertEqual(error?.outcome, .unknown)
        XCTAssertEqual(delivery.sequences, ["1", "2"], "The batch was applied; it may arrive again after a restart")
        XCTAssertTrue(fakes.sockets.connections.isEmpty)
    }

    func testAnApplicationErrorStopsReplayWithoutAdvancing() async throws {
        let h = try await Harness.make()
        await EventLog(events: 2).serve(h.http)
        let delivery = Delivery()
        delivery.failure.update { $0 = AppFailure() }
        let error = await thrownError { try await delivery.watch(h.client) }
        XCTAssertTrue(error is AppFailure, "\(String(describing: error))")
        let stored = await h.storage.value(forKey: cursorKey)
        XCTAssertNil(stored)
        XCTAssertTrue(h.sockets.connections.isEmpty)
    }

    func testBoundsEachRoundAndPacesTheNext() async throws {
        let h = try await Harness.make()
        await EventLog(events: 12, pageSize: 1).serve(h.http)
        let delivery = Delivery()
        let stream = try await delivery.watch(h.client)

        XCTAssertEqual(delivery.sequences, (1...10).map { String($0) })
        var requested = await h.http.count("communication.events")
        XCTAssertEqual(requested, 10)
        XCTAssertTrue(h.sockets.connections.isEmpty, "The stream goes live only once it caught up")
        try await eventually("pace timer") { h.clock.deadlines == [h.clock.now + 250] }

        h.clock.advance(by: 250)
        _ = try await h.sockets.connection(0)
        XCTAssertEqual(delivery.sequences, (1...12).map { String($0) })
        requested = await h.http.count("communication.events")
        XCTAssertEqual(requested, 12)
        let current = await stream.cursor
        XCTAssertEqual(current, cursor("12"))
        await stream.close()
    }

    func testReconcileReportsWhenHistoryRemains() async throws {
        let h = try await Harness.make()
        await EventLog(events: 25, pageSize: 1).serve(h.http)
        let delivery = Delivery()
        let stream = try await delivery.watch(h.client)
        XCTAssertEqual(delivery.sequences.count, 10)

        let error = await thrownError { try await stream.reconcile() }
        XCTAssertEqual(error as? ConvoHopReplayError, .workLimitReached)
        XCTAssertEqual(delivery.sequences.count, 20)

        try await stream.reconcile()
        XCTAssertEqual(delivery.sequences, (1...25).map { String($0) })
        await stream.close()
        try await eventually("paced round cancelled") { h.clock.pendingSleeps == 0 }
    }

    func testRejectsAnIncompletePageThatDoesNotAdvance() async throws {
        let h = try await Harness.make()
        let log = EventLog(events: 2)
        await h.http.on("communication.events") { request in
            let page =
                EventLog.after(request) == nil
                ? EventLog.page(log.events(1...2), complete: false, next: 2)
                : EventLog.page([], complete: false, next: 2)
            return Reply.ok(request, ["result": page])
        }
        let delivery = Delivery()
        let error = await convoHopError { try await delivery.watch(h.client) }
        XCTAssertEqual(error?.code, .invalidResponse)
        XCTAssertEqual(delivery.sequences, ["1", "2"])
        let requested = await h.http.count("communication.events")
        XCTAssertEqual(requested, 2)
        XCTAssertTrue(h.sockets.connections.isEmpty)
    }

    func testRejectsHistoryOutsideTheReplayScope() async throws {
        let pages: [(String, JSONValue)] = [
            ("another conversation", EventLog.page([Fixture.event(uuid(), "1")], next: 1)),
            ("a frontier behind the events", EventLog.page([Fixture.event(TestIDs.conversation, "2")], next: 1)),
            ("unordered events", EventLog.page(
                [Fixture.event(TestIDs.conversation, "2"), Fixture.event(TestIDs.conversation, "1")], next: 2)),
            ("a repeated event", EventLog.page(
                [Fixture.event(TestIDs.conversation, "1"), Fixture.event(TestIDs.conversation, "1")], next: 1)),
            ("another incarnation", Fixture.full("EventPage", [
                "items": [], "complete": true, "refreshRequired": false,
                "nextCursor": EventLog.cursor(1, incarnation: uuid()),
            ])),
        ]
        for (name, page) in pages {
            let h = try await Harness.make()
            await h.http.on("communication.events") { request in Reply.ok(request, ["result": page]) }
            let delivery = Delivery()
            let error = await convoHopError { try await delivery.watch(h.client) }
            XCTAssertEqual(error?.code, .invalidResponse, name)
            XCTAssertTrue(delivery.sequences.isEmpty, name)
            let stored = await h.storage.value(forKey: cursorKey)
            XCTAssertNil(stored, name)
        }
    }

    func testRefreshRequiredWaitsForAnExplicitResync() async throws {
        let h = try await Harness.make()
        let log = EventLog(events: 3)
        await h.storage.setValue(EventLog.cursor(2).jsonText(), forKey: cursorKey)
        await h.http.on("communication.events") { request in
            guard EventLog.after(request) == nil else {
                return Reply.ok(request, ["result": EventLog.page([], refreshRequired: true, next: 2)])
            }
            return Reply.ok(request, ["result": log.page(after: 0)])
        }
        await h.http.on("communication.getConversation") { request in
            Reply.ok(request, [
                "result": Fixture.full("Conversation", [
                    "conversationId": .string(TestIDs.conversation), "revision": "1", "title": "General",
                    "latestSequence": "3",
                ])
            ])
        }
        let delivery = Delivery()
        let error = await thrownError { try await delivery.watch(h.client) }
        XCTAssertEqual(error as? ConvoHopReplayError, .resyncRequired)
        XCTAssertTrue(delivery.sequences.isEmpty)
        var stored = try await storedCursor(h.storage)
        XCTAssertEqual(stored, cursor("2"), "The cursor is kept until the app resynchronizes")

        let resynced = Delivery()
        let stream = try await resynced.resync(h.client)
        XCTAssertEqual(resynced.sequences, ["1", "2", "3"])
        let lookups = await h.http.count("communication.getConversation")
        XCTAssertEqual(lookups, 1, "Resynchronization checks access to the conversation first")
        let requests = await h.http.requests("communication.events")
        XCTAssertEqual(requests.map { EventLog.after($0) }, [2, nil])
        stored = try await storedCursor(h.storage)
        XCTAssertEqual(stored, cursor("3"))
        _ = try await h.sockets.connection(0)
        await stream.close()
    }
}

final class ConversationStreamRealtimeTests: XCTestCase {
    func testSubscribesFromTheAppliedCursorAfterTheAcknowledgement() async throws {
        let h = try await Harness.make()
        await EventLog(events: 2).serve(h.http)
        let stream = try await Delivery().watch(h.client)
        let socket = try await h.sockets.connection(0)

        socket.open()
        try await eventually("connection_init") { !socket.sentMessages.isEmpty }
        let initial = try XCTUnwrap(socket.sentMessages.first)
        XCTAssertEqual(initial["type"]?.stringValue, "connection_init")
        let credentials: JSONValue = [
            "projectId": .string(TestIDs.project), "incarnation": .string(TestIDs.incarnation), "token": "user-token",
        ]
        XCTAssertEqual(initial["payload"], credentials)
        XCTAssertEqual(socket.sentMessages.count, 1, "It subscribes only after the acknowledgement")

        socket.receive(["type": "connection_ack"])
        try await eventually("subscription") { await stream.isConnected }
        let subscription = try XCTUnwrap(socket.sentMessages.last)
        XCTAssertEqual(subscription["type"]?.stringValue, "subscribe")
        XCTAssertTrue(ProtocolChecks.isCanonicalUUID(subscription["id"]?.stringValue ?? ""))
        let payload = subscription["payload"]?.objectValue
        let operation = ConvoHopOperations.communicationConversationEvents.descriptor
        XCTAssertEqual(payload?["operationName"]?.stringValue, operation.operationName)
        XCTAssertEqual(payload?["query"]?.stringValue, operation.document)
        let context = payload?["variables"]?.objectValue?["context"]?.objectValue
        XCTAssertEqual(context?["projectId"]?.stringValue, TestIDs.project)
        XCTAssertEqual(context?["incarnation"]?.stringValue, TestIDs.incarnation)
        XCTAssertEqual(context?["observedServingEpoch"]?.stringValue, "1")
        XCTAssertTrue(ProtocolChecks.isCanonicalUUID(context?["requestId"]?.stringValue ?? ""))
        let input: JSONValue = [
            "conversationId": .string(TestIDs.conversation), "limit": 50, "after": EventLog.cursor(2),
        ]
        XCTAssertEqual(payload?["variables"]?.objectValue?["input"], input)

        await stream.close()
        XCTAssertEqual(socket.closedByClient, 1000)
        let connected = await stream.isConnected
        XCTAssertFalse(connected)
    }

    func testAppliesRealtimePagesOnceAndInOrder() async throws {
        let h = try await Harness.make()
        let log = EventLog(events: 2)
        await log.serve(h.http)
        let delivery = Delivery()
        let stream = try await delivery.watch(h.client)
        let socket = try await h.sockets.connection(0)
        let subscription = try await subscribe(socket, stream)

        log.append(4)
        socket.receive(next(subscription.id, EventLog.page(log.events(3...4), next: 4)))
        try await eventually("first page") { delivery.sequences.count == 4 }
        // A page that repeats applied events delivers only the new ones.
        socket.receive(next(subscription.id, EventLog.page(log.events(3...5), next: 5)))
        try await eventually("overlapping page") { delivery.sequences.count == 5 }
        // A page behind the cursor is skipped.
        socket.receive(next(subscription.id, EventLog.page(log.events(4...4), next: 4)))
        socket.receive(next(subscription.id, EventLog.page(log.events(6...6), next: 6)))
        try await eventually("last page") { delivery.sequences.count >= 6 }

        XCTAssertEqual(delivery.sequences, ["1", "2", "3", "4", "5", "6"])
        let stored = try await storedCursor(h.storage)
        XCTAssertEqual(stored, cursor("6"))
        XCTAssertTrue(delivery.errors.isEmpty)
        await stream.close()
    }

    func testAnswersPings() async throws {
        let h = try await Harness.make()
        await EventLog().serve(h.http)
        let stream = try await Delivery().watch(h.client)
        let socket = try await h.sockets.connection(0)
        _ = try await subscribe(socket, stream)

        socket.receive(["type": "ping"])
        try await eventually("pong") { socket.sentMessages.last?["type"]?.stringValue == "pong" }
        await stream.close()
    }

    func testFillsTheGapFromHistoryBeforeResubscribing() async throws {
        let h = try await Harness.make()
        let log = EventLog(events: 2)
        await log.serve(h.http)
        let delivery = Delivery()
        let stream = try await delivery.watch(h.client)
        let first = try await h.sockets.connection(0)
        _ = try await subscribe(first, stream)

        first.fail()
        try await eventually("reconnect timer") { h.clock.pendingSleeps == 1 }
        XCTAssertEqual(h.clock.deadlines, [h.clock.now + 1000])
        let problem = try XCTUnwrap(delivery.problems.first)
        XCTAssertEqual(problem.code, .transportUnknown)
        XCTAssertEqual(problem.outcome, .unknown)
        XCTAssertNil(problem.status)
        let connected = await stream.isConnected
        XCTAssertFalse(connected)

        log.append(2)
        h.clock.advance(by: 1000)
        let second = try await h.sockets.connection(1)
        XCTAssertEqual(delivery.sequences, ["1", "2", "3", "4"])
        let routes = await h.http.count("communication.route")
        XCTAssertEqual(routes, 2, "The route is checked again before reconnecting")
        let requests = await h.http.requests("communication.events")
        XCTAssertEqual(requests.map { EventLog.after($0) }, [nil, 2])
        let resumed = try await subscribe(second, stream)
        XCTAssertEqual(resumed.input?["after"], EventLog.cursor(4))
        XCTAssertEqual(delivery.errors.count, 1)
        await stream.close()
    }

    func testBacksOffUntilAConnectionIsAcknowledged() async throws {
        let h = try await Harness.make()
        await EventLog(events: 1).serve(h.http)
        let stream = try await Delivery().watch(h.client)
        _ = try await subscribe(try await h.sockets.connection(0), stream)

        var delays: [Int] = []
        for index in 0..<6 {
            try await h.sockets.connection(index).fail()
            try await eventually("reconnect \(index)") { h.clock.pendingSleeps == 1 }
            let delay = try XCTUnwrap(h.clock.deadlines.first) - h.clock.now
            delays.append(delay)
            h.clock.advance(by: delay)
        }
        XCTAssertEqual(delays, [1000, 2000, 4000, 8000, 10_000, 10_000])

        let acknowledged = try await h.sockets.connection(6)
        _ = try await subscribe(acknowledged, stream)
        acknowledged.fail()
        try await eventually("reset backoff") { h.clock.pendingSleeps == 1 }
        XCTAssertEqual(h.clock.deadlines, [h.clock.now + 1000])
        await stream.close()
    }

    func testStopsWhenTheAuthorityEndsRealtimeAuthorization() async throws {
        for code in [4400, 4401, 4403, 4408, 4409] {
            let h = try await Harness.make()
            await EventLog(events: 1).serve(h.http)
            let delivery = Delivery()
            let stream = try await delivery.watch(h.client)
            let socket = try await h.sockets.connection(0)
            _ = try await subscribe(socket, stream)

            socket.deliver(.closed(code: code))
            try await eventually("closed by \(code)") { await stream.isClosed }
            XCTAssertEqual(delivery.problems.first?.code, .unauthenticated, "\(code)")
            XCTAssertEqual(delivery.problems.first?.status, 401, "\(code)")
            XCTAssertEqual(h.clock.pendingSleeps, 0, "\(code)")
            XCTAssertEqual(h.sockets.connections.count, 1, "\(code)")
        }
    }

    func testASpendStopCloseEndsTheStreamWithA402AndNeverReconnects() async throws {
        let stops: [(Int, String, ConvoHopErrorCode, String)] = [
            (4402, "SPEND_CAP_REACHED meter=mau", .spendCapReached, "SPEND_CAP_REACHED meter=mau"),
            (4402, "CREDITS_EXHAUSTED meter=messages", .creditsExhausted, "CREDITS_EXHAUSTED meter=messages"),
            // The reason's code decides, whatever the close code.
            (4000, "  SPEND_CAP_REACHED   meter=mau ", .spendCapReached, "SPEND_CAP_REACHED meter=mau"),
            (4402, "CREDITS_EXHAUSTED meter=", .creditsExhausted, "CREDITS_EXHAUSTED meter="),
        ]
        for (closeCode, reason, code, words) in stops {
            let h = try await Harness.make()
            await EventLog(events: 1).serve(h.http)
            let delivery = Delivery()
            let stream = try await delivery.watch(h.client)
            let socket = try await h.sockets.connection(0)
            let subscription = try await subscribe(socket, stream)

            socket.deliver(.closed(code: closeCode, reason: reason))
            try await eventually("closed by \(reason)") { await stream.isClosed }
            XCTAssertEqual(delivery.errors.count, 1, reason)
            let problem = try XCTUnwrap(delivery.problems.first, reason)
            XCTAssertEqual(problem.code, code, reason)
            XCTAssertEqual(problem.status, 402, reason)
            XCTAssertEqual(problem.outcome, .rejected, reason)
            XCTAssertEqual(problem.requestId, subscription.id, reason)
            XCTAssertNil(problem.retryAfter, reason)
            XCTAssertEqual(problem.message, "Realtime connection closed: \(words)", reason)
            XCTAssertEqual(h.clock.pendingSleeps, 0, reason)
            XCTAssertEqual(h.sockets.connections.count, 1, reason)
        }
    }

    func testACloseWhoseReasonNamesNoSpendCodeReconnectsAfterTheBackoff() async throws {
        let closes: [(Int, String)] = [
            (4402, ""), (4402, "Payment required"), (4402, "spend_cap_reached meter=mau"),
            (4402, "SPEND_CAP_REACHEDX meter=mau"), (4503, ""), (4503, "MAINTENANCE window=1"),
        ]
        for (closeCode, reason) in closes {
            let name = "\(closeCode) \"\(reason)\""
            let h = try await Harness.make()
            await EventLog(events: 1).serve(h.http)
            let delivery = Delivery()
            let stream = try await delivery.watch(h.client)
            let first = try await h.sockets.connection(0)
            _ = try await subscribe(first, stream)

            first.deliver(.closed(code: closeCode, reason: reason))
            try await eventually("reconnect timer after \(name)") { h.clock.pendingSleeps == 1 }
            XCTAssertEqual(h.clock.deadlines, [h.clock.now + 1000], name)
            // The SDK never invents a spend code the authority didn't send.
            XCTAssertTrue(delivery.errors.isEmpty, name)
            h.clock.advance(by: 1000)
            _ = try await h.sockets.connection(1)
            let closed = await stream.isClosed
            XCTAssertFalse(closed, name)
            await stream.close()
        }
    }

    func testUnverifiedSpendReconnectsNoSoonerThanItsRetryAfter() async throws {
        let h = try await Harness.make()
        await EventLog(events: 1).serve(h.http)
        let delivery = Delivery()
        let stream = try await delivery.watch(h.client)
        let first = try await h.sockets.connection(0)
        let subscription = try await subscribe(first, stream)

        first.deliver(.closed(code: 4503, reason: "SPEND_UNVERIFIED retryAfter=30 meter=mau"))
        try await eventually("reconnect timer") { h.clock.pendingSleeps == 1 }
        XCTAssertEqual(h.clock.deadlines, [h.clock.now + 30_000])
        let unverified = try XCTUnwrap(delivery.problems.first)
        XCTAssertEqual(unverified.code, .spendUnverified)
        XCTAssertEqual(unverified.status, 503)
        XCTAssertEqual(unverified.outcome, .rejected)
        XCTAssertEqual(unverified.requestId, subscription.id)
        XCTAssertEqual(unverified.retryAfter, 30)
        XCTAssertEqual(unverified.message, "Realtime connection closed: SPEND_UNVERIFIED retryAfter=30 meter=mau")
        let closed = await stream.isClosed
        XCTAssertFalse(closed)

        h.clock.advance(by: 30_000)
        let second = try await h.sockets.connection(1)
        _ = try await subscribe(second, stream)
        second.deliver(.closed(code: 4503, reason: "SPEND_UNVERIFIED meter=mau"))
        try await eventually("usual backoff") { h.clock.pendingSleeps == 1 }
        XCTAssertNil(delivery.problems.last?.retryAfter, "The SDK never invents a retryAfter")
        XCTAssertEqual(h.clock.deadlines, [h.clock.now + 1000])

        h.clock.advance(by: 1000)
        let third = try await h.sockets.connection(2)
        _ = try await subscribe(third, stream)
        third.deliver(.closed(code: 4402, reason: "SPEND_UNVERIFIED retryAfter=400 meter=mau"))
        try await eventually("long wait") { h.clock.pendingSleeps == 1 }
        XCTAssertEqual(delivery.problems.last?.status, 503, "The reason's code decides, whatever the close code")
        XCTAssertEqual(h.clock.deadlines, [h.clock.now + 400_000], "The 10 s backoff ceiling doesn't shorten it")
        XCTAssertEqual(delivery.problems.count, 3)
        XCTAssertEqual(h.sockets.connections.count, 3)
        await stream.close()
    }

    func testAnErrorFramesRetryAfterDelaysTheReconnectAndASpendStopEndsTheStream() async throws {
        let h = try await Harness.make()
        await EventLog(events: 1).serve(h.http)
        let delivery = Delivery()
        let stream = try await delivery.watch(h.client)
        let first = try await h.sockets.connection(0)
        let subscription = try await subscribe(first, stream)

        first.receive([
            "type": "error", "id": .string(subscription.id),
            "payload": [problem("SPEND_UNVERIFIED", status: 503, retryAfter: 20)],
        ])
        try await eventually("authority wait") { h.clock.pendingSleeps == 1 }
        XCTAssertEqual(h.clock.deadlines, [h.clock.now + 20_000])
        XCTAssertEqual(delivery.problems.last?.code, .spendUnverified)
        XCTAssertEqual(delivery.problems.last?.retryAfter, 20)
        XCTAssertEqual(first.closedByClient, 4000)

        h.clock.advance(by: 20_000)
        let second = try await h.sockets.connection(1)
        let moved = try await subscribe(second, stream)
        second.receive([
            "type": "error", "id": .string(moved.id), "payload": [problem("WRONG_REGION", status: nil, retryAfter: 15)],
        ])
        try await eventually("region wait") { h.clock.pendingSleeps == 1 }
        XCTAssertEqual(h.clock.deadlines, [h.clock.now + 15_000], "A terminal WRONG_REGION also honors retryAfter")
        XCTAssertEqual(delivery.problems.last?.code, .wrongRegion)

        h.clock.advance(by: 15_000)
        let third = try await h.sockets.connection(2)
        let stopped = try await subscribe(third, stream)
        third.receive([
            "type": "next", "id": .string(stopped.id),
            "payload": ["errors": [problem("CREDITS_EXHAUSTED", status: 402)]],
        ])
        try await eventually("closed") { await stream.isClosed }
        XCTAssertEqual(delivery.problems.last?.code, .creditsExhausted)
        XCTAssertEqual(delivery.problems.last?.status, 402)
        XCTAssertNil(delivery.problems.last?.retryAfter)
        XCTAssertEqual(h.clock.pendingSleeps, 0)
        XCTAssertEqual(h.sockets.connections.count, 3)
    }

    func testResubscribesWhenTheAuthorityCompletesTheSubscription() async throws {
        let h = try await Harness.make()
        await EventLog(events: 1).serve(h.http)
        let delivery = Delivery()
        let stream = try await delivery.watch(h.client)
        let socket = try await h.sockets.connection(0)
        let subscription = try await subscribe(socket, stream)

        socket.receive(["type": "complete", "id": .string(subscription.id)])
        try await eventually("reconnect timer") { h.clock.pendingSleeps == 1 }
        XCTAssertEqual(socket.closedByClient, 4000)
        XCTAssertEqual(delivery.problems.first?.code, .authorityUnavailable)
        XCTAssertEqual(delivery.problems.first?.status, 503)
        let closed = await stream.isClosed
        XCTAssertFalse(closed)

        h.clock.advance(by: 1000)
        let resumed = try await subscribe(try await h.sockets.connection(1), stream)
        XCTAssertEqual(resumed.input?["after"], EventLog.cursor(1))
        await stream.close()
    }

    func testClosesOnFramesOutsideTheProtocol() async throws {
        let frames: [(String, @Sendable (FakeWebSocket, String) -> Void)] = [
            ("binary", { socket, _ in socket.deliver(.binary(Data([1]))) }),
            ("not JSON", { socket, _ in socket.deliver(.text("{")) }),
            ("unknown subscription", { socket, _ in socket.receive(next(uuid(), EventLog.page([], next: 1))) }),
            ("another conversation", { socket, id in
                socket.receive(next(id, EventLog.page([], next: 1, conversationId: uuid())))
            }),
            ("no page", { socket, id in socket.receive(["type": "next", "id": .string(id), "payload": ["data": [:]]]) }),
        ]
        for (name, send) in frames {
            let h = try await Harness.make()
            await EventLog(events: 1).serve(h.http)
            let delivery = Delivery()
            let stream = try await delivery.watch(h.client)
            let socket = try await h.sockets.connection(0)
            let subscription = try await subscribe(socket, stream)

            send(socket, subscription.id)
            try await eventually(name) { await stream.isClosed }
            XCTAssertEqual(delivery.problems.first?.code, .invalidResponse, name)
            XCTAssertEqual(socket.closedByClient, 1000, name)
            XCTAssertEqual(h.clock.pendingSleeps, 0, name)
            let stored = try await storedCursor(h.storage)
            XCTAssertEqual(stored, cursor("1"), name)
        }
    }

    func testRefusesAnotherSubprotocol() async throws {
        let h = try await Harness.make()
        await EventLog(events: 1).serve(h.http)
        let delivery = Delivery()
        let stream = try await delivery.watch(h.client)
        let socket = try await h.sockets.connection(0)

        socket.deliver(.open(protocol: "graphql-ws"))
        try await eventually("reconnect timer") { h.clock.pendingSleeps == 1 }
        XCTAssertEqual(socket.closedByClient, 1002)
        XCTAssertTrue(socket.sent.isEmpty, "No credentials go over another protocol")
        XCTAssertEqual(delivery.problems.first?.code, .transportUnknown)
        let closed = await stream.isClosed
        XCTAssertFalse(closed)
        await stream.close()
    }

    func testDropsFramesOverTheBudget() async throws {
        let h = try await Harness.make()
        await EventLog(events: 1).serve(h.http)
        let delivery = Delivery()
        let stream = try await delivery.watch(h.client)
        let socket = try await h.sockets.connection(0)
        _ = try await subscribe(socket, stream)

        let ping = #"{"type":"ping"}"#
        socket.deliver(.text(ping + String(repeating: " ", count: 65_536 - ping.utf16.count)))
        try await eventually("pong") { socket.sentMessages.last?["type"]?.stringValue == "pong" }

        socket.deliver(.text(ping + String(repeating: " ", count: 65_537 - ping.utf16.count)))
        try await eventually("reconnect timer") { h.clock.pendingSleeps == 1 }
        XCTAssertEqual(delivery.problems.first?.code, .admissionLimit)
        XCTAssertEqual(delivery.problems.first?.status, 503)
        XCTAssertEqual(socket.closedByClient, 4000)
        await stream.close()
    }

    func testBoundsPagesWaitingForTheApplication() async throws {
        let h = try await Harness.make()
        let log = EventLog(events: 1)
        await log.serve(h.http)
        let delivery = Delivery()
        let stream = try await delivery.watch(h.client)
        let socket = try await h.sockets.connection(0)
        let subscription = try await subscribe(socket, stream)

        delivery.held.update { $0 = true }
        log.append(5)
        for sequence in 2...6 {
            socket.receive(next(subscription.id, EventLog.page(log.events(sequence...sequence), next: sequence)))
        }
        try await eventually("admission limit") { !delivery.problems.isEmpty }
        XCTAssertEqual(delivery.problems.first?.code, .admissionLimit)
        XCTAssertEqual(delivery.problems.first?.status, 503)
        XCTAssertEqual(socket.closedByClient, 4000)

        delivery.held.update { $0 = false }
        try await eventually("reconnect timer") { h.clock.pendingSleeps == 1 }
        h.clock.advance(by: 1000)
        let second = try await h.sockets.connection(1)
        // History resumes from the last stored cursor. The batch in progress when the stream failed may arrive again.
        let requests = await h.http.requests("communication.events")
        XCTAssertEqual(requests.last.flatMap { EventLog.after($0) }, 1)
        XCTAssertEqual(Array(delivery.sequences.suffix(5)), ["2", "3", "4", "5", "6"])
        let resumed = try await subscribe(second, stream)
        XCTAssertEqual(resumed.input?["after"], EventLog.cursor(6))
        await stream.close()
    }

    func testErrorFramesWithoutAStatusEndTheStream() async throws {
        let h = try await Harness.make()
        await EventLog(events: 1).serve(h.http)
        let delivery = Delivery()
        let stream = try await delivery.watch(h.client)
        let socket = try await h.sockets.connection(0)
        let subscription = try await subscribe(socket, stream)

        socket.receive(["type": "error", "id": .string(subscription.id), "payload": [problem("FORBIDDEN", status: nil)]])
        try await eventually("closed") { await stream.isClosed }
        let reported = try XCTUnwrap(delivery.problems.first)
        XCTAssertEqual(reported.code, .forbidden)
        XCTAssertEqual(reported.outcome, .rejected)
        XCTAssertNil(reported.status)
        XCTAssertEqual(h.clock.pendingSleeps, 0)
    }

    func testRetryableErrorFramesReconnect() async throws {
        let errors: [(String, Int?)] = [("RATE_LIMITED", 429), ("AUTHORITY_UNAVAILABLE", 503), ("WRONG_REGION", nil)]
        for (code, status) in errors {
            let h = try await Harness.make()
            await EventLog(events: 1).serve(h.http)
            let delivery = Delivery()
            let stream = try await delivery.watch(h.client)
            let socket = try await h.sockets.connection(0)
            let subscription = try await subscribe(socket, stream)

            socket.receive([
                "type": "next", "id": .string(subscription.id), "payload": ["errors": [problem(code, status: status)]],
            ])
            try await eventually("reconnect after \(code)") { h.clock.pendingSleeps == 1 }
            XCTAssertEqual(delivery.problems.first?.code.rawValue, code)
            XCTAssertEqual(delivery.problems.first?.status, status, code)
            XCTAssertEqual(socket.closedByClient, 4000, code)
            let closed = await stream.isClosed
            XCTAssertFalse(closed, code)
            await stream.close()
        }
    }

    func testRealtimeResyncRequiredEndsTheStreamAndKeepsTheCursor() async throws {
        let h = try await Harness.make()
        await EventLog(events: 2).serve(h.http)
        let delivery = Delivery()
        let stream = try await delivery.watch(h.client)
        let socket = try await h.sockets.connection(0)
        let subscription = try await subscribe(socket, stream)

        socket.receive(next(subscription.id, EventLog.page([], refreshRequired: true, next: 2)))
        try await eventually("closed") { await stream.isClosed }
        XCTAssertEqual(delivery.errors.first as? ConvoHopReplayError, .resyncRequired)
        let stored = try await storedCursor(h.storage)
        XCTAssertEqual(stored, cursor("2"))
        XCTAssertEqual(h.clock.pendingSleeps, 0)
    }

    func testAnApplicationErrorEndsTheStreamWithoutAdvancing() async throws {
        let h = try await Harness.make()
        let log = EventLog(events: 1)
        await log.serve(h.http)
        let delivery = Delivery()
        let stream = try await delivery.watch(h.client)
        let socket = try await h.sockets.connection(0)
        let subscription = try await subscribe(socket, stream)

        delivery.failure.update { $0 = AppFailure() }
        log.append(1)
        socket.receive(next(subscription.id, EventLog.page(log.events(2...2), next: 2)))
        try await eventually("closed") { await stream.isClosed }
        XCTAssertTrue(delivery.errors.first is AppFailure)
        let current = await stream.cursor
        XCTAssertEqual(current, cursor("1"))
        let stored = try await storedCursor(h.storage)
        XCTAssertEqual(stored, cursor("1"))
    }

    func testACursorThatCannotBeStoredEndsTheStream() async throws {
        let storage = FlakyStorage()
        let fakes = try await client(storage: storage)
        let log = EventLog(events: 1)
        await log.serve(fakes.http)
        let delivery = Delivery()
        let stream = try await delivery.watch(fakes.client)
        let socket = try await fakes.sockets.connection(0)
        let subscription = try await subscribe(socket, stream)

        await storage.failCursorWrites()
        log.append(1)
        socket.receive(next(subscription.id, EventLog.page(log.events(2...2), next: 2)))
        try await eventually("closed") { await stream.isClosed }
        XCTAssertEqual(delivery.problems.first?.code, .recoveryStorageFailure)
        XCTAssertEqual(delivery.sequences, ["1", "2"])
        XCTAssertEqual(socket.closedByClient, 1000)
    }

    func testCloseStopsReconnectingAndEndsConnectionChanges() async throws {
        let h = try await Harness.make()
        await EventLog(events: 1).serve(h.http)
        let stream = try await Delivery().watch(h.client)
        let seen = Shared<[Bool]>([])
        let ended = Shared(false)
        let changes = await stream.connectionChanges()
        let observer = Task {
            for await connected in changes { seen.update { $0.append(connected) } }
            ended.update { $0 = true }
        }
        try await eventually("initial state") { seen.value == [false] }

        let socket = try await h.sockets.connection(0)
        _ = try await subscribe(socket, stream)
        try await eventually("connected") { seen.value == [false, true] }
        socket.fail()
        try await eventually("disconnected") { seen.value == [false, true, false] }
        try await eventually("reconnect timer") { h.clock.pendingSleeps == 1 }

        await stream.close()
        try await eventually("changes ended") { ended.value }
        try await eventually("timer cancelled") { h.clock.pendingSleeps == 0 }
        h.clock.advance(by: 60_000)
        XCTAssertEqual(h.sockets.connections.count, 1)

        var late: [Bool] = []
        for await connected in await stream.connectionChanges() { late.append(connected) }
        XCTAssertEqual(late, [false], "A closed stream reports its state and ends")
        observer.cancel()
    }

    // MARK: Reconnect policy

    func testARateLimitCloseReconnectsNoSoonerThanItsRetryAfter() async throws {
        let h = try await Harness.make()
        await EventLog(events: 1).serve(h.http)
        let delivery = Delivery()
        let stream = try await delivery.watch(h.client)
        let socket = try await h.sockets.connection(0)
        _ = try await subscribe(socket, stream)

        socket.deliver(.closed(code: 4429, reason: "RATE_LIMITED retryAfter=4"))
        try await eventually("reconnect timer") { h.clock.pendingSleeps == 1 }
        XCTAssertEqual(h.clock.deadlines, [h.clock.now + 4000])
        let reported = try XCTUnwrap(delivery.problems.first)
        XCTAssertEqual(reported.code, .rateLimited)
        XCTAssertEqual(reported.status, 429)
        XCTAssertEqual(reported.retryAfter, 4)
        let closed = await stream.isClosed
        XCTAssertFalse(closed)

        h.clock.advance(by: 4000)
        let resumed = try await subscribe(try await h.sockets.connection(1), stream)
        XCTAssertEqual(resumed.input?["after"], EventLog.cursor(1))
        await stream.close()
    }

    func testQuotaAndPlanLimitClosesEndTheStream() async throws {
        let closes: [(code: Int, reason: String, problem: ConvoHopErrorCode, status: Int, retryAfter: Int?)] = [
            (4429, "QUOTA_EXCEEDED retryAfter=60 meter=messages", .quotaExceeded, 429, 60),
            (4403, "PLAN_LIMIT_EXCEEDED planLimit=conversations", .planLimitExceeded, 403, nil),
        ]
        for close in closes {
            let h = try await Harness.make()
            await EventLog(events: 1).serve(h.http)
            let delivery = Delivery()
            let stream = try await delivery.watch(h.client)
            let socket = try await h.sockets.connection(0)
            _ = try await subscribe(socket, stream)

            socket.deliver(.closed(code: close.code, reason: close.reason))
            try await eventually("closed by \(close.reason)") { await stream.isClosed }
            XCTAssertEqual(delivery.problems.count, 1, close.reason)
            let reported = try XCTUnwrap(delivery.problems.first)
            XCTAssertEqual(reported.code, close.problem)
            XCTAssertEqual(reported.status, close.status, close.reason)
            XCTAssertEqual(reported.outcome, .rejected, close.reason)
            XCTAssertEqual(reported.retryAfter, close.retryAfter, close.reason)
            XCTAssertEqual(h.clock.pendingSleeps, 0, close.reason)
            h.clock.advance(by: 120_000)
            XCTAssertEqual(h.sockets.connections.count, 1, close.reason)
        }
    }

    func testKeepsReconnectingThroughGatewayErrorsWhileRouting() async throws {
        let h = try await Harness.make()
        await EventLog(events: 1).serve(h.http)
        let delivery = Delivery()
        let stream = try await delivery.watch(h.client)
        let socket = try await h.sockets.connection(0)
        _ = try await subscribe(socket, stream)

        let failures = Shared([502, 504])
        let clock = h.clock
        await h.http.on("communication.route") { request in
            if let status = failures.update({ pending -> Int? in pending.isEmpty ? nil : pending.removeFirst() }) {
                return ConvoHopHTTPResponse(
                    status: status, headers: ["content-type": "text/html"], body: Data("<html>Gateway</html>".utf8))
            }
            return Reply.ok(request, ["result": Fixture.route(now: clock.now)], now: clock.now)
        }
        socket.fail()
        var delays: [Int] = []
        for index in 0..<3 {
            try await eventually("reconnect \(index)") { h.clock.pendingSleeps == 1 }
            let delay = try XCTUnwrap(h.clock.deadlines.first) - h.clock.now
            delays.append(delay)
            h.clock.advance(by: delay)
        }
        let resumed = try await subscribe(try await h.sockets.connection(1), stream)
        XCTAssertEqual(delays, [1000, 2000, 4000])
        XCTAssertEqual(resumed.input?["after"], EventLog.cursor(1))
        XCTAssertEqual(delivery.problems.map(\.code), [.transportUnknown, .invalidResponse, .invalidResponse])
        XCTAssertEqual(delivery.problems.map(\.status), [nil, 502, 504])
        let closed = await stream.isClosed
        XCTAssertFalse(closed)
        await stream.close()
    }

    func testAnErrorFrameDelaysTheReconnectByItsRetryAfterAndAQuotaEndsTheStream() async throws {
        let h = try await Harness.make()
        await EventLog(events: 1).serve(h.http)
        let delivery = Delivery()
        let stream = try await delivery.watch(h.client)
        let first = try await h.sockets.connection(0)
        let subscription = try await subscribe(first, stream)

        first.receive([
            "type": "next", "id": .string(subscription.id),
            "payload": ["errors": [problem("RATE_LIMITED", status: 429, retryAfter: 7)]],
        ])
        try await eventually("reconnect timer") { h.clock.pendingSleeps == 1 }
        XCTAssertEqual(h.clock.deadlines, [h.clock.now + 7000])
        XCTAssertEqual(delivery.problems.first?.retryAfter, 7)

        h.clock.advance(by: 7000)
        let second = try await h.sockets.connection(1)
        let resumed = try await subscribe(second, stream)
        second.receive([
            "type": "next", "id": .string(resumed.id),
            "payload": ["errors": [problem("QUOTA_EXCEEDED", status: 429, retryAfter: 60)]],
        ])
        try await eventually("closed") { await stream.isClosed }
        XCTAssertEqual(delivery.problems.map(\.code), [.rateLimited, .quotaExceeded])
        XCTAssertEqual(delivery.problems.last?.status, 429)
        XCTAssertEqual(h.clock.pendingSleeps, 0)
        h.clock.advance(by: 120_000)
        XCTAssertEqual(h.sockets.connections.count, 2)
    }
}

final class ConversationStreamRefreshTests: XCTestCase {
    func testReconnectsWithTheRenewedSessionToken() async throws {
        let clock = TestClock()
        let renewedAt = clock.now + 7_200_000
        let renewed = Fixture.session(revision: "2", expiresAt: renewedAt)
        let sessions = Shared<[String: JSONValue]>([
            "user-token": Fixture.session(expiresAt: clock.now + 3_600_000)
        ])
        let h = try await Harness.make(
            refresh: { _ in
                sessions.update { $0["renewed-token"] = renewed }
                return SessionBootstrap(
                    session: try renewed.decoded(as: Session.self), tokenExpiresAt: timestamp(renewedAt),
                    sessionToken: "renewed-token")
            }, clock: clock)
        await h.http.on("communication.currentSession") { request in
            let token = request.authorization.map { String($0.dropFirst("Bearer ".count)) } ?? ""
            guard let session = sessions.value[token] else { return Reply.failure(status: 401, code: "UNAUTHENTICATED") }
            return Reply.ok(request, ["result": session], now: clock.now)
        }
        let log = EventLog(events: 1)
        await log.serve(h.http)
        let delivery = Delivery()
        let stream = try await delivery.watch(h.client)
        let first = try await h.sockets.connection(0)
        _ = try await subscribe(first, stream)

        log.append(1)
        _ = try await h.client.refreshSession()
        XCTAssertEqual(first.closedByClient, 1000, "The old session's subscription ends before renewal")
        let second = try await h.sockets.connection(1)
        XCTAssertEqual(delivery.sequences, ["1", "2"])
        let requests = await h.http.requests("communication.events")
        XCTAssertEqual(requests.last?.authorization, "Bearer renewed-token")
        XCTAssertEqual(requests.last.flatMap { EventLog.after($0) }, 1)

        second.open()
        try await eventually("connection_init") { !second.sentMessages.isEmpty }
        XCTAssertEqual(second.sentMessages.first?["payload"]?.objectValue?["token"]?.stringValue, "renewed-token")
        XCTAssertTrue(delivery.errors.isEmpty, "\(delivery.errors)")
        await stream.close()
    }
}
