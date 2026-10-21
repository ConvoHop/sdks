// Strict decoding of driver-protocol parameters. Failures are protocol errors (INVALID_PARAMS), never SDK results.

struct ParamsError: Error {
    let message: String

    init(_ message: String) {
        self.message = message
    }
}

typealias Args = [String: JSON]

func record(_ value: JSON?, _ name: String) throws -> Args {
    guard case .object(let object)? = value else { throw ParamsError("\(name) must be an object") }
    return object
}

func text(_ args: Args, _ name: String) throws -> String {
    guard case .string(let value)? = args[name] else { throw ParamsError("\(name) must be a string") }
    return value
}

func optionalText(_ args: Args, _ name: String) throws -> String? {
    args[name] == nil ? nil : try text(args, name)
}

func integer(_ args: Args, _ name: String, _ min: Int, _ max: Int) throws -> Int? {
    guard let value = args[name] else { return nil }
    guard case .number(let number) = value, number.rounded(.towardZero) == number,
        abs(number) <= 9_007_199_254_740_991, number >= Double(min), number <= Double(max)
    else { throw ParamsError("\(name) must be an integer in \(min)..\(max)") }
    return Int(number)
}

/// A canonical counter string, `0|[1-9][0-9]{0,18}`.
func counter(_ args: Args, _ name: String) throws -> String? {
    guard let value = try optionalText(args, name) else { return nil }
    guard Counter.isCanonical(value) else { throw ParamsError("\(name) must be a canonical counter string") }
    return value
}

func handle(_ args: Args, _ name: String) throws -> String {
    let value = try text(args, name)
    let scalars = value.unicodeScalars
    guard (1...64).contains(scalars.count), scalars.allSatisfy(isHandleScalar) else {
        throw ParamsError("\(name) must match [A-Za-z0-9._:-]{1,64}")
    }
    return value
}

private func isHandleScalar(_ scalar: Unicode.Scalar) -> Bool {
    switch scalar {
    case "A"..."Z", "a"..."z", "0"..."9", ".", "_", ":", "-": return true
    default: return false
    }
}

/// Canonical decimal counters. They can exceed `Int64`, so they compare as strings.
enum Counter {
    static func isCanonical(_ value: String) -> Bool {
        let digits = value.utf8
        guard (1...19).contains(digits.count), digits.allSatisfy({ (0x30...0x39).contains($0) }) else { return false }
        return digits.count == 1 || digits.first != 0x30
    }

    /// Whether canonical counter `left` is less than canonical counter `right`.
    static func less(_ left: String, _ right: String) -> Bool {
        left.utf8.count != right.utf8.count ? left.utf8.count < right.utf8.count : left < right
    }
}
