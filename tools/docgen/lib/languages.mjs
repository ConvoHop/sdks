/**
 * Loads and validates the docs pipeline's inputs: language configs, the
 * surfaces their extractors produce and their operation maps. Each loader
 * appends human-readable problems instead of throwing, so one run reports
 * every problem. See docs/docs-pipeline.md.
 */
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, join, posix, relative, sep } from "node:path";
import { createValidator, formatValidationErrors } from "../../sdkgen/lib/json-schema.mjs";
import { codeUnitCompare } from "../../sdkgen/lib/naming.mjs";

export const SCHEMA_DIRECTORY = "spec/docs";

/** Site paths that languages and package reference pages can't take. */
const RESERVED_LANGUAGE_IDS = new Set(["operations"]);
const RESERVED_SLUGS = new Set(["index", "operations"]);

const validators = new Map();

/** The validator for spec/docs/<name>.schema.json. */
export function validator(root, name) {
  const key = `${root}\0${name}`;
  if (!validators.has(key)) {
    const schema = JSON.parse(readFileSync(join(root, SCHEMA_DIRECTORY, `${name}.schema.json`), "utf8"));
    validators.set(key, createValidator(schema, { label: `${name}.schema.json` }));
  }
  return validators.get(key);
}

/** Validates `value`, appending `problems`. Returns whether it's valid. */
export function validate(root, name, value, label, problems) {
  const errors = validator(root, name)(value);
  if (errors.length) problems.push(`${label} doesn't match ${SCHEMA_DIRECTORY}/${name}.schema.json:\n${formatValidationErrors(errors)}`);
  return errors.length === 0;
}

/** The `$schema` value for a file at `path` that follows spec/docs/<name>.schema.json. */
export function schemaReference(path, name) {
  return posix.relative(posix.dirname(path), `${SCHEMA_DIRECTORY}/${name}.schema.json`);
}

export function readJson(root, path, problems) {
  const absolute = join(root, path);
  if (!existsSync(absolute)) {
    problems.push(`${path} doesn't exist`);
    return undefined;
  }
  try {
    return JSON.parse(readFileSync(absolute, "utf8"));
  } catch (error) {
    problems.push(`${path} isn't valid JSON: ${error.message}`);
    return undefined;
  }
}

function isDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

/** Whether `child` is inside `parent`; both are absolute paths. */
export function isInside(parent, child) {
  const path = relative(parent, child);
  return path !== "" && path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

/** Whether `path`, which exists, is inside `directory` once symbolic links are resolved. */
export function resolvesInside(directory, path) {
  return isInside(realpathSync(directory), realpathSync(path));
}

/** Validates docgen.config.mjs. */
export function checkConfig(config, problems) {
  const ids = new Set();
  for (const topic of config.topics) {
    if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(topic.id)) problems.push(`docgen.config.mjs: topic ID ${JSON.stringify(topic.id)} isn't kebab-case`);
    if (ids.has(topic.id)) problems.push(`docgen.config.mjs: topic ${topic.id} repeats`);
    if (!topic.title || !topic.summary) problems.push(`docgen.config.mjs: topic ${topic.id} needs a title and summary`);
    ids.add(topic.id);
  }
}

/**
 * Discovers docs/languages/<id>/language.json files and validates them.
 * Returns `[{ id, directory, config }]` in navigation order.
 */
