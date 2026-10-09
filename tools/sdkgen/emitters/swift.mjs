import { defineEmitter, EmitterError } from "../lib/emitter.mjs";
import { byName, namedTypeRef, printTypeRef, requireType } from "../lib/ir-model.mjs";
import { camelCase, codeUnitCompare, naturalCompare } from "../lib/naming.mjs";

/**
 * Swift models and the operation catalog for the ConvoHop Swift package
 * (`swift/`, product `ConvoHop`).
 *
 * A client SDK includes the `client` and `both` operations. Types.swift
 * declares every enum, input and object type that those operations reach,
 * plus the JSON value type that object scalars use. Operations.swift declares
 * the typed operations, the runtime catalog, the output shapes that the
 * runtime validates responses against, error codes, realtime event types and
 * channel limits. Both files are derived from the IR alone and need only the
 * Swift standard library, so the golden output type-checks on its own.
 *
 * Scalars map by `representation` (Decimal counters stay `String`). GraphQL
 * type names are kept, except names that would clash with the Swift standard
 * library, Foundation or the runtime; those get a `ConvoHop` prefix, for
 * example `Operation` becomes `ConvoHopOperation`. Deprecations are documented
 * in comments only, because availability attributes would break synthesized
 * conformances and warn inside the generated initializers.
 */
export const DEFAULT_DIRECTORY = "swift/Sources/ConvoHop/Generated";

const NOTICE = "// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.\n";
const CLIENT_LAYERS = new Set(["client", "both"]);
const DEFAULT_DEPRECATION_REASON = "No longer supported.";
const INDENT = "    ";

const REPRESENTATION_TYPES = {
  string: "String",
  integer: "Int",
  number: "Double",
  boolean: "Bool",
  object: "JSONObject",
};

// Keywords that need backticks when they name a property or an enum case.
const SWIFT_KEYWORDS = new Set([
  "Any", "Self", "Type", "Protocol", "as", "associatedtype", "await", "break", "case", "catch", "class", "continue",
  "default", "defer", "deinit", "do", "else", "enum", "extension", "fallthrough", "false", "fileprivate", "for",
  "func", "guard", "if", "import", "in", "init", "inout", "internal", "is", "let", "nil", "open", "operator",
  "precedencegroup", "private", "protocol", "public", "repeat", "rethrows", "return", "self", "static", "struct",
  "subscript", "super", "switch", "throw", "throws", "true", "try", "typealias", "var", "where", "while",
]);

// Type names that would shadow or clash with the Swift standard library,
// Foundation, Swift concurrency or the generated support types.
const RESERVED_TYPE_NAMES = new Set([
  "Any", "AnyObject", "Array", "Bool", "Bundle", "Calendar", "Character", "Data", "Date", "Decimal", "Dictionary",
  "Double", "Error", "Float", "Int", "JSONObject", "JSONValue", "Locale", "Never", "Notification", "NoInput",
  "Operation", "Optional", "Predicate", "Process", "Progress", "Protocol", "Result", "Self", "Sequence", "Set",
  "String", "Substring", "Task", "Thread", "TimeZone", "Timer", "Type", "URL", "UUID", "Void",
  "ConvoHopErrorCode", "ConvoHopOperations", "ConversationEventType", "GraphQLCatalog", "GraphQLContextField",
  "GraphQLContextUse", "GraphQLIdempotency", "GraphQLOperation", "GraphQLOperationDescriptor",
  "GraphQLOperationKind", "GraphQLOutputField", "GraphQLOutputShape", "GraphQLRealtime", "GraphQLRealtimeChannel",
  "GraphQLRepresentation", "GraphQLRetry", "GraphQLRetryBudget", "GraphQLScalarShape", "GraphQLTransport",
]);

/** The Swift name of a GraphQL type. */
export function swiftTypeName(name) {
  return RESERVED_TYPE_NAMES.has(name) ? `ConvoHop${name}` : name;
}

