import Foundation
import XCTest

@testable import ConvoHop

// Live handles keep the recovery records they read again, as packages/client/test/live.test.mjs checks for the Web
// client.

/// A call the test user joined, on a client whose journal already holds `crowd` unanswered message sends. Every
/// mutation's response is lost, so each attempt spends one of its request's three.
private struct CrowdedCall {
    struct ResponseLost: Error {}

    let harness: Harness
    let liveSessionId = uuid()
    let participationId = uuid()

    var client: ConvoHopClient { harness.client }

    static func make(crowd: Int) async throws -> CrowdedCall {
        let records = try (0..<crowd).map { _ in try Fixture.recoveryRecord() }
        let call = CrowdedCall(harness: try await Harness.make(storage: await Fixture.recoveryStorage(records)))
        let clock = call.harness.clock, session = call.session(now: clock.now)
        await call.harness.http.on("communication.liveSession") { request in
            Reply.ok(request, ["result": session], now: clock.now)
        }
        for key in [
            "communication.liveSessionCredentials", "communication.leaveLiveSession", "communication.endLiveSession",
            "communication.sendMessage",
        ] {
            await call.harness.http.on(key) { _ in throw ResponseLost() }
        }
        return call
    }

    /// Sends a message as request `requestId`.
    func message(_ requestId: String) async throws {
        _ = try await client.transport.execute(
            "communication.sendMessage", projectId: TestIDs.project,
            input: ["conversationId": .string(TestIDs.conversation), "text": "Hello"], requestId: requestId)
    }

    /// Whether the journal holds a record of each of `requestIds`.
    func held(_ requestIds: [String]) async throws -> [Bool] {
        let held = Set(try await client.recoveryStates().map(\.requestId))
        return requestIds.map(held.contains)
    }

    /// The number of requests sent so far.
    var sent: Int {
        get async { await harness.http.requests.count }
    }

    private func session(now: Int) -> JSONValue {
        let participation = Fixture.full("LiveParticipation", [
            "participationId": .string(participationId), "principalId": .string(TestIDs.principal),
            "membershipEpoch": "1", "role": "PUBLISHER", "state": "JOINED",
            "permissions": ["microphone": true, "camera": false, "subscribe": true], "nativeConnectionId": .null,
        ])
        return Fixture.full("LiveSession", [
            "liveSessionId": .string(liveSessionId), "conversationId": .string(TestIDs.conversation),
            "creatorId": .string(TestIDs.principal), "kind": "INTERACTIVE", "mediaProfile": "AUDIO_ONLY",
            "state": "ACTIVE", "generation": "1", "revision": "1", "createdAt": .string(timestamp(now - 60_000)),
            "expiresAt": .string(timestamp(now + 3_600_000)), "myParticipation": participation,
        ])
    }
}

/// Sends `request` three times, unanswered each time, which spends its retry budget and so makes its record final.
private func spend(
    isolation: isolated (any Actor)? = #isolation, file: StaticString = #filePath, line: UInt = #line,
    _ request: () async throws -> Void
) async {
    for _ in 0..<ConvoHopTransport.maximumAttempts {
        let error = await convoHopError(file: file, line: line, request)
        XCTAssertEqual(error?.code, .transportUnknown, file: file, line: line)
    }
}

/// Checks that `error` refuses request `requestId` because the journal holds 128 records it may not forget.
private func assertRecoveryLimit(
    _ error: ConvoHopError?, _ requestId: String, file: StaticString = #filePath, line: UInt = #line
) {
    XCTAssertEqual(error?.code, .recoveryLimit, file: file, line: line)
    XCTAssertEqual(error?.requestId, requestId, file: file, line: line)
    XCTAssertEqual(error?.outcome, .rejected, file: file, line: line)
    XCTAssertEqual(error?.status, 409, file: file, line: line)
}

final class LiveRecoveryTests: XCTestCase {
    func testLiveHandlesKeepTheRecordsOfTheRequestsTheyHoldThoughFinalSoAFullJournalRefusesInstead() async throws {
        let call = try await CrowdedCall.make(crowd: ConvoHopTransport.maximumRecords - 3)
        let live = try await call.client.liveSession(call.liveSessionId)
        let joined = try await live.participation()
        let participation = try XCTUnwrap(joined)
        let granted = uuid(), left = uuid(), ended = uuid()
        // The handles read these records again: a credential attempt's budget and admission, the original end revision.
        await spend { _ = try await participation.connectionGrant(requestId: granted) }
        await spend { _ = try await participation.leave(requestId: left) }
        await spend { _ = try await live.end(requestId: ended) }
        let refused = uuid()
        let sent = await call.sent
        assertRecoveryLimit(await convoHopError { try await call.message(refused) }, refused)
        let after = await call.sent
        XCTAssertEqual(after, sent, "nothing is sent")

        // Ending under a new request ID, the handle lets go of the old one, whose record then makes room.
        let ending = uuid()
        let error = await convoHopError { try await live.end(requestId: ending) }
        XCTAssertEqual(error?.code, .transportUnknown)
        let kept = try await call.held([granted, left, ended, ending])
        XCTAssertEqual(kept, [true, true, false, true])
        assertRecoveryLimit(await convoHopError { try await call.message(refused) }, refused)
        withExtendedLifetime(participation) {}
    }

    func testALiveHandleTheAppHasDroppedNoLongerKeepsItsRequestsRecords() async throws {
        let call = try await CrowdedCall.make(crowd: ConvoHopTransport.maximumRecords - 3)
        let live = try await call.client.liveSession(call.liveSessionId)
        let ended = uuid()
        await spend { _ = try await live.end(requestId: ended) }
        var participation = try await live.participation()
        weak var released: LiveParticipationHandle?
        released = participation
        let requestIds = [uuid(), uuid()]
        await spend { _ = try await participation?.connectionGrant(requestId: requestIds[0]) }
        await spend { _ = try await participation?.leave(requestId: requestIds[1]) }
        participation = nil
        XCTAssertNil(released, "the app no longer holds the participation handle")

        let next = [uuid(), uuid()]
        for requestId in next {
            let error = await convoHopError { try await call.message(requestId) }
            XCTAssertEqual(error?.code, .transportUnknown)
        }
        let kept = try await call.held(requestIds + [ended] + next)
        XCTAssertEqual(kept, [false, false, true, true, true])
        // The session handle the app still holds keeps its end request's record.
        let refused = uuid()
        assertRecoveryLimit(await convoHopError { try await call.message(refused) }, refused)
        withExtendedLifetime(live) {}
    }
}
