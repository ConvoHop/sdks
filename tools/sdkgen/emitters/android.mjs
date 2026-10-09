import { defineEmitter, EmitterError } from "../lib/emitter.mjs";
import { byName, namedTypeRef, printTypeRef, requireType } from "../lib/ir-model.mjs";
import { pascalCase } from "../lib/naming.mjs";

/**
 * Kotlin models and operation catalog for the Android client SDK
 * (android/core, package com.convohop.android.generated).
 *
 * Only what a user-session client reaches is emitted: operations whose layer
 * is `client` or `both`, and the types reachable from their arguments and
 * results. Decoders follow @convohop/core's output validation: a missing
 * field, a wrong JSON type, an unknown enum value, a malformed string scalar
 * or a list over 100 items throws ShapeException; unknown fields are ignored.
 * Input classes omit null fields so server defaults apply. Kotlin names are
 * the GraphQL names. Hard keywords are backticked, and names that would
 * shadow what the generated code refers to are rejected.
 */
export const DIRECTORY = "android/core/src/main/kotlin/com/convohop/android/generated";
export const PACKAGE = "com.convohop.android.generated";

const NOTICE = "// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.\n";
const CLIENT_LAYERS = new Set(["client", "both"]);
const MAX_LIST_ITEMS = 100;
const DEFAULT_DEPRECATION_REASON = "No longer supported";
const KOTLIN_TYPES = { string: "String", integer: "Int", number: "Double", boolean: "Boolean", object: "JsonObject" };
const JSON_DECODERS = { string: "asString", integer: "asInt", number: "asDouble", boolean: "asBoolean", object: "asObject" };
const CONSTRAINT_KEYS = new Set(["pattern", "maximumDecimal", "minimum", "maximum", "maxCanonicalJsonBytes", "requiredStringProperties", "disallowed"]);
const GRAPHQL_NAME = /^[_A-Za-z][_0-9A-Za-z]*$/;
const KOTLIN_HARD_KEYWORDS = new Set([
  "as", "break", "class", "continue", "do", "else", "false", "for", "fun", "if", "in", "interface", "is", "null",
  "object", "package", "return", "super", "this", "throw", "true", "try", "typealias", "typeof", "val", "var", "when", "while",
]);
// Declarations of the generated package, imports and Kotlin types the generated code names unqualified.
const GENERATED_DECLARATIONS = [
  "ShapeException", "Scalars", "Operations", "OperationSpec", "OperationDescriptor", "Transport", "Realtime",
  "RealtimeChannel", "RealtimeEventType", "Idempotency", "IdempotencyClass", "ErrorCodes", "ErrorCodeInfo", "CodecKt",
];
const RESERVED_TYPE_NAMES = new Set([
  ...GENERATED_DECLARATIONS,
  "JsonArray", "JsonElement", "JsonNull", "JsonObject", "JsonPrimitive", "BigInteger",
  "Any", "Array", "ArrayList", "Boolean", "Double", "Enum", "Int", "LinkedHashMap", "List", "Long", "Map", "Nothing",
  "Regex", "RuntimeException", "Set", "String", "Unit",
]);
// Members every generated class declares, and identifiers instance methods call unqualified.
const RESERVED_FIELD_NAMES = new Set([
  "toJson", "fromJson", "copy", "equals", "hashCode", "toString", "Companion",
  "JsonArray", "JsonElement", "JsonNull", "JsonObject", "JsonPrimitive", "LinkedHashMap", "Scalars", "linkedMapOf",
]);
const RESERVED_ENUM_VALUES = new Set(["name", "ordinal", "entries", "values", "valueOf", "toJson", "fromJson", "Companion"]);
// Identifiers the plane objects in Operations call unqualified.
const RESERVED_OPERATION_FIELDS = new Set(["OperationSpec", "OperationDescriptor", "listOf", "mapOf", "emptyMap", "to", "all", "byId"]);

const fail = message => {
  throw new EmitterError(`android: ${message}`);
};

/** A Kotlin string literal. Non-ASCII and control characters are \u-escaped so sources stay ASCII. */
export function kotlinString(text) {
  let out = "\"";
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const code = text.charCodeAt(index);
    if (char === "\\" || char === "\"" || char === "$") out += `\\${char}`;
    else if (char === "\n") out += "\\n";
    else if (char === "\r") out += "\\r";
    else if (char === "\t") out += "\\t";
    else if (code < 0x20 || code > 0x7e) out += `\\u${code.toString(16).padStart(4, "0")}`;
    else out += char;
  }
  return `${out}"`;
}

/** A Kotlin identifier for a GraphQL name; hard keywords are backticked. */
export function kotlinIdentifier(name, where) {
  if (typeof name !== "string" || !GRAPHQL_NAME.test(name) || /^_+$/.test(name)) fail(`${where}: ${JSON.stringify(name)} is not a usable Kotlin name`);
  return KOTLIN_HARD_KEYWORDS.has(name) ? `\`${name}\`` : name;
}

/** A KDoc block. Kotlin block comments nest, so both comment markers are broken up. */
export function kdoc(text, indent = "") {
  if (!text) return "";
  const lines = text.replace(/\r\n?/g, "\n").split("/*").join("/\\*").split("*/").join("*\\/")
    .split("\n").map(line => line.replace(/\s+$/, ""));
  if (lines.length === 1) return `${indent}/** ${lines[0]} */\n`;
  return `${indent}/**\n${lines.map(line => (line ? `${indent} * ${line}` : `${indent} *`)).join("\n")}\n${indent} */\n`;
}

