import { defineEmitter, EmitterError } from "../lib/emitter.mjs";
import { byName, namedTypeRef, printTypeRef, requireType } from "../lib/ir-model.mjs";
import { camelCase, codeUnitCompare, pascalCase } from "../lib/naming.mjs";

/**
 * Dart models, operation specs and catalogs for the Flutter package `convohop`.
 *
 * The output is one self-contained library (dart:core only) split into parts,
 * so the runtime in flutter/lib/src imports a single file and the golden
 * output analyzes on its own. Only `client` and `both` layer operations are
 * generated, because the package is a user-session SDK, together with the
 * types they reach and the realtime envelope.
 *
 * Every object, enum and scalar the operations return gets a decoder that
 * mirrors the TypeScript response validator: every selected field must be
 * present, non-null fields must hold a value, lists hold at most 100 items,
 * enum values must be known and integers must be safe. Scalars are also
 * checked against their IR constraints, except `maxCanonicalJsonBytes`,
 * which bounds what servers accept rather than what they return. Decoders
 * throw a FormatException that names the JSON path but never the value.
 */
export const DEFAULT_DIRECTORY = "flutter/lib/src/generated";

// `dart format off` keeps `dart format lib` from rewriting generated files: the
// formatter's style changes between SDK releases, and `generate --check` needs
// the files exactly as emitted.
const HEADER = "// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.\n"
  + "// dart format off\n"
  + "// ignore_for_file: type=lint, deprecated_member_use_from_same_package\n";
const DEFAULT_DEPRECATION_REASON = "No longer supported";
const USER_LAYERS = new Set(["client", "both"]);
const KINDS = new Set(["query", "mutation", "subscription"]);
const MAX_LIST_LENGTH = 100;

/**
 * Dart reserved words, plus `await` and `yield`, which async and generator
 * bodies can't use as identifiers. Members named after one get a `Value`
 * suffix. Built-in identifiers such as `get` and contextual keywords such as
 * `on` are valid member names.
 */
export const DART_KEYWORDS = new Set([
  "assert", "await", "break", "case", "catch", "class", "const", "continue", "default", "do", "else", "enum",
  "extends", "false", "final", "finally", "for", "if", "in", "is", "new", "null", "rethrow", "return", "super",
  "switch", "this", "throw", "true", "try", "var", "void", "while", "with", "yield",
]);
const OBJECT_MEMBERS = ["hashCode", "noSuchMethod", "runtimeType", "toString"];
const FIELD_RESERVED = new Set([...DART_KEYWORDS, ...OBJECT_MEMBERS, "fromJson", "toJson"]);
const ENUM_RESERVED = new Set([...FIELD_RESERVED, "index", "name", "values", "wire"]);
const METHOD_RESERVED = new Set([...DART_KEYWORDS, ...OBJECT_MEMBERS, "execute"]);
const CONSTANT_RESERVED = new Set([...DART_KEYWORDS, ...OBJECT_MEMBERS]);

/** dart:core names and the names the generated library declares, which schema types must not shadow. */
const RESERVED_CLASSES = new Set([
  "BigInt", "Comparable", "DateTime", "Deprecated", "Duration", "Enum", "Error", "Exception", "FormatException",
  "Function", "Future", "Iterable", "Iterator", "List", "Map", "MapEntry", "Match", "Never", "Null", "Object",
  "Pattern", "Record", "RegExp", "Set", "Sink", "StackTrace", "Stream", "String", "StringBuffer", "Symbol", "Type",
  "Uri", "bool", "double", "dynamic", "int", "num", "void",
  "ErrorCodeSpec", "ErrorCodes", "IdempotencyClasses", "IdempotencySpec", "OperationKind", "OperationSpec",
  "Operations", "RealtimeChannelSpec", "RealtimeEnvelopeSpec", "RealtimeEventSpec",
]);

const SCALAR_TYPES = { string: "String", integer: "int", number: "double", boolean: "bool", object: "Map<String, Object?>" };
const SCALAR_READERS = { string: "_string", integer: "_int", number: "_double", boolean: "_bool", object: "_jsonObject" };
const SUPPORTED_CONSTRAINTS = {
  string: new Set(["pattern", "disallowed", "maximumDecimal"]),
  integer: new Set(["minimum", "maximum"]),
  number: new Set(["minimum", "maximum"]),
  boolean: new Set(),
  object: new Set(["requiredStringProperties", "maxCanonicalJsonBytes"]),
};

/** The Dart class name of a GraphQL type: PascalCase words, e.g. `HTTPMethod` becomes `HttpMethod`. */
export function dartClassName(name) {
  const result = pascalCase(name);
  if (!/^[A-Z][A-Za-z0-9]*$/.test(result)) throw new EmitterError(`dart: type ${JSON.stringify(name)} has no Dart class name`);
  return result;
}

/** The Dart member name of a GraphQL name: camelCase words, with a `Value` suffix for keywords and reserved members. */
export function dartMemberName(name, reserved = FIELD_RESERVED) {
  const result = camelCase(name);
  if (!/^[a-z][A-Za-z0-9]*$/.test(result)) throw new EmitterError(`dart: ${JSON.stringify(name)} has no Dart identifier`);
  return reserved.has(result) ? `${result}Value` : result;
}