/** A property or case name, escaped with backticks when it is a keyword. */
export function swiftIdentifier(name) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new EmitterError(`swift: ${JSON.stringify(name)} is not a Swift identifier`);
  return SWIFT_KEYWORDS.has(name) ? `\`${name}\`` : name;
}

/** The member name after a dot or in a declaration; a backticked keyword stays backticked. */
const memberName = name => swiftIdentifier(name);

/** A Swift string literal. */
export function swiftString(text) {
  let out = '"';
  for (const char of text) {
    const code = char.codePointAt(0);
    if (char === "\\") out += "\\\\";
    else if (char === '"') out += '\\"';
    else if (char === "\n") out += "\\n";
    else if (char === "\r") out += "\\r";
    else if (char === "\t") out += "\\t";
    else if (code < 0x20 || code === 0x7f) out += `\\u{${code.toString(16)}}`;
    else out += char;
  }
  return `${out}"`;
}

/** A multi-line Swift string literal whose value is exactly `text`. */
function swiftMultilineString(text, level) {
  const pad = INDENT.repeat(level);
  const escaped = text.replaceAll("\\", "\\\\").replaceAll('"""', '\\"""').replaceAll("\r", "\\r");
  const lines = escaped.split("\n").map(line => (line.length === 0 ? "" : pad + line));
  return `"""\n${lines.join("\n")}\n${pad}"""`;
}

function docComment(text, level) {
  if (!text) return "";
  const pad = INDENT.repeat(level);
  return text.split("\n").map(line => `${pad}///${line.length ? ` ${line}` : ""}`.trimEnd()).join("\n") + "\n";
}

function deprecationNote(deprecated) {
  if (!deprecated) return undefined;
  const reason = deprecated.reason ?? DEFAULT_DEPRECATION_REASON;
  return `- Note: Deprecated. ${reason}`;
}

function describedDoc(described, level) {
  const parts = [described.description, deprecationNote(described.deprecated)].filter(Boolean);
  return docComment(parts.join("\n\n"), level);
}

/** Lower camel case for enum cases and catalog members; keeps an already camel-cased value. */
function caseName(value) {
  const name = /^[a-z][A-Za-z0-9]*$/.test(value) ? value : camelCase(value);
  if (!name) throw new EmitterError(`swift: ${JSON.stringify(value)} has no Swift case name`);
  return name;
}

/** Fails when two sources map to the same Swift name. `labelOf` names a source in the message. */
function uniqueNames(entries, nameOf, where, labelOf = entry => entry.name ?? entry) {
  const seen = new Map();
  for (const entry of entries) {
    const name = nameOf(entry);
    if (seen.has(name)) throw new EmitterError(`swift: ${where} ${JSON.stringify(seen.get(name))} and ${JSON.stringify(labelOf(entry))} both map to ${name}`);
    seen.set(name, labelOf(entry));
  }
}

/** The operations a client SDK exposes, in IR order. */
export function clientOperations(ir) {
  return ir.operations.filter(operation => CLIENT_LAYERS.has(operation.layer));
}

