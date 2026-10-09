import XCTest

@testable import SwiftSurface

final class LanguageFileTests: XCTestCase {
    /// The problems with a repository whose language file is `text`, with the file's absolute path shown as
    /// `language.json`.
    private func problems(languageFile text: String, file: StaticString = #filePath, line: UInt = #line) throws
        -> [String]
    {
        let root = try repository(["docs/language.json": text, "Sources/Demo/Demo.swift": "public struct Thing {}"])
        let path = root.appendingPathComponent("docs/language.json").path
        return problems(root, file: file, line: line).map { $0.replacingOccurrences(of: path, with: "language.json") }
    }

    func testReportsAnotherLanguagesFile() throws {
        XCTAssertEqual(
            try problems(languageFile: #"{"id":"go","packages":[{"name":"Demo","source":"Sources/Demo"}]}"#),
            ["language.json: id is go, not swift"])
        XCTAssertEqual(
            try problems(languageFile: #"{"packages":[{"name":"Demo","source":"Sources/Demo"}]}"#),
            ["language.json: id is missing, not swift"])
    }

    func testReportsPackagesItCantRead() throws {
        XCTAssertEqual(
            try problems(
                languageFile: #"""
                    {"id":"swift","packages":[{"name":"Demo"},"Demo",{"name":"Demo","source":"Sources/Other"}]}
                    """#),
            [
                "language.json: packages[0] needs a name and a source",
                "language.json: packages[1] needs a name and a source",
                "language.json: package Demo has source Sources/Other, whose last component isn't Demo",
            ])
    }

    func testReportsAFileWithoutPackages() throws {
        for text in [#"{"id":"swift","packages":[]}"#, #"{"id":"swift"}"#] {
            XCTAssertEqual(try problems(languageFile: text), ["language.json: lists no packages"], text)
        }
    }

    func testReportsAFileThatIsntAJSONObject() throws {
        for text in ["[]", "not JSON"] {
            XCTAssertEqual(try problems(languageFile: text), ["language.json isn't a JSON object"], text)
        }
    }

    func testReportsAFileOutsideTheRepository() throws {
        let root = try repository(["Sources/Demo/Demo.swift": "public struct Thing {}"])
        let path = try repository([:]).appendingPathComponent("docs/language.json").path
        XCTAssertThrowsError(try extract(root: root.path, languagePath: path)) { error in
            XCTAssertEqual((error as? ExtractionError)?.problems, ["\(path) isn't in the repository \(root.path)"])
        }
    }

    func testReportsAFileItCantRead() throws {
        let root = try repository(["Sources/Demo/Demo.swift": "public struct Thing {}"])
        let path = root.appendingPathComponent("docs/missing.json").path
        XCTAssertThrowsError(try extract(root: root.path, languagePath: path)) { error in
            let problems = (error as? ExtractionError)?.problems ?? []
            XCTAssertEqual(problems.count, 1, "\(problems)")
            XCTAssertTrue(problems.first?.hasPrefix("can't read \(path): ") == true, "\(problems)")
        }
    }
}
