import Foundation
import SwiftSyntax

/// Extracts the public surface of the modules that the language file at `languagePath` lists. `root` is the
/// repository root, which sources, snippets and reported paths are relative to. Throws an `ExtractionError` that
/// lists every declaration the extractor can't document faithfully.
public func extract(root: String, languagePath: String) throws -> Surface {
    let language = try LanguageFile(path: languagePath, root: root)
    let problems = Problems()
    let surface = Extractor(language: language, problems: problems).run()
    var seen = Set<String>()
    let messages = problems.messages.filter { seen.insert($0).inserted }
    if !messages.isEmpty { throw ExtractionError(problems: messages) }
    return surface
}

/// A declaration's docs as surface Markdown, before the extractor adds its notes.
struct Docs: Equatable {
    struct Parameter: Equatable {
        let name: String
        let text: String
    }

    var description = ""
    var parameters: [Parameter] = []
    var returns: String?
    var throwsText: String?

    /// The description, then the notes, then the callouts, as the other languages' surfaces write them.
    func text(notes: [String]) -> String {
        var parts: [String] = []
        if !description.isEmpty { parts.append(description) }
        parts += notes
        if !parameters.isEmpty {
            parts.append("Parameters:\n\n" + parameters.map { "- `\($0.name)`: \($0.text)" }.joined(separator: "\n"))
        }
        if let returns { parts.append("Returns: \(returns)") }
        if let throwsText { parts.append("Throws: \(throwsText)") }
        return parts.joined(separator: "\n\n")
    }

    /// The docs of declarations that the surface shows as one, such as overloads or a declaration in each `#if`
    /// clause: their distinct descriptions, and callouts that must agree.
    static func merge(_ all: [Docs], name: String) -> (Docs, problems: [String]) {
        var merged = Docs()
        var problems: [String] = []
        var descriptions: [String] = []
        for docs in all {
            if !docs.description.isEmpty, !descriptions.contains(docs.description) { descriptions.append(docs.description) }
            for parameter in docs.parameters {
                if let existing = merged.parameters.first(where: { $0.name == parameter.name }) {
                    if existing.text != parameter.text {
                        problems.append(
                            "the declarations of \(name) describe the parameter \(parameter.name) differently; the docs site shows one description for all of them"
                        )
                    }
                } else {
                    merged.parameters.append(parameter)
                }
            }
            merge(&merged.returns, docs.returns, callout: "- Returns:", name: name, problems: &problems)
            merge(&merged.throwsText, docs.throwsText, callout: "- Throws:", name: name, problems: &problems)
        }
        merged.description = descriptions.joined(separator: "\n\n")
        return (merged, problems)
    }

    private static func merge(
        _ value: inout String?, _ other: String?, callout: String, name: String, problems: inout [String]
    ) {
        guard let other else { return }
        if let current = value, current != other {
            problems.append(
                "the declarations of \(name) have different \"\(callout)\" callouts; the docs site shows one for all of them")
        } else {
            value = other
        }
    }
}

/// One member as a declaration declares it: a function, an initializer, a subscript, a binding or a case.
struct Entry {
    var name: String
    let baseName: String
    /// The name with argument labels, such as `send(_:to:)`.
    let fullName: String
    let kind: MemberKind
    let isStatic: Bool
    let signature: String
    var platforms: Platforms
    let docs: Docs
    let deprecated: String?
    let location: Location
    /// Whether a protocol's body declares it.
    let isRequirement: Bool
    /// Whether an extension with a `where` clause declares it.
    let isConstrained: Bool
    var hasDefault = false
}

/// A symbol before its package adds the note for the platforms that compile it.
struct BuiltSymbol {
    let name: String
    let kind: SymbolKind
    let signatures: [String]
    let docs: Docs
    let deprecated: String?
    var origin: String?
    let members: [SurfaceMember]
    let platforms: Platforms
    let location: Location

    func surface(packagePlatforms: Platforms) -> SurfaceSymbol {
        let notes = platforms == packagePlatforms ? [] : [platforms.note]
        return SurfaceSymbol(
            name: name, kind: kind, signatures: signatures, docs: docs.text(notes: notes), deprecated: deprecated,
            origin: origin, members: members)
    }
}

/// Signatures with the platforms that compile each, in the order they're first declared.
struct SignatureList {
    private(set) var entries: [(text: String, platforms: Platforms)] = []

    mutating func add(_ text: String, _ platforms: Platforms) {
        if let index = entries.firstIndex(where: { $0.text == text }) {
            entries[index].platforms.formUnion(platforms)
        } else {
            entries.append((text, platforms))
        }
    }