function createModel(ir) {
  const types = byName(ir.types);
  const operations = clientOperations(ir);
  const typeOf = (ref, where) => requireType(types, namedTypeRef(ref).name, where);

  const reachable = new Set();
  const outputs = new Set();
  function visit(ref, where, output) {
    const type = typeOf(ref, where);
    if (output) {
      if (type.kind === "input") throw new EmitterError(`swift: ${where}: input ${type.name} cannot be an output`);
      if (outputs.has(type.name)) return;
      outputs.add(type.name);
    } else {
      if (type.kind === "object") throw new EmitterError(`swift: ${where}: object ${type.name} cannot be an input`);
      if (reachable.has(type.name)) return;
    }
    reachable.add(type.name);
    for (const field of type.fields ?? []) visit(field.type, `${where} ${type.name}.${field.name}`, output);
  }
  for (const operation of operations) {
    if (!operation.arguments.some(arg => arg.role === "context")) throw new EmitterError(`swift: ${operation.id} has no context argument`);
    for (const arg of operation.arguments) {
      if (arg.type.kind !== "input") throw new EmitterError(`swift: ${operation.id} argument ${arg.name} must be an input object`);
      visit(arg.type, operation.id, false);
    }
    visit(operation.result.type, operation.id, true);
  }

  const declared = ir.types.filter(type => reachable.has(type.name) && type.kind !== "scalar")
    .sort((a, b) => naturalCompare(a.name, b.name));
  uniqueNames(declared, type => swiftTypeName(type.name), "types");

  function swiftType(ref, where) {
    let type;
    if (ref.kind === "list") type = `[${swiftType(ref.ofType, where)}]`;
    else {
      const named = requireType(types, ref.name, where);
      if (named.kind === "scalar") {
        type = REPRESENTATION_TYPES[named.representation];
        if (!type) throw new EmitterError(`swift: scalar ${named.name} has unsupported representation ${JSON.stringify(named.representation)}`);
      } else type = swiftTypeName(named.name);
    }
    return ref.nullable ? `${type}?` : type;
  }

  return { types, operations, declared, outputs, swiftType };
}

function enumDeclaration(type) {
  uniqueNames(type.values, value => caseName(value.name), `enum ${type.name} values`);
  const cases = type.values.map(value =>
    `${describedDoc(value, 1)}${INDENT}case ${swiftIdentifier(caseName(value.name))} = ${swiftString(value.name)}`);
  return `${docComment(type.description, 0)}public enum ${swiftTypeName(type.name)}: String, Codable, Hashable, Sendable, CaseIterable {\n` +
    `${cases.join("\n")}\n}\n`;
}

function structDeclaration(type, swiftType) {
  const fields = type.fields.map(field => ({
    field,
    name: swiftIdentifier(field.name),
    type: swiftType(field.type, `${type.name}.${field.name}`),
    optional: field.type.nullable,
  }));
  const properties = fields.map(({ field, name, type: fieldType }) => `${describedDoc(field, 1)}${INDENT}public var ${name}: ${fieldType}`);
  const parameters = fields.map(({ name, type: fieldType, optional }) => `${name}: ${fieldType}${optional ? " = nil" : ""}`);
  const assignments = fields.map(({ name }) => `${INDENT.repeat(2)}self.${name} = ${name}`);
  const init = `${INDENT}public init(\n${parameters.map(p => INDENT.repeat(2) + p).join(",\n")}\n${INDENT}) {\n${assignments.join("\n")}\n${INDENT}}`;
  return `${docComment(type.description, 0)}public struct ${swiftTypeName(type.name)}: Codable, Hashable, Sendable {\n` +
    `${properties.join("\n")}\n\n${init}\n}\n`;
}

const JSON_SUPPORT = `/// A JSON value. Object scalars such as message properties and signed proofs use it.
public enum JSONValue: Hashable, Sendable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([JSONValue])
    case object([String: JSONValue])
}

/// A JSON object.
public typealias JSONObject = [String: JSONValue]

extension JSONValue: Codable {
    public init(from decoder: any Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else {
            self = .object(try container.decode([String: JSONValue].self))
        }
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .null: try container.encodeNil()
        case .bool(let value): try container.encode(value)
        case .number(let value): try container.encode(value)
        case .string(let value): try container.encode(value)
        case .array(let value): try container.encode(value)
        case .object(let value): try container.encode(value)
        }
    }
}

/// The input of an operation that takes none.
public struct NoInput: Codable, Hashable, Sendable {
    public init() {}
}
`;

/** The contents of Types.swift. */
export function renderSwiftTypes(ir) {
  const model = createModel(ir);
  const declarations = model.declared.map(type => {
    if (type.kind === "enum") return enumDeclaration(type);
    if (type.kind === "input" || type.kind === "object") return structDeclaration(type, model.swiftType);
    throw new EmitterError(`swift: ${type.kind} ${type.name} cannot be declared`);
  });
  return [NOTICE + "\n" + JSON_SUPPORT, ...declarations].join("\n");
}

