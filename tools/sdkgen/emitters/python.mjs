import { defineEmitter, EmitterError } from "../lib/emitter.mjs";
import { byName, namedTypeRef, printTypeRef, requireType } from "../lib/ir-model.mjs";
import { pascalCase, snakeCase } from "../lib/naming.mjs";

/**
 * Python models, operation catalog and typed operation methods for the
 * `convohop` server package in python/.
 *
 * The emitter covers every query and mutation that a server runtime can
 * authorize with a bearer credential. Client-only operations, subscriptions
 * and operations that only a context-carried permit authorizes are left out.
 *
 *   types.py       Enums as `Literal` aliases, output objects and input
 *                  objects as frozen dataclasses with wire converters.
 *   operations.py  The operation catalog, wire shapes, scalar constraints,
 *                  idempotency classes and error codes the hand-written
 *                  runtime reads, and the invoker hooks it implements.
 *   <plane>.py     `<Plane>Operations` and `Async<Plane>Operations`: one
 *                  keyword-only method per operation, plus `iter_<name>`
 *                  for cursor-paged reads.
 *
 * The output is derived from the IR alone. It does not declare `owns`
 * because Python writes __pycache__ directories next to the modules; the
 * emitter tests check for stale modules instead.
 */
export const DEFAULT_DIRECTORY = "python/src/convohop/_generated";

const NOTICE = "Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.";
// graphql-js prints `@deprecated` without a reason as this default.
const DEFAULT_DEPRECATION_REASON = "No longer supported";
const KEYWORDS = new Set([
  "False", "None", "True", "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del", "elif",
  "else", "except", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal", "not", "or",
  "pass", "raise", "return", "try", "while", "with", "yield",
]);
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SCALAR_TYPES = {
  output: { string: "str", integer: "int", number: "float", boolean: "bool", object: "dict[str, Any]" },
  input: { string: "str", integer: "int", number: "float", boolean: "bool", object: "Mapping[str, Any]" },
};
const CONSTRAINTS = {
  pattern: "pattern",
  disallowed: "disallowed",
  minimum: "minimum",
  maximum: "maximum",
  maximumDecimal: "maximum_decimal",
  maxCanonicalJsonBytes: "max_canonical_json_bytes",
  requiredStringProperties: "required_string_properties",
};
const PAGE_FIELDS = { items: "items", complete: "complete", refreshRequired: "refreshRequired", nextCursor: "nextCursor" };
const ITERABLE_STYLES = new Set(["cursor", "sequence", "replay"]);
// Names that dataclass fields and method parameters cannot take: generated members and the builtins the
// annotations in a class body use.
const RESERVED_MEMBERS = new Set(["annotations", "bool", "dict", "float", "int", "self", "str", "to_dict", "tuple"]);
/** Attributes of the hand-written clients, which subclass the generated operation classes. */
export const RUNTIME_ATTRIBUTES = new Set([
  "aclose", "actor_id", "base_url", "close", "incarnation", "initialize", "initialize_recovery", "project_id",
  "recovery_states", "retry_request", "serving_epoch",
]);
// Module-level names in the generated modules that a GraphQL type name would shadow.
const MODULE_NAMES = new Set([
  "Any", "AsyncInvoker", "AsyncIterator", "Iterator", "Literal", "Mapping", "OPERATIONS", "Sequence", "SyncInvoker",
  "TypeAlias", "annotations",
]);
const MODULE_FILES = new Set(["__init__", "operations", "types"]);

/** The operations a server runtime calls with a bearer credential, in IR order. */
export function includedOperations(ir) {
  const credentials = byName(ir.credentials);
  return ir.operations.filter(operation => operation.kind !== "subscription" && operation.layer !== "client" &&
    serverAuth(operation, credentials).length > 0);
}

function serverAuth(operation, credentials) {
  return operation.auth.filter(auth => {
    const credential = credentials.get(auth.credential);
    if (!credential) throw new EmitterError(`python: ${operation.id} references unknown credential ${JSON.stringify(auth.credential)}`);
    return credential.runtime === "server" && credential.carrier === "bearer";
  });
}

/** The Python name of a GraphQL field or argument: snake_case, with a trailing underscore after keywords. */
export function pythonName(name, where) {
  const snake = snakeCase(name);
  if (!IDENTIFIER.test(snake)) throw new EmitterError(`python: ${where}: ${JSON.stringify(name)} has no Python identifier`);
  return KEYWORDS.has(snake) ? `${snake}_` : snake;
}