    var texts: [String] { entries.map(\.text) }
    var platforms: Platforms { entries.reduce([]) { $0.union($1.platforms) } }
    /// Whether some signatures are compiled for platforms that others aren't.
    var platformsDiffer: Bool { Set(entries.map(\.platforms)).count > 1 }
}

/// The section titles of a reference page, as tools/docgen/lib/render.mjs groups symbols.
let symbolGroupTitles: [(SymbolKind, String)] = [
    (.class, "Classes"), (.struct, "Structs"), (.interface, "Interfaces"), (.enum, "Enums"), (.type, "Types"),
    (.function, "Functions"), (.constant, "Constants"),
]

/// The words that member headings end with, as tools/docgen/lib/render.mjs labels members.
func memberLabel(_ kind: MemberKind) -> String {
    switch kind {
    case .constructor: "constructor"
    case .method: "method"
    case .property: "property"
    case .case: "case"
    case .index: "index signature"
    }
}

/// The anchor the docs site gives a heading's text, as slugify in tools/docgen/lib/markdown.mjs computes it.
func slugify(_ text: String) -> String {
    var out = String.UnicodeScalarView()
    for scalar in text.lowercased().unicodeScalars {
        switch scalar.properties.generalCategory {
        case .uppercaseLetter, .lowercaseLetter, .titlecaseLetter, .modifierLetter, .otherLetter, .nonspacingMark,
            .spacingMark, .enclosingMark, .decimalNumber, .letterNumber, .otherNumber, .connectorPunctuation:
            out.append(scalar)
        default:
            if scalar == " " {
                out.append("-")
            } else if scalar == "-" {
                out.append(scalar)
            }
        }
    }
    return String(out)
}

private let docCommentInside =
    "a doc comment inside the declaration documents nothing; move it into the doc comment above the declaration"
private let defaultNote = "Has a default implementation, so conforming types may omit it."

/// Builds the surface of the documented modules from their parsed sources.
final class Extractor {
    private let language: LanguageFile
    private let problems: Problems
    private var modules: [Module] = []
    private var modulesByName: [String: Module] = [:]
    /// Each module's types by qualified name.
    private var index: [String: [String: [TypeDecl]]] = [:]
    /// Each module's extensions of its own types, by the type's qualified name.
    private var ownExtensions: [String: [String: [ExtensionDecl]]] = [:]
    /// Extensions whose extended type the extractor reported it can't resolve.
    private var unresolvable = Set<ObjectIdentifier>()

    private lazy var signatures = Signatures(
        isHiddenProtocol: { [unowned self] name in
            let candidates = types(named: name)
            return !candidates.isEmpty && candidates.allSatisfy { $0.kind == .protocol && !$0.isPublic }
        },
        initializedType: { [unowned self] name, specialized in initializedType(name, specialized: specialized) })

    private lazy var reader = DocReader(
        modules: Set(modules.map(\.name)), examples: Examples(language: language, problems: problems))

    init(language: LanguageFile, problems: Problems) {
        self.language = language
        self.problems = problems
    }

    func run() -> Surface {
        load()
        resolveExtensions()
        checkExternalExtensions()
        var own: [String: [BuiltSymbol]] = [:]
        for module in modules { own[module.name] = symbols(of: module) }
        var packages: [SurfacePackage] = []
        for module in modules {
            let built = exported(module, own: own, visiting: [module.name]).sorted {
                String.codeUnitOrder($0.name, $1.name)
            }
            if built.isEmpty { problems.add("\(module.name) has no public declarations to document") }
            for (previous, next) in zip(built, built.dropFirst()) where previous.name == next.name {
                problems.add(
                    next.location,
                    "\(module.name) has two symbols named \(next.name)\(next.origin.map { ", one from \($0)" } ?? ""), and the docs site shows one per name"
                )
            }
            let platforms = built.reduce(Platforms()) { $0.union($1.platforms) }
            let package = SurfacePackage(name: module.name, symbols: built.map { $0.surface(packagePlatforms: platforms) })
            checkAnchors(package)
            packages.append(package)
        }
        return Surface(language: language.id, packages: packages)
    }

    // MARK: Loading

    private func load() {
        for package in language.packages {
            guard modulesByName[package.name] == nil else {
                problems.add("language.json lists the package \(package.name) twice")
                continue
            }
            let files: [(path: String, text: String)]
            do {
                files = try swiftFiles(in: package.source, root: language.root)
            } catch {
                problems.add((error as? ExtractionError)?.description ?? "\(error)")
                continue
            }
            if files.isEmpty { problems.add("\(package.source) has no .swift files") }
            let sources = files.map { SourceFile(path: $0.path, text: $0.text) }
            for source in sources {
                for message in source.syntaxErrors() { problems.add(message) }
            }
            let module = Module(name: package.name, files: sources)
            Walker(module: module, problems: problems).walk()
            modules.append(module)
            modulesByName[module.name] = module
        }
    }

