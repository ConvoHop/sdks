import XCTest

@testable import SwiftSurface

final class ExampleTests: XCTestCase {
    func testNamesTheRegionThatATestedFenceCopies() throws {
        let symbol = try demo(
            """
            /// Sends a message.
            ///
            /// ```swift
            /// let box = Box()
            /// box.send()
            /// ```
            public struct Box {
                public init() {}
                public func send() {}
            }
            """,
            with: [
                "docs/examples/Sources/Sample.swift": """
                    import Demo

                    func sample() {
                        // #region whole
                        let box = Box()
                        // #region send
                        box.send()
                        // #endregion send
                        // #endregion whole
                    }
                    """
            ]
        ).symbol("Box")
        XCTAssertEqual(
            symbol.docs,
            """
            Sends a message.

            ```swift snippet=docs/examples/Sources/Sample.swift#whole
            let box = Box()
            box.send()
            ```
            """)
    }

    func testPrefersTheFirstRegionByPathThenByName() throws {
        let symbol = try demo(
            """
            /// ```swift
            /// ping()
            /// ```
            public func ping() {}
            """,
            with: [
                "docs/examples/B.swift": """
                    // #region alpha
                    ping()
                    // #endregion

                    """,
                "docs/examples/A.swift": """
                    // #region zeta
                    ping()
                    // #endregion
                    // #region beta
                        ping()
                    // #endregion
                    """,
            ]
        ).symbol("ping")
        XCTAssertEqual(symbol.docs, "```swift snippet=docs/examples/A.swift#beta\nping()\n```")
    }

    func testNormalizesCodeAsTheDocsPagesIncludeIt() {
        XCTAssertEqual(
            Examples.normalize(["", "    let a = 1   ", "", "        a.run()\t", "  ", ""]), "let a = 1\n\n    a.run()")
    }

    func testReportsMalformedRegions() throws {
        XCTAssertEqual(
            try demoProblems(
                "public struct Box {}",
                with: [
                    "docs/examples/Regions.swift": """
                        // #region bad.name
                        // #endregion
                        // #region twice
                        // #endregion
                        // #region twice
                        // #endregion
                        // #endregion
                        // #region outer
                        // #endregion inner
                        // #region
                        // #region open
                        """
                ]),
            [
                "docs/examples/Regions.swift:1: region names use letters, digits, _ and -: bad.name",
                "docs/examples/Regions.swift:5: region twice repeats",
                "docs/examples/Regions.swift:7: #endregion without #region",
                "docs/examples/Regions.swift:9: #endregion inner closes region outer",
                "docs/examples/Regions.swift:10: malformed region marker; use // #region <name> and // #endregion",
                "docs/examples/Regions.swift:11: region open isn't closed",
            ])
    }
}
