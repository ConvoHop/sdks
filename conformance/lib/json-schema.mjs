// Dependency-free validator for the JSON Schema 2020-12 subset used by spec/conformance.
// Unsupported keywords are rejected when a schema is compiled so a schema can never be
// silently weaker than it reads.

const ANNOTATIONS = new Set(["$schema", "$id", "$comment", "title", "description", "examples", "default", "deprecated",
  "readOnly", "writeOnly"]);
const KEYWORDS = new Set(["$defs", "$ref", "type", "enum", "const", "properties", "patternProperties",
  "additionalProperties", "required", "propertyNames", "minProperties", "maxProperties", "items", "minItems", "maxItems",
  "uniqueItems", "minLength", "maxLength", "pattern", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum",
  "oneOf", "anyOf", "allOf", "not", "if", "then", "else"]);
const TYPES = new Set(["object", "array", "string", "number", "integer", "boolean", "null"]);

export class SchemaError extends Error {
  constructor(message) { super(message); this.name = "SchemaError"; }
}

const isObject = value => typeof value === "object" && value !== null && !Array.isArray(value);
const pointer = (path, key) => `${path}/${String(key).replaceAll("~", "~0").replaceAll("/", "~1")}`;
const show = value => { const text = JSON.stringify(value); return text.length > 80 ? `${text.slice(0, 77)}...` : text; };

export function deepEqual(left, right) {
  if (left === right) return true;
  if (Array.isArray(left)) return Array.isArray(right) && left.length === right.length &&
    left.every((item, index) => deepEqual(item, right[index]));
  if (!isObject(left) || !isObject(right)) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length &&
    keys.every(key => Object.hasOwn(right, key) && deepEqual(left[key], right[key]));
}

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  return typeof value;
}

const hasType = (value, type) => type === "number" ? typeof value === "number" && Number.isFinite(value)
  : typeOf(value) === type;

// Walks every subschema once so unsupported keywords fail at compile time, not when a branch is first taken.
function check(schema, path, root) {
  if (typeof schema === "boolean") return;
  if (!isObject(schema)) throw new SchemaError(`${path || "/"} is not a schema`);
  for (const [keyword, value] of Object.entries(schema)) {
    const at = pointer(path, keyword);
    if (ANNOTATIONS.has(keyword)) continue;
    if (!KEYWORDS.has(keyword)) throw new SchemaError(`Unsupported JSON Schema keyword ${keyword} at ${at}`);
    switch (keyword) {
      case "$defs": case "properties": case "patternProperties":
        if (!isObject(value)) throw new SchemaError(`${at} must be an object`);
        for (const [name, child] of Object.entries(value)) {
          if (keyword === "patternProperties") new RegExp(name, "u");
          check(child, pointer(at, name), root);
        }
        break;
      case "$ref": resolve(root, value); break;
      case "type": {
        const types = Array.isArray(value) ? value : [value];
        if (!types.length || !types.every(type => TYPES.has(type))) throw new SchemaError(`${at} names an unknown type`);
        break;
      }
      case "enum": if (!Array.isArray(value) || !value.length) throw new SchemaError(`${at} must be a non-empty array`); break;
      case "required":
        if (!Array.isArray(value) || !value.every(name => typeof name === "string")) throw new SchemaError(`${at} must list names`);
        break;
      case "pattern": new RegExp(value, "u"); break;
      case "additionalProperties": case "propertyNames": case "items": case "not": case "if": case "then": case "else":
        check(value, at, root); break;
      case "oneOf": case "anyOf": case "allOf":
        if (!Array.isArray(value) || !value.length) throw new SchemaError(`${at} must be a non-empty array`);
        value.forEach((child, index) => check(child, pointer(at, index), root));
        break;
      case "minProperties": case "maxProperties": case "minItems": case "maxItems": case "minLength": case "maxLength":
        if (!Number.isSafeInteger(value) || value < 0) throw new SchemaError(`${at} must be a non-negative integer`);
        break;
      case "minimum": case "maximum": case "exclusiveMinimum": case "exclusiveMaximum":
        if (typeof value !== "number") throw new SchemaError(`${at} must be a number`);
        break;
      case "uniqueItems": if (typeof value !== "boolean") throw new SchemaError(`${at} must be a boolean`); break;
      default: break;
    }
  }
}

function resolve(root, reference) {
  if (reference === "#") return root;
  const name = typeof reference === "string" ? /^#\/\$defs\/([^/]+)$/.exec(reference)?.[1] : undefined;
  const target = name === undefined ? undefined : root.$defs?.[name.replaceAll("~1", "/").replaceAll("~0", "~")];
  if (target === undefined) throw new SchemaError(`Unresolvable $ref ${show(reference)}; only #/$defs/<name> is supported`);
  return target;
}

const regexCache = new Map();
const regex = source => {
  let compiled = regexCache.get(source);
  if (!compiled) { compiled = new RegExp(source, "u"); regexCache.set(source, compiled); }
  return compiled;
};

