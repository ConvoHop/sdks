import Foundation
import XCTest

@testable import ConvoHop

/// The scalar, shape and protocol checks every authority response passes, ported from the TypeScript runtime.
final class ProtocolChecksTests: XCTestCase {
    private func violation(
        file: StaticString = #filePath, line: UInt = #line, _ body: () throws -> Void
    ) -> String? {
        do {
            try body()
        } catch let error as ProtocolViolation {
            return error.message
        } catch {
            XCTFail("Expected a protocol violation, not \(error)", file: file, line: line)
            return nil
        }
        XCTFail("Expected a protocol violation", file: file, line: line)
        return nil
    }

    // MARK: Scalars

    func testUUIDsAreCanonicalLowercaseAndNonzero() {
        XCTAssertTrue(ProtocolChecks.isCanonicalUUID("6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b"))
        let rejected = [
            "6F1C2A3B-4D5E-4F60-8A7B-9C0D1E2F3A4B", ProtocolChecks.nilUUID, "6f1c2a3b4d5e4f608a7b9c0d1e2f3a4b",
            "{6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b}", "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4", "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4bc",
            "6f1c2a3g-4d5e-4f60-8a7b-9c0d1e2f3a4b", "6f1c2a3b4-d5e-4f60-8a7b-9c0d1e2f3a4b", "６f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b",
            "",
        ]
        for value in rejected { XCTAssertFalse(ProtocolChecks.isCanonicalUUID(value), value) }
        // The generated UUID pattern admits the nil UUID; the scalar's disallowed list rejects it.
        let pattern = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
        XCTAssertTrue(ProtocolChecks.matches(ProtocolChecks.nilUUID, pattern: pattern))
        XCTAssertFalse(ProtocolChecks.matches(rejected[0], pattern: pattern))
        XCTAssertEqual(violation { _ = try ProtocolChecks.id(.string(ProtocolChecks.nilUUID)) }, "Expected a canonical nonzero UUID")
        XCTAssertEqual(violation { _ = try ProtocolChecks.id(nil) }, "Expected a protocol string")
    }

    func testCountersAreCanonicalDecimalsWithinSigned64Bits() {
        for value in ["0", "7", "10", "9007199254740993", ProtocolChecks.maximumCounter] {
            XCTAssertTrue(ProtocolChecks.isCanonicalDecimal(value), value)
            XCTAssertEqual(try ProtocolChecks.counter(.string(value)), value)
        }
        XCTAssertTrue(ProtocolChecks.isDecimalText("9223372036854775808"))
        XCTAssertFalse(ProtocolChecks.isCanonicalDecimal("9223372036854775808"))
        XCTAssertFalse(ProtocolChecks.isCanonicalDecimal("10000000000000000000"))
        for value in ["", "00", "01", "-1", "+1", "1.0", "1e3", " 1", "1 ", "\u{661}", "\u{FF11}"] {
            XCTAssertFalse(ProtocolChecks.isDecimalText(value), value.debugDescription)
        }
        XCTAssertEqual(violation { _ = try ProtocolChecks.counter(.number(1)) }, "Expected a protocol string")
        XCTAssertEqual(violation { _ = try ProtocolChecks.counter("01") }, "Expected a canonical decimal counter")
    }

    func testCountersCompareByValueNotText() {
        XCTAssertEqual(ProtocolChecks.compareCounters("9", "10"), -1)
        XCTAssertEqual(ProtocolChecks.compareCounters("10", "9"), 1)
        XCTAssertEqual(ProtocolChecks.compareCounters("10", "10"), 0)
        XCTAssertEqual(ProtocolChecks.compareCounters("123", "124"), -1)
        XCTAssertEqual(ProtocolChecks.compareCounters(ProtocolChecks.maximumCounter, "9223372036854775806"), 1)
    }

