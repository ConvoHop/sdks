import Foundation
import XCTest

@testable import SwiftSurface

final class JSONTests: XCTestCase {
    func testWritesKeysInTheSchemasOrderAndLeavesOutAbsentFields() {
        let surface = Surface(
            language: "swift",
            packages: [
                SurfacePackage(
                    name: "Demo",
                    symbols: [
                        SurfaceSymbol(
                            name: "Box", kind: .struct, signatures: ["public struct Box"], docs: "A box.",
                            deprecated: "Use `Crate` instead.", origin: "Extra",
                            members: [
                                SurfaceMember(
                                    name: "make", kind: .method, signatures: ["public static func make() -> Box"], docs: "",
                                    deprecated: "", isStatic: true),
                                SurfaceMember(
                                    name: "size", kind: .property, signatures: ["public var size: Int"], docs: "", isStatic: false),
                            ]),
                        SurfaceSymbol(name: "run", kind: .function, signatures: ["public func run()"], docs: "", members: []),
                    ]),
                SurfacePackage(name: "Empty", symbols: []),
            ])
        XCTAssertEqual(
            surface.json(),
            #"{"language":"swift","packages":[{"name":"Demo","symbols":[{"name":"Box","kind":"struct","signatures":["public struct Box"],"docs":"A box.","deprecated":"Use `Crate` instead.","origin":"Extra","members":[{"name":"make","kind":"method","signatures":["public static func make() -> Box"],"docs":"","deprecated":"","static":true},{"name":"size","kind":"property","signatures":["public var size: Int"],"docs":""}]},{"name":"run","kind":"function","signatures":["public func run()"],"docs":""}]},{"name":"Empty","symbols":[]}]}"#
        )
    }

    func testEscapesStringsSoThatTheyReadBackUnchanged() throws {
        let docs = "Quote \" backslash \\ newline \n return \r tab \t bell \u{07} unit \u{1F} emoji 🎉 accent é"
        let surface = Surface(
            language: "swift",
            packages: [
                SurfacePackage(
                    name: "Demo",
                    symbols: [SurfaceSymbol(name: "Box", kind: .struct, signatures: ["public struct Box"], docs: docs, members: [])])
            ])
        let json = surface.json()
        XCTAssertTrue(
            json.contains(#""docs":"Quote \" backslash \\ newline \n return \r tab \t bell \u0007 unit \u001f emoji 🎉 accent é""#),
            json)
        XCTAssertFalse(json.contains("\n"))
        let object = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])
        let packages = try XCTUnwrap(object["packages"] as? [[String: Any]])
        let symbols = try XCTUnwrap(packages.first?["symbols"] as? [[String: Any]])
        XCTAssertEqual(symbols.first?["docs"] as? String, docs)
    }
}