function uniqueMembers(names, reserved, where) {
  const seen = new Map();
  return names.map(name => {
    const member = dartMemberName(name, reserved);
    if (seen.has(member)) throw new EmitterError(`dart: ${where}: ${seen.get(member)} and ${name} both become ${member}`);
    seen.set(member, name);
    return member;
  });
}

/** A single-quoted Dart string literal. */
export function dartString(text) {
  let out = "'";
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code >= 0xd800 && code <= 0xdfff) throw new EmitterError(`dart: ${JSON.stringify(text)} contains a lone surrogate`);
    if (char === "\\") out += "\\\\";
    else if (char === "'") out += "\\'";
    else if (char === "$") out += "\\$";
    else if (char === "\n") out += "\\n";
    else if (char === "\r") out += "\\r";
    else if (char === "\t") out += "\\t";
    else if (code < 0x20 || code === 0x7f) out += `\\u{${code.toString(16)}}`;
    else out += char;
  }
  return `${out}'`;
}

/** A Dart string literal of `text` that keeps backslashes readable, as regular expressions need. */
function dartRawString(text) {
  if (/[\u0000-\u001f\u007f]/.test(text)) return dartString(text);
  if (!text.includes("'")) return `r'${text}'`;
  if (!text.includes('"')) return `r"${text}"`;
  return dartString(text);
}

/** Adjacent Dart string literals, one per line of `text`, indented by `indent`. */
function dartLines(text, indent) {
  const lines = text.split("\n");
  return lines.map((line, i) => dartString(i < lines.length - 1 ? `${line}\n` : line)).join(`\n${indent}`);
}

function docComment(text, indent = "") {
  if (!text) return "";
  return `${text.split("\n").map(line => `${indent}///${line.trimEnd() ? ` ${line.trimEnd()}` : ""}`).join("\n")}\n`;
}

function deprecation(deprecated, indent = "") {
  return deprecated ? `${indent}@Deprecated(${dartString(deprecated.reason ?? DEFAULT_DEPRECATION_REASON)})\n` : "";
}

function requireNumber(value, where, integer = true) {
  if (typeof value !== "number" || !Number.isFinite(value) || (integer && !Number.isSafeInteger(value))) {
    throw new EmitterError(`dart: ${where} must be ${integer ? "a safe integer" : "a finite number"}`);
  }
  return value;
}

function requireStrings(value, where) {
  if (!Array.isArray(value) || value.some(item => typeof item !== "string")) throw new EmitterError(`dart: ${where} must be a list of strings`);
  return value;
}

const stringList = items => `<String>[${items.map(dartString).join(", ")}]`;

