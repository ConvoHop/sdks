import Foundation

/// Output validation and protocol parsers, ported from the TypeScript reference runtime.
enum ProtocolChecks {
    static let nilUUID = "00000000-0000-0000-0000-000000000000"
    static let maximumCounter = "9223372036854775807"

    // MARK: Scalars

    static func isCanonicalUUID(_ value: String) -> Bool {
        let scalars = Array(value.unicodeScalars)
        guard scalars.count == 36 else { return false }
        for (index, scalar) in scalars.enumerated() {
            if [8, 13, 18, 23].contains(index) {
                guard scalar == "-" else { return false }
            } else {
                guard ("0"..."9").contains(scalar) || ("a"..."f").contains(scalar) else { return false }
            }
        }
        return value != nilUUID
    }

    /// `^(0|[1-9][0-9]*)$`.
    static func isDecimalText(_ value: String) -> Bool {
        let scalars = Array(value.unicodeScalars)
        guard let first = scalars.first, scalars.allSatisfy(\.isASCIIDigit) else { return false }
        return first != "0" || scalars.count == 1
    }

    /// A canonical decimal counter no greater than the largest signed 64-bit integer.
    static func isCanonicalDecimal(_ value: String) -> Bool {
        isDecimalText(value) && compareCounters(value, maximumCounter) <= 0
    }

    static func isSafeInteger(_ value: Double) -> Bool {
        value.isFinite && value == value.rounded(.towardZero) && abs(value) <= JSONValue.maximumSafeInteger
    }

    /// Compares canonical decimal counters.
    static func compareCounters(_ left: String, _ right: String) -> Int {
        if left.utf8.count != right.utf8.count { return left.utf8.count < right.utf8.count ? -1 : 1 }
        return left == right ? 0 : (left < right ? -1 : 1)
    }

    private static let patternCache = PatternCache()

    static func matches(_ value: String, pattern: String) -> Bool {
        switch pattern {
        case "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$":
            return isCanonicalUUID(value) || value == nilUUID
        case "^(0|[1-9][0-9]*)$":
            return isDecimalText(value)
        default:
            return patternCache.matches(value, pattern: pattern)
        }
    }

    // MARK: Output shapes

    /// Validates `value` against a generated GraphQL output type. `nil` is a missing field.
    static func validateOutput(_ value: JSONValue?, _ type: String, depth: Int = 0) throws {
        if depth > 16 { throw ProtocolViolation("GraphQL response exceeds its depth bound") }
        var type = type
        let required = type.hasSuffix("!")
        if required { type.removeLast() }
        guard let value, !value.isNull else {
            if required || value == nil { throw ProtocolViolation("Missing GraphQL response field: \(type)") }
            return
        }
        if type.hasPrefix("[") {
            guard case .array(let items) = value, items.count <= 100 else {
                throw ProtocolViolation("Invalid bounded GraphQL list")
            }
            let item = String(type.dropFirst().dropLast())
            for element in items { try validateOutput(element, item, depth: depth + 1) }
            return
        }
        guard let shape = GraphQLCatalog.outputShapes[type] else {
            throw ProtocolViolation("Unknown generated output type: \(type)")
        }
        switch shape {
        case .object(let fields):
            guard case .object(let record) = value else { throw ProtocolViolation("Expected a GraphQL protocol object") }
            if type == "RetainedResult", record.values.filter({ !$0.isNull }).count != 1 {
                throw ProtocolViolation("Retained receipt requires exactly one typed result")
            }
            for field in fields { try validateOutput(record[field.name], field.type, depth: depth + 1) }
        case .enumeration(let values):
            guard case .string(let text) = value, values.contains(text) else { throw ProtocolViolation("Unknown \(type)") }
        case .scalar(let scalar):
            switch scalar.representation {
            case .object:
                guard case .object = value else { throw ProtocolViolation("Expected a GraphQL protocol object") }
            case .boolean:
                guard case .bool = value else { throw ProtocolViolation("Expected GraphQL boolean") }
            case .integer:
                guard case .number(let number) = value, isSafeInteger(number) else {
                    throw ProtocolViolation("Expected safe GraphQL integer")
                }
            case .number:
                guard case .number(let number) = value, number.isFinite else {
                    throw ProtocolViolation("Expected GraphQL number")
                }
            case .string:
                guard case .string(let text) = value else { throw ProtocolViolation("Expected GraphQL \(type) string") }
                if let pattern = scalar.pattern, !matches(text, pattern: pattern) {
                    throw ProtocolViolation("Invalid GraphQL \(type)")
                }
                if let maximum = scalar.maximumDecimal, compareCounters(text, maximum) > 0 {
                    throw ProtocolViolation("Invalid GraphQL decimal")
                }
                if scalar.disallowed.contains(text) { throw ProtocolViolation("Invalid GraphQL \(type)") }
            }
        }
    }

