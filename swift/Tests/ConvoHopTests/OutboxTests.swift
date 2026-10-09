import Foundation
import XCTest

@testable import ConvoHop

final class OutboxTests: XCTestCase {
    private static let storageKey = "convohop.outbox:\(TestIDs.project):\(TestIDs.principal)"

    private func outbox(
        network: FakeNetworkMonitor, storage: InMemoryRecoveryStorage = InMemoryRecoveryStorage(),
        token: String = "user-token"
    ) async throws -> (Harness, ConvoHopOutbox) {
        let h = try await Harness.make(token: token, storage: storage)
        let outbox = try ConvoHopOutbox(client: h.client, network: network)
        return (h, outbox)
    }

    func testOptimisticMessagesQueueOfflineFlushOnlineAndPersistNoToken() async throws {
        let network = FakeNetworkMonitor(reachable: false)
        let storage = InMemoryRecoveryStorage()
        let (h, outbox) = try await outbox(network: network, storage: storage, token: "secret-user-token")
        let ackId = uuid()
        await h.http.on("communication.sendMessage") { request in
            Reply.ok(request, ["result": Fixture.messageAck(TestIDs.conversation, messageId: ackId, sequence: "11")])
        }
        try await outbox.start()

        let item = try await outbox.enqueue("offline", to: TestIDs.conversation, props: ["client": "ios"])
        XCTAssertEqual(item.state, .queued)
        XCTAssertEqual(item.text, "offline")
        let offlineSendCount = await h.http.count("communication.sendMessage")
        XCTAssertEqual(offlineSendCount, 0)
        let storedValue = await storage.value(forKey: Self.storageKey)
        let stored = try XCTUnwrap(storedValue)
        XCTAssertTrue(stored.contains("offline"))
        XCTAssertFalse(stored.contains("secret-user-token"))

        network.set(true)
        try await eventually { await h.http.count("communication.sendMessage") == 1 }
        try await eventually { try await outbox.items().first?.state == .sent }
        let sentValue = try await outbox.items().first
        let sent = try XCTUnwrap(sentValue)
        XCTAssertEqual(sent.messageId, ackId)
        XCTAssertEqual(sent.sequence, "11")
    }

    func testRetriesKeepTheSameRequestIdAndPayloadUntilSuccess() async throws {
        let network = FakeNetworkMonitor(reachable: true)
        let (h, outbox) = try await outbox(network: network)
        let attempts = Shared(0)
        await h.http.on("communication.sendMessage") { request in
            if attempts.update({ $0 += 1; return $0 }) < 3 { throw URLError(.timedOut) }
            return Reply.ok(request, ["result": Fixture.messageAck(TestIDs.conversation, sequence: "12")])
        }
        try await outbox.start()
        _ = try await outbox.enqueue("retry", to: TestIDs.conversation, props: ["n": 1])

        // The stub records a request before the outbox handles its reply and schedules the retry, so wait for the
        // retry timer before advancing the clock.
        try await eventually { await h.http.count("communication.sendMessage") == 1 }
        try await eventually { h.clock.pendingSleeps == 1 }
        h.clock.advanceToNextDeadline()
        try await eventually { await h.http.count("communication.sendMessage") == 2 }
        try await eventually { h.clock.pendingSleeps == 1 }
        h.clock.advanceToNextDeadline()
        try await eventually { try await outbox.items().first?.state == .sent }

        let requests = await h.http.requests("communication.sendMessage")
        XCTAssertEqual(requests.count, 3)
        XCTAssertEqual(Set(requests.map(\.requestId)).count, 1)
        XCTAssertEqual(Set(requests.map { $0.input?["text"]?.stringValue ?? "" }), ["retry"])
    }