/** A Python docstring literal. Backslashes, runs of quotes and a final quote are escaped. */
export function docstring(text, indent) {
  const escaped = text.replaceAll("\\", "\\\\").replace(/"(?=""|$)/g, '\\"');
  const lines = escaped.split("\n").map(line => line.trimEnd());
  while (lines.length > 1 && lines.at(-1) === "") lines.pop();
  if (lines.length === 1) return `${indent}"""${lines[0]}"""`;
  return [`${indent}"""${lines[0]}`, ...lines.slice(1).map(line => (line ? indent + line : "")), `${indent}"""`].join("\n");
}

const literal = value => JSON.stringify(value);
const oneLine = text => text.replace(/\s+/g, " ").trim();
const sentence = text => (/[.!?]$/.test(text) ? text : `${text}.`);
const code = text => `\`\`${text}\`\``;
const list = (items, joiner = "and") => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} ${joiner} ${items.at(-1)}`);
const tuple = items => (items.length === 0 ? "()" : items.length === 1 ? `(${items[0]},)` : `(${items.join(", ")})`);
const nullable = ref => ({ ...ref, nullable: true });
const nonNull = ref => ({ ...ref, nullable: false });

function deprecation(deprecated) {
  return `Deprecated: ${sentence(oneLine(deprecated.reason ?? DEFAULT_DEPRECATION_REASON))}`;
}

function createModel(ir) {
  const types = byName(ir.types);
  const credentials = byName(ir.credentials);
  const conditions = byName(ir.conditions);
  const idempotency = byName(ir.idempotency);
  const pagination = byName(ir.pagination);
  const lookup = (catalog, name, what, where) => {
    const entry = catalog.get(name);
    if (!entry) throw new EmitterError(`python: ${where} references unknown ${what} ${JSON.stringify(name)}`);
    return entry;
  };
  const typeOf = (ref, where) => requireType(types, namedTypeRef(ref).name, where);
  const operations = includedOperations(ir);
  const reachable = new Set();

  function visit(name, direction, where) {
    const type = requireType(types, name, where);
    const expected = direction === "input" ? "input" : "object";
    if (type.kind !== "scalar" && type.kind !== "enum" && type.kind !== expected) {
      throw new EmitterError(`python: ${where}: ${type.kind} ${name} cannot be an ${direction}`);
    }
    if (reachable.has(name)) return;
    reachable.add(name);
    if (type.kind === expected) for (const field of type.fields) visit(namedTypeRef(field.type).name, direction, `${where} ${name}.${field.name}`);
  }

  for (const operation of operations) {
    const where = operation.id;
    if (operation.kind !== "query" && operation.kind !== "mutation") {
      throw new EmitterError(`python: ${where} has unsupported kind ${JSON.stringify(operation.kind)}`);
    }
    const roles = operation.arguments.map(argument => argument.role);
    if (roles.filter(role => role === "context").length !== 1 || roles.filter(role => role === "input").length > 1 ||
        roles.some(role => role !== "context" && role !== "input")) {
      throw new EmitterError(`python: ${where} must take one context argument and at most one input argument`);
    }
    if (operation.input) visit(operation.input.type, "input", where);
    visit(namedTypeRef(operation.result.type).name, "output", where);
  }

  const emitted = ir.types.filter(type => reachable.has(type.name) && type.kind !== "scalar");
  const classNames = new Set(emitted.map(type => type.name));
  const planeClasses = new Map(ir.planes.map(plane => [plane.name, {
    module: pythonName(plane.name, `plane ${plane.name}`),
    sync: `${pascalCase(plane.name)}Operations`,
    async: `Async${pascalCase(plane.name)}Operations`,
  }]));
  for (const type of emitted) {
    if (!IDENTIFIER.test(type.name) || KEYWORDS.has(type.name) || MODULE_NAMES.has(type.name) ||
        [...planeClasses.values()].some(names => names.sync === type.name || names.async === type.name)) {
      throw new EmitterError(`python: type ${type.name} would shadow a Python keyword or a generated name`);
    }
  }
  for (const [plane, names] of planeClasses) {
    if (MODULE_FILES.has(names.module)) throw new EmitterError(`python: plane ${plane} would replace the generated ${names.module}.py`);
  }

  const fieldNames = new Map();
  function namesOf(type) {
    if (fieldNames.has(type.name)) return fieldNames.get(type.name);
    const names = new Map();
    const seen = new Map();
    for (const field of type.fields) {
      const where = `${type.name}.${field.name}`;
      const name = pythonName(field.name, where);
      if (RESERVED_MEMBERS.has(name) || classNames.has(name)) throw new EmitterError(`python: ${where} would shadow ${name}`);
      if (seen.has(name)) throw new EmitterError(`python: ${where} and ${type.name}.${seen.get(name)} both map to ${name}`);
      seen.set(name, field.name);
      names.set(field.name, name);
    }
    fieldNames.set(type.name, names);
    return names;
  }

  function annotation(ref, direction, where) {
    let text;
    if (ref.kind === "list") {
      const element = annotation(ref.ofType, direction, where);
      text = direction === "input" ? `Sequence[${element}]` : `tuple[${element}, ...]`;
    } else {
      const type = requireType(types, ref.name, where);
      if (type.kind === "scalar") {
        text = SCALAR_TYPES[direction][type.representation];
        if (!text) throw new EmitterError(`python: scalar ${type.name} has unsupported representation ${JSON.stringify(type.representation)}`);
      } else {
        text = type.name;
      }
    }
    return ref.nullable ? `${text} | None` : text;
  }

  // Wire value to model value. Identity conversions return `expr` unchanged so callers can avoid copies.
  function fromWire(ref, expr, depth, where) {
    let inner;
    if (ref.kind === "list") {
      const variable = `item${depth}`;
      const element = fromWire(ref.ofType, variable, depth + 1, where);
      inner = element === variable ? `tuple(${expr})` : `tuple(${element} for ${variable} in ${expr})`;
    } else {
      const type = requireType(types, ref.name, where);
      if (type.kind === "object") inner = `${type.name}._from_wire(${expr})`;
      else if (type.kind === "scalar" && type.representation === "number") inner = `float(${expr})`;
      else inner = expr;
    }
    return ref.nullable && inner !== expr ? `None if ${expr} is None else ${inner}` : inner;
  }

  // Model value to wire value. Input lists of plain values pass through so the runtime can reject non-lists.
  function toWire(ref, expr, depth, direction, where) {
    let inner;
    if (ref.kind === "list") {
      const variable = `item${depth}`;
      const element = toWire(ref.ofType, variable, depth + 1, direction, where);
      if (element !== variable) inner = `[${element} for ${variable} in ${expr}]`;
      else inner = direction === "input" ? expr : `list(${expr})`;
    } else {
      const type = requireType(types, ref.name, where);
      inner = type.kind === "object" || type.kind === "input" ? `${expr}.to_dict()` : expr;
    }
    return ref.nullable && inner !== expr ? `None if ${expr} is None else ${inner}` : inner;
  }

  function fieldDoc(field, notes = []) {
    const parts = [];
    if (field.description) parts.push(field.description);
    if (field.deprecated) parts.push(deprecation(field.deprecated));
    return [...parts, ...notes].join("\n\n");
  }

  const defaultNote = value => `Defaults to ${code(JSON.stringify(value))} on the server.`;

  function resultPlan(operation) {
    const where = operation.id;
    const ref = operation.result.type;
    const type = ref.kind === "list" ? null : typeOf(ref, where);
    const result = type?.kind === "object" ? type.fields.find(field => field.name === "result") : undefined;
    if (operation.longRunning || !result) return { returns: "value", ref, subject: type?.kind === "object" ? type : null, path: [] };
    const classic = type.fields.some(field => field.name === "operation");
    const returns = result.type.nullable && !classic ? "optional_result" : "result";
    const subject = result.type.kind === "list" ? null : typeOf(result.type, where);
    return { returns, ref: returns === "result" ? nonNull(result.type) : result.type, subject: subject?.kind === "object" ? subject : null, path: ["result"] };
  }

  function pageOf(operation) {
    const page = operation.pagination;
    if (page.style === "none") return null;
    const where = operation.id;
    const style = lookup(pagination, page.style, "pagination style", where);
    const pageType = requireType(types, page.pageType, where);
    const fields = new Map(pageType.fields.map(field => [field.name, field]));
    for (const name of style.pageFields) {
      if (!Object.hasOwn(PAGE_FIELDS, name) || !fields.has(name)) throw new EmitterError(`python: ${where}: page ${page.pageType} needs a ${name} field`);
    }
    const items = fields.get(PAGE_FIELDS.items).type;
    if (items.kind !== "list" || namedTypeRef(items).name !== page.itemType) {
      throw new EmitterError(`python: ${where}: ${page.pageType}.items must list ${page.itemType}`);
    }
    if (style.cursorInput && (!page.cursorField || !operation.input)) throw new EmitterError(`python: ${where}: ${page.style} pages need a cursor input`);
    return { ...page, items, iterable: ITERABLE_STYLES.has(page.style) && Boolean(page.cursorField) };
  }

  function echoes(inputType, subject) {
    if (!inputType || !subject) return [];
    const fields = new Map(subject.fields.map(field => [field.name, field.type]));
    return inputType.fields.filter(field => {
      const other = fields.get(field.name);
      return field.name.endsWith("Id") && field.type.kind === "scalar" && !field.type.nullable &&
        other?.kind === "scalar" && !other.nullable && other.name === field.type.name;
    }).map(field => field.name);
  }

  function parameters(operation, page) {
    const params = [];
    if (operation.input) {
      const type = requireType(types, operation.input.type, operation.id);
      const names = namesOf(type);
      for (const field of type.fields) {
        const where = `${type.name}.${field.name}`;
        const name = names.get(field.name);
        const optional = field.type.nullable || field.defaultValue !== undefined;
        const notes = field.defaultValue === undefined ? [] : [defaultNote(field.defaultValue)];
        let fallback = optional ? "None" : undefined;
        if (!optional && page && field.name === page.limitField && field.type.kind === "scalar") {
          const maximum = requireType(types, field.type.name, where).constraints?.maximum;
          if (Number.isSafeInteger(maximum)) {
            fallback = String(maximum);
            notes.push(`Defaults to ${maximum}, the largest page.`);
          }
        }
        params.push({ name, field, annotation: annotation(optional ? nullable(field.type) : field.type, "input", where), fallback, doc: fieldDoc(field, notes) });
      }
    }
    const ordered = [...params.filter(param => param.fallback === undefined), ...params.filter(param => param.fallback !== undefined)];
    if (operation.kind === "mutation") {
      if (ordered.some(param => param.name === "request_id")) throw new EmitterError(`python: ${operation.id} input would shadow request_id`);
      ordered.push({
        name: "request_id", annotation: "str | None", fallback: "None",
        doc: "Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.",
      });
    }
    return ordered;
  }

  function authLine(auth, where) {
    let line = code(auth.credential);
    if (auth.scopes) line += ` with ${auth.scopes.length === 1 ? "scope" : "all of the scopes"} ${list(auth.scopes.map(code))}`;
    if (auth.condition) line += `, when ${code(auth.condition)}: ${lookup(conditions, auth.condition, "condition", where).summary}`;
    return sentence(line);
  }

  const methodName = operation => pythonName(operation.field, operation.id);

  function operationDoc(operation, info, params, iterator) {
    const where = operation.id;
    const blocks = [];
    if (iterator) {
      blocks.push(`Iterate the ${code(PAGE_FIELDS.items)} of :meth:\`${info.method}\` across pages.`,
        `Follows ${code(PAGE_FIELDS.nextCursor)} until a page is ${code(PAGE_FIELDS.complete)}. A page that sets ${code(PAGE_FIELDS.refreshRequired)} raises ${code("RESYNC_REQUIRED")}; restart from the first page.`);
    } else {
      blocks.push(oneLine(operation.summary));
      if (operation.description) blocks.push(operation.description);
      if (operation.deprecated) blocks.push(deprecation(operation.deprecated));
      const auth = serverAuth(operation, credentials).map(entry => authLine(entry, where));
      blocks.push(auth.length === 1 ? `Authorization: ${auth[0]}` : `Authorization, any one of:\n\n${auth.map(line => `- ${line}`).join("\n")}`);
      const idempotent = lookup(idempotency, operation.idempotency, "idempotency class", where);
      blocks.push(`Idempotency: ${code(operation.idempotency)}. ${idempotent.summary}`);
      if (info.page) {
        blocks.push(`Pagination: ${code(info.page.style)}. ${lookup(pagination, info.page.style, "pagination style", where).summary}` +
          (info.page.iterable ? ` :meth:\`iter_${info.method}\` follows the cursor for you.` : ""));
      }
      if (operation.longRunning) {
        const { poll, refField } = operation.longRunning;
        const target = info.byId.get(poll);
        const pollName = target && target.plane === operation.plane ? `:meth:\`${methodName(target)}\`` : code(poll);
        blocks.push(`Long-running: returns the whole reply. Poll ${pollName} with ${code("operation_id")} set to ${code(`${pythonName(refField, where)}.operation_id`)} until the work completes.`);
      }
    }
    const args = params.filter(param => param.doc);
    if (args.length) blocks.push(`Args:\n${args.map(param => `    ${param.name}: ${oneLine(param.doc)}`).join("\n")}`);
    return blocks.join("\n\n");
  }

  return {
    types, operations, emitted, planeClasses, lookup, namesOf, annotation, fromWire, toWire, fieldDoc, defaultNote,
    resultPlan, pageOf, echoes, parameters, operationDoc, methodName, idempotency, reachable,
  };
}

