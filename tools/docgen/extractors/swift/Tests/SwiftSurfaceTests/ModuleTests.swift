import XCTest

@testable import SwiftSurface

final class ModuleTests: XCTestCase {
    func testSortsSymbolsByCodeUnitAndKeepsMembersInDeclarationOrder() throws {
        let root = try repository([
            "Sources/Demo/A.swift": """
                extension Box {
                    public func fromExtension() {}
                }
                public func zeta() {}
                public func alpha() {}
                public struct Box {
                    public func second() {}
                    public func first() {}
                }
                public struct Alpha {}
                """,
            "Sources/Demo/B.swift": """
                extension Box {
                    public func fromLaterFile() {}
                }
                """,
        ])
        let package = try XCTUnwrap(try surface(root).packages.first)
        XCTAssertEqual(package.symbols.map(\.name), ["Alpha", "Box", "alpha", "zeta"])
        XCTAssertEqual(
            try package.symbol("Box").members.map(\.name), ["second", "first", "fromExtension", "fromLaterFile"])
    }

    func testReadsSubdirectoriesButNotHiddenDirectoriesOrOtherFiles() throws {
        let root = try repository([
            "Sources/Demo/Top.swift": "public struct Top {}",
            "Sources/Demo/Nested/Deeper/Inner.swift": "public struct Inner {}",
            "Sources/Demo/.hidden/Hidden.swift": "public struct Hidden {}",
            "Sources/Demo/.build/Built.swift": "public struct Built {}",
            "Sources/Demo/Notes.md": "public struct Notes {}",
        ])
        XCTAssertEqual(try surface(root).packages.first?.symbols.map(\.name), ["Inner", "Top"])
    }

    func testKeepsThePackageOrderOfTheLanguageFile() throws {
        let root = try repository(
            ["Sources/Zed/Zed.swift": "public struct Z {}", "Sources/Alpha/Alpha.swift": "public struct A {}"],
            packages: ["Zed", "Alpha"])
        let surface = try surface(root)
        XCTAssertEqual(surface.language, "swift")
        XCTAssertEqual(surface.packages.map(\.name), ["Zed", "Alpha"])
    }

    func testListsReexportedSymbolsWithTheirOrigin() throws {
        let root = try repository(
            [
                "Sources/Demo/Demo.swift": """
                    @_exported import Extra

                    public struct Own {}
                    """,
                "Sources/Extra/Extra.swift": """
                    @_exported import Base

                    /// A thing.
                    public struct Thing {
                        public init() {}
                    }
                    """,
                "Sources/Base/Base.swift": "public func base() {}",
            ], packages: ["Demo", "Extra", "Base"])
        let own = SurfaceSymbol(name: "Own", kind: .struct, signatures: ["public struct Own"], docs: "", members: [])
        let thing = SurfaceSymbol(
            name: "Thing", kind: .struct, signatures: ["public struct Thing"], docs: "A thing.",
            members: [SurfaceMember(name: "init", kind: .constructor, signatures: ["public init()"], docs: "", isStatic: false)])
        let base = SurfaceSymbol(name: "base", kind: .function, signatures: ["public func base()"], docs: "", members: [])
        func from(_ origin: String, _ symbol: SurfaceSymbol) -> SurfaceSymbol {
            var symbol = symbol
            symbol.origin = origin
            return symbol
        }
        XCTAssertEqual(
            try surface(root).packages,
            [
                SurfacePackage(name: "Demo", symbols: [own, from("Extra", thing), from("Base", base)]),
                SurfacePackage(name: "Extra", symbols: [thing, from("Base", base)]),
                SurfacePackage(name: "Base", symbols: [base]),
            ])
    }

    func testReportsReexportsItCantDocument() throws {
        let root = try repository(
            [
                "Sources/Demo/Demo.swift": """
                    @_exported import struct Extra.Thing
                    @_exported import Foundation
                    #if canImport(UIKit)
                    @_exported import Extra
                    #endif
                    public struct Own {}
                    """,
                "Sources/Extra/Extra.swift": "public struct Thing {}",
            ], packages: ["Demo", "Extra"])
        XCTAssertEqual(
            problems(root),
            [
                "Sources/Demo/Demo.swift:1: can't document a re-export of one declaration; re-export the whole module",
                "Sources/Demo/Demo.swift:2: re-exports Foundation, which language.json doesn't list as a package",
                "Sources/Demo/Demo.swift:4: Extra is re-exported only for iOS; the docs site can't show that",
            ])
    }

    func testReportsTwoSymbolsWithOneNameOnce() throws {
        let root = try repository(
            [
                "Sources/Demo/Demo.swift": """
                    @_exported import Extra

                    public struct Thing {
                        public func run() {}
                    }
                    """,
                "Sources/Extra/Extra.swift": """
                    public struct Thing {
                        public func run() {}
                    }
                    """,
            ], packages: ["Demo", "Extra"])
        XCTAssertEqual(
            problems(root),
            ["Sources/Extra/Extra.swift:1: Demo has two symbols named Thing, one from Extra, and the docs site shows one per name"])
    }

    func testReportsHeadingsThatWouldShareAnAnchor() throws {
        XCTAssertEqual(
            try demoProblems(
                """
                public struct Foo {
                    public struct Bar {}
                }
                public struct FooBar {}
                """),
            [#"the Demo reference page would give the headings "Foo.Bar struct" and "FooBar struct" the same anchor #foobar-struct"#])
        XCTAssertEqual(
            try demoProblems(
                """
                public struct A {
                    public func bC() {}
                }
                public struct Ab {
                    public func c() {}
                }
                """),
            [#"the Demo reference page would give the headings "A.bC method" and "Ab.c method" the same anchor #abc-method"#])
    }

    func testReportsPackagesWithNothingToDocument() throws {
        let root = try repository(
            [
                "Sources/Hidden/Hidden.swift": "struct Internal {}\npublic extension Internal {}",
                "Sources/Empty/README.md": "No sources.",
            ], packages: ["Hidden", "Empty", "Missing"])
        XCTAssertEqual(
            problems(root),
            [
                "Sources/Empty has no .swift files",
                "Sources/Missing isn't a directory",
                "Hidden has no public declarations to document",
                "Empty has no public declarations to document",
            ])
    }

    func testReportsAPackageListedTwice() throws {
        let root = try repository([
            "docs/language.json": #"""
                {"id":"swift","packages":[{"name":"Demo","source":"Sources/Demo"},{"name":"Demo","source":"Other/Demo"}]}
                """#,
            "Sources/Demo/Demo.swift": "public struct Thing {}",
        ])
        XCTAssertEqual(problems(root), ["language.json lists the package Demo twice"])
    }

    func testReportsSyntaxErrors() throws {
        XCTAssertEqual(
            try demoProblems(
                """
                public struct Broken {
                    public func missing(
                }
                """),
            ["Sources/Demo/Demo.swift:2: expected ')' to end parameter clause"])
    }
}
