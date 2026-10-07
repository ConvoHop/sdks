import { canonicalJson, isPlainObject } from "./json.mjs";

/**
 * A small, dependency-free JSON Schema (draft 2020-12 subset) validator.
 *
 * Unsupported keywords are rejected when the schema is compiled so a schema
 * can never silently weaken validation. Only local `$ref` pointers
 * ("#/...") are supported. Errors are `{ path, message }` where `path` is a
 * JSON Pointer into the validated instance.
 */
const ANNOTATION_KEYWORDS = new Set([
  "$schema", "$comment", "$defs", "title", "description", "default", "examples", "deprecated", "readOnly", "writeOnly",
]);
const VALIDATION_KEYWORDS = new Set([
  "type", "const", "enum", "pattern", "minLength", "maxLength", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum",
  "minItems", "maxItems", "uniqueItems", "required", "minProperties", "maxProperties", "dependentRequired", "$ref",
]);
const COUNT_KEYWORDS = new Set(["minLength", "maxLength", "minItems", "maxItems", "minProperties", "maxProperties"]);
const BOUND_KEYWORDS = new Set(["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum"]);
const SINGLE_SUBSCHEMA = ["not", "if", "then", "else", "items", "additionalProperties", "propertyNames"];
const ARRAY_SUBSCHEMA = ["allOf", "anyOf", "oneOf", "prefixItems"];
const MAP_SUBSCHEMA = ["properties", "patternProperties", "$defs"];
const TYPES = new Set(["null", "boolean", "object", "array", "number", "integer", "string"]);

export class SchemaCompileError extends Error {}

export function createValidator(root, { label = "schema" } = {}) {
  const patterns = new Map();
  checkSchema(root, "#", root, patterns, label);
  return value => {
    const errors = [];
    validateNode(root, value, "", errors, { root, patterns });
    return uniqueErrors(errors);
  };
}