function renderEnum(type) {
  const values = type.values.map(value => `    ${literal(value.name)},`).join("\n");
  const notes = type.values.filter(value => value.description || value.deprecated).map(value =>
    `- ${code(value.name)}: ${[value.description && sentence(oneLine(value.description)), value.deprecated && deprecation(value.deprecated)].filter(Boolean).join(" ")}`);
  const doc = [type.description, notes.join("\n")].filter(Boolean).join("\n\n");
  return `${type.name}: TypeAlias = Literal[\n${values}\n]\n${doc ? `${docstring(doc, "")}\n` : ""}`;
}

const DATACLASS = "@_dc.dataclass(frozen=True, slots=True, kw_only=True)";

function renderObject(model, type) {
  const names = model.namesOf(type);
  const lines = [DATACLASS, `class ${type.name}:`];
  if (type.description) lines.push(docstring(type.description, "    "), "");
  for (const field of type.fields) {
    const where = `${type.name}.${field.name}`;
    lines.push(`    ${names.get(field.name)}: ${model.annotation(field.type, "output", where)}`);
    const doc = model.fieldDoc(field);
    if (doc) lines.push(docstring(doc, "    "));
  }
  lines.push("", "    @classmethod", `    def _from_wire(cls, data: Mapping[str, Any]) -> ${type.name}:`, "        return cls(");
  for (const field of type.fields) {
    lines.push(`            ${names.get(field.name)}=${model.fromWire(field.type, `data[${literal(field.name)}]`, 1, `${type.name}.${field.name}`)},`);
  }
  lines.push("        )", "", "    def to_dict(self) -> dict[str, Any]:", '        """The wire form, keyed by GraphQL field name."""', "        return {");
  for (const field of type.fields) {
    lines.push(`            ${literal(field.name)}: ${model.toWire(field.type, `self.${names.get(field.name)}`, 1, "output", `${type.name}.${field.name}`)},`);
  }
  lines.push("        }");
  return `${lines.join("\n")}\n`;
}

