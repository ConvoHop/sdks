import CryptoKit
import Foundation

/// A JSON text that is not well formed.
struct JSONSyntaxError: Error, Sendable {
    let offset: Int
}

/// A strict JSON parser. Numbers become doubles, as in JavaScript.
struct JSONParser {
    static let maximumDepth = 256

    private let bytes: [UInt8]
    private var index = 0
    private var depth = 0

    private init(bytes: [UInt8]) {
        self.bytes = bytes
    }

    static func parse(_ text: String) throws -> JSONValue {
        try parse(bytes: Array(text.utf8))
    }

    static func parse(_ data: Data) throws -> JSONValue {
        try parse(bytes: [UInt8](data))
    }

    private static func parse(bytes: [UInt8]) throws -> JSONValue {
        var parser = JSONParser(bytes: bytes)
        parser.skipWhitespace()
        let value = try parser.value()
        parser.skipWhitespace()
        guard parser.index == bytes.count else { throw JSONSyntaxError(offset: parser.index) }
        return value
    }

    private var failure: JSONSyntaxError { JSONSyntaxError(offset: index) }

    private mutating func skipWhitespace() {
        while index < bytes.count, [0x20, 0x09, 0x0A, 0x0D].contains(bytes[index]) { index += 1 }
    }

    private mutating func value() throws -> JSONValue {
        guard index < bytes.count else { throw failure }
        switch bytes[index] {
        case 0x7B: return try object()
        case 0x5B: return try array()
        case 0x22: return .string(try string())
        case 0x74: try literal("true"); return .bool(true)
        case 0x66: try literal("false"); return .bool(false)
        case 0x6E: try literal("null"); return .null
        default: return .number(try number())
        }
    }

    private mutating func nest() throws {
        depth += 1
        if depth > Self.maximumDepth { throw failure }
    }

    private mutating func object() throws -> JSONValue {
        try nest()
        index += 1
        var members: [String: JSONValue] = [:]
        skipWhitespace()
        if index < bytes.count, bytes[index] == 0x7D {
            index += 1
            depth -= 1
            return .object(members)
        }
        while true {
            skipWhitespace()
            guard index < bytes.count, bytes[index] == 0x22 else { throw failure }
            let key = try string()
            skipWhitespace()
            guard index < bytes.count, bytes[index] == 0x3A else { throw failure }
            index += 1
            skipWhitespace()
            members[key] = try value()
            skipWhitespace()
            guard index < bytes.count else { throw failure }
            if bytes[index] == 0x2C { index += 1; continue }
            guard bytes[index] == 0x7D else { throw failure }
            index += 1
            depth -= 1
            return .object(members)
        }
    }

    private mutating func array() throws -> JSONValue {
        try nest()
        index += 1
        var items: [JSONValue] = []
        skipWhitespace()
        if index < bytes.count, bytes[index] == 0x5D {
            index += 1
            depth -= 1
            return .array(items)
        }
        while true {
            skipWhitespace()
            items.append(try value())
            skipWhitespace()
            guard index < bytes.count else { throw failure }
            if bytes[index] == 0x2C { index += 1; continue }
            guard bytes[index] == 0x5D else { throw failure }
            index += 1
            depth -= 1
            return .array(items)
        }
    }

    private mutating func literal(_ word: String) throws {
        let expected = Array(word.utf8)
        guard index + expected.count <= bytes.count, Array(bytes[index..<index + expected.count]) == expected else {
            throw failure
        }
        index += expected.count
    }

    private mutating func digits() -> Int {
        let start = index
        while index < bytes.count, (0x30...0x39).contains(bytes[index]) { index += 1 }
        return index - start
    }

    private mutating func number() throws -> Double {
        let start = index
        if index < bytes.count, bytes[index] == 0x2D { index += 1 }
        guard index < bytes.count else { throw failure }
        if bytes[index] == 0x30 {
            index += 1
        } else if digits() == 0 {
            throw failure
        }
        if index < bytes.count, bytes[index] == 0x2E {
            index += 1
            guard digits() > 0 else { throw failure }
        }
        if index < bytes.count, bytes[index] == 0x65 || bytes[index] == 0x45 {
            index += 1
            if index < bytes.count, bytes[index] == 0x2B || bytes[index] == 0x2D { index += 1 }
            guard digits() > 0 else { throw failure }
        }
        let text = String(decoding: bytes[start..<index], as: UTF8.self)
        guard let value = Double(text) else { throw failure }
        return value
    }

