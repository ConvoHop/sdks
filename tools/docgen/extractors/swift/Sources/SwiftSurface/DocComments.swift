import Foundation
import SwiftSyntax

/// A declaration's doc comment, split into its description and the callouts DocC renders separately.
struct DocComment: Equatable {
    var description: String = ""
    var parameters: [(name: String, text: String)] = []
    var returns: String?
    var throwsText: String?

    static func == (a: DocComment, b: DocComment) -> Bool {
        a.description == b.description && a.parameters.map(\.name) == b.parameters.map(\.name)
            && a.parameters.map(\.text) == b.parameters.map(\.text) && a.returns == b.returns && a.throwsText == b.throwsText
    }
}

/// Reads `///` doc comments in DocC's Markdown and converts them to the surface's Markdown.
struct DocReader {
    /// The documented modules, whose names DocC symbol links may start with.
    let modules: Set<String>
    /// Tested code: snippet regions by their dedented, trimmed code.
    let examples: Examples

    /// The doc comment attached to `node`: the `///` lines just before its first token, with nothing but line
    /// breaks between them and the declaration.
    func lines(of node: some SyntaxProtocol) -> (lines: [String], problems: [String]) {
        guard let token = node.firstToken(viewMode: .sourceAccurate) else { return ([], []) }
        let pieces = Array(token.leadingTrivia)
        var problems: [String] = []
        var attached: [String] = []
        var newlines = 0
        var index = pieces.count - 1
        scan: while index >= 0 {
            switch pieces[index] {
            case .spaces, .tabs: break
            case .newlines(let count), .carriageReturns(let count), .carriageReturnLineFeeds(let count): newlines += count
            case .docLineComment(let text):
                if newlines > 1 { break scan }
                attached.insert(text, at: 0)
                newlines = 0
            default: break scan
            }
            index -= 1
        }
        let rest = pieces[..<max(index + 1, 0)]
        if rest.contains(where: { if case .docBlockComment = $0 { true } else { false } }) {
            problems.append("write doc comments with ///, not /** */")
        } else if rest.contains(where: \.isDocComment) {
            problems.append(
                attached.isEmpty
                    ? "a blank line or // comment separates this declaration from its doc comment"
                    : "a blank line or // comment splits this declaration's doc comment")
        }
        var lines = attached.map { line -> String in
            var text = Substring(line.dropFirst(3))
            if text.first == " " { text = text.dropFirst() }
            while let last = text.last, last == " " || last == "\t" { text = text.dropLast() }
            return String(text)
        }
        while lines.first?.isEmpty == true { lines.removeFirst() }
        while lines.last?.isEmpty == true { lines.removeLast() }
        return (lines, problems)
    }

