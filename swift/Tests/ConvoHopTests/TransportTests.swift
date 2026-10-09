import Foundation
import XCTest

@testable import ConvoHop

/// Recovery storage that keeps every snapshot it confirms and fails reads or writes on demand.
private actor ScriptedStorage: RecoveryStorage {
    struct Failure: Error {}

    private var values: [String: String]
    private var failingReads = false
    private var remainingWrites: Int?
    private(set) var reads = 0
    private(set) var snapshots: [String] = []

    init(_ values: [String: String] = [:]) {
        self.values = values
    }

    /// Fails every read, or every write after `writesBeforeFailure` confirmed ones.
    func configure(failReads: Bool = false, writesBeforeFailure: Int? = nil) {
        failingReads = failReads
        remainingWrites = writesBeforeFailure
    }

    func value(forKey key: String) throws -> String? {
        reads += 1
        if failingReads { throw Failure() }
        return values[key]
    }

    func setValue(_ value: String, forKey key: String) throws {
        if let remaining = remainingWrites {
            guard remaining > 0 else { throw Failure() }
            remainingWrites = remaining - 1
        }
        values[key] = value
        snapshots.append(value)
    }

    func removeValue(forKey key: String) {
        values[key] = nil
    }
}

private struct UnexpectedSnapshot: Error {}

/// The transport's mutation-recovery rules, below the client: what is recorded, when, and what may be resent.
final class TransportTests: XCTestCase {
    private static let namespace = "\(TestIDs.project):\(TestIDs.principal)"
    private static let storageKey = "convohop.requests:" + namespace
    private static let send = "communication.sendMessage"
    private static let typing = "communication.typing"
    private static let resolve = "communication.resolveRequest"
    private static let credentials = "communication.liveSessionCredentials"
    private static let sendInput: JSONObject = ["conversationId": .string(TestIDs.conversation), "text": "Hello"]
    private static let typingInput: JSONObject = ["conversationId": .string(TestIDs.conversation), "isTyping": true]

    private static func makeTransport(
        _ http: StubHTTP, storage: (any RecoveryStorage)? = nil, clock: TestClock = TestClock(),
        incarnation: String = TestIDs.incarnation
    ) async throws -> ConvoHopTransport {
        let transport = try ConvoHopTransport(
            baseUrl: Fixture.baseURL, credential: "user-token", namespace: namespace, incarnation: incarnation,
            http: http, storage: storage, clock: { clock.now })
        await transport.setServingEpoch("1")
        return transport
    }

    private static func stored(_ records: [JSONObject]) -> [String: String] {
        [storageKey: JSONValue.array(records.map(JSONValue.object)).jsonText()]
    }

    /// Each snapshot's only record, as `resolution attempts classification`.
    private static func progress(_ snapshots: [String]) throws -> [String] {
        try snapshots.map { text in
            guard case .array(let items) = try JSONParser.parse(text), items.count == 1,
                let record = items[0].objectValue, let resolution = record["resolutionState"]?.stringValue,
                let attempts = record["attemptCount"]?.numberValue,
                let classification = record["lastAttemptClassification"]?.stringValue
            else { throw UnexpectedSnapshot() }
            return "\(resolution) \(Int(attempts)) \(classification)"
        }
    }

    // MARK: Records

    func testARecordIsDurableBeforeItsRequestIsSent() async throws {
        let storage = ScriptedStorage()
        let http = StubHTTP()
        let writesAtSend = Shared<[Int]>([])
        await http.on(Self.send) { request in
            let writes = await storage.snapshots.count
            writesAtSend.update { $0.append(writes) }
            return Reply.ok(request)
        }
        let transport = try await Self.makeTransport(http, storage: storage)
        let reply = try await transport.execute(Self.send, projectId: TestIDs.project, input: Self.sendInput)

        XCTAssertEqual(reply["status"], "committed")
        XCTAssertEqual(writesAtSend.value, [2])
        let snapshots = await storage.snapshots
        XCTAssertEqual(
            try Self.progress(snapshots), ["pending 0 notSubmitted", "unknown 1 submitted", "committed 1 authorityReceipt"])
    }

    func testStoresACompactRecordWithSortedKeysAndNoCredential() async throws {
        let storage = InMemoryRecoveryStorage()
        let http = StubHTTP()
        await http.on(Self.send) { request in Reply.ok(request) }
        let transport = try await Self.makeTransport(http, storage: storage)
        let requestId = uuid()
        _ = try await transport.execute(Self.send, projectId: TestIDs.project, input: Self.sendInput, requestId: requestId)

        let fingerprint = try ConvoHopTransport.fingerprint(
            operation: Self.send, projectId: TestIDs.project, input: Self.sendInput)
        let expected = [
            #"[{"attemptCount":1,"firstSubmittedAt":1800000000000,"incarnation":"\#(TestIDs.incarnation)","#,
            #""input":{"conversationId":"\#(TestIDs.conversation)","text":"Hello"},"lastAttemptAt":1800000000000,"#,
            #""lastAttemptClassification":"authorityReceipt","operation":"communication.sendMessage","#,
            #""payloadFingerprint":"\#(fingerprint)","projectId":"\#(TestIDs.project)","requestId":"\#(requestId)","#,
            #""resolutionState":"committed","retryDeadline":1800000060000}]"#,
        ].joined()
        let stored = await storage.value(forKey: Self.storageKey)
        XCTAssertEqual(stored, expected)
        XCTAssertFalse(stored?.contains("user-token") ?? true)
    }

    func testStoresTheCrossLanguageFingerprintOfTheOriginalPayload() async throws {
        let storage = InMemoryRecoveryStorage()
        let http = StubHTTP()
        await http.on(Self.send) { _ in throw URLError(.timedOut) }
        let transport = try await Self.makeTransport(http, storage: storage)
        _ = await convoHopError {
            try await transport.execute(Self.send, projectId: JSONTests.vectorProject, input: JSONTests.vectorInput)
        }

        let states = try await transport.recoveryStates()
        XCTAssertEqual(states.map(\.payloadFingerprint), [JSONTests.sendFingerprint])
        // The stored input reproduces the fingerprint after a round trip through storage.
        let stored = await storage.value(forKey: Self.storageKey)
        let record = try JSONParser.parse(XCTUnwrap(stored)).arrayValue?.first?.objectValue
        XCTAssertEqual(record?["payloadFingerprint"], .string(JSONTests.sendFingerprint))
        let input = try XCTUnwrap(record?["input"]?.objectValue)
        XCTAssertEqual(
            try ConvoHopTransport.fingerprint(operation: Self.send, projectId: JSONTests.vectorProject, input: input),
            JSONTests.sendFingerprint)
    }