const OPERATION_SUPPORT = `/// The kind of a GraphQL operation.
public enum GraphQLOperationKind: String, Hashable, Sendable {
    case query
    case mutation
    case subscription
}

/// Retry and resolution rules of an idempotency class.
public struct GraphQLIdempotency: Hashable, Sendable {
    public let name: String
    public let retry: GraphQLRetry
    /// Whether an unknown outcome can be resolved by looking up the request.
    public let resolvable: Bool
    public let retryBudget: GraphQLRetryBudget?
}

/// How many times, and for how long, a request may be resent with the same request ID.
public struct GraphQLRetryBudget: Hashable, Sendable {
    public let maxAttempts: Int
    public let windowMs: Int
}

/// Whether a request-context field is sent.
public enum GraphQLContextUse: String, Hashable, Sendable {
    case required
    case optional
    case forbidden
}

/// A request-context field of an operation.
public struct GraphQLContextField: Hashable, Sendable {
    public let name: String
    public let use: GraphQLContextUse
}

/// What the runtime needs to send an operation and validate its result.
public struct GraphQLOperationDescriptor: Hashable, Sendable {
    /// The operation ID, for example \`communication.sendMessage\`.
    public let key: String
    public let plane: String
    public let kind: GraphQLOperationKind
    /// The root field that holds the result.
    public let field: String
    public let operationName: String
    /// The GraphQL document, sent unchanged.
    public let document: String
    /// The GraphQL result type, for example \`SendMessageReply!\`.
    public let resultType: String
    public let inputFields: [String]
    public let idempotency: GraphQLIdempotency
    public let context: [GraphQLContextField]
}

/// A typed operation. \`Input\` is sent as the \`input\` variable and \`Output\` decodes the root field.
public struct GraphQLOperation<Input: Codable & Sendable, Output: Codable & Sendable>: Sendable {
    public let descriptor: GraphQLOperationDescriptor

    public init(_ descriptor: GraphQLOperationDescriptor) {
        self.descriptor = descriptor
    }
}

/// How a scalar is represented in JSON.
enum GraphQLRepresentation: Sendable {
    case string
    case integer
    case number
    case boolean
    case object
}

/// A scalar output and the constraints the runtime checks.
struct GraphQLScalarShape: Sendable {
    let representation: GraphQLRepresentation
    let pattern: String?
    let maximumDecimal: String?
    let disallowed: [String]
}

/// A field of an object output and its GraphQL type, for example \`[Event!]!\`.
struct GraphQLOutputField: Sendable {
    let name: String
    let type: String
}

/// The shape of an output type.
enum GraphQLOutputShape: Sendable {
    case scalar(GraphQLScalarShape)
    case enumeration(Set<String>)
    case object([GraphQLOutputField])
}

/// A realtime channel and its limits.
struct GraphQLRealtimeChannel: Sendable {
    let name: String
    let subscription: String
    let replay: String
    let pageType: String
    let connectionInit: [String]
    let maxFrameBytes: Int
    let maxPendingPages: Int
    let subscribeLimit: Int
    let replayLimit: Int
    let baseDelayMs: Int
    let maxDelayMs: Int
    let jitterMs: Int
    let terminalCloseCodes: Set<Int>
}
`;

function representation(type) {
  const representations = { string: ".string", integer: ".integer", number: ".number", boolean: ".boolean", object: ".object" };
  const value = representations[type.representation];
  if (!value) throw new EmitterError(`swift: scalar ${type.name} has unsupported representation ${JSON.stringify(type.representation)}`);
  return value;
}

