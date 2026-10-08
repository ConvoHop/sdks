/**
 * Loads every docs input and renders the site. Problems are collected rather
 * than thrown, so one run reports all of them.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkConfig, checkLanguageFiles, discoverLanguages, loadOperationMap, loadSurface, readJson } from "./languages.mjs";
import { renderSite } from "./render.mjs";
import { expandIncludes } from "./snippets.mjs";

const SNIPPET_DIRECTORY = "docs/snippets";

/** Returns `{ files, problems }`; files are repository-relative `{ path, contents }`. */
export function buildSite(root, config) {
  const problems = [];
  checkConfig(config, problems);
  const ir = readJson(root, "schema/ir.json", problems);
  const index = readJson(root, `${SNIPPET_DIRECTORY}/index.json`, problems);
  if (!ir || !index) return { files: [], problems };
  const snippets = new Map();
  for (const entry of index.operations) {
    const path = `${SNIPPET_DIRECTORY}/${entry.path}`;
    if (existsSync(join(root, path))) snippets.set(entry.id, readFileSync(join(root, path), "utf8"));
  }
  for (const operation of ir.operations) {
    if (!snippets.has(operation.id)) problems.push(`${SNIPPET_DIRECTORY} has no page for ${operation.id}; run npm run generate:graphql`);
  }
  const languages = [];
  for (const language of discoverLanguages(root, config, problems)) {
    if (!checkLanguageFiles(root, language, problems)) continue;
    const surface = loadSurface(root, language, problems);
    if (!surface) continue;
    const operations = loadOperationMap(root, language, surface, ir, problems);
    const expand = path => {
      const result = expandIncludes(readFileSync(join(root, path), "utf8"), { root, language: language.config, directory: language.directory, file: path });
      problems.push(...result.problems);
      return { markdown: result.markdown, source: path, includes: result.includes };
    };
    const overview = expand(`${language.directory}/overview.md`);
    const quickstarts = new Map(language.config.quickstarts.map(topic => [topic, expand(`${language.directory}/quickstarts/${topic}.md`)]));
    languages.push({ ...language, surface, operations, overview, quickstarts });
  }
  if (problems.length) return { files: [], problems };
  return renderSite({ root, config, ir, snippets, languages });
}