const joinDoc = (...parts) => parts.filter(Boolean).join("\n");
const deprecationNote = entry => (entry.deprecated ? `Deprecated: ${entry.deprecated.reason ?? DEFAULT_DEPRECATION_REASON}` : "");
const header = imports => `${NOTICE}package ${PACKAGE}\n${imports.length ? `\n${imports.map(name => `import ${name}\n`).join("")}` : ""}`;

function createModel(ir) {
  const types = byName(ir.types);
  const typeOf = (ref, where) => requireType(types, ref.name, where);
  const operations = ir.operations.filter(operation => CLIENT_LAYERS.has(operation.layer));

  const reachable = new Set();
  const visit = (name, where) => {
    if (reachable.has(name)) return;
    const type = requireType(types, name, where);
    if (!["scalar", "enum", "object", "input"].includes(type.kind)) fail(`${where}: ${type.kind} ${name} is not supported`);
    reachable.add(name);
    for (const field of type.fields ?? []) visit(namedTypeRef(field.type).name, `${where} ${name}.${field.name}`);
  };
  for (const operation of operations) {
    for (const argument of operation.arguments) visit(namedTypeRef(argument.type).name, operation.id);
    visit(namedTypeRef(operation.result.type).name, operation.id);
  }
  const selected = ir.types.filter(type => reachable.has(type.name));
  const scalars = selected.filter(type => type.kind === "scalar" && !type.builtIn);
  const enums = selected.filter(type => type.kind === "enum");
  const objects = selected.filter(type => type.kind === "object");
  const inputs = selected.filter(type => type.kind === "input");
  const planes = [...new Set(operations.map(operation => operation.plane))].map(plane => ({ plane, name: pascalCase(plane) }));

  assertDeclarations([...enums, ...objects, ...inputs], planes);
  assertAcyclicOutputs(objects, types);
  return { types, typeOf, operations, scalars, enums, objects, inputs, planes };
}

function assertDeclarations(declared, planes) {
  const folded = new Map(GENERATED_DECLARATIONS.map(name => [name.toLowerCase(), name]));
  for (const type of declared) {
    kotlinIdentifier(type.name, `type ${type.name}`);
    if (KOTLIN_HARD_KEYWORDS.has(type.name) || RESERVED_TYPE_NAMES.has(type.name)) fail(`type ${type.name} would shadow a name the generated code uses`);
    const clash = folded.get(type.name.toLowerCase());
    if (clash) fail(`type ${type.name} collides with ${clash} on case-insensitive file systems`);
    folded.set(type.name.toLowerCase(), type.name);
  }
  const typeNames = new Set(declared.map(type => type.name));
  for (const { plane, name } of planes) {
    if (!name || typeNames.has(name) || RESERVED_TYPE_NAMES.has(name)) fail(`plane ${plane} maps to Operations.${name}, which would shadow a type`);
  }
  for (const type of declared) {
    for (const field of type.fields ?? []) {
      kotlinIdentifier(field.name, `${type.name}.${field.name}`);
      if (RESERVED_FIELD_NAMES.has(field.name) || /^component\d+$/.test(field.name) || typeNames.has(field.name)) {
        fail(`${type.name}.${field.name} would shadow a name the generated code uses`);
      }
    }
    for (const value of type.values ?? []) {
      kotlinIdentifier(value.name, `${type.name}.${value.name}`);
      if (RESERVED_ENUM_VALUES.has(value.name)) fail(`${type.name}.${value.name} would shadow an enum member`);
    }
  }
}

// Decoders recurse along the type graph, so recursive outputs would recurse as deep as a response nests.
function assertAcyclicOutputs(objects, types) {
  const state = new Map();
  const visit = (name, path) => {
    const type = types.get(name);
    if (type?.kind !== "object" || state.get(name) === "done") return;
    if (state.get(name) === "active") fail(`recursive output types are not supported: ${[...path, name].join(" -> ")}`);
    state.set(name, "active");
    for (const field of type.fields) visit(namedTypeRef(field.type).name, [...path, name]);
    state.set(name, "done");
  };
  for (const type of objects) visit(type.name, []);
}

function createRenderer(model) {
  const { typeOf } = model;

  function kotlinType(ref, where) {
    let type;
    if (ref.kind === "list") type = `List<${kotlinType(ref.ofType, where)}>`;
    else if (ref.kind === "scalar") type = scalarType(typeOf(ref, where), where);
    else if (["enum", "object", "input"].includes(ref.kind)) type = typeOf(ref, where).name;
    else fail(`${where}: unsupported type reference ${JSON.stringify(ref.kind)}`);
    return ref.nullable ? `${type}?` : type;
  }

  // `value` is a Kotlin JsonElement expression and `path` a Kotlin String expression.
  function decode(ref, value, path, depth, where) {
    if (!ref.nullable) return decodeNonNull(ref, value, path, depth, where);
    return `${value}.decodeNullable(${path}) { v${depth}, p${depth} -> ${decodeNonNull(ref, `v${depth}`, `p${depth}`, depth + 1, where)} }`;
  }

  function decodeNonNull(ref, value, path, depth, where) {
    if (ref.kind === "list") return `${value}.decodeList(${path}) { v${depth}, p${depth} -> ${decode(ref.ofType, `v${depth}`, `p${depth}`, depth + 1, where)} }`;
    const type = typeOf(ref, where);
    if (ref.kind === "scalar") return type.builtIn ? `${value}.${jsonDecoder(type, where)}(${path})` : `Scalars.decode${type.name}(${value}, ${path})`;
    if (ref.kind === "enum" || ref.kind === "object") return `${type.name}.fromJson(${value}, ${path})`;
    return fail(`${where}: ${ref.kind} ${ref.name} cannot be an output`);
  }

  // `value` is a Kotlin expression of the field's Kotlin type; the result is a JsonElement expression.
  function encode(ref, value, depth, where) {
    if (!ref.nullable) return encodeNonNull(ref, value, depth, where);
    return `(${value}?.let { v${depth} -> ${encodeNonNull(ref, `v${depth}`, depth + 1, where)} } ?: JsonNull)`;
  }

  function encodeNonNull(ref, value, depth, where) {
    if (ref.kind === "list") return `JsonArray(${value}.map { v${depth} -> ${encode(ref.ofType, `v${depth}`, depth + 1, where)} })`;
    const type = typeOf(ref, where);
    if (ref.kind === "scalar") {
      if (!type.builtIn) return `Scalars.encode${type.name}(${value})`;
      jsonDecoder(type, where);
      return `JsonPrimitive(${value})`;
    }
    return `${value}.toJson()`;
  }

  return { kotlinType, decode, encode, encodeNonNull };
}

