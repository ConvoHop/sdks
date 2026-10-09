import Foundation
import XCTest

@testable import ConvoHopPush

final class PushPayloadTests: XCTestCase {
    private struct FixtureRoot {
        let vectors: [[String: Any]]
        let invalidEvents: [[String: Any]]
    }

    private func fixture() throws -> FixtureRoot {
        let url = try XCTUnwrap(Bundle.module.url(forResource: "vectors", withExtension: "json", subdirectory: "Fixtures/push-payload"))
        let data = try Data(contentsOf: url)
        let object = try XCTUnwrap(try JSONSerialization.jsonObject(with: data) as? [String: Any])
        return FixtureRoot(
            vectors: try XCTUnwrap(object["vectors"] as? [[String: Any]]),
            invalidEvents: try XCTUnwrap(object["invalidEvents"] as? [[String: Any]])
        )
    }

    private func payload(_ vector: [String: Any]) -> [AnyHashable: Any] {
        if let expected = vector["expected"] as? [String: Any],
           let apns = expected["apnsAlert"] as? [String: Any],
           let request = apns["request"] as? [String: Any],
           let payload = request["payload"] as? [String: Any] {
            return payload
        }
        return ["convohop": vector["event"] as Any]
    }

    private func fcmPayload(_ vector: [String: Any]) -> [AnyHashable: Any]? {
        guard let expected = vector["expected"] as? [String: Any],
              let fcm = expected["fcm"] as? [String: Any],
              let request = fcm["request"] as? [String: Any],
              let message = request["message"] as? [String: Any],
              let data = message["data"] as? [String: Any],
              let convohop = data["convohop"] as? String
        else { return nil }
        return ["convohop": convohop]
    }

    private func expectedText(_ userInfo: [AnyHashable: Any], key: String) -> String? {
        let convohop: [String: Any]?
        if let text = userInfo["convohop"] as? String, let data = text.data(using: .utf8) {
            convohop = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
        } else {
            convohop = userInfo["convohop"] as? [String: Any]
        }
        if let text = convohop?[key] as? String, !text.isEmpty { return text }
        guard let aps = userInfo["aps"] as? [String: Any], let alert = aps["alert"] else { return nil }
        if let fields = alert as? [String: Any], let text = fields[key] as? String, !text.isEmpty { return text }
        if key == "body", let text = alert as? String, !text.isEmpty { return text }
        return nil
    }

    private func assertNotification(_ notification: ConvoHopNotification, matches event: [String: Any], userInfo: [AnyHashable: Any], file: StaticString = #filePath, line: UInt = #line) throws {
        XCTAssertEqual(notification.eventId, event["eventId"] as? String, file: file, line: line)
        XCTAssertEqual(notification.eventType, event["eventType"] as? String, file: file, line: line)
        XCTAssertEqual(notification.projectId, event["projectId"] as? String, file: file, line: line)
        XCTAssertEqual(notification.recipientId, event["recipientId"] as? String, file: file, line: line)
        XCTAssertEqual(notification.conversationId, event["conversationId"] as? String, file: file, line: line)
        XCTAssertEqual(notification.senderId, event["senderId"] as? String, file: file, line: line)
        XCTAssertEqual(notification.occurredAt, RFC3339.date(try XCTUnwrap(event["occurredAt"] as? String, file: file, line: line)), file: file, line: line)
        XCTAssertEqual(notification.title, expectedText(userInfo, key: "title"), file: file, line: line)
        XCTAssertEqual(notification.body, expectedText(userInfo, key: "body"), file: file, line: line)
        switch (event["eventType"] as? String, notification.kind) {
        case ("notification.message", .message(let messageId)):
            XCTAssertEqual(messageId, event["messageId"] as? String, file: file, line: line)
        case ("notification.call", .call(let alert)):
            try assertAlert(alert, event: event, file: file, line: line)
        case ("notification.callCancelled", .callCancelled(let alert, let reason)):
            try assertAlert(alert, event: event, file: file, line: line)
            XCTAssertEqual(reason.rawValue, event["reason"] as? String, file: file, line: line)
        default:
            XCTFail("Unexpected kind", file: file, line: line)
        }
    }