    private func rebuildIndex() {
        index = [:]
        for module in modules {
            var types: [String: [TypeDecl]] = [:]
            for type in module.types {
                if let name = type.qualifiedName { types[name, default: []].append(type) }
            }
            index[module.name] = types
        }
    }

    private enum Lookup {
        case found(TypeDecl)
        case missing
        case failed
    }

    /// Resolves each extension to the documented type it extends. Types nested in extensions only get a qualified
    /// name once their extension resolves, so this repeats until nothing more resolves.
    private func resolveExtensions() {
        var pending = modules.flatMap(\.extensions)
        while true {
            rebuildIndex()
            var remaining: [ExtensionDecl] = []
            for ext in pending {
                switch lookup(ext) {
                case .found(let type): ext.target = type
                case .missing: remaining.append(ext)
                case .failed: unresolvable.insert(ObjectIdentifier(ext))
                }
            }
            if remaining.count == pending.count { break }
            pending = remaining
        }
        rebuildIndex()
        for module in modules {
            var extensions: [String: [ExtensionDecl]] = [:]
            for ext in module.extensions {
                if let target = ext.target, target.module === module, let name = target.qualifiedName {
                    extensions[name, default: []].append(ext)
                }
            }
            ownExtensions[module.name] = extensions
        }
    }

    /// Finds an extended type as Swift does: in the extension's own module, then by a module-qualified name, then
    /// among the other modules' public types.
    private func lookup(_ ext: ExtensionDecl) -> Lookup {
        guard let name = ext.extendedName else { return .missing }
        var candidates = index[ext.module.name]?[name] ?? []
        if candidates.isEmpty, let dot = name.firstIndex(of: "."), let module = modulesByName[String(name[..<dot])] {
            let rest = String(name[name.index(after: dot)...])
            candidates = (index[module.name]?[rest] ?? []).filter { module === ext.module || $0.isPublic }
        }
        if candidates.isEmpty {
            candidates = modules.filter { $0 !== ext.module }.flatMap { (index[$0.name]?[name] ?? []).filter(\.isPublic) }
        }
        guard let first = candidates.first else { return .missing }
        let location = ext.file.location(of: ext.node)
        if candidates.contains(where: { $0.module !== first.module }) {
            let owners = Set(candidates.map(\.module.name)).sorted()
            problems.add(location, "can't tell which \(name) this extends: \(owners.joined(separator: " and ")) each declare one")
            return .failed
        }
        if first.kind == .typealias {
            problems.add(location, "extends the type alias \(name); extend the type it names, so the docs can list the members there")
            return .failed
        }
        return .found(first)
    }

    /// Extensions of types outside the documented modules can't add anything public: the docs site has no page for
    /// the extended type.
    private func checkExternalExtensions() {
        for module in modules {
            for ext in module.extensions where ext.target == nil && !unresolvable.contains(ObjectIdentifier(ext)) {
                let name = ext.node.extendedType.trimmedDescription
                let visible = signatures.visibleInheritance(ext.node.inheritanceClause)
                if !visible.isEmpty {
                    problems.add(
                        ext.file.location(of: ext.node),
                        "can't document the conformance of \(name), which no documented module declares, to \(visible.joined(separator: ", "))"
                    )
                }
                for member in ext.members {
                    let modifiers = member.node.asProtocol(WithModifiersSyntax.self)?.modifiers ?? []
                    if (access(of: modifiers) ?? access(of: ext.node.modifiers)) == .public {
                        problems.add(
                            member.file.location(of: member.node),
                            "can't document a public member of an extension of \(name), which no documented module declares")
                    }
                }
            }
            for type in module.types {
                guard case .extension(let ext) = type.parent, ext.target == nil,
                    !unresolvable.contains(ObjectIdentifier(ext)),
                    (access(of: type.modifiers) ?? access(of: ext.node.modifiers)) == .public
                else { continue }
                problems.add(
                    type.file.location(of: type.node),
                    "can't document the public type \(type.name) in an extension of \(ext.node.extendedType.trimmedDescription), which no documented module declares"
                )
            }
        }
    }

    // MARK: Lookups

    /// The documented types with a qualified name, in any module.
    private func types(named name: String) -> [TypeDecl] {
        modules.flatMap { index[$0.name]?[name] ?? [] }
    }