function scalarType(scalar, where) {
  const type = KOTLIN_TYPES[scalar.representation];
  if (!type) fail(`${where}: scalar ${scalar.name} has unsupported representation ${JSON.stringify(scalar.representation)}`);
  if (scalar.builtIn && scalar.representation === "object") fail(`${where}: built-in scalar ${scalar.name} cannot be an object`);
  return type;
}

function jsonDecoder(scalar, where) {
  scalarType(scalar, where);
  return JSON_DECODERS[scalar.representation];
}

const CODEC = `${header([
  "kotlinx.serialization.json.JsonArray",
  "kotlinx.serialization.json.JsonElement",
  "kotlinx.serialization.json.JsonNull",
  "kotlinx.serialization.json.JsonObject",
  "kotlinx.serialization.json.JsonPrimitive",
  "java.math.BigDecimal",
])}
/**
 * A response value that does not match the schema. [path] names the value,
 * for example \`SendMessageReply.result.cursor.sequence\`. The runtime reports
 * it as INVALID_RESPONSE.
 */
public class ShapeException(public val path: String, public val reason: String) : RuntimeException("$path $reason")

/** The most items one response list may hold. */
public const val MAX_LIST_ITEMS: Int = ${MAX_LIST_ITEMS}

private val JSON_NUMBER = Regex("-?(0|[1-9][0-9]*)(\\\\.[0-9]+)?([eE][+-]?[0-9]+)?")

internal fun JsonObject.field(name: String, path: String): JsonElement =
    this[name] ?: throw ShapeException("$path.$name", "is missing")

internal fun JsonElement.asObject(path: String): JsonObject =
    this as? JsonObject ?: throw ShapeException(path, "must be an object")

internal fun JsonElement.asList(path: String): JsonArray {
    val array = this as? JsonArray ?: throw ShapeException(path, "must be a list")
    if (array.size > MAX_LIST_ITEMS) throw ShapeException(path, "must hold at most $MAX_LIST_ITEMS items")
    return array
}

internal fun JsonElement.asString(path: String): String {
    val primitive = this as? JsonPrimitive
    if (primitive == null || !primitive.isString) throw ShapeException(path, "must be a string")
    return primitive.content
}

internal fun JsonElement.asBoolean(path: String): Boolean {
    val primitive = this as? JsonPrimitive
    if (primitive == null || primitive.isString || primitive is JsonNull) throw ShapeException(path, "must be a boolean")
    return when (primitive.content) {
        "true" -> true
        "false" -> false
        else -> throw ShapeException(path, "must be a boolean")
    }
}

private fun JsonElement.numberLiteral(path: String, expected: String): String {
    val primitive = this as? JsonPrimitive
    if (primitive == null || primitive.isString || primitive is JsonNull || !JSON_NUMBER.matches(primitive.content)) {
        throw ShapeException(path, "must be $expected")
    }
    return primitive.content
}

/** GraphQL Int is a signed 32-bit integer. Integral literals such as \`5.0\` are accepted. */
internal fun JsonElement.asInt(path: String): Int {
    val literal = numberLiteral(path, "an integer")
    return try {
        BigDecimal(literal).intValueExact()
    } catch (_: RuntimeException) {
        throw ShapeException(path, "must be a 32-bit integer")
    }
}

internal fun JsonElement.asDouble(path: String): Double {
    val number = numberLiteral(path, "a number").toDouble()
    if (!number.isFinite()) throw ShapeException(path, "must be a finite number")
    return number
}

internal inline fun <T> JsonElement.decodeList(path: String, decode: (JsonElement, String) -> T): List<T> {
    val array = asList(path)
    val items = ArrayList<T>(array.size)
    for (index in array.indices) items.add(decode(array[index], "$path[$index]"))
    return items
}

internal inline fun <T : Any> JsonElement.decodeNullable(path: String, decode: (JsonElement, String) -> T): T? =
    if (this is JsonNull) null else decode(this, path)
`;