    func testTypingKeepsNoRecordAndIsRepeatedVerbatim() async throws {
        let storage = InMemoryRecoveryStorage()
        let http = StubHTTP()
        await http.on(Self.typing) { request in Reply.ok(request, ["status": "ok"]) }
        let transport = try await Self.makeTransport(http, storage: storage)
        let requestId = uuid()
        for _ in 0..<2 {
            let reply = try await transport.execute(
                Self.typing, projectId: TestIDs.project, input: Self.typingInput, requestId: requestId)
            XCTAssertEqual(reply["status"], "ok")
        }

        let requests = await http.requests(Self.typing)
        XCTAssertEqual(requests.map(\.requestId), [requestId, requestId])
        let states = try await transport.recoveryStates()
        XCTAssertTrue(states.isEmpty)
        let stored = await storage.value(forKey: Self.storageKey)
        XCTAssertNil(stored)
    }

    func testTypingRejectsAMissingReply() async throws {
        let http = StubHTTP()
        let field = try XCTUnwrap(GraphQLCatalog.operations[Self.typing]).field
        await http.on(Self.typing) { _ in Reply.json(["data": .object([field: .null])]) }
        let transport = try await Self.makeTransport(http, storage: InMemoryRecoveryStorage())
        let error = await convoHopError {
            try await transport.execute(Self.typing, projectId: TestIDs.project, input: Self.typingInput)
        }

        XCTAssertEqual(error?.code, .invalidResponse)
        XCTAssertEqual(error?.outcome, .unknown)
        XCTAssertEqual(error?.message, "Malformed authority response; resolve the original request")
        let states = try await transport.recoveryStates()
        XCTAssertTrue(states.isEmpty)
    }

    func testAMutationNeedsReceiptEvidence() async throws {
        let operation = Fixture.full("OperationRef", [
            "operationId": .string(uuid()), "owner": "authority", "href": "https://api.convohop.test/operations/1",
            "state": "running",
        ])
        let replies: [(fields: JSONObject, accepted: Bool)] = [
            (["status": "ok"], false),
            (["status": "accepted"], false),
            (["status": "committed", "replayed": .null], false),
            (["status": "committed", "committedAt": "2027-01-15T08:00:00Z"], false),
            (["status": "accepted", "operation": operation], true),
        ]
        for (index, reply) in replies.enumerated() {
            let http = StubHTTP()
            let fields = reply.fields
            await http.on(Self.send) { request in Reply.ok(request, fields) }
            let transport = try await Self.makeTransport(http, storage: InMemoryRecoveryStorage())
            if reply.accepted {
                let result = try await transport.execute(Self.send, projectId: TestIDs.project, input: Self.sendInput)
                XCTAssertEqual(result["status"], "accepted")
            } else {
                let error = await convoHopError {
                    try await transport.execute(Self.send, projectId: TestIDs.project, input: Self.sendInput)
                }
                XCTAssertEqual(error?.code, .invalidResponse, "reply \(index)")
                XCTAssertEqual(error?.outcome, .unknown, "reply \(index)")
                XCTAssertEqual(error?.message, "Malformed authority response; resolve the original request")
            }
            let states = try await transport.recoveryStates()
            XCTAssertEqual(states.map(\.resolutionState), [reply.accepted ? .accepted : .unknown], "reply \(index)")
        }
    }

    // MARK: Uncertain replies

    func testARedirectIsNotTheAuthoritysAnswer() async throws {
        XCTAssertEqual(ConvoHopTransport.redirectStatuses, [301, 302, 303, 307, 308])
        for status in ConvoHopTransport.redirectStatuses.sorted() {
            let http = StubHTTP()
            await http.on(Self.send) { _ in
                ConvoHopHTTPResponse(status: status, headers: ["Location": "https://elsewhere.test/graphql"], body: Data())
            }
            let transport = try await Self.makeTransport(http, storage: InMemoryRecoveryStorage())
            let requestId = uuid()
            let error = await convoHopError {
                try await transport.execute(
                    Self.send, projectId: TestIDs.project, input: Self.sendInput, requestId: requestId)
            }

            XCTAssertEqual(error?.code, .transportUnknown, "\(status)")
            XCTAssertEqual(error?.outcome, .unknown, "\(status)")
            XCTAssertNil(error?.status, "\(status)")
            XCTAssertEqual(error?.requestId, requestId)
            XCTAssertEqual(error?.message, "Authority response was redirected; resolve the original request")
            let states = try await transport.recoveryStates()
            XCTAssertEqual(states.map(\.resolutionState), [.unknown], "\(status)")
            XCTAssertEqual(states.map(\.lastAttemptClassification), ["TRANSPORT_UNKNOWN"], "\(status)")
        }
    }

    func testAnOversizedReplyIsNotRead() async throws {
        let limit = ConvoHopTransport.maximumResponseLength
        // A JSON string of exactly the bound is read, and is not a reply object; one more code unit is not read.
        let cases = [
            (limit, "Malformed authority response; resolve the original request"),
            (limit + 1, "Authority response exceeds the bound"),
        ]
        for (length, message) in cases {
            let http = StubHTTP()
            let body = Data(("\"" + String(repeating: "a", count: length - 2) + "\"").utf8)
            await http.on(Self.send) { _ in
                ConvoHopHTTPResponse(status: 200, headers: ["Content-Type": "application/json"], body: body)
            }
            let transport = try await Self.makeTransport(http, storage: InMemoryRecoveryStorage())
            let error = await convoHopError {
                try await transport.execute(Self.send, projectId: TestIDs.project, input: Self.sendInput)
            }

            XCTAssertEqual(error?.code, .invalidResponse, "\(length)")
            XCTAssertEqual(error?.outcome, .unknown, "\(length)")
            XCTAssertEqual(error?.status, 200, "\(length)")
            XCTAssertEqual(error?.message, message)
            let states = try await transport.recoveryStates()
            XCTAssertEqual(states.map(\.lastAttemptClassification), ["INVALID_RESPONSE"], "\(length)")
        }
    }