    /// The documented type that `name(...)` creates, when `name` names exactly one type that isn't a protocol and has
    /// no failable initializers. A generic type is inferred only from `name<A>(...)`, which `specialized` says.
    private func initializedType(_ name: String, specialized: Bool) -> String? {
        var candidates = types(named: name)
        if candidates.isEmpty { candidates = modules.flatMap(\.types).filter { $0.name == name && $0.qualifiedName != nil } }
        let names = Set(candidates.compactMap(\.qualifiedName))
        guard names.count == 1, let only = names.first, candidates.allSatisfy({ $0.kind != .protocol && $0.isGeneric == specialized })
        else { return nil }
        let failable = candidates.contains { type in
            type.hasFailableInitializer
                || (ownExtensions[type.module.name]?[only] ?? []).contains { ext in
                    ext.members.contains { $0.node.as(InitializerDeclSyntax.self)?.optionalMark != nil }
                }
        }
        return failable ? nil : only
    }

    /// The platforms that compile a type: its own `#if` clauses and its container's.
    private func effectivePlatforms(of type: TypeDecl) -> Platforms {
        switch type.parent {
        case .module:
            return type.platforms
        case .type(let parent):
            guard let name = parent.qualifiedName else { return [] }
            return type.platforms.intersection(platforms(ofType: name, in: parent.module))
        case .extension(let ext):
            guard let target = ext.target, let name = target.qualifiedName else { return [] }
            return type.platforms.intersection(ext.platforms).intersection(platforms(ofType: name, in: target.module))
        }
    }

    /// The platforms that compile any declaration of the type `name` in `module`.
    private func platforms(ofType name: String, in module: Module) -> Platforms {
        (index[module.name]?[name] ?? []).reduce([]) { $0.union(effectivePlatforms(of: $1)) }
    }

    // MARK: Symbols

    private func symbols(of module: Module) -> [BuiltSymbol] {
        var names: [String] = []
        var groups: [String: [TypeDecl]] = [:]
        for type in module.types where type.isPublic {
            guard let name = type.qualifiedName else { continue }
            if groups[name] == nil { names.append(name) }
            groups[name, default: []].append(type)
        }
        var result = names.compactMap { typeSymbol($0, groups[$0] ?? [], in: module) }
        result += globalSymbols(of: module)
        result += extensionSymbols(of: module)
        return result
    }

    private func typeSymbol(_ name: String, _ decls: [TypeDecl], in module: Module) -> BuiltSymbol? {
        guard let first = decls.first else { return nil }
        let location = first.file.location(of: first.node)
        let platforms = decls.reduce(Platforms()) { $0.union(effectivePlatforms(of: $1)) }
        guard !platforms.isEmpty else { return nil }
        if decls.contains(where: { $0.kind != first.kind }) {
            problems.add(location, "\(name) is a different kind of type in different #if clauses")
        }
        var list = SignatureList()
        var docs: [Docs] = []
        var deprecations: [String?] = []
        for decl in decls {
            let declLocation = decl.file.location(of: decl.node)
            let attributes = check(attributes: decl.node, at: declLocation)
            guard attributes.supported else { continue }
            let (text, inside) = signatures.type(decl)
            if inside { problems.add(declLocation, docCommentInside) }
            list.add(text, effectivePlatforms(of: decl))
            docs.append(self.docs(of: decl.node, at: declLocation))
            deprecations.append(attributes.deprecated)
            checkSuperclass(decl, at: declLocation)
        }
        guard !list.texts.isEmpty else { return nil }
        let extensions = ownExtensions[module.name]?[name] ?? []
        for ext in extensions {
            let extLocation = ext.file.location(of: ext.node)
            if hasDocComment(ext.node) {
                problems.add(
                    extLocation, "the docs site doesn't show doc comments on extensions; document \(name) or the members instead")
            }
            guard let text = signatures.conformance(ext.node) else { continue }
            let conforms = ext.platforms.intersection(platforms)
            if conforms != platforms {
                problems.add(
                    extLocation,
                    "\(text) is compiled for \(conforms), but \(name) for \(platforms); the docs site can't show a conformance on fewer platforms than its type"
                )
            }
            list.add(text, platforms)
        }
        if list.platformsDiffer {
            problems.add(location, "\(name) is declared differently for iOS and macOS; the docs site shows one declaration for both")
        }
        let (merged, docProblems) = Docs.merge(docs, name: name)
        for problem in docProblems { problems.add(location, problem) }
        let members = buildMembers(
            decls.flatMap(\.members) + extensions.flatMap(\.members), owner: name, isProtocol: first.kind == .protocol,
            platforms: platforms)
        return BuiltSymbol(
            name: name, kind: first.kind.symbolKind, signatures: list.texts, docs: merged,
            deprecated: deprecation(deprecations, of: name, at: location), members: members, platforms: platforms,
            location: location)
    }