function renderScalars(model) {
  const fields = [];
  const members = [];
  let usesBigInteger = false;
  for (const scalar of model.scalars) {
    const where = `scalar ${scalar.name}`;
    const type = scalarType(scalar, where);
    const constraints = scalar.constraints ?? {};
    const unknown = Object.keys(constraints).filter(key => !CONSTRAINT_KEYS.has(key));
    if (unknown.length) fail(`${where} has unsupported constraint(s) ${unknown.join(", ")}`);
    const checks = [];
    const requireRepresentation = (key, representation) => {
      if (scalar.representation !== representation) fail(`${where}: ${key} needs the ${representation} representation`);
    };
    const notes = [];
    if (constraints.pattern !== undefined) {
      requireRepresentation("pattern", "string");
      const { pattern } = constraints;
      // Regex.matches is a whole-input match. It agrees with an anchored JavaScript test, where
      // a trailing $ never matches before a final line break; unanchored patterns would not.
      if (typeof pattern !== "string" || !pattern.startsWith("^") || !pattern.endsWith("$") || pattern.endsWith("\\$")) {
        fail(`${where}: pattern must be anchored with ^ and $`);
      }
      fields.push(`    private val pattern${scalar.name}: Regex = Regex(${kotlinString(pattern)})`);
      checks.push(`        if (!pattern${scalar.name}.matches(value)) throw ShapeException(path, ${kotlinString(`must be a ${scalar.name}`)})`);
    }
    if (constraints.maximumDecimal !== undefined) {
      requireRepresentation("maximumDecimal", "string");
      if (typeof constraints.maximumDecimal !== "string" || !/^(0|[1-9][0-9]*)$/.test(constraints.maximumDecimal)) fail(`${where}: maximumDecimal must be a decimal string`);
      usesBigInteger = true;
      fields.push(`    private val maximum${scalar.name}: BigInteger = BigInteger(${kotlinString(constraints.maximumDecimal)})`);
      checks.push(`        val number = value.toBigIntegerOrNull() ?: throw ShapeException(path, ${kotlinString(`must be a ${scalar.name}`)})`);
      checks.push(`        if (number > maximum${scalar.name}) throw ShapeException(path, ${kotlinString(`must be at most ${constraints.maximumDecimal}`)})`);
    }
    if (constraints.disallowed !== undefined) {
      requireRepresentation("disallowed", "string");
      if (!Array.isArray(constraints.disallowed) || !constraints.disallowed.every(value => typeof value === "string")) fail(`${where}: disallowed must list strings`);
      fields.push(`    private val disallowed${scalar.name}: Set<String> = setOf(${constraints.disallowed.map(kotlinString).join(", ")})`);
      checks.push(`        if (value in disallowed${scalar.name}) throw ShapeException(path, "is not allowed")`);
    }
    for (const key of ["minimum", "maximum"]) {
      const bound = constraints[key];
      if (bound === undefined) continue;
      if (!["integer", "number"].includes(scalar.representation) || typeof bound !== "number" || !Number.isFinite(bound)) fail(`${where}: ${key} needs a numeric representation`);
      if (scalar.representation === "integer" && (!Number.isInteger(bound) || bound < -2147483648 || bound > 2147483647)) fail(`${where}: ${key} must fit a Kotlin Int`);
    }
    if (constraints.minimum !== undefined || constraints.maximum !== undefined) notes.push(`The server accepts ${constraints.minimum ?? "any"} to ${constraints.maximum ?? "any"}.`);
    if (constraints.maxCanonicalJsonBytes !== undefined) {
      requireRepresentation("maxCanonicalJsonBytes", "object");
      if (!Number.isSafeInteger(constraints.maxCanonicalJsonBytes)) fail(`${where}: maxCanonicalJsonBytes must be an integer`);
      notes.push(`The server accepts at most ${constraints.maxCanonicalJsonBytes} bytes of canonical JSON.`);
    }
    if (constraints.requiredStringProperties !== undefined) {
      requireRepresentation("requiredStringProperties", "object");
      if (!Array.isArray(constraints.requiredStringProperties)) fail(`${where}: requiredStringProperties must be a list`);
      notes.push(`It carries the string properties ${constraints.requiredStringProperties.join(", ")}.`);
    }
    const doc = kdoc(joinDoc(scalar.description ?? scalar.summary, ...notes), "    ");
    const read = `element.${JSON_DECODERS[scalar.representation]}(path)`;
    const decodeFunction = checks.length === 0
      ? `    public fun decode${scalar.name}(element: JsonElement, path: String = ${kotlinString(scalar.name)}): ${type} = ${read}\n`
      : `    public fun decode${scalar.name}(element: JsonElement, path: String = ${kotlinString(scalar.name)}): ${type} {\n` +
        `        val value = ${read}\n${checks.join("\n")}\n        return value\n    }\n`;
    const encodeBody = scalar.representation === "object" ? "value" : "JsonPrimitive(value)";
    members.push(`${doc}${decodeFunction}\n    public fun encode${scalar.name}(value: ${type}): JsonElement = ${encodeBody}\n`);
  }
  const imports = ["kotlinx.serialization.json.JsonElement", "kotlinx.serialization.json.JsonObject", "kotlinx.serialization.json.JsonPrimitive"];
  if (usesBigInteger) imports.push("java.math.BigInteger");
  const body = [fields.length ? `${fields.join("\n")}\n` : "", ...members].filter(Boolean).join("\n");
  return `${header(imports)}\n` +
    "/** Codecs for the custom scalars. Decoders check string formats; the server enforces ranges and sizes. */\n" +
    `public object Scalars {\n${body}}\n`;
}

function renderEnums(model) {
  const declarations = model.enums.map(type => {
    const entries = type.values.map(value => `${kdoc(joinDoc(value.description, deprecationNote(value)), "    ")}    ${kotlinIdentifier(value.name, `${type.name}.${value.name}`)},`);
    return `${kdoc(type.description)}public enum class ${type.name} {\n${entries.join("\n")}\n    ;\n\n` +
      "    /** The GraphQL value. */\n" +
      "    public fun toJson(): JsonPrimitive = JsonPrimitive(name)\n\n" +
      "    public companion object {\n" +
      `        /** Decodes [element], throwing [ShapeException] for values this SDK does not know. */\n` +
      `        public fun fromJson(element: JsonElement, path: String = ${kotlinString(type.name)}): ${type.name} {\n` +
      "            val raw = element.asString(path)\n" +
      `            return entries.firstOrNull { it.name == raw } ?: throw ShapeException(path, ${kotlinString(`is not a known ${type.name} value`)})\n` +
      "        }\n    }\n}\n";
  });
  return `${header(["kotlinx.serialization.json.JsonElement", "kotlinx.serialization.json.JsonPrimitive"])}${declarations.map(text => `\n${text}`).join("")}`;
}

