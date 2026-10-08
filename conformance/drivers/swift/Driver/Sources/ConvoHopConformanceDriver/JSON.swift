import Foundation

/// A protocol message value. The driver keeps its own type so protocol framing never depends on SDK internals.
enum JSON: Sendable, Equatable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([JSON])
    case object([String: JSON])

    static func parse(_ data: Data) throws -> JSON {
        try JSONDecoder().decode(JSON.self, from: data)
    }

    var rendered: String {
        var output = ""
        render(into: &output)
        return output
    }

    private func render(into output: inout String) {
        switch self {
        case .null:
            output += "null"
        case .bool(let value):
            output += value ? "true" : "false"
        case .number(let value):
            output += Self.number(value)
        case .string(let value):
            Self.quote(value, into: &output)
        case .array(let values):
            output += "["
            for (index, value) in values.enumerated() {
                if index > 0 { output += "," }
                value.render(into: &output)
            }
            output += "]"
        case .object(let values):
            output += "{"
            for (index, key) in values.keys.sorted().enumerated() {
                if index > 0 { output += "," }
                Self.quote(key, into: &output)
                output += ":"
                values[key]!.render(into: &output)
            }
            output += "}"
        }
    }

    // JSON has no non-finite numbers; like JSON.stringify, they become null. Safe integers print without a fraction.
    private static func number(_ value: Double) -> String {
        guard value.isFinite else { return "null" }
        if value.rounded(.towardZero) == value, abs(value) <= 9_007_199_254_740_991 { return String(Int64(value)) }
        return "\(value)"
    }

    private static func quote(_ value: String, into output: inout String) {
        output += "\""
        for scalar in value.unicodeScalars {
            switch scalar {
            case "\"": output += "\\\""
            case "\\": output += "\\\\"
            case "\n": output += "\\n"
            case "\r": output += "\\r"
            case "\t": output += "\\t"
            case "\u{08}": output += "\\b"
            case "\u{0C}": output += "\\f"
            case _ where scalar.value < 0x20:
                let hex = String(scalar.value, radix: 16)
                output += "\\u" + String(repeating: "0", count: 4 - hex.count) + hex
            default: output.unicodeScalars.append(scalar)
            }
        }
        output += "\""
    }
}

extension JSON: Decodable {
    init(from decoder: any Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([JSON].self) {
            self = .array(value)
        } else {
            self = .object(try container.decode([String: JSON].self))
        }
    }
}

extension JSON: ExpressibleByStringLiteral, ExpressibleByBooleanLiteral, ExpressibleByArrayLiteral,
    ExpressibleByDictionaryLiteral, ExpressibleByNilLiteral
{
    init(stringLiteral value: String) { self = .string(value) }
    init(booleanLiteral value: Bool) { self = .bool(value) }
    init(arrayLiteral elements: JSON...) { self = .array(elements) }
    init(nilLiteral: ()) { self = .null }

    init(dictionaryLiteral elements: (String, JSON)...) {
        self = .object(Dictionary(elements, uniquingKeysWith: { _, last in last }))
    }
}