    private func assertAlert(_ alert: ConvoHopCallAlert, event: [String: Any], file: StaticString, line: UInt) throws {
        XCTAssertEqual(alert.liveSessionId, event["liveSessionId"] as? String, file: file, line: line)
        XCTAssertEqual(alert.alertId, event["alertId"] as? String, file: file, line: line)
        XCTAssertEqual(alert.expiresAt, RFC3339.date(try XCTUnwrap(event["expiresAt"] as? String, file: file, line: line)), file: file, line: line)
        XCTAssertEqual(alert.mediaProfile, event["mediaProfile"] as? String, file: file, line: line)
        XCTAssertEqual(alert.hasVideo, (event["mediaProfile"] as? String) == "AUDIO_VIDEO", file: file, line: line)
        XCTAssertEqual(alert.uuid.uuidString.lowercased(), alert.alertId, file: file, line: line)
    }

    func testParsesEveryPushVectorFromAPNsAndFCMForms() throws {
        for vector in try fixture().vectors {
            let id = vector["id"] as? String ?? "unknown"
            let event = try XCTUnwrap(vector["event"] as? [String: Any], id)
            let userInfo = payload(vector)
            let parsed = try XCTUnwrap(try ConvoHopNotification.parse(userInfo: userInfo), id)
            try assertNotification(parsed, matches: event, userInfo: userInfo)
            let rawUserInfo: [AnyHashable: Any] = ["convohop": try XCTUnwrap(userInfo["convohop"], id)]
            try assertNotification(try ConvoHopNotification(jsonObject: try XCTUnwrap(userInfo["convohop"], id)), matches: event, userInfo: rawUserInfo)
            if let fcm = fcmPayload(vector) {
                let fcmParsed = try XCTUnwrap(try ConvoHopNotification.parse(userInfo: fcm), id)
                try assertNotification(fcmParsed, matches: event, userInfo: fcm)
                let text = try XCTUnwrap(fcm["convohop"] as? String, id)
                try assertNotification(try ConvoHopNotification(jsonData: Data(text.utf8)), matches: event, userInfo: fcm)
            }
        }
    }

    func testInvalidEventsReportTheSourceDefinedError() throws {
        let expected: [String: ConvoHopPushPayloadError] = [
            "uuid-uppercase": .invalidField("recipientId"),
            "uuid-nil": .invalidField("senderId"),
            "timestamp-february-30": .invalidField("occurredAt"),
            "timestamp-2100-february-29": .invalidField("expiresAt"),
            "timestamp-lowercase": .invalidField("occurredAt"),
            "timestamp-leap-second": .invalidField("occurredAt"),
            "timestamp-ten-fraction-digits": .invalidField("occurredAt"),
            "media-profile-hyphen": .invalidField("mediaProfile"),
            "call-without-expires-at": .invalidField("expiresAt"),
            "cancel-without-reason": .invalidField("reason"),
            "unknown-notification-type": .unsupportedEventType("notification.reaction"),
        ]
        for invalid in try fixture().invalidEvents {
            let id = try XCTUnwrap(invalid["id"] as? String)
            let event = try XCTUnwrap(invalid["event"])
            if let error = expected[id] {
                XCTAssertThrowsError(try ConvoHopNotification(jsonObject: event)) { thrown in
                    XCTAssertEqual(thrown as? ConvoHopPushPayloadError, error, id)
                }
            } else {
                XCTAssertNoThrow(try ConvoHopNotification(jsonObject: event), id)
            }
        }
    }