    func testUncertainOutcomeIsResolvedInsteadOfDuplicated() async throws {
        let network = FakeNetworkMonitor(reachable: true)
        let (h, outbox) = try await outbox(network: network)
        await h.http.on("communication.sendMessage") { _ in throw URLError(.networkConnectionLost) }
        await h.http.on("communication.resolveRequest") { request in
            let target = request.input?["requestId"]?.stringValue ?? ""
            return Reply.ok(
                request,
                ["result": Fixture.resolution(
                    target, "committed", retained: ["messageAck": Fixture.messageAck(TestIDs.conversation, sequence: "13")])])
        }
        try await outbox.start()
        _ = try await outbox.enqueue("uncertain", to: TestIDs.conversation)

        try await eventually { await h.http.count("communication.sendMessage") == 1 }
        try await eventually { h.clock.pendingSleeps == 1 }
        h.clock.advanceToNextDeadline()
        try await eventually { await h.http.count("communication.sendMessage") == 2 }
        try await eventually { h.clock.pendingSleeps == 1 }
        h.clock.advanceToNextDeadline()
        try await eventually { await h.http.count("communication.sendMessage") == 3 }
        try await eventually { h.clock.pendingSleeps == 1 }
        h.clock.advanceToNextDeadline()
        try await eventually { try await outbox.items().first?.state == .sent }
        let sendCount = await h.http.count("communication.sendMessage")
        let resolveCount = await h.http.count("communication.resolveRequest")
        XCTAssertEqual(sendCount, 3)
        XCTAssertEqual(resolveCount, 1)
    }

    func testPermanentFailureCanBeResentOrDiscarded() async throws {
        let network = FakeNetworkMonitor(reachable: true)
        let (h, outbox) = try await outbox(network: network)
        let attempts = Shared(0)
        await h.http.on("communication.sendMessage") { request in
            if attempts.update({ $0 += 1; return $0 }) == 1 {
                return Reply.graphQLError(code: "FORBIDDEN", outcome: "rejected", status: 403)
            }
            return Reply.ok(request, ["result": Fixture.messageAck(TestIDs.conversation, sequence: "14")])
        }
        try await outbox.start()
        let failed = try await outbox.enqueue("blocked", to: TestIDs.conversation)
        try await eventually { try await outbox.items().first?.state == .failed }
        let failedRequestIdValue = try await outbox.items().first?.requestId
        let failedRequestId = try XCTUnwrap(failedRequestIdValue)

        try await outbox.resend(failed.id)
        try await eventually { try await outbox.items().first?.state == .sent }
        let resentRequestId = try await outbox.items().first?.requestId
        XCTAssertNotEqual(resentRequestId, failedRequestId)

        let discarded = try await outbox.discard(failed.id)
        XCTAssertTrue(discarded)
        let remaining = try await outbox.items()
        XCTAssertEqual(remaining, [])
    }

    func testPerConversationOrderingAndRelaunchPersistence() async throws {
        let network = FakeNetworkMonitor(reachable: false)
        let storage = InMemoryRecoveryStorage()
        let (_, first) = try await outbox(network: network, storage: storage)
        try await first.start()
        _ = try await first.enqueue("one", to: TestIDs.conversation)
        _ = try await first.enqueue("two", to: TestIDs.conversation)
        await first.stop()

        let online = FakeNetworkMonitor(reachable: true)
        let (h, relaunched) = try await outbox(network: online, storage: storage)
        await h.http.on("communication.sendMessage") { request in
            let text = request.input?["text"]?.stringValue ?? ""
            return Reply.ok(request, ["result": Fixture.messageAck(TestIDs.conversation, sequence: text == "one" ? "21" : "22")])
        }
        try await relaunched.start()
        try await eventually { try await relaunched.items().map(\.state) == [.sent, .sent] }

        let requests = await h.http.requests("communication.sendMessage")
        XCTAssertEqual(requests.compactMap { $0.input?["text"]?.stringValue }, ["one", "two"])
    }

