import Foundation
import XCTest

@testable import ConvoHopCalls
@testable import ConvoHopPush

final class CallBookTests: XCTestCase {
    private func ledger() -> ConvoHopNotificationLedger {
        let suite = "com.convohop.tests.\(uuid())"
        addTeardownBlock { UserDefaults.standard.removePersistentDomain(forName: suite) }
        return ConvoHopNotificationLedger(suiteName: suite)
    }

    private func call(
        eventId: String = uuid(), projectId: String = TestIDs.project, recipientId: String = TestIDs.principal,
        alertId: String = uuid(), expiresAt: String = "2026-10-10T12:00:45Z", mediaProfile: String = "AUDIO_VIDEO"
    ) throws -> ConvoHopNotification {
        try ConvoHopNotification(jsonObject: [
            "eventId": eventId, "eventType": "notification.call", "occurredAt": "2026-10-10T11:59:58Z",
            "projectId": projectId, "recipientId": recipientId, "conversationId": TestIDs.conversation,
            "senderId": TestIDs.otherPrincipal, "liveSessionId": TestIDs.session, "alertId": alertId,
            "expiresAt": expiresAt, "mediaProfile": mediaProfile,
        ])
    }

    private func cancellation(alertId: String, reason: String = "ended") throws -> ConvoHopNotification {
        try ConvoHopNotification(jsonObject: [
            "eventId": uuid(), "eventType": "notification.callCancelled", "occurredAt": "2026-10-10T11:59:59Z",
            "projectId": TestIDs.project, "recipientId": TestIDs.principal, "conversationId": TestIDs.conversation,
            "senderId": TestIDs.otherPrincipal, "liveSessionId": TestIDs.session, "alertId": alertId,
            "expiresAt": "2026-10-10T12:00:30Z", "mediaProfile": "AUDIO_VIDEO", "reason": reason,
        ])
    }

    private func message() throws -> ConvoHopNotification {
        try ConvoHopNotification(jsonObject: [
            "eventId": uuid(), "eventType": "notification.message", "occurredAt": "2026-10-10T11:59:55Z",
            "projectId": TestIDs.project, "recipientId": TestIDs.principal, "conversationId": TestIDs.conversation,
            "senderId": TestIDs.otherPrincipal, "messageId": uuid(),
        ])
    }

    private let recipient = ConvoHopPushRecipient.only(projectId: TestIDs.project, recipientId: TestIDs.principal)

    func testIncomingCallRingsDeduplicatesAndRereportsForVoIP() throws {
        var book = CallBook()
        let ledger = ledger()
        let notification = try call()
        let now = Date(timeIntervalSince1970: 1)
        let effects = book.receive(notification, voip: false, recipient: recipient, ledger: ledger, now: now) { _ in "Grace" }
        guard case .ring(let ringing) = effects.first else { return XCTFail("Expected ring") }
        XCTAssertEqual(effects.count, 1)
        XCTAssertEqual(ringing.uuid, notification.callAlert?.uuid)
        XCTAssertEqual(ringing.conversationId, TestIDs.conversation)
        XCTAssertEqual(ringing.liveSessionId, TestIDs.session)
        XCTAssertEqual(ringing.callerId, TestIDs.otherPrincipal)
        XCTAssertEqual(ringing.callerName, "Grace")
        XCTAssertTrue(ringing.hasVideo)
        XCTAssertEqual(book[ringing.uuid]?.state, .ringing)
        XCTAssertTrue(ledger.contains(eventId: notification.eventId))
        XCTAssertTrue(book.receive(notification, voip: false, recipient: recipient, ledger: ledger, now: now) { _ in nil }.isEmpty)
        XCTAssertEqual(book.receive(notification, voip: true, recipient: recipient, ledger: ledger, now: now) { _ in nil }, [.rereport(ringing.uuid)])
    }

    func testFiltersMessagesStoppedAndExpiredRings() throws {
        var book = CallBook()
        let ledger = ledger()
        let fallback = UUID()
        XCTAssertEqual(
            book.receive(nil, voip: true, recipient: recipient, ledger: ledger, now: Date(), callerName: { _ in nil }, makeUUID: { fallback }),
            [.reportEnded(fallback, .failed)]
        )
        XCTAssertTrue(book.receive(try message(), voip: false, recipient: recipient, ledger: ledger, now: Date()) { _ in nil }.isEmpty)
        XCTAssertEqual(book.receive(try message(), voip: true, recipient: recipient, ledger: ledger, now: Date(), callerName: { _ in nil }, makeUUID: { fallback }), [.reportEnded(fallback, .failed)])
        let other = try call(projectId: TestIDs.otherProject)
        XCTAssertEqual(book.receive(other, voip: true, recipient: recipient, ledger: ledger, now: Date(), callerName: { _ in nil }, makeUUID: { fallback }), [.reportEnded(fallback, .failed)])

        let stopped = try call()
        let stoppedAlert = try XCTUnwrap(stopped.callAlert)
        ledger.markStopped(stoppedAlert, reason: .answered)
        XCTAssertTrue(book.receive(stopped, voip: false, recipient: recipient, ledger: ledger, now: Date(timeIntervalSince1970: 1)) { _ in nil }.isEmpty)
        XCTAssertEqual(book.receive(stopped, voip: true, recipient: recipient, ledger: ledger, now: Date(timeIntervalSince1970: 1)) { _ in nil }, [.reportEnded(stoppedAlert.uuid, .answered)])

        let expired = try call(expiresAt: "2000-01-01T00:00:00Z")
        let expiredAlert = try XCTUnwrap(expired.callAlert)
        XCTAssertEqual(book.receive(expired, voip: true, recipient: recipient, ledger: ledger, now: Date()) { _ in nil }, [.reportEnded(expiredAlert.uuid, .expired)])
    }