// Bearer values: signed proofs and token, secret or key strings. A data
// class prints every property, so types holding one get a redacting toString
// that keeps credentials out of logs and crash reports.
const SECRET_FIELD_NAME = /^(secret|token|backendKey)$|Token$/;
function isSecretField(field) {
  return field.type.kind === "scalar" && (field.type.name === "SignedProof" || SECRET_FIELD_NAME.test(field.name));
}

function renderRedactedToString(type, where) {
  if (!type.fields.some(isSecretField)) return "";
  const parts = type.fields.map((field, index) => {
    const name = kotlinIdentifier(field.name, where);
    const value = isSecretField(field) ? "<redacted>" : `\${this.${name}}`;
    const separator = index === type.fields.length - 1 ? ")" : ", ";
    return `        "${field.name}=${value}${separator}"`;
  });
  return "\n    /** Redacts credentials so logs and crash reports never carry them. */\n" +
    `    override fun toString(): String =\n        "${type.name}(" +\n${parts.join(" +\n")}\n`;
}

function renderObjects(model, renderer) {
  const declarations = model.objects.map(type => {
    const where = `object ${type.name}`;
    const properties = type.fields.map(field => {
      const name = kotlinIdentifier(field.name, `${type.name}.${field.name}`);
      const kotlinType = renderer.kotlinType(field.type, `${type.name}.${field.name}`);
      return `${kdoc(joinDoc(field.description, deprecationNote(field)), "    ")}    public val ${name}: ${kotlinType}${field.type.nullable ? " = null" : ""},`;
    });
    const encoded = type.fields.map(field => {
      const name = kotlinIdentifier(field.name, where);
      return `                ${kotlinString(field.name)} to ${renderer.encode(field.type, `this.${name}`, 0, `${type.name}.${field.name}`)},`;
    });
    const decoded = type.fields.map(field => {
      const name = kotlinIdentifier(field.name, where);
      const value = `obj.field(${kotlinString(field.name)}, path)`;
      return `                ${name} = ${renderer.decode(field.type, value, `"\${path}.${field.name}"`, 0, `${type.name}.${field.name}`)},`;
    });
    return `${kdoc(type.description)}public data class ${type.name}(\n${properties.join("\n")}\n) {\n` +
      "    /** The JSON form, with every field and explicit nulls. */\n" +
      `    public fun toJson(): JsonObject =\n        JsonObject(\n            linkedMapOf<String, JsonElement>(\n${encoded.join("\n")}\n            ),\n        )\n\n` +
      "    public companion object {\n" +
      `        /** Decodes [element], throwing [ShapeException] when it does not match ${type.name}. Unknown fields are ignored. */\n` +
      `        public fun fromJson(element: JsonElement, path: String = ${kotlinString(type.name)}): ${type.name} {\n` +
      "            val obj = element.asObject(path)\n" +
      `            return ${type.name}(\n${decoded.join("\n")}\n            )\n        }\n    }\n` +
      `${renderRedactedToString(type, where)}}\n`;
  });
  const imports = ["kotlinx.serialization.json.JsonArray", "kotlinx.serialization.json.JsonElement", "kotlinx.serialization.json.JsonNull",
    "kotlinx.serialization.json.JsonObject", "kotlinx.serialization.json.JsonPrimitive"];
  return `${header(imports)}${declarations.map(text => `\n${text}`).join("")}`;
}

function renderInputs(model, renderer) {
  const declarations = model.inputs.map(type => {
    const optional = field => field.type.nullable || field.defaultValue !== undefined;
    const properties = type.fields.map(field => {
      const where = `${type.name}.${field.name}`;
      const name = kotlinIdentifier(field.name, where);
      const kotlinType = renderer.kotlinType(optional(field) ? { ...field.type, nullable: true } : field.type, where);
      const serverDefault = field.defaultValue === undefined ? "" : `Omitted when null; the server default is ${JSON.stringify(field.defaultValue)}.`;
      return `${kdoc(joinDoc(field.description, deprecationNote(field), serverDefault), "    ")}    public val ${name}: ${kotlinType}${optional(field) ? " = null" : ""},`;
    });
    const assignments = type.fields.map(field => {
      const where = `${type.name}.${field.name}`;
      const name = kotlinIdentifier(field.name, where);
      const key = kotlinString(field.name);
      if (!optional(field)) return `        __fields[${key}] = ${renderer.encodeNonNull(field.type, `this.${name}`, 0, where)}`;
      return `        this.${name}?.let { v0 -> __fields[${key}] = ${renderer.encodeNonNull(field.type, "v0", 1, where)} }`;
    });
    return `${kdoc(type.description)}public data class ${type.name}(\n${properties.join("\n")}\n) {\n` +
      "    /** The JSON form. Null fields are omitted so server defaults apply. */\n" +
      "    public fun toJson(): JsonObject {\n" +
      "        val __fields = LinkedHashMap<String, JsonElement>()\n" +
      `${assignments.join("\n")}\n` +
      "        return JsonObject(__fields)\n    }\n" +
      `${renderRedactedToString(type, `input ${type.name}`)}}\n`;
  });
  const imports = ["kotlinx.serialization.json.JsonArray", "kotlinx.serialization.json.JsonElement", "kotlinx.serialization.json.JsonNull",
    "kotlinx.serialization.json.JsonObject", "kotlinx.serialization.json.JsonPrimitive"];
  return `${header(imports)}${declarations.map(text => `\n${text}`).join("")}`;
}

