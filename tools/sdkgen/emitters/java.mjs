import { defineEmitter, EmitterError } from "../lib/emitter.mjs";
import { byName, namedTypeRef, printTypeRef, requireType } from "../lib/ir-model.mjs";
import { capitalize, pascalCase, screamingSnakeCase } from "../lib/naming.mjs";

/**
 * Java and Kotlin sources for the JVM server SDK in jvm/.
 *
 * Java: an immutable model per enum, object and input type in
 * com.convohop.server.model, the operation catalog (Operations) and one API
 * class per plane in com.convohop.server.api, with a lazy pages method for each
 * query whose pagination style takes a cursor. Kotlin: a suspending wrapper per
 * plane API in com.convohop.server.kotlin, where pages methods return cold
 * flows. Only server-layer queries and
 * mutations (layer server or both) get API methods. The generated code uses
 * only com.convohop.server.internal and JSpecify, so the edge golden compiles
 * against the hand-written runtime without the repository schema.
 */
export const DEFAULT_DIRECTORY = "jvm/convohop-server/src/generated/java";
export const DEFAULT_KOTLIN_DIRECTORY = "jvm/convohop-server-kotlin/src/generated/kotlin";

const PACKAGE = "com.convohop.server";
const NOTICE = "// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.\n";
// graphql-js prints `@deprecated` without a reason as this default.
const DEFAULT_DEPRECATION_REASON = "No longer supported";
// Mirrors validateOutput in packages/core/src/graphql.ts: exactly one field of a retained result is non-null.
const EXACTLY_ONE_FIELD = new Set(["RetainedResult"]);
// toString() redacts bearer material and signed proofs.
const SENSITIVE_FIELD = /(?:token|secret|key|permit|proof|password)$/i;
const INT32_MIN = -(2 ** 31);
const INT32_MAX = 2 ** 31 - 1;

const BUILT_IN_SCALARS = {
  String: { java: "String", kotlin: "String", decoder: "Wire.STRING" },
  ID: { java: "String", kotlin: "String", decoder: "Wire.STRING" },
  Int: { java: "Integer", kotlin: "Int", decoder: "Wire.INT" },
  Float: { java: "Double", kotlin: "Double", decoder: "Wire.FLOAT" },
  Boolean: { java: "Boolean", kotlin: "Boolean", decoder: "Wire.BOOLEAN" },
};
const CONSTRAINTS = {
  string: ["pattern", "disallowed", "maximumDecimal"],
  integer: ["minimum", "maximum"],
  number: ["minimum", "maximum"],
  boolean: [],
  object: ["maxCanonicalJsonBytes", "requiredStringProperties"],
};
const RETRY = { repeat: "REPEAT", sameRequest: "SAME_REQUEST", none: "NONE" };
const KIND = { query: "QUERY", mutation: "MUTATION" };
const USE = { required: "REQUIRED", optional: "OPTIONAL", forbidden: "FORBIDDEN" };

const JAVA_KEYWORDS = new Set([
  "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char", "class", "const", "continue", "default", "do",
  "double", "else", "enum", "extends", "false", "final", "finally", "float", "for", "goto", "if", "implements", "import",
  "instanceof", "int", "interface", "long", "native", "new", "null", "package", "private", "protected", "public", "permits",
  "record", "return", "sealed", "short", "static", "strictfp", "super", "switch", "synchronized", "this", "throw", "throws",
  "transient", "true", "try", "var", "void", "volatile", "while", "yield", "_",
]);
// Final or ubiquitous java.lang.Object methods that a generated method must not override or overload.
const OBJECT_METHODS = new Set(["clone", "equals", "finalize", "getClass", "hashCode", "notify", "notifyAll", "toString", "wait"]);
const KOTLIN_KEYWORDS = new Set([
  "as", "break", "class", "continue", "do", "else", "false", "for", "fun", "if", "in", "interface", "is", "null", "object",
  "package", "return", "super", "this", "throw", "true", "try", "typealias", "typeof", "val", "var", "when", "while",
]);
// Simple names the generated Java and Kotlin use unqualified; a schema type with one of these names would shadow them.
const RESERVED_TYPE_NAMES = new Set([
  "Any", "BigInteger", "Boolean", "Builder", "Class", "CoroutineDispatcher", "Deprecated", "Dispatchers", "Double", "Enum",
  "Flow", "IllegalArgumentException", "IllegalStateException", "Int", "Integer", "Iterable", "LinkedHashMap", "List", "Long",
  "Map", "Math", "NullMarked", "Nullable", "Object", "Objects", "OperationCatalog", "OperationDescriptor", "OperationExecutor",
  "Operations", "Override", "Pages", "Scalars", "String", "StringBuilder", "Suppress", "SuppressWarnings", "Unit", "Wire",
  "WireEnum", "WireException", "WireValue",
]);
const MODEL_KINDS = new Set(["enum", "input", "object"]);
// The hand-written runtime functions (convohop-server-kotlin) that the suspending wrappers call.
const KOTLIN_CALL_HELPER = "interruptible";
const KOTLIN_PAGE_HELPER = "pageFlow";
// How Pages checks that each next cursor advances: ordered styles compare decimal cursors, other cursors must change.
const PAGE_ORDER = { server: "OPAQUE", ascending: "ASCENDING", descending: "DESCENDING" };
const PAGE_FIELDS = ["complete", "refreshRequired", "nextCursor"];

/** A Java identifier for a schema name: Java keywords and java.lang.Object method names get a trailing underscore. */
export function javaIdentifier(name) {
  return JAVA_KEYWORDS.has(name) || OBJECT_METHODS.has(name) ? `${name}_` : name;
}

/** A Kotlin reference to a Java member name; Kotlin hard keywords need backticks. */
export function kotlinIdentifier(name) {
  return KOTLIN_KEYWORDS.has(name) ? `\`${name}\`` : name;
}

/** A Java string literal. Control and non-ASCII characters are escaped so no unicode escape can end the literal. */
export function javaString(text) {
  let out = '"';
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const code = text.charCodeAt(index);
    if (char === '"') out += '\\"';
    else if (char === "\\") out += "\\\\";
    else if (char === "\n") out += "\\n";
    else if (char === "\r") out += "\\r";
    else if (char === "\t") out += "\\t";
    else if (code < 0x20 || code === 0x7f) out += `\\${code.toString(8).padStart(3, "0")}`;
    else if (code > 0x7e) out += `\\u${code.toString(16).padStart(4, "0")}`;
    else out += char;
  }
  return `${out}"`;
}