    func testSafeIntegers() {
        for value: Double in [0, -Double.zero, 1, -9_007_199_254_740_991, 9_007_199_254_740_991] {
            XCTAssertTrue(ProtocolChecks.isSafeInteger(value), "\(value)")
        }
        for value: Double in [9_007_199_254_740_992, -9_007_199_254_740_992, 1.5, -0.5, .infinity, .nan] {
            XCTAssertFalse(ProtocolChecks.isSafeInteger(value), "\(value)")
        }
    }

    // MARK: Timestamps

    func testTimestampsUseTheProlepticGregorianCalendar() {
        // Computed with JavaScript's Date.parse and Date.prototype.toISOString.
        let examples: [(String, Int)] = [
            ("0000-01-01T00:00:00.000Z", -62_167_219_200_000), ("0000-03-01T00:00:00.000Z", -62_162_035_200_000),
            ("1900-01-01T00:00:00.000Z", -2_208_988_800_000), ("1900-03-01T00:00:00.000Z", -2_203_891_200_000),
            ("1969-12-31T23:59:59.999Z", -1), ("1970-01-01T00:00:00.000Z", 0),
            ("2000-02-29T23:59:59.999Z", 951_868_799_999), ("2024-02-29T12:34:56.789Z", 1_709_210_096_789),
            ("2026-01-02T03:04:05.678Z", 1_767_323_045_678), ("9999-12-31T23:59:59.999Z", 253_402_300_799_999),
        ]
        for (text, milliseconds) in examples {
            XCTAssertEqual(ProtocolChecks.millisecondTimestamp(text), milliseconds, text)
            XCTAssertEqual(ProtocolChecks.formatTimestamp(milliseconds), text, text)
        }
        XCTAssertEqual(ProtocolChecks.formatTimestamp(-62_135_596_800_001), "0000-12-31T23:59:59.999Z")
        for milliseconds in stride(from: -62_167_219_200_000, through: 253_402_300_799_999, by: 999_999_999_989) {
            XCTAssertEqual(
                ProtocolChecks.millisecondTimestamp(ProtocolChecks.formatTimestamp(milliseconds)), milliseconds,
                "\(milliseconds)")
        }
    }

    func testTimestampsRejectOtherFormsAndImpossibleTimes() {
        let rejected = [
            "1900-02-29T00:00:00.000Z", "2023-02-29T00:00:00.000Z", "2024-13-01T00:00:00.000Z", "2024-00-01T00:00:00.000Z",
            "2024-04-31T00:00:00.000Z", "2024-01-00T00:00:00.000Z", "2024-01-01T24:00:00.000Z", "2024-01-01T00:60:00.000Z",
            "2024-01-01T00:00:60.000Z", "2024-01-01t00:00:00.000Z", "2024-01-01T00:00:00.000z", "2024-01-01T00:00:00Z",
            "2024-01-01T00:00:00.00Z", "2024-01-01T00:00:00.0000Z", "2024-01-01T00:00:00.000+00:00", "2024-01-01 00:00:00.000Z",
            "+024-01-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z ", "",
        ]
        for text in rejected {
            XCTAssertNil(ProtocolChecks.millisecondTimestamp(text), text)
            XCTAssertEqual(
                violation { _ = try ProtocolChecks.timestamp(.string(text)) }, "Expected a UTC millisecond timestamp", text)
        }
        XCTAssertEqual(try ProtocolChecks.timestamp("2024-02-29T12:34:56.789Z"), "2024-02-29T12:34:56.789Z")
    }

    // MARK: Output shapes