function renderInput(model, type) {
  const names = model.namesOf(type);
  const lines = [DATACLASS, `class ${type.name}:`];
  if (type.description) lines.push(docstring(type.description, "    "), "");
  const optional = field => field.type.nullable || field.defaultValue !== undefined;
  for (const field of type.fields) {
    const where = `${type.name}.${field.name}`;
    const ref = optional(field) ? nullable(field.type) : field.type;
    lines.push(`    ${names.get(field.name)}: ${model.annotation(ref, "input", where)}${optional(field) ? " = None" : ""}`);
    const doc = model.fieldDoc(field, field.defaultValue === undefined ? [] : [model.defaultNote(field.defaultValue)]);
    if (doc) lines.push(docstring(doc, "    "));
  }
  const wire = field => model.toWire(nonNull(field.type), `self.${names.get(field.name)}`, 1, "input", `${type.name}.${field.name}`);
  const required = type.fields.filter(field => !optional(field));
  lines.push("", "    def to_dict(self) -> dict[str, Any]:", '        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""');
  if (required.length) lines.push("        data: dict[str, Any] = {", ...required.map(field => `            ${literal(field.name)}: ${wire(field)},`), "        }");
  else lines.push("        data: dict[str, Any] = {}");
  for (const field of type.fields.filter(optional)) {
    lines.push(`        if self.${names.get(field.name)} is not None:`, `            data[${literal(field.name)}] = ${wire(field)}`);
  }
  lines.push("        return data");
  return `${lines.join("\n")}\n`;
}