const OPERATION_TYPES = `/** What the runtime needs to send one operation, as listed in schema/operations.json. */
public class OperationDescriptor internal constructor(
    /** \`<plane>.<field>\`. */
    public val id: String,
    public val plane: String,
    /** \`query\`, \`mutation\` or \`subscription\`. */
    public val kind: String,
    public val field: String,
    public val operationName: String,
    public val document: String,
    /** The result type in GraphQL syntax. */
    public val resultType: String,
    public val contextArgument: String,
    /** How the operation uses each context field: \`required\`, \`optional\` or \`forbidden\`. */
    public val contextFields: Map<String, String>,
    public val inputArgument: String?,
    public val inputType: String?,
    public val inputRequired: Boolean,
    public val inputFields: List<String>,
    /** The idempotency class; see [Idempotency]. */
    public val idempotency: String,
    /** \`client\` or \`both\`. */
    public val layer: String,
    /** The realtime channel a subscription feeds. */
    public val realtimeChannel: String?,
)

/** A typed operation: its descriptor, input encoder and result decoder. */
public class OperationSpec<I, R> internal constructor(
    public val descriptor: OperationDescriptor,
    private val inputEncoder: (I) -> JsonObject?,
    private val resultDecoder: (JsonElement, String) -> R,
) {
    /** The input variable, or null when the operation takes none. */
    public fun encodeInput(input: I): JsonObject? = inputEncoder(input)

    /** Decodes \`data.<field>\`, throwing [ShapeException] when it does not match. */
    public fun decodeResult(element: JsonElement, path: String = descriptor.field): R = resultDecoder(element, path)
}
`;

function renderOperations(model, renderer) {
  const planeBlocks = model.planes.map(({ plane, name }) => {
    const specs = model.operations.filter(operation => operation.plane === plane).map(operation => renderOperation(operation, model, renderer));
    return `    /** Client operations of the ${plane} plane. */\n    public object ${name} {\n${specs.join("\n")}    }\n`;
  });
  const all = model.operations.map(operation => {
    const plane = model.planes.find(entry => entry.plane === operation.plane).name;
    return `            ${plane}.${kotlinIdentifier(operation.field, operation.id)},`;
  });
  return `${header(["kotlinx.serialization.json.JsonElement", "kotlinx.serialization.json.JsonObject"])}\n${OPERATION_TYPES}\n` +
    "/** The client operations, grouped by plane. */\npublic object Operations {\n" +
    `${planeBlocks.join("\n")}\n` +
    "    /** Every client operation, in schema order. */\n" +
    `    public val all: List<OperationSpec<*, *>> =\n        listOf(\n${all.join("\n")}\n        )\n\n` +
    "    /** [all], keyed by operation id. */\n" +
    "    public val byId: Map<String, OperationSpec<*, *>> = all.associateBy { it.descriptor.id }\n}\n";
}

function renderOperation(operation, model, renderer) {
  const where = operation.id;
  const field = kotlinIdentifier(operation.field, where);
  if (RESERVED_OPERATION_FIELDS.has(operation.field) || model.types.has(operation.field)) fail(`${where}: field ${operation.field} would shadow a name the generated code uses`);
  const roles = operation.arguments.map(argument => argument.role);
  if (roles.some(role => role !== "context" && role !== "input") || new Set(roles).size !== roles.length) fail(`${where}: arguments must be one context and at most one input`);
  if (!operation.context) fail(`${where}: operations need a context argument`);
  const inputArgument = operation.arguments.find(argument => argument.role === "input");
  if (Boolean(inputArgument) !== Boolean(operation.input)) fail(`${where}: the input argument and input metadata disagree`);
  let inputType = "Unit";
  let encoder = "{ _ -> null }";
  let inputFields = [];
  if (inputArgument) {
    if (inputArgument.type.kind !== "input") fail(`${where}: the input argument must be an input object`);
    const type = model.typeOf(inputArgument.type, where);
    inputFields = type.fields.map(entry => entry.name);
    inputType = inputArgument.type.nullable ? `${type.name}?` : type.name;
    encoder = inputArgument.type.nullable ? "{ input -> input?.toJson() }" : "{ input -> input.toJson() }";
  }
  const resultType = renderer.kotlinType(operation.result.type, where);
  const decoder = `{ element, path -> ${renderer.decode(operation.result.type, "element", "path", 0, where)} }`;
  const list = values => (values.length ? `listOf(${values.map(kotlinString).join(", ")})` : "emptyList()");
  const contextFields = operation.context.fields.map(entry => `${kotlinString(entry.name)} to ${kotlinString(entry.use)}`);
  const descriptor = [
    `id = ${kotlinString(operation.id)}`,
    `plane = ${kotlinString(operation.plane)}`,
    `kind = ${kotlinString(operation.kind)}`,
    `field = ${kotlinString(operation.field)}`,
    `operationName = ${kotlinString(operation.operationName)}`,
    `document = ${kotlinString(operation.document.text)}`,
    `resultType = ${kotlinString(printTypeRef(operation.result.type))}`,
    `contextArgument = ${kotlinString(operation.context.argument)}`,
    `contextFields = ${contextFields.length ? `mapOf(${contextFields.join(", ")})` : "emptyMap()"}`,
    `inputArgument = ${operation.input ? kotlinString(operation.input.argument) : "null"}`,
    `inputType = ${operation.input ? kotlinString(operation.input.type) : "null"}`,
    `inputRequired = ${operation.input ? String(Boolean(operation.input.required)) : "false"}`,
    `inputFields = ${list(inputFields)}`,
    `idempotency = ${kotlinString(operation.idempotency)}`,
    `layer = ${kotlinString(operation.layer)}`,
    `realtimeChannel = ${operation.realtime?.channel ? kotlinString(operation.realtime.channel) : "null"}`,
  ];
  return `${kdoc(operation.summary, "        ")}` +
    `        public val ${field}: OperationSpec<${inputType}, ${resultType}> =\n` +
    "            OperationSpec(\n" +
    "                OperationDescriptor(\n" +
    `${descriptor.map(line => `                    ${line},`).join("\n")}\n` +
    "                ),\n" +
    `                ${encoder},\n` +
    `                ${decoder},\n` +
    "            )\n";
}