    func testUnsupportedMissingTextJSONAndIdentifierEdges() throws {
        let event = try XCTUnwrap((try fixture().vectors.first { ($0["id"] as? String) == "message-metadata-only" })?["event"] as? [String: Any])
        var unsupported = event
        unsupported["eventType"] = "notification.future"
        XCTAssertNil(try ConvoHopNotification.parse(userInfo: ["convohop": unsupported]))
        XCTAssertThrowsError(try ConvoHopNotification(jsonObject: unsupported)) { error in
            XCTAssertEqual(error as? ConvoHopPushPayloadError, .unsupportedEventType("notification.future"))
        }
        XCTAssertNil(try ConvoHopNotification.parse(userInfo: ["aps": ["alert": "Hello"]]))
        var userInfo: [AnyHashable: Any] = ["aps": ["alert": ["title": "", "body": ""]], "convohop": event]
        let emptyText = try XCTUnwrap(try ConvoHopNotification.parse(userInfo: userInfo))
        XCTAssertNil(emptyText.title)
        XCTAssertNil(emptyText.body)
        userInfo = ["aps": ["alert": "Plain alert"], "convohop": event]
        XCTAssertEqual(try XCTUnwrap(try ConvoHopNotification.parse(userInfo: userInfo)).body, "Plain alert")
        let jsonText = try String(data: JSONSerialization.data(withJSONObject: event, options: [.sortedKeys]), encoding: .utf8).map { $0 } ?? XCTUnwrap(nil)
        XCTAssertNoThrow(try ConvoHopNotification(jsonObject: jsonText))
        XCTAssertThrowsError(try ConvoHopNotification(jsonData: Data("not json".utf8))) { error in
            XCTAssertEqual(error as? ConvoHopPushPayloadError, .notAnObject)
        }
        var bad = event
        bad["eventId"] = (event["eventId"] as? String)?.uppercased()
        XCTAssertThrowsError(try ConvoHopNotification(jsonObject: bad)) { error in
            XCTAssertEqual(error as? ConvoHopPushPayloadError, .invalidField("eventId"))
        }
        bad = event
        bad["eventId"] = "00000000-0000-0000-0000-000000000000"
        XCTAssertThrowsError(try ConvoHopNotification(jsonObject: bad)) { error in
            XCTAssertEqual(error as? ConvoHopPushPayloadError, .invalidField("eventId"))
        }
    }

    func testCallEndReasonAndPushTokenUtilities() {
        XCTAssertTrue(ConvoHopCallEndReason.ended.isMissedCall)
        XCTAssertTrue(ConvoHopCallEndReason.expired.isMissedCall)
        XCTAssertFalse(ConvoHopCallEndReason.answered.isMissedCall)
        XCTAssertFalse(ConvoHopCallEndReason(rawValue: "transferred").isMissedCall)
        XCTAssertEqual(ConvoHopPushToken.hex(Data([0x00, 0x0f, 0x10, 0xab, 0xff])), "000f10abff")
    }
}

final class RFC3339Tests: XCTestCase {
    func testParsesFractionsOffsetsAndRejectsInvalidStrings() {
        XCTAssertEqual(RFC3339.milliseconds("1970-01-01T00:00:00Z"), 0)
        XCTAssertEqual(RFC3339.milliseconds("1970-01-01T00:00:00.1Z"), 100)
        XCTAssertEqual(RFC3339.milliseconds("1970-01-01T00:00:00.1239Z"), 123)
        XCTAssertEqual(RFC3339.milliseconds("2026-10-10T17:29:59.999999999+05:30"), 1_791_633_599_999)
        XCTAssertEqual(RFC3339.milliseconds("1970-01-01T00:30:00+00:30"), 0)
        XCTAssertNil(RFC3339.milliseconds("2026-02-30T12:00:00Z"))
        XCTAssertNil(RFC3339.milliseconds("2026-10-10t11:59:55z"))
        XCTAssertNil(RFC3339.milliseconds("2026-12-31T23:59:60Z"))
        XCTAssertNil(RFC3339.milliseconds("2026-10-10T11:59:58.0000000001Z"))
        XCTAssertEqual(RFC3339.date("1970-01-01T00:00:01Z"), Date(timeIntervalSince1970: 1))
    }
}

final class NotificationLedgerTests: XCTestCase {
    private func ledger(capacity: Int = 512) -> ConvoHopNotificationLedger {
        let suite = "com.convohop.tests.\(uuid())"
        addTeardownBlock { UserDefaults.standard.removePersistentDomain(forName: suite) }
        return ConvoHopNotificationLedger(suiteName: suite, capacity: capacity)
    }