    func testOutputsMustHaveEveryFieldOfTheirGeneratedType() throws {
        let typing = Fixture.full("TypingReply", ["status": "ok", "requestId": .string(uuid())])
        try ProtocolChecks.validateOutput(typing, "TypingReply!")
        try ProtocolChecks.validateOutput(.null, "TypingReply")
        XCTAssertEqual(violation { try ProtocolChecks.validateOutput(.null, "TypingReply!") }, "Missing GraphQL response field: TypingReply")
        XCTAssertEqual(violation { try ProtocolChecks.validateOutput(nil, "TypingReply") }, "Missing GraphQL response field: TypingReply")

        guard case .object(var members) = typing else { return XCTFail("TypingReply is an object") }
        members["serverTime"] = nil
        XCTAssertEqual(
            violation { try ProtocolChecks.validateOutput(.object(members), "TypingReply!") },
            "Missing GraphQL response field: String", "a nullable field must still be present")
        members["serverTime"] = .null
        members["status"] = .null
        XCTAssertEqual(
            violation { try ProtocolChecks.validateOutput(.object(members), "TypingReply!") },
            "Missing GraphQL response field: String")
        XCTAssertEqual(violation { try ProtocolChecks.validateOutput(["a"], "TypingReply!") }, "Expected a GraphQL protocol object")
        XCTAssertEqual(violation { try ProtocolChecks.validateOutput("x", "Nope") }, "Unknown generated output type: Nope")
        XCTAssertEqual(
            violation { try ProtocolChecks.validateOutput("x", "String", depth: 17) }, "GraphQL response exceeds its depth bound")
    }

    func testOutputListsAreBounded() throws {
        let events = (1...100).map { Fixture.event(TestIDs.conversation, String($0)) }
        try ProtocolChecks.validateOutput(.array(events), "[Event!]!")
        XCTAssertEqual(
            violation { try ProtocolChecks.validateOutput(.array(events + [events[0]]), "[Event!]!") },
            "Invalid bounded GraphQL list")
        XCTAssertEqual(violation { try ProtocolChecks.validateOutput(.array([.null]), "[Event!]!") }, "Missing GraphQL response field: Event")
        XCTAssertEqual(violation { try ProtocolChecks.validateOutput(["x"], "[Event!]!") }, "Expected a GraphQL protocol object")
    }

    func testOutputScalarsAndEnumerations() throws {
        try ProtocolChecks.validateOutput(.string(ProtocolChecks.maximumCounter), "Decimal!")
        XCTAssertEqual(violation { try ProtocolChecks.validateOutput("9223372036854775808", "Decimal!") }, "Invalid GraphQL decimal")
        XCTAssertEqual(violation { try ProtocolChecks.validateOutput("01", "Decimal!") }, "Invalid GraphQL Decimal")
        XCTAssertEqual(violation { try ProtocolChecks.validateOutput(1, "Decimal!") }, "Expected GraphQL Decimal string")
        XCTAssertEqual(
            violation { try ProtocolChecks.validateOutput(.string(ProtocolChecks.nilUUID), "UUID!") }, "Invalid GraphQL UUID")
        XCTAssertEqual(
            violation { try ProtocolChecks.validateOutput(.string(TestIDs.project.uppercased()), "UUID!") }, "Invalid GraphQL UUID")
        try ProtocolChecks.validateOutput(9_007_199_254_740_991, "Int!")
        for value: JSONValue in [1.5, 9_007_199_254_740_992, "1"] {
            XCTAssertEqual(violation { try ProtocolChecks.validateOutput(value, "Int!") }, "Expected safe GraphQL integer")
        }
        XCTAssertEqual(violation { try ProtocolChecks.validateOutput("true", "Boolean!") }, "Expected GraphQL boolean")
        try ProtocolChecks.validateOutput([:], "Properties!")
        XCTAssertEqual(violation { try ProtocolChecks.validateOutput([], "Properties!") }, "Expected a GraphQL protocol object")
        try ProtocolChecks.validateOutput("AUDIO_ONLY", "LiveMediaProfile!")
        XCTAssertEqual(violation { try ProtocolChecks.validateOutput("VIDEO_ONLY", "LiveMediaProfile!") }, "Unknown LiveMediaProfile")
        XCTAssertEqual(violation { try ProtocolChecks.validateOutput("audio_only", "LiveMediaProfile!") }, "Unknown LiveMediaProfile")
    }

