import Foundation

/// RFC 3339 date-times as the push payload contract writes them.
package enum RFC3339 {
    /// Milliseconds since the Unix epoch for a date-time with an uppercase `T`, `Z` or an offset, at most nine fraction
    /// digits, a date that exists and no second 60. Digits after the milliseconds are dropped.
    package static func milliseconds(_ text: String) -> Int? {
        let bytes = Array(text.utf8)
        guard bytes.count >= 20, bytes.count <= 35, bytes[4] == UInt8(ascii: "-"), bytes[7] == UInt8(ascii: "-"),
            bytes[10] == UInt8(ascii: "T"), bytes[13] == UInt8(ascii: ":"), bytes[16] == UInt8(ascii: ":")
        else { return nil }
        func number(_ range: Range<Int>) -> Int? {
            var result = 0
            for index in range {
                guard index < bytes.count, (0x30...0x39).contains(bytes[index]) else { return nil }
                result = result * 10 + Int(bytes[index] - 0x30)
            }
            return result
        }
        guard let year = number(0..<4), let month = number(5..<7), let day = number(8..<10),
            let hour = number(11..<13), let minute = number(14..<16), let second = number(17..<19),
            (1...12).contains(month), day >= 1, day <= daysInMonth(year: year, month: month), hour <= 23,
            minute <= 59, second <= 59
        else { return nil }
        var index = 19
        var millisecond = 0
        if bytes[index] == UInt8(ascii: ".") {
            index += 1
            let start = index
            while index < bytes.count, (0x30...0x39).contains(bytes[index]) { index += 1 }
            let digits = index - start
            guard (1...9).contains(digits) else { return nil }
            for offset in 0..<3 {
                millisecond = millisecond * 10 + (offset < digits ? Int(bytes[start + offset] - 0x30) : 0)
            }
        }
        guard index < bytes.count else { return nil }
        var offsetMinutes = 0
        switch bytes[index] {
        case UInt8(ascii: "Z"):
            index += 1
        case UInt8(ascii: "+"), UInt8(ascii: "-"):
            guard bytes.count == index + 6, bytes[index + 3] == UInt8(ascii: ":"),
                let hours = number(index + 1..<index + 3), let minutes = number(index + 4..<index + 6), hours <= 23,
                minutes <= 59
            else { return nil }
            offsetMinutes = (hours * 60 + minutes) * (bytes[index] == UInt8(ascii: "-") ? -1 : 1)
            index += 6
        default:
            return nil
        }
        guard index == bytes.count else { return nil }
        let days = daysFromCivil(year: year, month: month, day: day)
        return (((days * 24 + hour) * 60 + minute) - offsetMinutes) * 60_000 + second * 1000 + millisecond
    }

    /// The instant of `text` as a `Date`, or `nil` when it isn't a valid date-time.
    package static func date(_ text: String) -> Date? {
        milliseconds(text).map { Date(timeIntervalSince1970: Double($0) / 1000) }
    }

    package static func daysInMonth(year: Int, month: Int) -> Int {
        switch month {
        case 2: return (year % 4 == 0 && year % 100 != 0) || year % 400 == 0 ? 29 : 28
        case 4, 6, 9, 11: return 30
        default: return 31
        }
    }

    /// Days since 1970-01-01 in the proleptic Gregorian calendar.
    package static func daysFromCivil(year: Int, month: Int, day: Int) -> Int {
        let y = month <= 2 ? year - 1 : year
        let era = (y >= 0 ? y : y - 399) / 400
        let yearOfEra = y - era * 400
        let dayOfYear = (153 * (month + (month > 2 ? -3 : 9)) + 2) / 5 + day - 1
        let dayOfEra = yearOfEra * 365 + yearOfEra / 4 - yearOfEra / 100 + dayOfYear
        return era * 146_097 + dayOfEra - 719_468
    }
}
