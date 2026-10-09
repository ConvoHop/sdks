import SwiftParser
import SwiftSyntax

/// Renders tokens of declarations as normalized source: one space wherever the source has whitespace, a comment or
/// skipped code, none just inside brackets, no trailing commas, and a line break after an attribute that ends its
/// line.
struct Tokens {
    private var entries: [(separator: String, text: String)] = []
    private var previous: TokenSyntax?
    private var gap = false
    private let attributeEnds: Set<AbsolutePosition>
    private let firstToken: AbsolutePosition?
    private(set) var docCommentInside = false

    /// `declaration` is the declaration whose attributes end lines, and whose first token may carry its doc comment.
    init(declaration: (some SyntaxProtocol)? = nil as DeclSyntax?) {
        var ends = Set<AbsolutePosition>()
        if let attributes = declaration.flatMap({ $0.asProtocol(WithAttributesSyntax.self)?.attributes }) {
            for attribute in attributes {
                if let last = attribute.lastToken(viewMode: .sourceAccurate) {
                    ends.insert(last.endPositionBeforeTrailingTrivia)
                }
            }
        }
        attributeEnds = ends
        firstToken = declaration?.firstToken(viewMode: .sourceAccurate)?.positionAfterSkippingLeadingTrivia
    }

    mutating func append(_ node: (some SyntaxProtocol)?, skipping: [Syntax] = []) {
        guard let node else { return }
        for token in node.tokens(viewMode: .sourceAccurate) {
            if skipping.contains(where: { $0.position <= token.position && token.position < $0.endPosition }) {
                gap = true
                continue
            }
            if token.presence == .missing { continue }
            if token.positionAfterSkippingLeadingTrivia != firstToken,
                token.leadingTrivia.contains(where: \.isDocComment)
            {
                docCommentInside = true
            }
            var separator = ""
            if let previous {
                let between = Array(previous.trailingTrivia) + Array(token.leadingTrivia)
                if ["(", "["].contains(previous.text) || [")", "]"].contains(token.text) {
                    separator = ""
                } else if attributeEnds.contains(previous.endPositionBeforeTrailingTrivia),
                    between.contains(where: \.isNewline)
                {
                    separator = "\n"
                } else if gap || previous.endPosition != token.position || !between.isEmpty {
                    separator = " "
                }
            }
            entries.append((separator, token.text))
            previous = token
            gap = false
        }
    }

    /// Marks that code was left out, so the next token is separated by a space.
    mutating func skip() {
        gap = true
    }

    var text: String {
        var out = ""
        for (index, entry) in entries.enumerated() {
            if entry.text == ",", index + 1 < entries.count, [")", "]"].contains(entries[index + 1].text) { continue }
            out += entry.separator + entry.text
        }
        return out
    }

    var isEmpty: Bool { entries.isEmpty }
}

/// Lays out a declaration with a parameter clause: on one line, or with one parameter per line when the line
/// would be longer than 100 columns.
func layout(head: String, parameters: [String], tail: String) -> String {
    let close = tail.isEmpty ? ")" : ") \(tail)"
    let single = "\(head)(\(parameters.joined(separator: ", "))\(close)"
    let lastLine = single.split(separator: "\n", omittingEmptySubsequences: false).last ?? ""
    if lastLine.count <= 100 || parameters.isEmpty { return single }
    return "\(head)(\n" + parameters.map { "    \($0)" }.joined(separator: ",\n") + "\n\(close)"
}

/// A `@available` attribute that deprecates or hides a declaration on every platform.
enum Availability {
    /// `@available(*, deprecated)`, with its replacement or reason as Markdown.
    case deprecated(String)
    /// `@available(*, unavailable)`, or anything the extractor can't represent.
    case unsupported(String)
}

