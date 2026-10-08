/**
 * Tested snippets. Hand-written pages never contain code in one of their
 * language's tested fences. Instead an empty fence includes a file, or a
 * region of one, from the language's snippet roots, which its test command
 * compiles or runs:
 *
 *   ```ts include=examples/src/server.ts#create-conversation
 *   ```
 *
 * The path is relative to the language directory. Regions are marked with
 * the language's line comment (regionComment in language.json):
 *
 *   // #region create-conversation
 *   ...
 *   // #endregion create-conversation
 *
 * Regions may nest. Included code drops every marker line, then is dedented
 * and trimmed. The generated fence names its source after the language, as a
 * repository path, so renderers can label tested code and link to it:
 *
 *   ```ts snippet=docs/languages/typescript/examples/src/server.ts#create-conversation
 *
 * Code in other fences (sh, json, text) is copied as written.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import { codeBlock, scanLines } from "./markdown.mjs";

const INCLUDE = /^include=(\S+)$/;
const REGION_NAME = /^[A-Za-z0-9_-]+$/;

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parses region markers. Returns `{ lines, regions, errors }`, where regions
 * maps names to `{ start, end }` line indexes of their markers and errors are
 * `{ line, message }` with 1-based lines.
 */
export function parseRegions(source, comment) {
  const prefix = escapeRegExp(comment);
  const start = new RegExp(`^\\s*${prefix}\\s*#region\\s+(\\S+)\\s*$`);
  const end = new RegExp(`^\\s*${prefix}\\s*#endregion(?:\\s+(\\S+))?\\s*$`);
  const lines = source.replace(/\n$/, "").split("\n");
  const regions = new Map();
  const errors = [];
  const open = [];
  lines.forEach((line, index) => {
    const number = index + 1;
    const opened = start.exec(line);
    const closed = !opened && end.exec(line);
    if (opened) {
      const name = opened[1];
      if (!REGION_NAME.test(name)) errors.push({ line: number, message: `region names use letters, digits, _ and -: ${name}` });
      else if (regions.has(name) || open.some(region => region.name === name)) errors.push({ line: number, message: `region ${name} repeats` });
      open.push({ name, start: index });
    } else if (closed) {
      const region = open.pop();
      if (!region) errors.push({ line: number, message: "#endregion without #region" });
      else if (closed[1] && closed[1] !== region.name) errors.push({ line: number, message: `#endregion ${closed[1]} closes region ${region.name}` });
      else regions.set(region.name, { start: region.start, end: index });
    } else if (/#(end)?region\b/.test(line)) {
      errors.push({ line: number, message: `malformed region marker; use ${comment ? `${comment} ` : ""}#region <name> and ${comment ? `${comment} ` : ""}#endregion` });
    }
  });
  for (const region of open) errors.push({ line: region.start + 1, message: `region ${region.name} isn't closed` });
  return { lines, regions, errors, markers: { start, end } };
}

function dedent(lines) {
  const indents = lines.filter(line => line.trim()).map(line => /^[ \t]*/.exec(line)[0].length);
  const indent = indents.length ? Math.min(...indents) : 0;
  return lines.map(line => line.slice(indent).replace(/[ \t]+$/, ""));
}

/** The code of one region (or, without `region`, the whole file) with markers removed, dedented and trimmed. */
export function extractRegion(source, comment, region) {
  const parsed = parseRegions(source, comment);
  if (parsed.errors.length) return { errors: parsed.errors };
  let body = parsed.lines;
  if (region !== undefined) {
    const range = parsed.regions.get(region);
    if (!range) return { errors: [{ line: 1, message: `region ${region} doesn't exist` }] };
    body = parsed.lines.slice(range.start + 1, range.end);
  }
  const kept = dedent(body.filter(line => !parsed.markers.start.test(line) && !parsed.markers.end.test(line)));
  while (kept.length && !kept[0]) kept.shift();
  while (kept.length && !kept.at(-1)) kept.pop();
  if (!kept.length) return { errors: [{ line: 1, message: `${region === undefined ? "file" : `region ${region}`} is empty` }] };
  return { code: kept.join("\n"), errors: [] };
}

/**
 * Expands include fences in a hand-written page and rejects code in tested
 * fences that isn't included. `language` is the validated language.json and
 * `directory` its repository-relative directory. Returns
 * `{ markdown, includes: [path#region], problems: [string] }`.
 */
export function expandIncludes(markdown, { root, language, directory, file }) {
  const problems = [];
  const includes = [];
  const { lines, errors } = scanLines(markdown);
  for (const error of errors) problems.push(`${file}:${error.line}: ${error.message}`);
  const tested = new Set(language.testedFences);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.kind !== "open") {
      out.push(line.text);
      continue;
    }
    const [fenceLanguage, ...attributes] = line.fence.info.split(/\s+/).filter(Boolean);
    const include = attributes.map(attribute => INCLUDE.exec(attribute)).find(Boolean);
    if (!include) {
      if (tested.has(fenceLanguage)) {
        problems.push(
          `${file}:${line.number}: ${fenceLanguage} code must come from a tested snippet: \`\`\`${fenceLanguage} include=<file>#<region>`,
        );
      }
      out.push(line.text);
      continue;
    }
    if (attributes.length !== 1) problems.push(`${file}:${line.number}: include fences take only a language and include=<file>#<region>`);
    if (lines[i + 1]?.kind !== "close") {
      problems.push(`${file}:${line.number}: include fences are empty; the code comes from the included file`);
      out.push(line.text);
      continue;
    }
    i++;
    const [path, region] = include[1].split("#");
    const resolved = includePath(path, language, directory);
    if (resolved.error) {
      problems.push(`${file}:${line.number}: ${resolved.error}`);
      continue;
    }
    const absolute = join(root, resolved.path);
    if (!existsSync(absolute) || !statSync(absolute).isFile()) {
      problems.push(`${file}:${line.number}: included file doesn't exist: ${resolved.path}`);
      continue;
    }
    const extracted = extractRegion(readFileSync(absolute, "utf8"), language.regionComment, region);
    if (extracted.errors.length) {
      for (const error of extracted.errors) problems.push(`${resolved.path}:${error.line}: ${error.message} (included by ${file}:${line.number})`);
      continue;
    }
    const source = region === undefined ? resolved.path : `${resolved.path}#${region}`;
    includes.push(source);
    out.push(codeBlock(extracted.code, `${fenceLanguage} snippet=${source}`));
  }
  return { markdown: out.join("\n"), includes, problems };
}

/** Resolves an include path relative to the language directory and checks it's under a snippet root. */
function includePath(path, language, directory) {
  if (!path || path.startsWith("/") || path.includes("\\") || path.split("/").some(segment => segment === ".." || segment === "." || segment === "")) {
    return { error: `include paths are relative to the language directory, without . or .. segments: ${path}` };
  }
  if (!language.snippetRoots.some(snippetRoot => path.startsWith(`${snippetRoot}/`))) {
    return { error: `included files must be under a snippet root (${language.snippetRoots.join(", ")}): ${path}` };
  }
  return { path: posix.join(directory, path) };
}