    // MARK: Protocol parsers

    static func object(_ value: JSONValue?) throws -> JSONObject {
        guard case .object(let members)? = value else { throw ProtocolViolation("Invalid protocol object") }
        return members
    }

    static func string(_ value: JSONValue?) throws -> String {
        guard case .string(let text)? = value else { throw ProtocolViolation("Expected a protocol string") }
        return text
    }

    static func id(_ value: JSONValue?) throws -> String {
        let text = try string(value)
        guard isCanonicalUUID(text) else { throw ProtocolViolation("Expected a canonical nonzero UUID") }
        return text
    }

    static func id(_ text: String) throws -> String {
        guard isCanonicalUUID(text) else { throw ProtocolViolation("Expected a canonical nonzero UUID") }
        return text
    }

    static func counter(_ value: JSONValue?) throws -> String {
        let text = try string(value)
        guard isCanonicalDecimal(text) else { throw ProtocolViolation("Expected a canonical decimal counter") }
        return text
    }

    static func counter(_ text: String) throws -> String {
        guard isCanonicalDecimal(text) else { throw ProtocolViolation("Expected a canonical decimal counter") }
        return text
    }

    static func boolean(_ value: JSONValue?) throws -> Bool {
        guard case .bool(let flag)? = value else { throw ProtocolViolation("Expected a protocol boolean") }
        return flag
    }

    /// A UTC millisecond timestamp such as `2026-01-02T03:04:05.678Z`.
    static func timestamp(_ value: JSONValue?) throws -> String {
        let text = try string(value)
        guard millisecondTimestamp(text) != nil else { throw ProtocolViolation("Expected a UTC millisecond timestamp") }
        return text
    }

    /// Milliseconds since the epoch for `YYYY-MM-DDTHH:MM:SS.sssZ`, or `nil` when the text has another form or names
    /// no calendar time.
    static func millisecondTimestamp(_ text: String) -> Int? {
        let bytes = Array(text.utf8)
        guard bytes.count == 24, bytes[4] == 0x2D, bytes[7] == 0x2D, bytes[10] == 0x54, bytes[13] == 0x3A,
            bytes[16] == 0x3A, bytes[19] == 0x2E, bytes[23] == 0x5A
        else { return nil }
        func number(_ range: Range<Int>) -> Int? {
            var result = 0
            for index in range {
                let byte = bytes[index]
                guard (0x30...0x39).contains(byte) else { return nil }
                result = result * 10 + Int(byte - 0x30)
            }
            return result
        }
        guard let year = number(0..<4), let month = number(5..<7), let day = number(8..<10),
            let hour = number(11..<13), let minute = number(14..<16), let second = number(17..<19),
            let millisecond = number(20..<23)
        else { return nil }
        guard (1...12).contains(month), day >= 1, day <= daysInMonth(year: year, month: month), hour <= 23,
            minute <= 59, second <= 59
        else { return nil }
        let days = daysFromCivil(year: year, month: month, day: day)
        return ((days * 24 + hour) * 60 + minute) * 60_000 + second * 1000 + millisecond
    }

    /// Milliseconds since the epoch for any RFC 3339 date-time the push contract accepts, or `nil`.
    static func instant(_ text: String) -> Int? {
        millisecondTimestamp(text) ?? RFC3339.milliseconds(text)
    }

    static func daysInMonth(year: Int, month: Int) -> Int {
        switch month {
        case 2: return (year % 4 == 0 && year % 100 != 0) || year % 400 == 0 ? 29 : 28
        case 4, 6, 9, 11: return 30
        default: return 31
        }
    }