function exportList(names) {
  return `__all__ = [\n${names.map(name => `    ${literal(name)},`).join("\n")}\n]`;
}

// A module: its docstring, one blank line, the imports, then top-level blocks two blank lines apart.
function pythonModule(doc, imports, blocks) {
  const trim = text => text.replace(/\n+$/, "");
  return `${docstring(doc, "")}\n\n${[imports, ...blocks].map(trim).join("\n\n\n")}\n`;
}

/** The contents of types.py. */
export function renderPythonTypes(ir) {
  const model = createModel(ir);
  const kinds = new Set(model.emitted.map(type => type.kind));
  const inputLists = model.emitted.some(type => type.kind === "input" && type.fields.some(field => field.type.kind === "list"));
  const inputObjects = model.emitted.some(type => type.kind === "input" && type.fields.some(field => {
    const named = model.types.get(namedTypeRef(field.type).name);
    return named.kind === "scalar" && named.representation === "object";
  }));
  const abc = [...(kinds.has("object") || inputObjects ? ["Mapping"] : []), ...(inputLists ? ["Sequence"] : [])];
  const typing = [...(kinds.has("object") || kinds.has("input") ? ["Any"] : []), ...(kinds.has("enum") ? ["Literal", "TypeAlias"] : [])];
  const imports = ["from __future__ import annotations", ""];
  if (kinds.has("object") || kinds.has("input")) imports.push("import dataclasses as _dc");
  if (abc.length) imports.push(`from collections.abc import ${abc.join(", ")}`);
  if (typing.length) imports.push(`from typing import ${typing.join(", ")}`);
  const blocks = model.emitted.map(type => {
    if (type.kind === "enum") return renderEnum(type);
    return type.kind === "object" ? renderObject(model, type) : renderInput(model, type);
  });
  const doc = `${NOTICE}\n\nModels for the operations the server SDK calls. Enums are string literals. Output objects are frozen\ndataclasses built from validated responses. Input objects are frozen dataclasses; fields left as None are omitted.`;
  return pythonModule(doc, imports.join("\n"), [exportList(model.emitted.map(type => type.name)), ...blocks]);
}

function pyValue(value, indent = "") {
  if (Array.isArray(value)) return tuple(value.map(item => pyValue(item, indent)));
  if (value === null) return "None";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new EmitterError(`python: cannot print ${value}`);
    return String(value);
  }
  if (typeof value === "string") return literal(value);
  throw new EmitterError(`python: cannot print ${JSON.stringify(value)}`);
}

function documentLiteral(text, indent) {
  const lines = text.split("\n");
  return `(\n${lines.map((line, index) => `${indent}    ${literal(index < lines.length - 1 ? `${line}\n` : line)}`).join("\n")}\n${indent})`;
}