export function discoverLanguages(root, config, problems) {
  const base = join(root, config.languagesDirectory);
  if (!isDirectory(base)) {
    problems.push(`${config.languagesDirectory} doesn't exist`);
    return [];
  }
  if (!resolvesInside(root, base)) {
    problems.push(`${config.languagesDirectory} resolves outside the repository`);
    return [];
  }
  const topics = new Set(config.topics.map(topic => topic.id));
  const languages = [];
  const entries = readdirSync(base, { withFileTypes: true }).sort((a, b) => codeUnitCompare(a.name, b.name));
  for (const entry of entries) {
    const id = entry.name;
    const directory = `${config.languagesDirectory}/${id}`;
    if (entry.isSymbolicLink()) {
      if (isDirectory(join(base, id))) problems.push(`${directory} is a symbolic link; make each language a directory`);
      continue;
    }
    if (!entry.isDirectory()) continue;
    const path = `${directory}/language.json`;
    if (existsSync(join(root, path)) && !resolvesInside(join(root, directory), join(root, path))) {
      problems.push(`${directory}: language.json resolves outside the language directory`);
      continue;
    }
    const language = readJson(root, path, problems);
    if (language === undefined || !validate(root, "language", language, path, problems)) continue;
    const before = problems.length;
    const problem = message => problems.push(`${path}: ${message}`);
    if (language.id !== id) problem(`id ${language.id} must match its directory, ${id}`);
    if (RESERVED_LANGUAGE_IDS.has(id)) problem(`${id} is reserved for generated pages; rename the language directory`);
    if (!language.testedFences.includes(language.codeFence)) problem(`testedFences must contain codeFence ${language.codeFence}`);
    for (const pkg of language.packages) {
      if (RESERVED_SLUGS.has(pkg.slug)) problem(`package slug ${pkg.slug} is reserved for generated pages`);
    }
    for (const [field, values] of [["name", language.packages.map(pkg => pkg.name)], ["slug", language.packages.map(pkg => pkg.slug)]]) {
      const repeated = values.filter((value, index) => values.indexOf(value) !== index);
      if (repeated.length) problem(`package ${field}s repeat: ${[...new Set(repeated)].join(", ")}`);
    }
    for (const pkg of language.packages) {
      if (!isDirectory(join(root, pkg.source))) problem(`package ${pkg.name} source ${pkg.source} isn't a directory`);
    }
    for (const topic of language.quickstarts) {
      if (!topics.has(topic)) problem(`quickstart topic ${topic} isn't in tools/docgen/docgen.config.mjs`);
    }
    if (problems.length === before) languages.push({ id, directory, config: language });
  }
  return languages.sort((a, b) => a.config.order - b.config.order || codeUnitCompare(a.id, b.id));
}

/** Checks that a discovered language has the hand-written files that generation reads. */
export function checkLanguageFiles(root, language, problems) {
  const before = problems.length;
  const base = join(root, language.directory);
  const problem = message => problems.push(`${language.directory}: ${message}`);
  for (const topic of language.config.quickstarts) {
    if (!existsSync(join(base, "quickstarts", `${topic}.md`))) problem(`quickstart ${topic} needs quickstarts/${topic}.md`);
  }
  if (isDirectory(join(base, "quickstarts"))) {
    for (const name of readdirSync(join(base, "quickstarts"))) {
      if (name.endsWith(".md") && !language.config.quickstarts.includes(name.slice(0, -3))) problem(`quickstarts/${name} isn't listed in language.json quickstarts`);
    }
  }
  for (const snippetRoot of language.config.snippetRoots) {
    if (!isDirectory(join(base, snippetRoot))) problem(`snippet root ${snippetRoot} isn't a directory`);
  }
  if (!existsSync(join(base, "overview.md"))) problem("needs an overview.md");
  if (!existsSync(join(base, language.config.operations))) problem(`operation map ${language.config.operations} doesn't exist`);
  const read = [
    ...language.config.snippetRoots,
    "overview.md",
    ...language.config.quickstarts.map(topic => `quickstarts/${topic}.md`),
    language.config.operations,
    "surface.json",
  ];
  for (const path of read) {
    if (existsSync(join(base, path)) && !resolvesInside(base, join(base, path))) problem(`${path} resolves outside the language directory`);
  }
  return problems.length === before;
}

/** Values of `key` that more than one item has, in first-repeat order. */
function repeated(items, key) {
  const seen = new Set();
  const repeats = new Set();
  for (const item of items) {
    const value = key(item);
    if (seen.has(value)) repeats.add(value);
    seen.add(value);
  }
  return [...repeats];
}

/** Checks an extractor's output, with or without `$schema`, against its language. */
export function checkSurface(root, language, surface, label, problems) {
  if (!validate(root, "surface", surface, label, problems)) return false;
  const before = problems.length;
  if (surface.language !== language.id) problems.push(`${label}: language is ${surface.language}, not ${language.id}`);
  const expected = language.config.packages.map(pkg => pkg.name).join(", ");
  const actual = surface.packages.map(pkg => pkg.name).join(", ");
  if (expected !== actual) problems.push(`${label}: packages are ${actual}, not ${expected} as in language.json`);
  // References name symbols and members, so each name (and static-ness, for members) appears once per parent.
  for (const pkg of surface.packages) {
    for (const name of repeated(pkg.symbols, symbol => symbol.name)) problems.push(`${label}: ${pkg.name} has more than one symbol named ${name}`);
    const visit = (node, path) => {
      for (const key of repeated(node.members ?? [], member => `${member.static ? "static " : ""}member named ${member.name}`)) {
        problems.push(`${label}: ${path} has more than one ${key}; list overloads as one member with several signatures`);
      }
      for (const member of node.members ?? []) visit(member, `${path}.${member.name}`);
    };
    for (const symbol of pkg.symbols) visit(symbol, `${pkg.name}#${symbol.name}`);
  }
  return problems.length === before;
}