/** A Kotlin string literal; `$` is escaped so text never becomes a template. */
export function kotlinString(text) {
  const escaped = text.replace(/[\\"$]/g, char => `\\${char}`).replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")
    .replace(/[\u0000-\u001f\u007f]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);
  return `"${escaped}"`;
}

/**
 * A java.util.regex pattern that matches like the JavaScript scalar pattern
 * under RegExp#test, which Java's Matcher#find mirrors. Only a conservative
 * subset is accepted: `$` becomes `\z` because Java's `$` also matches before
 * a final line terminator, and constructs whose meaning differs between the
 * engines (`.`, `\s`, `\b`, groups starting `(?`, `[` or `&&` inside a class,
 * non-ASCII text) are rejected rather than translated.
 */
export function javaPattern(pattern) {
  const unsupported = detail => new EmitterError(`java: scalar pattern ${JSON.stringify(pattern)} uses ${detail}, which the Java emitter does not translate`);
  let out = "";
  let inClass = false;
  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index];
    if (char === "\\") {
      const next = pattern[index + 1];
      if (next === undefined || !/^[\\^$.|?*+()[\]{}/dD-]$/.test(next)) throw unsupported(`the escape \\${next ?? ""}`);
      out += char + next;
      index++;
    } else if (inClass) {
      if (char === "[" || (char === "&" && pattern[index + 1] === "&")) throw unsupported(`${char} inside a character class`);
      if (!/^[ -~]$/.test(char)) throw unsupported("non-ASCII text");
      if (char === "]") inClass = false;
      out += char;
    } else if (char === "[") {
      inClass = true;
      out += char;
      if (pattern[index + 1] === "]") throw unsupported("an empty character class");
    } else if (char === "$") {
      out += "\\z";
    } else if (char === "." || (char === "(" && pattern[index + 1] === "?")) {
      throw unsupported(char === "." ? "." : "a (? group");
    } else if (!/^[A-Za-z0-9^|()?*+{},:_ -]$/.test(char)) {
      throw unsupported(JSON.stringify(char));
    } else {
      out += char;
    }
  }
  if (inClass) throw unsupported("an unterminated character class");
  return out;
}

/**
 * Schema prose as Javadoc text. HTML is escaped, `@` cannot start a tag, a
 * backslash cannot start a unicode escape and `*\/` cannot end the comment.
 */
export function javadocText(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/@/g, "&#64;")
    .replace(/\\/g, "&#92;").replace(/\*\//g, "*&#47;");
}

/** A Javadoc comment from escaped paragraphs and tag lines, indented by `indent` spaces. */
function javadoc(indent, paragraphs, tags = []) {
  const pad = " ".repeat(indent);
  const blocks = paragraphs.filter(Boolean).flatMap(text => text.split(/\n[ \t]*\n/)).map(text => text.trim()).filter(Boolean);
  if (blocks.length === 0 && tags.length === 0) return "";
  if (blocks.length === 1 && tags.length === 0 && !blocks[0].includes("\n")) return `${pad}/** ${blocks[0]} */\n`;
  const lines = [];
  blocks.forEach((block, index) => {
    if (index > 0) lines.push("");
    const parts = block.split("\n").map(line => line.trimEnd());
    lines.push(...(index > 0 ? [`<p>${parts[0]}`, ...parts.slice(1)] : parts));
  });
  if (tags.length) {
    if (lines.length) lines.push("");
    lines.push(...tags);
  }
  return `${pad}/**\n${lines.map(line => (line ? `${pad} * ${line}` : `${pad} *`)).join("\n")}\n${pad} */\n`;
}

const prose = text => (text ? javadocText(text) : "");
const code = text => `<code>${javadocText(text)}</code>`;
const deprecationReason = deprecated => deprecated.reason ?? DEFAULT_DEPRECATION_REASON;