    /// Public functions are function symbols and public `let`s constant symbols.
    private func globalSymbols(of module: Module) -> [BuiltSymbol] {
        var entries: [Entry] = []
        for global in module.globals {
            if let variable = global.node.as(VariableDeclSyntax.self), access(of: variable.modifiers) == .public,
                variable.bindingSpecifier.tokenKind != .keyword(.let)
            {
                problems.add(
                    global.file.location(of: global.node),
                    "can't document a public global var; make it a let, or a static property of a type")
                continue
            }
            entries += self.entries(of: global, isRequirement: false).filter { !$0.platforms.isEmpty }
        }
        return group(entries).map { group in
            let first = group[0]
            var list = SignatureList()
            for entry in group { list.add(entry.signature, entry.platforms) }
            if list.platformsDiffer {
                problems.add(first.location, "the declarations of \(first.name) are compiled for different platforms; the docs site shows one platform note for all of them")
            }
            let (docs, docProblems) = Docs.merge(group.map(\.docs), name: first.name)
            for problem in docProblems { problems.add(first.location, problem) }
            return BuiltSymbol(
                name: first.name, kind: first.kind == .method ? .function : .constant, signatures: list.texts, docs: docs,
                deprecated: deprecation(group.map(\.deprecated), of: first.name, at: first.location), members: [],
                platforms: list.platforms, location: first.location)
        }
    }

    /// What a module adds to another documented module's types: a symbol named after the extended type, on the
    /// extending module's page.
    private func extensionSymbols(of module: Module) -> [BuiltSymbol] {
        var names: [String] = []
        var groups: [String: [ExtensionDecl]] = [:]
        for ext in module.extensions {
            guard let target = ext.target, target.module !== module, let name = target.qualifiedName else { continue }
            if groups[name] == nil { names.append(name) }
            groups[name, default: []].append(ext)
        }
        return names.compactMap { name in
            let extensions = groups[name] ?? []
            guard let first = extensions.first, let target = first.target else { return nil }
            let location = first.file.location(of: first.node)
            let targetPlatforms = platforms(ofType: name, in: target.module)
            var list = SignatureList()
            var docs: [Docs] = []
            for ext in extensions {
                let compiled = ext.platforms.intersection(targetPlatforms)
                guard !compiled.isEmpty else { continue }
                list.add(signatures.extensionDeclaration(ext.node), compiled)
                docs.append(self.docs(of: ext.node, at: ext.file.location(of: ext.node)))
            }
            let platforms = list.platforms
            let members = buildMembers(extensions.flatMap(\.members), owner: name, isProtocol: false, platforms: platforms)
            let conforms = extensions.contains { !signatures.visibleInheritance($0.node.inheritanceClause).isEmpty }
            guard !members.isEmpty || conforms else { return nil }
            if list.platformsDiffer {
                problems.add(location, "the extensions of \(name) are compiled for different platforms; the docs site shows one declaration for all of them")
            }
            var (merged, docProblems) = Docs.merge(docs, name: name)
            for problem in docProblems { problems.add(location, problem) }
            if merged.description.isEmpty {
                merged.description = "What `\(module.name)` adds to `\(name)`, which `\(target.module.name)` declares."
            }
            return BuiltSymbol(
                name: name, kind: target.kind.symbolKind, signatures: list.texts, docs: merged, deprecated: nil,
                members: members, platforms: platforms, location: location)
        }
    }

    /// A module's symbols and those of the modules it re-exports with `@_exported import`, which name their origin.
    private func exported(_ module: Module, own: [String: [BuiltSymbol]], visiting: Set<String>) -> [BuiltSymbol] {
        var result = own[module.name] ?? []
        for export in module.exports {
            let location = export.file.location(of: export.node)
            let name = export.node.path.map(\.name.text).joined(separator: ".")
            if export.node.importKindSpecifier != nil {
                problems.add(location, "can't document a re-export of one declaration; re-export the whole module")
                continue
            }
            if export.platforms != .all {
                problems.add(location, "\(name) is re-exported only for \(export.platforms); the docs site can't show that")
                continue
            }
            guard let exportedModule = modulesByName[name] else {
                problems.add(location, "re-exports \(name), which language.json doesn't list as a package")
                continue
            }
            guard !visiting.contains(name) else { continue }
            for var symbol in exported(exportedModule, own: own, visiting: visiting.union([name])) {
                if symbol.origin == nil { symbol.origin = name }
                result.append(symbol)
            }
        }
        return result
    }

