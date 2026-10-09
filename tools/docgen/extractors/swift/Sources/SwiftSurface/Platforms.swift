import SwiftSyntax

/// The platforms a declaration is compiled for. The SDK supports iOS and macOS, so `#if` conditions are evaluated
/// for each of them.
struct Platforms: OptionSet, Hashable, CustomStringConvertible {
    let rawValue: Int

    static let iOS = Platforms(rawValue: 1)
    static let macOS = Platforms(rawValue: 2)
    static let all: Platforms = [.iOS, .macOS]

    var description: String {
        switch self {
        case .iOS: "iOS"
        case .macOS: "macOS"
        case .all: "iOS and macOS"
        default: "no platform"
        }
    }

    /// The note that documents a declaration available on fewer platforms than its container.
    var note: String { "Available on \(description) only." }
}

/// Evaluates `#if` conditions on iOS and on macOS, for the conditions the SDK uses. Anything else is a problem, so
/// that a new condition is reviewed instead of silently guessed.
enum PlatformConditions {
    /// The value of `canImport(module)` on each platform, for the modules the SDK checks.
    static let modules: [String: Platforms] = [
        "Darwin": .all,
        "Foundation": .all,
        "Network": .all,
        "CryptoKit": .all,
        "Combine": .all,
        "UserNotifications": .all,
        "UIKit": .iOS,
        "AppKit": .macOS,
        "FoundationNetworking": [],
        "Glibc": [],
    ]

    static let systems: [String: Platforms] = [
        "iOS": .iOS,
        "macOS": .macOS,
        "OSX": .macOS,
        "tvOS": [],
        "watchOS": [],
        "visionOS": [],
        "Linux": [],
        "Windows": [],
        "Android": [],
        "WASI": [],
        "FreeBSD": [],
        "OpenBSD": [],
    ]

    /// The platforms on which `condition` is true.
    static func evaluate(_ condition: ExprSyntax) throws(ConditionError) -> Platforms {
        if let tuple = condition.as(TupleExprSyntax.self), tuple.elements.count == 1,
            let only = tuple.elements.first, only.label == nil
        {
            return try evaluate(only.expression)
        }
        if let prefix = condition.as(PrefixOperatorExprSyntax.self), prefix.operator.text == "!" {
            return Platforms.all.subtracting(try evaluate(prefix.expression))
        }
        if let infix = condition.as(InfixOperatorExprSyntax.self),
            let op = infix.operator.as(BinaryOperatorExprSyntax.self)
        {
            let left = try evaluate(infix.leftOperand)
            let right = try evaluate(infix.rightOperand)
            switch op.operator.text {
            case "&&": return left.intersection(right)
            case "||": return left.union(right)
            default: throw ConditionError(condition)
            }
        }
        if let sequence = condition.as(SequenceExprSyntax.self) {
            // The parser doesn't fold operators: `a || b && c` is the sequence [a, ||, b, &&, c]. && binds tighter.
            let elements = Array(sequence.elements)
            guard elements.count % 2 == 1 else { throw ConditionError(condition) }
            var groups: [Platforms] = []
            var current = try evaluate(elements[0])
            var index = 1
            while index < elements.count {
                guard let op = elements[index].as(BinaryOperatorExprSyntax.self) else { throw ConditionError(condition) }
                let operand = try evaluate(elements[index + 1])
                switch op.operator.text {
                case "&&": current.formIntersection(operand)
                case "||":
                    groups.append(current)
                    current = operand
                default: throw ConditionError(condition)
                }
                index += 2
            }
            groups.append(current)
            return groups.reduce([]) { $0.union($1) }
        }
        if let literal = condition.as(BooleanLiteralExprSyntax.self) {
            return literal.literal.tokenKind == .keyword(.true) ? .all : []
        }
        if let call = condition.as(FunctionCallExprSyntax.self),
            let callee = call.calledExpression.as(DeclReferenceExprSyntax.self), call.trailingClosure == nil,
            call.arguments.count == 1, let argument = call.arguments.first, argument.label == nil,
            let name = argument.expression.as(DeclReferenceExprSyntax.self)?.baseName.text
        {
            switch callee.baseName.text {
            case "os":
                guard let platforms = systems[name] else { throw ConditionError(condition) }
                return platforms
            case "canImport":
                guard let platforms = modules[name] else { throw ConditionError(condition) }
                return platforms
            default: break
            }
        }
        throw ConditionError(condition)
    }
}

struct ConditionError: Error {
    let condition: String

    init(_ condition: ExprSyntax) {
        self.condition = condition.trimmedDescription
    }

    var message: String {
        "can't evaluate #if \(condition) for iOS and macOS; teach the extractor's PlatformConditions about it"
    }
}

extension IfConfigDeclSyntax {
    /// Each clause with the platforms on which it's the active one: its condition holds there and no earlier
    /// clause's does.
    func activeClauses() throws(ConditionError) -> [(clause: IfConfigClauseSyntax, platforms: Platforms)] {
        var remaining = Platforms.all
        var result: [(clause: IfConfigClauseSyntax, platforms: Platforms)] = []
        for clause in clauses {
            let holds = try clause.condition.map { condition throws(ConditionError) in
                try PlatformConditions.evaluate(condition)
            } ?? .all
            result.append((clause, remaining.intersection(holds)))
            remaining.subtract(holds)
        }
        return result
    }
}
