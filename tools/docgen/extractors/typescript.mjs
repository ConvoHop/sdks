#!/usr/bin/env node
/**
 * TypeScript surface extractor for the docs pipeline (docs/docs-pipeline.md).
 *
 *   node tools/docgen/extractors/typescript.mjs docs/languages/typescript/language.json
 *
 * Reads the built declaration files (`exports["."].types`) of each package
 * listed in the language file and prints surface JSON
 * (spec/docs/surface.schema.json) on stdout. Run `npm ci && npm run build`
 * first. Re-exports are followed into other workspace packages; third-party
 * packages are not documented. Declarations from `generated/` modules are
 * listed by signature only: their members mirror the GraphQL schema, which the
 * operation pages document.
 */
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { DtsParseError, parseDeclarations, tokenize } from "./dts.mjs";

export const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
/** Signatures longer than this collapse their innermost result-type object literals to `{ … }`. */
export const MAX_SIGNATURE_LINES = 20;
const OPENERS = new Set(["{", "(", "[", "<"]);
const GENERATED = /(^|\/)generated\//;

export class ExtractError extends Error {}

const codeUnitCompare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const lineCount = text => text.split("\n").length;
const isGenerated = (program, file) => GENERATED.test(relative(program.root, file).split(sep).join("/"));

/** Token index where the result type of a member, function, constant or type alias signature starts. */
function resultStart(tokens) {
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token.type === "punct") {
      if (token.value === "(") return token.match + 1;
      if (token.value === "=") return i + 1;
      if (token.value === ":") {
        let next = i + 1;
        if (tokens[next]?.value === "<") next = tokens[next].match + 1;
        if (tokens[next]?.value === "(" && tokens[tokens[next].match + 1]?.value === "=>") return tokens[next].match + 2;
        return i + 1;
      }
      if (OPENERS.has(token.value)) {
        i = token.match + 1;
        continue;
      }
    }
    i++;
  }
  return tokens.length;
}

/**
 * Collapses multi-line object literals in the result type, innermost first,
 * until the signature fits in `maxLines`. Parameter shapes are kept.
 */
export function collapseSignature(text, maxLines = MAX_SIGNATURE_LINES) {
  let current = text;
  while (lineCount(current) > maxLines) {
    const tokens = tokenize(current);
    const start = resultStart(tokens);
    const depths = [];
    let best;
    tokens.forEach((token, index) => {
      if (token.type !== "punct") return;
      if (token.value === "}") depths.pop();
      if (token.value !== "{") return;
      depths.push(index);
      const close = tokens[token.match];
      const lines = lineCount(current.slice(token.start, close.end)) - 1;
      if (index < start || lines === 0) return;
      const candidate = { token, close, depth: depths.length, lines };
      if (!best || candidate.depth > best.depth || (candidate.depth === best.depth && candidate.lines > best.lines)) best = candidate;
    });
    if (!best) break;
    current = `${current.slice(0, best.token.start)}{ … }${current.slice(best.close.end)}`;
  }
  return current;
}

function isInside(parent, child) {
  const path = relative(parent, child);
  return path !== "" && !path.startsWith("..") && !path.startsWith(sep) && !/^[A-Za-z]:/.test(path);
}

class Program {
  constructor(root) {
    // Package directories are real paths, so the root must be one too for relative paths between them.
    this.root = realpathSync(resolve(root));
    this.modules = new Map();
    this.packages = new Map();
    this.exportTables = new Map();
  }