function operationEntry(model, operation) {
  const where = operation.id;
  const plan = model.resultPlan(operation);
  const page = model.pageOf(operation);
  const input = operation.input ? model.types.get(operation.input.type) : null;
  const items = page ? model.types.get(page.itemType) : null;
  const pagination = page
    ? `PaginationSpec(style=${literal(page.style)}, page_path=${tuple(page.pagePath.map(literal))}, page_type=${literal(page.pageType)}, ` +
      `item_type=${literal(page.itemType)}, limit_field=${page.limitField ? literal(page.limitField) : "None"}, ` +
      `cursor_field=${page.cursorField ? literal(page.cursorField) : "None"})`
    : "None";
  const context = operation.context.fields.map(field => `${literal(field.name)}: ${literal(field.use)}`).join(", ");
  model.lookup(model.idempotency, operation.idempotency, "idempotency class", where);
  const fields = [
    ["id", literal(operation.id)],
    ["plane", literal(operation.plane)],
    ["kind", literal(operation.kind)],
    ["field", literal(operation.field)],
    ["operation_name", literal(operation.operationName)],
    ["document", documentLiteral(operation.document.text, "        ")],
    ["input_type", input ? literal(input.name) : "None"],
    ["result_type", literal(printTypeRef(operation.result.type))],
    ["returns", literal(plan.returns)],
    ["idempotency", literal(operation.idempotency)],
    ["context", `{${context}}`],
    ["echo_path", tuple(plan.path.map(literal))],
    ["echo", tuple(model.echoes(input, plan.subject).map(literal))],
    ["item_echo", tuple(model.echoes(input, items?.kind === "object" ? items : null).map(literal))],
    ["pagination", pagination],
    ["long_running", operation.longRunning ? literal(operation.longRunning.poll) : "None"],
    ["errors", tuple(operation.errors.codes.map(literal))],
  ];
  return `    ${literal(operation.id)}: OperationSpec(\n${fields.map(([name, value]) => `        ${name}=${value},`).join("\n")}\n    ),`;
}

function scalarEntry(type) {
  const args = [`representation=${literal(type.representation)}`];
  for (const [key, value] of Object.entries(type.constraints ?? {})) {
    if (!Object.hasOwn(CONSTRAINTS, key)) throw new EmitterError(`python: scalar ${type.name} has unsupported constraint ${JSON.stringify(key)}`);
    args.push(`${CONSTRAINTS[key]}=${pyValue(value)}`);
  }
  return `    ${literal(type.name)}: ScalarSpec(${args.join(", ")}),`;
}

const OPERATIONS_PRELUDE = `@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class PaginationSpec:
    """How an operation pages: the page location in its result, the item type and the cursor input."""

    style: str
    page_path: tuple[str, ...]
    page_type: str
    item_type: str
    limit_field: str | None
    cursor_field: str | None


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class OperationSpec:
    """One GraphQL operation, as the runtime sends and checks it."""

    id: str
    plane: str
    kind: Literal["query", "mutation"]
    field: str
    operation_name: str
    document: str
    input_type: str | None
    result_type: str
    returns: Literal["value", "result", "optional_result"]
    """\`\`value\`\` returns the field; \`\`result\`\` and \`\`optional_result\`\` return its \`\`result\`\`, which only the latter may omit."""
    idempotency: str
    context: Mapping[str, str]
    """How the operation uses each request context field: required, optional or forbidden."""
    echo_path: tuple[str, ...]
    echo: tuple[str, ...]
    """Input identifiers the object at \`\`echo_path\`\` must repeat."""
    item_echo: tuple[str, ...]
    """Input identifiers every page item must repeat."""
    pagination: PaginationSpec | None
    long_running: str | None
    """The operation to poll when the work completes later."""
    errors: tuple[str, ...]


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ScalarSpec:
    """A scalar's JSON representation and constraints."""

    representation: Literal["string", "integer", "number", "boolean", "object"]
    pattern: str | None = None
    disallowed: tuple[str, ...] = ()
    minimum: float | None = None
    maximum: float | None = None
    maximum_decimal: str | None = None
    max_canonical_json_bytes: int | None = None
    required_string_properties: tuple[str, ...] = ()


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class IdempotencySpec:
    """An idempotency class and its retry budget."""

    retry: str
    resolvable: bool
    max_attempts: int | None
    window_ms: int | None


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ErrorSpec:
    """An error code from the authority or the SDKs."""

    summary: str
    origin: str
    status: int | None
    retryable: bool


class SyncInvoker:
    """Hooks the generated synchronous operations call. The client implements them."""

    __slots__ = ()

    def _invoke(self, operation: OperationSpec, payload: Mapping[str, Any] | None, request_id: str | None) -> Any:
        raise NotImplementedError

    def _pages(self, operation: OperationSpec, payload: Mapping[str, Any]) -> Iterator[Any]:
        raise NotImplementedError


class AsyncInvoker:
    """Hooks the generated asynchronous operations call. The client implements them."""

    __slots__ = ()

    async def _invoke(self, operation: OperationSpec, payload: Mapping[str, Any] | None, request_id: str | None) -> Any:
        raise NotImplementedError

    def _pages(self, operation: OperationSpec, payload: Mapping[str, Any]) -> AsyncIterator[Any]:
        raise NotImplementedError
`;

