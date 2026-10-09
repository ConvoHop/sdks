import Foundation
import XCTest

@testable import SwiftSurface

/// A language file that lists `packages` under Sources, with tested Swift snippets under docs/examples.
func languageFile(_ packages: [String]) -> String {
    let entries = packages.map { #"{"name":"\#($0)","source":"Sources/\#($0)"}"# }.joined(separator: ",")
    return #"{"id":"swift","packages":[\#(entries)],"regionComment":"//","testedFences":["swift"],"snippetRoots":["examples"]}"#
}

extension XCTestCase {
    /// Writes `files` to a new scratch repository and removes it when the test ends. Unless `files` has one,
    /// docs/language.json lists `packages`.
    func repository(_ files: [String: String], packages: [String] = ["Demo"]) throws -> URL {
        let root = FileManager.default.temporaryDirectory
            .appendingPathComponent("swift-surface-\(UUID().uuidString)", isDirectory: true)
        addTeardownBlock { try? FileManager.default.removeItem(at: root) }
        var files = files
        if files["docs/language.json"] == nil { files["docs/language.json"] = languageFile(packages) }
        for (path, text) in files {
            let url = root.appendingPathComponent(path)
            try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            try Data(text.utf8).write(to: url)
        }
        return root
    }

    func surface(_ root: URL) throws -> Surface {
        try extract(root: root.path, languagePath: root.appendingPathComponent("docs/language.json").path)
    }

    /// The problems that extracting the repository reports. Fails the test when it reports none.
    func problems(_ root: URL, file: StaticString = #filePath, line: UInt = #line) -> [String] {
        do {
            let surface = try surface(root)
            XCTFail("expected problems, but extracted \(surface.json())", file: file, line: line)
        } catch let error as ExtractionError {
            return error.problems
        } catch {
            XCTFail("expected an ExtractionError, but got \(error)", file: file, line: line)
        }
        return []
    }

    /// The Demo package of a repository whose Demo module is `source`, in Sources/Demo/Demo.swift.
    func demo(_ source: String, with files: [String: String] = [:]) throws -> SurfacePackage {
        var files = files
        files["Sources/Demo/Demo.swift"] = source
        return try XCTUnwrap(try surface(try repository(files)).packages.first)
    }

    /// The problems in a repository whose Demo module is `source`, in Sources/Demo/Demo.swift.
    func demoProblems(
        _ source: String, with files: [String: String] = [:], file: StaticString = #filePath, line: UInt = #line
    ) throws -> [String] {
        var files = files
        files["Sources/Demo/Demo.swift"] = source
        return problems(try repository(files), file: file, line: line)
    }
}

extension SurfacePackage {
    func symbol(_ name: String, file: StaticString = #filePath, line: UInt = #line) throws -> SurfaceSymbol {
        try XCTUnwrap(
            symbols.first { $0.name == name }, "\(self.name) has no symbol \(name): \(symbols.map(\.name))", file: file,
            line: line)
    }
}

extension SurfaceSymbol {
    func member(_ name: String, isStatic: Bool = false, file: StaticString = #filePath, line: UInt = #line) throws
        -> SurfaceMember
    {
        try XCTUnwrap(
            members.first { $0.name == name && $0.isStatic == isStatic },
            "\(self.name) has no \(isStatic ? "static " : "")member \(name): \(members.map(\.name))", file: file, line: line)
    }
}