    private func message(_ eventId: String = uuid()) throws -> ConvoHopNotification {
        try ConvoHopNotification(jsonObject: [
            "eventId": eventId, "eventType": "notification.message", "occurredAt": "2026-10-10T11:59:55Z",
            "projectId": TestIDs.project, "recipientId": TestIDs.principal, "conversationId": TestIDs.conversation,
            "senderId": TestIDs.otherPrincipal, "messageId": uuid(),
        ])
    }

    private func call(_ eventId: String = uuid(), alertId: String = uuid(), expiresAt: String = "2026-10-10T12:00:45Z") throws -> ConvoHopNotification {
        try ConvoHopNotification(jsonObject: [
            "eventId": eventId, "eventType": "notification.call", "occurredAt": "2026-10-10T11:59:58Z",
            "projectId": TestIDs.project, "recipientId": TestIDs.principal, "conversationId": TestIDs.conversation,
            "senderId": TestIDs.otherPrincipal, "liveSessionId": uuid(), "alertId": alertId,
            "expiresAt": expiresAt, "mediaProfile": "AUDIO_VIDEO",
        ])
    }

    private func cancellation(_ eventId: String = uuid(), alertId: String = uuid(), reason: String = "ended") throws -> ConvoHopNotification {
        try ConvoHopNotification(jsonObject: [
            "eventId": eventId, "eventType": "notification.callCancelled", "occurredAt": "2026-10-10T11:59:59Z",
            "projectId": TestIDs.project, "recipientId": TestIDs.principal, "conversationId": TestIDs.conversation,
            "senderId": TestIDs.otherPrincipal, "liveSessionId": uuid(), "alertId": alertId,
            "expiresAt": "2026-10-10T12:00:30Z", "mediaProfile": "AUDIO_VIDEO", "reason": reason,
        ])
    }

    func testRecordsDuplicatesContainsAndRemoveAll() throws {
        let ledger = ledger()
        let notification = try message()
        XCTAssertFalse(ledger.contains(eventId: notification.eventId))
        XCTAssertTrue(ledger.record(notification))
        XCTAssertTrue(ledger.contains(eventId: notification.eventId))
        XCTAssertFalse(ledger.record(notification))
        ledger.removeAll()
        XCTAssertFalse(ledger.contains(eventId: notification.eventId))
        XCTAssertTrue(ledger.record(notification))
    }

    func testTrimsToMinimumCapacityOfSixteenAndPersists() throws {
        let suite = "com.convohop.tests.\(uuid())"
        addTeardownBlock { UserDefaults.standard.removePersistentDomain(forName: suite) }
        let first = uuid()
        var ids = [first]
        let ledger = ConvoHopNotificationLedger(suiteName: suite, capacity: 1)
        XCTAssertTrue(ledger.record(try message(first)))
        for _ in 0..<16 {
            let id = uuid()
            ids.append(id)
            XCTAssertTrue(ledger.record(try message(id)))
        }
        XCTAssertFalse(ledger.contains(eventId: first))
        XCTAssertTrue(ConvoHopNotificationLedger(suiteName: suite).contains(eventId: try XCTUnwrap(ids.last)))
    }

    func testStoppedRingsExpiryAndCancellationRecording() throws {
        let ledger = ledger(capacity: 16)
        let incoming = try call()
        let alert = try XCTUnwrap(incoming.callAlert)
        XCTAssertFalse(ledger.isStopped(alert, at: Date(timeIntervalSince1970: 1)))
        XCTAssertTrue(ledger.isStopped(alert, at: alert.expiresAt))
        ledger.markStopped(alert, reason: .answered)
        XCTAssertEqual(ledger.stopReason(alertId: alert.alertId), .answered)
        XCTAssertTrue(ledger.isStopped(alert, at: Date(timeIntervalSince1970: 1)))

        let cancelled = try cancellation(reason: "expired")
        let cancelledAlert = try XCTUnwrap(cancelled.callAlert)
        XCTAssertTrue(ledger.record(cancelled))
        XCTAssertEqual(ledger.stopReason(alertId: cancelledAlert.alertId), .expired)

        let old = try XCTUnwrap(try call(expiresAt: "2000-01-01T00:00:00Z").callAlert)
        ledger.markStopped(old, reason: .failed)
        XCTAssertEqual(ledger.stopReason(alertId: old.alertId), .failed)
        let fresh = try XCTUnwrap(try call().callAlert)
        ledger.markStopped(fresh, reason: .declined)
        XCTAssertNil(ledger.stopReason(alertId: old.alertId))
    }

