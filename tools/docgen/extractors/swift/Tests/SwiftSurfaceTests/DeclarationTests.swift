import XCTest

@testable import SwiftSurface

/// Each symbol as `name kind: signature | signature`.
func outline(_ symbols: [SurfaceSymbol]) -> [String] {
    symbols.map { "\($0.name) \($0.kind.rawValue): \($0.signatures.joined(separator: " | "))" }
}

/// Each member as `[static ]name kind: signature | signature`.
func outline(_ members: [SurfaceMember]) -> [String] {
    members.map { "\($0.isStatic ? "static " : "")\($0.name) \($0.kind.rawValue): \($0.signatures.joined(separator: " | "))" }
}

final class DeclarationTests: XCTestCase {
    func testMapsEachDeclarationToASymbolKind() throws {
        let package = try demo(
            """
            public class Client {}
            open class Base {}
            public actor Worker {}
            public struct Point {}
            public enum Mode {}
            public protocol Delegate {}
            public typealias Handler = (Int) -> Void
            public func run() {}
            public let limit = 3
            """)
        XCTAssertEqual(
            outline(package.symbols),
            [
                "Base class: open class Base",
                "Client class: public class Client",
                "Delegate interface: public protocol Delegate",
                "Handler type: public typealias Handler = (Int) -> Void",
                "Mode enum: public enum Mode",
                "Point struct: public struct Point",
                "Worker class: public actor Worker",
                "limit constant: public let limit = 3",
                "run function: public func run()",
            ])
    }

    func testDocumentsWhatCodeOutsideTheModuleCanUse() throws {
        let package = try demo(
            """
            public struct Box {
                public var a: Int = 0
                var b: Int = 0
                internal func c() {}
                fileprivate func d() {}
                private func e() {}
                package func f() {}
                public private(set) var g: Int = 0
                public init() {}
            }
            struct Hidden {
                public func visibleInHiddenType() {}
            }
            public extension Box {
                func fromPublicExtension() {}
                private func privateInPublicExtension() {}
            }
            extension Box {
                public func publicInExtension() {}
                func internalInExtension() {}
            }
            public enum Choice {
                case one
            }
            public protocol Requirement {
                func required()
            }
            extension Requirement {
                func internalHelper() {}
                public func publicHelper() {}
            }
            public final class Resource {
                deinit {}
            }
            """)
        XCTAssertEqual(package.symbols.map(\.name), ["Box", "Choice", "Requirement", "Resource"])
        XCTAssertEqual(
            outline(try package.symbol("Box").members),
            [
                "a property: public var a: Int",
                "g property: public private(set) var g: Int",
                "init constructor: public init()",
                // A public extension makes its members public without saying so on each.
                "fromPublicExtension method: func fromPublicExtension()",
                "publicInExtension method: public func publicInExtension()",
            ])
        XCTAssertEqual(outline(try package.symbol("Choice").members), ["one case: case one"])
        XCTAssertEqual(
            outline(try package.symbol("Requirement").members),
            ["required method: func required()", "publicHelper method: public func publicHelper()"])
        XCTAssertEqual(try package.symbol("Resource").members, [])
    }

    func testNamesNestedTypesByTheirPath() throws {
        let package = try demo(
            """
            public struct Client {
                public enum Mode {
                    case fast
                }
                public struct Options {
                    public var retries: Int
                }
                struct Hidden {
                    public struct Inner {}
                }
            }
            extension Client {
                public struct Added {}
                struct NotPublic {}
            }
            public extension Client {
                struct AddedByPublicExtension {}
            }
            """)
        XCTAssertEqual(
            outline(package.symbols),
            [
                "Client struct: public struct Client",
                "Client.Added struct: public struct Added",
                "Client.AddedByPublicExtension struct: struct AddedByPublicExtension",
                "Client.Mode enum: public enum Mode",
                "Client.Options struct: public struct Options",
            ])
        XCTAssertEqual(outline(try package.symbol("Client").members), [])
        XCTAssertEqual(outline(try package.symbol("Client.Options").members), ["retries property: public var retries: Int"])
    }