    private mutating func hex4() throws -> UInt32 {
        guard index + 4 <= bytes.count else { throw failure }
        var value: UInt32 = 0
        for byte in bytes[index..<index + 4] {
            value <<= 4
            switch byte {
            case 0x30...0x39: value |= UInt32(byte - 0x30)
            case 0x41...0x46: value |= UInt32(byte - 0x41 + 10)
            case 0x61...0x66: value |= UInt32(byte - 0x61 + 10)
            default: throw failure
            }
        }
        index += 4
        return value
    }

    private mutating func string() throws -> String {
        index += 1
        var buffer: [UInt8] = []
        while index < bytes.count {
            let byte = bytes[index]
            switch byte {
            case 0x22:
                index += 1
                return String(decoding: buffer, as: UTF8.self)
            case 0x5C:
                index += 1
                guard index < bytes.count else { throw failure }
                let escape = bytes[index]
                index += 1
                switch escape {
                case 0x22, 0x5C, 0x2F: buffer.append(escape)
                case 0x62: buffer.append(0x08)
                case 0x66: buffer.append(0x0C)
                case 0x6E: buffer.append(0x0A)
                case 0x72: buffer.append(0x0D)
                case 0x74: buffer.append(0x09)
                case 0x75:
                    var scalar = try hex4()
                    if (0xD800...0xDBFF).contains(scalar) {
                        let mark = index
                        if index + 1 < bytes.count, bytes[index] == 0x5C, bytes[index + 1] == 0x75 {
                            index += 2
                            let low = try hex4()
                            if (0xDC00...0xDFFF).contains(low) {
                                scalar = 0x10000 + ((scalar - 0xD800) << 10) + (low - 0xDC00)
                            } else {
                                index = mark
                                scalar = 0xFFFD
                            }
                        } else {
                            scalar = 0xFFFD
                        }
                    } else if (0xDC00...0xDFFF).contains(scalar) {
                        // Swift strings cannot hold lone surrogates; they become U+FFFD.
                        scalar = 0xFFFD
                    }
                    guard let unicode = Unicode.Scalar(scalar) else { throw failure }
                    Unicode.UTF8.encode(unicode) { buffer.append($0) }
                default:
                    throw failure
                }
            case 0x00..<0x20:
                throw failure
            default:
                buffer.append(byte)
                index += 1
            }
        }
        throw failure
    }
}

/// A number that canonical JSON cannot carry exactly.
struct UnsafeJSONNumber: Error, Sendable {}

extension JSONValue {
    /// The largest integer that JSON numbers carry exactly.
    static let maximumSafeInteger: Double = 9_007_199_254_740_991

    /// Canonical JSON: keys sorted by UTF-16 code unit, JavaScript string escaping and number formatting.
    /// Throws for numbers that are not finite or exceed the safe-integer range.
    func canonicalText() throws -> String {
        var output = ""
        try write(into: &output, canonical: true)
        return output
    }

    /// JSON text in the same form, without the canonical number checks. Non-finite numbers become `null`.
    func jsonText() -> String {
        var output = ""
        try? write(into: &output, canonical: false)
        return output
    }

    private func write(into output: inout String, canonical: Bool) throws {
        switch self {
        case .null:
            output += "null"
        case .bool(let value):
            output += value ? "true" : "false"
        case .number(let value):
            if canonical, !value.isFinite || abs(value) > Self.maximumSafeInteger { throw UnsafeJSONNumber() }
            output += value.isFinite ? Self.javaScriptNumber(value) : "null"
        case .string(let value):
            Self.writeString(value, into: &output)
        case .array(let items):
            output += "["
            for (offset, item) in items.enumerated() {
                if offset > 0 { output += "," }
                try item.write(into: &output, canonical: canonical)
            }
            output += "]"
        case .object(let members):
            output += "{"
            let keys = members.keys.sorted { $0.utf16.lexicographicallyPrecedes($1.utf16) }
            for (offset, key) in keys.enumerated() {
                if offset > 0 { output += "," }
                Self.writeString(key, into: &output)
                output += ":"
                try members[key]!.write(into: &output, canonical: canonical)
            }
            output += "}"
        }
    }

    private static func writeString(_ value: String, into output: inout String) {
        output += "\""
        for scalar in value.unicodeScalars {
            switch scalar {
            case "\"": output += "\\\""
            case "\\": output += "\\\\"
            case "\u{08}": output += "\\b"
            case "\u{0C}": output += "\\f"
            case "\n": output += "\\n"
            case "\r": output += "\\r"
            case "\t": output += "\\t"
            default:
                if scalar.value < 0x20 {
                    let hex = String(scalar.value, radix: 16)
                    output += "\\u" + String(repeating: "0", count: 4 - hex.count) + hex
                } else {
                    output.unicodeScalars.append(scalar)
                }
            }
        }
        output += "\""
    }

