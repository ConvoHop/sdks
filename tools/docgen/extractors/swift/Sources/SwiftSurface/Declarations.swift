import SwiftSyntax

/// A module's declarations, with the platforms each is compiled for.
final class Module {
    let name: String
    let files: [SourceFile]
    var types: [TypeDecl] = []
    var extensions: [ExtensionDecl] = []
    /// Top-level functions and variables.
    var globals: [MemberDecl] = []
    /// `@_exported import` declarations, with the platforms that compile them.
    var exports: [(node: ImportDeclSyntax, file: SourceFile, platforms: Platforms)] = []

    init(name: String, files: [SourceFile]) {
        self.name = name
        self.files = files
    }
}

enum TypeKind {
    case `class`, `struct`, `enum`, `protocol`, actor, `typealias`

    var symbolKind: SymbolKind {
        switch self {
        case .class, .actor: .class
        case .struct: .struct
        case .enum: .enum
        case .protocol: .interface
        case .typealias: .type
        }
    }
}

/// A class, struct, enum, protocol, actor or type alias declaration.
final class TypeDecl {
    enum Parent {
        case module
        case type(TypeDecl)
        case `extension`(ExtensionDecl)
    }

    let name: String
    let kind: TypeKind
    let node: DeclSyntax
    let module: Module
    let file: SourceFile
    let fileIndex: Int
    let platforms: Platforms
    let parent: Parent
    var members: [MemberDecl] = []

    init(
        name: String, kind: TypeKind, node: DeclSyntax, module: Module, file: SourceFile, fileIndex: Int,
        platforms: Platforms, parent: Parent
    ) {
        self.name = name
        self.kind = kind
        self.node = node
        self.module = module
        self.file = file
        self.fileIndex = fileIndex
        self.platforms = platforms
        self.parent = parent
    }

    var modifiers: DeclModifierListSyntax { node.asProtocol(WithModifiersSyntax.self)?.modifiers ?? [] }

    /// The dotted name, or nil while the extension it's declared in isn't resolved.
    var qualifiedName: String? {
        switch parent {
        case .module: name
        case .type(let parent): parent.qualifiedName.map { "\($0).\(name)" }
        case .extension(let owner): owner.target?.qualifiedName.map { "\($0).\(name)" }
        }
    }

    /// Whether code outside the module can name the type.
    var isPublic: Bool {
        switch parent {
        case .module:
            return access(of: modifiers) == .public
        case .type(let parent):
            return access(of: modifiers) == .public && parent.isPublic
        case .extension(let owner):
            guard let target = owner.target else { return false }
            return (access(of: modifiers) ?? access(of: owner.node.modifiers)) == .public && target.isPublic
        }
    }

    /// The type's own failable initializers make `T(...)` an optional, so its type can't be inferred.
    var hasFailableInitializer: Bool {
        members.contains { $0.node.as(InitializerDeclSyntax.self)?.optionalMark != nil }
    }

    /// Whether the type has generic parameters, which `T(...)` infers from its arguments.
    var isGeneric: Bool {
        node.asProtocol(WithGenericParametersSyntax.self)?.genericParameterClause != nil
    }
}

/// An extension of a type.
final class ExtensionDecl {
    let node: ExtensionDeclSyntax
    let module: Module
    let file: SourceFile
    let fileIndex: Int
    let platforms: Platforms
    var members: [MemberDecl] = []
    /// The documented type the extension extends, once resolved. Nil for types outside the documented modules.
    var target: TypeDecl?

    init(node: ExtensionDeclSyntax, module: Module, file: SourceFile, fileIndex: Int, platforms: Platforms) {
        self.node = node
        self.module = module
        self.file = file
        self.fileIndex = fileIndex
        self.platforms = platforms
    }

    /// The extended type's name as written, such as `ConvoHopOutbox.Entry`.
    var extendedName: String? { dottedName(node.extendedType) }
}

/// A member of a type or extension, or a top-level function or variable.
struct MemberDecl {
    let node: DeclSyntax
    let file: SourceFile
    let fileIndex: Int
    let platforms: Platforms
    /// The extension that declares the member, if any.
    let owner: ExtensionDecl?

    var order: (Int, Int, Int) {
        (owner == nil ? 0 : 1, fileIndex, node.position.utf8Offset)
    }
}

enum Access {
    case `public`, nonPublic
}