function evaluate(schema, value, path, root, errors) {
  if (schema === true) return;
  if (schema === false) { errors.push({ path, message: "is not allowed" }); return; }
  const start = errors.length;
  const fail = message => errors.push({ path, message });
  if (schema.$ref !== undefined) evaluate(resolve(root, schema.$ref), value, path, root, errors);
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some(type => hasType(value, type))) { fail(`must be ${types.join(" or ")}`); return; }
  }
  if (schema.const !== undefined && !deepEqual(value, schema.const)) fail(`must equal ${show(schema.const)}`);
  if (schema.enum !== undefined && !schema.enum.some(option => deepEqual(value, option)))
    fail(`must be one of ${schema.enum.map(show).join(", ")}`);
  if (typeof value === "string") {
    const length = [...value].length;
    if (schema.minLength !== undefined && length < schema.minLength) fail(`must have at least ${schema.minLength} characters`);
    if (schema.maxLength !== undefined && length > schema.maxLength) fail(`must have at most ${schema.maxLength} characters`);
    if (schema.pattern !== undefined && !regex(schema.pattern).test(value)) fail(`must match ${schema.pattern}`);
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) fail(`must be >= ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) fail(`must be <= ${schema.maximum}`);
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) fail(`must be > ${schema.exclusiveMinimum}`);
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) fail(`must be < ${schema.exclusiveMaximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) fail(`must have at least ${schema.minItems} items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) fail(`must have at most ${schema.maxItems} items`);
    if (schema.uniqueItems && value.some((item, index) => value.findIndex(other => deepEqual(item, other)) !== index))
      fail("must not contain duplicate items");
    if (schema.items !== undefined)
      value.forEach((item, index) => evaluate(schema.items, item, pointer(path, index), root, errors));
  }
  if (isObject(value)) {
    const keys = Object.keys(value);
    if (schema.minProperties !== undefined && keys.length < schema.minProperties)
      fail(`must have at least ${schema.minProperties} properties`);
    if (schema.maxProperties !== undefined && keys.length > schema.maxProperties)
      fail(`must have at most ${schema.maxProperties} properties`);
    for (const name of schema.required ?? []) if (!Object.hasOwn(value, name)) fail(`must have property ${show(name)}`);
    for (const key of keys) {
      const at = pointer(path, key);
      let known = false;
      if (schema.properties && Object.hasOwn(schema.properties, key)) {
        known = true;
        evaluate(schema.properties[key], value[key], at, root, errors);
      }
      for (const [source, child] of Object.entries(schema.patternProperties ?? {})) {
        if (!regex(source).test(key)) continue;
        known = true;
        evaluate(child, value[key], at, root, errors);
      }
      if (schema.propertyNames !== undefined) {
        const nameErrors = [];
        evaluate(schema.propertyNames, key, at, root, nameErrors);
        if (nameErrors.length) errors.push({ path: at, message: `has an invalid property name (${nameErrors[0].message})` });
      }
      if (!known && schema.additionalProperties !== undefined) {
        if (schema.additionalProperties === false) errors.push({ path: at, message: "is not an allowed property" });
        else evaluate(schema.additionalProperties, value[key], at, root, errors);
      }
    }
  }
  for (const child of schema.allOf ?? []) evaluate(child, value, path, root, errors);
  if (schema.anyOf !== undefined) {
    const attempts = schema.anyOf.map(child => collect(child, value, path, root));
    if (!attempts.some(attempt => !attempt.length)) fail(`must match at least one alternative (${closest(attempts)})`);
  }
  if (schema.oneOf !== undefined) {
    const attempts = schema.oneOf.map(child => collect(child, value, path, root));
    const passed = attempts.filter(attempt => !attempt.length).length;
    if (passed === 0) fail(`must match exactly one alternative (${closest(attempts)})`);
    else if (passed > 1) fail("must match exactly one alternative but matched several");
  }
  if (schema.not !== undefined && !collect(schema.not, value, path, root).length) fail("must not match the excluded schema");
  if (schema.if !== undefined) {
    const branch = collect(schema.if, value, path, root).length ? schema.else : schema.then;
    if (branch !== undefined) evaluate(branch, value, path, root, errors);
  }
  // Keep error lists bounded for large documents with one systematic mistake.
  if (errors.length - start > 50) errors.splice(start + 50);
}

function collect(schema, value, path, root) {
  const errors = [];
  evaluate(schema, value, path, root, errors);
  return errors;
}

function closest(attempts) {
  const best = attempts.reduce((left, right) => right.length < left.length ? right : left);
  return best.length ? `${best[0].path || "/"} ${best[0].message}` : "ambiguous";
}

/** Compiles a schema document; the returned function lists validation errors (empty when valid). */
export function compileSchema(schema) {
  check(schema, "", schema);
  return value => collect(schema, value, "", schema);
}

/** Compiles a named `$defs` entry of a schema document so related shapes can share one file. */
export function compileDefinition(schema, name) {
  check(schema, "", schema);
  const definition = resolve(schema, `#/$defs/${name}`);
  return value => collect(definition, value, "", schema);
}

export function formatErrors(errors, limit = 5) {
  const shown = errors.slice(0, limit).map(error => `${error.path || "/"} ${error.message}`);
  if (errors.length > limit) shown.push(`... ${errors.length - limit} more`);
  return shown.join("; ");
}