    func testRetryDelaysAreWholeSecondsOnly() {
        let valid: [(JSONValue, Int)] = [
            (0, 0), (7, 7), ("0", 0), ("12", 12), ("1234567890", 1_234_567_890),
            (.number(9_007_199_254_740_991), 9_007_199_254_740_991),
        ]
        for (value, expected) in valid {
            XCTAssertEqual(ConvoHopTransport.retryDelay(value), expected, "\(value)")
        }
        let invalid: [JSONValue?] = [
            nil, .null, -1, 1.5, .number(9_007_199_254_740_992), .number(.infinity), true, [:], [5], "", "1.5", " 5",
            "5 ", "+5", "-1", "0x10", "12345678901", "\u{0661}", "5, 6", "Wed, 21 Oct 2015 07:28:00 GMT",
        ]
        for value in invalid {
            XCTAssertNil(ConvoHopTransport.retryDelay(value), "\(String(describing: value))")
        }
    }

    func testTheErrorsOwnRetryDelayWinsOverTheHeader() async throws {
        let cases: [(response: ConvoHopHTTPResponse, header: String, expected: Int?)] = [
            (Self.graphQLError(retryAfter: 3), "9", 3),
            (Self.graphQLError(retryAfter: "soon"), "6", 6),
            (Self.graphQLError(retryAfter: nil), "5", 5),
            (Self.graphQLError(retryAfter: nil), "Wed, 21 Oct 2015 07:28:00 GMT", nil),
            (Self.unavailable(retryAfter: 4), "8", 4),
            (Self.unavailable(retryAfter: "later"), "8", 8),
            (Self.unavailable(retryAfter: nil), "1.5", nil),
        ]
        for (index, entry) in cases.enumerated() {
            var response = entry.response
            response.headers["retry-after"] = entry.header
            let reply = response
            let http = StubHTTP()
            await http.on(Self.typing) { _ in reply }
            let transport = try await Self.makeTransport(http)
            let error = await convoHopError {
                try await transport.execute(Self.typing, projectId: TestIDs.project, input: Self.typingInput)
            }
            XCTAssertEqual(error?.retryAfter, entry.expected, "case \(index)")
        }
    }

    func testAGatewayErrorPageIsAnUnknownOutcomeThatKeepsItsRetryAfter() async throws {
        for status in [502, 504] {
            let http = StubHTTP()
            await http.on(Self.typing) { _ in
                ConvoHopHTTPResponse(
                    status: status, headers: ["content-type": "text/html", "retry-after": "7"],
                    body: Data("<html><body>Bad gateway</body></html>".utf8))
            }
            let transport = try await Self.makeTransport(http)
            let error = await convoHopError {
                try await transport.execute(Self.typing, projectId: TestIDs.project, input: Self.typingInput)
            }
            XCTAssertEqual(error?.code, .invalidResponse, "\(status)")
            XCTAssertEqual(error?.outcome, .unknown, "\(status)")
            XCTAssertEqual(error?.status, status)
            XCTAssertEqual(error?.retryAfter, 7, "\(status)")
            XCTAssertEqual(error.map { RetryPolicy.reconnectAction($0) }, .retry, "\(status)")
        }
    }

    /// A rate-limit GraphQL error whose `extensions.retryAfter` is any JSON value.
    private static func graphQLError(retryAfter: JSONValue?) -> ConvoHopHTTPResponse {
        var extensions: JSONObject = ["code": "RATE_LIMITED", "outcome": "rejected", "status": 429]
        if let retryAfter { extensions["retryAfter"] = retryAfter }
        let error: JSONObject = ["message": "Slow down", "extensions": .object(extensions)]
        return Reply.json(["errors": [.object(error)]])
    }

    /// A 503 whose body carries `retryAfter`.
    private static func unavailable(retryAfter: JSONValue?) -> ConvoHopHTTPResponse {
        var body: JSONObject = ["code": "AUTHORITY_UNAVAILABLE", "outcome": "unknown", "message": "Unavailable"]
        if let retryAfter { body["retryAfter"] = retryAfter }
        return Reply.json(.object(body), status: 503)
    }

    // MARK: Storage

    func testAnUnreadableStoreSendsNothing() async throws {
        let storage = ScriptedStorage()
        await storage.configure(failReads: true)
        let http = StubHTTP()
        await http.on(Self.send) { request in Reply.ok(request) }
        let transport = try await Self.makeTransport(http, storage: storage)
        for _ in 0..<2 {
            let error = await convoHopError {
                try await transport.execute(Self.send, projectId: TestIDs.project, input: Self.sendInput)
            }
            XCTAssertEqual(error?.code, .recoveryStorageFailure)
            XCTAssertEqual(error?.outcome, .rejected)
            XCTAssertNil(error?.status)
            XCTAssertEqual(error?.message, "Recovery storage could not be read; no request was sent")
        }

        let reads = await storage.reads
        XCTAssertEqual(reads, 1)
        let sent = await http.requests.count
        XCTAssertEqual(sent, 0)
    }