    func testStopReturnsOnceTheAttemptInFlightAndItsSavesSettled() async throws {
        let network = FakeNetworkMonitor(reachable: true)
        let storage = InMemoryRecoveryStorage()
        let (h, outbox) = try await outbox(network: network, storage: storage)
        let gate = Gate()
        await h.http.on("communication.sendMessage") { request in
            await gate.wait()
            return Reply.ok(request, ["result": Fixture.messageAck(TestIDs.conversation, sequence: "31")])
        }
        try await outbox.start()
        let item = try await outbox.enqueue("in flight", to: TestIDs.conversation)
        try await eventually { await h.http.count("communication.sendMessage") == 1 }

        let stopped = Shared(false)
        let stopping = Task {
            await outbox.stop()
            stopped.update { $0 = true }
        }
        try await eventually { await outbox.snapshot.isReachable == false }
        XCTAssertFalse(stopped.value, "stop() returned with a send in flight")

        gate.open()
        await stopping.value
        // Once stop() returns, the attempt's outcome is saved: the sent message left the saved queue, and its recovery
        // record holds the receipt.
        let queue = await storage.value(forKey: Self.storageKey)
        XCTAssertNil(queue)
        let recordsValue = await storage.value(forKey: "convohop.requests:\(TestIDs.project):\(TestIDs.principal)")
        let records = try JSONParser.parse(XCTUnwrap(recordsValue)).arrayValue ?? []
        XCTAssertEqual(records.compactMap { $0.objectValue?["requestId"]?.stringValue }, [item.requestId])
        XCTAssertEqual(records.compactMap { $0.objectValue?["resolutionState"]?.stringValue }, ["committed"])
        let items = try await outbox.items()
        XCTAssertEqual(items.map(\.state), [.sent])
    }

    // MARK: Retry policy

    func testARateLimitWaitsForItsRetryAfterAndAnExhaustedQuotaFailsTheMessage() async throws {
        let network = FakeNetworkMonitor(reachable: true)
        let (h, outbox) = try await outbox(network: network)
        let attempts = Shared(0)
        await h.http.on("communication.sendMessage") { _ in
            attempts.update({ $0 += 1; return $0 }) == 1
                ? Reply.graphQLError(code: "RATE_LIMITED", status: 429, retryAfter: 9)
                : Reply.graphQLError(code: "QUOTA_EXCEEDED", status: 429, retryAfter: 60)
        }
        try await outbox.start()
        _ = try await outbox.enqueue("limited", to: TestIDs.conversation)

        try await eventually { h.clock.pendingSleeps == 1 }
        // The authority's retryAfter outranks the outbox's one-second backoff.
        XCTAssertEqual(h.clock.deadlines, [h.clock.now + 9_000])
        let waiting = try await outbox.items().first
        XCTAssertEqual(waiting?.state, .queued)
        XCTAssertEqual(waiting?.failure?.code, .rateLimited)

        // An exhausted quota doesn't clear by waiting, so the message fails instead of waiting for its retryAfter.
        h.clock.advanceToNextDeadline()
        try await eventually { try await outbox.items().first?.state == .failed }
        let failed = try await outbox.items().first
        XCTAssertEqual(failed?.failure?.code, .quotaExceeded)
        let pauseReason = await outbox.pauseReason
        XCTAssertNil(pauseReason)
        let requests = await h.http.requests("communication.sendMessage")
        XCTAssertEqual(requests.count, 2)
        XCTAssertEqual(Set(requests.map(\.requestId)).count, 1)
        XCTAssertEqual(h.clock.pendingSleeps, 0)
    }

    func testAFullRecoveryJournalHoldsTheMessageUntilARecordIsFinal() async throws {
        // Sends with unknown outcomes, which may be resent under their request IDs for a minute.
        let seeded = (0..<ConvoHopTransport.maximumRecords).map { _ in uuid() }
        let storage = try await Fixture.recoveryStorage(seeded.map { try Fixture.recoveryRecord($0) })
        let network = FakeNetworkMonitor(reachable: true)
        let (h, outbox) = try await outbox(network: network, storage: storage)
        await h.http.on("communication.sendMessage") { request in
            Reply.ok(request, ["result": Fixture.messageAck(TestIDs.conversation, sequence: "41")])
        }
        try await outbox.start()
        let item = try await outbox.enqueue("waits", to: TestIDs.conversation)

        // The transport refused to record the request, so nothing was sent and the message waits without pausing.
        try await eventually { h.clock.pendingSleeps == 1 }
        let waiting = try await outbox.items().first
        XCTAssertEqual(waiting?.state, .queued)
        XCTAssertEqual(waiting?.failure?.code, .recoveryLimit)
        let pauseReason = await outbox.pauseReason
        XCTAssertNil(pauseReason)
        var sent = await h.http.count("communication.sendMessage")
        XCTAssertEqual(sent, 0)

        // Once their retry window closes, the seeded records are final, and the oldest makes room.
        h.clock.advance(by: 60_001)
        try await eventually { try await outbox.items().first?.state == .sent }
        sent = await h.http.count("communication.sendMessage")
        XCTAssertEqual(sent, 1)
        let journal = try await Fixture.journal(storage)
        XCTAssertEqual(journal, Array(seeded.dropFirst()) + [item.requestId])
    }

