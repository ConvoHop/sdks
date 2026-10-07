// `${...}` references in scenario steps (spec/conformance/README.md#interpolation).
// A string that is exactly one reference yields the raw referenced value; embedded references must be primitives.
import { randomBytes, randomUUID } from "node:crypto";

const REFERENCE = /\$\{([^}]*)\}/g;
const WHOLE = /^\$\{([^}]*)\}$/;
const SEGMENT = /^[A-Za-z0-9_-]+$/;
export const ROOTS = Object.freeze(["target", "nonce", "uuid", "saved", "clock"]);

/** A scenario needs a target value the target does not provide; the scenario is skipped, not failed. */
export class MissingValue extends Error {
  constructor(path) { super(`target does not provide ${path}`); this.name = "MissingValue"; this.path = path; }
}

/** A reference cannot be resolved at runtime; the step fails. */
export class InterpolationError extends Error {
  constructor(message) { super(message); this.name = "InterpolationError"; }
}

const isObject = value => typeof value === "object" && value !== null && !Array.isArray(value);

/** Lists every reference used anywhere in a step-shaped value. Object keys are never interpolated. */
export function references(value) {
  const found = [];
  const visit = item => {
    if (typeof item === "string") for (const [, reference] of item.matchAll(REFERENCE)) found.push(reference);
    else if (Array.isArray(item)) item.forEach(visit);
    else if (isObject(item)) Object.values(item).forEach(visit);
  };
  visit(value);
  return found;
}

/** Static syntax check; returns a problem description or undefined. */
export function checkReference(reference) {
  const [root, ...segments] = reference.split(".");
  if (!ROOTS.includes(root)) return `\${${reference}} uses unknown root ${JSON.stringify(root)}; use ${ROOTS.join(", ")}`;
  if (!segments.every(segment => SEGMENT.test(segment))) return `\${${reference}} has an empty or invalid path segment`;
  switch (root) {
    case "nonce": return segments.length ? `\${${reference}}: nonce takes no path` : undefined;
    case "uuid": return segments.length === 1 ? undefined : `\${${reference}}: use uuid.<label>`;
    case "target": case "saved": return segments.length ? undefined : `\${${reference}}: ${root} needs a path`;
    case "clock":
      return segments.length === 2 && segments[0] === "isoPlusMs" && /^-?[0-9]{1,12}$/.test(segments[1]) ? undefined
        : `\${${reference}}: use clock.isoPlusMs.<integer milliseconds>`;
    default: return undefined;
  }
}

/** Per-scenario interpolation state: one nonce, stable labelled UUIDs and saved step values. */
export class Scope {
  constructor(target, { now = () => Date.now() } = {}) {
    this.target = target;
    this.nonce = randomBytes(8).toString("hex");
    this.uuids = new Map();
    this.saved = new Map();
    this.now = now;
  }

  resolve(reference) {
    const problem = checkReference(reference);
    if (problem) throw new InterpolationError(problem);
    const [root, ...segments] = reference.split(".");
    switch (root) {
      case "nonce": return this.nonce;
      case "uuid": {
        if (!this.uuids.has(segments[0])) this.uuids.set(segments[0], randomUUID());
        return this.uuids.get(segments[0]);
      }
      case "clock": return new Date(this.now() + Number(segments[1])).toISOString();
      case "target": {
        const value = walk(this.target, segments);
        if (value === undefined) throw new MissingValue(segments.join("."));
        return value;
      }
      case "saved": {
        const [name, ...path] = segments;
        if (!this.saved.has(name)) throw new InterpolationError(`\${${reference}}: nothing was saved as ${name}`);
        const value = walk(this.saved.get(name), path);
        if (value === undefined) throw new InterpolationError(`\${${reference}}: saved value ${name} has no ${path.join(".")}`);
        return value;
      }
      default: throw new InterpolationError(`\${${reference}} cannot be resolved`);
    }
  }

  /** Returns a deep copy of `value` with references substituted. */
  interpolate(value) {
    if (typeof value === "string") {
      const whole = WHOLE.exec(value);
      if (whole) return structuredClone(this.resolve(whole[1]));
      return value.replace(REFERENCE, (_text, reference) => {
        const resolved = this.resolve(reference);
        if (!["string", "number", "boolean"].includes(typeof resolved))
          throw new InterpolationError(`\${${reference}} is not a primitive and cannot be embedded in a string`);
        return String(resolved);
      });
    }
    if (Array.isArray(value)) return value.map(item => this.interpolate(item));
    if (isObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, this.interpolate(item)]));
    return value;
  }
}

function walk(value, segments) {
  let current = value;
  for (const segment of segments) {
    if (Array.isArray(current) && /^(0|[1-9][0-9]*)$/.test(segment)) current = current[Number(segment)];
    else if (isObject(current) && Object.hasOwn(current, segment)) current = current[segment];
    else return undefined;
  }
  return current;
}