/// The access a declaration states for reading, or nil when it states none. `private(set)` and the like only limit
/// setting.
func access(of modifiers: DeclModifierListSyntax) -> Access? {
    for modifier in modifiers where modifier.detail == nil {
        switch modifier.name.text {
        case "public", "open": return .public
        case "internal", "fileprivate", "private", "package": return .nonPublic
        default: continue
        }
    }
    return nil
}

/// Whether code outside the module can set a variable that has a setter.
func setterIsPublic(_ modifiers: DeclModifierListSyntax) -> Bool {
    !modifiers.contains { $0.detail?.detail.text == "set" && $0.name.text != "public" && $0.name.text != "open" }
}

func isStatic(_ modifiers: DeclModifierListSyntax) -> Bool {
    modifiers.contains { $0.name.text == "static" || $0.name.text == "class" }
}

/// The dotted name of a simple type such as `A.B`, ignoring generic arguments.
func dottedName(_ type: TypeSyntax) -> String? {
    if let identifier = type.as(IdentifierTypeSyntax.self) { return identifier.name.text }
    if let member = type.as(MemberTypeSyntax.self) {
        return dottedName(member.baseType).map { "\($0).\(member.name.text)" }
    }
    return nil
}

/// Walks a module's sources: every declaration outside function bodies, with the platforms on which `#if` compiles
/// it.
struct Walker {
    let module: Module
    let problems: Problems

    func walk() {
        for (index, file) in module.files.enumerated() {
            walk(statements: file.tree.statements, platforms: .all, file: file, fileIndex: index)
            checkOrphans(file.tree.endOfFileToken, file: file)
        }
    }

    private func walk(statements: CodeBlockItemListSyntax, platforms: Platforms, file: SourceFile, fileIndex: Int) {
        for item in statements {
            // Outside a type, the parser reads a freestanding macro such as `#name()` as an expression.
            if case .expr(let expression) = item.item, let expansion = expression.as(MacroExpansionExprSyntax.self),
                let label = expansionLabel(expansion.macroName.text)
            {
                problems.add(file.location(of: expansion), "can't document \(label)")
                continue
            }
            guard case .decl(let decl) = item.item else { continue }
            if let config = decl.as(IfConfigDeclSyntax.self) {
                for (clause, active) in clauses(of: config, file: file) {
                    if case .statements(let nested) = clause.elements, !active.intersection(platforms).isEmpty {
                        walk(statements: nested, platforms: active.intersection(platforms), file: file, fileIndex: fileIndex)
                    }
                }
                continue
            }
            if let type = typeDecl(decl, platforms: platforms, file: file, fileIndex: fileIndex, parent: .module) {
                module.types.append(type)
                continue
            }
            if let node = decl.as(ExtensionDeclSyntax.self) {
                let owner = ExtensionDecl(node: node, module: module, file: file, fileIndex: fileIndex, platforms: platforms)
                module.extensions.append(owner)
                walk(members: node.memberBlock, platforms: platforms, file: file, fileIndex: fileIndex, into: .extension(owner))
                continue
            }
            if let node = decl.as(ImportDeclSyntax.self) {
                if node.attributes.contains(where: { $0.as(AttributeSyntax.self)?.attributeName.trimmedDescription == "_exported" }) {
                    module.exports.append((node, file, platforms))
                }
                continue
            }
            if decl.is(FunctionDeclSyntax.self) || decl.is(VariableDeclSyntax.self) {
                module.globals.append(MemberDecl(node: decl, file: file, fileIndex: fileIndex, platforms: platforms, owner: nil))
                continue
            }
            if let unsupported = unsupportedLabel(decl) {
                problems.add(file.location(of: decl), "can't document \(unsupported)")
            }
        }
    }

    enum Owner {
        case type(TypeDecl)
        case `extension`(ExtensionDecl)
    }

    private func walk(members block: MemberBlockSyntax, platforms: Platforms, file: SourceFile, fileIndex: Int, into owner: Owner) {
        walk(members: block.members, platforms: platforms, file: file, fileIndex: fileIndex, into: owner)
        checkOrphans(block.rightBrace, file: file)
    }