function imports(names) {
  const sorted = [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return sorted.length ? `${sorted.map(name => `import ${name};`).join("\n")}\n\n` : "";
}

function longLiteral(value) {
  if (!Number.isSafeInteger(value)) throw new EmitterError(`java: constraint ${value} is not a safe integer`);
  return `${value}L`;
}

function doubleLiteral(value) {
  if (!Number.isFinite(value)) throw new EmitterError(`java: constraint ${value} is not finite`);
  return Number.isInteger(value) ? `${value}.0` : String(value);
}

/** The Java and Kotlin types and decoder of a scalar, selected by its representation and constraints. */
export function scalarMapping(scalar) {
  if (scalar.builtIn) {
    const mapping = BUILT_IN_SCALARS[scalar.name];
    if (!mapping) throw new EmitterError(`java: unsupported built-in scalar ${scalar.name}`);
    return { ...mapping, factory: null };
  }
  const allowed = CONSTRAINTS[scalar.representation];
  if (!allowed) throw new EmitterError(`java: scalar ${scalar.name} has unsupported representation ${JSON.stringify(scalar.representation)}`);
  const constraints = scalar.constraints ?? {};
  for (const key of Object.keys(constraints)) {
    if (!allowed.includes(key)) throw new EmitterError(`java: scalar ${scalar.name} has unsupported ${scalar.representation} constraint ${key}`);
  }
  const decoder = `Scalars.${screamingSnakeCase(scalar.name)}`;
  const { minimum, maximum } = constraints;
  switch (scalar.representation) {
    case "string": {
      const pattern = constraints.pattern === undefined ? "null" : javaString(javaPattern(constraints.pattern));
      const maximumDecimal = constraints.maximumDecimal === undefined ? "null" : javaString(constraints.maximumDecimal);
      const disallowed = (constraints.disallowed ?? []).map(javaString).join(", ");
      return { java: "String", kotlin: "String", decoder, factory: `Wire.string(${pattern}, ${maximumDecimal}, List.of(${disallowed}))` };
    }
    case "integer": {
      const bound = value => (value === undefined ? "null" : longLiteral(value));
      if (minimum !== undefined && maximum !== undefined && minimum >= INT32_MIN && maximum <= INT32_MAX) {
        return { java: "Integer", kotlin: "Int", decoder, factory: `Wire.integer(${bound(minimum)}, ${bound(maximum)})` };
      }
      return { java: "Long", kotlin: "Long", decoder, factory: `Wire.longInteger(${bound(minimum)}, ${bound(maximum)})` };
    }
    case "number": {
      const bound = value => (value === undefined ? "null" : doubleLiteral(value));
      return { java: "Double", kotlin: "Double", decoder, factory: `Wire.number(${bound(minimum)}, ${bound(maximum)})` };
    }
    case "boolean":
      return { java: "Boolean", kotlin: "Boolean", decoder, factory: "Wire.BOOLEAN" };
    default: {
      const bytes = constraints.maxCanonicalJsonBytes ?? 0;
      const required = (constraints.requiredStringProperties ?? []).map(javaString).join(", ");
      return { java: "Map<String, @Nullable Object>", kotlin: "Map<String, Any?>", decoder, factory: `Wire.objectScalar(${bytes}, List.of(${required}))` };
    }
  }
}

/** The server operations the JVM SDK exposes: queries and mutations for the server layer. */
export function serverOperations(ir) {
  return ir.operations.filter(operation => (operation.layer === "server" || operation.layer === "both") && operation.kind !== "subscription");
}

/**
 * Names of the types, scalars included, that server operation inputs and
 * results reach. Client-only types are left out of the server SDK.
 */
export function serverTypeNames(ir) {
  const types = byName(ir.types);
  const contextTypes = new Set(ir.planes.map(plane => plane.context.type));
  const reached = new Set();
  const visit = (name, where) => {
    if (reached.has(name)) return;
    if (contextTypes.has(name)) throw new EmitterError(`java: ${where} uses the plane context type ${name}`);
    const type = requireType(types, name, `java: ${where}`);
    reached.add(name);
    for (const field of type.fields ?? []) visit(namedTypeRef(field.type).name, `${type.name}.${field.name}`);
  };
  for (const operation of serverOperations(ir)) {
    visit(namedTypeRef(operation.result.type).name, operation.id);
    if (operation.input) visit(operation.input.type, operation.id);
  }
  return reached;
}

function createModel(ir) {
  const types = byName(ir.types);
  const planeApis = new Set(ir.planes.map(plane => `${pascalCase(plane.name)}Api`));
  const reached = serverTypeNames(ir);
  const modelTypes = ir.types.filter(type => type.kind !== "scalar" && reached.has(type.name));
  const scalars = ir.types.filter(type => type.kind === "scalar" && !type.builtIn && reached.has(type.name));
  for (const type of modelTypes) {
    if (!MODEL_KINDS.has(type.kind)) throw new EmitterError(`java: type ${type.name} has unsupported kind ${JSON.stringify(type.kind)}`);
    if (RESERVED_TYPE_NAMES.has(type.name) || planeApis.has(type.name)) {
      throw new EmitterError(`java: type ${type.name} would shadow a name the generated Java uses; rename it or extend the emitter`);
    }
  }

  const named = (ref, where) => requireType(types, namedTypeRef(ref).name, where);
  const scalarOf = (ref, where) => scalarMapping(named(ref, where));

  /** Java type of a reference; `@Nullable` marks nullable positions. `uses` collects model type names. */
  function javaType(ref, uses, where) {
    let base;
    if (ref.kind === "list") base = `List<${javaType(ref.ofType, uses, where)}>`;
    else if (ref.kind === "scalar") base = scalarOf(ref, where).java;
    else {
      named(ref, where);
      uses.add(ref.name);
      base = ref.name;
    }
    return ref.nullable ? `@Nullable ${base}` : base;
  }

  function kotlinType(ref, where) {
    let base;
    if (ref.kind === "list") base = `List<${kotlinType(ref.ofType, where)}>`;
    else if (ref.kind === "scalar") base = scalarOf(ref, where).kotlin;
    else base = ref.name;
    return ref.nullable ? `${base}?` : base;
  }

  function decoder(ref, uses, where) {
    let inner;
    if (ref.kind === "list") inner = `Wire.list(${decoder(ref.ofType, uses, where)})`;
    else if (ref.kind === "scalar") {
      inner = scalarOf(ref, where).decoder;
      if (inner.startsWith("Scalars.")) uses.add("Scalars");
    } else {
      named(ref, where);
      uses.add(ref.name);
      inner = `${ref.name}::decode`;
    }
    return `Wire.${ref.nullable ? "optional" : "required"}(${inner})`;
  }

  return { types, modelTypes, scalars, javaType, kotlinType, decoder, named };
}

function memberNames(type) {
  const fields = new Set();
  const getters = new Set();
  return type.fields.map(field => {
    const identifier = javaIdentifier(field.name);
    const getter = `get${capitalize(field.name)}`;
    if (fields.has(identifier) || getters.has(getter)) throw new EmitterError(`java: ${type.name}.${field.name} collides with another field's Java name`);
    if (OBJECT_METHODS.has(getter) || identifier === "build") throw new EmitterError(`java: ${type.name}.${field.name} collides with a generated method`);
    fields.add(identifier);
    getters.add(getter);
    return { field, identifier, getter };
  });
}

function equalsHashToString(type, members, indent = "  ") {
  const comparisons = members.map(({ identifier }) => `Objects.equals(this.${identifier}, that.${identifier})`);
  const parts = members.map(({ field, identifier }, index) => {
    const value = SENSITIVE_FIELD.test(field.name) ? `Wire.redacted(this.${identifier})` : `this.${identifier}`;
    return `${index === 0 ? `"${type.name}{` : '", '}${field.name}=" + ${value}`;
  });
  return `
${indent}@Override
${indent}public boolean equals(@Nullable Object other) {
${indent}  if (this == other) {
${indent}    return true;
${indent}  }
${indent}  if (!(other instanceof ${type.name})) {
${indent}    return false;
${indent}  }
${indent}  ${type.name} that = (${type.name}) other;
${indent}  return ${comparisons.join(`\n${indent}      && `)};
${indent}}

${indent}@Override
${indent}public int hashCode() {
${indent}  return Objects.hash(${members.map(({ identifier }) => `this.${identifier}`).join(", ")});
${indent}}

${indent}@Override
${indent}public String toString() {
${indent}  return ${parts.join(`\n${indent}      + `)}
${indent}      + "}";
${indent}}
`;
}

function fieldDoc(field, fallback, extra = []) {
  const tags = field.deprecated ? [`@deprecated ${prose(deprecationReason(field.deprecated))}`] : [];
  return { paragraphs: [prose(field.description) || fallback, ...extra], tags };
}

function renderEnum(type) {
  const constants = new Map();
  const values = type.values.map(value => {
    let constant = screamingSnakeCase(value.name);
    if (/^[0-9]/.test(constant)) constant = `_${constant}`;
    if (!constant || JAVA_KEYWORDS.has(constant)) throw new EmitterError(`java: ${type.name}.${value.name} has no Java constant name`);
    if (constants.has(constant)) throw new EmitterError(`java: ${type.name} values ${constants.get(constant)} and ${value.name} both map to ${constant}`);
    constants.set(constant, value.name);
    const doc = javadoc(2, [prose(value.description)], value.deprecated ? [`@deprecated ${prose(deprecationReason(value.deprecated))}`] : []);
    return `${doc}${value.deprecated ? "  @Deprecated\n" : ""}  ${constant}(${javaString(value.name)})`;
  });
  return `${NOTICE}package ${PACKAGE}.model;

${imports(["com.convohop.server.internal.Wire", "com.convohop.server.internal.WireEnum", "com.convohop.server.internal.WireException", "org.jspecify.annotations.Nullable"])}${javadoc(0, [prose(type.description) || `The ${code(type.name)} enum.`])}public enum ${type.name} implements WireEnum {
${values.join(",\n")};

  private final String wireValue;

  ${type.name}(String wireValue) {
    this.wireValue = wireValue;
  }

  /** The value on the wire. */
  @Override
  public String wireValue() {
    return this.wireValue;
  }

  /**
   * The constant for a wire value.
   *
   * @param value the value on the wire
   * @return the constant
   * @throws IllegalArgumentException for a value this SDK version does not know
   */
  public static ${type.name} fromWire(String value) {
    return decode(value, 0);
  }

  /**
   * Decodes an authority value. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the constant
   * @throws WireException for anything but a known value
   */
  public static ${type.name} decode(@Nullable Object value, int depth) {
    String text = Wire.STRING.decode(value, depth);
    for (${type.name} candidate : values()) {
      if (candidate.wireValue.equals(text)) {
        return candidate;
      }
    }
    throw new WireException("unknown ${type.name} value");
  }
}
`;
}

function renderObject(type, model) {
  const uses = new Set();
  const members = memberNames(type);
  const where = `java: ${type.name}`;
  const typed = members.map(member => ({ ...member, java: model.javaType(member.field.type, uses, where), decoder: model.decoder(member.field.type, uses, where) }));
  const fields = typed.map(({ identifier, java }) => `  private final ${java} ${identifier};`).join("\n");
  const parameters = typed.map(({ identifier, java }) => `${java} ${identifier}`).join(",\n      ");
  const assignments = typed.map(({ identifier }) => `    this.${identifier} = ${identifier};`).join("\n");
  const decoded = typed.map(({ field, decoder }) => `Wire.field(object, ${javaString(type.name)}, ${javaString(field.name)}, depth, ${decoder})`).join(",\n        ");
  const getters = typed.map(({ field, identifier, getter, java }) => {
    const { paragraphs, tags } = fieldDoc(field, `The ${code(field.name)} field.`);
    const doc = javadoc(2, paragraphs, tags);
    return `${doc}${field.deprecated ? "  @Deprecated\n" : ""}  public ${java} ${getter}() {\n    return this.${identifier};\n  }`;
  }).join("\n\n");
  const json = typed.map(({ field, identifier }) => `    json.put(${javaString(field.name)}, Wire.json(this.${identifier}));`).join("\n");
  const exactlyOne = EXACTLY_ONE_FIELD.has(type.name) ? `    Wire.exactlyOneNonNull(object, ${javaString(type.name)});\n` : "";
  return `${NOTICE}package ${PACKAGE}.model;

${imports(["com.convohop.server.internal.Wire", "com.convohop.server.internal.WireValue", "java.util.LinkedHashMap", "java.util.Map", "java.util.Objects", "org.jspecify.annotations.Nullable", ...(typed.some(({ java }) => java.includes("List<")) ? ["java.util.List"] : [])])}${javadoc(0, [prose(type.description) || `The ${code(type.name)} result type.`])}public final class ${type.name} implements WireValue {
${fields}

  private ${type.name}(
      ${parameters}) {
${assignments}
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static ${type.name} fromJson(@Nullable Object value) {
    return Wire.required(${type.name}::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static ${type.name} decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, ${javaString(type.name)});
${exactlyOne}    return new ${type.name}(
        ${decoded});
  }

${getters}

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
${json}
    return json;
  }
${equalsHashToString(type, typed)}}
`;
}

function renderInput(type, model) {
  const uses = new Set();
  const members = memberNames(type);
  const where = `java: ${type.name}`;
  const typed = members.map(member => {
    const required = !member.field.type.nullable && member.field.defaultValue === undefined;
    const stored = required ? member.field.type : { ...member.field.type, nullable: true };
    return { ...member, required, java: model.javaType(stored, uses, where), plain: model.javaType({ ...member.field.type, nullable: false }, uses, where) };
  });
  const listy = typed.some(({ java }) => java.includes("List<"));
  const fields = typed.map(({ identifier, java }) => `  private final ${java} ${identifier};`).join("\n");
  const assignments = typed.map(({ field, identifier, required }) => (required
    ? `    this.${identifier} = Wire.present(builder.${identifier}, ${javaString(`${type.name}.${field.name}`)});`
    : `    this.${identifier} = builder.${identifier};`)).join("\n");
  const defaultNote = field => (field.defaultValue === undefined ? [] : [`The authority uses ${code(JSON.stringify(field.defaultValue))} when this field is omitted.`]);
  const getters = typed.map(({ field, identifier, getter, java }) => {
    const { paragraphs, tags } = fieldDoc(field, `The ${code(field.name)} field.`, defaultNote(field));
    const doc = javadoc(2, paragraphs, tags);
    return `${doc}${field.deprecated ? "  @Deprecated\n" : ""}  public ${java} ${getter}() {\n    return this.${identifier};\n  }`;
  }).join("\n\n");
  const json = typed.map(({ field, identifier, required }) => (required
    ? `    json.put(${javaString(field.name)}, Wire.json(this.${identifier}));`
    : `    if (this.${identifier} != null) {\n      json.put(${javaString(field.name)}, Wire.json(this.${identifier}));\n    }`)).join("\n");
  const builderFields = typed.map(({ identifier, plain }) => `    private @Nullable ${plain.replace(/^@Nullable /, "")} ${identifier};`).join("\n");
  const setters = typed.map(({ field, identifier, required, plain }) => {
    const { paragraphs, tags } = fieldDoc(field, `Sets the ${code(field.name)} field.`, [...defaultNote(field), ...(required ? ["Required."] : [])]);
    const parameterType = required ? plain : `@Nullable ${plain.replace(/^@Nullable /, "")}`;
    const checked = required ? `Wire.nonNull(${identifier}, ${javaString(identifier)})` : identifier;
    const value = plain.includes("List<") || plain.includes("Map<") ? `Wire.immutable(${checked})` : checked;
    const doc = javadoc(4, paragraphs,
      [`@param ${identifier} the value${required ? "" : ", or {@code null} to omit the field"}`, "@return this builder", ...tags]);
    return `${doc}${field.deprecated ? "    @Deprecated\n" : ""}    public Builder ${identifier}(${parameterType} ${identifier}) {\n      this.${identifier} = ${value};\n      return this;\n    }`;
  }).join("\n\n");
  return `${NOTICE}package ${PACKAGE}.model;

${imports(["com.convohop.server.internal.Wire", "com.convohop.server.internal.WireValue", "java.util.LinkedHashMap", "java.util.Map", "java.util.Objects", "org.jspecify.annotations.Nullable", ...(listy ? ["java.util.List"] : [])])}${javadoc(0, [prose(type.description) || `The ${code(type.name)} input type.`, "Build instances with {@link #builder()}. Fields without a value are omitted from the request."])}public final class ${type.name} implements WireValue {
${fields}

  private ${type.name}(Builder builder) {
${assignments}
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

${getters}

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
${json}
    return json;
  }
${equalsHashToString(type, typed)}
  /** Builds {@link ${type.name}} values. */
  public static final class Builder {
${builderFields}

    private Builder() {}

${setters}

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public ${type.name} build() {
      return new ${type.name}(this);
    }
  }
}
`;
}

function renderScalars(scalars) {
  const names = new Set(["com.convohop.server.internal.Wire"]);
  const constants = scalars.map(scalar => {
    const mapping = scalarMapping(scalar);
    if (mapping.factory.includes("List.of")) names.add("java.util.List");
    if (mapping.java.includes("Map<")) {
      names.add("java.util.Map");
      names.add("org.jspecify.annotations.Nullable");
    }
    const doc = javadoc(2, [`${code(scalar.name)}${scalar.summary ? `: ${prose(scalar.summary)}` : "."}`]);
    return `${doc}  public static final Wire.Decoder<${mapping.java}> ${mapping.decoder.slice("Scalars.".length)} =\n      ${mapping.factory};`;
  });
  return `${NOTICE}package ${PACKAGE}.model;

${imports(names)}/** Decoders for the custom scalars, built from their representations and constraints. */
public final class Scalars {
  private Scalars() {}
${constants.length ? `\n${constants.join("\n\n")}\n` : ""}}
`;
}

function packageInfo(name, summary) {
  return `${NOTICE}/** ${summary} */
@NullMarked
package ${name};

import org.jspecify.annotations.NullMarked;
`;
}

/** Per-operation facts shared by Operations, the plane APIs and the Kotlin wrappers. */
function describeOperations(ir, model) {
  const idempotency = byName(ir.idempotency);
  const credentials = byName(ir.credentials);
  const planes = byName(ir.planes);
  const styles = byName(ir.pagination);
  const constants = new Map();
  const methods = new Map();
  const unique = (seen, key, id, what) => {
    if (seen.has(key)) throw new EmitterError(`java: ${seen.get(key)} and ${id} both map to the ${what} ${key.replace(/^.*\//, "")}`);
    seen.set(key, id);
  };
  return serverOperations(ir).map(operation => {
    unique(constants, screamingSnakeCase(operation.id), operation.id, "Operations constant");
    unique(methods, `${operation.plane}/${javaIdentifier(operation.field)}`, operation.id, "method");
    const where = `java: ${operation.id}`;
    const helper = [KOTLIN_CALL_HELPER, KOTLIN_PAGE_HELPER].find(name => name === javaIdentifier(operation.field));
    if (helper) throw new EmitterError(`${where} would shadow the Kotlin ${helper} helper; rename it or extend the emitter`);
    const kind = KIND[operation.kind];
    if (!kind) throw new EmitterError(`${where} has unsupported kind ${JSON.stringify(operation.kind)}`);
    const policy = idempotency.get(operation.idempotency);
    if (!policy || !RETRY[policy.retry]) throw new EmitterError(`${where} has unsupported idempotency ${JSON.stringify(operation.idempotency)}`);
    const plane = planes.get(operation.plane);
    if (!plane) throw new EmitterError(`${where} names unknown plane ${operation.plane}`);
    const carriers = operation.auth.map(entry => credentials.get(entry.credential)).filter(credential => credential?.carrier === "context");
    if (carriers.length > 1) throw new EmitterError(`${where} accepts several context credentials`);
    let permit = null;
    if (carriers.length) {
      const contextType = requireType(model.types, plane.context.type, where);
      const field = contextType.fields.find(entry => entry.name === carriers[0].contextField);
      if (!field) throw new EmitterError(`${where}: ${plane.context.type} has no ${carriers[0].contextField} field`);
      permit = { field: field.name, parameter: javaIdentifier(field.name), ref: { ...field.type, nullable: false } };
    }
    const input = operation.input ? requireType(model.types, operation.input.type, where) : null;
    const paginator = describePaginator(styles, model, operation, input, permit, where);
    if (paginator) unique(methods, `${operation.plane}/${paginator.method}`, operation.id, "method");
    return {
      operation, plane, policy, permit, input, paginator, where, kind,
      constant: screamingSnakeCase(operation.id),
      method: javaIdentifier(operation.field),
      inputRequired: Boolean(operation.input?.required),
      requestIdOverload: operation.kind === "mutation" && policy.retry === "sameRequest",
    };
  });
}

/**
 * The pages method of a query whose pagination style takes a cursor input, or null. Pages sends the input, then the
 * input with the cursor field set to each page's nextCursor until a page is complete. Ordered styles with a decimal
 * cursor check the cursor moves in that order; other cursors must change.
 */
function describePaginator(styles, model, operation, input, permit, where) {
  const pagination = operation.pagination;
  if (!pagination) return null;
  const style = styles.get(pagination.style);
  if (!style) throw new EmitterError(`${where} names unknown pagination style ${JSON.stringify(pagination.style)}`);
  if (!style.cursorInput) return null;
  const invalid = detail => new EmitterError(`${where}: ${detail}`);
  const unsupported = detail => invalid(`${detail}; extend the emitter`);
  if (operation.kind !== "query") throw unsupported(`${style.name} pagination of a ${operation.kind}`);
  if (permit) throw unsupported(`${style.name} pagination with a context credential`);
  const order = PAGE_ORDER[style.order];
  if (!order) throw unsupported(`pagination style ${style.name} has order ${JSON.stringify(style.order)}`);
  const missing = PAGE_FIELDS.filter(name => !style.pageFields.includes(name));
  if (missing.length) throw unsupported(`pagination style ${style.name} has no ${missing.join(", ")} page field`);
  const cursorField = input?.fields.find(field => field.name === pagination.cursorField);
  if (!cursorField || cursorField.type.kind !== "scalar" || !cursorField.type.nullable) {
    throw invalid(`the cursor input ${input?.name ?? "(none)"}.${pagination.cursorField} is not an optional scalar field`);
  }
  const cursorScalar = model.named(cursorField.type, where);
  const cursor = scalarMapping(cursorScalar);
  if (cursor.java !== "String") throw unsupported(`the cursor input ${input.name}.${pagination.cursorField} is not a string scalar`);
  const result = operation.result.type;
  if (result.kind !== "object") throw invalid("the paginated result is not an object");
  if (pagination.pagePath.length > 1) throw unsupported(`pagePath ${pagination.pagePath.join(".")} is deeper than one field`);
  let page = model.named(result, where);
  let accessor = "reply -> reply";
  for (const segment of pagination.pagePath) {
    const field = page.fields.find(entry => entry.name === segment);
    if (!field || field.type.kind !== "object") throw invalid(`pagePath field ${page.name}.${segment} is not an object field`);
    const getter = `get${capitalize(segment)}`;
    accessor = result.nullable ? `reply -> reply == null ? null : reply.${getter}()` : `${page.name}::${getter}`;
    page = model.named(field.type, where);
  }
  if (page.name !== pagination.pageType) throw invalid(`pagePath reaches ${page.name}, not the page type ${pagination.pageType}`);
  const pageField = name => page.fields.find(field => field.name === name)?.type;
  const flag = ref => ref?.kind === "scalar" && ref.name === "Boolean" && !ref.nullable;
  const next = pageField("nextCursor");
  if (!flag(pageField("complete")) || !flag(pageField("refreshRequired")) || next?.kind !== "scalar"
      || scalarMapping(model.named(next, where)).java !== "String") {
    throw invalid(`${page.name} needs complete: Boolean!, refreshRequired: Boolean! and a string nextCursor`);
  }
  const decimal = cursorScalar.constraints?.maximumDecimal !== undefined;
  return {
    method: javaIdentifier(`${operation.field}Pages`),
    style,
    pageType: page.name,
    accessor,
    cursorField: pagination.cursorField,
    cursorDecoder: cursor.decoder,
    order: decimal ? order : "OPAQUE",
  };
}

function renderOperations(ir, model, described) {
  const uses = new Set();
  const constants = described.map(({ operation, policy, permit, input, constant, kind, where }) => {
    const resultType = model.javaType(operation.result.type, uses, where);
    const budget = policy.retryBudget ?? { maxAttempts: 0, windowMs: 0 };
    const lines = [
      `.plane(${javaString(operation.plane)})`,
      `.kind(OperationDescriptor.Kind.${kind})`,
      `.field(${javaString(operation.field)})`,
      `.operationName(${javaString(operation.operationName)})`,
      `.resultType(${javaString(printTypeRef(operation.result.type))})`,
      `.inputFields(List.of(${(input ? input.fields.map(field => javaString(field.name)) : []).join(", ")}))`,
      `.idempotency(${javaString(policy.name)}, OperationDescriptor.Retry.${RETRY[policy.retry]}, ${policy.resolvable}, ${budget.maxAttempts}, ${longLiteral(budget.windowMs)})`,
      ...operation.context.fields.map(field => {
        if (!USE[field.use]) throw new EmitterError(`${where}: context field ${field.name} has unsupported use ${JSON.stringify(field.use)}`);
        return `.context(${javaString(field.name)}, OperationDescriptor.Use.${USE[field.use]})`;
      }),
      ...(permit ? [`.permitField(${javaString(permit.field)})`] : []),
      `.document(\n${operation.document.text.split("\n").map((line, index, all) => `${index === 0 ? "              " : "              + "}${javaString(index < all.length - 1 ? `${line}\n` : line)}`).join("\n")})`,
    ];
    const doc = javadoc(2, [`${code(operation.id)}: ${prose(operation.summary)}`]);
    return `${doc}  public static final OperationDescriptor<${resultType}> ${constant} =
      OperationDescriptor.builder(${javaString(operation.id)}, ${model.decoder(operation.result.type, uses, where)})
${lines.map(line => `          ${line}`).join("\n")}
          .build();`;
  });
  const resolve = ir.planes.filter(plane => plane.resolveOperation && described.some(entry => entry.operation.id === plane.resolveOperation));
  const names = new Set([
    "com.convohop.server.internal.OperationCatalog", "com.convohop.server.internal.OperationDescriptor", "com.convohop.server.internal.Wire",
    "java.util.List", "java.util.Map", ...[...uses].map(name => `${PACKAGE}.model.${name}`),
  ]);
  if (constants.some(text => text.includes("@Nullable"))) names.add("org.jspecify.annotations.Nullable");
  return `${NOTICE}package ${PACKAGE}.api;

${imports(names)}/** Descriptors of the server-layer queries and mutations, and each plane's resolve operation. */
public final class Operations {
  private Operations() {}
${constants.length ? `\n${constants.join("\n\n")}\n` : ""}
  private static final OperationCatalog CATALOG = new OperationCatalog(
      List.of(${described.map(({ constant }) => constant).join(",\n          ")}),
      Map.ofEntries(${resolve.map(plane => `Map.entry(${javaString(plane.name)}, ${javaString(plane.resolveOperation)})`).join(",\n          ")}));

  /**
   * Every descriptor, keyed by operation id, with each plane's resolve operation.
   *
   * @return the catalog
   */
  public static OperationCatalog catalog() {
    return CATALOG;
  }
}
`;
}

function authorization(operation) {
  return operation.auth.map(entry => {
    const details = [
      ...(entry.scopes?.length ? [`scopes ${entry.scopes.join(", ")}`] : []),
      ...(entry.condition ? [`condition ${entry.condition}`] : []),
    ];
    return `${entry.credential}${details.length ? ` (${details.join("; ")})` : ""}`;
  }).join(", ");
}

/** The overloads of one plane API method: every parameter list, longest last. */
function overloads(entry) {
  const lists = [];
  const required = entry.permit ? [{ name: entry.permit.parameter, kind: "permit" }] : [];
  if (!entry.input) lists.push([...required]);
  else if (entry.inputRequired) lists.push([{ name: "input", kind: "input" }, ...required]);
  else {
    if (!required.length) lists.push([]);
    lists.push([{ name: "input", kind: "input", nullable: true }, ...required]);
  }
  if (entry.requestIdOverload) lists.push([...lists[lists.length - 1], { name: "requestId", kind: "requestId" }]);
  return lists;
}

/** The lazy pages method of a cursor-paginated query. */
function renderPaginator(entry, model, uses) {
  const { operation, input, paginator, where } = entry;
  const reply = model.javaType(operation.result.type, uses, where);
  const page = paginator.pageType;
  uses.add(page);
  if (paginator.cursorDecoder.startsWith("Scalars.")) uses.add("Scalars");
  const paragraphs = [
    `Every page of {@link #${entry.method}(${input.name})}, each requested when iteration reaches it. Later requests set ${code(paginator.cursorField)} to the previous page's ${code("nextCursor")}, and iteration ends after the page whose ${code("complete")} is true. Each iteration starts again from ${code("input")}, and every request has a new request ID.`,
    `Pagination: ${code(paginator.style.name)}. ${prose(paginator.style.summary)}`,
    `Iteration throws {@link com.convohop.server.ConvoHopProblem} if the authority rejects a request or a page is malformed or does not advance, and {@link IllegalStateException} if a page reports ${code("refreshRequired")}: start again from current state, not from the cursor.`,
  ];
  const tags = [
    `@param input the first page's input${entry.inputRequired ? "" : ", or {@code null} to send none"}`,
    "@return the pages, in order",
    `@throws IllegalArgumentException if the input's ${code(paginator.cursorField)} is not a valid cursor`,
    ...(operation.deprecated ? [`@deprecated ${prose(deprecationReason(operation.deprecated))}`] : []),
  ];
  const parameter = entry.inputRequired ? input.name : `@Nullable ${input.name}`;
  const value = entry.inputRequired ? "Wire.nonNull(input, \"input\").toJson()" : "input == null ? null : input.toJson()";
  return `${javadoc(2, paragraphs, tags)}${operation.deprecated ? "  @Deprecated\n" : ""}  public Iterable<${page}> ${paginator.method}(${parameter} input) {
    return Pages.<${reply}, ${page}>of(
        this.executor, Operations.${entry.constant}, ${value}, ${javaString(paginator.cursorField)}, ${paginator.cursorDecoder},
        Pages.Order.${paginator.order}, ${paginator.accessor}, ${page}::getComplete, ${page}::getRefreshRequired,
        ${page}::getNextCursor);
  }`;
}

function renderPlaneApi(plane, entries, model) {
  const uses = new Set();
  const className = `${pascalCase(plane.name)}Api`;
  const methods = entries.map(entry => {
    const { operation, policy, permit, input, where } = entry;
    const result = model.javaType(operation.result.type, uses, where);
    if (input) uses.add(input.name);
    const permitType = permit ? model.javaType(permit.ref, uses, where) : null;
    const lists = overloads(entry);
    const full = lists[lists.length - 1];
    const typeOf = parameter => {
      if (parameter.kind === "input") return parameter.nullable ? `@Nullable ${input.name}` : input.name;
      if (parameter.kind === "permit") return permitType;
      return "@Nullable String";
    };
    const describe = parameter => {
      if (parameter.kind === "input") return `@param input the operation input${parameter.nullable ? ", or {@code null} to send none" : ""}`;
      if (parameter.kind === "permit") return `@param ${parameter.name} the ${code(permit.field)} credential, passed unchanged in the request context`;
      return "@param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one";
    };
    const paragraphs = [
      prose(operation.summary),
      prose(operation.description),
      `Idempotency: ${code(policy.name)}. ${prose(policy.summary)}`,
      `Authorization: ${prose(authorization(operation))}.`,
    ];
    const deprecated = operation.deprecated ? [`@deprecated ${prose(deprecationReason(operation.deprecated))}`] : [];
    const annotation = operation.deprecated ? "  @Deprecated\n" : "";
    return lists.map(parameters => {
      const signature = parameters.map(parameter => `${typeOf(parameter)} ${parameter.name}`).join(", ");
      const tags = [...parameters.map(describe), "@return the authority result",
        "@throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown", ...deprecated];
      let body;
      if (parameters === full) {
        const inputValue = !input ? "null"
          : entry.inputRequired ? "Wire.nonNull(input, \"input\").toJson()" : "input == null ? null : input.toJson()";
        const permitValue = permit ? `Wire.nonNull(${permit.parameter}, ${javaString(permit.parameter)})` : "null";
        body = `return this.executor.execute(Operations.${entry.constant}, ${inputValue}, ${entry.requestIdOverload ? "requestId" : "null"}, ${permitValue});`;
      } else {
        const names = new Set(parameters.map(parameter => parameter.name));
        body = `return this.${entry.method}(${full.map(parameter => (names.has(parameter.name) ? parameter.name : "null")).join(", ")});`;
      }
      return `${javadoc(2, paragraphs, tags)}${annotation}  public ${result} ${entry.method}(${signature}) {\n    ${body}\n  }`;
    }).concat(entry.paginator ? [renderPaginator(entry, model, uses)] : []).join("\n\n");
  });
  const names = new Set(["com.convohop.server.internal.OperationExecutor", "com.convohop.server.internal.Wire", ...[...uses].map(name => `${PACKAGE}.model.${name}`)]);
  if (entries.some(entry => entry.paginator)) names.add("com.convohop.server.internal.Pages");
  if (methods.some(text => text.includes("@Nullable"))) names.add("org.jspecify.annotations.Nullable");
  if (methods.some(text => text.includes("List<"))) names.add("java.util.List");
  if (methods.some(text => text.includes("Map<"))) names.add("java.util.Map");
  return `${NOTICE}package ${PACKAGE}.api;

${imports(names)}${javadoc(0, [`The ${code(plane.name)} plane: ${prose(plane.summary)}`, "Obtain an instance from a client; every call blocks until the authority answers or the request fails."])}public final class ${className} {
  private final OperationExecutor executor;

  /**
   * Binds the plane to an executor. Clients create instances; applications do not call this.
   *
   * @param executor the executor that sends requests
   */
  public ${className}(OperationExecutor executor) {
    this.executor = Wire.nonNull(executor, "executor");
  }
${methods.length ? `\n${methods.join("\n\n")}\n` : ""}}
`;
}

function renderKotlinPlane(plane, entries, model) {
  const className = `${pascalCase(plane.name)}Api`;
  const wrapper = `${pascalCase(plane.name)}SuspendApi`;
  const uses = new Set();
  const collect = ref => {
    const name = namedTypeRef(ref);
    if (name.kind !== "scalar") uses.add(name.name);
  };
  const functions = entries.map(entry => {
    const { operation, permit, input, where } = entry;
    collect(operation.result.type);
    if (input) uses.add(input.name);
    const lists = overloads(entry);
    const full = lists[lists.length - 1];
    const parameters = full.map(parameter => {
      if (parameter.kind === "input") return parameter.nullable ? `input: ${input.name}? = null` : `input: ${input.name}`;
      if (parameter.kind === "permit") return `${kotlinIdentifier(parameter.name)}: ${model.kotlinType(permit.ref, where)}`;
      return "requestId: String? = null";
    });
    const deprecated = operation.deprecated ? `    @Deprecated(${kotlinString(deprecationReason(operation.deprecated))})\n    @Suppress("DEPRECATION")\n` : "";
    const call = `api.${kotlinIdentifier(entry.method)}(${full.map(parameter => kotlinIdentifier(parameter.name)).join(", ")})`;
    const suspending = `    /** Suspending [${className}.${entry.method}]. */
${deprecated}    public suspend fun ${kotlinIdentifier(entry.method)}(${parameters.join(", ")}): ${model.kotlinType(operation.result.type, where)} =
        ${KOTLIN_CALL_HELPER}(dispatcher) { ${call} }`;
    if (!entry.paginator) return suspending;
    const { method, pageType } = entry.paginator;
    uses.add(pageType);
    const parameter = entry.inputRequired ? `input: ${input.name}` : `input: ${input.name}? = null`;
    return `${suspending}

    /**
     * [${className}.${method}] as a cold flow. Each collection starts again from [input], and each page is requested
     * on [dispatcher] when the collector is ready for it.
     */
${deprecated}    public fun ${kotlinIdentifier(method)}(${parameter}): Flow<${pageType}> =
        ${KOTLIN_PAGE_HELPER}(dispatcher, api.${kotlinIdentifier(method)}(input))`;
  });
  const names = new Set([
    `${PACKAGE}.api.${className}`, "kotlinx.coroutines.CoroutineDispatcher", "kotlinx.coroutines.Dispatchers",
    ...[...uses].map(name => `${PACKAGE}.model.${name}`),
  ]);
  if (entries.some(entry => entry.paginator)) names.add("kotlinx.coroutines.flow.Flow");
  return `${NOTICE}package ${PACKAGE}.kotlin

${imports(names).replace(/;\n/g, "\n")}/**
 * Suspending view of [${className}]. Each call runs on [dispatcher]. Cancelling the calling
 * coroutine interrupts the blocking request and the call fails with a CancellationException
 * whose cause is the lost-request problem; a mutation stays in the client's recovery journal.
 */
public class ${wrapper}(
    private val api: ${className},
    private val dispatcher: CoroutineDispatcher = Dispatchers.IO,
) {
${functions.join("\n\n")}
}

/** A suspending view of this plane API whose calls run on [dispatcher]. */
public fun ${className}.suspending(dispatcher: CoroutineDispatcher = Dispatchers.IO): ${wrapper} =
    ${wrapper}(this, dispatcher)
`;
}

/** Every generated file for the IR, under the given Java and Kotlin source directories. */
export function renderJava(ir, { directory = DEFAULT_DIRECTORY, kotlinDirectory = DEFAULT_KOTLIN_DIRECTORY } = {}) {
  const model = createModel(ir);
  const javaPath = (packageName, file) => `${directory}/${PACKAGE.replace(/\./g, "/")}/${packageName}/${file}`;
  const files = [
    { path: javaPath("model", "package-info.java"), contents: packageInfo(`${PACKAGE}.model`, "Generated models of the schema's enums, result types and input types.") },
    { path: javaPath("model", "Scalars.java"), contents: renderScalars(model.scalars) },
  ];
  for (const type of model.modelTypes) {
    const contents = type.kind === "enum" ? renderEnum(type) : type.kind === "input" ? renderInput(type, model) : renderObject(type, model);
    files.push({ path: javaPath("model", `${type.name}.java`), contents });
  }
  const described = describeOperations(ir, model);
  files.push(
    { path: javaPath("api", "package-info.java"), contents: packageInfo(`${PACKAGE}.api`, "Generated operation catalog and per-plane APIs.") },
    { path: javaPath("api", "Operations.java"), contents: renderOperations(ir, model, described) },
  );
  for (const plane of ir.planes) {
    const entries = described.filter(entry => entry.operation.plane === plane.name);
    if (!entries.length) continue;
    files.push({ path: javaPath("api", `${pascalCase(plane.name)}Api.java`), contents: renderPlaneApi(plane, entries, model) });
    files.push({
      path: `${kotlinDirectory}/${PACKAGE.replace(/\./g, "/")}/kotlin/${pascalCase(plane.name)}SuspendApi.kt`,
      contents: renderKotlinPlane(plane, entries, model),
    });
  }
  return files;
}

export default defineEmitter({
  name: "java",
  description: "Java models, operation catalog and plane APIs, with Kotlin coroutine wrappers, for the JVM server SDK",
  owns: ["jvm/convohop-server/src/generated", "jvm/convohop-server-kotlin/src/generated"],
  emit(ir, options = {}) {
    return renderJava(ir, options);
  },
});
