import Foundation

/// Why a ring stopped. The set is open: treat a reason you don't know as "stop ringing", without a missed call.
public struct ConvoHopCallEndReason: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
    public let rawValue: String

    public init(rawValue: String) { self.rawValue = rawValue }

    /// The recipient answered, on any device. Only stops the ringing.
    public static let answered = ConvoHopCallEndReason(rawValue: "answered")
    /// The recipient declined, on any device. Only stops the ringing.
    public static let declined = ConvoHopCallEndReason(rawValue: "declined")
    /// The call ended or stopped ringing first: a missed call.
    public static let ended = ConvoHopCallEndReason(rawValue: "ended")
    /// Nobody answered by the ring's deadline: a missed call.
    public static let expired = ConvoHopCallEndReason(rawValue: "expired")
    /// This device couldn't handle the call. ConvoHop never sends it; the SDK and your app use it locally.
    public static let failed = ConvoHopCallEndReason(rawValue: "failed")

    /// Whether the user missed the call.
    public var isMissedCall: Bool { self == .ended || self == .expired }

    public var description: String { rawValue }
}

/// One ring of a call for one recipient. A later ring of the same call has a new `alertId`.
public struct ConvoHopCallAlert: Sendable, Hashable {
    public let liveSessionId: String
    public let alertId: String
    /// When the ring stops if nobody answers. A cancellation carries the stopped ring's original deadline.
    public let expiresAt: Date
    /// `AUDIO_ONLY`, `AUDIO_VIDEO` or a later profile.
    public let mediaProfile: String
    /// The ring's CallKit UUID: `alertId`.
    public let uuid: UUID

    package init?(liveSessionId: String, alertId: String, expiresAt: Date, mediaProfile: String) {
        guard let uuid = UUID(uuidString: alertId) else { return nil }
        self.liveSessionId = liveSessionId
        self.alertId = alertId
        self.expiresAt = expiresAt
        self.mediaProfile = mediaProfile
        self.uuid = uuid
    }

    /// Whether the call starts with video.
    public var hasVideo: Bool { mediaProfile == "AUDIO_VIDEO" }
}

/// A payload that isn't a ConvoHop notification event under the push payload contract.
public enum ConvoHopPushPayloadError: Error, Sendable, Equatable, CustomStringConvertible, LocalizedError {
    /// The payload has no `convohop` object.
    case missing
    /// `convohop` isn't a JSON object.
    case notAnObject
    /// An event type this SDK doesn't know. Ignore the push.
    case unsupportedEventType(String)
    /// A field the event type requires is missing or malformed.
    case invalidField(String)

    public var description: String {
        switch self {
        case .missing: "The payload has no convohop object"
        case .notAnObject: "The convohop payload is not a JSON object"
        case .unsupportedEventType(let type): "Unsupported notification event type \(type)"
        case .invalidField(let field): "Invalid notification field \(field)"
        }
    }

    public var errorDescription: String? { description }
}

/// A ConvoHop notification event from an APNs, PushKit or FCM payload.
///
/// Events carry identifiers and, only when the project opts in to message previews, visible text. Delivery is at
/// least once and unordered: deduplicate on ``eventId`` with ``ConvoHopNotificationLedger``.
public struct ConvoHopNotification: Sendable, Hashable {
    public enum Kind: Sendable, Hashable {
        /// A new message. Open the conversation; fetch the message with the user's session.
        case message(messageId: String)
        /// An incoming call. On iOS, report it to CallKit.
        case call(ConvoHopCallAlert)
        /// A ring stopped. `reason` ``ConvoHopCallEndReason/ended`` and ``ConvoHopCallEndReason/expired`` are missed
        /// calls.
        case callCancelled(ConvoHopCallAlert, reason: ConvoHopCallEndReason)
    }

    public let eventId: String
    /// `notification.message`, `notification.call` or `notification.callCancelled`.
    public let eventType: String
    public let projectId: String
    public let recipientId: String
    public let conversationId: String
    public let senderId: String
    public let occurredAt: Date
    /// The visible title, if the push carries one.
    public let title: String?
    /// The visible body, if the push carries one: your backend's text or, when the project opts in, the message
    /// preview. Absent by default.
    public let body: String?
    public let kind: Kind

    /// The ring, for calls and cancellations.
    public var callAlert: ConvoHopCallAlert? {
        switch kind {
        case .message: nil
        case .call(let alert), .callCancelled(let alert, _): alert
        }
    }

    /// Reads the `convohop` object of a push's `userInfo`, and the visible text of an APNs alert.
    ///
    /// Returns `nil` when the push has no valid `convohop` object or it isn't a notification event this SDK supports.
    /// Fields the contract doesn't define are ignored.
    public init?(userInfo: [AnyHashable: Any]) {
        guard let notification = try? Self.parse(userInfo: userInfo) else { return nil }
        self = notification
    }

    /// Reads a push's `userInfo` like ``init(userInfo:)``, but throws ``ConvoHopPushPayloadError`` when the `convohop`
    /// object is malformed.
    ///
    /// Returns `nil` when the push has no `convohop` object or its event type isn't one this SDK supports.
    public static func parse(userInfo: [AnyHashable: Any]) throws -> ConvoHopNotification? {
        guard let payload = userInfo["convohop"] else { return nil }
        var title: String?
        var body: String?
        if let aps = userInfo["aps"] as? [AnyHashable: Any] {
            if let alert = aps["alert"] as? [AnyHashable: Any] {
                title = alert["title"] as? String
                body = alert["body"] as? String
            } else if let text = aps["alert"] as? String {
                body = text
            }
        }
        do {
            return try Self(payload: payload, alertTitle: title, alertBody: body)
        } catch ConvoHopPushPayloadError.unsupportedEventType {
            return nil
        }
    }