function shapeLiteral(type) {
  if (type.kind === "object") {
    const fields = type.fields.map(field => `GraphQLOutputField(name: ${swiftString(field.name)}, type: ${swiftString(printTypeRef(field.type))})`);
    return `.object([\n${fields.map(field => INDENT.repeat(3) + field).join(",\n")},\n${INDENT.repeat(2)}])`;
  }
  if (type.kind === "enum") return `.enumeration([${type.values.map(value => swiftString(value.name)).join(", ")}])`;
  const constraints = type.constraints ?? {};
  const pattern = constraints.pattern === undefined ? "nil" : swiftString(constraints.pattern);
  const maximumDecimal = constraints.maximumDecimal === undefined ? "nil" : swiftString(constraints.maximumDecimal);
  const disallowed = `[${(constraints.disallowed ?? []).map(swiftString).join(", ")}]`;
  return `.scalar(GraphQLScalarShape(representation: ${representation(type)}, pattern: ${pattern}, maximumDecimal: ${maximumDecimal}, disallowed: ${disallowed}))`;
}

function idempotencyDeclarations(ir) {
  const retries = [...new Set(ir.idempotency.map(entry => entry.retry))].sort(codeUnitCompare);
  uniqueNames(retries, caseName, "retry strategies");
  uniqueNames(ir.idempotency, entry => caseName(entry.name), "idempotency classes");
  const retry = `/// How a request is resent.\npublic enum GraphQLRetry: String, Hashable, Sendable {\n` +
    retries.map(name => `${INDENT}case ${swiftIdentifier(caseName(name))} = ${swiftString(name)}`).join("\n") + "\n}\n";
  const classes = ir.idempotency.map(entry => {
    const budget = entry.retryBudget
      ? `GraphQLRetryBudget(maxAttempts: ${entry.retryBudget.maxAttempts}, windowMs: ${entry.retryBudget.windowMs})`
      : "nil";
    return `${docComment(entry.summary, 1)}${INDENT}public static let ${swiftIdentifier(caseName(entry.name))} = GraphQLIdempotency(\n` +
      `${INDENT.repeat(2)}name: ${swiftString(entry.name)}, retry: .${memberName(caseName(entry.retry))}, resolvable: ${entry.resolvable}, retryBudget: ${budget})`;
  });
  return `${retry}\nextension GraphQLIdempotency {\n${classes.join("\n")}\n}\n`;
}

function operationMember(operation) {
  return caseName(operation.id.replace(/\./g, "_"));
}

function descriptorLiteral(operation, model, level) {
  const pad = INDENT.repeat(level);
  const inputFields = operation.input ? requireType(model.types, operation.input.type, operation.id).fields.map(field => field.name) : [];
  const context = operation.context.fields.map(field => {
    if (!["required", "optional", "forbidden"].includes(field.use)) throw new EmitterError(`swift: ${operation.id} context field ${field.name} has unsupported use ${JSON.stringify(field.use)}`);
    return `GraphQLContextField(name: ${swiftString(field.name)}, use: .${field.use})`;
  });
  const lines = [
    `key: ${swiftString(operation.id)}`,
    `plane: ${swiftString(operation.plane)}`,
    `kind: .${operation.kind}`,
    `field: ${swiftString(operation.field)}`,
    `operationName: ${swiftString(operation.operationName)}`,
    `document: ${swiftMultilineString(operation.document.text, level + 1)}`,
    `resultType: ${swiftString(printTypeRef(operation.result.type))}`,
    `inputFields: [${inputFields.map(swiftString).join(", ")}]`,
    `idempotency: .${memberName(caseName(operation.idempotency))}`,
    `context: [\n${context.map(field => INDENT.repeat(level + 2) + field).join(",\n")},\n${INDENT.repeat(level + 1)}]`,
  ];
  return `GraphQLOperationDescriptor(\n${lines.map(line => pad + INDENT + line).join(",\n")}\n${pad})`;
}