const PROTOCOL_TYPES = `/** Retry rules for one idempotency class. */
public class IdempotencyClass internal constructor(
    public val name: String,
    /** \`none\`, \`sameRequest\` or \`repeat\`. */
    public val retry: String,
    /** Whether resolveRequest can settle an unknown outcome. */
    public val resolvable: Boolean,
    /** Attempts allowed for one requestId, when retries reuse it. */
    public val maxAttempts: Int?,
    /** How long retries may reuse one requestId, when they do. */
    public val windowMs: Long?,
)

/** One realtime channel and its limits. */
public class RealtimeChannel internal constructor(
    public val name: String,
    /** The subscription operation id. */
    public val subscription: String,
    /** The replay query that fills gaps. */
    public val replay: String,
    public val pageType: String,
    /** The operation whose result names the WebSocket endpoint. */
    public val endpointOperation: String?,
    public val endpointResultField: String?,
    /** connection_init payload fields, in order. */
    public val connectionInit: List<String>,
    public val maxFrameBytes: Int,
    public val maxPendingPages: Int,
    public val subscribeLimit: Int,
    public val replayLimit: Int,
    public val reconnectBaseDelayMs: Long,
    public val reconnectMaxDelayMs: Long,
    public val reconnectJitterMs: Long,
    /** Close codes after which reconnecting cannot succeed. */
    public val terminalCloseCodes: Set<Int>,
)

/** One event type of the realtime envelope. */
public class RealtimeEventType internal constructor(
    public val type: String,
    public val summary: String,
    public val subject: String?,
    public val requiredPayload: List<String>,
    public val optionalPayload: List<String>,
)
`;

function renderProtocol(ir, model) {
  const transport = ir.transport ?? fail("the IR has no transport section");
  const { path, http, websocket } = transport;
  if (typeof path !== "string" || !Number.isSafeInteger(http?.maxDocumentBytes) || typeof websocket?.subprotocol !== "string") fail("the transport section is incomplete");
  const idempotency = (ir.idempotency ?? []).map(entry => {
    const budget = entry.retryBudget;
    const name = kotlinIdentifier(entry.name, `idempotency ${entry.name}`);
    return `${kdoc(entry.summary, "    ")}    public val ${name}: IdempotencyClass =\n` +
      `        IdempotencyClass(${kotlinString(entry.name)}, ${kotlinString(entry.retry)}, ${Boolean(entry.resolvable)}, ${budget ? budget.maxAttempts : "null"}, ${budget ? `${budget.windowMs}L` : "null"})\n`;
  });
  const idempotencyNames = (ir.idempotency ?? []).map(entry => kotlinIdentifier(entry.name, "idempotency"));
  const realtime = ir.realtime;
  const selectedIds = new Set(model.operations.map(operation => operation.id));
  const channels = (realtime?.channels ?? []).filter(channel => selectedIds.has(channel.subscription));
  const channelDeclarations = channels.map(channel => {
    const { limits, reconnect } = channel;
    if (["channels", "events"].includes(channel.name)) fail(`realtime channel ${channel.name} would shadow Realtime.${channel.name}`);
    const args = [
      kotlinString(channel.name), kotlinString(channel.subscription), kotlinString(channel.replay), kotlinString(channel.pageType),
      channel.endpoint ? kotlinString(channel.endpoint.operation) : "null",
      channel.endpoint ? kotlinString(channel.endpoint.resultField) : "null",
      `listOf(${channel.connectionInit.map(kotlinString).join(", ")})`,
      limits.maxFrameBytes, limits.maxPendingPages, limits.subscribeLimit, limits.replayLimit,
      `${reconnect.baseDelayMs}L`, `${reconnect.maxDelayMs}L`, `${reconnect.jitterMs}L`,
      reconnect.terminalCloseCodes.length ? `setOf(${reconnect.terminalCloseCodes.join(", ")})` : "emptySet()",
    ];
    for (const value of [limits.maxFrameBytes, limits.maxPendingPages, limits.subscribeLimit, limits.replayLimit, reconnect.baseDelayMs, reconnect.maxDelayMs, reconnect.jitterMs, ...reconnect.terminalCloseCodes]) {
      if (!Number.isSafeInteger(value)) fail(`realtime channel ${channel.name} has a non-integer limit`);
    }
    return `${kdoc(channel.ordering ? joinDoc(channel.summary, channel.ordering) : channel.summary, "    ")}` +
      `    public val ${kotlinIdentifier(channel.name, `realtime channel ${channel.name}`)}: RealtimeChannel =\n        RealtimeChannel(\n${args.map(arg => `            ${arg},`).join("\n")}\n        )\n`;
  });
  const events = (realtime?.events ?? []).map(event => {
    const args = [
      kotlinString(event.type), kotlinString(event.summary ?? ""), event.subject ? kotlinString(event.subject) : "null",
      event.payload.required.length ? `listOf(${event.payload.required.map(kotlinString).join(", ")})` : "emptyList()",
      event.payload.optional.length ? `listOf(${event.payload.optional.map(kotlinString).join(", ")})` : "emptyList()",
    ];
    return `            RealtimeEventType(${args.join(", ")}),`;
  });
  const envelope = realtime?.envelope;
  const envelopeConstants = envelope
    ? "    /** The envelope type of realtime events. */\n" +
      `    public const val ENVELOPE_TYPE: String = ${kotlinString(envelope.type)}\n` +
      "    /** The envelope field that names the event type. */\n" +
      `    public const val DISCRIMINATOR: String = ${kotlinString(envelope.discriminator)}\n` +
      `    public const val PAYLOAD_FIELD: String = ${kotlinString(envelope.payload)}\n` +
      `    public const val SUBJECT_FIELD: String = ${kotlinString(envelope.subject)}\n` +
      "    /** What clients do with event types they do not know. */\n" +
      `    public const val UNKNOWN_TYPES: String = ${kotlinString(envelope.unknownTypes)}\n\n`
    : "";
  return `${header([])}\n${PROTOCOL_TYPES}\n` +
    "/** HTTP and WebSocket transport constants. */\npublic object Transport {\n" +
    `    public const val PATH: String = ${kotlinString(path)}\n` +
    `    public const val MAX_DOCUMENT_BYTES: Int = ${http.maxDocumentBytes}\n` +
    `    public const val WEBSOCKET_SUBPROTOCOL: String = ${kotlinString(websocket.subprotocol)}\n}\n\n` +
    "/** Idempotency classes and their retry budgets. */\npublic object Idempotency {\n" +
    `${idempotency.join("\n")}\n` +
    "    /** Every class, keyed by name. */\n" +
    `    public val byName: Map<String, IdempotencyClass> = listOf(${idempotencyNames.join(", ")}).associateBy { it.name }\n}\n\n` +
    "/** The realtime envelope, channels and event catalog. */\npublic object Realtime {\n" +
    envelopeConstants +
    `${channelDeclarations.map(text => `${text}\n`).join("")}` +
    "    /** Every channel a client subscribes to. */\n" +
    `    public val channels: List<RealtimeChannel> = ${channels.length ? `listOf(${channels.map(channel => kotlinIdentifier(channel.name, "channel")).join(", ")})` : "emptyList()"}\n\n` +
    "    /** Known event types, keyed by type. Deliver other types as unknown events. */\n" +
    `    public val events: Map<String, RealtimeEventType> =\n        listOf(\n${events.join("\n")}\n        ).associateBy { it.type }\n}\n`;
}