    func testTheRecoveryJournalKeepsTheRecordsOfQueuedMessages() async throws {
        let network = FakeNetworkMonitor(reachable: false)
        let (h, outbox) = try await outbox(network: network)
        let sequence = Shared(50)
        await h.http.on("communication.sendMessage") { request in
            let next = sequence.update { $0 += 1; return $0 }
            return Reply.ok(request, ["result": Fixture.messageAck(TestIDs.conversation, sequence: String(next))])
        }
        try await outbox.start()
        let first = try await outbox.enqueue("one", to: TestIDs.conversation)
        let second = try await outbox.enqueue("two", to: TestIDs.conversation)
        let retention = await h.client.transport.retention
        XCTAssertEqual(retention.requestIds, [first.requestId, second.requestId])

        network.set(true)
        try await eventually { try await outbox.items().map(\.state) == [.sent, .sent] }
        try await eventually { retention.requestIds.isEmpty }
    }

    func testWrongRegionRoutesAgainAndResendsUnderTheSameRequestId() async throws {
        let network = FakeNetworkMonitor(reachable: true)
        let (h, outbox) = try await outbox(network: network)
        let attempts = Shared(0)
        await h.http.on("communication.sendMessage") { request in
            if attempts.update({ $0 += 1; return $0 }) == 1 { return Reply.graphQLError(code: "WRONG_REGION") }
            return Reply.ok(request, ["result": Fixture.messageAck(TestIDs.conversation, sequence: "61")])
        }
        try await outbox.start()
        _ = try await outbox.enqueue("moved", to: TestIDs.conversation)

        try await eventually { h.clock.pendingSleeps == 1 }
        h.clock.advanceToNextDeadline()
        try await eventually { try await outbox.items().first?.state == .sent }
        let keys = await h.http.requests.map(\.key)
        XCTAssertEqual(keys, ["communication.sendMessage", "communication.route", "communication.sendMessage"])
        let sends = await h.http.requests("communication.sendMessage")
        XCTAssertEqual(Set(sends.map(\.requestId)).count, 1)
    }

    // MARK: Apps that die

    func testAnAppThatDiesAtAnyStepStillSendsTheMessageOnce() async throws {
        var steps = 0
        while true {
            let context = "dying after \(steps) steps"
            let values = Shared<[String: String]>([:])
            let authority = Authority()
            let clock = TestClock()
            let http = await authority.http(clock: clock)
            let first = AppProcess(values: values, authority: http)
            let requestId = try await queueAndAttempt(in: first, dyingAfter: steps, clock: clock)
            let completed = !first.died

            let saved = try SavedState(values.value)
            for item in saved.items where item.state == "sending" {
                XCTAssertTrue(saved.records.contains(item.requestId), "a sending item without its record, \(context)")
            }

            let second = AppProcess(values: values, authority: http)
            let outbox = try ConvoHopOutbox(
                client: try client(second, clock: clock), network: FakeNetworkMonitor(reachable: true))
            try await outbox.start()
            if !saved.items.isEmpty {
                try await eventually(context) { try await outbox.items().first?.state == .sent }
            }
            let items = try await outbox.items().map { [$0.requestId, $0.state.rawValue] }
            await outbox.stop()
            XCTAssertEqual(items, saved.items.isEmpty ? [] : [[requestId, "sent"]], context)
            XCTAssertEqual(Set(authority.sends.value), [requestId], context)
            XCTAssertEqual(Array(authority.committed.value.keys), [requestId], context)
            // A restarted outbox can't tell whether a request it noted reached ConvoHop, so it sends the same request
            // ID again, and ConvoHop replays the stored message.
            let resent = first.log.contains("send") && !saved.items.isEmpty
            XCTAssertEqual(authority.sends.value.count, resent ? 2 : 1, context)
            if completed {
                XCTAssertEqual(first.log, ["record", "entry", "record", "send", "record", "entry"])
                return
            }
            steps += 1
            guard steps < 20 else { return XCTFail("The attempt never completes") }
        }
    }