    // MARK: Members

    private func buildMembers(_ decls: [MemberDecl], owner: String, isProtocol: Bool, platforms: Platforms) -> [SurfaceMember] {
        var entries: [Entry] = []
        for member in decls.sorted(by: { $0.order < $1.order }) {
            for var entry in self.entries(of: member, isRequirement: isProtocol && member.owner == nil) {
                entry.platforms.formIntersection(platforms)
                guard !entry.platforms.isEmpty else { continue }
                if entry.isConstrained {
                    problems.add(
                        entry.location,
                        "can't document \(owner).\(entry.fullName), which an extension with a where clause declares; the docs site can't show the constraint"
                    )
                    continue
                }
                entries.append(entry)
            }
        }
        if isProtocol { entries = applyDefaults(entries, owner: owner) }
        return group(entries).map { member($0, owner: owner, platforms: platforms) }
    }

    /// Drops the protocol extension members that implement a requirement, and notes the default on the requirement.
    private func applyDefaults(_ entries: [Entry], owner: String) -> [Entry] {
        func key(_ entry: Entry) -> String { "\(entry.isStatic) \(entry.kind) \(entry.fullName)" }
        var required: [String: Platforms] = [:]
        for entry in entries where entry.isRequirement { required[key(entry), default: []].formUnion(entry.platforms) }
        var result: [Entry] = []
        var defaults: [String: Platforms] = [:]
        var firstDefaults: [(key: String, entry: Entry)] = []
        for entry in entries {
            guard !entry.isRequirement, required[key(entry)] != nil else {
                result.append(entry)
                continue
            }
            if defaults[key(entry)] == nil { firstDefaults.append((key(entry), entry)) }
            defaults[key(entry), default: []].formUnion(entry.platforms)
        }
        for (key, entry) in firstDefaults {
            guard let compiled = defaults[key], let requirement = required[key], compiled != requirement else { continue }
            problems.add(
                entry.location,
                "the default implementation of \(owner).\(entry.fullName) is compiled for \(compiled), but the requirement for \(requirement); the docs site can't show a default on different platforms from its requirement"
            )
        }
        for index in result.indices where result[index].isRequirement {
            result[index].hasDefault = defaults[key(result[index])] != nil
        }
        return result
    }

    /// Groups entries into members, in the order each is first declared. Methods are named by their base name, or by
    /// their full name when another member shares the base name.
    private func group(_ entries: [Entry]) -> [[Entry]] {
        var entries = entries
        var byBase: [String: [Int]] = [:]
        for (index, entry) in entries.enumerated() { byBase["\(entry.isStatic) \(entry.baseName)", default: []].append(index) }
        for indices in byBase.values {
            let fullNames = Set(indices.map { entries[$0].fullName })
            guard fullNames.count > 1 || indices.contains(where: { entries[$0].kind != .method }) else { continue }
            for index in indices where entries[index].kind == .method { entries[index].name = entries[index].fullName }
        }
        var keys: [String] = []
        var groups: [String: [Entry]] = [:]
        for entry in entries {
            let key = "\(entry.isStatic) \(entry.name)"
            if groups[key] == nil { keys.append(key) }
            groups[key, default: []].append(entry)
        }
        return keys.compactMap { groups[$0] }
    }

    private func member(_ group: [Entry], owner: String, platforms: Platforms) -> SurfaceMember {
        let first = group[0]
        let name = "\(owner).\(first.name)"
        if let other = group.first(where: { $0.kind != first.kind }) {
            problems.add(
                other.location,
                "\(name) names both a \(memberLabel(first.kind)) and a \(memberLabel(other.kind)); the docs site shows one member per name"
            )
        }
        var list = SignatureList()
        for entry in group { list.add(entry.signature, entry.platforms) }
        if list.platformsDiffer {
            problems.add(
                first.location,
                "the declarations of \(name) are compiled for different platforms; the docs site shows one platform note for all of them"
            )
        }
        let (docs, docProblems) = Docs.merge(group.map(\.docs), name: name)
        for problem in docProblems { problems.add(first.location, problem) }
        var notes: [String] = []
        if list.platforms != platforms { notes.append(list.platforms.note) }
        if group.contains(where: \.hasDefault) { notes.append(defaultNote) }
        return SurfaceMember(
            name: first.name, kind: first.kind, signatures: list.texts, docs: docs.text(notes: notes),
            deprecated: deprecation(group.map(\.deprecated), of: name, at: first.location), isStatic: first.isStatic)
    }

