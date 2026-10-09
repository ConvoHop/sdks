#if canImport(CryptoKit)
    import CryptoKit
#endif
import Foundation
import XCTest

@testable import ConvoHop

final class DigestTests: XCTestCase {
    private func hex(_ bytes: [UInt8]) -> String {
        bytes.map { String(format: "%02x", $0) }.joined()
    }

    func testPortableSHA256MatchesTheFIPS180Examples() {
        let examples: [(message: [UInt8], digest: String)] = [
            ([], "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"),
            (Array("abc".utf8), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"),
            (
                Array("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq".utf8),
                "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1"
            ),
            (
                Array(
                    ("abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmno"
                        + "ijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu").utf8),
                "cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1"
            ),
            (
                [UInt8](repeating: UInt8(ascii: "a"), count: 1_000_000),
                "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0"
            ),
        ]
        for example in examples {
            XCTAssertEqual(hex(PortableSHA256.hash(example.message)), example.digest, "\(example.message.count) bytes")
        }
    }

    #if canImport(CryptoKit)
        /// The lengths cross the padding boundaries: 55 bytes leave room for the length, 56 to 63 need a second block.
        func testPortableSHA256MatchesCryptoKitForEveryLengthUpTo200Bytes() {
            for length in 0...200 {
                let message = (0..<length).map { UInt8(truncatingIfNeeded: $0 &* 151 &+ length) }
                XCTAssertEqual(PortableSHA256.hash(message), Array(SHA256.hash(data: Data(message))), "\(length) bytes")
            }
        }
    #endif

    func testHexDigestIsLowercaseAndCoversTheUTF8Bytes() {
        XCTAssertEqual(sha256Hex(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
        XCTAssertEqual(sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
        XCTAssertEqual(sha256Hex("é"), hex(PortableSHA256.hash([0xC3, 0xA9])))
        XCTAssertEqual(sha256Hex("e\u{301}"), hex(PortableSHA256.hash([0x65, 0xCC, 0x81])))
    }
}