    func testRecipientDefaultsToAnyPersistsAndSurvivesRemoveAll() throws {
        let suite = "com.convohop.tests.\(uuid())"
        addTeardownBlock { UserDefaults.standard.removePersistentDomain(forName: suite) }
        let ledger = ConvoHopNotificationLedger(suiteName: suite)
        let signedIn = ConvoHopPushRecipient.only(projectId: TestIDs.project, recipientId: TestIDs.principal)
        XCTAssertEqual(ledger.recipient, .any)
        ledger.recipient = signedIn
        XCTAssertEqual(ConvoHopNotificationLedger(suiteName: suite).recipient, signedIn)
        ledger.recipient = .nobody
        XCTAssertTrue(ledger.record(try message()))
        ledger.removeAll()
        XCTAssertEqual(ConvoHopNotificationLedger(suiteName: suite).recipient, .nobody)
        ledger.recipient = .any
        XCTAssertEqual(ConvoHopNotificationLedger(suiteName: suite).recipient, .any)
        XCTAssertEqual(ConvoHopNotificationLedger(suiteName: "com.convohop.tests.\(uuid())").recipient, .any)

        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defaults.set(["projectId": TestIDs.project], forKey: "com.convohop.notificationLedger.recipient")
        XCTAssertEqual(ledger.recipient, .nobody)
        defaults.set("someone", forKey: "com.convohop.notificationLedger.recipient")
        XCTAssertEqual(ledger.recipient, .nobody)
    }

    func testRecipientAcceptsOnlyItsProjectAndUser() throws {
        let notification = try message()
        XCTAssertTrue(ConvoHopPushRecipient.any.accepts(notification))
        XCTAssertTrue(ConvoHopPushRecipient.only(projectId: TestIDs.project, recipientId: TestIDs.principal).accepts(notification))
        XCTAssertFalse(ConvoHopPushRecipient.only(projectId: TestIDs.otherProject, recipientId: TestIDs.principal).accepts(notification))
        XCTAssertFalse(ConvoHopPushRecipient.only(projectId: TestIDs.project, recipientId: TestIDs.otherPrincipal).accepts(notification))
        XCTAssertFalse(ConvoHopPushRecipient.nobody.accepts(notification))
    }
}

#if canImport(UserNotifications)
    final class DeliveredNotificationsTests: XCTestCase {
        func testMatchesTheAlertIdInTheObjectOrItsJSONText() {
            let notifications: [(identifier: String, userInfo: [AnyHashable: Any])] = [
                ("object", ["convohop": ["alertId": "ring-1", "event": "call.ring"]]),
                ("text", ["convohop": #"{"alertId":"ring-1","event":"call.ring"}"#]),
                ("other", ["convohop": ["alertId": "ring-2"]]),
                ("malformed", ["convohop": #"{"alertId":"ring-1""#]),
                ("number", ["convohop": ["alertId": 1]]),
                ("scalar", ["convohop": 42]),
                ("missing", ["aps": ["alert": "Incoming call"], "alertId": "ring-1"]),
            ]
            XCTAssertEqual(ConvoHopDeliveredNotifications.matching("ring-1", in: notifications), ["object", "text"])
            XCTAssertEqual(ConvoHopDeliveredNotifications.matching("ring-2", in: notifications), ["other"])
            XCTAssertEqual(ConvoHopDeliveredNotifications.matching("ring-3", in: notifications), [])
        }
    }
#endif
