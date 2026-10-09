import XCTest

@testable import SwiftSurface

final class PlatformTests: XCTestCase {
    func testEvaluatesConditionsForIOSAndMacOS() throws {
        let package = try demo(
            """
            public func always() {}
            #if canImport(Darwin)
            public func darwin() {}
            #endif
            #if canImport(UIKit)
            public func uikit() {}
            #elseif canImport(AppKit)
            public func appkit() {}
            #endif
            #if os(iOS) || os(macOS)
            public func either() {}
            #endif
            #if os(macOS)
            public func first() {}
            #elseif os(iOS) || os(macOS)
            public func second() {}
            #else
            public func neither() {}
            #endif
            #if !os(macOS)
            public func notMac() {}
            #endif
            #if os(OSX)
            public func osx() {}
            #endif
            #if (os(iOS))
            public func parenthesized() {}
            #endif
            #if os(iOS) || os(macOS) && false
            public func precedence() {}
            #endif
            #if os(iOS) && os(macOS)
            public func both() {}
            #endif
            #if os(Linux) || canImport(Glibc)
            public func linux() {}
            #endif
            #if true
            public func yes() {}
            #else
            public func no() {}
            #endif
            """)
        XCTAssertEqual(
            package.symbols.map { "\($0.name): \($0.docs)" },
            [
                "always: ",
                "appkit: Available on macOS only.",
                "darwin: ",
                "either: ",
                "first: Available on macOS only.",
                "notMac: Available on iOS only.",
                "osx: Available on macOS only.",
                "parenthesized: Available on iOS only.",
                "precedence: Available on iOS only.",
                "second: Available on iOS only.",
                "uikit: Available on iOS only.",
                "yes: ",
            ])
    }

    func testReportsConditionsItCantEvaluate() throws {
        let problems = try demoProblems(
            """
            #if os(iOS) && DEBUG
            public func debug() {}
            #endif
            #if canImport(SwiftUI)
            public func swiftUI() {}
            #endif
            #if swift(>=5.9)
            public func modern() {}
            #endif
            #if os(iOS) ^ os(macOS)
            public func either() {}
            #endif
            public func always() {}
            """)
        let teach = "for iOS and macOS; teach the extractor's PlatformConditions about it"
        XCTAssertEqual(
            problems,
            [
                "Sources/Demo/Demo.swift:1: can't evaluate #if DEBUG \(teach)",
                "Sources/Demo/Demo.swift:4: can't evaluate #if canImport(SwiftUI) \(teach)",
                "Sources/Demo/Demo.swift:7: can't evaluate #if swift(>=5.9) \(teach)",
                "Sources/Demo/Demo.swift:10: can't evaluate #if os(iOS) ^ os(macOS) \(teach)",
            ])
    }

    func testNotesPlatformsAgainstTheContainer() throws {
        let package = try demo(
            """
            #if os(macOS)
            /// A menu.
            public struct Menu {}
            #endif
            public protocol Feedback {
                #if os(iOS)
                /// Plays a tap.
                ///
                /// - Parameter strength: How hard.
                func tap(strength: Double)
                #endif
            }
            #if os(iOS)
            extension Feedback {
                public func tap(strength: Double) {}
            }
            #endif
            """)
        XCTAssertEqual(try package.symbol("Menu").docs, "A menu.\n\nAvailable on macOS only.")
        let feedback = try package.symbol("Feedback")
        XCTAssertEqual(feedback.docs, "")
        XCTAssertEqual(
            try feedback.member("tap").docs,
            """
            Plays a tap.

            Available on iOS only.

            Has a default implementation, so conforming types may omit it.

            Parameters:

            - `strength`: How hard.
            """)
    }

    func testLeavesOutTheNoteWhenTheContainerHasThePlatformsToo() throws {
        let package = try demo(
            """
            #if os(iOS)
            /// Buzzes.
            public final class Haptics {
                /// Buzzes once.
                public func buzz() {}
            }
            /// Starts vibrating.
            public func vibrate() {}
            #endif
            """)
        let haptics = try package.symbol("Haptics")
        XCTAssertEqual(haptics.docs, "Buzzes.")
        XCTAssertEqual(try haptics.member("buzz").docs, "Buzzes once.")
        XCTAssertEqual(try package.symbol("vibrate").docs, "Starts vibrating.")
    }

    func testMergesATypeDeclaredInEachClause() throws {
        let view = try demo(
            """
            #if os(iOS)
            /// A view.
            public class View {
                public init() {}
                public func tap() {}
            }
            #else
            /// A view.
            public class View {
                public init() {}
                public func click() {}
            }
            #endif
            """
        ).symbol("View")
        XCTAssertEqual(view.signatures, ["public class View"])
        XCTAssertEqual(view.docs, "A view.")
        XCTAssertEqual(
            view.members.map { "\($0.name): \($0.docs)" },
            ["init: ", "tap: Available on iOS only.", "click: Available on macOS only."])
    }

    func testReportsDeclarationsThatDifferByPlatform() throws {
        let problems = try demoProblems(
            """
            #if os(iOS)
            public final class Screen {}
            #else
            public class Screen {}
            #endif
            #if os(iOS)
            public struct Token {}
            #else
            public enum Token {}
            #endif
            public struct Box {
                #if os(iOS)
                public func tap() -> Int { 0 }
                #else
                public func tap() -> String { "" }
                #endif
            }
            #if os(iOS)
            public func vibrate() -> Bool { true }
            #else
            public func vibrate() {}
            #endif
            public struct Gate {
                #if os(iOS)
                @MainActor
                #endif
                public func open() {}
            }
            """)
        let note = "are compiled for different platforms; the docs site shows one platform note for all of them"
        XCTAssertEqual(
            problems,
            [
                "Sources/Demo/Demo.swift:2: Screen is declared differently for iOS and macOS; the docs site shows one declaration for both",
                "Sources/Demo/Demo.swift:7: Token is a different kind of type in different #if clauses",
                "Sources/Demo/Demo.swift:7: Token is declared differently for iOS and macOS; the docs site shows one declaration for both",
                "Sources/Demo/Demo.swift:13: the declarations of Box.tap \(note)",
                "Sources/Demo/Demo.swift:24: can't document #if inside an attribute list; put the whole declaration in #if",
                "Sources/Demo/Demo.swift:19: the declarations of vibrate \(note)",
            ])
    }

    func testReportsDefaultsCompiledForOtherPlatformsThanTheirRequirement() throws {
        let problems = try demoProblems(
            """
            public protocol Feedback {
                #if os(iOS)
                func tap(strength: Double)
                #endif
                func click()
                #if os(iOS)
                func swipe()
                #else
                func swipe()
                #endif
            }
            extension Feedback {
                public func tap(strength: Double) {}
                #if os(macOS)
                public func click() {}
                #endif
                public func swipe() {}
            }
            """)
        let rule = "the docs site can't show a default on different platforms from its requirement"
        XCTAssertEqual(
            problems,
            [
                "Sources/Demo/Demo.swift:13: the default implementation of Feedback.tap(strength:) is compiled for iOS and macOS, but the requirement for iOS; \(rule)",
                "Sources/Demo/Demo.swift:15: the default implementation of Feedback.click() is compiled for macOS, but the requirement for iOS and macOS; \(rule)",
            ])
    }
}