    /// Days since 1970-01-01 in the proleptic Gregorian calendar.
    static func daysFromCivil(year: Int, month: Int, day: Int) -> Int {
        let y = month <= 2 ? year - 1 : year
        let era = (y >= 0 ? y : y - 399) / 400
        let yearOfEra = y - era * 400
        let dayOfYear = (153 * (month + (month > 2 ? -3 : 9)) + 2) / 5 + day - 1
        let dayOfEra = yearOfEra * 365 + yearOfEra / 4 - yearOfEra / 100 + dayOfYear
        return era * 146_097 + dayOfEra - 719_468
    }

    /// Formats milliseconds since the epoch as `YYYY-MM-DDTHH:MM:SS.sssZ`.
    static func formatTimestamp(_ milliseconds: Int) -> String {
        let days = Int((Double(milliseconds) / 86_400_000).rounded(.down))
        let remainder = milliseconds - days * 86_400_000
        let z = days + 719_468
        let era = (z >= 0 ? z : z - 146_096) / 146_097
        let dayOfEra = z - era * 146_097
        let yearOfEra = (dayOfEra - dayOfEra / 1460 + dayOfEra / 36524 - dayOfEra / 146_096) / 365
        let dayOfYear = dayOfEra - (365 * yearOfEra + yearOfEra / 4 - yearOfEra / 100)
        let monthIndex = (5 * dayOfYear + 2) / 153
        let day = dayOfYear - (153 * monthIndex + 2) / 5 + 1
        let month = monthIndex < 10 ? monthIndex + 3 : monthIndex - 9
        let year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0)
        func pad(_ value: Int, _ width: Int) -> String {
            let text = String(value)
            return String(repeating: "0", count: max(0, width - text.count)) + text
        }
        let hour = remainder / 3_600_000, minute = remainder / 60_000 % 60, second = remainder / 1000 % 60
        return "\(pad(year, 4))-\(pad(month, 2))-\(pad(day, 2))T\(pad(hour, 2)):\(pad(minute, 2)):"
            + "\(pad(second, 2)).\(pad(remainder % 1000, 3))Z"
    }

    // MARK: Protocol values

    static func cursor(_ value: JSONValue?) throws -> Cursor {
        let members = try object(value)
        return Cursor(
            incarnation: try id(members["incarnation"]), conversationId: try id(members["conversationId"]),
            sequence: try counter(members["sequence"]))
    }

    struct Page {
        var items: [JSONValue]
        var complete: Bool
        var refreshRequired: Bool
        var nextCursor: JSONValue?
    }

    static func page(_ value: JSONValue?) throws -> Page {
        let members = try object(value)
        guard case .array(let items)? = members["items"], items.count <= 100 else {
            throw ProtocolViolation("Invalid bounded page")
        }
        return Page(
            items: items, complete: try boolean(members["complete"]),
            refreshRequired: try boolean(members["refreshRequired"]), nextCursor: members["nextCursor"])
    }

    struct EventFrame {
        var events: [JSONObject]
        var complete: Bool
        var refreshRequired: Bool
        var nextCursor: Cursor
    }

    /// An event page with its authoritative frontier, ordered after `after`.
    static func eventPage(
        _ value: JSONValue?, incarnation: String, conversationId: String, after: Cursor? = nil
    ) throws -> EventFrame {
        try validateOutput(value, "EventPage")
        let result = try page(value)
        let events = try result.items.map { try object($0) }
        let next = try cursor(result.nextCursor)
        if next.conversationId != conversationId || next.incarnation != incarnation
            || (after.map { compareCounters(next.sequence, $0.sequence) < 0 } ?? false)
        {
            throw ProtocolViolation("Invalid authoritative replay frontier")
        }
        var previous = after?.sequence ?? "0"
        for event in events {
            let sequence = try counter(event["sequence"])
            if try id(event["conversationId"]) != conversationId || compareCounters(sequence, previous) <= 0
                || compareCounters(sequence, next.sequence) > 0
            {
                throw ProtocolViolation("Invalid ordered event scope")
            }
            _ = try id(event["eventId"])
            previous = sequence
        }
        return EventFrame(
            events: events, complete: result.complete, refreshRequired: result.refreshRequired, nextCursor: next)
    }

    static func route(_ value: JSONValue?) throws -> ProjectRoute {
        let members = try object(value)
        return ProjectRoute(
            projectId: try id(members["projectId"]), incarnation: try id(members["incarnation"]),
            servingEpoch: try counter(members["servingEpoch"]), communicationBase: try string(members["communicationBase"]),
            wssUrl: try string(members["wssUrl"]), expiresAt: try timestamp(members["expiresAt"]),
            signature: try string(members["signature"]))
    }

    static func sessionMetadata(_ value: JSONValue?) throws -> Session {
        try validateOutput(value, "Session!")
        let members = try object(value)
        let expiresAt = try timestamp(members["expiresAt"])
        let revision = try counter(members["sessionRevision"])
        guard revision != "0" else { throw ProtocolViolation("Invalid session expiry or revision") }
        return Session(
            sessionId: try id(members["sessionId"]), principalId: try id(members["principalId"]),
            deviceId: try id(members["deviceId"]), incarnation: try id(members["incarnation"]),
            sessionRevision: revision, expiresAt: expiresAt, status: try string(members["status"]))
    }

    /// The session expiry in milliseconds, floored to the second the authority enforces.
    static func sessionExpiry(_ session: Session) -> Int {
        (millisecondTimestamp(session.expiresAt) ?? 0) / 1000 * 1000
    }

    /// The session in a `currentSession` reply, when it proves a current, active session.
    static func currentSession(_ reply: JSONObject, now: Int) throws -> Session {
        let session = try sessionMetadata(reply["result"])
        let serverTime = try timestamp(reply["serverTime"])
        guard reply["status"] == .string("ok"), session.status == "active", sessionExpiry(session) > now,
            sessionExpiry(session) > millisecondTimestamp(serverTime)!
        else { throw ProtocolViolation("Expected current live session authority evidence") }
        return session
    }

    static func sameSession(_ left: Session, _ right: Session) -> Bool {
        left.sessionId == right.sessionId && left.principalId == right.principalId && left.deviceId == right.deviceId
            && left.incarnation == right.incarnation
    }

    /// The canonical origin of an HTTPS base URL, or of explicit loopback HTTP for local development.
    static func origin(_ value: String) throws -> String {
        guard let components = URLComponents(string: value), let scheme = components.scheme?.lowercased(),
            let host = components.host?.lowercased(), !host.isEmpty
        else { throw ProtocolViolation("Use an HTTPS origin, or explicit loopback HTTP for local development") }
        let path = components.percentEncodedPath
        let loopback = ["127.0.0.1", "localhost", "[::1]", "::1"].contains(host)
        guard components.user == nil, components.password == nil, components.query == nil,
            components.fragment == nil, path == "/" || path.isEmpty,
            scheme == "https" || (scheme == "http" && loopback)
        else { throw ProtocolViolation("Use an HTTPS origin, or explicit loopback HTTP for local development") }
        let hostText = host.contains(":") && !host.hasPrefix("[") ? "[\(host)]" : host
        let defaultPort = scheme == "https" ? 443 : 80
        let port = components.port.flatMap { $0 == defaultPort ? nil : $0 }
        return "\(scheme)://\(hostText)" + (port.map { ":\($0)" } ?? "")
    }
}

/// Caches compiled patterns that have no hand-written matcher.
private final class PatternCache: @unchecked Sendable {
    private let lock = NSLock()
    private var compiled: [String: NSRegularExpression] = [:]

    func matches(_ value: String, pattern: String) -> Bool {
        lock.lock()
        defer { lock.unlock() }
        let expression: NSRegularExpression
        if let cached = compiled[pattern] {
            expression = cached
        } else {
            guard let created = try? NSRegularExpression(pattern: pattern) else { return false }
            compiled[pattern] = created
            expression = created
        }
        let range = NSRange(value.startIndex..., in: value)
        return expression.firstMatch(in: value, options: [.anchored], range: range)?.range == range
    }
}