    func testRetainedResultsHoldExactlyOneTypedResult() throws {
        let ack = Fixture.full("DeliveryAck", ["deliveryId": .string(uuid()), "acknowledged": true])
        try ProtocolChecks.validateOutput(Fixture.full("RetainedResult", ["deliveryAck": ack]), "RetainedResult!")
        let message = "Retained receipt requires exactly one typed result"
        XCTAssertEqual(violation { try ProtocolChecks.validateOutput(Fixture.full("RetainedResult", [:]), "RetainedResult!") }, message)
        XCTAssertEqual(
            violation {
                try ProtocolChecks.validateOutput(
                    Fixture.full("RetainedResult", ["deliveryAck": ack, "signedProof": [:]]), "RetainedResult!")
            }, message)
    }

    // MARK: Event pages

    private func page(
        _ sequences: [String], next: String?, conversationId: String = TestIDs.conversation,
        incarnation: String = TestIDs.incarnation, eventConversationId: String = TestIDs.conversation
    ) -> JSONValue {
        Fixture.full("EventPage", [
            "items": .array(sequences.map { Fixture.event(eventConversationId, $0) }), "complete": true,
            "refreshRequired": false,
            "nextCursor": next.map {
                Fixture.full("Cursor", [
                    "incarnation": .string(incarnation), "conversationId": .string(conversationId), "sequence": .string($0),
                ])
            } ?? .null,
        ])
    }

    private func cursor(_ sequence: String) -> Cursor {
        Cursor(incarnation: TestIDs.incarnation, conversationId: TestIDs.conversation, sequence: sequence)
    }

    private func frame(_ value: JSONValue, after: Cursor? = nil) throws -> ProtocolChecks.EventFrame {
        try ProtocolChecks.eventPage(
            value, incarnation: TestIDs.incarnation, conversationId: TestIDs.conversation, after: after)
    }

    func testEventPagesAreOrderedWithinTheirFrontier() throws {
        let first = try frame(page(["1", "2", "9", "10"], next: "12"))
        XCTAssertEqual(first.events.map { $0["sequence"] }, ["1", "2", "9", "10"])
        XCTAssertEqual(first.nextCursor, cursor("12"))
        XCTAssertTrue(first.complete)
        XCTAssertFalse(first.refreshRequired)
        XCTAssertEqual(try frame(page(["13"], next: "13"), after: cursor("12")).events.count, 1)
        XCTAssertEqual(try frame(page([], next: "12"), after: cursor("12")).events.count, 0)

        let scope = "Invalid ordered event scope"
        XCTAssertEqual(violation { _ = try self.frame(self.page(["2", "2"], next: "3")) }, scope)
        XCTAssertEqual(violation { _ = try self.frame(self.page(["3", "2"], next: "3")) }, scope)
        XCTAssertEqual(violation { _ = try self.frame(self.page(["0"], next: "3")) }, scope)
        XCTAssertEqual(violation { _ = try self.frame(self.page(["4"], next: "3")) }, scope)
        XCTAssertEqual(violation { _ = try self.frame(self.page(["12"], next: "13"), after: self.cursor("12")) }, scope)
        XCTAssertEqual(
            violation { _ = try self.frame(self.page(["1"], next: "3", eventConversationId: TestIDs.otherProject)) }, scope)
    }

    func testEventPagesKeepTheirAuthoritativeFrontier() {
        let frontier = "Invalid authoritative replay frontier"
        XCTAssertEqual(violation { _ = try self.frame(self.page([], next: "11"), after: self.cursor("12")) }, frontier)
        XCTAssertEqual(
            violation { _ = try self.frame(self.page([], next: "1", conversationId: TestIDs.otherProject)) }, frontier)
        XCTAssertEqual(violation { _ = try self.frame(self.page([], next: "1", incarnation: TestIDs.otherProject)) }, frontier)
        XCTAssertNotNil(violation { _ = try self.frame(self.page(["1"], next: nil)) })
        XCTAssertEqual(violation { _ = try self.frame(.null) }, "Invalid protocol object")
    }

    // MARK: Sessions and routes

    private static let now = 1_800_000_000_000

