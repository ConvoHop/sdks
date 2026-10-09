import XCTest

@testable import SwiftSurface

final class DocCommentTests: XCTestCase {
    func testWritesTheDescriptionThenTheCallouts() throws {
        let symbol = try demo(
            """
            /// Sends a message.
            ///
            /// Waits for the server.
            ///
            /// ```text
            /// - Returns: x
            /// ```
            ///
            /// - parameters:
            ///   - `text`: The text,
            ///     which may be long.
            ///   - urgent: Whether to hurry.
            /// - Parameter id: The ID.
            /// - returns: The receipt,
            ///   once stored.
            /// - THROWS: A transport error.
            public func send(text: String, urgent: Bool, id: Int) throws -> Int { 0 }
            """
        ).symbol("send")
        XCTAssertEqual(
            symbol.docs,
            """
            Sends a message.

            Waits for the server.

            ```text
            - Returns: x
            ```

            Parameters:

            - `text`: The text,
              which may be long.
            - `urgent`: Whether to hurry.
            - `id`: The ID.

            Returns: The receipt,
            once stored.

            Throws: A transport error.
            """)
    }

    func testConvertsSymbolLinksToCode() throws {
        let symbol = try demo(
            """
            /// Wraps ``Box``, ``Demo/Box/run()`` and ``Box/init(size:)``, but not ``a b`` or ```Box```.
            public struct Box {
                public init(size: Int) {}
                public func run() {}
            }
            """
        ).symbol("Box")
        XCTAssertEqual(symbol.docs, "Wraps `Box`, `Box.run()` and `Box.init(size:)`, but not ``a b`` or ```Box```.")
    }

    func testReportsMarkdownTheDocsSiteCantRender() throws {
        let problems = try demoProblems(
            """
            /// See <doc:Guide> and ``Box/run()-7a3k``.
            /// import Demo
            /// imports are fine.
            /// An `unclosed span.
            /// ![A picture](https://example.com/a.png)
            /// A [reference][ref] link.
            /// Read [the guide](Guide.md), [the site](https://example.com), [mail](mailto:a@example.com) and `[code](x.md)`.
            ///
            /// ```
            /// let unlabeled = true
            /// ```
            ///
            /// ```swift
            /// let untested = true
            /// ```
            ///
            /// ```text
            /// never closed
            public struct Box {
                public func run() {}
            }
            """)
        XCTAssertEqual(
            problems,
            [
                "<doc:> links don't resolve outside DocC; link with https:",
                "the symbol link ``Box/run()-7a3k`` uses DocC disambiguation, which the docs site can't resolve",
                "a line can't start with import; MDX reads it as a module statement",
                "a code span isn't closed on its line",
                "images aren't supported in doc comments",
                "use inline links, not reference-style links",
                "link to Guide.md with an https: URL; relative links don't resolve on the docs site",
                "give each code fence a language, such as ```swift",
                "the swift example isn't tested; put it in a region under docs/examples and copy the region here verbatim",
                "a code fence isn't closed",
            ].map { "Sources/Demo/Demo.swift:19: \($0)" })
    }

    func testReportsCalloutsTheDocsSiteCantShow() throws {
        let problems = try demoProblems(
            """
            /// Does things.
            ///
            /// - Note: Asides aren't supported.
            /// - Parameters: text
            /// - Returns: One.
            /// - Returns: Two.
            /// - Throws: One.
            /// - Throws: Two.
            ///
            /// More description.
            /// - Important: Late aside.
            /// - A list item.
            public func act(text: String) throws -> Int { 0 }
            """)
        let late = #"before "- Parameters:", "- Returns:" and "- Throws:""#
        XCTAssertEqual(
            problems,
            [
                #"DocC renders "- Note:" as an aside, which the docs site doesn't; write it as prose"#,
                #"write each parameter as a nested "- name: text" item under "- Parameters:""#,
                #"more than one "- Returns:""#,
                #"more than one "- Throws:""#,
                #"description after the callouts; move "More description." \#(late)"#,
                #"DocC renders "- Important:" as an aside, which the docs site doesn't; write it as prose"#,
                #"description after the callouts; move "- A list item." \#(late)"#,
            ].map { "Sources/Demo/Demo.swift:13: \($0)" })
    }