func availability(of attribute: AttributeSyntax) -> Availability? {
    guard attribute.attributeName.trimmedDescription == "available",
        case .availability(let arguments) = attribute.arguments
    else { return nil }
    var tokens: [String] = []
    var labeled: [String: String] = [:]
    var deprecatedVersion = false
    for argument in arguments {
        switch argument.argument {
        case .token(let token): tokens.append(token.text)
        case .availabilityVersionRestriction(let restriction): tokens.append(restriction.platform.text)
        case .availabilityLabeledArgument(let labeledArgument):
            switch labeledArgument.value {
            case .string(let string):
                labeled[labeledArgument.label.text] = string.literalValue ?? string.trimmedDescription
            case .version:
                if labeledArgument.label.text == "deprecated" { deprecatedVersion = true }
                labeled[labeledArgument.label.text] = labeledArgument.value.trimmedDescription
            }
        }
    }
    let everywhere = tokens.first == "*"
    if tokens.contains("unavailable") && everywhere { return .unsupported("@available(*, unavailable)") }
    guard tokens.contains("deprecated") || deprecatedVersion else { return nil }
    guard everywhere, !deprecatedVersion else {
        return .unsupported("platform-specific deprecation \(attribute.trimmedDescription)")
    }
    if let message = labeled["message"] { return .deprecated(message) }
    if let renamed = labeled["renamed"] { return .deprecated("Use `\(renamed)` instead.") }
    return .deprecated("")
}

/// Builds the signatures of declarations, given what the extractor knows about the documented types.
struct Signatures {
    /// Whether an inherited type is an in-package protocol that code outside the module can't see.
    let isHiddenProtocol: (String) -> Bool
    /// The documented type a `T(...)` initializer creates, if `T` names one without failable initializers. The flag
    /// says whether the call spells out generic arguments, which a generic type needs to be inferred.
    let initializedType: (_ name: String, _ specialized: Bool) -> String?

    /// The attributes that stay in signatures: all but `@available(*, deprecated)`.
    func keptAttributes(_ attributes: AttributeListSyntax) -> (kept: [Syntax], dropped: [Syntax]) {
        var kept: [Syntax] = []
        var dropped: [Syntax] = []
        for element in attributes {
            if let attribute = element.as(AttributeSyntax.self), case .deprecated = availability(of: attribute) {
                dropped.append(Syntax(element))
            } else {
                kept.append(Syntax(element))
            }
        }
        return (kept, dropped)
    }

    private func head(_ declaration: DeclSyntax, _ attributes: AttributeListSyntax, _ rest: [Syntax?]) -> Tokens {
        var tokens = Tokens(declaration: declaration)
        tokens.append(attributes, skipping: keptAttributes(attributes).dropped)
        for node in rest { tokens.append(node) }
        return tokens
    }

    private func render(_ nodes: [Syntax?]) -> String {
        var tokens = Tokens()
        for node in nodes { tokens.append(node) }
        return tokens.text
    }

    private func parameter(_ node: some SyntaxProtocol, comma: TokenSyntax?) -> String {
        var tokens = Tokens()
        tokens.append(node, skipping: comma.map { [Syntax($0)] } ?? [])
        return tokens.text
    }

    /// Whether a token of `nodes`, which the signature shows after its head, carries a doc comment. A doc comment
    /// there documents nothing.
    private func hasDocComment(_ nodes: [Syntax?]) -> Bool {
        nodes.contains { node in
            node?.tokens(viewMode: .sourceAccurate).contains { $0.leadingTrivia.contains(where: \.isDocComment) } == true
        }
    }

    func function(_ node: FunctionDeclSyntax) -> (String, docInside: Bool) {
        let head = head(
            DeclSyntax(node), node.attributes,
            [Syntax(node.modifiers), Syntax(node.funcKeyword), Syntax(node.name), node.genericParameterClause.map(Syntax.init)])
        let parameters = node.signature.parameterClause.parameters.map { parameter($0, comma: $0.trailingComma) }
        let tail = render([
            node.signature.effectSpecifiers.map(Syntax.init), node.signature.returnClause.map(Syntax.init),
            node.genericWhereClause.map(Syntax.init),
        ])
        let inside = head.docCommentInside || hasDocComment([Syntax(node.signature), node.genericWhereClause.map(Syntax.init)])
        return (layout(head: head.text, parameters: parameters, tail: tail), inside)
    }

    func initializer(_ node: InitializerDeclSyntax) -> (String, docInside: Bool) {
        let head = head(
            DeclSyntax(node), node.attributes,
            [
                Syntax(node.modifiers), Syntax(node.initKeyword), node.optionalMark.map(Syntax.init),
                node.genericParameterClause.map(Syntax.init),
            ])
        let parameters = node.signature.parameterClause.parameters.map { parameter($0, comma: $0.trailingComma) }
        let tail = render([node.signature.effectSpecifiers.map(Syntax.init), node.genericWhereClause.map(Syntax.init)])
        let inside = head.docCommentInside || hasDocComment([Syntax(node.signature), node.genericWhereClause.map(Syntax.init)])
        return (layout(head: head.text, parameters: parameters, tail: tail), inside)
    }

