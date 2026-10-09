import Foundation

/// The `convohop` object of a push, checked like the Dart parser does: it follows `$defs/data` in
/// spec/push-payload/push-payload.schema.json. Problems name the field, never its value.
struct ConvoHopPayload {
  static let message = "notification.message"
  static let call = "notification.call"
  static let callCancelled = "notification.callCancelled"

  struct Invalid: Error, CustomStringConvertible {
    let field: String

    var description: String { "convohop.\(field) is invalid" }
  }

  // Anchored with \A and \z: NSRegularExpression's $ also matches before a final newline.
  private static let uuidPattern = pattern(
    "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
  private static let nilUUID = "00000000-0000-0000-0000-000000000000"
  private static let timestampPattern = pattern(
    "([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\\.[0-9]{1,9})?"
      + "(?:Z|([+-])([0-9]{2}):([0-9]{2}))")
  private static let identifierPattern = pattern("[A-Za-z][A-Za-z0-9_]{0,63}")

  /// The object as received, for handing it to Dart.
  let fields: [String: Any]
  let eventType: String
  let eventId: String
  /// Unix seconds.
  let occurredAt: Int64
  let conversationId: String
  let senderId: String
  let title: String?
  let body: String?
  // Rings only.
  let alertId: String?
  /// Unix seconds, for rings.
  let expiresAt: Int64
  let video: Bool
  // Cancellations only.
  let reason: String?

  /// Parses a `convohop` value: an object, or an object as JSON.
  init(_ value: Any?) throws {
    guard let fields = ConvoHopPayload.object(value) else { throw Invalid(field: "json") }
    self.fields = fields
    title = try ConvoHopPayload.text(fields, "title")
    body = try ConvoHopPayload.text(fields, "body")
    guard let type = fields["eventType"] as? String,
      type == ConvoHopPayload.message || type == ConvoHopPayload.call
        || type == ConvoHopPayload.callCancelled
    else { throw Invalid(field: "eventType") }
    eventType = type
    eventId = try ConvoHopPayload.uuid(fields, "eventId")
    occurredAt = try ConvoHopPayload.timestamp(fields, "occurredAt")
    _ = try ConvoHopPayload.uuid(fields, "projectId")
    _ = try ConvoHopPayload.uuid(fields, "recipientId")
    conversationId = try ConvoHopPayload.uuid(fields, "conversationId")
    senderId = try ConvoHopPayload.uuid(fields, "senderId")
    if type == ConvoHopPayload.message {
      _ = try ConvoHopPayload.uuid(fields, "messageId")
      alertId = nil
      expiresAt = 0
      video = false
      reason = nil
      return
    }
    _ = try ConvoHopPayload.uuid(fields, "liveSessionId")
    alertId = try ConvoHopPayload.uuid(fields, "alertId")
    expiresAt = try ConvoHopPayload.timestamp(fields, "expiresAt")
    video = try ConvoHopPayload.identifier(fields, "mediaProfile") == "AUDIO_VIDEO"
    reason =
      type == ConvoHopPayload.callCancelled ? try ConvoHopPayload.identifier(fields, "reason") : nil
  }

  /// The payload, or nil when it's invalid.
  static func tryParse(_ value: Any?) -> ConvoHopPayload? {
    do {
      return try ConvoHopPayload(value)
    } catch {
      NSLog("ConvoHop: ignoring an invalid push: %@", String(describing: error))
      return nil
    }
  }

  /// A `convohop` value as an object: APNs carries an object, and FCM-style data carries JSON.
  static func object(_ value: Any?) -> [String: Any]? {
    if let object = value as? [String: Any] { return object }
    guard let json = value as? String, let data = json.data(using: .utf8) else { return nil }
    return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
  }

  /// Whether the ring's `expiresAt` has passed.
  var expired: Bool { Double(expiresAt) <= Date().timeIntervalSince1970 }

  /// Whether the cancellation tells the user they missed the call.
  var missedCall: Bool { reason == "ended" || reason == "expired" }

  private static func pattern(_ source: String) -> NSRegularExpression {
    // The patterns are constants, so this can't fail.
    return try! NSRegularExpression(pattern: "\\A" + source + "\\z")
  }

  private static func match(_ pattern: NSRegularExpression, _ value: NSString)
    -> NSTextCheckingResult?
  {
    return pattern.firstMatch(
      in: value as String, options: [], range: NSRange(location: 0, length: value.length))
  }

  private static func uuid(_ fields: [String: Any], _ field: String) throws -> String {
    guard let value = fields[field] as? NSString, match(uuidPattern, value) != nil,
      value as String != nilUUID
    else { throw Invalid(field: field) }
    return value as String
  }

  private static func timestamp(_ fields: [String: Any], _ field: String) throws -> Int64 {
    guard let value = fields[field] as? NSString, let seconds = epochSeconds(value) else {
      throw Invalid(field: field)
    }
    return seconds
  }

  private static func identifier(_ fields: [String: Any], _ field: String) throws -> String {
    guard let value = fields[field] as? NSString, match(identifierPattern, value) != nil else {
      throw Invalid(field: field)
    }
    return value as String
  }

  private static func text(_ fields: [String: Any], _ field: String) throws -> String? {
    guard let value = fields[field] else { return nil }
    guard let text = value as? NSString, text.length > 0, wellFormed(text) else {
      throw Invalid(field: field)
    }
    return text as String
  }

  // No lone surrogates: checks the UTF-16 code units, which keep them.
  private static func wellFormed(_ value: NSString) -> Bool {
    var index = 0
    while index < value.length {
      let unit = value.character(at: index)
      if UTF16.isLeadSurrogate(unit) {
        guard index + 1 < value.length, UTF16.isTrailSurrogate(value.character(at: index + 1))
        else { return false }
        index += 2
      } else if UTF16.isTrailSurrogate(unit) {
        return false
      } else {
        index += 1
      }
    }
    return true
  }

  /// Unix seconds of an RFC 3339 timestamp with an uppercase T, and Z or an offset, ignoring any
  /// fraction, or nil when the value isn't one. The date must exist; second 60 isn't accepted.
  static func epochSeconds(_ value: NSString) -> Int64? {
    guard let result = match(timestampPattern, value) else { return nil }
    func group(_ index: Int) -> Int64? {
      let range = result.range(at: index)
      guard range.location != NSNotFound else { return nil }
      return Int64(value.substring(with: range))
    }
    guard let year = group(1), let month = group(2), let day = group(3), let hour = group(4),
      let minute = group(5), let second = group(6)
    else { return nil }
    // Group 7 is the offset's sign, absent for Z.
    let offsetHour = group(8) ?? 0
    let offsetMinute = group(9) ?? 0
    guard (1...12).contains(month), day >= 1, day <= daysIn(year, month), hour <= 23,
      minute <= 59, second <= 59, offsetHour <= 23, offsetMinute <= 59
    else { return nil }
    let local = daysFromCivil(year, month, day) * 86400 + hour * 3600 + minute * 60 + second
    let signRange = result.range(at: 7)
    let sign: Int64 =
      signRange.location != NSNotFound && value.substring(with: signRange) == "-" ? -1 : 1
    return local - sign * (offsetHour * 3600 + offsetMinute * 60)
  }

  private static func daysIn(_ year: Int64, _ month: Int64) -> Int64 {
    if month == 2 { return year % 4 == 0 && (year % 100 != 0 || year % 400 == 0) ? 29 : 28 }
    return month == 4 || month == 6 || month == 9 || month == 11 ? 30 : 31
  }

  // Days since 1970-01-01 in the proleptic Gregorian calendar (Howard Hinnant's algorithm).
  private static func daysFromCivil(_ civilYear: Int64, _ month: Int64, _ day: Int64) -> Int64 {
    let year = month <= 2 ? civilYear - 1 : civilYear
    let era = (year >= 0 ? year : year - 399) / 400
    let yearOfEra = year - era * 400
    let dayOfYear = (153 * (month + (month > 2 ? -3 : 9)) + 2) / 5 + day - 1
    let dayOfEra = yearOfEra * 365 + yearOfEra / 4 - yearOfEra / 100 + dayOfYear
    return era * 146097 + dayOfEra - 719468
  }
}
