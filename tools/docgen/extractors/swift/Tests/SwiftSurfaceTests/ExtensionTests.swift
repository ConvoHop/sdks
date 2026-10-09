import XCTest

@testable import SwiftSurface

final class ExtensionTests: XCTestCase {
    func testAddsTheConformancesAndPublicMembersOfOwnExtensions() throws {
        let box = try demo(
            """
            public struct Box {
                public var size: Int
            }
            extension Box: Hashable, CustomStringConvertible {
                public var description: String { "" }
            }
            extension Box {
                public func open() {}
                func hidden() {}
            }
            """
        ).symbol("Box")
        XCTAssertEqual(box.signatures, ["public struct Box", "extension Box: Hashable, CustomStringConvertible"])
        XCTAssertEqual(
            outline(box.members),
            [
                "size property: public var size: Int",
                "description property: public var description: String { get }",
                "open method: public func open()",
            ])
    }

    func testDocumentsWhatAModuleAddsToAnothersType() throws {
        let root = try repository(
            [
                "Sources/Demo/Demo.swift": "public struct Greeter {\n    public init() {}\n}\n",
                "Sources/Extra/Extra.swift": """
                    import Demo

                    extension Greeter {
                        public func wave() {}
                    }
                    extension Demo.Greeter: CustomStringConvertible {
                        public var description: String { "" }
                    }
                    extension Greeter {
                        func hidden() {}
                    }
                    """,
                "Sources/More/More.swift": """
                    import Demo

                    /// Adds bowing.
                    extension Greeter {
                        public func bow() {}
                    }
                    """,
                "Sources/Quiet/Quiet.swift": """
                    import Demo

                    extension Greeter {
                        func hidden() {}
                    }
                    public struct Quiet {}
                    """,
            ], packages: ["Demo", "Extra", "More", "Quiet"])
        let packages = try surface(root).packages
        XCTAssertEqual(packages.map(\.name), ["Demo", "Extra", "More", "Quiet"])
        XCTAssertEqual(outline(try packages[0].symbol("Greeter").members), ["init constructor: public init()"])
        let extra = try packages[1].symbol("Greeter")
        XCTAssertEqual(outline([extra]), ["Greeter struct: extension Greeter | extension Demo.Greeter: CustomStringConvertible"])
        XCTAssertEqual(extra.docs, "What `Extra` adds to `Greeter`, which `Demo` declares.")
        XCTAssertEqual(
            outline(extra.members),
            ["wave method: public func wave()", "description property: public var description: String { get }"])
        let more = try packages[2].symbol("Greeter")
        XCTAssertEqual(more.docs, "Adds bowing.")
        XCTAssertEqual(outline(more.members), ["bow method: public func bow()"])
        XCTAssertEqual(outline(packages[3].symbols), ["Quiet struct: public struct Quiet"])
    }

    func testReportsExtensionsItCantDocument() throws {
        let problems = try demoProblems(
            """
            public struct Box {}
            public typealias Alias = Box
            extension Alias {
                public func viaAlias() {}
            }
            /// Adds opening.
            extension Box {
                public func open() {}
            }
            #if os(iOS)
            extension Box: Identifiable {
                public var id: Int { 0 }
            }
            #endif
            extension String: Error {}
            extension Int {
                public var digits: Int { 0 }
                public struct Digits {}
            }
            """)
        XCTAssertEqual(
            problems,
            [
                "Sources/Demo/Demo.swift:3: extends the type alias Alias; extend the type it names, so the docs can list the members there",
                "Sources/Demo/Demo.swift:15: can't document the conformance of String, which no documented module declares, to Error",
                "Sources/Demo/Demo.swift:17: can't document a public member of an extension of Int, which no documented module declares",
                "Sources/Demo/Demo.swift:18: can't document the public type Digits in an extension of Int, which no documented module declares",
                "Sources/Demo/Demo.swift:7: the docs site doesn't show doc comments on extensions; document Box or the members instead",
                "Sources/Demo/Demo.swift:11: extension Box: Identifiable is compiled for iOS, but Box for iOS and macOS; the docs site can't show a conformance on fewer platforms than its type",
            ])
    }

    func testReportsAnExtensionOfATypeThatTwoModulesDeclare() throws {
        let root = try repository(
            [
                "Sources/A/A.swift": "public struct Thing {}\n",
                "Sources/B/B.swift": "public struct Thing {}\n",
                "Sources/C/C.swift": """
                    import A
                    import B

                    extension Thing {
                        public func x() {}
                    }
                    public struct Other {}
                    """,
            ], packages: ["A", "B", "C"])
        XCTAssertEqual(
            problems(root), ["Sources/C/C.swift:4: can't tell which Thing this extends: A and B each declare one"])
    }

    func testReportsAnotherModulesExtensionsCompiledForDifferentPlatforms() throws {
        let root = try repository(
            [
                "Sources/Demo/Demo.swift": "public struct Greeter {}\n",
                "Sources/Extra/Extra.swift": """
                    import Demo

                    #if os(iOS)
                    extension Greeter: Identifiable {
                        public var id: Int { 0 }
                    }
                    #endif
                    extension Greeter {
                        public func bow() {}
                    }
                    """,
            ], packages: ["Demo", "Extra"])
        XCTAssertEqual(
            problems(root),
            [
                "Sources/Extra/Extra.swift:4: the extensions of Greeter are compiled for different platforms; the docs site shows one declaration for all of them"
            ])
    }
}