function operationsDeclaration(model) {
  uniqueNames(model.operations, operationMember, "operations", operation => operation.id);
  const members = model.operations.map(operation => {
    if (!["query", "mutation", "subscription"].includes(operation.kind)) throw new EmitterError(`swift: ${operation.id} has unsupported kind ${JSON.stringify(operation.kind)}`);
    const input = operation.input ? swiftTypeName(operation.input.type) : "NoInput";
    const output = model.swiftType(operation.result.type, operation.id);
    const doc = docComment([operation.summary, deprecationNote(operation.deprecated)].filter(Boolean).join("\n\n"), 1);
    return `${doc}${INDENT}public static let ${swiftIdentifier(operationMember(operation))} = GraphQLOperation<${input}, ${output}>(\n` +
      `${INDENT.repeat(2)}GraphQLCatalog.operations[${swiftString(operation.id)}]!)`;
  });
  return `/// The operations a client may send, keyed in the catalog by operation ID.\npublic enum ConvoHopOperations {\n${members.join("\n")}\n}\n`;
}

function catalogDeclaration(ir, model) {
  const descriptors = model.operations.map(operation =>
    `${INDENT.repeat(2)}${swiftString(operation.id)}: ${descriptorLiteral(operation, model, 2)}`);
  const shapes = [...model.outputs].sort(naturalCompare).map(name =>
    `${INDENT.repeat(2)}${swiftString(name)}: ${shapeLiteral(requireType(model.types, name, "output shapes"))}`);
  return `/// The operation catalog and output shapes the runtime reads.\nenum GraphQLCatalog {\n` +
    `${INDENT}static let operations: [String: GraphQLOperationDescriptor] = [\n${descriptors.join(",\n")},\n${INDENT}]\n\n` +
    `${INDENT}static let outputShapes: [String: GraphQLOutputShape] = [\n${shapes.join(",\n")},\n${INDENT}]\n}\n`;
}

function transportDeclaration(ir) {
  const transport = ir.transport;
  if (!transport?.path || !transport.websocket?.subprotocol || !transport.http?.maxDocumentBytes) throw new EmitterError("swift: the IR transport is incomplete");
  return "/// HTTP and WebSocket transport constants.\nenum GraphQLTransport {\n" +
    `${INDENT}static let path = ${swiftString(transport.path)}\n` +
    `${INDENT}static let webSocketSubprotocol = ${swiftString(transport.websocket.subprotocol)}\n` +
    `${INDENT}static let maxDocumentBytes = ${transport.http.maxDocumentBytes}\n}\n`;
}

/**
 * Public members name the codes that client operations document, plus the SDK's own. The internal catalog lists
 * every code in the IR, because the shared retry rules classify a code by its `retryable` flag wherever it comes from.
 */
function errorCodesDeclaration(ir, model) {
  const referenced = new Set(model.operations.flatMap(operation => operation.errors?.codes ?? []));
  const all = [...ir.errors.codes].sort((a, b) => codeUnitCompare(a.name, b.name));
  const codes = all.filter(code => referenced.has(code.name) || code.origin === "sdk");
  uniqueNames(codes, code => caseName(code.name), "error codes");
  const members = codes.map(code =>
    `${docComment(code.summary, 1)}${INDENT}public static let ${swiftIdentifier(caseName(code.name))} = ConvoHopErrorCode(rawValue: ${swiftString(code.name)})`);
  const catalog = all.map(code =>
    `${INDENT.repeat(2)}${swiftString(code.name)}: (status: ${code.status ?? "nil"}, retryable: ${code.retryable})`);
  return "/// A ConvoHop error code. Codes that this list doesn't name can still arrive, so handle unknown codes.\n" +
    "public struct ConvoHopErrorCode: RawRepresentable, Hashable, Sendable {\n" +
    `${INDENT}public let rawValue: String\n\n${INDENT}public init(rawValue: String) {\n${INDENT.repeat(2)}self.rawValue = rawValue\n${INDENT}}\n}\n\n` +
    `extension ConvoHopErrorCode {\n${members.join("\n")}\n\n` +
    `${INDENT}/// The documented HTTP-equivalent status and retryability of every code the schema lists, including codes that\n` +
    `${INDENT}/// only server operations return.\n` +
    `${INDENT}static let catalog: [String: (status: Int?, retryable: Bool)] = [\n${catalog.join(",\n")},\n${INDENT}]\n}\n`;
}