    /// Splits doc lines into the description and DocC's callouts: `- Parameters:` with nested `- name: text`
    /// items, `- Parameter name: text`, `- Returns: text` and `- Throws: text`. They come last, as top-level list
    /// items.
    func parse(_ lines: [String]) -> (DocComment, problems: [String]) {
        var doc = DocComment()
        var problems: [String] = []
        var description: [String] = []
        var inFence: String?
        var index = 0
        while index < lines.count {
            let line = lines[index]
            if let fence = inFence {
                if isClosingFence(line, fence) { inFence = nil }
                description.append(line)
                index += 1
                continue
            }
            if let fence = openingFence(line) {
                inFence = fence.marker
                description.append(line)
                index += 1
                continue
            }
            if let item = topLevelItem(line) {
                if let aside = asideKeyword(item) {
                    problems.append("DocC renders \"- \(aside):\" as an aside, which the docs site doesn't; write it as prose")
                } else if calloutKind(item) != nil {
                    break
                }
            }
            description.append(line)
            index += 1
        }
        enum Current { case none, parameters, parameter, returns, throwsText }
        var current = Current.none
        var blank = false
        while index < lines.count {
            let line = lines[index]
            index += 1
            if line.allSatisfy(\.isWhitespace) {
                blank = true
                continue
            }
            if let item = topLevelItem(line) {
                blank = false
                if let aside = asideKeyword(item) {
                    problems.append("DocC renders \"- \(aside):\" as an aside, which the docs site doesn't; write it as prose")
                    current = .none
                    continue
                }
                switch calloutKind(item) {
                case .parameters(let rest)?:
                    if !rest.isEmpty { problems.append("write each parameter as a nested \"- name: text\" item under \"- Parameters:\"") }
                    current = .parameters
                case .parameter(let name, let text)?:
                    doc.parameters.append((name, text))
                    current = .parameter
                case .returns(let text)?:
                    if doc.returns != nil { problems.append("more than one \"- Returns:\"") }
                    doc.returns = text
                    current = .returns
                case .throwsText(let text)?:
                    if doc.throwsText != nil { problems.append("more than one \"- Throws:\"") }
                    doc.throwsText = text
                    current = .throwsText
                case nil:
                    problems.append("description after the callouts; move \"\(line)\" before \"- Parameters:\", \"- Returns:\" and \"- Throws:\"")
                    current = .none
                }
                continue
            }
            if current == .parameters || current == .parameter, let nested = nestedParameter(line) {
                blank = false
                doc.parameters.append(nested)
                current = .parameter
                continue
            }
            let continuation = line.trimmingCharacters(in: .whitespaces)
            if blank || current == .none || current == .parameters {
                problems.append("description after the callouts; move \"\(continuation)\" before \"- Parameters:\", \"- Returns:\" and \"- Throws:\"")
                current = .none
                continue
            }
            switch current {
            case .parameter:
                let last = doc.parameters.count - 1
                doc.parameters[last].text = join(doc.parameters[last].text, continuation, "\n  ")
            case .returns: doc.returns = join(doc.returns ?? "", continuation, "\n")
            case .throwsText: doc.throwsText = join(doc.throwsText ?? "", continuation, "\n")
            case .none, .parameters: break
            }
        }
        while description.last?.allSatisfy(\.isWhitespace) == true { description.removeLast() }
        doc.description = description.joined(separator: "\n")
        doc.parameters = doc.parameters.filter { !$0.text.isEmpty }
        if doc.returns?.isEmpty == true { doc.returns = nil }
        if doc.throwsText?.isEmpty == true { doc.throwsText = nil }
        return (doc, problems)
    }

    private func join(_ text: String, _ continuation: String, _ separator: String) -> String {
        text.isEmpty ? continuation : text + separator + continuation
    }

    private func topLevelItem(_ line: String) -> Substring? {
        guard let first = line.first, "-*+".contains(first), line.dropFirst().first == " " else { return nil }
        return line.dropFirst(2).drop(while: { $0 == " " })
    }

    private enum Callout {
        case parameters(String)
        case parameter(String, String)
        case returns(String)
        case throwsText(String)
    }

    private func calloutKind(_ item: Substring) -> Callout? {
        let lower = item.lowercased()
        if lower.hasPrefix("parameters:") {
            return .parameters(item.dropFirst("parameters:".count).trimmingCharacters(in: .whitespaces))
        }
        if lower.hasPrefix("parameter ") {
            let rest = item.dropFirst("parameter ".count).drop(while: { $0 == " " })
            guard let colon = rest.firstIndex(of: ":") else { return nil }
            let name = rest[..<colon].trimmingCharacters(in: .whitespaces)
            guard !name.isEmpty, !name.contains(" ") else { return nil }
            return .parameter(name.trimmingBackticks, rest[rest.index(after: colon)...].trimmingCharacters(in: .whitespaces))
        }
        if lower.hasPrefix("returns:") { return .returns(item.dropFirst("returns:".count).trimmingCharacters(in: .whitespaces)) }
        if lower.hasPrefix("throws:") { return .throwsText(item.dropFirst("throws:".count).trimmingCharacters(in: .whitespaces)) }
        return nil
    }