    /// Formats a finite double like JavaScript's `Number.prototype.toString`.
    static func javaScriptNumber(_ value: Double) -> String {
        if value == 0 { return "0" }
        if abs(value) <= maximumSafeInteger, value == value.rounded(.towardZero) { return String(Int64(value)) }
        let description = "\(abs(value))"
        let parts = description.lowercased().split(separator: "e", omittingEmptySubsequences: false)
        let exponent = parts.count > 1 ? Int(parts[1]) ?? 0 : 0
        let mantissa = parts[0].split(separator: ".", omittingEmptySubsequences: false)
        let whole = String(mantissa[0]), fraction = mantissa.count > 1 ? String(mantissa[1]) : ""
        var digits = Array(whole + fraction)
        var point = whole.count + exponent
        while digits.first == "0" {
            digits.removeFirst()
            point -= 1
        }
        while digits.last == "0" { digits.removeLast() }
        if digits.isEmpty { return "0" }
        let count = digits.count
        let text: String
        if count <= point, point <= 21 {
            text = String(digits) + String(repeating: "0", count: point - count)
        } else if 0 < point, point <= 21 {
            text = String(digits[..<point]) + "." + String(digits[point...])
        } else if -6 < point, point <= 0 {
            text = "0." + String(repeating: "0", count: -point) + String(digits)
        } else {
            let power = point - 1
            let sign = power >= 0 ? "+" : "-"
            let head = count == 1 ? String(digits[0]) : String(digits[0]) + "." + String(digits[1...])
            text = head + "e" + sign + String(abs(power))
        }
        return (value < 0 ? "-" : "") + text
    }

    /// `sha256:` and the lowercase hex SHA-256 digest of the canonical text.
    func fingerprint() throws -> String {
        let digest = SHA256.hash(data: Data(try canonicalText().utf8))
        return "sha256:" + digest.map { byte in
            let hex = String(byte, radix: 16)
            return byte < 0x10 ? "0" + hex : hex
        }.joined()
    }

    /// The JSON form of an encodable value.
    static func encoding<T: Encodable>(_ value: T) throws -> JSONValue {
        try JSONParser.parse(JSONEncoder().encode(value))
    }

    /// Decodes this JSON into a decodable type.
    func decoded<T: Decodable>(as type: T.Type) throws -> T {
        try JSONDecoder().decode(type, from: Data(jsonText().utf8))
    }
}

extension JSONValue {
    /// The member of an object, or `nil` for other values and missing members.
    public subscript(key: String) -> JSONValue? {
        if case .object(let members) = self { return members[key] }
        return nil
    }

    /// The string, or `nil` for other values.
    public var stringValue: String? {
        if case .string(let value) = self { return value }
        return nil
    }

    /// The boolean, or `nil` for other values.
    public var boolValue: Bool? {
        if case .bool(let value) = self { return value }
        return nil
    }

    /// The number, or `nil` for other values.
    public var numberValue: Double? {
        if case .number(let value) = self { return value }
        return nil
    }

    /// The members of an object, or `nil` for other values.
    public var objectValue: JSONObject? {
        if case .object(let value) = self { return value }
        return nil
    }

    /// The items of an array, or `nil` for other values.
    public var arrayValue: [JSONValue]? {
        if case .array(let value) = self { return value }
        return nil
    }

    /// Whether this is JSON `null`.
    public var isNull: Bool {
        if case .null = self { return true }
        return false
    }
}

extension JSONValue: ExpressibleByStringLiteral, ExpressibleByBooleanLiteral, ExpressibleByIntegerLiteral,
    ExpressibleByFloatLiteral, ExpressibleByArrayLiteral, ExpressibleByDictionaryLiteral, ExpressibleByNilLiteral
{
    public init(stringLiteral value: String) { self = .string(value) }
    public init(booleanLiteral value: Bool) { self = .bool(value) }
    public init(integerLiteral value: Int) { self = .number(Double(value)) }
    public init(floatLiteral value: Double) { self = .number(value) }
    public init(arrayLiteral elements: JSONValue...) { self = .array(elements) }
    public init(dictionaryLiteral elements: (String, JSONValue)...) {
        self = .object(Dictionary(elements, uniquingKeysWith: { _, last in last }))
    }
    public init(nilLiteral: ()) { self = .null }
}
