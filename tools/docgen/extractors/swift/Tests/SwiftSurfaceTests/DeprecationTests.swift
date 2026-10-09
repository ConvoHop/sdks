import XCTest

@testable import SwiftSurface

final class DeprecationTests: XCTestCase {
    func testWritesTheMessageOrTheReplacementAndDropsTheAttribute() throws {
        let package = try demo(
            #"""
            public struct Client {
                @available(*, deprecated, message: "Use \"send(_:)\" with ``Client``.")
                public func post() {}
                @available(*, deprecated, renamed: "send(_:)")
                public func transmit() {}
                @available(*, deprecated, renamed: "send(_:)", message: "Prefer sending.")
                public func push() {}
                @available(*, deprecated)
                public func old() {}
                @available(iOS 15, *)
                @available(*, deprecated, message: "Stacked.")
                public func stacked() {}
                public func send(_ text: String) {}
            }
            @available(*, deprecated, renamed: "Client")
            public struct OldClient {}
            """#)
        let client = try package.symbol("Client")
        XCTAssertEqual(try client.member("post").deprecated, #"Use "send(_:)" with `Client`."#)
        XCTAssertEqual(try client.member("post").signatures, ["public func post()"])
        XCTAssertEqual(try client.member("transmit").deprecated, "Use `send(_:)` instead.")
        XCTAssertEqual(try client.member("push").deprecated, "Prefer sending.")
        XCTAssertEqual(try client.member("old").deprecated, "")
        XCTAssertEqual(try client.member("stacked").deprecated, "Stacked.")
        XCTAssertEqual(try client.member("stacked").signatures, ["@available(iOS 15, *)\npublic func stacked()"])
        XCTAssertNil(try client.member("send").deprecated)
        XCTAssertNil(client.deprecated)
        let old = try package.symbol("OldClient")
        XCTAssertEqual(old.deprecated, "Use `Client` instead.")
        XCTAssertEqual(old.signatures, ["public struct OldClient"])
    }

    func testReportsDeclarationsDeprecatedDifferently() throws {
        let problems = try demoProblems(
            """
            public struct Client {
                @available(*, deprecated, message: "Use send(to:).")
                public func send(_ text: String, to: Int) {}
                public func send(_ text: Substring, to: Int) {}
                @available(macOS, deprecated, message: "Use iOS.")
                public func vibrate() {}
                @available(*, deprecated, message: "See <doc:Guide>.")
                public func legacy() {}
            }
            @available(*, deprecated)
            public func greet(_ name: String) {}
            @available(*, deprecated, message: "Use greet(_:).")
            public func greet(_ name: Substring) {}
            #if os(iOS)
            @available(*, deprecated)
            public struct Legacy {}
            #else
            public struct Legacy {}
            #endif
            """)
        let mismatch = "with the same message, or none of them"
        XCTAssertEqual(
            problems,
            [
                #"Sources/Demo/Demo.swift:5: can't document platform-specific deprecation @available(macOS, deprecated, message: "Use iOS.")"#,
                "Sources/Demo/Demo.swift:7: <doc:> links don't resolve outside DocC; link with https:",
                "Sources/Demo/Demo.swift:2: deprecate every declaration of Client.send \(mismatch)",
                "Sources/Demo/Demo.swift:15: deprecate every declaration of Legacy \(mismatch)",
                "Sources/Demo/Demo.swift:10: deprecate every declaration of greet \(mismatch)",
            ])
    }
}