    func `subscript`(_ node: SubscriptDeclSyntax, setterPublic: Bool) -> (String, docInside: Bool) {
        let head = head(
            DeclSyntax(node), node.attributes,
            [Syntax(node.modifiers), Syntax(node.subscriptKeyword), node.genericParameterClause.map(Syntax.init)])
        let parameters = node.parameterClause.parameters.map { parameter($0, comma: $0.trailingComma) }
        var tail = render([Syntax(node.returnClause), node.genericWhereClause.map(Syntax.init)])
        if let block = node.accessorBlock, let summary = accessorSummary(block, setterPublic: setterPublic) {
            tail += " \(summary)"
        } else if node.accessorBlock == nil {
            tail += " { get }"
        }
        let inside =
            head.docCommentInside
            || hasDocComment([Syntax(node.parameterClause), Syntax(node.returnClause), node.genericWhereClause.map(Syntax.init)])
        return (layout(head: head.text, parameters: parameters, tail: tail), inside)
    }

    func enumCase(_ node: EnumCaseDeclSyntax, _ element: EnumCaseElementSyntax) -> (String, docInside: Bool) {
        let head = head(DeclSyntax(node), node.attributes, [Syntax(node.modifiers), Syntax(node.caseKeyword)])
        let name = "\(head.text) \(element.name.text)"
        let tail = render([element.rawValue.map(Syntax.init)])
        let inside = head.docCommentInside || hasDocComment([Syntax(element)])
        guard let clause = element.parameterClause else {
            return (tail.isEmpty ? name : "\(name) \(tail)", inside)
        }
        let parameters = clause.parameters.map { parameter($0, comma: $0.trailingComma) }
        return (layout(head: name, parameters: parameters, tail: tail), inside)
    }

    /// The signature of a type's declaration, with protocols that code outside the module can't see left out of
    /// its inheritance clause.
    func type(_ type: TypeDecl) -> (String, docInside: Bool) {
        let node = type.node
        if let alias = node.as(TypeAliasDeclSyntax.self) {
            let head = head(
                node, alias.attributes,
                [
                    Syntax(alias.modifiers), Syntax(alias.typealiasKeyword), Syntax(alias.name),
                    alias.genericParameterClause.map(Syntax.init), Syntax(alias.initializer),
                    alias.genericWhereClause.map(Syntax.init),
                ])
            return (head.text, head.docCommentInside)
        }
        guard let group = node.asProtocol(DeclGroupSyntax.self) else { return ("", false) }
        var rest: [Syntax?] = [Syntax(group.modifiers)]
        if let declaration = node.as(ClassDeclSyntax.self) {
            rest += [Syntax(declaration.classKeyword), Syntax(declaration.name), declaration.genericParameterClause.map(Syntax.init)]
        } else if let declaration = node.as(StructDeclSyntax.self) {
            rest += [Syntax(declaration.structKeyword), Syntax(declaration.name), declaration.genericParameterClause.map(Syntax.init)]
        } else if let declaration = node.as(EnumDeclSyntax.self) {
            rest += [Syntax(declaration.enumKeyword), Syntax(declaration.name), declaration.genericParameterClause.map(Syntax.init)]
        } else if let declaration = node.as(ProtocolDeclSyntax.self) {
            rest += [
                Syntax(declaration.protocolKeyword), Syntax(declaration.name),
                declaration.primaryAssociatedTypeClause.map(Syntax.init),
            ]
        } else if let declaration = node.as(ActorDeclSyntax.self) {
            rest += [Syntax(declaration.actorKeyword), Syntax(declaration.name), declaration.genericParameterClause.map(Syntax.init)]
        }
        let head = head(node, group.attributes, rest)
        let inside =
            head.docCommentInside
            || hasDocComment([group.inheritanceClause.map(Syntax.init), group.genericWhereClause.map(Syntax.init)])
        return (head.text + clauses(group.inheritanceClause, group.genericWhereClause), inside)
    }