    func testARestartInANewIncarnationSendsAnUnsentItemUnderANewRequestId() async throws {
        let values = Shared<[String: String]>([:])
        let authority = Authority()
        let clock = TestClock()
        let first = AppProcess(values: values, authority: await authority.http(clock: clock))
        // The app dies once the transport saved the request's record, before the outbox noted the attempt. The item
        // is still queued, under a request ID that the old incarnation recorded.
        let requestId = try await queueAndAttempt(in: first, dyingAfter: 1, clock: clock)
        XCTAssertEqual(first.log, ["record"])

        let incarnation = uuid()
        let second = AppProcess(values: values, authority: await authority.http(incarnation: incarnation, clock: clock))
        let outbox = try ConvoHopOutbox(
            client: try client(second, clock: clock, incarnation: incarnation),
            network: FakeNetworkMonitor(reachable: true))
        try await outbox.start()
        try await eventually { try await outbox.items().first?.state == .sent }
        let itemValue = try await outbox.items().first
        await outbox.stop()
        let item = try XCTUnwrap(itemValue)
        XCTAssertNotEqual(item.requestId, requestId)
        XCTAssertEqual(authority.sends.value, [item.requestId])
        XCTAssertEqual(Array(authority.committed.value.keys), [item.requestId])
    }

    /// A client of `process`, in `incarnation`.
    private func client(
        _ process: AppProcess, clock: TestClock, incarnation: String = TestIDs.incarnation
    ) throws -> ConvoHopClient {
        let configuration = ConvoHopConfiguration(
            baseURL: URL(string: Fixture.baseURL)!, projectId: TestIDs.project, principalId: TestIDs.principal,
            incarnation: incarnation, sessionToken: "user-token", recoveryStorage: process, refreshSession: nil,
            httpClient: process, webSocketFactory: FakeWebSocketFactory())
        return try ConvoHopClient(configuration: configuration, environment: clock.environment)
    }

    /// Queues a message offline, then goes online with `process` dying after `steps` steps of the first attempt. It
    /// returns the message's request ID once the attempt ended.
    private func queueAndAttempt(in process: AppProcess, dyingAfter steps: Int, clock: TestClock) async throws -> String {
        let network = FakeNetworkMonitor(reachable: false)
        let outbox = try ConvoHopOutbox(client: try client(process, clock: clock), network: network)
        try await outbox.start()
        let requestId = try await outbox.enqueue("sent once", to: TestIDs.conversation).requestId
        process.die(after: steps)
        network.set(true)
        // The outbox writes when an attempt starts and when it ends. A dead app loses both writes, but they look
        // successful, so the attempt still ends.
        try await eventually("the attempt to end") { process.entryWrites >= 2 }
        await outbox.stop()
        return requestId
    }
}

/// One run of an app, over storage that outlives it. It dies after a set number of steps, where a step is a storage
/// write or a message send. After that its writes are lost, though they look successful, and its requests fail.
private final class AppProcess: RecoveryStorage, ConvoHopHTTPClient, @unchecked Sendable {
    let values: Shared<[String: String]>
    private let authority: StubHTTP
    private let lock = NSLock()
    private var steps: [String] = []
    private var limit = Int.max
    private var dead = false
    private var outboxWrites = 0

    init(values: Shared<[String: String]>, authority: StubHTTP) {
        self.values = values
        self.authority = authority
    }