  /** Workspace package by name, or `null` for a third-party package. */
  package(name) {
    if (this.packages.has(name)) return this.packages.get(name);
    const link = join(this.root, "node_modules", ...name.split("/"));
    let info = null;
    if (existsSync(join(link, "package.json"))) {
      const dir = realpathSync(link);
      if (isInside(this.root, dir) && !dir.split(sep).includes("node_modules")) {
        info = { name, dir, manifest: JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) };
      }
    }
    this.packages.set(name, info);
    return info;
  }

  requirePackage(name) {
    const info = this.package(name);
    if (!info) throw new ExtractError(`${name} is not a workspace package in node_modules; run npm ci first`);
    return info;
  }

  typesEntry(info, subpath = ".") {
    const target = info.manifest.exports?.[subpath];
    const types = (typeof target === "object" && target !== null ? target.types : undefined) ?? (subpath === "." ? info.manifest.types : undefined);
    if (typeof types !== "string") throw new ExtractError(`${info.name}: package.json exports[${JSON.stringify(subpath)}] has no "types" condition`);
    const file = join(info.dir, types);
    if (!existsSync(file)) throw new ExtractError(`${relative(this.root, file)} is missing; run npm run build first`);
    return file;
  }

  /** Absolute declaration file for `specifier` imported from `fromFile`, or `null` for third-party packages. */
  resolve(fromFile, specifier) {
    if (specifier.startsWith(".")) {
      const base = resolve(dirname(fromFile), specifier);
      const candidates = [base.replace(/\.js$/, ".d.ts"), base.replace(/\.mjs$/, ".d.mts"), `${base}.d.ts`, join(base, "index.d.ts")];
      const file = candidates.find(candidate => candidate !== base && existsSync(candidate));
      if (!file) throw new ExtractError(`${relative(this.root, fromFile)}: cannot resolve ${JSON.stringify(specifier)}`);
      return file;
    }
    const match = /^((?:@[^/]+\/)?[^/@][^/]*)(\/.*)?$/.exec(specifier);
    if (!match) throw new ExtractError(`${relative(this.root, fromFile)}: unsupported module specifier ${JSON.stringify(specifier)}`);
    const info = this.package(match[1]);
    return info ? this.typesEntry(info, match[2] ? `.${match[2]}` : ".") : null;
  }

  module(file) {
    if (!this.modules.has(file)) {
      const parsed = parseDeclarations(readFileSync(file, "utf8"), relative(this.root, file).split(sep).join("/"));
      this.modules.set(file, { ...parsed, path: file });
    }
    return this.modules.get(file);
  }

  ownerPackage(file) {
    for (let dir = dirname(file); isInside(this.root, dir); dir = dirname(dir)) {
      const manifest = join(dir, "package.json");
      if (existsSync(manifest)) return JSON.parse(readFileSync(manifest, "utf8")).name;
    }
    throw new ExtractError(`${relative(this.root, file)}: no owning package.json`);
  }

  /** Resolves a name visible in `file` (a local declaration or an import) to `{ file, name }` or a namespace. */
  binding(file, name) {
    const module = this.module(file);
    if (module.declarations.some(declaration => declaration.name === name)) return { kind: "declaration", file, name };
    const imported = module.imports.find(item => item.local === name);
    if (!imported) return null;
    const target = this.resolve(file, imported.from);
    if (!target) return null;
    if (imported.imported === "*") return { kind: "namespace", file: target, name, doc: { text: "", internal: false } };
    return this.exports(target).get(imported.imported) ?? null;
  }

  /** Map of exported name to `{ kind: "declaration", file, name }` or `{ kind: "namespace", file, name, doc }`. */
  exports(file, stack = []) {
    if (this.exportTables.has(file)) return this.exportTables.get(file);
    if (stack.includes(file)) throw new ExtractError(`export cycle: ${[...stack, file].map(item => relative(this.root, item)).join(" -> ")}`);
    const module = this.module(file);
    const table = new Map();
    const where = relative(this.root, file);
    const add = (name, target, explicit) => {
      const existing = table.get(name);
      if (existing && (existing.file !== target.file || existing.name !== target.name)) {
        if (existing.explicit && !explicit) return;
        if (existing.explicit === explicit) throw new ExtractError(`${where}: ${name} is exported twice`);
      }
      table.set(name, { ...target, explicit });
    };
    for (const declaration of module.declarations) {
      if (declaration.exported) add(declaration.name, { kind: "declaration", file, name: declaration.name }, true);
    }
    for (const entry of module.exports) {
      if (entry.kind === "named") {
        const source = entry.from === undefined ? undefined : this.resolve(file, entry.from);
        if (entry.from !== undefined && !source) throw new ExtractError(`${where}: re-exports from third-party ${JSON.stringify(entry.from)} are not supported`);
        for (const { local, exported } of entry.names) {
          const target = source ? this.exports(source, [...stack, file]).get(local) : this.binding(file, local);
          if (!target) throw new ExtractError(`${where}: cannot resolve export ${JSON.stringify(local)}`);
          add(exported, target, true);
        }
      } else {
        const source = this.resolve(file, entry.from);
        if (!source) throw new ExtractError(`${where}: re-exports from third-party ${JSON.stringify(entry.from)} are not supported`);
        if (entry.kind === "namespace") {
          add(entry.name, { kind: "namespace", file: source, name: entry.name, doc: entry.doc }, true);
        } else {
          for (const [name, target] of this.exports(source, [...stack, file])) if (name !== "default") add(name, target, false);
        }
      }
    }
    for (const value of table.values()) delete value.explicit;
    this.exportTables.set(file, table);
    return table;
  }

  declarations(target) {
    return this.module(target.file).declarations.filter(declaration => declaration.name === target.name);
  }
}

