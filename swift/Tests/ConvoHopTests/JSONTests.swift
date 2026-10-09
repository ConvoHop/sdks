import Foundation
import XCTest

@testable import ConvoHop

/// Canonical JSON must match the TypeScript SDK byte for byte, because recovery fingerprints hash it.
final class JSONTests: XCTestCase {
    // The vector in python/tests/test_recovery.py, computed with the TypeScript SDK.
    static let vectorProject = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b"
    static let vectorConversation = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d"
    static let vectorText = "h\u{E9}llo \u{1F44B} \"quoted\" \\ \u{2028}\u{07}\u{7F}\u{08}\u{0C}\n"
    static let vectorProps: JSONObject = [
        "z": [true, nil, 0, -1.5, 9_007_199_254_740_991, 0.1, 1e-7, 0.000001, 123_456_789.125, .number(-Double.zero)],
        "a": ["\u{E9}": "x", "B": [:], "\u{1F600}": "", "\u{FB01}": 1],
    ]
    static let sendFingerprint = "sha256:e4c5c2d4253d3e386fc0b979f71239d1a89d03f3c32777b095e657ac44839b1d"

    static var vectorInput: JSONObject {
        ["conversationId": .string(vectorConversation), "text": .string(vectorText), "props": .object(vectorProps)]
    }

    private func assertBytes(
        _ text: String, _ expected: String, file: StaticString = #filePath, line: UInt = #line
    ) {
        // String equality is canonical equivalence; fingerprints hash the exact UTF-8 bytes.
        XCTAssertEqual(Array(text.utf8), Array(expected.utf8), "\(text) != \(expected)", file: file, line: line)
    }

    func testFingerprintsMatchTheTypeScriptSDK() throws {
        XCTAssertEqual(
            try ConvoHopTransport.fingerprint(
                operation: "communication.sendMessage", projectId: Self.vectorProject, input: Self.vectorInput),
            Self.sendFingerprint)
        XCTAssertEqual(
            try ConvoHopTransport.fingerprint(
                operation: "management.createOrganization", projectId: nil,
                input: ["name": "Original", "termsRef": "fixture"]),
            "sha256:699f78bf950c2b4b01fab09b858df6c301ab0ce397f841e4fac1bc368f42e93b")
        XCTAssertEqual(
            try JSONValue.object(["b": 1, "a": "x"]).fingerprint(),
            "sha256:cdab067e9f3beb32d1252cfd63e492592fecbf591b0d08cadb24bb17f3864246")
    }

    func testCanonicalTextMatchesTheTypeScriptSDK() throws {
        let payload: JSONValue = [
            "operation": "communication.sendMessage", "projectId": .string(Self.vectorProject),
            "input": .object(Self.vectorInput),
        ]
        let expected =
            #"{"input":{"conversationId":"0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d","props":{"a":{"B":{},"\#u{E9}":"x","\#u{1F600}":"","\#u{FB01}":1},"#
            + #""z":[true,null,0,-1.5,9007199254740991,0.1,1e-7,0.000001,123456789.125,0]},"#
            + #""text":"h\#u{E9}llo \#u{1F44B} \"quoted\" \\ \#u{2028}\u0007\#u{7F}\b\f\n"},"#
            + #""operation":"communication.sendMessage","projectId":"6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b"}"#
        assertBytes(try payload.canonicalText(), expected)
        assertBytes(payload.jsonText(), expected)
    }

    func testObjectKeysSortByUTF16CodeUnits() throws {
        // By scalar value U+FB01 sorts before U+1F600; by UTF-16 code unit the surrogate 0xD83D comes first.
        let value: JSONValue = ["\u{FB01}": 1, "\u{1F600}": 2, "B": 3, "\u{E9}": 4, "a": 5, "": 6]
        assertBytes(try value.canonicalText(), "{\"\":6,\"B\":3,\"a\":5,\"\u{E9}\":4,\"\u{1F600}\":2,\"\u{FB01}\":1}")
    }