/** Overlapping keywords (an outer `required` and a matching `then` branch) can report one failure twice. */
function uniqueErrors(errors) {
  const seen = new Set();
  return errors.filter(error => {
    const key = `${error.path}\u0000${error.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function formatValidationErrors(errors, { limit = 50 } = {}) {
  const lines = errors.slice(0, limit).map(error => `  ${error.path || "/"}: ${error.message}`);
  if (errors.length > limit) lines.push(`  ... ${errors.length - limit} more`);
  return lines.join("\n");
}

function checkSchema(schema, at, root, patterns, label) {
  if (typeof schema === "boolean") return;
  if (!isPlainObject(schema)) throw new SchemaCompileError(`${label} ${at}: schema must be an object or boolean`);
  for (const [keyword, value] of Object.entries(schema)) {
    const where = `${label} ${at}/${keyword}`;
    if (ANNOTATION_KEYWORDS.has(keyword) && !MAP_SUBSCHEMA.includes(keyword)) continue;
    if (SINGLE_SUBSCHEMA.includes(keyword)) {
      checkSchema(value, `${at}/${keyword}`, root, patterns, label);
    } else if (ARRAY_SUBSCHEMA.includes(keyword)) {
      if (!Array.isArray(value) || value.length === 0) throw new SchemaCompileError(`${where}: must be a non-empty array`);
      value.forEach((item, index) => checkSchema(item, `${at}/${keyword}/${index}`, root, patterns, label));
    } else if (MAP_SUBSCHEMA.includes(keyword)) {
      if (!isPlainObject(value)) throw new SchemaCompileError(`${where}: must be an object`);
      for (const [name, item] of Object.entries(value)) {
        if (keyword === "patternProperties") compilePattern(name, patterns, where);
        checkSchema(item, `${at}/${keyword}/${escapePointer(name)}`, root, patterns, label);
      }
    } else if (VALIDATION_KEYWORDS.has(keyword)) {
      if (keyword === "$ref") resolveRef(root, value, where);
      if (keyword === "pattern") compilePattern(value, patterns, where);
      if (keyword === "type") {
        const types = [].concat(value);
        if (types.length === 0) throw new SchemaCompileError(`${where}: must name at least one type`);
        for (const type of types) if (!TYPES.has(type)) throw new SchemaCompileError(`${where}: unknown type ${JSON.stringify(type)}`);
      }
      if (COUNT_KEYWORDS.has(keyword) && !(Number.isInteger(value) && value >= 0)) throw new SchemaCompileError(`${where}: must be a non-negative integer`);
      if (BOUND_KEYWORDS.has(keyword) && !Number.isFinite(value)) throw new SchemaCompileError(`${where}: must be a number`);
      if (keyword === "uniqueItems" && typeof value !== "boolean") throw new SchemaCompileError(`${where}: must be a boolean`);
      if (keyword === "enum" && (!Array.isArray(value) || value.length === 0)) throw new SchemaCompileError(`${where}: must be a non-empty array`);
      if (keyword === "required" && !isStringArray(value)) throw new SchemaCompileError(`${where}: must be an array of strings`);
      if (keyword === "dependentRequired" && (!isPlainObject(value) || !Object.values(value).every(isStringArray))) {
        throw new SchemaCompileError(`${where}: must map property names to arrays of strings`);
      }
    } else {
      throw new SchemaCompileError(`${where}: unsupported JSON Schema keyword`);
    }
  }
}

const isStringArray = value => Array.isArray(value) && value.every(item => typeof item === "string");

function compilePattern(source, patterns, where) {
  if (typeof source !== "string") throw new SchemaCompileError(`${where}: pattern must be a string`);
  if (!patterns.has(source)) {
    try {
      patterns.set(source, new RegExp(source, "u"));
    } catch (error) {
      throw new SchemaCompileError(`${where}: invalid pattern: ${error.message}`);
    }
  }
  return patterns.get(source);
}

function resolveRef(root, ref, where) {
  if (typeof ref !== "string" || (ref !== "#" && !ref.startsWith("#/"))) {
    throw new SchemaCompileError(`${where}: only local "#/..." references are supported (got ${JSON.stringify(ref)})`);
  }
  let node = root;
  for (const token of ref === "#" ? [] : ref.slice(2).split("/").map(unescapePointer)) {
    if (!isPlainObject(node) || !Object.hasOwn(node, token)) throw new SchemaCompileError(`${where}: unresolved reference ${ref}`);
    node = node[token];
  }
  return node;
}

function escapePointer(token) {
  return String(token).replace(/~/g, "~0").replace(/\//g, "~1");
}

function unescapePointer(token) {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  return typeof value;
}

function matchesType(value, type) {
  const actual = typeOf(value);
  return actual === type || (type === "number" && actual === "integer");
}

function describe(value) {
  const text = JSON.stringify(value);
  return text.length > 60 ? text.slice(0, 57) + "..." : text;
}

function validateNode(schema, value, path, errors, context) {
  if (schema === true) return;
  if (schema === false) {
    errors.push({ path, message: "is not allowed here" });
    return;
  }
  if (schema.$ref !== undefined) validateNode(resolveRef(context.root, schema.$ref, "$ref"), value, path, errors, context);
  if (schema.type !== undefined) {
    const types = [].concat(schema.type);
    if (!types.some(type => matchesType(value, type))) {
      errors.push({ path, message: `must be ${types.join(" or ")} (got ${typeOf(value)})` });
      return;
    }
  }
  if (schema.const !== undefined && canonicalJson(schema.const) !== canonicalJson(value)) {
    errors.push({ path, message: `must equal ${describe(schema.const)}` });
  }
  if (schema.enum !== undefined && !schema.enum.some(item => canonicalJson(item) === canonicalJson(value))) {
    const options = schema.enum.slice(0, 16).map(item => JSON.stringify(item)).join(", ");
    errors.push({ path, message: `must be one of ${options}${schema.enum.length > 16 ? ", ..." : ""} (got ${describe(value)})` });
  }
  if (typeof value === "string") validateString(schema, value, path, errors, context);
  if (typeof value === "number") validateNumber(schema, value, path, errors);
  if (Array.isArray(value)) validateArray(schema, value, path, errors, context);
  if (isPlainObject(value)) validateObject(schema, value, path, errors, context);
  validateCombinators(schema, value, path, errors, context);
}

function validateString(schema, value, path, errors, context) {
  const length = [...value].length;
  if (schema.minLength !== undefined && length < schema.minLength) errors.push({ path, message: `must have at least ${schema.minLength} characters` });
  if (schema.maxLength !== undefined && length > schema.maxLength) errors.push({ path, message: `must have at most ${schema.maxLength} characters` });
  if (schema.pattern !== undefined && !context.patterns.get(schema.pattern).test(value)) {
    errors.push({ path, message: `must match pattern ${schema.pattern} (got ${describe(value)})` });
  }
}

function validateNumber(schema, value, path, errors) {
  if (schema.minimum !== undefined && value < schema.minimum) errors.push({ path, message: `must be >= ${schema.minimum}` });
  if (schema.maximum !== undefined && value > schema.maximum) errors.push({ path, message: `must be <= ${schema.maximum}` });
  if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) errors.push({ path, message: `must be > ${schema.exclusiveMinimum}` });
  if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) errors.push({ path, message: `must be < ${schema.exclusiveMaximum}` });
}

function validateArray(schema, value, path, errors, context) {
  if (schema.minItems !== undefined && value.length < schema.minItems) errors.push({ path, message: `must have at least ${schema.minItems} items` });
  if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push({ path, message: `must have at most ${schema.maxItems} items` });
  if (schema.uniqueItems) {
    const seen = new Map();
    value.forEach((item, index) => {
      const key = canonicalJson(item);
      if (seen.has(key)) errors.push({ path: `${path}/${index}`, message: `duplicates item ${seen.get(key)}` });
      else seen.set(key, index);
    });
  }
  const prefix = schema.prefixItems ?? [];
  prefix.forEach((item, index) => {
    if (index < value.length) validateNode(item, value[index], `${path}/${index}`, errors, context);
  });
  if (schema.items !== undefined) {
    for (let index = prefix.length; index < value.length; index++) validateNode(schema.items, value[index], `${path}/${index}`, errors, context);
  }
}

function validateObject(schema, value, path, errors, context) {
  const keys = Object.keys(value);
  for (const name of schema.required ?? []) {
    if (!Object.hasOwn(value, name)) errors.push({ path, message: `missing required property ${JSON.stringify(name)}` });
  }
  if (schema.minProperties !== undefined && keys.length < schema.minProperties) errors.push({ path, message: `must have at least ${schema.minProperties} properties` });
  if (schema.maxProperties !== undefined && keys.length > schema.maxProperties) errors.push({ path, message: `must have at most ${schema.maxProperties} properties` });
  for (const [name, dependencies] of Object.entries(schema.dependentRequired ?? {})) {
    if (!Object.hasOwn(value, name)) continue;
    for (const dependency of dependencies) {
      if (!Object.hasOwn(value, dependency)) errors.push({ path, message: `property ${JSON.stringify(name)} requires ${JSON.stringify(dependency)}` });
    }
  }
  const patternEntries = Object.entries(schema.patternProperties ?? {});
  for (const key of keys) {
    const childPath = `${path}/${escapePointer(key)}`;
    let matched = false;
    if (schema.properties && Object.hasOwn(schema.properties, key)) {
      matched = true;
      validateNode(schema.properties[key], value[key], childPath, errors, context);
    }
    for (const [pattern, subschema] of patternEntries) {
      if (context.patterns.get(pattern).test(key)) {
        matched = true;
        validateNode(subschema, value[key], childPath, errors, context);
      }
    }
    if (schema.propertyNames !== undefined) {
      const nameErrors = [];
      validateNode(schema.propertyNames, key, childPath, nameErrors, context);
      for (const error of nameErrors) errors.push({ path: childPath, message: `property name ${error.message}` });
    }
    if (!matched && schema.additionalProperties !== undefined) {
      if (schema.additionalProperties === false) errors.push({ path, message: `has unknown property ${JSON.stringify(key)}` });
      else validateNode(schema.additionalProperties, value[key], childPath, errors, context);
    }
  }
}

function branchErrors(schemas, value, path, context) {
  return schemas.map(subschema => {
    const branch = [];
    validateNode(subschema, value, path, branch, context);
    return branch;
  });
}

function closest(results) {
  return results.reduce((best, current) => (current.length < best.length ? current : best));
}

function validateCombinators(schema, value, path, errors, context) {
  for (const subschema of schema.allOf ?? []) validateNode(subschema, value, path, errors, context);
  if (schema.anyOf) {
    const results = branchErrors(schema.anyOf, value, path, context);
    if (!results.some(result => result.length === 0)) errors.push(...closest(results));
  }
  if (schema.oneOf) {
    const results = branchErrors(schema.oneOf, value, path, context);
    const matches = results.filter(result => result.length === 0).length;
    if (matches === 0) errors.push(...closest(results));
    else if (matches > 1) errors.push({ path, message: `must match exactly one oneOf branch (matched ${matches})` });
  }
  if (schema.not !== undefined) {
    const result = [];
    validateNode(schema.not, value, path, result, context);
    if (result.length === 0) errors.push({ path, message: "must not match the excluded schema" });
  }
  if (schema.if !== undefined) {
    const result = [];
    validateNode(schema.if, value, path, result, context);
    const next = result.length === 0 ? schema.then : schema.else;
    if (next !== undefined) validateNode(next, value, path, errors, context);
  }
}
