import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, rmdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { isPlainObject } from "./json.mjs";
import { codeUnitCompare } from "./naming.mjs";

/**
 * Emitter plugin API.
 *
 * An emitter is a pure function from the IR (schema/ir.json) to files:
 *
 *   export default defineEmitter({
 *     name: "python-models",
 *     description: "Python models and operations",
 *     owns: ["packages/python/src/convohop/_generated"], // optional: directories only it writes to
 *     emit(ir, options) { return [{ path: "relative/posix/path", contents: "text\n" }]; },
 *   });
 *
 * The runner deep-freezes the IR, rejects unsafe, duplicate or case-colliding
 * paths and writes into another emitter's `owns` directories, requires
 * LF-terminated text, writes only files whose contents changed and, in check
 * mode, reports drift without writing. Files under `owns` directories that
 * the emitter no longer produces are deleted, together with the directories
 * they leave empty (write mode), or reported (check mode). Entries that no
 * emitter could produce, such as .DS_Store, are left alone.
 */
export class EmitterError extends Error {}

const NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const SEGMENT = /^[A-Za-z0-9_@+=,-][A-Za-z0-9_.@+=,-]*$/;

export function defineEmitter(definition) {
  if (!isPlainObject(definition)) throw new EmitterError("defineEmitter expects an object");
  const { name, description, owns = [], emit, ...rest } = definition;
  const unknown = Object.keys(rest);
  if (unknown.length) throw new EmitterError(`emitter ${JSON.stringify(name)}: unknown option(s) ${unknown.join(", ")}`);
  if (typeof name !== "string" || !NAME.test(name)) throw new EmitterError(`emitter name must be kebab-case, got ${JSON.stringify(name)}`);
  if (typeof description !== "string" || !description.trim()) throw new EmitterError(`emitter "${name}" needs a description`);
  if (!Array.isArray(owns)) throw new EmitterError(`emitter "${name}": owns must be an array of directories`);
  for (const directory of owns) assertSafePath(directory, `emitter "${name}" owns`);
  if (typeof emit !== "function") throw new EmitterError(`emitter "${name}" needs an emit(ir, options) function`);
  return Object.freeze({ name, description, owns: Object.freeze([...owns]), emit });
}