    /// `extension X: P` for an extension that adds conformances, or nil when it adds none that code outside the
    /// module can see.
    func conformance(_ node: ExtensionDeclSyntax) -> String? {
        visibleInheritance(node.inheritanceClause).isEmpty ? nil : extensionDeclaration(node)
    }

    /// `extension X`, with the conformances that code outside the module can see and the `where` clause.
    func extensionDeclaration(_ node: ExtensionDeclSyntax) -> String {
        "extension \(render([Syntax(node.extendedType)]))" + clauses(node.inheritanceClause, node.genericWhereClause)
    }

    func visibleInheritance(_ clause: InheritanceClauseSyntax?) -> [String] {
        guard let clause else { return [] }
        return clause.inheritedTypes.compactMap { inherited in
            if let name = dottedName(inherited.type), isHiddenProtocol(name) { return nil }
            return render([Syntax(inherited.type)])
        }
    }

    private func clauses(_ inheritance: InheritanceClauseSyntax?, _ whereClause: GenericWhereClauseSyntax?) -> String {
        var out = ""
        let inherited = visibleInheritance(inheritance)
        if !inherited.isEmpty { out += ": " + inherited.joined(separator: ", ") }
        if let whereClause { out += " " + render([Syntax(whereClause)]) }
        return out
    }

    /// One signature per binding of a variable declaration, named by the binding.
    func variable(_ node: VariableDeclSyntax, requirement: Bool) -> (
        [(name: String, signature: String)], docInside: Bool, problems: [String]
    ) {
        let head = head(DeclSyntax(node), node.attributes, [Syntax(node.modifiers), Syntax(node.bindingSpecifier)])
        let isLet = node.bindingSpecifier.text == "let"
        let bindings = Array(node.bindings)
        var result: [(name: String, signature: String)] = []
        var problems: [String] = []
        var inside = head.docCommentInside
        for (index, binding) in bindings.enumerated() {
            guard let pattern = binding.pattern.as(IdentifierPatternSyntax.self) else {
                problems.append("can't document the pattern \(binding.pattern.trimmedDescription); declare one name per binding")
                continue
            }
            let name = pattern.identifier.text.trimmingBackticks
            var annotation = binding.typeAnnotation
            if annotation == nil, binding.initializer == nil, binding.accessorBlock == nil {
                annotation = bindings[(index + 1)...].first(where: { $0.typeAnnotation != nil })?.typeAnnotation
            }
            var text = "\(head.text) \(render([Syntax(pattern)]))"
            if let annotation { text += render([Syntax(annotation)]) }
            if hasDocComment([Syntax(pattern), annotation.map(Syntax.init)]) { inside = true }
            if let value = binding.initializer?.value {
                if isLet, isConstant(value) {
                    if hasDocComment([Syntax(value)]) { inside = true }
                    text += " = \(render([Syntax(value)]))"
                } else if annotation == nil {
                    guard let inferred = inferredType(value) else {
                        problems.append("can't infer the type of \(name); give it a type annotation")
                        continue
                    }
                    text += ": \(inferred)"
                }
            }
            if let block = binding.accessorBlock {
                if let summary = accessorSummary(block, setterPublic: setterIsPublic(node.modifiers)) { text += " \(summary)" }
            } else if requirement {
                problems.append("protocol property \(name) needs { get } or { get set }")
            }
            result.append((name, text))
        }
        return (result, inside, problems)
    }

    /// `{ get }`, `{ get set }` or `{ get async throws }` for a computed property or subscript, or nil for a stored
    /// property with observers.
    func accessorSummary(_ block: AccessorBlockSyntax, setterPublic: Bool) -> String? {
        switch block.accessors {
        case .getter:
            return "{ get }"
        case .accessors(let accessors):
            let kinds = accessors.map(\.accessorSpecifier.text)
            if kinds.allSatisfy({ $0 == "willSet" || $0 == "didSet" }) { return nil }
            var parts: [String] = []
            if let getter = accessors.first(where: { ["get", "_read", "unsafeAddress"].contains($0.accessorSpecifier.text) }) {
                let effects = render([getter.effectSpecifiers.map(Syntax.init)])
                parts.append(effects.isEmpty ? "get" : "get \(effects)")
            } else {
                parts.append("get")
            }
            if setterPublic, kinds.contains(where: { ["set", "_modify", "unsafeMutableAddress"].contains($0) }) {
                parts.append("set")
            }
            return "{ \(parts.joined(separator: " ")) }"
        }
    }