    private func reply(
        _ session: JSONValue, serverTime: Int = ProtocolChecksTests.now, status: JSONValue = "ok"
    ) -> JSONObject {
        ["status": status, "result": session, "serverTime": .string(timestamp(serverTime))]
    }

    func testCurrentSessionsMustBeActiveAndUnexpired() throws {
        let now = Self.now
        let session = try ProtocolChecks.currentSession(reply(Fixture.session(expiresAt: now + 1000)), now: now)
        XCTAssertEqual(session.sessionId, TestIDs.session)
        XCTAssertEqual(session.sessionRevision, "1")

        let stale = "Expected current live session authority evidence"
        // The authority enforces expiry to the second, so 999 milliseconds of grace is already expired.
        XCTAssertEqual(
            violation { _ = try ProtocolChecks.currentSession(self.reply(Fixture.session(expiresAt: now + 999)), now: now) },
            stale)
        XCTAssertEqual(
            violation {
                _ = try ProtocolChecks.currentSession(
                    self.reply(Fixture.session(expiresAt: now + 5000), serverTime: now + 5000), now: now)
            }, stale)
        XCTAssertEqual(
            violation {
                _ = try ProtocolChecks.currentSession(
                    self.reply(Fixture.session(expiresAt: now + 60_000, status: "revoked")), now: now)
            }, stale)
        XCTAssertEqual(
            violation {
                _ = try ProtocolChecks.currentSession(
                    self.reply(Fixture.session(expiresAt: now + 60_000), status: "committed"), now: now)
            }, stale)
        XCTAssertEqual(
            violation {
                _ = try ProtocolChecks.currentSession(
                    self.reply(Fixture.session(revision: "0", expiresAt: now + 60_000)), now: now)
            }, "Invalid session expiry or revision")
        XCTAssertEqual(
            violation { _ = try ProtocolChecks.currentSession(["status": "ok", "result": .null], now: now) },
            "Missing GraphQL response field: Session")
    }

    func testRoutesAreParsedStrictly() throws {
        let route = try ProtocolChecks.route(Fixture.route(now: Self.now, servingEpoch: "7"))
        XCTAssertEqual(route.projectId, TestIDs.project)
        XCTAssertEqual(route.servingEpoch, "7")
        XCTAssertEqual(route.communicationBase, Fixture.baseURL)
        guard case .object(var members) = Fixture.route(now: Self.now) else { return XCTFail("A route is an object") }
        members["servingEpoch"] = "07"
        XCTAssertEqual(violation { _ = try ProtocolChecks.route(.object(members)) }, "Expected a canonical decimal counter")
        members["servingEpoch"] = "7"
        members["signature"] = nil
        XCTAssertEqual(violation { _ = try ProtocolChecks.route(.object(members)) }, "Expected a protocol string")
    }

    // MARK: Origins

    func testOriginsAreHTTPSOrLoopbackHTTP() throws {
        let accepted = [
            "https://API.ConvoHop.test": "https://api.convohop.test",
            "HTTPS://api.convohop.test:443/": "https://api.convohop.test",
            "https://api.convohop.test:8443": "https://api.convohop.test:8443",
            "http://localhost:8080": "http://localhost:8080",
            "http://localhost:80": "http://localhost",
            "http://127.0.0.1": "http://127.0.0.1",
            "http://[::1]:4000": "http://[::1]:4000",
        ]
        for (value, origin) in accepted { XCTAssertEqual(try ProtocolChecks.origin(value), origin, value) }
        let rejected = [
            "http://api.convohop.test", "http://127.0.0.2", "https://user:secret@api.convohop.test",
            "https://user@api.convohop.test", "https://api.convohop.test/graphql", "https://api.convohop.test?x=1",
            "https://api.convohop.test#top", "wss://api.convohop.test", "ftp://api.convohop.test", "api.convohop.test", "",
        ]
        for value in rejected {
            XCTAssertEqual(
                violation { _ = try ProtocolChecks.origin(value) },
                "Use an HTTPS origin, or explicit loopback HTTP for local development", value)
        }
    }
}