function renderErrorCodes(ir) {
  const codes = ir.errors?.codes ?? [];
  const constants = codes.map(code => {
    if (!/^[A-Z][A-Z0-9_]*$/.test(code.name)) fail(`error code ${JSON.stringify(code.name)} is not SCREAMING_SNAKE_CASE`);
    return `${kdoc(code.summary, "    ")}    public const val ${code.name}: String = ${kotlinString(code.name)}\n`;
  });
  const entries = codes.map(code => {
    if (code.status !== undefined && !Number.isSafeInteger(code.status)) fail(`error code ${code.name} has a non-integer status`);
    return `            ErrorCodeInfo(${code.name}, ${kotlinString(code.summary ?? "")}, ${kotlinString(code.origin ?? "")}, ${code.status ?? "null"}, ${Boolean(code.retryable)}),`;
  });
  return `${header([])}\n` +
    "/** What the schema says about one error code. */\npublic class ErrorCodeInfo internal constructor(\n" +
    "    public val code: String,\n    public val summary: String,\n" +
    "    /** `server`, `sdk` or `both`. */\n    public val origin: String,\n" +
    "    /** The HTTP-equivalent status, when the code has one. */\n    public val status: Int?,\n" +
    "    /** Whether a later attempt with the same requestId may succeed. */\n    public val retryable: Boolean,\n)\n\n" +
    "/** Stable error codes. The set is open: handle codes this SDK does not list. */\npublic object ErrorCodes {\n" +
    `${constants.join("\n")}\n` +
    "    /** Every listed code, keyed by code. */\n" +
    `    public val catalog: Map<String, ErrorCodeInfo> =\n        listOf(\n${entries.join("\n")}\n        ).associateBy { it.code }\n}\n`;
}

/** Every generated Kotlin file, keyed by file name. */
export function renderKotlin(ir) {
  const model = createModel(ir);
  const renderer = createRenderer(model);
  return {
    "Codec.kt": CODEC,
    "Scalars.kt": renderScalars(model),
    "Enums.kt": renderEnums(model),
    "Objects.kt": renderObjects(model, renderer),
    "Inputs.kt": renderInputs(model, renderer),
    "Operations.kt": renderOperations(model, renderer),
    "Protocol.kt": renderProtocol(ir, model),
    "ErrorCodes.kt": renderErrorCodes(ir),
  };
}

export default defineEmitter({
  name: "android",
  description: "Kotlin models and operation catalog for the Android client SDK",
  owns: [DIRECTORY],
  emit(ir, options = {}) {
    const unknown = Object.keys(options);
    if (unknown.length) fail(`unknown option(s) ${unknown.join(", ")}`);
    return Object.entries(renderKotlin(ir)).map(([name, contents]) => ({ path: `${DIRECTORY}/${name}`, contents }));
  },
});