    /// The public entries a member declaration declares. Protocol requirements and enum cases are as public as their
    /// type; extension members take the extension's access when they state none.
    private func entries(of member: MemberDecl, isRequirement: Bool) -> [Entry] {
        let decl = member.node
        let location = member.file.location(of: decl)
        if decl.is(DeinitializerDeclSyntax.self) { return [] }
        if decl.is(AssociatedTypeDeclSyntax.self) {
            problems.add(location, "can't document associated types; the docs site has no member kind for them")
            return []
        }
        if let label = unsupportedLabel(decl) {
            problems.add(location, "can't document \(label)")
            return []
        }
        let modifiers = decl.asProtocol(WithModifiersSyntax.self)?.modifiers ?? []
        let visible: Bool
        if let owner = member.owner {
            visible = (access(of: modifiers) ?? access(of: owner.node.modifiers)) == .public
        } else {
            visible = isRequirement || decl.is(EnumCaseDeclSyntax.self) || access(of: modifiers) == .public
        }
        guard visible else { return [] }
        let attributes = check(attributes: decl, at: location)
        guard attributes.supported else { return [] }
        let docs = self.docs(of: decl, at: location)
        let staticMember = isStatic(modifiers)
        let constrained = member.owner?.node.genericWhereClause != nil

        func entry(_ name: String, full: String, kind: MemberKind, isStatic: Bool, _ signature: (String, docInside: Bool))
            -> Entry
        {
            if signature.docInside { problems.add(location, docCommentInside) }
            return Entry(
                name: name, baseName: name, fullName: full, kind: kind, isStatic: isStatic, signature: signature.0,
                platforms: member.platforms, docs: docs, deprecated: attributes.deprecated, location: location,
                isRequirement: isRequirement, isConstrained: constrained)
        }

        if let function = decl.as(FunctionDeclSyntax.self) {
            switch function.name.tokenKind {
            case .binaryOperator, .prefixOperator, .postfixOperator:
                problems.add(location, "can't document the operator \(function.name.text); the docs site has no member kind for operators")
                return []
            default: break
            }
            let name = function.name.text.trimmingBackticks
            let parameters = Array(function.signature.parameterClause.parameters)
            checkParameters(docs, parameters.map { [$0.firstName.text, $0.secondName?.text] }, of: name, at: location)
            let full = "\(name)(\(parameters.map { "\($0.firstName.text.trimmingBackticks):" }.joined()))"
            return [entry(name, full: full, kind: .method, isStatic: staticMember, signatures.function(function))]
        }
        if let initializer = decl.as(InitializerDeclSyntax.self) {
            let parameters = Array(initializer.signature.parameterClause.parameters)
            checkParameters(docs, parameters.map { [$0.firstName.text, $0.secondName?.text] }, of: "init", at: location)
            let full = "init(\(parameters.map { "\($0.firstName.text.trimmingBackticks):" }.joined()))"
            return [entry("init", full: full, kind: .constructor, isStatic: false, signatures.initializer(initializer))]
        }
        if let subscriptDecl = decl.as(SubscriptDeclSyntax.self) {
            let parameters = Array(subscriptDecl.parameterClause.parameters)
            checkParameters(docs, parameters.map { [$0.firstName.text, $0.secondName?.text] }, of: "subscript", at: location)
            let labels = parameters.map { $0.secondName == nil ? "_:" : "\($0.firstName.text.trimmingBackticks):" }
            return [
                entry(
                    "subscript", full: "subscript(\(labels.joined()))", kind: .index, isStatic: staticMember,
                    signatures.subscript(subscriptDecl, setterPublic: setterIsPublic(modifiers))),
            ]
        }
        if let variable = decl.as(VariableDeclSyntax.self) {
            let (bindings, inside, bindingProblems) = signatures.variable(variable, requirement: isRequirement)
            for problem in bindingProblems { problems.add(location, problem) }
            if inside { problems.add(location, docCommentInside) }
            return bindings.map { entry($0.name, full: $0.name, kind: .property, isStatic: staticMember, ($0.signature, false)) }
        }
        if let enumCase = decl.as(EnumCaseDeclSyntax.self) {
            return enumCase.elements.map { element in
                let name = element.name.text.trimmingBackticks
                let parameters = element.parameterClause.map { Array($0.parameters) } ?? []
                checkParameters(docs, parameters.map { [$0.firstName?.text, $0.secondName?.text] }, of: name, at: location)
                return entry(name, full: name, kind: .case, isStatic: false, signatures.enumCase(enumCase, element))
            }
        }
        return []
    }