function realtimeDeclarations(ir) {
  const realtime = ir.realtime;
  if (!realtime) return "";
  uniqueNames(realtime.events, event => caseName(event.type.replace(/\./g, "_")), "realtime event types", event => event.type);
  const events = realtime.events.map(event =>
    `${docComment(event.summary, 1)}${INDENT}public static let ${swiftIdentifier(caseName(event.type.replace(/\./g, "_")))} = ConversationEventType(rawValue: ${swiftString(event.type)})`);
  const eventTypes = "/// A realtime event type. Types that this list doesn't name are delivered as they are, not dropped.\n" +
    "public struct ConversationEventType: RawRepresentable, Hashable, Sendable {\n" +
    `${INDENT}public let rawValue: String\n\n${INDENT}public init(rawValue: String) {\n${INDENT.repeat(2)}self.rawValue = rawValue\n${INDENT}}\n}\n\n` +
    `extension ConversationEventType {\n${events.join("\n")}\n}\n`;
  uniqueNames(realtime.channels, channel => caseName(channel.name), "realtime channels");
  const channels = realtime.channels.map(channel => {
    const { limits, reconnect } = channel;
    if (!limits || !reconnect) throw new EmitterError(`swift: realtime channel ${channel.name} lacks limits or reconnect rules`);
    const lines = [
      `name: ${swiftString(channel.name)}`,
      `subscription: ${swiftString(channel.subscription)}`,
      `replay: ${swiftString(channel.replay)}`,
      `pageType: ${swiftString(channel.pageType)}`,
      `connectionInit: [${channel.connectionInit.map(swiftString).join(", ")}]`,
      `maxFrameBytes: ${limits.maxFrameBytes}`,
      `maxPendingPages: ${limits.maxPendingPages}`,
      `subscribeLimit: ${limits.subscribeLimit}`,
      `replayLimit: ${limits.replayLimit}`,
      `baseDelayMs: ${reconnect.baseDelayMs}`,
      `maxDelayMs: ${reconnect.maxDelayMs}`,
      `jitterMs: ${reconnect.jitterMs}`,
      `terminalCloseCodes: [${reconnect.terminalCloseCodes.join(", ")}]`,
    ];
    return `${docComment(channel.summary, 1)}${INDENT}static let ${swiftIdentifier(caseName(channel.name))} = GraphQLRealtimeChannel(\n` +
      `${lines.map(line => INDENT.repeat(2) + line).join(",\n")}\n${INDENT})`;
  });
  return `${eventTypes}\n/// Realtime channels and their limits.\nenum GraphQLRealtime {\n${channels.join("\n")}\n}\n`;
}

/** The contents of Operations.swift. */
export function renderSwiftOperations(ir) {
  const model = createModel(ir);
  return [
    NOTICE + "\n" + OPERATION_SUPPORT,
    idempotencyDeclarations(ir),
    operationsDeclaration(model),
    catalogDeclaration(ir, model),
    transportDeclaration(ir),
    errorCodesDeclaration(ir, model),
    realtimeDeclarations(ir),
  ].filter(Boolean).join("\n");
}

export default defineEmitter({
  name: "swift",
  description: "Swift models and operation catalog for the ConvoHop Swift package",
  owns: [DEFAULT_DIRECTORY],
  emit(ir, { directory = DEFAULT_DIRECTORY } = {}) {
    return [
      { path: `${directory}/Types.swift`, contents: renderSwiftTypes(ir) },
      { path: `${directory}/Operations.swift`, contents: renderSwiftOperations(ir) },
    ];
  },
});
