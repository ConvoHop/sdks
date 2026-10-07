// Resolves --target: the built-in deterministic mock or a JSON descriptor file (spec/conformance/targets.md).
import { resolve } from "node:path";
import { startMockTarget } from "../mock/server.mjs";
import { formatErrors } from "./json-schema.mjs";
import { readJson } from "./files.mjs";

export class TargetError extends Error {
  constructor(message) { super(message); this.name = "TargetError"; }
}

const ENV = /\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}/g;
const isObject = value => typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Substitutes `${env:NAME}`. A string that references an unset or empty variable is removed
 * (its property is deleted, its array element dropped) so absent values read as "not provided".
 */
export function substituteEnvironment(value, environment = process.env) {
  const REMOVE = Symbol("remove");
  const visit = item => {
    if (typeof item === "string") {
      let missing = false;
      const text = item.replace(ENV, (_match, name) => {
        const found = environment[name];
        if (found === undefined || found === "") missing = true;
        return found ?? "";
      });
      return missing ? REMOVE : text;
    }
    if (Array.isArray(item)) return item.map(visit).filter(entry => entry !== REMOVE);
    if (isObject(item)) return Object.fromEntries(Object.entries(item).map(([key, entry]) => [key, visit(entry)])
      .filter(([, entry]) => entry !== REMOVE));
    return item;
  };
  const result = visit(value);
  return result === REMOVE ? undefined : result;
}

export function checkDescriptor(descriptor, validate) {
  const errors = validate(descriptor);
  if (errors.length) throw new TargetError(`target descriptor is invalid: ${formatErrors(errors)}`);
  const control = (descriptor.capabilities ?? []).filter(capability => capability.startsWith("control."));
  if (control.length && descriptor.control === undefined)
    throw new TargetError(`target declares ${control.join(", ")} but no control URL`);
  return descriptor;
}

/** Opens a target; `close` releases anything the runner started. */
export async function openTarget(spec, { validate, environment = process.env, cwd = process.cwd() }) {
  if (spec === "mock") {
    const mock = await startMockTarget({ host: "127.0.0.1" });
    try { checkDescriptor(mock.descriptor, validate); }
    catch (error) { await mock.close(); throw error; }
    return { kind: "mock", descriptor: mock.descriptor, close: () => mock.close() };
  }
  let raw;
  try { raw = await readJson(resolve(cwd, spec)); }
  catch (error) { throw new TargetError(`cannot read target ${spec}: ${error instanceof Error ? error.message : error}`); }
  const descriptor = substituteEnvironment(raw, environment);
  if (isObject(descriptor)) delete descriptor.$schema;
  return { kind: "file", descriptor: Object.freeze(checkDescriptor(descriptor, validate)), close: async () => {} };
}