    private static let asides: Set<String> = [
        "attention", "author", "authors", "bug", "complexity", "copyright", "date", "experiment", "important",
        "invariant", "keyword", "localizationkey", "mutatingvariant", "nonmutatingvariant", "note", "postcondition",
        "precondition", "recommended", "recommendedover", "remark", "remarks", "requires", "seealso", "since", "tag",
        "todo", "version", "warning",
    ]

    private func asideKeyword(_ item: Substring) -> String? {
        guard let colon = item.firstIndex(of: ":") else { return nil }
        let word = item[..<colon]
        guard !word.isEmpty, word.allSatisfy(\.isLetter) else { return nil }
        return Self.asides.contains(word.lowercased()) ? String(word) : nil
    }

    private func nestedParameter(_ line: String) -> (name: String, text: String)? {
        let indented = line.drop(while: { $0 == " " })
        guard indented.count < line.count, let first = indented.first, "-*+".contains(first), indented.dropFirst().first == " "
        else { return nil }
        let item = indented.dropFirst(2).drop(while: { $0 == " " })
        guard let colon = item.firstIndex(of: ":") else { return nil }
        let name = item[..<colon].trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty, !name.contains(" ") else { return nil }
        return (name.trimmingBackticks, item[item.index(after: colon)...].trimmingCharacters(in: .whitespaces))
    }

    /// Converts DocC's Markdown to the surface's: ``Type/member`` symbol links become `Type.member` code, and code
    /// in a tested fence must be a tested snippet, which the fence then names.
    func convert(_ markdown: String) -> (String, problems: [String]) {
        var problems: [String] = []
        var out: [String] = []
        let lines = markdown.isEmpty ? [] : markdown.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
        var index = 0
        while index < lines.count {
            let line = lines[index]
            if let fence = openingFence(line) {
                var end = index + 1
                while end < lines.count, !isClosingFence(lines[end], fence.marker) { end += 1 }
                if end == lines.count { problems.append("a code fence isn't closed") }
                var opening = line
                if fence.language.isEmpty {
                    problems.append("give each code fence a language, such as ```swift")
                } else if examples.testedFences.contains(fence.language.lowercased()) {
                    let code = Examples.normalize(Array(lines[(index + 1)..<min(end, lines.count)]))
                    if let source = examples.source(of: code) {
                        opening = "\(fence.indent)\(fence.marker)\(fence.language) snippet=\(source)"
                    } else {
                        problems.append(
                            "the \(fence.language) example isn't tested; put it in a region under \(examples.rootsDescription) and copy the region here verbatim")
                    }
                }
                out.append(opening)
                out.append(contentsOf: lines[(index + 1)..<min(end + 1, lines.count)])
                index = end + 1
                continue
            }
            let (converted, lineProblems) = convertLine(line)
            problems += lineProblems
            out.append(converted)
            index += 1
        }
        return (out.joined(separator: "\n"), problems)
    }

    private func convertLine(_ line: String) -> (String, [String]) {
        var problems: [String] = []
        if line.range(of: "<doc:") != nil { problems.append("<doc:> links don't resolve outside DocC; link with https:") }
        if line.hasPrefix("import") || line.hasPrefix("export") {
            let word = line.prefix(while: { $0.isLetter })
            if word == "import" || word == "export" {
                problems.append("a line can't start with \(word); MDX reads it as a module statement")
            }
        }
        var out = ""
        var rest = Substring(line)
        while let start = rest.firstIndex(of: "`") {
            out += rest[..<start]
            let run = rest[start...].prefix(while: { $0 == "`" })
            let afterRun = rest[run.endIndex...]
            guard let close = closingRun(of: run.count, in: afterRun) else {
                problems.append("a code span isn't closed on its line")
                out += rest[start...]
                rest = ""
                break
            }
            let content = afterRun[..<close.lowerBound]
            if run.count == 2, let symbol = symbolLink(content, problems: &problems) {
                out += "`\(symbol)`"
            } else {
                out += rest[start..<close.upperBound]
            }
            rest = afterRun[close.upperBound...]
        }
        out += rest
        let plain = removingCodeSpans(out)
        if plain.range(of: "![") != nil { problems.append("images aren't supported in doc comments") }
        if plain.range(of: "][") != nil { problems.append("use inline links, not reference-style links") }
        var search = plain[...]
        while let range = search.range(of: "](") {
            let destination = search[range.upperBound...].prefix(while: { $0 != ")" && $0 != " " })
            if !(destination.hasPrefix("https:") || destination.hasPrefix("mailto:")) {
                problems.append("link to \(destination) with an https: URL; relative links don't resolve on the docs site")
            }
            search = search[range.upperBound...]
        }
        return (out, problems)
    }