    /// Reports `- Parameter` callouts for parameters the declaration doesn't have, by label or by name.
    private func checkParameters(_ docs: Docs, _ names: [[String?]], of name: String, at location: Location) {
        let known = Set(names.joined().compactMap { $0?.trimmingBackticks }).subtracting(["_"])
        for parameter in docs.parameters where !known.contains(parameter.name) {
            problems.add(location, "the doc comment describes a parameter \(parameter.name), which \(name) doesn't have")
        }
    }

    // MARK: Attributes and docs

    private struct Attributes {
        let supported: Bool
        let deprecated: String?
    }

    /// Checks the attributes the surface can't show, and reads `@available(*, deprecated)`.
    private func check(attributes decl: DeclSyntax, at location: Location) -> Attributes {
        var supported = true
        var deprecated: String?
        for element in decl.asProtocol(WithAttributesSyntax.self)?.attributes ?? [] {
            guard let attribute = element.as(AttributeSyntax.self) else {
                problems.add(location, "can't document #if inside an attribute list; put the whole declaration in #if")
                supported = false
                continue
            }
            if attribute.attributeName.trimmedDescription == "_spi" {
                problems.add(location, "can't document @_spi declarations; the docs site documents the public API only")
                supported = false
            }
            switch availability(of: attribute) {
            case .deprecated(let message)?:
                deprecated = convert(message, at: location)
            case .unsupported(let text)?:
                problems.add(location, "can't document \(text)")
                supported = false
            case nil:
                break
            }
        }
        return Attributes(supported: supported, deprecated: deprecated)
    }

    private func deprecation(_ deprecations: [String?], of name: String, at location: Location) -> String? {
        guard let first = deprecations.first else { return nil }
        if deprecations.contains(where: { $0 != first }) {
            problems.add(location, "deprecate every declaration of \(name) with the same message, or none of them")
        }
        return first
    }

    private func docs(of node: some SyntaxProtocol, at location: Location) -> Docs {
        let (lines, lineProblems) = reader.lines(of: node)
        for problem in lineProblems { problems.add(location, problem) }
        let (comment, parseProblems) = reader.parse(lines)
        for problem in parseProblems { problems.add(location, problem) }
        return Docs(
            description: convert(comment.description, at: location),
            parameters: comment.parameters.map { Docs.Parameter(name: $0.name, text: convert($0.text, at: location)) },
            returns: comment.returns.map { convert($0, at: location) },
            throwsText: comment.throwsText.map { convert($0, at: location) })
    }

    private func convert(_ markdown: String, at location: Location) -> String {
        let (text, conversionProblems) = reader.convert(markdown)
        for problem in conversionProblems { problems.add(location, problem) }
        return text
    }

    private func hasDocComment(_ node: some SyntaxProtocol) -> Bool {
        node.firstToken(viewMode: .sourceAccurate)?.leadingTrivia.contains(where: \.isDocComment) ?? false
    }

    /// Classes that inherit from a documented class would need its members listed as inherited ones, which the
    /// extractor doesn't do yet.
    private func checkSuperclass(_ type: TypeDecl, at location: Location) {
        guard let node = type.node.as(ClassDeclSyntax.self), let inherited = node.inheritanceClause?.inheritedTypes.first,
            let name = dottedName(inherited.type), types(named: name).contains(where: { $0.kind == .class })
        else { return }
        problems.add(location, "\(type.name) inherits from \(name); the extractor doesn't list inherited members yet")
    }

    /// Every heading on a package's reference page needs its own anchor, or links to it go to the first.
    private func checkAnchors(_ package: SurfacePackage) {
        var seen: [String: String] = [:]
        func add(_ heading: String) {
            let slug = slugify(heading)
            if let other = seen[slug] {
                // Identical headings come from two symbols with one name, which run() reports where it finds them.
                guard other != heading else { return }
                problems.add(
                    "the \(package.name) reference page would give the headings \"\(other)\" and \"\(heading)\" the same anchor #\(slug)")
            } else {
                seen[slug] = heading
            }
        }
        add(package.name)
        for (kind, title) in symbolGroupTitles where package.symbols.contains(where: { $0.kind == kind }) { add(title) }
        for symbol in package.symbols {
            add("\(symbol.name) \(symbol.kind.rawValue)")
            for member in symbol.members {
                let display =
                    member.kind == .constructor
                    ? symbol.name
                    : member.name.hasPrefix("(") || member.name.hasPrefix("[")
                        ? symbol.name + member.name : "\(symbol.name).\(member.name)"
                add("\(display) \(member.isStatic ? "static " : "")\(memberLabel(member.kind))")
            }
        }
    }
}