    func testGroupsOverloadsAndNamesMethodsThatShareABaseName() throws {
        let symbol = try demo(
            """
            public struct Sender {
                public init() {}
                public init(text: String) {}
                public func send(text: String) {}
                public func send(_ bytes: [UInt8]) {}
                public var name: String
                public func name(_ prefix: String) -> String { prefix }
                public static func only() {}
                public func only() {}
                public func single(_ value: Int) {}
            }
            """
        ).symbol("Sender")
        XCTAssertEqual(
            outline(symbol.members),
            [
                "init constructor: public init() | public init(text: String)",
                "send(text:) method: public func send(text: String)",
                "send(_:) method: public func send(_ bytes: [UInt8])",
                "name property: public var name: String",
                "name(_:) method: public func name(_ prefix: String) -> String",
                "static only method: public static func only()",
                "only method: public func only()",
                "single method: public func single(_ value: Int)",
            ])
    }

    func testRendersProperties() throws {
        let symbol = try demo(
            #"""
            public struct Settings {
                public var stored: Int
                public let fixed = 3
                public let negative = -1.5
                public let label = "Hi\n"
                public let mode = Mode.fast
                public let shorthand: Mode = .fast
                public let made = Box()
                public var count: Int { 0 }
                public var name: String { get { "" } set {} }
                public private(set) var limited: String { get { "" } set {} }
                public var observed: Int = 0 { didSet {} }
                public var inferredInt = 0
                public var inferredDouble = 1.5
                public var inferredBool = true
                public var inferredString = "x"
                public var inferredBox = Box()
                public var inferredPair = Pair<Int>()
                public var inferredInit = Box.init()
                public var x = 1, y = 2
                public var width, height: Double
                public static var shared: Settings { Settings() }
                public var reader: Int { get async throws { 0 } }
            }
            public struct Box {
                public init() {}
            }
            public struct Pair<T> {
                public init() {}
            }
            public enum Mode {
                case fast
            }
            """#
        ).symbol("Settings")
        XCTAssertEqual(
            outline(symbol.members),
            [
                "stored property: public var stored: Int",
                "fixed property: public let fixed = 3",
                "negative property: public let negative = -1.5",
                #"label property: public let label = "Hi\n""#,
                "mode property: public let mode = Mode.fast",
                "shorthand property: public let shorthand: Mode = .fast",
                "made property: public let made = Box()",
                "count property: public var count: Int { get }",
                "name property: public var name: String { get set }",
                "limited property: public private(set) var limited: String { get }",
                "observed property: public var observed: Int",
                "inferredInt property: public var inferredInt: Int",
                "inferredDouble property: public var inferredDouble: Double",
                "inferredBool property: public var inferredBool: Bool",
                "inferredString property: public var inferredString: String",
                "inferredBox property: public var inferredBox: Box",
                "inferredPair property: public var inferredPair: Pair<Int>",
                "inferredInit property: public var inferredInit: Box",
                "x property: public var x: Int",
                "y property: public var y: Int",
                "width property: public var width: Double",
                "height property: public var height: Double",
                "static shared property: public static var shared: Settings { get }",
                "reader property: public var reader: Int { get async throws }",
            ])
    }

    func testRendersFunctionsInitializersAndSubscripts() throws {
        let symbol = try demo(
            """
            public struct Formatter {
                @discardableResult public func send() -> Int { 0 }
                @MainActor
                public func update() {}
                @available(iOS 16, macOS 13, *)
                public func modern() {}
                public func load() async throws -> [String] { [] }
                public func first<T: Equatable>(of items: [T], by match: (T) -> Bool) -> T? where T: Hashable { nil }
                public func connect(timeout: Double = 10, retry: Bool = true) {}
                public func noted(/* a comment */ value: Int) {}
                public init?(code: Int) {}
                public init<S: Sequence>(_ items: S) throws where S.Element == Int {}
                public subscript(row: Int, column: Int) -> Double { get { 0 } set {} }
                public subscript(key: String) -> Int { 0 }
                public static let sizes = [1, 2,]
            }
            """
        ).symbol("Formatter")
        XCTAssertEqual(
            outline(symbol.members),
            [
                "send method: @discardableResult public func send() -> Int",
                "update method: @MainActor\npublic func update()",
                "modern method: @available(iOS 16, macOS 13, *)\npublic func modern()",
                "load method: public func load() async throws -> [String]",
                "first method: public func first<T: Equatable>(of items: [T], by match: (T) -> Bool) -> T? where T: Hashable",
                "connect method: public func connect(timeout: Double = 10, retry: Bool = true)",
                "noted method: public func noted(value: Int)",
                "init constructor: public init?(code: Int) | public init<S: Sequence>(_ items: S) throws where S.Element == Int",
                "subscript index: public subscript(row: Int, column: Int) -> Double { get set } | public subscript(key: String) -> Int { get }",
                "static sizes property: public static let sizes = [1, 2]",
            ])
    }

    func testPutsEachParameterOnItsOwnLineWhenTheLastLineIsTooLong() throws {
        let symbol = try demo(
            """
            public struct Setup {
                public func configure(endpoint: String, token: String, timeout: Double, retries: Int, verbose: Bool) -> Bool { true }
                @available(iOS, introduced: 15.0, message: "This message is long enough to push the first line past one hundred columns")
                public func compact(value: Int) {}
                public func none() {}
            }
            """
        ).symbol("Setup")
        XCTAssertEqual(
            try symbol.member("configure").signatures,
            [
                """
                public func configure(
                    endpoint: String,
                    token: String,
                    timeout: Double,
                    retries: Int,
                    verbose: Bool
                ) -> Bool
                """
            ])
        XCTAssertEqual(
            try symbol.member("compact").signatures,
            [
                """
                @available(iOS, introduced: 15.0, message: "This message is long enough to push the first line past one hundred columns")
                public func compact(value: Int)
                """
            ])
    }

    func testRendersEnumCases() throws {
        let package = try demo(
            """
            public enum Level: Int {
                case low = 1, high = 2
            }
            public enum Event {
                case message(String, from: String)
                case closed(code: Int = 1000)
                indirect case nested(Event)
            }
            public indirect enum Tree {
                case leaf
            }
            """)
        XCTAssertEqual(
            outline(package.symbols), ["Event enum: public enum Event", "Level enum: public enum Level: Int", "Tree enum: public indirect enum Tree"])
        XCTAssertEqual(outline(try package.symbol("Level").members), ["low case: case low = 1", "high case: case high = 2"])
        XCTAssertEqual(
            outline(try package.symbol("Event").members),
            [
                "message case: case message(String, from: String)",
                "closed case: case closed(code: Int = 1000)",
                "nested case: indirect case nested(Event)",
            ])
    }

    func testDocumentsProtocolRequirementsAndHidesInternalProtocols() throws {
        let package = try demo(
            """
            protocol Internal {}
            protocol Secret {}
            public protocol Visible {}
            public protocol Store: AnyObject, Internal {
                var count: Int { get }
                var name: String { get set }
                func load() async throws
                static func make() -> Self
                init(name: String)
                subscript(index: Int) -> Int { get }
            }
            extension Store {
                public func load() async throws {}
                public func extra() {}
                func helper() {}
            }
            public struct Box: Internal, Visible, Equatable {}
            extension Box: Hashable {}
            extension Box: Secret {}
            """)
        XCTAssertEqual(
            outline(package.symbols),
            [
                "Box struct: public struct Box: Visible, Equatable | extension Box: Hashable",
                "Store interface: public protocol Store: AnyObject",
                "Visible interface: public protocol Visible",
            ])
        let store = try package.symbol("Store")
        XCTAssertEqual(
            outline(store.members),
            [
                "count property: var count: Int { get }",
                "name property: var name: String { get set }",
                "load method: func load() async throws",
                "static make method: static func make() -> Self",
                "init constructor: init(name: String)",
                "subscript index: subscript(index: Int) -> Int { get }",
                "extra method: public func extra()",
            ])
        XCTAssertEqual(try store.member("load").docs, "Has a default implementation, so conforming types may omit it.")
        XCTAssertEqual(try store.member("count").docs, "")
    }

    func testReportsDeclarationsItCantDocument() throws {
        XCTAssertEqual(
            try demoProblems(
                """
                public protocol Store {
                    associatedtype Item
                    var count: Int
                }
                public struct Box {
                    public static func + (a: Box, b: Box) -> Box { a }
                    #declare()
                    #warning("fine")
                    @_spi(Internal) public func hidden() {}
                    @available(*, unavailable) public func gone() {}
                    @available(iOS, deprecated: 16) public func old() {}
                    public var (a, b) = (1, 2)
                    public var unknown = make()
                }
                public struct Pair<T> {}
                extension Pair where T: Equatable {
                    public func same() -> Bool { true }
                }
                infix operator <>: AdditionPrecedence
                precedencegroup Tight { higherThan: AdditionPrecedence }
                @freestanding(declaration) public macro declare() = #externalMacro(module: "M", type: "T")
                #declare()
                #warning("fine")
                public var counter = 0
                """),
            [
                "Sources/Demo/Demo.swift:19: can't document operator declarations",
                "Sources/Demo/Demo.swift:20: can't document precedence groups",
                "Sources/Demo/Demo.swift:21: can't document macro declarations",
                "Sources/Demo/Demo.swift:22: can't document what #declare expands to",
                "Sources/Demo/Demo.swift:2: can't document associated types; the docs site has no member kind for them",
                "Sources/Demo/Demo.swift:3: protocol property count needs { get } or { get set }",
                "Sources/Demo/Demo.swift:6: can't document the operator +; the docs site has no member kind for operators",
                "Sources/Demo/Demo.swift:7: can't document what #declare expands to",
                "Sources/Demo/Demo.swift:9: can't document @_spi declarations; the docs site documents the public API only",
                "Sources/Demo/Demo.swift:10: can't document @available(*, unavailable)",
                "Sources/Demo/Demo.swift:11: can't document platform-specific deprecation @available(iOS, deprecated: 16)",
                "Sources/Demo/Demo.swift:12: can't document the pattern (a, b); declare one name per binding",
                "Sources/Demo/Demo.swift:13: can't infer the type of unknown; give it a type annotation",
                "Sources/Demo/Demo.swift:17: can't document Pair.same(), which an extension with a where clause declares; the docs site can't show the constraint",
                "Sources/Demo/Demo.swift:24: can't document a public global var; make it a let, or a static property of a type",
            ])
    }

    func testReportsClassesThatInheritFromADocumentedClass() throws {
        XCTAssertEqual(
            try demoProblems(
                """
                open class Base {}
                public class Derived: Base {}
                public class Object: NSObject {}
                public class Conforming: Visible {}
                public protocol Visible {}
                """),
            ["Sources/Demo/Demo.swift:2: Derived inherits from Base; the extractor doesn't list inherited members yet"])
    }

    func testReportsParameterCalloutsForParametersADeclarationDoesntHave() throws {
        XCTAssertEqual(
            try demoProblems(
                """
                /// Sends.
                ///
                /// - Parameter text: The text.
                /// - Parameter missing: Not a parameter.
                public func send(text: String) {}
                public struct Box {
                    /// - Parameters:
                    ///   - label: By label.
                    ///   - name: By name.
                    ///   - other: Neither.
                    public func set(label name: String, _ value: Int) {}
                    /// - Parameter code: The code.
                    public init(code: Int) {}
                }
                public enum Event {
                    /// - Parameter reason: The reason.
                    /// - Parameter code: Not a parameter.
                    case closed(reason: String)
                }
                """),
            [
                "Sources/Demo/Demo.swift:11: the doc comment describes a parameter other, which set doesn't have",
                "Sources/Demo/Demo.swift:18: the doc comment describes a parameter code, which closed doesn't have",
                "Sources/Demo/Demo.swift:5: the doc comment describes a parameter missing, which send doesn't have",
            ])
    }
}