    func testRingsOnlyForTheRecipient() throws {
        var book = CallBook()
        let ledger = ledger()
        let now = Date(timeIntervalSince1970: 1)
        let fallback = UUID()
        let forOther = try call(recipientId: TestIDs.otherPrincipal)
        XCTAssertEqual(
            book.receive(forOther, voip: true, recipient: recipient, ledger: ledger, now: now, callerName: { _ in nil }, makeUUID: { fallback }),
            [.reportEnded(fallback, .failed)]
        )
        XCTAssertTrue(book.receive(forOther, voip: false, recipient: recipient, ledger: ledger, now: now) { _ in nil }.isEmpty)
        XCTAssertFalse(ledger.contains(eventId: forOther.eventId))

        let signedOut = try call()
        let signedOutAlert = try XCTUnwrap(signedOut.callAlert)
        XCTAssertEqual(
            book.receive(signedOut, voip: true, recipient: .nobody, ledger: ledger, now: now, callerName: { _ in nil }, makeUUID: { fallback }),
            [.reportEnded(fallback, .failed)]
        )
        let cancelled = try cancellation(alertId: signedOutAlert.alertId)
        XCTAssertTrue(book.receive(cancelled, voip: false, recipient: .nobody, ledger: ledger, now: now) { _ in nil }.isEmpty)
        XCTAssertNil(ledger.stopReason(alertId: signedOutAlert.alertId))
        XCTAssertTrue(book.calls.isEmpty)

        let effects = book.receive(forOther, voip: false, recipient: .any, ledger: ledger, now: now, callerName: { _ in nil })
        guard case .ring(let ringing)? = effects.first else { return XCTFail("Expected .any to ring") }
        XCTAssertEqual(ringing.uuid, forOther.callAlert?.uuid)
    }

    func testCancellationStopsRingingAndRecordsReason() throws {
        var book = CallBook()
        let ledger = ledger()
        let incoming = try call()
        let alert = try XCTUnwrap(incoming.callAlert)
        _ = book.receive(incoming, voip: false, recipient: recipient, ledger: ledger, now: Date(timeIntervalSince1970: 1)) { _ in nil }
        let effects = book.receive(try cancellation(alertId: alert.alertId, reason: "ended"), voip: true, recipient: recipient, ledger: ledger, now: Date()) { _ in nil }
        guard case .ended(let ended) = effects.first else { return XCTFail("Expected ended effect") }
        XCTAssertEqual(ended.uuid, alert.uuid)
        XCTAssertEqual(ended.state, .ended(.ended))
        XCTAssertEqual(ledger.stopReason(alertId: alert.alertId), .ended)
        if case .reportEnded(_, .ended) = effects.last {} else { XCTFail("Expected VoIP reportEnded") }
        XCTAssertNil(book.stopRinging(alert.uuid, reason: .expired, ledger: ledger, now: Date()))
    }

    func testStateTransitionsOutgoingResetUpdateAndRemove() throws {
        var book = CallBook()
        let ledger = ledger()
        let incoming = try call(mediaProfile: "AUDIO_ONLY")
        let alert = try XCTUnwrap(incoming.callAlert)
        _ = book.receive(incoming, voip: false, recipient: recipient, ledger: ledger, now: Date(timeIntervalSince1970: 1)) { _ in "Ada" }
        let answered = try XCTUnwrap(book.answer(alert.uuid, ledger: ledger))
        XCTAssertEqual(answered.state, .answered)
        XCTAssertEqual(ledger.stopReason(alertId: alert.alertId), .answered)
        XCTAssertEqual(book.progress(alert.uuid, connected: false)?.state, .connecting)
        XCTAssertEqual(book.progress(alert.uuid, connected: true)?.state, .connected)
        XCTAssertEqual(book.update(alert.uuid, callerName: "Grace", hasVideo: true)?.callerName, "Grace")
        XCTAssertTrue(book.setMuted(alert.uuid, true)?.isMuted ?? false)
        XCTAssertTrue(book.setOnHold(alert.uuid, true)?.isOnHold ?? false)
        XCTAssertEqual(book.userEnded(alert.uuid, ledger: ledger, now: Date())?.state, .ended(nil))
        XCTAssertNil(book.update(alert.uuid, callerName: "Later", hasVideo: false))

        let outgoingId = UUID()
        let outgoing = book.addOutgoing(outgoingId, liveSessionId: TestIDs.session, conversationId: TestIDs.conversation, handle: "handle", callerName: nil, hasVideo: false)
        XCTAssertTrue(outgoing.isOutgoing)
        XCTAssertEqual(outgoing.state, .connecting)
        let ended = book.reset(ledger: ledger, now: Date())
        XCTAssertEqual(ended.map(\.uuid), [outgoingId])
        XCTAssertTrue(book.remove(outgoingId))
        XCTAssertFalse(book.remove(outgoingId))
    }
}