/** Repository-relative POSIX path whose segments use letters, digits and `_.@+=,-` and do not start with a dot. */
export function assertSafePath(path, label) {
  if (typeof path !== "string" || !path) throw new EmitterError(`${label}: path must be a non-empty string`);
  if (!path.split("/").every(segment => SEGMENT.test(segment))) {
    throw new EmitterError(`${label}: unsafe path ${JSON.stringify(path)}; use a relative POSIX path whose segments use only letters, digits and _.@+=,- and do not start with a dot`);
  }
  return path;
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/**
 * Runs emitters in order and returns `[{ emitter, path, contents }]`.
 * `options` maps emitter names to their options.
 */
export function renderEmitters(ir, emitters, { options = {} } = {}) {
  const frozen = deepFreeze(structuredClone(ir));
  const names = new Set();
  for (const emitter of emitters) {
    if (!Object.isFrozen(emitter) || typeof emitter.emit !== "function") {
      throw new EmitterError(`emitters must be created with defineEmitter (got ${JSON.stringify(emitter?.name)})`);
    }
    if (names.has(emitter.name)) throw new EmitterError(`emitter names must be unique; "${emitter.name}" is registered twice`);
    names.add(emitter.name);
  }
  const owned = emitters.flatMap(emitter => emitter.owns.map(directory => ({ directory, owner: emitter.name })));
  const owners = new Map();
  const folded = new Map();
  const files = [];
  for (const emitter of emitters) {
    const output = emitter.emit(frozen, options[emitter.name] ?? {});
    if (!Array.isArray(output)) throw new EmitterError(`emitter "${emitter.name}" must return an array of { path, contents }`);
    for (const file of output) {
      if (!isPlainObject(file) || Object.keys(file).sort().join() !== "contents,path") {
        throw new EmitterError(`emitter "${emitter.name}" returned an entry that is not exactly { path, contents }`);
      }
      const path = assertSafePath(file.path, `emitter "${emitter.name}"`);
      if (typeof file.contents !== "string") throw new EmitterError(`emitter "${emitter.name}": ${path}: contents must be a string`);
      if (!file.contents.endsWith("\n")) throw new EmitterError(`emitter "${emitter.name}": ${path}: contents must end with a newline`);
      if (file.contents.includes("\r")) throw new EmitterError(`emitter "${emitter.name}": ${path}: use LF line endings`);
      const claim = owned.find(entry => entry.owner !== emitter.name && path.startsWith(`${entry.directory}/`));
      if (claim) throw new EmitterError(`emitter "${emitter.name}" emits ${path} inside ${claim.directory}, which emitter "${claim.owner}" owns`);
      if (owners.has(path)) {
        const owner = owners.get(path);
        throw new EmitterError(owner === emitter.name ? `emitter "${owner}" emits ${path} twice` : `${path} is emitted by both "${owner}" and "${emitter.name}"`);
      }
      const caseless = path.toLowerCase();
      if (folded.has(caseless)) {
        throw new EmitterError(`${path} and ${folded.get(caseless)} differ only in letter case and would collide on case-insensitive file systems`);
      }
      owners.set(path, emitter.name);
      folded.set(caseless, path);
      files.push({ emitter: emitter.name, path, contents: file.contents });
    }
  }
  return files;
}

/**
 * Sorted paths of the files below `directory` that an emitter could have
 * written. Names that aren't safe path segments, such as .DS_Store, editor
 * swap files and dot-directories, are skipped because they can't be output.
 */
export function listEmittableFiles(root, directory = "") {
  const absolute = join(root, directory);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute, { withFileTypes: true }).flatMap(entry => {
    if (!SEGMENT.test(entry.name)) return [];
    const path = directory ? `${directory}/${entry.name}` : entry.name;
    return entry.isDirectory() ? listEmittableFiles(root, path) : [path];
  }).sort(codeUnitCompare);
}

function pruneEmptyDirectories(absolute) {
  if (!existsSync(absolute)) return;
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    if (!entry.isDirectory() || !SEGMENT.test(entry.name)) continue;
    const child = join(absolute, entry.name);
    pruneEmptyDirectories(child);
    if (readdirSync(child).length === 0) rmdirSync(child);
  }
}

/**
 * Writes (or, with `check`, compares) rendered files under `root`.
 * Returns `{ written, unchanged, removed, drift }` with repository-relative paths.
 */
export function syncFiles(root, files, { check = false, owns = [] } = {}) {
  const result = { written: [], unchanged: [], removed: [], drift: [] };
  const emitted = new Set(files.map(file => file.path));
  const stale = [...new Set(owns.flatMap(directory => listEmittableFiles(root, directory)))].filter(path => !emitted.has(path));
  if (!check) {
    // Delete before writing. On a case-insensitive file system, a file or directory renamed only in
    // letter case is the same entry as its replacement, so deleting it afterwards would delete the output.
    for (const path of stale) rmSync(join(root, path));
    for (const directory of owns) pruneEmptyDirectories(join(root, directory));
    result.removed.push(...stale);
  }
  for (const { path, contents } of files) {
    const absolute = join(root, path);
    const current = existsSync(absolute) ? readFileSync(absolute, "utf8") : undefined;
    if (current === contents) {
      result.unchanged.push(path);
    } else if (check) {
      result.drift.push(current === undefined ? `${path} (missing)` : path);
    } else {
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, contents);
      result.written.push(path);
    }
  }
  if (check) result.drift.push(...stale.map(path => `${path} (stale)`));
  return result;
}

/** Renders and syncs in one step. */
export function runEmitters(ir, emitters, { root, check = false, options = {} }) {
  const files = renderEmitters(ir, emitters, { options });
  const owns = emitters.flatMap(emitter => emitter.owns);
  return { files, ...syncFiles(root, files, { check, owns }) };
}
