import Foundation
import XCTest

@testable import ConvoHop

final class TypingIndicatorTests: XCTestCase {
    private static func capabilities(typing: Bool = true) -> JSONValue {
        Fixture.full("Capabilities", [
            "serverRelease": "test", "capabilityRevision": "1", "limitsRevision": "1",
            "features": Fixture.full("Features", [
                "chat": true, "inbox": true, "lexicalSearch": true, "typing": .bool(typing), "webhooks": false,
                "liveSessions": false, "liveBroadcast": false,
            ]),
            "limits": .array([]), "environment": "test", "productionQualified": false, "offerings": .array([]),
            "geos": .array([]), "installationProfiles": .array([]),
        ])
    }

    func testStartStopThrottleAndIdleExpiry() async throws {
        let h = try await Harness.make()
        await h.http.on("communication.capabilities") { request in Reply.ok(request, ["result": Self.capabilities()]) }
        await h.http.on("communication.typing") { request in
            Reply.ok(request, ["result": Fixture.full("TypingStatus", ["accepted": true])])
        }
        let indicator = try ConvoHopTypingIndicator(client: h.client, conversationId: TestIDs.conversation)

        await indicator.textChanged()
        try await eventually { await h.http.count("communication.typing") == 1 }
        let firstTyping = await indicator.isTyping
        XCTAssertTrue(firstTyping)
        await indicator.textChanged()
        let throttledCount = await h.http.count("communication.typing")
        XCTAssertEqual(throttledCount, 1, "typing refresh is throttled")

        try await eventually { h.clock.pendingSleeps == 1 }
        h.clock.advance(by: ConvoHopTypingIndicator.idleTimeout)
        try await eventually { await h.http.count("communication.typing") == 2 }
        let expiredTyping = await indicator.isTyping
        XCTAssertFalse(expiredTyping)
        let requests = await h.http.requests("communication.typing")
        XCTAssertEqual(requests.compactMap { $0.input?["isTyping"]?.boolValue }, [true, false])
        let states = try await h.client.recoveryStates()
        XCTAssertEqual(states, [])
    }

    func testRefreshIntervalAllowsAnotherTypingSignal() async throws {
        let h = try await Harness.make()
        await h.http.on("communication.capabilities") { request in Reply.ok(request, ["result": Self.capabilities()]) }
        await h.http.on("communication.typing") { request in Reply.ok(request, ["result": Fixture.full("TypingStatus", ["accepted": true])]) }
        let indicator = try ConvoHopTypingIndicator(client: h.client, conversationId: TestIDs.conversation)

        await indicator.textChanged()
        try await eventually { await h.http.count("communication.typing") == 1 }
        h.clock.advance(by: ConvoHopTypingIndicator.refreshInterval)
        await indicator.textChanged()
        try await eventually { await h.http.count("communication.typing") == 2 }
        let inputs = await h.http.requests("communication.typing").compactMap { $0.input?["isTyping"]?.boolValue }
        XCTAssertEqual(inputs, [true, true])
    }

    func testUnsupportedTypingSendsNothingButStillExpiresLocally() async throws {
        let h = try await Harness.make()
        await h.http.on("communication.capabilities") { request in Reply.ok(request, ["result": Self.capabilities(typing: false)]) }
        await h.http.on("communication.typing") { request in Reply.ok(request, ["result": Fixture.full("TypingStatus", ["accepted": true])]) }
        let indicator = try ConvoHopTypingIndicator(client: h.client, conversationId: TestIDs.conversation)

        await indicator.textChanged()
        try await eventually { await h.http.count("communication.capabilities") == 1 }
        let typingCount = await h.http.count("communication.typing")
        XCTAssertEqual(typingCount, 0)
        try await eventually { h.clock.pendingSleeps == 1 }
        h.clock.advance(by: ConvoHopTypingIndicator.idleTimeout)
        try await eventually { await indicator.isTyping == false }
        let expiredTyping = await indicator.isTyping
        let states = try await h.client.recoveryStates()
        XCTAssertFalse(expiredTyping)
        XCTAssertEqual(states, [])
    }
}