    /// Validates a `convohop` object: a dictionary, or its JSON text as FCM data carries it.
    public init(jsonObject: Any) throws {
        try self.init(payload: jsonObject, alertTitle: nil, alertBody: nil)
    }

    /// Validates the JSON text of a `convohop` object.
    public init(jsonData: Data) throws {
        guard let object = try? JSONSerialization.jsonObject(with: jsonData) else {
            throw ConvoHopPushPayloadError.notAnObject
        }
        try self.init(payload: object, alertTitle: nil, alertBody: nil)
    }

    private init(payload: Any, alertTitle: String?, alertBody: String?) throws {
        var payload = payload
        if let text = payload as? String {
            guard let data = text.data(using: .utf8), let object = try? JSONSerialization.jsonObject(with: data) else {
                throw ConvoHopPushPayloadError.notAnObject
            }
            payload = object
        }
        guard let fields = payload as? [String: Any] else { throw ConvoHopPushPayloadError.notAnObject }
        guard let eventType = fields["eventType"] as? String else {
            throw ConvoHopPushPayloadError.invalidField("eventType")
        }
        self.eventType = eventType
        eventId = try Self.uuid(fields, "eventId")
        projectId = try Self.uuid(fields, "projectId")
        recipientId = try Self.uuid(fields, "recipientId")
        conversationId = try Self.uuid(fields, "conversationId")
        senderId = try Self.uuid(fields, "senderId")
        occurredAt = try Self.timestamp(fields, "occurredAt")
        title = Self.text(fields["title"]) ?? Self.text(alertTitle)
        body = Self.text(fields["body"]) ?? Self.text(alertBody)
        switch eventType {
        case "notification.message":
            kind = .message(messageId: try Self.uuid(fields, "messageId"))
        case "notification.call":
            kind = .call(try Self.alert(fields))
        case "notification.callCancelled":
            kind = .callCancelled(
                try Self.alert(fields), reason: ConvoHopCallEndReason(rawValue: try Self.identifier(fields, "reason")))
        default:
            throw ConvoHopPushPayloadError.unsupportedEventType(eventType)
        }
    }

    private static func alert(_ fields: [String: Any]) throws -> ConvoHopCallAlert {
        let alertId = try uuid(fields, "alertId")
        guard
            let alert = ConvoHopCallAlert(
                liveSessionId: try uuid(fields, "liveSessionId"), alertId: alertId,
                expiresAt: try timestamp(fields, "expiresAt"), mediaProfile: try identifier(fields, "mediaProfile"))
        else { throw ConvoHopPushPayloadError.invalidField("alertId") }
        return alert
    }

    private static func uuid(_ fields: [String: Any], _ key: String) throws -> String {
        guard let text = fields[key] as? String, isUUID(text) else { throw ConvoHopPushPayloadError.invalidField(key) }
        return text
    }

    private static func timestamp(_ fields: [String: Any], _ key: String) throws -> Date {
        guard let text = fields[key] as? String, let date = RFC3339.date(text) else {
            throw ConvoHopPushPayloadError.invalidField(key)
        }
        return date
    }

    private static func identifier(_ fields: [String: Any], _ key: String) throws -> String {
        guard let text = fields[key] as? String, isIdentifier(text) else {
            throw ConvoHopPushPayloadError.invalidField(key)
        }
        return text
    }

    /// Visible text; an empty string is the same as none.
    private static func text(_ value: Any?) -> String? {
        guard let text = value as? String, !text.isEmpty else { return nil }
        return text
    }

    /// A lowercase, hyphenated, non-nil UUID.
    package static func isUUID(_ text: String) -> Bool {
        let bytes = Array(text.utf8)
        guard bytes.count == 36 else { return false }
        var nonZero = false
        for (index, byte) in bytes.enumerated() {
            if index == 8 || index == 13 || index == 18 || index == 23 {
                guard byte == UInt8(ascii: "-") else { return false }
            } else {
                guard (0x30...0x39).contains(byte) || (0x61...0x66).contains(byte) else { return false }
                if byte != UInt8(ascii: "0") { nonZero = true }
            }
        }
        return nonZero
    }

    /// An ASCII letter followed by up to 63 ASCII letters, digits or underscores.
    package static func isIdentifier(_ text: String) -> Bool {
        let bytes = Array(text.utf8)
        guard (1...64).contains(bytes.count) else { return false }
        func letter(_ byte: UInt8) -> Bool { (0x41...0x5A).contains(byte) || (0x61...0x7A).contains(byte) }
        guard letter(bytes[0]) else { return false }
        return bytes.dropFirst().allSatisfy { letter($0) || (0x30...0x39).contains($0) || $0 == UInt8(ascii: "_") }
    }
}

/// Device tokens for your backend. ConvoHop never stores them.
public enum ConvoHopPushToken {
    /// An APNs or PushKit token as lowercase hex, the form APNs requests use.
    public static func hex(_ token: Data) -> String {
        let digits = Array("0123456789abcdef".utf8)
        var bytes = [UInt8]()
        bytes.reserveCapacity(token.count * 2)
        for byte in token {
            bytes.append(digits[Int(byte >> 4)])
            bytes.append(digits[Int(byte & 0x0F)])
        }
        return String(decoding: bytes, as: UTF8.self)
    }
}
