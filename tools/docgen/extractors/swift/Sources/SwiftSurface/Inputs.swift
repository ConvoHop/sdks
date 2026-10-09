import Foundation
import SwiftDiagnostics
import SwiftParser
import SwiftParserDiagnostics
import SwiftSyntax

/// Everything the extractor couldn't document faithfully, one `path:line: message` per problem.
public struct ExtractionError: Error, CustomStringConvertible {
    public let problems: [String]
    public var description: String { problems.joined(separator: "\n") }
}

/// A repository-relative path and a 1-based line.
struct Location: CustomStringConvertible {
    let path: String
    let line: Int
    var description: String { "\(path):\(line)" }
}

/// Collects problems, so that one run reports all of them.
final class Problems {
    private(set) var messages: [String] = []

    func add(_ message: String) {
        messages.append(message)
    }

    func add(_ location: Location, _ message: String) {
        messages.append("\(location): \(message)")
    }
}

/// The part of docs/languages/swift/language.json that the extractor reads.
struct LanguageFile {
    struct Package {
        let name: String
        let source: String
    }

    let id: String
    let packages: [Package]
    let regionComment: String
    let testedFences: [String]
    let snippetRoots: [String]
    /// The repository root, which package sources and reported paths are relative to.
    let root: URL
    /// The language file's directory, relative to the root.
    let directory: String

    init(path: String, root rootPath: String) throws {
        let url = URL(fileURLWithPath: path).standardizedFileURL
        root = URL(fileURLWithPath: rootPath, isDirectory: true).standardizedFileURL
        let folder = url.deletingLastPathComponent().path
        guard folder.hasPrefix(root.path + "/") else {
            throw ExtractionError(problems: ["\(path) isn't in the repository \(root.path)"])
        }
        directory = String(folder.dropFirst(root.path.count + 1))
        let data: Data
        do {
            data = try Data(contentsOf: url)
        } catch {
            throw ExtractionError(problems: ["can't read \(path): \(error.localizedDescription)"])
        }
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw ExtractionError(problems: ["\(path) isn't a JSON object"])
        }
        func strings(_ key: String) -> [String] { (object[key] as? [Any])?.compactMap { $0 as? String } ?? [] }
        id = object["id"] as? String ?? ""
        regionComment = object["regionComment"] as? String ?? ""
        testedFences = strings("testedFences").map { $0.lowercased() }
        snippetRoots = strings("snippetRoots")
        var packages: [Package] = []
        var problems: [String] = []
        if id != "swift" { problems.append("\(path): id is \(id.isEmpty ? "missing" : id), not swift") }
        for (index, entry) in ((object["packages"] as? [Any]) ?? []).enumerated() {
            guard let entry = entry as? [String: Any], let name = entry["name"] as? String,
                let source = entry["source"] as? String
            else {
                problems.append("\(path): packages[\(index)] needs a name and a source")
                continue
            }
            // A module's name is its target directory's name, so the package name says which module it is.
            if source.split(separator: "/").last.map(String.init) != name {
                problems.append("\(path): package \(name) has source \(source), whose last component isn't \(name)")
            }
            packages.append(Package(name: name, source: source))
        }
        if packages.isEmpty && problems.isEmpty { problems.append("\(path): lists no packages") }
        if !problems.isEmpty { throw ExtractionError(problems: problems) }
        self.packages = packages
    }
}

/// A parsed source file of a documented module.
final class SourceFile {
    /// The repository-relative path.
    let path: String
    let tree: SourceFileSyntax
    private let converter: SourceLocationConverter

    init(path: String, text: String) {
        self.path = path
        tree = Parser.parse(source: text)
        converter = SourceLocationConverter(fileName: path, tree: tree)
    }

    func location(of node: some SyntaxProtocol) -> Location {
        Location(path: path, line: converter.location(for: node.positionAfterSkippingLeadingTrivia).line)
    }

    func location(at position: AbsolutePosition) -> Location {
        Location(path: path, line: converter.location(for: position).line)
    }

    /// The parser's errors. The extractor documents only sources that parse cleanly.
    func syntaxErrors() -> [String] {
        ParseDiagnosticsGenerator.diagnostics(for: tree)
            .filter { $0.diagMessage.severity == .error }
            .map { "\(path):\($0.location(converter: converter).line): \($0.message)" }
    }
}

/// The `.swift` files under `directory` (repository-relative), sorted by path, skipping hidden and build directories.
func swiftFiles(in directory: String, root: URL) throws -> [(path: String, text: String)] {
    let base = root.appendingPathComponent(directory)
    var isDirectory: ObjCBool = false
    guard FileManager.default.fileExists(atPath: base.path, isDirectory: &isDirectory), isDirectory.boolValue else {
        throw ExtractionError(problems: ["\(directory) isn't a directory"])
    }
    guard
        let enumerator = FileManager.default.enumerator(
            at: base, includingPropertiesForKeys: [.isRegularFileKey], options: [.skipsHiddenFiles])
    else { throw ExtractionError(problems: ["can't list \(directory)"]) }
    var files: [(path: String, text: String)] = []
    let prefix = base.standardizedFileURL.path + "/"
    for case let url as URL in enumerator {
        if url.lastPathComponent == ".build" {
            enumerator.skipDescendants()
            continue
        }
        guard url.pathExtension == "swift", (try? url.resourceValues(forKeys: [.isRegularFileKey]))?.isRegularFile == true
        else { continue }
        let full = url.standardizedFileURL.path
        guard full.hasPrefix(prefix) else { continue }
        guard let text = try? String(contentsOf: url, encoding: .utf8) else {
            throw ExtractionError(problems: ["\(directory)/\(full.dropFirst(prefix.count)) isn't UTF-8"])
        }
        files.append((path: "\(directory)/\(full.dropFirst(prefix.count))", text: text))
    }
    return files.sorted { String.codeUnitOrder($0.path, $1.path) }
}
