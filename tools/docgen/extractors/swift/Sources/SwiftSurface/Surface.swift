/// The public surface of the documented modules, in the shape spec/docs/surface.schema.json describes.
public struct Surface: Equatable, Sendable {
    public var language: String
    public var packages: [SurfacePackage]
}

public struct SurfacePackage: Equatable, Sendable {
    public var name: String
    public var symbols: [SurfaceSymbol]
}

public enum SymbolKind: String, Sendable {
    case `class`, `struct`, interface, `enum`, type, function, constant
}

public enum MemberKind: String, Sendable {
    case constructor, method, property, `case`, index
}

public struct SurfaceSymbol: Equatable, Sendable {
    public var name: String
    public var kind: SymbolKind
    public var signatures: [String]
    public var docs: String
    public var deprecated: String?
    public var origin: String?
    public var members: [SurfaceMember]
}

public struct SurfaceMember: Equatable, Sendable {
    public var name: String
    public var kind: MemberKind
    public var signatures: [String]
    public var docs: String
    public var deprecated: String?
    public var isStatic: Bool
}

extension String {
    /// Orders strings by UTF-16 code units, as JavaScript sorts them.
    static func codeUnitOrder(_ a: String, _ b: String) -> Bool {
        a.utf16.lexicographicallyPrecedes(b.utf16)
    }
}

extension Surface {
    /// The surface as one line of JSON, with keys in the schema's order.
    public func json() -> String {
        var out = "{\"language\":\(quote(language)),\"packages\":["
        for (index, package) in packages.enumerated() {
            if index > 0 { out += "," }
            out += "{\"name\":\(quote(package.name)),\"symbols\":["
            for (index, symbol) in package.symbols.enumerated() {
                if index > 0 { out += "," }
                out += "{\"name\":\(quote(symbol.name)),\"kind\":\(quote(symbol.kind.rawValue))"
                out += ",\"signatures\":\(array(symbol.signatures)),\"docs\":\(quote(symbol.docs))"
                if let deprecated = symbol.deprecated { out += ",\"deprecated\":\(quote(deprecated))" }
                if let origin = symbol.origin { out += ",\"origin\":\(quote(origin))" }
                if !symbol.members.isEmpty {
                    out += ",\"members\":["
                    for (index, member) in symbol.members.enumerated() {
                        if index > 0 { out += "," }
                        out += "{\"name\":\(quote(member.name)),\"kind\":\(quote(member.kind.rawValue))"
                        out += ",\"signatures\":\(array(member.signatures)),\"docs\":\(quote(member.docs))"
                        if let deprecated = member.deprecated { out += ",\"deprecated\":\(quote(deprecated))" }
                        if member.isStatic { out += ",\"static\":true" }
                        out += "}"
                    }
                    out += "]"
                }
                out += "}"
            }
            out += "]}"
        }
        return out + "]}"
    }
}

private func array(_ strings: [String]) -> String {
    "[" + strings.map(quote).joined(separator: ",") + "]"
}

private func quote(_ string: String) -> String {
    var out = "\""
    for scalar in string.unicodeScalars {
        switch scalar {
        case "\"": out += "\\\""
        case "\\": out += "\\\\"
        case "\n": out += "\\n"
        case "\r": out += "\\r"
        case "\t": out += "\\t"
        case _ where scalar.value < 0x20:
            let hex = String(scalar.value, radix: 16)
            out += "\\u" + String(repeating: "0", count: 4 - hex.count) + hex
        default: out.unicodeScalars.append(scalar)
        }
    }
    return out + "\""
}