    private func closingRun(of length: Int, in text: Substring) -> Range<Substring.Index>? {
        var index = text.startIndex
        while index < text.endIndex {
            if text[index] == "`" {
                let run = text[index...].prefix(while: { $0 == "`" })
                if run.count == length { return run.startIndex..<run.endIndex }
                index = run.endIndex
            } else {
                index = text.index(after: index)
            }
        }
        return nil
    }

    private func removingCodeSpans(_ line: String) -> String {
        var out = ""
        var rest = Substring(line)
        while let start = rest.firstIndex(of: "`") {
            out += rest[..<start]
            let run = rest[start...].prefix(while: { $0 == "`" })
            guard let close = closingRun(of: run.count, in: rest[run.endIndex...]) else { return out + rest[start...] }
            out += " "
            rest = rest[close.upperBound...]
        }
        return out + rest
    }

    /// The code that a DocC symbol link such as ``ConvoHopOutbox/resend(_:)`` names: `ConvoHopOutbox.resend(_:)`.
    /// Nil when the span isn't a symbol path, so it stays a code span.
    private func symbolLink(_ content: Substring, problems: inout [String]) -> String? {
        var components: [String] = []
        var current = ""
        var depth = 0
        for character in content {
            switch character {
            case "(":
                depth += 1
                current.append(character)
            case ")":
                depth -= 1
                current.append(character)
            case "/" where depth == 0:
                components.append(current)
                current = ""
            case "-" where depth == 0:
                problems.append("the symbol link ``\(content)`` uses DocC disambiguation, which the docs site can't resolve")
                return nil
            case _ where depth == 0 && (character.isWhitespace || character == "`"):
                return nil
            default:
                current.append(character)
            }
        }
        components.append(current)
        guard components.allSatisfy({ !$0.isEmpty }), let first = components.first?.first, first.isLetter || first == "_"
        else { return nil }
        if components.count > 1, modules.contains(components[0]) { components.removeFirst() }
        return components.joined(separator: ".")
    }
}

struct Fence {
    let indent: String
    let marker: String
    let language: String
}

/// A Markdown fence opening: up to three spaces, then three or more backticks or tildes and the info string.
func openingFence(_ line: String) -> Fence? {
    let indent = line.prefix(while: { $0 == " " })
    guard indent.count <= 3, let character = line.dropFirst(indent.count).first, character == "`" || character == "~"
    else { return nil }
    let marker = line.dropFirst(indent.count).prefix(while: { $0 == character })
    guard marker.count >= 3 else { return nil }
    let info = line[marker.endIndex...].trimmingCharacters(in: .whitespaces)
    if character == "`", info.contains("`") { return nil }
    return Fence(indent: String(indent), marker: String(marker), language: String(info.split(separator: " ").first ?? ""))
}

func isClosingFence(_ line: String, _ marker: String) -> Bool {
    let trimmed = line.trimmingCharacters(in: .whitespaces)
    guard let character = marker.first, trimmed.count >= marker.count else { return false }
    return trimmed.allSatisfy { $0 == character } && line.prefix(while: { $0 == " " }).count <= 3
}