/** Loads docs/languages/<id>/surface.json. */
export function loadSurface(root, language, problems) {
  const path = `${language.directory}/surface.json`;
  if (!existsSync(join(root, path))) {
    problems.push(`${path} doesn't exist; run npm run build && npm run extract:docs -- ${language.id}`);
    return undefined;
  }
  const surface = readJson(root, path, problems);
  if (surface === undefined || !checkSurface(root, language, surface, path, problems)) return undefined;
  return surface;
}

/** Parses `<package>#<Symbol>[.<member>[:static]...]`. */
export function parseReference(reference) {
  const hash = reference.indexOf("#");
  const [symbol, ...members] = reference.slice(hash + 1).split(".");
  return {
    package: reference.slice(0, hash),
    symbol,
    members: members.map(member => (member.endsWith(":static") ? { name: member.slice(0, -7), static: true } : { name: member, static: false })),
  };
}

/** The reference of a symbol, or of a member reached through `members` (symbol first). */
export function formatReference(pkg, symbol, members = []) {
  return `${pkg}#${symbol.name}${members.map(member => `.${member.name}${member.static ? ":static" : ""}`).join("")}`;
}

/** Finds a reference in a surface. Returns `{ package, symbol, members }` or `{ error }`. */
export function resolveReference(surface, reference) {
  const parsed = parseReference(reference);
  const pkg = surface.packages.find(candidate => candidate.name === parsed.package);
  if (!pkg) return { error: `package ${parsed.package} isn't documented` };
  const symbols = pkg.symbols.filter(symbol => symbol.name === parsed.symbol);
  if (symbols.length !== 1) return { error: symbols.length ? `${parsed.package} has ${symbols.length} symbols named ${parsed.symbol}` : `${parsed.package} has no symbol ${parsed.symbol}` };
  const members = [];
  let node = symbols[0];
  for (const step of parsed.members) {
    const found = (node.members ?? []).filter(member => member.name === step.name && Boolean(member.static) === step.static);
    if (found.length !== 1) {
      const other = (node.members ?? []).some(member => member.name === step.name);
      const hint = other ? ` (${step.static ? "it isn't static" : "it's static; add :static"})` : "";
      return { error: `${formatReference(parsed.package, symbols[0], [...members, step])} doesn't exist${hint}` };
    }
    node = found[0];
    members.push(node);
  }
  return { package: pkg, symbol: symbols[0], members };
}

/**
 * Loads a language's operation map. Returns a Map from operation ID to
 * `[{ reference, package, symbol, members }]`.
 */
export function loadOperationMap(root, language, surface, ir, problems) {
  const path = posix.join(language.directory, language.config.operations);
  const map = readJson(root, path, problems);
  const result = new Map();
  if (map === undefined || !validate(root, "operation-map", map, path, problems)) return result;
  const operations = new Map(ir.operations.map(operation => [operation.id, operation]));
  const layers = new Map(language.config.packages.map(pkg => [pkg.name, pkg.layer]));
  for (const [id, references] of Object.entries(map.operations)) {
    const operation = operations.get(id);
    if (!operation) {
      problems.push(`${path}: operation ${id} isn't in schema/ir.json`);
      continue;
    }
    const entries = [];
    for (const reference of references) {
      const resolved = resolveReference(surface, reference);
      if (resolved.error) {
        problems.push(`${path}: ${id}: ${resolved.error}`);
        continue;
      }
      const layer = layers.get(resolved.package.name);
      if (operation.layer !== "both" && operation.layer !== layer) {
        problems.push(`${path}: ${id} is a ${operation.layer} operation, but ${resolved.package.name} is a ${layer} package`);
        continue;
      }
      entries.push({ reference, package: resolved.package, symbol: resolved.symbol, members: resolved.members });
    }
    result.set(id, entries);
  }
  return result;
}