    func testStringsEscapeLikeJSONStringify() throws {
        let value = JSONValue.string("\u{0}\u{1F}\"\\/\u{7F}\u{2028}\u{2029}\t")
        assertBytes(try value.canonicalText(), #""\u0000\u001f\"\\/\#u{7F}\#u{2028}\#u{2029}\t""#)
    }

    func testNumbersFormatLikeJavaScript() {
        let examples: [(Double, String)] = [
            (0, "0"), (-Double.zero, "0"), (100, "100"), (-1.5, "-1.5"), (0.1, "0.1"), (0.5, "0.5"),
            (0.1 + 0.2, "0.30000000000000004"), (1.0 / 3, "0.3333333333333333"), (4.35, "4.35"),
            (1234.5678, "1234.5678"), (123_456_789.125, "123456789.125"), (0.000001, "0.000001"),
            (0.00001, "0.00001"), (1.5e-6, "0.0000015"), (1e-7, "1e-7"), (-1e-7, "-1e-7"), (5e-7, "5e-7"),
            (-2.5e-8, "-2.5e-8"), (123e-20, "1.23e-18"), (5e-324, "5e-324"), (9_007_199_254_740_991, "9007199254740991"),
            (9_007_199_254_740_992, "9007199254740992"), (1e16, "10000000000000000"), (1e20, "100000000000000000000"),
            (123_456_789_012_345_680_000.0, "123456789012345680000"),
            (999_999_999_999_999_900_000.0, "999999999999999900000"), (9_223_372_036_854_775_808.0, "9223372036854776000"),
            (1e21, "1e+21"), (1.5e300, "1.5e+300"),
            (.greatestFiniteMagnitude, "1.7976931348623157e+308"),
        ]
        for (value, expected) in examples {
            XCTAssertEqual(JSONValue.javaScriptNumber(value), expected, "\(value)")
        }
    }

    func testCanonicalTextRejectsNumbersJSONCannotCarryExactly() {
        for number in [Double.infinity, -.infinity, .nan, 9_007_199_254_740_992, -9_007_199_254_740_992] {
            XCTAssertThrowsError(try JSONValue.number(number).canonicalText(), "\(number)") {
                XCTAssertTrue($0 is UnsafeJSONNumber)
            }
            XCTAssertThrowsError(try JSONValue.object(["a": [1, .number(number)]]).canonicalText(), "\(number)")
        }
        XCTAssertEqual(try JSONValue.number(-9_007_199_254_740_991).canonicalText(), "-9007199254740991")
        let lenient: JSONValue = [.number(.infinity), .number(.nan), 9_007_199_254_740_992]
        XCTAssertEqual(lenient.jsonText(), "[null,null,9007199254740992]")
    }

    func testParsesStrictJSON() throws {
        let text = " {\"a\" :\t[1, -0, 1E+2, 2.5e-3, true, false, null, \"\\u00e9\\ud83d\\ude00\\/\\b\\f\\n\\r\\t\\\"\\\\\"],\r\n\"b\":{}} "
        let value = try JSONParser.parse(text)
        XCTAssertEqual(
            value,
            ["a": [1, 0, 100, 0.0025, true, false, nil, "\u{E9}\u{1F600}/\u{08}\u{0C}\n\r\t\"\\"], "b": [:]])
        XCTAssertEqual(value["a"]?.arrayValue?[1].numberValue?.sign, .minus)
        XCTAssertEqual(try JSONParser.parse("\"x\""), "x")
        XCTAssertEqual(try JSONParser.parse(Data("12".utf8)), 12)
        XCTAssertEqual(try JSONParser.parse("{\"a\":1,\"a\":2}"), ["a": 2], "the last duplicate wins, as in JSON.parse")
    }

    func testLoneSurrogatesBecomeReplacementCharacters() throws {
        XCTAssertEqual(try JSONParser.parse(#""\ud800""#), "\u{FFFD}")
        XCTAssertEqual(try JSONParser.parse(#""\udc00x""#), "\u{FFFD}x")
        XCTAssertEqual(try JSONParser.parse(#""\ud800\u0041""#), "\u{FFFD}A")
        XCTAssertEqual(try JSONParser.parse(#""\ud800\ud800\udc00""#), "\u{FFFD}\u{10000}")
    }

    func testRejectsMalformedJSON() {
        let malformed = [
            "", " ", "{", "[", "[1,]", "{\"a\":1,}", "[01]", "01", "1.", ".5", "+1", "-", "1e", "1e+", "NaN", "Infinity",
            "-Infinity", "tru", "nul", "'a'", "\"a", "\"\\x\"", "\"\\u12\"", "\"\\u12G4\"", "\"a\u{01}b\"", "\"a\tb\"",
            "\u{FEFF}1", "\u{0B}1", "1 2", "{\"a\" 1}", "{a:1}", "[1 2]", "{\"a\":1}x", "[1]]",
        ]
        for text in malformed {
            XCTAssertThrowsError(try JSONParser.parse(text), text.debugDescription) {
                XCTAssertTrue($0 is JSONSyntaxError, text.debugDescription)
            }
        }
        XCTAssertThrowsError(try JSONParser.parse("[1,]")) {
            XCTAssertEqual(($0 as? JSONSyntaxError)?.offset, 3)
        }
    }

    func testLimitsNestingTo256Levels() throws {
        func arrays(_ depth: Int) -> String { String(repeating: "[", count: depth) + String(repeating: "]", count: depth) }
        func objects(_ depth: Int) -> String {
            String(repeating: "{\"a\":", count: depth) + "0" + String(repeating: "}", count: depth)
        }
        XCTAssertEqual(JSONParser.maximumDepth, 256)
        XCTAssertNoThrow(try JSONParser.parse(arrays(256)))
        XCTAssertNoThrow(try JSONParser.parse(objects(256)))
        XCTAssertThrowsError(try JSONParser.parse(arrays(257)))
        XCTAssertThrowsError(try JSONParser.parse(objects(257)))
        XCTAssertNoThrow(try JSONParser.parse("[" + Array(repeating: arrays(255), count: 3).joined(separator: ",") + "]"))
    }

    func testValuesRoundTripThroughTheirText() throws {
        let value: JSONValue = [
            "text": .string(Self.vectorText), "props": .object(Self.vectorProps), "empty": [], "nested": [[[["deep"]]]],
        ]
        XCTAssertEqual(try JSONParser.parse(value.jsonText()), value)
        XCTAssertEqual(try JSONParser.parse(try value.canonicalText()).canonicalText(), try value.canonicalText())

        struct Payload: Codable, Equatable {
            var name: String
            var count: Int
            var tags: [String]
        }
        let payload = Payload(name: "caf\u{E9}", count: 3, tags: ["a", "b"])
        let encoded = try JSONValue.encoding(payload)
        XCTAssertEqual(encoded, ["name": "caf\u{E9}", "count": 3, "tags": ["a", "b"]])
        XCTAssertEqual(try encoded.decoded(as: Payload.self), payload)
    }
}