/** The contents of operations.py. */
export function renderPythonOperations(ir) {
  const model = createModel(ir);
  const included = new Set(model.operations.map(operation => operation.id));
  const objects = model.emitted.filter(type => type.kind === "object").map(type =>
    `    ${literal(type.name)}: {\n${type.fields.map(field => `        ${literal(field.name)}: ${literal(printTypeRef(field.type))},`).join("\n")}\n    },`);
  const enums = model.emitted.filter(type => type.kind === "enum").map(type => `    ${literal(type.name)}: ${tuple(type.values.map(value => literal(value.name)))},`);
  const inputs = model.emitted.filter(type => type.kind === "input").map(type =>
    `    ${literal(type.name)}: {\n${type.fields.map(field => `        ${literal(field.name)}: (${literal(printTypeRef(field.type))}, ${field.defaultValue === undefined ? "False" : "True"}),`).join("\n")}\n    },`);
  const scalars = ir.types.filter(type => type.kind === "scalar" && model.reachable.has(type.name)).map(scalarEntry);
  const idempotency = ir.idempotency.map(entry =>
    `    ${literal(entry.name)}: IdempotencySpec(retry=${literal(entry.retry)}, resolvable=${entry.resolvable ? "True" : "False"}, ` +
    `max_attempts=${entry.retryBudget ? entry.retryBudget.maxAttempts : "None"}, window_ms=${entry.retryBudget ? entry.retryBudget.windowMs : "None"}),`);
  const planes = ir.planes.map(plane => `    ${literal(plane.name)}: ${plane.resolveOperation && included.has(plane.resolveOperation) ? literal(plane.resolveOperation) : "None"},`);
  const errors = ir.errors.codes.map(entry =>
    `    ${literal(entry.name)}: ErrorSpec(summary=${literal(entry.summary)}, origin=${literal(entry.origin)}, ` +
    `status=${entry.status === undefined ? "None" : entry.status}, retryable=${entry.retryable ? "True" : "False"}),`);
  const mapping = (name, annotation, entries, doc) => `${name}: ${annotation} = {\n${entries.join("\n")}\n}\n${docstring(doc, "")}`;
  const names = ["AsyncInvoker", "ENUMS", "ERRORS", "IDEMPOTENCY", "INPUTS", "OBJECTS", "OPERATIONS", "PLANES", "SCALARS", "ErrorSpec",
    "IdempotencySpec", "OperationSpec", "PaginationSpec", "ScalarSpec", "SyncInvoker"];
  return pythonModule(`${NOTICE}\n\nThe operation catalog and wire shapes the runtime reads, and the hooks it implements.`,
    "from __future__ import annotations\n\nimport dataclasses as _dc\nfrom collections.abc import AsyncIterator, Iterator, Mapping\nfrom typing import Any, Literal", [
    exportList(names),
    OPERATIONS_PRELUDE,
    mapping("OPERATIONS", "Mapping[str, OperationSpec]", model.operations.map(operation => operationEntry(model, operation)), "Operations a server runtime calls with a bearer credential, by IR id."),
    mapping("OBJECTS", "Mapping[str, Mapping[str, str]]", objects, "Output object fields and their GraphQL types."),
    mapping("ENUMS", "Mapping[str, tuple[str, ...]]", enums, "Enum values in schema order."),
    mapping("INPUTS", "Mapping[str, Mapping[str, tuple[str, bool]]]", inputs, "Input object fields: their GraphQL type and whether the server has a default."),
    mapping("SCALARS", "Mapping[str, ScalarSpec]", scalars, "Scalars the operations use."),
    mapping("IDEMPOTENCY", "Mapping[str, IdempotencySpec]", idempotency, "Idempotency classes."),
    mapping("PLANES", "Mapping[str, str | None]", planes, "The operation that resolves an unknown mutation outcome, per plane."),
    mapping("ERRORS", "Mapping[str, ErrorSpec]", errors, "Error codes."),
  ]);
}

function renderMethod(model, operation, info, { isAsync, iterator }) {
  const where = operation.id;
  const params = model.parameters(operation, info.page);
  const name = iterator ? `iter_${info.method}` : info.method;
  const plan = model.resultPlan(operation);
  const itemsRef = info.page?.items.ofType;
  const returns = iterator
    ? `${isAsync ? "AsyncIterator" : "Iterator"}[${model.annotation(itemsRef, "output", where)}]`
    : model.annotation(plan.ref, "output", where);
  const signature = params.length === 0
    ? `    ${isAsync ? "async " : ""}def ${name}(self) -> ${returns}:`
    : [`    ${isAsync ? "async " : ""}def ${name}(`, "        self,", "        *,",
        ...params.map(param => `        ${param.name}: ${param.annotation}${param.fallback === undefined ? "" : ` = ${param.fallback}`},`),
        `    ) -> ${returns}:`].join("\n");
  const body = [];
  if (operation.input) {
    const inputType = operation.input.type;
    const fields = params.filter(param => param.field);
    body.push(fields.length ? [`_input = ${inputType}(`, ...fields.map(param => `    ${param.name}=${param.name},`), ").to_dict()"].join("\n        ") : `_input = ${inputType}().to_dict()`);
  }
  const op = `OPERATIONS[${literal(operation.id)}]`;
  const payload = operation.input ? "_input" : "None";
  if (iterator) {
    const loop = isAsync ? "async for" : "for";
    body.push(`${loop} _page in self._pages(${op}, ${payload}):`, `    for _item in _page[${literal(PAGE_FIELDS.items)}]:`,
      `        yield ${model.fromWire(itemsRef, "_item", 1, where)}`);
  } else {
    const call = `${isAsync ? "await " : ""}self._invoke(${op}, ${payload}, ${operation.kind === "mutation" ? "request_id" : "None"})`;
    let source = call;
    if (plan.returns !== "value") {
      body.push(`_envelope: dict[str, Any] = ${call}`);
      source = '_envelope["result"]';
    }
    const converted = model.fromWire(plan.ref, "_value", 1, where);
    if (converted === "_value") body.push(`_value: ${returns} = ${source}`, "return _value");
    else if (!plan.ref.nullable && source !== call) body.push(`return ${model.fromWire(plan.ref, source, 1, where)}`);
    else if (!plan.ref.nullable) body.push(`return ${model.fromWire(plan.ref, call, 1, where)}`);
    else body.push(`_value = ${source}`, `return ${converted}`);
  }
  const doc = model.operationDoc(operation, info, params, iterator);
  const lines = body.map(line => `        ${line}`).join("\n");
  return { text: `${signature}\n${docstring(doc, "        ")}\n${lines}\n`, code: `${signature}\n${lines}` };
}