    /// The steps it took: `record` and `entry` writes of the transport and the outbox, and `send`s.
    var log: [String] { lock.locked { steps } }
    var died: Bool { lock.locked { dead } }
    /// The outbox writes it was asked for, including lost ones.
    var entryWrites: Int { lock.locked { outboxWrites } }

    /// Starts counting steps over, and dies once it took `count` more.
    func die(after count: Int) {
        lock.locked {
            steps = []
            limit = count
            dead = false
            outboxWrites = 0
        }
    }

    /// Whether the app lives to take `step`.
    private func step(_ step: String) -> Bool {
        lock.locked {
            if step == "entry" { outboxWrites += 1 }
            guard !dead, steps.count < limit else {
                dead = true
                return false
            }
            steps.append(step)
            return true
        }
    }

    private static func kind(_ key: String) -> String {
        key.hasPrefix("convohop.requests:") ? "record" : "entry"
    }

    func value(forKey key: String) -> String? {
        values.value[key]
    }

    func setValue(_ value: String, forKey key: String) {
        if step(Self.kind(key)) { values.update { $0[key] = value } }
    }

    func removeValue(forKey key: String) {
        if step(Self.kind(key)) { values.update { $0[key] = nil } }
    }

    func send(_ request: ConvoHopHTTPRequest) async throws -> ConvoHopHTTPResponse {
        let operationName = try JSONParser.parse(request.body).objectValue?["operationName"]?.stringValue
        if operationName == Catalog.descriptor("communication.sendMessage").operationName {
            guard step("send") else { throw URLError(.notConnectedToInternet) }
        } else if died {
            throw URLError(.notConnectedToInternet)
        }
        return try await authority.send(request)
    }
}

/// ConvoHop as an app's runs see it: it stores the message of each request ID once, and replays it for repeats.
private final class Authority: Sendable {
    /// The acknowledgement stored for each request ID.
    let committed = Shared<[String: JSONValue]>([:])
    /// The request ID of each send, in arrival order.
    let sends = Shared<[String]>([])

    /// The authority's HTTP interface for clients in `incarnation`.
    func http(incarnation: String = TestIDs.incarnation, clock: TestClock) async -> StubHTTP {
        let http = StubHTTP()
        let committed = self.committed, sends = self.sends
        await http.on("communication.route") { request in
            Reply.ok(request, ["result": Fixture.route(now: clock.now, incarnation: incarnation)], now: clock.now)
        }
        await http.on("communication.sendMessage") { request in
            let requestId = request.requestId
            sends.update { $0.append(requestId) }
            let ack = committed.update { stored -> JSONValue in
                if let ack = stored[requestId] { return ack }
                let ack = Fixture.messageAck(
                    TestIDs.conversation, sequence: String(stored.count + 1), incarnation: incarnation)
                stored[requestId] = ack
                return ack
            }
            return Reply.ok(request, ["result": ack])
        }
        await http.on("communication.resolveRequest") { request in
            let target = request.input?["requestId"]?.stringValue ?? ""
            guard let ack = committed.value[target] else {
                return Reply.ok(request, ["result": Fixture.resolution(target, "notObservedYet")])
            }
            return Reply.ok(
                request, ["result": Fixture.resolution(target, "committed", retained: ["messageAck": ack])])
        }
        return http
    }
}

/// What a dead app left in storage: its queued items, and the request IDs of its recovery records.
private struct SavedState {
    struct Queue: Decodable {
        struct Item: Decodable {
            let requestId: String
            let state: String
        }

        let items: [Item]
    }

    struct Record: Decodable {
        let requestId: String
    }

    let items: [Queue.Item]
    let records: Set<String>

    init(_ values: [String: String]) throws {
        let namespace = "\(TestIDs.project):\(TestIDs.principal)"
        let decoder = JSONDecoder()
        items = try values["convohop.outbox:" + namespace].map { try decoder.decode(Queue.self, from: Data($0.utf8)).items }
            ?? []
        records = Set(
            try values["convohop.requests:" + namespace].map {
                try decoder.decode([Record].self, from: Data($0.utf8)).map(\.requestId)
            } ?? [])
    }
}