    private func walk(members: MemberBlockItemListSyntax, platforms: Platforms, file: SourceFile, fileIndex: Int, into owner: Owner) {
        for item in members {
            let decl = item.decl
            if let config = decl.as(IfConfigDeclSyntax.self) {
                for (clause, active) in clauses(of: config, file: file) {
                    if case .decls(let nested) = clause.elements, !active.intersection(platforms).isEmpty {
                        walk(members: nested, platforms: active.intersection(platforms), file: file, fileIndex: fileIndex, into: owner)
                    }
                }
                continue
            }
            let parent: TypeDecl.Parent
            switch owner {
            case .type(let type): parent = .type(type)
            case .extension(let ext): parent = .extension(ext)
            }
            if let type = typeDecl(decl, platforms: platforms, file: file, fileIndex: fileIndex, parent: parent) {
                module.types.append(type)
                continue
            }
            let member = MemberDecl(node: decl, file: file, fileIndex: fileIndex, platforms: platforms, owner: nil)
            switch owner {
            case .type(let type): type.members.append(member)
            case .extension(let ext):
                ext.members.append(MemberDecl(node: decl, file: file, fileIndex: fileIndex, platforms: platforms, owner: ext))
            }
        }
    }

    private func typeDecl(_ decl: DeclSyntax, platforms: Platforms, file: SourceFile, fileIndex: Int, parent: TypeDecl.Parent)
        -> TypeDecl?
    {
        let found: (String, TypeKind, MemberBlockSyntax?)
        if let node = decl.as(ClassDeclSyntax.self) {
            found = (node.name.text, .class, node.memberBlock)
        } else if let node = decl.as(StructDeclSyntax.self) {
            found = (node.name.text, .struct, node.memberBlock)
        } else if let node = decl.as(EnumDeclSyntax.self) {
            found = (node.name.text, .enum, node.memberBlock)
        } else if let node = decl.as(ProtocolDeclSyntax.self) {
            found = (node.name.text, .protocol, node.memberBlock)
        } else if let node = decl.as(ActorDeclSyntax.self) {
            found = (node.name.text, .actor, node.memberBlock)
        } else if let node = decl.as(TypeAliasDeclSyntax.self) {
            found = (node.name.text, .typealias, nil)
        } else {
            return nil
        }
        let type = TypeDecl(
            name: found.0.trimmingBackticks, kind: found.1, node: decl, module: module, file: file, fileIndex: fileIndex,
            platforms: platforms, parent: parent)
        if let block = found.2 {
            walk(members: block, platforms: platforms, file: file, fileIndex: fileIndex, into: .type(type))
        }
        return type
    }

    /// The clauses of an `#if` with the platforms on which each is active. Doc comments on `#if`, `#elseif`,
    /// `#else` and `#endif` document nothing.
    private func clauses(of config: IfConfigDeclSyntax, file: SourceFile) -> [(IfConfigClauseSyntax, Platforms)] {
        for clause in config.clauses { checkOrphans(clause.poundKeyword, file: file) }
        checkOrphans(config.poundEndif, file: file)
        do {
            return try config.activeClauses()
        } catch {
            problems.add(file.location(of: config), error.message)
            return []
        }
    }

    /// Reports doc comments in the leading trivia of a token that isn't a declaration's first, at the first one's line.
    private func checkOrphans(_ token: TokenSyntax, file: SourceFile) {
        var position = token.position
        for piece in token.leadingTrivia {
            if piece.isDocComment {
                problems.add(
                    file.location(at: position),
                    "this doc comment documents no declaration; move it onto the declaration it describes")
                return
            }
            position = position.advanced(by: piece.sourceLength.utf8Length)
        }
    }
}

extension TriviaPiece {
    var isDocComment: Bool {
        switch self {
        case .docLineComment, .docBlockComment: true
        default: false
        }
    }
}

extension String {
    var trimmingBackticks: String {
        hasPrefix("`") && hasSuffix("`") && count > 1 ? String(dropFirst().dropLast()) : self
    }
}

/// What a declaration is when the extractor can't document it, such as a macro; nil otherwise.
func unsupportedLabel(_ decl: DeclSyntax) -> String? {
    if decl.is(MacroDeclSyntax.self) { return "macro declarations" }
    if let expansion = decl.as(MacroExpansionDeclSyntax.self) { return expansionLabel(expansion.macroName.text) }
    if decl.is(OperatorDeclSyntax.self) { return "operator declarations" }
    if decl.is(PrecedenceGroupDeclSyntax.self) { return "precedence groups" }
    return nil
}

/// What the freestanding macro `#name` expands to, or nil for `#warning` and `#error`, which declare nothing.
func expansionLabel(_ name: String) -> String? {
    name == "warning" || name == "error" ? nil : "what #\(name) expands to"
}