/** The contents of `<plane>.py`, or null when no operation of the plane is included. */
export function renderPythonPlane(ir, planeName) {
  const model = createModel(ir);
  const plane = ir.planes.find(entry => entry.name === planeName);
  if (!plane) throw new EmitterError(`python: unknown plane ${JSON.stringify(planeName)}`);
  const operations = model.operations.filter(operation => operation.plane === planeName);
  if (operations.length === 0) return null;
  const names = model.planeClasses.get(planeName);
  const byId = new Map(model.operations.map(operation => [operation.id, operation]));
  const methods = new Map();
  const infos = operations.map(operation => {
    const method = model.methodName(operation);
    const page = model.pageOf(operation);
    const info = { method, page, byId };
    for (const name of [method, ...(page?.iterable ? [`iter_${method}`] : [])]) {
      if (RUNTIME_ATTRIBUTES.has(name)) throw new EmitterError(`python: ${operation.id} would shadow the client attribute ${name}`);
      if (methods.has(name)) throw new EmitterError(`python: ${operation.id} and ${methods.get(name)} both map to ${name}`);
      methods.set(name, operation.id);
    }
    return { operation, info };
  });
  const render = isAsync => infos.flatMap(({ operation, info }) => [
    renderMethod(model, operation, info, { isAsync, iterator: false }),
    ...(info.page?.iterable ? [renderMethod(model, operation, info, { isAsync, iterator: true })] : []),
  ]);
  const sync = render(false);
  const asyncMethods = render(true);
  // Imports follow the names the signatures and bodies use; docstrings may mention any name.
  const used = new Set([...sync, ...asyncMethods].flatMap(method => method.code.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []));
  const typeNames = model.emitted.map(type => type.name).filter(name => used.has(name));
  const abc = ["AsyncIterator", "Iterator", "Mapping", "Sequence"].filter(name => used.has(name));
  const imports = ["from __future__ import annotations", ""];
  if (abc.length) imports.push(`from collections.abc import ${abc.join(", ")}`);
  if (used.has("Any")) imports.push("from typing import Any");
  if (abc.length || used.has("Any")) imports.push("");
  imports.push("from .operations import OPERATIONS, AsyncInvoker, SyncInvoker");
  if (typeNames.length) imports.push(`from .types import (\n${typeNames.map(name => `    ${name},`).join("\n")}\n)`);
  const summary = plane.summary ? ` ${oneLine(plane.summary)}` : "";
  const classBlock = (className, base, kind, methods) =>
    `class ${className}(${base}):\n${docstring(`${kind} ${code(planeName)} operations.${summary}`, "    ")}\n\n    __slots__ = ()\n\n${methods.map(method => method.text).join("\n")}`;
  return pythonModule(`${NOTICE}\n\nTyped ${code(planeName)} operations.${summary}`, imports.join("\n"), [
    exportList([names.async, names.sync]),
    classBlock(names.sync, "SyncInvoker", "Synchronous", sync),
    classBlock(names.async, "AsyncInvoker", "Asynchronous", asyncMethods),
  ]);
}

export default defineEmitter({
  name: "python",
  description: "Python models, operation catalog and typed operations for the convohop server package",
  emit(ir, { directory = DEFAULT_DIRECTORY } = {}) {
    const planes = ir.planes.map(plane => ({ plane, contents: renderPythonPlane(ir, plane.name) })).filter(entry => entry.contents);
    const model = createModel(ir);
    return [
      { path: `${directory}/__init__.py`, contents: `${docstring(`${NOTICE}\n\nDo not edit. tools/sdkgen/emitters/python.mjs writes this package.`, "")}\n` },
      { path: `${directory}/operations.py`, contents: renderPythonOperations(ir) },
      { path: `${directory}/types.py`, contents: renderPythonTypes(ir) },
      ...planes.map(({ plane, contents }) => ({ path: `${directory}/${model.planeClasses.get(plane.name).module}.py`, contents })),
    ];
  },
});