    func testInvalidStoredRecordsBlockEveryRequest() async throws {
        let valid = try Fixture.recoveryRecord()
        var cases = ["", "{", "null", "{}", "[1]", "[null]", #"{"records":[]}"#]
        let overfull = try (0...ConvoHopTransport.maximumRecords).map { _ in try Fixture.recoveryRecord() }
        cases.append(Self.stored(overfull)[Self.storageKey]!)
        cases.append(Self.stored([valid, valid])[Self.storageKey]!)
        let changes: [(String, JSONValue?)] = [
            ("operation", "communication.unknown"), ("operation", .string(Self.resolve)), ("resolutionState", "lost"),
            ("projectId", nil), ("projectId", "not-a-uuid"), ("requestId", .string(uuid().uppercased())),
            ("requestId", "00000000-0000-0000-0000-000000000000"), ("attemptCount", -1), ("firstSubmittedAt", 1.5),
            ("retryDeadline", "1800000060000"), ("lastAttemptAt", .number(9_007_199_254_740_992)),
            ("mediaAdmissionAttempted", false), ("mediaAdmissionAttempted", "true"), ("input", "text"),
            ("incarnation", 7), ("payloadFingerprint", nil), ("lastAttemptClassification", nil),
        ]
        for (key, value) in changes {
            var record = valid
            record[key] = value
            cases.append(Self.stored([record])[Self.storageKey]!)
        }

        for (index, text) in cases.enumerated() {
            let http = StubHTTP()
            await http.on(Self.send) { request in Reply.ok(request) }
            let transport = try await Self.makeTransport(http, storage: ScriptedStorage([Self.storageKey: text]))
            let error = await convoHopError {
                try await transport.execute(Self.send, projectId: TestIDs.project, input: Self.sendInput)
            }
            XCTAssertEqual(error?.code, .recoveryStorageFailure, "case \(index)")
            XCTAssertEqual(error?.outcome, .rejected, "case \(index)")
            XCTAssertEqual(error?.message, "Recovery storage holds invalid records; no request was sent", "case \(index)")
            let sent = await http.requests.count
            XCTAssertEqual(sent, 0, "case \(index)")
        }
    }

    func testRestoresStoredRecords() async throws {
        let empty = try await Self.makeTransport(StubHTTP(), storage: ScriptedStorage([Self.storageKey: "[]"]))
        let none = try await empty.recoveryStates()
        XCTAssertTrue(none.isEmpty)

        let input: JSONObject = [
            "liveSessionId": .string(uuid()), "participationId": .string(uuid()), "expectedGeneration": "1",
            "mode": "AUDIO_VIDEO",
        ]
        let records = [
            try Fixture.recoveryRecord(), try Fixture.recoveryRecord(resolution: "committed"),
            try Fixture.recoveryRecord(
                operation: Self.credentials, input: input, resolution: "committed", mediaAdmissionAttempted: true),
        ]
        let ids = try records.map { try XCTUnwrap($0["requestId"]?.stringValue) }
        let transport = try await Self.makeTransport(StubHTTP(), storage: ScriptedStorage(Self.stored(records)))
        let states = try await transport.recoveryStates()

        XCTAssertEqual(states.map(\.requestId), ids)
        XCTAssertEqual(states.map(\.resolutionState), [.unknown, .committed, .committed])
        XCTAssertEqual(states.map(\.mediaAdmissionAttempted), [false, false, true])
        let first = try XCTUnwrap(states.first)
        XCTAssertEqual(first.incarnation, TestIDs.incarnation)
        XCTAssertEqual(first.projectId, TestIDs.project)
        XCTAssertEqual(first.operation, Self.send)
        XCTAssertEqual(first.input, Self.sendInput)
        XCTAssertEqual(first.firstSubmittedAt, 1_800_000_000_000)
        XCTAssertEqual(first.retryDeadline, 1_800_000_060_000)
        XCTAssertEqual(first.attemptCount, 1)
        XCTAssertEqual(first.lastAttemptAt, 1_800_000_000_000)
        XCTAssertEqual(first.lastAttemptClassification, "TRANSPORT_UNKNOWN")
        XCTAssertEqual(
            first.payloadFingerprint,
            try ConvoHopTransport.fingerprint(operation: Self.send, projectId: TestIDs.project, input: Self.sendInput))
    }

    func testAnUnconfirmedRecordIsNotSent() async throws {
        let storage = ScriptedStorage()
        await storage.configure(writesBeforeFailure: 0)
        let http = StubHTTP()
        await http.on(Self.send) { request in Reply.ok(request) }
        let transport = try await Self.makeTransport(http, storage: storage)
        let requestId = uuid()
        let error = await convoHopError {
            try await transport.execute(Self.send, projectId: TestIDs.project, input: Self.sendInput, requestId: requestId)
        }

        XCTAssertEqual(error?.code, .recoveryStorageFailure)
        XCTAssertEqual(error?.outcome, .unknown)
        XCTAssertNil(error?.status)
        XCTAssertEqual(error?.requestId, requestId)
        XCTAssertEqual(
            error?.message, "Recovery storage did not confirm durability; retain the original request and its outcome")
        let unsent = await http.requests.count
        XCTAssertEqual(unsent, 0)

        // Once storage confirms writes, the same request goes out under its original identity.
        await storage.configure()
        _ = try await transport.execute(Self.send, projectId: TestIDs.project, input: Self.sendInput, requestId: requestId)
        let requests = await http.requests(Self.send)
        XCTAssertEqual(requests.map(\.requestId), [requestId])
        let snapshots = await storage.snapshots
        XCTAssertEqual(try Self.progress(snapshots), ["unknown 1 submitted", "committed 1 authorityReceipt"])
    }

    func testACommitWhoseRecordCannotBeSavedStillReportsTheCommit() async throws {
        let storage = ScriptedStorage()
        await storage.configure(writesBeforeFailure: 2)
        let http = StubHTTP()
        await http.on(Self.send) { request in Reply.ok(request) }
        let transport = try await Self.makeTransport(http, storage: storage)
        let requestId = uuid()
        let error = await convoHopError {
            try await transport.execute(Self.send, projectId: TestIDs.project, input: Self.sendInput, requestId: requestId)
        }

        XCTAssertEqual(error?.code, .recoveryStorageFailure)
        XCTAssertEqual(error?.outcome, .committed)
        XCTAssertEqual(error?.requestId, requestId)
        let sent = await http.requests.count
        XCTAssertEqual(sent, 1)
        let states = try await transport.recoveryStates()
        XCTAssertEqual(states.map(\.resolutionState), [.committed])
    }

    func testAFullJournalRefusesANewRequestWhenNoRecordIsFinal() async throws {
        let http = StubHTTP()
        await http.on(Self.send) { request in Reply.ok(request) }
        // Pending, unknown and retryably refused requests can all still be resent under their IDs.
        let kept = try (0..<ConvoHopTransport.maximumRecords).map { index in
            switch index % 3 {
            case 0: try Fixture.recoveryRecord(resolution: "pending", classification: "notSubmitted", attempts: 0)
            case 1: try Fixture.recoveryRecord(resolution: "unknown")
            default: try Fixture.recoveryRecord(resolution: "rejected", classification: "RATE_LIMITED")
            }
        }
        let transport = try await Self.makeTransport(http, storage: ScriptedStorage(Self.stored(kept)))
        let requestId = uuid()
        let error = await convoHopError {
            try await transport.execute(Self.send, projectId: TestIDs.project, input: Self.sendInput, requestId: requestId)
        }

        XCTAssertEqual(error?.code, .recoveryLimit)
        XCTAssertEqual(error?.outcome, .rejected)
        XCTAssertEqual(error?.status, 409)
        XCTAssertEqual(error?.requestId, requestId)
        XCTAssertEqual(
            error?.message,
            "Recovery storage already holds 128 requests that aren't final; retry or resolve them first")
        let sent = await http.requests.count
        XCTAssertEqual(sent, 0)
        let states = try await transport.recoveryStates()
        XCTAssertEqual(states.map(\.requestId), kept.compactMap { $0["requestId"]?.stringValue })
    }

    func testAFullJournalForgetsTheOldestFinalRecordFirst() async throws {
        let http = StubHTTP()
        await http.on(Self.send) { request in Reply.ok(request) }
        let receipt = "authorityReceipt"
        let committed = try Fixture.recoveryRecord(resolution: "committed", classification: receipt, age: 1_000)
        let accepted = try Fixture.recoveryRecord(resolution: "accepted", classification: receipt, age: 3_000)
        let refused = try Fixture.recoveryRecord(resolution: "rejected", classification: "QUOTA_EXCEEDED", age: 2_000)
        let limited = try Fixture.recoveryRecord(resolution: "rejected", classification: "RATE_LIMITED", age: 9_000)
        let unknown = try Fixture.recoveryRecord(resolution: "unknown", age: 9_000)
        let records =
            [unknown, committed, refused, limited, accepted]
            + (try (5..<ConvoHopTransport.maximumRecords).map { _ in try Fixture.recoveryRecord() })
        let transport = try await Self.makeTransport(http, storage: ScriptedStorage(Self.stored(records)))

        var forgotten: [String] = []
        for _ in 0..<3 {
            let before = Set(try await transport.recoveryStates().map(\.requestId))
            _ = try await transport.execute(Self.send, projectId: TestIDs.project, input: Self.sendInput)
            let after = Set(try await transport.recoveryStates().map(\.requestId))
            XCTAssertEqual(after.count, ConvoHopTransport.maximumRecords)
            forgotten.append(contentsOf: before.subtracting(after))
        }

        // Oldest attempt first, whether committed, accepted or refused for good; never the unknown or retryable ones.
        XCTAssertEqual(forgotten, [accepted, refused, committed].compactMap { $0["requestId"]?.stringValue })
        let states = try await transport.recoveryStates()
        XCTAssertEqual(states.first?.requestId, unknown["requestId"]?.stringValue)
        XCTAssertTrue(states.contains { $0.requestId == limited["requestId"]?.stringValue })
    }

    func testASpentRetryBudgetMakesARecordFinal() async throws {
        let http = StubHTTP()
        await http.on(Self.send) { request in Reply.ok(request) }
        let clock = TestClock()
        let attempted = try Fixture.recoveryRecord(resolution: "unknown", attempts: ConvoHopTransport.maximumAttempts)
        let limited = try Fixture.recoveryRecord(resolution: "rejected", classification: "RATE_LIMITED", age: 5_000)
        let unknown = try (2..<ConvoHopTransport.maximumRecords).map { _ in try Fixture.recoveryRecord() }
        let records = [limited, attempted] + unknown
        let transport = try await Self.makeTransport(http, storage: ScriptedStorage(Self.stored(records)), clock: clock)

        // Three attempts spend the budget, whatever the outcome.
        _ = try await transport.execute(Self.send, projectId: TestIDs.project, input: Self.sendInput)
        var states = try await transport.recoveryStates()
        XCTAssertFalse(states.contains { $0.requestId == attempted["requestId"]?.stringValue })
        XCTAssertTrue(states.contains { $0.requestId == limited["requestId"]?.stringValue })

        // So does the 60-second window: then the retryable refusal attempted longest ago goes first.
        clock.advance(by: 60_001)
        _ = try await transport.execute(Self.send, projectId: TestIDs.project, input: Self.sendInput)
        states = try await transport.recoveryStates()
        XCTAssertFalse(states.contains { $0.requestId == limited["requestId"]?.stringValue })
        XCTAssertEqual(states.count, ConvoHopTransport.maximumRecords)
    }

    func testAFullJournalKeepsRetainedRecords() async throws {
        let http = StubHTTP()
        await http.on(Self.send) { request in Reply.ok(request) }
        let first = try Fixture.recoveryRecord(resolution: "committed", classification: "authorityReceipt", age: 2_000)
        let second = try Fixture.recoveryRecord(resolution: "committed", classification: "authorityReceipt", age: 1_000)
        let records =
            [first, second] + (try (2..<ConvoHopTransport.maximumRecords).map { _ in try Fixture.recoveryRecord() })
        let transport = try await Self.makeTransport(http, storage: ScriptedStorage(Self.stored(records)))
        var retainer: RecoveryRetainer? = RecoveryRetainer()
        retainer?.hold([try XCTUnwrap(first["requestId"]?.stringValue)])
        transport.retention.add(try XCTUnwrap(retainer))

        _ = try await transport.execute(Self.send, projectId: TestIDs.project, input: Self.sendInput)
        var ids = try await transport.recoveryStates().map(\.requestId)
        XCTAssertTrue(ids.contains(try XCTUnwrap(first["requestId"]?.stringValue)))
        XCTAssertFalse(ids.contains(try XCTUnwrap(second["requestId"]?.stringValue)))

        // Retention ends when its holder lets go.
        retainer = nil
        _ = try await transport.execute(Self.send, projectId: TestIDs.project, input: Self.sendInput)
        ids = try await transport.recoveryStates().map(\.requestId)
        XCTAssertFalse(ids.contains(try XCTUnwrap(first["requestId"]?.stringValue)))
    }

    func testAFullJournalKeepsTheRecordOfARequestInFlight() async throws {
        let http = StubHTTP()
        let gate = Gate()
        let final = try Fixture.recoveryRecord(resolution: "committed", classification: "authorityReceipt", age: 2_000)
        let finalId = try XCTUnwrap(final["requestId"]?.stringValue)
        await http.on(Self.send) { request in
            if request.requestId == finalId { await gate.wait() }
            return Reply.ok(request)
        }
        let records = [final] + (try (1..<ConvoHopTransport.maximumRecords).map { _ in try Fixture.recoveryRecord() })
        let transport = try await Self.makeTransport(http, storage: ScriptedStorage(Self.stored(records)))
        // Resending a committed request asks the authority for its receipt again. Capture plain values: the Xcode 26.6
        // region checker can't analyze a `Self` capture in a `Task`.
        let send = Self.send, input = Self.sendInput
        let resend = Task {
            try await transport.execute(send, projectId: TestIDs.project, input: input, requestId: finalId)
        }
        try await eventually("the resend") { await http.count(Self.send) == 1 }

        let error = await convoHopError {
            try await transport.execute(Self.send, projectId: TestIDs.project, input: Self.sendInput)
        }
        XCTAssertEqual(error?.code, .recoveryLimit)
        gate.open()
        _ = try await resend.value
        _ = try await transport.execute(Self.send, projectId: TestIDs.project, input: Self.sendInput)
        let ids = try await transport.recoveryStates().map(\.requestId)
        XCTAssertFalse(ids.contains(finalId))
    }

    func testARefusalOfEveryAttemptIsRecordedAsRejected() async throws {
        let http = StubHTTP()
        let replies = Shared<[ConvoHopHTTPResponse]>([
            Reply.graphQLError(code: "RATE_LIMITED", status: 429, retryAfter: 2),
            Reply.graphQLError(code: "QUOTA_EXCEEDED", status: 429, retryAfter: 60),
        ])
        await http.on(Self.send) { request in
            replies.update { $0.isEmpty ? Reply.ok(request) : $0.removeFirst() }
        }
        let transport = try await Self.makeTransport(http)
        let limited = uuid(), refused = uuid()
        let limitedError = await convoHopError {
            try await transport.execute(Self.send, projectId: TestIDs.project, input: Self.sendInput, requestId: limited)
        }
        let refusedError = await convoHopError {
            try await transport.execute(Self.send, projectId: TestIDs.project, input: Self.sendInput, requestId: refused)
        }

        XCTAssertEqual(limitedError?.code, .rateLimited)
        XCTAssertEqual(limitedError?.retryAfter, 2)
        XCTAssertEqual(refusedError?.code, .quotaExceeded)
        var states = try await transport.recoveryStates()
        XCTAssertEqual(states.map(\.requestId), [limited, refused])
        XCTAssertEqual(states.map(\.resolutionState), [.rejected, .rejected])
        XCTAssertEqual(states.map(\.lastAttemptClassification), ["RATE_LIMITED", "QUOTA_EXCEEDED"])

        // A retryable refusal can still be resent under its ID; here the resend commits.
        _ = try await transport.execute(Self.send, projectId: TestIDs.project, input: Self.sendInput, requestId: limited)
        states = try await transport.recoveryStates()
        XCTAssertEqual(states.first?.resolutionState, .committed)
        XCTAssertEqual(states.first?.attemptCount, 2)
    }

    func testARefusalAfterAnUncertainAttemptStaysUnknown() async throws {
        let http = StubHTTP()
        let replies = Shared<[ConvoHopHTTPResponse]>([
            Reply.graphQLError(code: "AUTHORITY_UNAVAILABLE", outcome: "unknown", status: 503),
            Reply.graphQLError(code: "RATE_LIMITED", status: 429),
        ])
        await http.on(Self.send) { _ in replies.update { $0.removeFirst() } }
        let transport = try await Self.makeTransport(http)
        let requestId = uuid()
        for _ in 0..<2 {
            _ = await convoHopError {
                try await transport.execute(
                    Self.send, projectId: TestIDs.project, input: Self.sendInput, requestId: requestId)
            }
        }

        // The first attempt may have been applied, so the later refusal isn't the request's outcome.
        let states = try await transport.recoveryStates()
        XCTAssertEqual(states.map(\.resolutionState), [.unknown])
        XCTAssertEqual(states.map(\.lastAttemptClassification), ["RATE_LIMITED"])
    }

    // MARK: Recovery

    func testAnotherIncarnationsRecordNeedsExplicitRecovery() async throws {
        let record = try Fixture.recoveryRecord(incarnation: uuid())
        let requestId = try XCTUnwrap(record["requestId"]?.stringValue)
        let http = StubHTTP()
        let transport = try await Self.makeTransport(http, storage: ScriptedStorage(Self.stored([record])))

        let retried = await convoHopError { try await transport.retry(requestId) }
        XCTAssertEqual(retried?.code, .incarnationMismatch)
        XCTAssertEqual(retried?.outcome, .unknown)
        XCTAssertEqual(retried?.status, 409)
        XCTAssertEqual(retried?.message, "Explicit recovery is required for this incarnation")

        let resent = await convoHopError {
            try await transport.execute(Self.send, projectId: TestIDs.project, input: Self.sendInput, requestId: requestId)
        }
        XCTAssertEqual(resent?.code, .idempotencyConflict)
        XCTAssertEqual(resent?.outcome, .unknown)
        XCTAssertEqual(resent?.message, "Preserve the original request and payload")
        let sent = await http.requests.count
        XCTAssertEqual(sent, 0)
    }

    func testRetryRefusesARecordWhosePayloadChanged() async throws {
        let record = try Fixture.recoveryRecord(fingerprint: "sha256:" + String(repeating: "0", count: 64))
        let requestId = try XCTUnwrap(record["requestId"]?.stringValue)
        let http = StubHTTP()
        await http.on(Self.resolve) { request in
            Reply.ok(request, ["result": Fixture.resolution(requestId, "notObservedYet")])
        }
        await http.on(Self.send) { request in Reply.ok(request) }
        let transport = try await Self.makeTransport(http, storage: ScriptedStorage(Self.stored([record])))
        let error = await convoHopError { try await transport.retry(requestId) }

        XCTAssertEqual(error?.code, .recoveryStorageFailure)
        XCTAssertEqual(error?.outcome, .unknown)
        XCTAssertEqual(error?.message, "Recovery input fingerprint changed")
        let resolved = await http.count(Self.resolve)
        XCTAssertEqual(resolved, 1)
        let resent = await http.count(Self.send)
        XCTAssertEqual(resent, 0)
    }

    func testANativeAdmissionAttemptIsNeverRetried() async throws {
        let input: JSONObject = [
            "liveSessionId": .string(uuid()), "participationId": .string(uuid()), "expectedGeneration": "1",
            "mode": "AUDIO_VIDEO",
        ]
        let record = try Fixture.recoveryRecord(
            operation: Self.credentials, input: input, mediaAdmissionAttempted: true)
        let requestId = try XCTUnwrap(record["requestId"]?.stringValue)
        let http = StubHTTP()
        await http.on(Self.resolve) { request in
            Reply.ok(request, ["result": Fixture.resolution(requestId, "notObservedYet")])
        }
        let transport = try await Self.makeTransport(http, storage: ScriptedStorage(Self.stored([record])))
        let error = await convoHopError { try await transport.retry(requestId) }

        XCTAssertEqual(error?.code, .resolutionRequired)
        XCTAssertEqual(error?.outcome, .unknown)
        XCTAssertEqual(error?.status, 409)
        XCTAssertEqual(
            error?.message, "Previously observed commit or native admission cannot be retried from absent evidence")
        let issued = await http.count(Self.credentials)
        XCTAssertEqual(issued, 0)
    }

    func testMarksANativeAdmissionOnlyAfterACommittedIssuance() async throws {
        func issuance(_ resolution: String) throws -> JSONObject {
            try Fixture.recoveryRecord(
                operation: Self.credentials,
                input: [
                    "liveSessionId": .string(uuid()), "participationId": .string(uuid()), "expectedGeneration": "1",
                    "mode": "AUDIO_ONLY",
                ],
                resolution: resolution)
        }
        let records = [
            try issuance("unknown"), try issuance("committed"), try Fixture.recoveryRecord(resolution: "committed"),
        ]
        let ids = try records.map { try XCTUnwrap($0["requestId"]?.stringValue) }
        let storage = ScriptedStorage(Self.stored(records))
        let transport = try await Self.makeTransport(StubHTTP(), storage: storage)

        let invalid = await thrownError { try await transport.markMediaAdmissionAttempted("not-a-request-id") }
        XCTAssertEqual((invalid as? ConvoHopUsageError)?.message, "Invalid request ID")
        for id in [ids[0], ids[2], uuid()] {
            let refused = await thrownError { try await transport.markMediaAdmissionAttempted(id) }
            XCTAssertEqual(
                (refused as? ConvoHopUsageError)?.message, "Native admission requires a committed credential issuance")
        }
        try await transport.markMediaAdmissionAttempted(ids[1])

        let states = try await transport.recoveryStates()
        XCTAssertEqual(states.map(\.mediaAdmissionAttempted), [false, true, false])
        XCTAssertEqual(states[1].lastAttemptClassification, "nativeAdmissionAttempted")
        XCTAssertEqual(states[1].resolutionState, .committed)
        let snapshots = await storage.snapshots
        XCTAssertEqual(snapshots.count, 1)
        XCTAssertTrue(snapshots.last?.contains(#""mediaAdmissionAttempted":true"#) ?? false)
    }

    func testResolutionMustDescribeTheRequestedIdentity() async throws {
        let target = uuid()
        var mismatched = try XCTUnwrap(Fixture.resolution(target, "committed").objectValue)
        var receipt = try XCTUnwrap(mismatched["receipt"]?.objectValue)
        receipt["requestId"] = .string(uuid())
        mismatched["receipt"] = .object(receipt)
        let results: [JSONValue] = [Fixture.resolution(uuid(), "notObservedYet"), .object(mismatched)]
        for (index, result) in results.enumerated() {
            let http = StubHTTP()
            await http.on(Self.resolve) { request in Reply.ok(request, ["result": result]) }
            let transport = try await Self.makeTransport(http)
            let error = await convoHopError {
                try await transport.execute(Self.resolve, projectId: TestIDs.project, input: ["requestId": .string(target)])
            }
            XCTAssertEqual(error?.code, .invalidResponse, "case \(index)")
            XCTAssertEqual(error?.outcome, .unknown, "case \(index)")
            XCTAssertEqual(error?.status, 503, "case \(index)")
            XCTAssertEqual(error?.message, "Request resolution identity changed", "case \(index)")
        }
    }

    func testResolvingSettlesOnlyTheOriginalProjectsRecord() async throws {
        let record = try Fixture.recoveryRecord()
        let requestId = try XCTUnwrap(record["requestId"]?.stringValue)
        let observed = Shared("accepted")
        let http = StubHTTP()
        await http.on(Self.resolve) { request in
            Reply.ok(request, ["result": Fixture.resolution(requestId, observed.value)])
        }
        let storage = ScriptedStorage(Self.stored([record]))
        let transport = try await Self.makeTransport(http, storage: storage)
        let lookup: JSONObject = ["requestId": .string(requestId)]

        let elsewhere = await convoHopError {
            try await transport.execute(Self.resolve, projectId: TestIDs.otherProject, input: lookup)
        }
        XCTAssertEqual(elsewhere?.code, .resolutionRequired)
        XCTAssertEqual(elsewhere?.message, "Resolve within the original project and incarnation")

        // An accepted observation settles the record, a commit supersedes it, and nothing downgrades a commit.
        for state in ["accepted", "committed", "accepted"] {
            observed.update { $0 = state }
            _ = try await transport.execute(Self.resolve, projectId: TestIDs.project, input: lookup)
        }
        let states = try await transport.recoveryStates()
        XCTAssertEqual(states.map(\.resolutionState), [.committed])
        let snapshots = await storage.snapshots
        XCTAssertEqual(
            try Self.progress(snapshots),
            ["accepted 1 authorityReceipt", "committed 1 authorityReceipt", "committed 1 authorityReceipt"])
    }

    // MARK: Requests

    func testRejectsUnsafeNumbersBeforeRecordingAnything() async throws {
        let storage = ScriptedStorage()
        let http = StubHTTP()
        await http.on(Self.send) { request in Reply.ok(request) }
        let transport = try await Self.makeTransport(http, storage: storage)
        let numbers: [Double] = [9_007_199_254_740_992, -9_007_199_254_740_992, .infinity, -.infinity, .nan]
        for number in numbers {
            let input = Self.sendInput.merging(["props": ["count": .number(number)]]) { $1 }
            let error = await convoHopError {
                try await transport.execute(Self.send, projectId: TestIDs.project, input: input)
            }
            XCTAssertEqual(error?.code, .invalidRequest, "\(number)")
            XCTAssertEqual(error?.outcome, .rejected, "\(number)")
            XCTAssertEqual(error?.status, 400, "\(number)")
            XCTAssertEqual(error?.message, "Request numbers must be finite and within the safe-integer range")
        }

        let sent = await http.requests.count
        XCTAssertEqual(sent, 0)
        let snapshots = await storage.snapshots
        XCTAssertTrue(snapshots.isEmpty)
    }

    func testRejectsRequestsOutsideTheGeneratedOperation() async throws {
        let http = StubHTTP()
        let transport = try await Self.makeTransport(http, storage: ScriptedStorage())
        let unknownField = await convoHopError {
            try await transport.execute(
                Self.send, projectId: TestIDs.project, input: Self.sendInput.merging(["html": "<b>Hello</b>"]) { $1 })
        }
        XCTAssertEqual(unknownField?.code, .invalidRequest)
        XCTAssertEqual(unknownField?.message, "Unknown GraphQL input field")
        let noProject = await convoHopError {
            try await transport.execute(Self.send, projectId: nil, input: Self.sendInput)
        }
        XCTAssertEqual(noProject?.code, .invalidRequest)
        XCTAssertEqual(noProject?.message, "Communication operations require an explicit project")
        let sent = await http.requests.count
        XCTAssertEqual(sent, 0)
    }

    // MARK: Authentication gate

    func testHeldRequestsUseTheReplacementCredential() async throws {
        let http = StubHTTP()
        await http.on(Self.typing) { request in Reply.ok(request, ["status": "ok"]) }
        let transport = try await Self.makeTransport(http)
        await transport.raiseBarrier()
        // Capture plain values: the Xcode 26.6 region checker can't analyze a `Self` capture in a `Task`.
        let operation = Self.typing, input = Self.typingInput
        let pending = Task {
            try await transport.execute(operation, projectId: TestIDs.project, input: input)
        }
        for _ in 0..<50 { await Task.yield() }
        let held = await http.requests.count
        XCTAssertEqual(held, 0)

        await transport.replaceCredential("replacement-token")
        await transport.releaseBarrier()
        _ = try await pending.value
        let authorization = await http.requests.first?.authorization
        XCTAssertEqual(authorization, "Bearer replacement-token")
    }

    func testABlockedGateRefusesRequestsButNotProbes() async throws {
        let clock = TestClock()
        let record = try Fixture.recoveryRecord()
        let requestId = try XCTUnwrap(record["requestId"]?.stringValue)
        let http = StubHTTP()
        await http.on(Self.typing) { request in Reply.ok(request, ["status": "ok"]) }
        await http.on("communication.currentSession") { request in
            Reply.ok(request, ["result": Fixture.session(expiresAt: clock.now + 3_600_000)])
        }
        let transport = try await Self.makeTransport(http, storage: ScriptedStorage(Self.stored([record])), clock: clock)
        _ = try await transport.recoveryStates()
        await transport.setBlocked(true)

        let fresh = await convoHopError {
            try await transport.execute(Self.typing, projectId: TestIDs.project, input: Self.typingInput)
        }
        XCTAssertEqual(fresh?.code, .sessionRefreshRequired)
        XCTAssertEqual(fresh?.outcome, .rejected)
        XCTAssertEqual(fresh?.status, 409)
        let recorded = await convoHopError { try await transport.retry(requestId) }
        XCTAssertEqual(recorded?.code, .sessionRefreshRequired)
        XCTAssertEqual(recorded?.outcome, .unknown)

        let probed = try await transport.probe(
            "communication.currentSession", projectId: TestIDs.project, credential: "probe-token")
        XCTAssertEqual(probed["status"], "ok")
        let requests = await http.requests
        XCTAssertEqual(requests.map(\.key), ["communication.currentSession"])
        XCTAssertEqual(requests.first?.authorization, "Bearer probe-token")
    }

    // MARK: Submission hooks

    func testASubmissionHookRunsOnceTheRequestIsSavedAndBeforeEachAttemptIsCountedAndSent() async throws {
        let storage = ScriptedStorage()
        let http = StubHTTP()
        let requestId = uuid()
        await http.on(Self.send) { _ in throw URLError(.networkConnectionLost) }
        await http.on(Self.resolve) { request in
            Reply.ok(request, ["result": Fixture.resolution(requestId, "notObservedYet")])
        }
        let transport = try await Self.makeTransport(http, storage: storage)
        let send = Self.send, input = Self.sendInput
        let mode = Shared(HookMode.fail)
        let entered = Gate(), gate = Gate()
        let savedAtHook = Shared<[String]>([]), sentAtHook = Shared<[Int]>([])
        let hook = await transport.beforeSubmitting(requestId) {
            let saved = await storage.snapshots.last ?? ""
            let sent = await http.count(send)
            savedAtHook.update { $0.append(saved) }
            sentAtHook.update { $0.append(sent) }
            switch mode.value {
            case .fail: throw HookFailure()
            case .wait:
                entered.open()
                await gate.wait()
            case .proceed: break
            }
        }

        let failed = await thrownError {
            try await transport.execute(send, projectId: TestIDs.project, input: input, requestId: requestId)
        }
        XCTAssertNotNil(failed as? HookFailure)
        let unsent = await http.count(Self.send)
        XCTAssertEqual(unsent, 0, "a failing hook sends nothing")
        let refused = await storage.snapshots
        XCTAssertEqual(try Self.progress(refused), ["pending 0 notSubmitted"])

        mode.update { $0 = .wait }
        let waiting = Task {
            try await transport.execute(send, projectId: TestIDs.project, input: input, requestId: requestId)
        }
        await entered.wait()
        for _ in 0..<20 { await Task.yield() }
        let held = await http.count(Self.send)
        let counted = try await transport.recoveryStates().map(\.attemptCount)
        XCTAssertEqual(held, 0, "the attempt waits for the hook")
        XCTAssertEqual(counted, [0])
        gate.open()
        let lost = await convoHopError { try await waiting.value }
        XCTAssertEqual(lost?.code, .transportUnknown)

        mode.update { $0 = .proceed }
        let retried = await convoHopError { try await transport.retry(requestId) }
        XCTAssertEqual(retried?.code, .transportUnknown)
        await transport.forgetSubmissionHook(requestId, token: hook)
        let unhooked = await convoHopError { try await transport.retry(requestId) }
        XCTAssertEqual(unhooked?.code, .transportUnknown)

        XCTAssertEqual(
            try Self.progress(savedAtHook.value),
            ["pending 0 notSubmitted", "pending 0 notSubmitted", "unknown 1 TRANSPORT_UNKNOWN"],
            "each submission runs the hook once, after its record is saved")
        XCTAssertEqual(sentAtHook.value, [0, 0, 1])
        let sent = await http.count(Self.send)
        XCTAssertEqual(sent, 3)
        let states = try await transport.recoveryStates()
        XCTAssertEqual(states.map(\.attemptCount), [3])
    }

    func testForgettingAReplacedHookKeepsItsReplacement() async throws {
        let http = StubHTTP()
        await http.on(Self.send) { request in Reply.ok(request) }
        let transport = try await Self.makeTransport(http, storage: ScriptedStorage())
        let requestId = uuid()
        let calls = Shared<[String]>([])
        let replaced = await transport.beforeSubmitting(requestId) { calls.update { $0.append("replaced") } }
        _ = await transport.beforeSubmitting(requestId) { calls.update { $0.append("current") } }
        await transport.forgetSubmissionHook(requestId, token: replaced)
        _ = try await transport.execute(
            Self.send, projectId: TestIDs.project, input: Self.sendInput, requestId: requestId)

        XCTAssertEqual(calls.value, ["current"])
    }
}

private struct HookFailure: Error {}

private enum HookMode {
    case fail, wait, proceed
}