function createRenderer(ir) {
  const types = byName(ir.types);
  const typeOf = (name, where) => requireType(types, name, where);
  const operations = ir.operations.filter(operation => USER_LAYERS.has(operation.layer));
  const helpers = new Set(["invalid"]);

  // Types reached from user operations, split by direction. Context arguments are built by the runtime.
  const outputs = new Set();
  const inputs = new Set();
  const visitOutput = (name, where) => {
    if (outputs.has(name)) return;
    const type = typeOf(name, where);
    if (type.kind === "input") throw new EmitterError(`dart: ${where}: input ${name} cannot be an output`);
    outputs.add(name);
    if (type.kind === "object") for (const field of type.fields) visitOutput(namedTypeRef(field.type).name, `${where} ${name}.${field.name}`);
  };
  const visitInput = (name, where) => {
    if (inputs.has(name)) return;
    const type = typeOf(name, where);
    if (type.kind === "object") throw new EmitterError(`dart: ${where}: object ${name} cannot be an input`);
    inputs.add(name);
    if (type.kind === "input") for (const field of type.fields) visitInput(namedTypeRef(field.type).name, `${where} ${name}.${field.name}`);
  };
  for (const operation of operations) {
    if (!KINDS.has(operation.kind)) throw new EmitterError(`dart: ${operation.id} has unsupported kind ${JSON.stringify(operation.kind)}`);
    for (const argument of operation.arguments) {
      if (argument.role === "context") continue;
      if (argument.role !== "input") throw new EmitterError(`dart: ${operation.id} argument ${argument.name} has unsupported role ${JSON.stringify(argument.role)}`);
      visitInput(namedTypeRef(argument.type).name, operation.id);
    }
    visitOutput(namedTypeRef(operation.result.type).name, operation.id);
  }
  const { envelope } = ir.realtime;
  for (const name of [envelope.type, envelope.payloadType, envelope.subjectType]) visitOutput(name, "realtime envelope");
  const channels = ir.realtime.channels.filter(channel => operations.some(operation => operation.id === channel.subscription));
  for (const channel of channels) visitOutput(channel.pageType, `realtime channel ${channel.name}`);

  const declared = [...new Set([...outputs, ...inputs])].map(name => typeOf(name, "dart")).filter(type => type.kind !== "scalar");
  const classNames = new Map();
  const owners = new Map();
  for (const type of declared) {
    const name = dartClassName(type.name);
    if (RESERVED_CLASSES.has(name)) throw new EmitterError(`dart: type ${type.name} would shadow the Dart name ${name}`);
    if (owners.has(name)) throw new EmitterError(`dart: types ${owners.get(name)} and ${type.name} both become ${name}`);
    owners.set(name, type.name);
    classNames.set(type.name, name);
  }
  const planes = [...new Set(operations.filter(operation => operation.kind !== "subscription").map(operation => operation.plane))].sort(codeUnitCompare);
  for (const plane of planes) {
    const name = `${dartClassName(plane)}Operations`;
    if (owners.has(name) || RESERVED_CLASSES.has(name)) throw new EmitterError(`dart: the ${plane} operations class ${name} collides with another name`);
    owners.set(name, `plane ${plane}`);
  }
  const className = name => classNames.get(name);

  function scalar(name, where) {
    const type = typeOf(name, where);
    const dart = SCALAR_TYPES[type.representation];
    if (!dart) throw new EmitterError(`dart: scalar ${type.name} has unsupported representation ${JSON.stringify(type.representation)}`);
    for (const key of Object.keys(type.constraints ?? {})) {
      if (!SUPPORTED_CONSTRAINTS[type.representation].has(key)) throw new EmitterError(`dart: scalar ${type.name} has unsupported constraint ${key}`);
    }
    return { type, dart };
  }

  function dartType(ref, where) {
    let type;
    if (ref.kind === "list") type = `List<${dartType(ref.ofType, where)}>`;
    else if (ref.kind === "scalar") type = scalar(ref.name, where).dart;
    else if (ref.kind === "enum" || ref.kind === "object" || ref.kind === "input") type = className(ref.name);
    else throw new EmitterError(`dart: ${where}: unsupported type kind ${JSON.stringify(ref.kind)}`);
    return ref.nullable ? `${type}?` : type;
  }

  const scalarDecoder = name => `_scalar${dartClassName(name)}`;
  const namedDecoder = (ref, where) => {
    if (ref.kind === "scalar") {
      scalar(ref.name, where);
      return scalarDecoder(ref.name);
    }
    if (ref.kind === "enum" || ref.kind === "object") return `_decode${className(ref.name)}`;
    throw new EmitterError(`dart: ${where}: ${ref.kind} ${ref.name} cannot be decoded`);
  };

  /** A `T Function(Object?, String)` expression that decodes `ref`. */
  function decoder(ref, depth, where) {
    const v = `v${depth}`;
    const p = `p${depth}`;
    if (ref.nullable) {
      helpers.add("n");
      return `(${v}, ${p}) => ${decode(ref, v, p, depth + 1, where)}`;
    }
    if (ref.kind === "list") return `(${v}, ${p}) => ${decode(ref, v, p, depth + 1, where)}`;
    return namedDecoder(ref, where);
  }

  /** An expression that decodes `value` at `path` as `ref`. */
  function decode(ref, value, path, depth, where) {
    if (ref.nullable) {
      helpers.add("n");
      return `_n(${value}, ${path}, ${decoder({ ...ref, nullable: false }, depth, where)})`;
    }
    if (ref.kind === "list") {
      helpers.add("list");
      return `_list(${value}, ${path}, ${decoder(ref.ofType, depth, where)})`;
    }
    return `${namedDecoder(ref, where)}(${value}, ${path})`;
  }

  const isIdentity = ref => (ref.kind === "list" ? isIdentity(ref.ofType) : ref.kind === "scalar");

  /** An expression that converts the Dart value `expression` of `ref` to JSON. */
  function encode(ref, expression, depth) {
    if (isIdentity(ref)) return expression;
    const access = ref.nullable ? "?." : ".";
    if (ref.kind === "list") {
      const element = `e${depth}`;
      return `${expression}${access}map((${element}) => ${encode(ref.ofType, element, depth + 1)}).toList()`;
    }
    return ref.kind === "enum" ? `${expression}${access}wire` : `${expression}${access}toJson()`;
  }

  function renderEnum(type) {
    const name = className(type.name);
    const members = uniqueMembers(type.values.map(value => value.name), ENUM_RESERVED, `enum ${type.name}`);
    const constants = type.values.map((value, i) =>
      `${docComment(value.description, "  ")}${deprecation(value.deprecated, "  ")}  ${members[i]}(${dartString(value.name)})${i === type.values.length - 1 ? ";" : ","}`);
    return `${docComment(type.description)}enum ${name} {
${constants.join("\n")}

  const ${name}(this.wire);

  /// Decodes a GraphQL \`${type.name}\` value. Unknown values throw a [FormatException].
  factory ${name}.fromJson(Object? json) => _decode${name}(json, r'$');

  /// The GraphQL value.
  final String wire;

  /// The GraphQL value.
  String toJson() => wire;
}

${name} _decode${name}(Object? value, String path) {
  final text = _string(value, path);
  for (final member in ${name}.values) {
    if (member.wire == text) return member;
  }
  _invalid(path, 'is not a known ${type.name} value');
}
`;
  }

  function renderObject(type) {
    helpers.add("object").add("get");
    const name = className(type.name);
    const members = uniqueMembers(type.fields.map(field => field.name), FIELD_RESERVED, `type ${type.name}`);
    const where = field => `${type.name}.${field.name}`;
    const parameters = type.fields.map((field, i) => `    ${field.type.nullable ? "" : "required "}this.${members[i]},`);
    const declarations = type.fields.map((field, i) =>
      `${docComment(field.description, "  ")}${deprecation(field.deprecated, "  ")}  final ${dartType(field.type, where(field))} ${members[i]};`);
    const json = type.fields.map((field, i) => `        ${dartString(field.name)}: ${encode(field.type, members[i], 0)},`);
    const decoded = type.fields.map((field, i) =>
      `    ${members[i]}: ${decode(field.type, `_get(map, path, ${dartString(field.name)})`, `'$path.${field.name}'`, 0, where(field))},`);
    return `${docComment(type.description)}final class ${name} {
  const ${name}({
${parameters.join("\n")}
  });

  /// Decodes and validates a GraphQL \`${type.name}\`. Malformed values throw a [FormatException].
  factory ${name}.fromJson(Object? json) => _decode${name}(json, r'$');

${declarations.join("\n\n")}

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
${json.join("\n")}
      };
}

${name} _decode${name}(Object? value, String path) {
  final map = _object(value, path);
  return ${name}(
${decoded.join("\n")}
  );
}
`;
  }

  function renderInput(type) {
    const name = className(type.name);
    const members = uniqueMembers(type.fields.map(field => field.name), FIELD_RESERVED, `input ${type.name}`);
    const where = field => `${type.name}.${field.name}`;
    const optional = field => field.type.nullable || field.defaultValue !== undefined;
    const parameters = type.fields.map((field, i) => `    ${optional(field) ? "" : "required "}this.${members[i]},`);
    const declarations = type.fields.map((field, i) => {
      const fieldType = { ...field.type, nullable: optional(field) };
      const fallback = field.defaultValue === undefined ? "" : `The server uses \`${JSON.stringify(field.defaultValue)}\` when it's null.`;
      const text = [field.description, fallback].filter(Boolean).join("\n\n");
      return `${docComment(text, "  ")}${deprecation(field.deprecated, "  ")}  final ${dartType(fieldType, where(field))} ${members[i]};`;
    });
    const json = type.fields.map((field, i) => optional(field)
      ? `        if (${members[i]} case final value?) ${dartString(field.name)}: ${encode({ ...field.type, nullable: false }, "value", 0)},`
      : `        ${dartString(field.name)}: ${encode(field.type, members[i], 0)},`);
    return `${docComment(type.description)}final class ${name} {
  const ${name}(${parameters.length ? `{\n${parameters.join("\n")}\n  }` : ""});

${declarations.join("\n\n")}

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
${json.join("\n")}
      };
}
`;
  }

  function renderScalarDecoder(name) {
    const { type, dart } = scalar(name, "dart");
    const reader = SCALAR_READERS[type.representation];
    helpers.add(reader.slice(1));
    const function_ = scalarDecoder(name);
    const constraints = type.constraints ?? {};
    const declarations = [];
    const checks = [];
    if (constraints.pattern !== undefined) {
      if (typeof constraints.pattern !== "string") throw new EmitterError(`dart: scalar ${name} pattern must be a string`);
      declarations.push(`final _pattern${dartClassName(name)} = RegExp(${dartRawString(constraints.pattern)});`);
      checks.push(`if (!_pattern${dartClassName(name)}.hasMatch(value)) _invalid(path, ${dartString(`is not a valid ${name}`)});`);
    }
    if (constraints.disallowed !== undefined) {
      const values = requireStrings(constraints.disallowed, `scalar ${name} disallowed`);
      checks.push(`if (const <String>{${values.map(dartString).join(", ")}}.contains(value)) _invalid(path, ${dartString(`is a disallowed ${name}`)});`);
    }
    if (constraints.maximumDecimal !== undefined) {
      if (typeof constraints.maximumDecimal !== "string" || !/^(0|[1-9][0-9]*)$/.test(constraints.maximumDecimal)) {
        throw new EmitterError(`dart: scalar ${name} maximumDecimal must be a canonical decimal string`);
      }
      helpers.add("decimal");
      declarations.push(`final _maximum${dartClassName(name)} = BigInt.parse(${dartString(constraints.maximumDecimal)});`);
      checks.push(`if (!_decimalAtMost(value, _maximum${dartClassName(name)})) _invalid(path, ${dartString(`exceeds ${constraints.maximumDecimal}`)});`);
    }
    const integer = type.representation === "integer";
    if (constraints.minimum !== undefined) {
      const minimum = requireNumber(constraints.minimum, `scalar ${name} minimum`, integer);
      checks.push(`if (value < ${minimum}) _invalid(path, ${dartString(`is below ${minimum}`)});`);
    }
    if (constraints.maximum !== undefined) {
      const maximum = requireNumber(constraints.maximum, `scalar ${name} maximum`, integer);
      checks.push(`if (value > ${maximum}) _invalid(path, ${dartString(`is above ${maximum}`)});`);
    }
    for (const property of requireStrings(constraints.requiredStringProperties ?? [], `scalar ${name} requiredStringProperties`)) {
      checks.push(`if (value[${dartString(property)}] is! String) _invalid(path, ${dartString(`lacks the string property ${property}`)});`);
    }
    const body = checks.length === 0
      ? `${dart} ${function_}(Object? json, String path) => ${reader}(json, path);`
      : `${dart} ${function_}(Object? json, String path) {\n  final value = ${reader}(json, path);\n${checks.map(check => `  ${check}`).join("\n")}\n  return value;\n}`;
    return [...declarations, body].join("\n");
  }

  const specName = operation => {
    const name = `${camelCase(operation.plane)}${pascalCase(operation.field)}`;
    if (!/^[a-z][A-Za-z0-9]*$/.test(name) || CONSTANT_RESERVED.has(name)) throw new EmitterError(`dart: ${operation.id} has no Dart constant name`);
    return name;
  };
  const resultDecoder = operation => `_result${dartClassName(operation.plane)}${dartClassName(operation.field)}`;

  function renderOperationSpec(operation, idempotencyNames) {
    const where = operation.id;
    const inputType = operation.input?.type;
    const inputFields = inputType ? typeOf(inputType, where).fields.map(field => field.name) : [];
    const contextFields = operation.context?.fields ?? [];
    const idempotency = idempotencyNames.get(operation.idempotency);
    if (!idempotency) throw new EmitterError(`dart: ${operation.id} has unknown idempotency class ${JSON.stringify(operation.idempotency)}`);
    return `${docComment(operation.summary, "  ")}  static const ${specName(operation)} = OperationSpec<${dartType(operation.result.type, where)}>(
    id: ${dartString(operation.id)},
    plane: ${dartString(operation.plane)},
    kind: OperationKind.${operation.kind},
    field: ${dartString(operation.field)},
    operationName: ${dartString(operation.operationName)},
    document: ${dartLines(operation.document.text, "        ")},
    resultType: ${dartString(printTypeRef(operation.result.type))},
    contextArgument: ${operation.context ? dartString(operation.context.argument) : "null"},
    contextFields: <String, String>{${contextFields.map(field => `${dartString(field.name)}: ${dartString(field.use)}`).join(", ")}},
    inputArgument: ${operation.input ? dartString(operation.input.argument) : "null"},
    inputRequired: ${operation.input?.required === true},
    inputFields: ${stringList(inputFields)},
    idempotency: IdempotencyClasses.${idempotency},
    pagination: ${dartString(operation.pagination.style)},
    realtime: ${dartString(operation.realtime.mode)},
    errorCodes: ${stringList(operation.errors.codes)},
    decode: ${resultDecoder(operation)},
  );`;
  }

  function renderCatalog() {
    const idempotencyNames = new Map();
    const idempotencyMembers = uniqueMembers(ir.idempotency.map(entry => entry.name), CONSTANT_RESERVED, "idempotency classes");
    ir.idempotency.forEach((entry, i) => idempotencyNames.set(entry.name, idempotencyMembers[i]));
    const idempotency = ir.idempotency.map((entry, i) => {
      const budget = entry.retryBudget;
      return `${docComment(entry.summary, "  ")}  static const ${idempotencyMembers[i]} = IdempotencySpec(
    name: ${dartString(entry.name)},
    retry: ${dartString(entry.retry)},
    resolvable: ${entry.resolvable === true},
    maxAttempts: ${budget ? requireNumber(budget.maxAttempts, `idempotency ${entry.name} maxAttempts`) : "null"},
    windowMs: ${budget ? requireNumber(budget.windowMs, `idempotency ${entry.name} windowMs`) : "null"},
  );`;
    });
    const specs = operations.map(operation => renderOperationSpec(operation, idempotencyNames));
    const names = new Set();
    for (const operation of operations) {
      const name = specName(operation);
      if (names.has(name)) throw new EmitterError(`dart: two operations become the constant ${name}`);
      names.add(name);
    }
    const results = operations.map(operation =>
      `${dartType(operation.result.type, operation.id)} ${resultDecoder(operation)}(Object? json) => ${decode(operation.result.type, "json", "r'$'", 0, operation.id)};`);
    const codeMembers = uniqueMembers(ir.errors.codes.map(code => code.name), CONSTANT_RESERVED, "error codes");
    const codeConstants = ir.errors.codes.map((code, i) => `${docComment(code.summary, "  ")}  static const String ${codeMembers[i]} = ${dartString(code.name)};`);
    const codeSpecs = ir.errors.codes.map(code => {
      const status = code.status === undefined ? "null" : requireNumber(code.status, `error ${code.name} status`);
      return `  ${dartString(code.name)}: ErrorCodeSpec(code: ${dartString(code.name)}, summary: ${dartString(code.summary)}, origin: ${dartString(code.origin)}, status: ${status}, retryable: ${code.retryable === true}),`;
    });
    const channelSpecs = channels.map(channel => {
      const where = `realtime channel ${channel.name}`;
      const limit = key => requireNumber(channel.limits?.[key], `${where} limits.${key}`);
      const reconnect = key => requireNumber(channel.reconnect?.[key], `${where} reconnect.${key}`);
      const closeCodes = channel.reconnect?.terminalCloseCodes;
      if (!Array.isArray(closeCodes)) throw new EmitterError(`dart: ${where} reconnect.terminalCloseCodes must be a list`);
      return `  ${dartString(channel.name)}: RealtimeChannelSpec(
    name: ${dartString(channel.name)},
    subscription: ${dartString(channel.subscription)},
    replay: ${dartString(channel.replay)},
    pageType: ${dartString(channel.pageType)},
    endpointOperation: ${dartString(channel.endpoint.operation)},
    endpointField: ${dartString(channel.endpoint.resultField)},
    connectionInit: ${stringList(requireStrings(channel.connectionInit, `${where} connectionInit`))},
    maxFrameBytes: ${limit("maxFrameBytes")},
    maxPendingPages: ${limit("maxPendingPages")},
    subscribeLimit: ${limit("subscribeLimit")},
    replayLimit: ${limit("replayLimit")},
    baseDelayMs: ${reconnect("baseDelayMs")},
    maxDelayMs: ${reconnect("maxDelayMs")},
    jitterMs: ${reconnect("jitterMs")},
    terminalCloseCodes: <int>[${closeCodes.map(code => requireNumber(code, `${where} terminal close code`)).join(", ")}],
  ),`;
    });
    const events = ir.realtime.events.map(event => `  ${dartString(event.type)}: RealtimeEventSpec(
    type: ${dartString(event.type)},
    subject: ${dartString(event.subject)},
    requiredFields: ${stringList(requireStrings(event.payload.required, `event ${event.type} required`))},
    optionalFields: ${stringList(requireStrings(event.payload.optional, `event ${event.type} optional`))},
  ),`);
    return `${HEADER}part of 'generated.dart';

/// The GraphQL operation type.
enum OperationKind { query, mutation, subscription }

/// How a request may be retried.
final class IdempotencySpec {
  const IdempotencySpec({
    required this.name,
    required this.retry,
    required this.resolvable,
    required this.maxAttempts,
    required this.windowMs,
  });

  /// The idempotency class.
  final String name;

  /// \`none\`, \`repeat\` or \`sameRequest\`.
  final String retry;

  /// Whether \`resolveRequest\` can settle an unknown outcome.
  final bool resolvable;

  /// Attempts per request ID, including the first, or null without a retry budget.
  final int? maxAttempts;

  /// Milliseconds after the first attempt in which retries may start, or null without a retry budget.
  final int? windowMs;
}

/// The idempotency classes.
abstract final class IdempotencyClasses {
${idempotency.join("\n\n")}
}

/// A generated GraphQL operation: its document, request rules and result decoder.
final class OperationSpec<T> {
  const OperationSpec({
    required this.id,
    required this.plane,
    required this.kind,
    required this.field,
    required this.operationName,
    required this.document,
    required this.resultType,
    required this.contextArgument,
    required this.contextFields,
    required this.inputArgument,
    required this.inputRequired,
    required this.inputFields,
    required this.idempotency,
    required this.pagination,
    required this.realtime,
    required this.errorCodes,
    required this.decode,
  });

  /// \`<plane>.<field>\`.
  final String id;

  final String plane;

  final OperationKind kind;

  /// The root field.
  final String field;

  final String operationName;

  /// The GraphQL document.
  final String document;

  /// The result type in GraphQL syntax.
  final String resultType;

  /// The argument that carries request metadata, or null.
  final String? contextArgument;

  /// How the operation uses each context field: \`required\`, \`optional\` or \`forbidden\`.
  final Map<String, String> contextFields;

  /// The argument that carries the input, or null.
  final String? inputArgument;

  final bool inputRequired;

  final List<String> inputFields;

  final IdempotencySpec idempotency;

  /// The pagination style, such as \`none\`, \`cursor\` or \`replay\`.
  final String pagination;

  /// The realtime mode, such as \`none\` or \`subscription\`.
  final String realtime;

  /// The error codes the operation can fail with.
  final List<String> errorCodes;

  /// Decodes and validates the result. Malformed values throw a [FormatException].
  final T Function(Object? json) decode;
}

/// The operations a user session can run.
abstract final class Operations {
${specs.join("\n\n")}
}

/// [Operations] by ID.
const Map<String, OperationSpec<Object?>> operationCatalog = <String, OperationSpec<Object?>>{
${operations.map(operation => `  ${dartString(operation.id)}: Operations.${specName(operation)},`).join("\n")}
};

${results.join("\n\n")}

/// An error code and how to handle it.
final class ErrorCodeSpec {
  const ErrorCodeSpec({
    required this.code,
    required this.summary,
    required this.origin,
    required this.status,
    required this.retryable,
  });

  final String code;

  final String summary;

  /// \`sdk\`, \`server\` or \`both\`.
  final String origin;

  /// The HTTP status the server pairs with the code, or null.
  final int? status;

  /// Whether a later attempt with the same request ID may succeed.
  final bool retryable;
}

/// Error codes, for comparing with \`ConvoHopProblem.code\`.
abstract final class ErrorCodes {
${codeConstants.join("\n\n")}
}

/// Every error code, by code.
const Map<String, ErrorCodeSpec> errorCodes = <String, ErrorCodeSpec>{
${codeSpecs.join("\n")}
};

/// Where realtime events keep their type, payload and subject.
final class RealtimeEnvelopeSpec {
  const RealtimeEnvelopeSpec({
    required this.plane,
    required this.type,
    required this.discriminator,
    required this.payload,
    required this.payloadType,
    required this.subject,
    required this.subjectType,
    required this.unknownTypes,
  });

  final String plane;

  /// The event type.
  final String type;

  /// The field that holds the event type.
  final String discriminator;

  /// The field that holds the payload.
  final String payload;

  final String payloadType;

  /// The field that holds the subject reference.
  final String subject;

  final String subjectType;

  /// How to treat event types this SDK doesn't know.
  final String unknownTypes;
}

/// A realtime channel: its subscription, replay operation, limits and reconnect policy.
final class RealtimeChannelSpec {
  const RealtimeChannelSpec({
    required this.name,
    required this.subscription,
    required this.replay,
    required this.pageType,
    required this.endpointOperation,
    required this.endpointField,
    required this.connectionInit,
    required this.maxFrameBytes,
    required this.maxPendingPages,
    required this.subscribeLimit,
    required this.replayLimit,
    required this.baseDelayMs,
    required this.maxDelayMs,
    required this.jitterMs,
    required this.terminalCloseCodes,
  });

  final String name;

  /// The subscription operation ID.
  final String subscription;

  /// The operation ID that fills gaps.
  final String replay;

  final String pageType;

  /// The operation whose result holds the WebSocket URL.
  final String endpointOperation;

  final String endpointField;

  /// The \`connection_init\` payload fields.
  final List<String> connectionInit;

  final int maxFrameBytes;

  final int maxPendingPages;

  final int subscribeLimit;

  final int replayLimit;

  final int baseDelayMs;

  final int maxDelayMs;

  final int jitterMs;

  /// Close codes after which the client must not reconnect.
  final List<int> terminalCloseCodes;
}

/// A realtime event type and its payload fields.
final class RealtimeEventSpec {
  const RealtimeEventSpec({
    required this.type,
    required this.subject,
    required this.requiredFields,
    required this.optionalFields,
  });

  final String type;

  /// The kind of resource the event's subject names.
  final String subject;

  final List<String> requiredFields;

  final List<String> optionalFields;
}

/// The realtime event envelope.
const RealtimeEnvelopeSpec realtimeEnvelope = RealtimeEnvelopeSpec(
  plane: ${dartString(envelope.plane)},
  type: ${dartString(envelope.type)},
  discriminator: ${dartString(envelope.discriminator)},
  payload: ${dartString(envelope.payload)},
  payloadType: ${dartString(envelope.payloadType)},
  subject: ${dartString(envelope.subject)},
  subjectType: ${dartString(envelope.subjectType)},
  unknownTypes: ${dartString(envelope.unknownTypes)},
);

/// The realtime channels a user session can subscribe to, by name.
const Map<String, RealtimeChannelSpec> realtimeChannels = <String, RealtimeChannelSpec>{
${channelSpecs.join("\n")}
};

/// The realtime event types, by type.
const Map<String, RealtimeEventSpec> realtimeEvents = <String, RealtimeEventSpec>{
${events.join("\n")}
};
`;
  }

  function renderOperations() {
    const classes = planes.map(plane => {
      const name = `${dartClassName(plane)}Operations`;
      const members = operations.filter(operation => operation.plane === plane && operation.kind !== "subscription");
      const methodNames = uniqueMembers(members.map(operation => operation.field), METHOD_RESERVED, `plane ${plane}`);
      const methods = members.map((operation, i) => {
        const result = dartType(operation.result.type, operation.id);
        const spec = `Operations.${specName(operation)}`;
        const text = [operation.summary, operation.description !== operation.summary ? operation.description : undefined].filter(Boolean).join("\n\n");
        const head = `${docComment(text, "  ")}${deprecation(operation.deprecated, "  ")}`;
        if (!operation.input) {
          return `${head}  Future<${result}> ${methodNames[i]}({String? requestId}) =>\n      execute(${spec}, const <String, Object?>{}, requestId: requestId);`;
        }
        const input = className(operation.input.type);
        if (operation.input.required) {
          return `${head}  Future<${result}> ${methodNames[i]}(${input} input, {String? requestId}) =>\n      execute(${spec}, input.toJson(), requestId: requestId);`;
        }
        return `${head}  Future<${result}> ${methodNames[i]}({${input}? input, String? requestId}) =>\n      execute(${spec}, input?.toJson() ?? const <String, Object?>{}, requestId: requestId);`;
      });
      return `/// The \`${plane}\` operations a user session can run.
abstract class ${name} {
  const ${name}();

  /// Runs [operation] with its JSON [input] and returns the decoded result.
  /// Mutations retry with [requestId], or a new one when it's null.
  Future<T> execute<T>(OperationSpec<T> operation, Map<String, Object?> input, {String? requestId});

${methods.join("\n\n")}
}
`;
    });
    return `${HEADER}part of 'generated.dart';\n\n${classes.join("\n")}`;
  }

  function renderModels() {
    const sorted = kind => declared.filter(type => type.kind === kind).sort((a, b) => codeUnitCompare(className(a.name), className(b.name)));
    // Enums only reached from inputs still decode, so every enum works with fromJson.
    const blocks = [
      ...sorted("enum").map(renderEnum),
      ...sorted("object").map(renderObject),
      ...sorted("input").map(renderInput),
    ];
    return `${HEADER}part of 'generated.dart';\n\n${blocks.join("\n")}`;
  }

  function renderDecode() {
    const scalars = [...outputs].filter(name => typeOf(name, "dart").kind === "scalar").sort(codeUnitCompare).map(renderScalarDecoder);
    // Every enum decodes from a string.
    if (declared.some(type => type.kind === "enum")) helpers.add("string");
    const blocks = [];
    if (helpers.has("list")) blocks.push(`/// Generated lists hold at most this many items, like the TypeScript validator.\nconst int _maxListLength = ${MAX_LIST_LENGTH};`);
    if (helpers.has("int")) blocks.push("const int _maxSafeInteger = 9007199254740991;");
    blocks.push("Never _invalid(String path, String problem) =>\n    throw FormatException('Malformed GraphQL response: $path $problem');");
    if (helpers.has("object") || helpers.has("jsonObject")) blocks.push(`Map<String, Object?> _object(Object? value, String path) {
  if (value is Map<String, Object?>) return value;
  if (value is! Map<Object?, Object?>) _invalid(path, 'is not an object');
  final copy = <String, Object?>{};
  for (final MapEntry(:key, value: item) in value.entries) {
    if (key is! String) _invalid(path, 'has a key that is not a string');
    copy[key] = item;
  }
  return copy;
}`);
    if (helpers.has("get")) blocks.push(`Object? _get(Map<String, Object?> map, String path, String key) {
  if (!map.containsKey(key)) _invalid('$path.$key', 'is missing');
  return map[key];
}`);
    if (helpers.has("n")) blocks.push("T? _n<T extends Object>(Object? value, String path, T Function(Object?, String) decode) =>\n    value == null ? null : decode(value, path);");
    if (helpers.has("list")) blocks.push(`List<T> _list<T>(Object? value, String path, T Function(Object?, String) decode) {
  if (value is! List<Object?>) _invalid(path, 'is not a list');
  if (value.length > _maxListLength) _invalid(path, 'has more than $_maxListLength items');
  return List<T>.unmodifiable(<T>[for (var i = 0; i < value.length; i++) decode(value[i], '$path[$i]')]);
}`);
    if (helpers.has("string")) blocks.push("String _string(Object? value, String path) => value is String ? value : _invalid(path, 'is not a string');");
    if (helpers.has("bool")) blocks.push("bool _bool(Object? value, String path) => value is bool ? value : _invalid(path, 'is not a boolean');");
    if (helpers.has("int")) blocks.push(`int _int(Object? value, String path) {
  if (value is int && value >= -_maxSafeInteger && value <= _maxSafeInteger) return value;
  if (value is double && value.isFinite && value == value.roundToDouble() && value.abs() <= _maxSafeInteger) {
    return value.toInt();
  }
  _invalid(path, 'is not a safe integer');
}`);
    if (helpers.has("double")) blocks.push(`double _double(Object? value, String path) {
  if (value is num && value.isFinite) return value.toDouble();
  _invalid(path, 'is not a finite number');
}`);
    if (helpers.has("jsonObject")) blocks.push("Map<String, Object?> _jsonObject(Object? value, String path) =>\n    Map<String, Object?>.unmodifiable(_object(value, path));");
    if (helpers.has("decimal")) blocks.push(`final _digits = RegExp(r'^[0-9]+$');

bool _decimalAtMost(String value, BigInt maximum) => _digits.hasMatch(value) && BigInt.parse(value) <= maximum;`);
    return `${HEADER}part of 'generated.dart';\n\n${[...blocks, ...scalars].join("\n\n")}\n`;
  }

  return { renderModels, renderOperations, renderCatalog, renderDecode };
}

