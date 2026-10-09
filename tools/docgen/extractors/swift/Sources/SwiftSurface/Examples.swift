import Foundation

/// The tested code under the language's snippet roots, by region, as docs/languages include it: marker lines
/// dropped, dedented and trimmed (tools/docgen/lib/snippets.mjs).
struct Examples {
    let testedFences: Set<String>
    let roots: [String]
    /// Normalized code to `path#region`, the first in path and region order.
    private var sources: [String: String] = [:]

    var rootsDescription: String { roots.joined(separator: " or ") }

    init(language: LanguageFile, problems: Problems) {
        testedFences = Set(language.testedFences)
        roots = language.snippetRoots.map { "\(language.directory)/\($0)" }
        guard !language.regionComment.isEmpty else { return }
        for root in roots {
            guard FileManager.default.fileExists(atPath: language.root.appendingPathComponent(root).path) else { continue }
            let files: [(path: String, text: String)]
            do {
                files = try swiftFiles(in: root, root: language.root)
            } catch {
                problems.add((error as? ExtractionError)?.description ?? "\(error)")
                continue
            }
            for file in files {
                let parsed = Self.regions(file.text, comment: language.regionComment)
                for (line, message) in parsed.errors { problems.add(Location(path: file.path, line: line), message) }
                for (name, range) in parsed.regions.sorted(by: { String.codeUnitOrder($0.key, $1.key) }) {
                    let body = parsed.lines[(range.start + 1)..<range.end].filter { !parsed.isMarker($0) }
                    let code = Self.normalize(body)
                    if !code.isEmpty, sources[code] == nil { sources[code] = "\(file.path)#\(name)" }
                }
            }
        }
    }

    func source(of code: String) -> String? {
        code.isEmpty ? nil : sources[code]
    }

    /// Dedents lines by their smallest indentation, strips trailing whitespace and trims blank lines at both ends.
    static func normalize(_ lines: [String]) -> String {
        let indents = lines.filter { !$0.allSatisfy(\.isWhitespace) }.map { $0.prefix(while: { $0 == " " || $0 == "\t" }).count }
        let indent = indents.min() ?? 0
        var kept = lines.map { line -> String in
            var text = Substring(line.dropFirst(min(indent, line.prefix(while: { $0 == " " || $0 == "\t" }).count)))
            while let last = text.last, last == " " || last == "\t" { text = text.dropLast() }
            return String(text)
        }
        while kept.first?.isEmpty == true { kept.removeFirst() }
        while kept.last?.isEmpty == true { kept.removeLast() }
        return kept.joined(separator: "\n")
    }

    struct Parsed {
        let lines: [String]
        let regions: [String: (start: Int, end: Int)]
        let errors: [(Int, String)]
        let start: Regex<(Substring, Substring)>
        let end: Regex<(Substring, Substring?)>

        func isMarker(_ line: String) -> Bool {
            line.wholeMatch(of: start) != nil || line.wholeMatch(of: end) != nil
        }
    }

    /// Region markers, as snippets.mjs parseRegions reads them.
    static func regions(_ source: String, comment: String) -> Parsed {
        let prefix = NSRegularExpression.escapedPattern(for: comment)
        let start = try! Regex(#"\s*\#(prefix)\s*#region\s+(\S+)\s*"#, as: (Substring, Substring).self)
        let end = try! Regex(#"\s*\#(prefix)\s*#endregion(?:\s+(\S+))?\s*"#, as: (Substring, Substring?).self)
        let malformed = try! Regex(#"#(end)?region\b"#)
        var text = source
        if text.hasSuffix("\n") { text.removeLast() }
        let lines = text.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
        var regions: [String: (start: Int, end: Int)] = [:]
        var errors: [(Int, String)] = []
        var open: [(name: String, start: Int)] = []
        for (index, line) in lines.enumerated() {
            let number = index + 1
            if let opened = line.wholeMatch(of: start) {
                let name = String(opened.output.1)
                if name.isEmpty || !name.allSatisfy({ $0.isASCII && ($0.isLetter || $0.isNumber || $0 == "_" || $0 == "-") }) {
                    errors.append((number, "region names use letters, digits, _ and -: \(name)"))
                } else if regions[name] != nil || open.contains(where: { $0.name == name }) {
                    errors.append((number, "region \(name) repeats"))
                }
                open.append((name, index))
            } else if let closed = line.wholeMatch(of: end) {
                guard let region = open.popLast() else {
                    errors.append((number, "#endregion without #region"))
                    continue
                }
                if let name = closed.output.1, name != region.name {
                    errors.append((number, "#endregion \(name) closes region \(region.name)"))
                } else {
                    regions[region.name] = (region.start, index)
                }
            } else if line.contains(malformed) {
                errors.append((number, "malformed region marker; use \(comment) #region <name> and \(comment) #endregion"))
            }
        }
        for region in open { errors.append((region.start + 1, "region \(region.name) isn't closed")) }
        return Parsed(lines: lines, regions: regions, errors: errors, start: start, end: end)
    }
}