    func testReportsDocCommentsThatDontAttachToADeclaration() throws {
        let problems = try demoProblems(
            """
            /// Detached by a blank line.

            public struct Detached {}
            /// First part.
            // An ordinary comment.
            /// Second part.
            public struct Split {}
            /** A block comment. */
            public struct Block {}
            public struct Inside {
                public func run(
                    /// Documents nothing.
                    value: Int
                ) {}
                /// Documents nothing either.
            }
            #if os(iOS)
            /// Documents the #else, which declares nothing.
            #else
            #endif
            /// Documents the end of the file.
            """)
        let orphan = "this doc comment documents no declaration; move it onto the declaration it describes"
        XCTAssertEqual(
            problems,
            [
                "Sources/Demo/Demo.swift:15: \(orphan)",
                "Sources/Demo/Demo.swift:18: \(orphan)",
                "Sources/Demo/Demo.swift:21: \(orphan)",
                "Sources/Demo/Demo.swift:3: a blank line or // comment separates this declaration from its doc comment",
                "Sources/Demo/Demo.swift:7: a blank line or // comment splits this declaration's doc comment",
                "Sources/Demo/Demo.swift:9: write doc comments with ///, not /** */",
                "Sources/Demo/Demo.swift:11: a doc comment inside the declaration documents nothing; move it into the doc comment above the declaration",
            ])
    }

    func testMergesTheDocsOfOverloads() throws {
        let sender = try demo(
            """
            public struct Sender {
                /// Sends text.
                ///
                /// - Parameters:
                ///   - text: What to send.
                ///   - urgent: Whether to hurry.
                public func send(_ text: String, urgent: Bool) {}
                /// Sends text.
                ///
                /// - Parameter urgent: Whether to hurry.
                public func send(_ text: Substring, urgent: Bool) {}
                /// Sends bytes.
                ///
                /// - Returns: How many bytes it sent.
                public func send(_ bytes: [UInt8], urgent: Bool) -> Int { 0 }
            }
            """
        ).symbol("Sender")
        let send = try sender.member("send")
        XCTAssertEqual(
            send.signatures,
            [
                "public func send(_ text: String, urgent: Bool)", "public func send(_ text: Substring, urgent: Bool)",
                "public func send(_ bytes: [UInt8], urgent: Bool) -> Int",
            ])
        XCTAssertEqual(
            send.docs,
            """
            Sends text.

            Sends bytes.

            Parameters:

            - `text`: What to send.
            - `urgent`: Whether to hurry.

            Returns: How many bytes it sent.
            """)
    }

    func testReportsOverloadsWhoseCalloutsDisagree() throws {
        let problems = try demoProblems(
            """
            public struct Sender {
                /// - Parameter urgent: Whether to hurry.
                /// - Returns: Whether it sent.
                /// - Throws: A transport error.
                public func send(_ text: String, urgent: Bool) throws -> Bool { true }
                /// - Parameter urgent: Whether to wait less.
                /// - Returns: Whether it queued.
                /// - Throws: A storage error.
                public func send(_ text: Substring, urgent: Bool) throws -> Bool { true }
            }
            """)
        XCTAssertEqual(
            problems,
            [
                "the declarations of Sender.send describe the parameter urgent differently; the docs site shows one description for all of them",
                #"the declarations of Sender.send have different "- Returns:" callouts; the docs site shows one for all of them"#,
                #"the declarations of Sender.send have different "- Throws:" callouts; the docs site shows one for all of them"#,
            ].map { "Sources/Demo/Demo.swift:5: \($0)" })
    }
}