const LIBRARY = `${HEADER}
/// Models, operation specs and catalogs generated from \`schema/ir.json\` for
/// the operations a user session can run.
///
/// \`fromJson\` decoders validate responses like the TypeScript SDK: every
/// selected field must be present, non-null fields must hold a value, lists
/// hold at most 100 items, enum values must be known, integers must be safe
/// and scalars must meet their constraints. They throw a [FormatException]
/// that names the JSON path, never the value.
library;

part 'catalog.dart';
part 'decode.dart';
part 'models.dart';
part 'operations.dart';
`;

/** `{ path, contents }` for every generated Dart file under `directory`. */
export function renderDart(ir, directory = DEFAULT_DIRECTORY) {
  const renderer = createRenderer(ir);
  // Render the parts that register helpers before decode.dart.
  const models = renderer.renderModels();
  const operations = renderer.renderOperations();
  const catalog = renderer.renderCatalog();
  const decode = renderer.renderDecode();
  return [
    { path: `${directory}/catalog.dart`, contents: catalog },
    { path: `${directory}/decode.dart`, contents: decode },
    { path: `${directory}/generated.dart`, contents: LIBRARY },
    { path: `${directory}/models.dart`, contents: models },
    { path: `${directory}/operations.dart`, contents: operations },
  ];
}

export default defineEmitter({
  name: "dart",
  description: "Dart models, operation specs and catalogs for the Flutter package convohop",
  owns: [DEFAULT_DIRECTORY],
  emit(ir, { directory = DEFAULT_DIRECTORY } = {}) {
    return renderDart(ir, directory);
  },
});
