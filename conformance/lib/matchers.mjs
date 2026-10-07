// Structural matchers for scenario expectations (spec/conformance/README.md#matchers).
// Plain values compare strictly, arrays need the exact length and objects match as subsets.
// Objects whose keys all start with "$" are operators; several operators in one object are ANDed.
import { deepEqual } from "./json-schema.mjs";

export const MATCH_TYPES = Object.freeze(["string", "number", "integer", "boolean", "null", "object", "array", "uuid",
  "counter", "timestamp"]);
const OPERATORS = new Set(["$type", "$length", "$each", "$contains", "$sequences", "$ne", "$anyOf", "$eq", "$gte", "$lte"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const COUNTER = /^(0|[1-9][0-9]*)$/;
const I64_MAX = 9223372036854775807n;
// RFC 3339 date-time with any fractional precision; servers in different languages format sub-seconds differently.
const TIMESTAMP = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d{1,9})?(Z|[+-]\d\d:\d\d)$/;

const isObject = value => typeof value === "object" && value !== null && !Array.isArray(value);
const pointer = (path, key) => `${path}/${String(key).replaceAll("~", "~0").replaceAll("/", "~1")}`;
const isCounter = value => typeof value === "string" && COUNTER.test(value) && BigInt(value) <= I64_MAX;
const deferred = value => typeof value === "string" && value.includes("${");

export function show(value, limit = 160) {
  const text = value === undefined ? "undefined" : JSON.stringify(value);
  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
}

export function isOperatorObject(pattern) {
  if (!isObject(pattern)) return false;
  const keys = Object.keys(pattern);
  return keys.length > 0 && keys.some(key => key.startsWith("$"));
}

export function hasType(value, type) {
  switch (type) {
    case "string": return typeof value === "string";
    case "number": return typeof value === "number" && Number.isFinite(value);
    case "integer": return Number.isSafeInteger(value);
    case "boolean": return typeof value === "boolean";
    case "null": return value === null;
    case "object": return isObject(value);
    case "array": return Array.isArray(value);
    case "uuid": return typeof value === "string" && UUID.test(value) && value !== NIL_UUID;
    case "counter": return isCounter(value);
    case "timestamp": return typeof value === "string" && TIMESTAMP.test(value) && !Number.isNaN(Date.parse(value));
    default: return false;
  }
}

/**
 * Lists problems with a matcher pattern. Interpolation references (`${...}`) are accepted wherever a
 * runtime value is expected; the engine re-validates after interpolation.
 */
export function validateMatcher(pattern, path = "") {
  const problems = [];
  const visit = (value, at) => {
    if (Array.isArray(value)) { value.forEach((item, index) => visit(item, pointer(at, index))); return; }
    if (!isObject(value)) return;
    if (!isOperatorObject(value)) {
      for (const [key, child] of Object.entries(value)) visit(child, pointer(at, key));
      return;
    }
    for (const [operator, argument] of Object.entries(value)) {
      const where = pointer(at, operator);
      if (!OPERATORS.has(operator)) { problems.push(`${where}: unknown matcher operator (mixing fields and operators is not allowed)`); continue; }
      switch (operator) {
        case "$type": {
          const types = Array.isArray(argument) ? argument : [argument];
          if (!types.length || !types.every(type => MATCH_TYPES.includes(type)))
            problems.push(`${where}: must name one or more of ${MATCH_TYPES.join(", ")}`);
          break;
        }
        case "$length": case "$each": case "$contains": visit(argument, where); break;
        case "$anyOf":
          if (!Array.isArray(argument) || !argument.length) problems.push(`${where}: must be a non-empty array of matchers`);
          else argument.forEach((item, index) => visit(item, pointer(where, index)));
          break;
        case "$sequences": {
          const valid = isObject(argument) && Object.keys(argument).length === 2 &&
            ["from", "to"].every(key => isCounter(argument[key]) || deferred(argument[key]));
          if (!valid) problems.push(`${where}: must be {"from": counter, "to": counter}`);
          else if (isCounter(argument.from) && isCounter(argument.to) && BigInt(argument.from) > BigInt(argument.to))
            problems.push(`${where}: from must not exceed to`);
          break;
        }
        case "$gte": case "$lte":
          if (!(typeof argument === "number" && Number.isFinite(argument)) && !isCounter(argument) && !deferred(argument))
            problems.push(`${where}: must be a number or a canonical counter string`);
          break;
        default: break;
      }
    }
  };
  visit(pattern, path);
  return problems;
}

function compare(actual, bound) {
  if (typeof bound === "number") return typeof actual === "number" && Number.isFinite(actual) ? Math.sign(actual - bound) : undefined;
  if (!isCounter(bound) || !isCounter(actual)) return undefined;
  const left = BigInt(actual), right = BigInt(bound);
  return left === right ? 0 : left > right ? 1 : -1;
}

function sequencesOf(actual) {
  if (!Array.isArray(actual)) return undefined;
  const sequences = actual.map(item => isObject(item) && isCounter(item.sequence) ? item.sequence : undefined);
  return sequences.every(sequence => sequence !== undefined) ? sequences : undefined;
}

function expectedSequences({ from, to }) {
  const list = [];
  for (let sequence = BigInt(from); sequence <= BigInt(to) && list.length <= 100_000; sequence += 1n) list.push(String(sequence));
  return list;
}

function operators(actual, pattern, path, failures) {
  const fail = message => failures.push(`at ${path || "/"}: ${message}`);
  for (const [operator, argument] of Object.entries(pattern)) {
    switch (operator) {
      case "$type": {
        const types = Array.isArray(argument) ? argument : [argument];
        if (!types.some(type => hasType(actual, type))) fail(`expected type ${types.join(" or ")} but got ${show(actual)}`);
        break;
      }
      case "$length": {
        const length = Array.isArray(actual) ? actual.length : typeof actual === "string" ? [...actual].length : undefined;
        if (length === undefined) fail(`expected an array or string for $length but got ${show(actual)}`);
        else visit(length, argument, `${path}#length`, failures);
        break;
      }
      case "$each":
        if (!Array.isArray(actual)) fail(`expected an array for $each but got ${show(actual)}`);
        else actual.forEach((item, index) => visit(item, argument, pointer(path, index), failures));
        break;
      case "$contains":
        if (!Array.isArray(actual)) fail(`expected an array for $contains but got ${show(actual)}`);
        else if (!actual.some(item => !match(item, argument).length)) fail(`expected an item matching ${show(argument)} but none matched`);
        break;
      case "$sequences": {
        const sequences = sequencesOf(actual), expected = expectedSequences(argument);
        if (!sequences) fail(`expected an array of records with counter sequences but got ${show(actual)}`);
        else if (!deepEqual(sequences, expected))
          fail(`expected sequences ${argument.from}..${argument.to} exactly once in order but got [${sequences.join(",")}]`);
        break;
      }
      case "$ne": if (deepEqual(actual, argument)) fail(`expected a value other than ${show(argument)}`); break;
      case "$eq": if (!deepEqual(actual, argument)) fail(`expected exactly ${show(argument)} but got ${show(actual)}`); break;
      case "$anyOf": {
        const attempts = argument.map(option => match(actual, option, path));
        if (!attempts.some(attempt => !attempt.length)) {
          const closest = attempts.reduce((left, right) => right.length < left.length ? right : left);
          fail(`expected any of ${argument.length} alternatives to match; closest: ${closest[0]}`);
        }
        break;
      }
      case "$gte": case "$lte": {
        const order = compare(actual, argument);
        if (order === undefined) fail(`expected a value comparable with ${show(argument)} but got ${show(actual)}`);
        else if (operator === "$gte" ? order < 0 : order > 0)
          fail(`expected ${operator === "$gte" ? ">=" : "<="} ${show(argument)} but got ${show(actual)}`);
        break;
      }
      default: fail(`unknown matcher operator ${operator}`);
    }
  }
}

function visit(actual, pattern, path, failures) {
  if (Array.isArray(pattern)) {
    if (!Array.isArray(actual)) { failures.push(`at ${path || "/"}: expected an array but got ${show(actual)}`); return; }
    if (actual.length !== pattern.length) {
      failures.push(`at ${path || "/"}: expected ${pattern.length} items but got ${actual.length}: ${show(actual)}`);
      return;
    }
    pattern.forEach((item, index) => visit(actual[index], item, pointer(path, index), failures));
    return;
  }
  if (isOperatorObject(pattern)) { operators(actual, pattern, path, failures); return; }
  if (isObject(pattern)) {
    if (!isObject(actual)) { failures.push(`at ${path || "/"}: expected an object but got ${show(actual)}`); return; }
    for (const [key, child] of Object.entries(pattern)) {
      if (!Object.hasOwn(actual, key)) failures.push(`at ${pointer(path, key)}: expected ${show(child)} but the property is missing`);
      else visit(actual[key], child, pointer(path, key), failures);
    }
    return;
  }
  if (actual !== pattern) failures.push(`at ${path || "/"}: expected ${show(pattern)} but got ${show(actual)}`);
}

/** Returns mismatch descriptions; an empty list means the value matches. */
export function match(actual, pattern, path = "") {
  const failures = [];
  visit(actual, pattern, path, failures);
  return failures;
}