    /// Whether a `let` initializer is a value worth showing: a literal, `nil`, a member such as `.none`, or a call of
    /// a type or member with such arguments.
    func isConstant(_ expression: ExprSyntax) -> Bool {
        if expression.is(IntegerLiteralExprSyntax.self) || expression.is(FloatLiteralExprSyntax.self)
            || expression.is(BooleanLiteralExprSyntax.self) || expression.is(NilLiteralExprSyntax.self)
        {
            return true
        }
        if let string = expression.as(StringLiteralExprSyntax.self) { return string.representedLiteralValue != nil }
        if let prefix = expression.as(PrefixOperatorExprSyntax.self) {
            return prefix.operator.text == "-"
                && (prefix.expression.is(IntegerLiteralExprSyntax.self) || prefix.expression.is(FloatLiteralExprSyntax.self))
        }
        if let member = expression.as(MemberAccessExprSyntax.self) {
            return member.base.map(isTypeName) ?? true
        }
        if let array = expression.as(ArrayExprSyntax.self) { return array.elements.allSatisfy { isConstant($0.expression) } }
        if let tuple = expression.as(TupleExprSyntax.self), tuple.elements.count == 1, let only = tuple.elements.first {
            return only.label == nil && isConstant(only.expression)
        }
        if let call = expression.as(FunctionCallExprSyntax.self) {
            guard call.trailingClosure == nil, call.additionalTrailingClosures.isEmpty else { return false }
            let callee = call.calledExpression
            guard isTypeName(callee) || callee.as(MemberAccessExprSyntax.self).map({ $0.base.map(isTypeName) ?? true }) == true
            else { return false }
            return call.arguments.allSatisfy { isConstant($0.expression) }
        }
        return false
    }

    private func isTypeName(_ expression: ExprSyntax) -> Bool {
        if let reference = expression.as(DeclReferenceExprSyntax.self) { return reference.baseName.text.first?.isUppercase == true }
        if let generic = expression.as(GenericSpecializationExprSyntax.self) { return isTypeName(generic.expression) }
        if let member = expression.as(MemberAccessExprSyntax.self), let base = member.base {
            return isTypeName(base) && member.declName.baseName.text.first?.isUppercase == true
        }
        return false
    }

    /// The type of a `var` initializer: a literal's, or the documented type that `T(...)` or `T<A>(...)` creates.
    func inferredType(_ expression: ExprSyntax) -> String? {
        if expression.is(IntegerLiteralExprSyntax.self) { return "Int" }
        if expression.is(FloatLiteralExprSyntax.self) { return "Double" }
        if expression.is(BooleanLiteralExprSyntax.self) { return "Bool" }
        if expression.is(StringLiteralExprSyntax.self) { return "String" }
        if let prefix = expression.as(PrefixOperatorExprSyntax.self), prefix.operator.text == "-" {
            return inferredType(prefix.expression)
        }
        if let call = expression.as(FunctionCallExprSyntax.self) {
            var callee = call.calledExpression
            if let member = callee.as(MemberAccessExprSyntax.self), member.declName.baseName.text == "init",
                let base = member.base
            {
                callee = base
            }
            if let generic = callee.as(GenericSpecializationExprSyntax.self) {
                guard let name = expressionName(generic.expression), let type = initializedType(name, true) else {
                    return nil
                }
                return type + render([Syntax(generic.genericArgumentClause)])
            }
            if let name = expressionName(callee) { return initializedType(name, false) }
        }
        return nil
    }

    private func expressionName(_ expression: ExprSyntax) -> String? {
        if let reference = expression.as(DeclReferenceExprSyntax.self) { return reference.baseName.text }
        if let member = expression.as(MemberAccessExprSyntax.self), let base = member.base {
            return expressionName(base).map { "\($0).\(member.declName.baseName.text)" }
        }
        return nil
    }
}

extension SimpleStringLiteralExprSyntax {
    /// The string's value with its escapes resolved, or nil when it has an invalid escape.
    var literalValue: String? {
        var parser = Parser(trimmedDescription)
        return ExprSyntax.parse(from: &parser).as(StringLiteralExprSyntax.self)?.representedLiteralValue
    }
}