function docFields(doc) {
  const fields = { docs: doc.text };
  // A bare @deprecated tag parses as `true`; the surface schema wants its (empty) Markdown text.
  if (doc.deprecated) fields.deprecated = doc.deprecated === true ? "" : doc.deprecated;
  return fields;
}

function convertMember(member) {
  const result = { name: member.name, kind: member.kind, signatures: member.signatures.map(text => collapseSignature(text)), ...docFields(member.doc) };
  if (member.static) result.static = true;
  if (member.inherited) result.inherited = member.inherited;
  if (member.members?.length) result.members = member.members.map(convertMember);
  return result;
}

function memberKey(member) {
  return `${member.static ? "static " : ""}${member.name}`;
}

/** Own members followed by members inherited through `extends`, nearest base first. */
function membersOf(program, declaration, file, seen = new Set()) {
  const own = (declaration.members ?? []).map(member => ({ ...member }));
  const names = new Set(own.map(memberKey));
  for (const base of declaration.heritage?.extends ?? []) {
    if (!base.name || base.name.includes(".")) continue;
    const target = program.binding(file, base.name);
    if (!target || target.kind !== "declaration" || isGenerated(program, target.file)) continue;
    const key = `${target.file}#${target.name}`;
    if (seen.has(key)) continue;
    for (const baseDeclaration of program.declarations(target)) {
      if (!baseDeclaration.members) continue;
      for (const member of membersOf(program, baseDeclaration, target.file, new Set([...seen, key]))) {
        if (member.kind === "constructor" || names.has(memberKey(member))) continue;
        names.add(memberKey(member));
        own.push({ ...member, inherited: member.inherited ?? baseDeclaration.name });
      }
    }
  }
  return own;
}

function symbolFor(program, name, target, documentedPackage) {
  const origin = program.ownerPackage(target.file);
  const originField = origin === documentedPackage ? {} : { origin };
  if (target.kind === "namespace") {
    return { name, kind: "namespace", signatures: [`namespace ${name}`], ...docFields(target.doc), ...originField };
  }
  const declarations = program.declarations(target);
  if (declarations.length === 0) throw new ExtractError(`${relative(program.root, target.file)}: ${target.name} has no declaration`);
  const kinds = [...new Set(declarations.map(declaration => declaration.kind))];
  if (kinds.length > 1) throw new ExtractError(`${relative(program.root, target.file)}: ${target.name} merges ${kinds.join(" and ")} declarations, which the extractor does not support`);
  if (declarations.length > 1 && kinds[0] !== "function") throw new ExtractError(`${relative(program.root, target.file)}: ${target.name} has ${declarations.length} ${kinds[0]} declarations`);
  const doc = declarations.find(declaration => declaration.doc.text)?.doc ?? declarations[0].doc;
  const symbol = {
    name,
    kind: kinds[0],
    signatures: declarations.map(declaration => collapseSignature(declaration.signature)),
    ...docFields({ ...doc, deprecated: declarations.find(declaration => declaration.doc.deprecated)?.doc.deprecated }),
    ...originField,
  };
  if (isGenerated(program, target.file)) {
    symbol.signatures = declarations.map(declaration => collapseSignature(declaration.signature, 1));
  } else {
    const members = declarations.flatMap(declaration => membersOf(program, declaration, target.file));
    if (members.length) symbol.members = members.map(convertMember);
  }
  return symbol;
}

/** Surface of the given packages: `{ language, packages: [{ name, symbols }] }`. */
export function extractTypeScript({ root = ROOT, language = "typescript", packages }) {
  const program = new Program(root);
  return {
    language,
    packages: packages.map(name => {
      const entry = program.typesEntry(program.requirePackage(name));
      const symbols = [...program.exports(entry)].map(([exported, target]) => symbolFor(program, exported, target, name));
      return { name, symbols: symbols.sort((a, b) => codeUnitCompare(a.name, b.name)) };
    }),
  };
}

function main(argv) {
  const [languageFile] = argv;
  if (!languageFile || argv.length !== 1) {
    console.error("usage: node tools/docgen/extractors/typescript.mjs <language.json>");
    return 2;
  }
  try {
    const language = JSON.parse(readFileSync(resolve(ROOT, languageFile), "utf8"));
    const surface = extractTypeScript({ language: language.id, packages: language.packages.map(item => item.name) });
    process.stdout.write(`${JSON.stringify(surface)}\n`);
    return 0;
  } catch (error) {
    if (error instanceof ExtractError || error instanceof DtsParseError || error.code === "ENOENT") {
      console.error(`typescript extractor: ${error.message}`);
      return 1;
    }
    throw error;
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
