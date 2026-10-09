#!/usr/bin/env node
/**
 * Dart surface extractor for the docs pipeline (docs/docs-pipeline.md).
 *
 *   node tools/docgen/extractors/dart.mjs docs/languages/flutter/language.json
 *
 * Fetches the analyzer-based extractor's dependencies in
 * tools/docgen/extractors/dart/ from its lockfile and runs it, so it needs the
 * Dart SDK (Flutter's works). The extractor parses each library of the package
 * the language file documents, without resolving the package or its
 * dependencies, and prints surface JSON (spec/docs/surface.schema.json), which
 * this script prints on stdout. pub's output and the extractor's errors go to
 * stderr. Each package is one public library. `///` comments become Markdown.
 * Anything the extractor can't document faithfully fails with its file and
 * line; tools/docgen/extractors/dart/test covers the rules.
 */
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
export const PACKAGE = "tools/docgen/extractors/dart";
export const PACKAGE_CONFIG = `${PACKAGE}/.dart_tool/package_config.json`;
export const SCRIPT = `${PACKAGE}/bin/extract.dart`;

export class ExtractError extends Error {}

/** The command that fetches the extractor's locked dependencies, to run from the repository root. */
export function pubGetCommand() {
  return ["dart", "--suppress-analytics", "pub", "get", "--enforce-lockfile", "--directory", PACKAGE];
}

/** The command that runs the extractor on a language file, to run from root. */
export function extractCommand(root, languageFile) {
  return ["dart", `--packages=${PACKAGE_CONFIG}`, SCRIPT, root, resolve(root, languageFile)];
}

/** Runs a command from cwd. Its stderr goes to this process's stderr, and its stdout too unless captured. */
function spawn(command, cwd, { capture }) {
  return spawnSync(command[0], command.slice(1), {
    cwd,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", capture ? "pipe" : 2, 2],
  });
}

function check(name, result) {
  if (result.error) throw new ExtractError(`couldn't run ${name}: ${result.error.message}`);
  if (result.status !== 0) throw new ExtractError(`${name} exited with ${result.signal ?? `code ${result.status}`}`);
}

/**
 * Fetches the extractor's dependencies, runs it on languageFile from root and
 * returns the surface JSON it printed. `run(command, cwd, { capture })` runs
 * one command and returns what spawnSync does; tests replace it.
 */
export function extractDart({ root = ROOT, languageFile, run = spawn }) {
  check(`dart pub get --directory ${PACKAGE}`, run(pubGetCommand(), root, { capture: false }));
  const extracted = run(extractCommand(root, languageFile), root, { capture: true });
  check(`dart ${SCRIPT}`, extracted);
  if (!extracted.stdout) throw new ExtractError(`dart ${SCRIPT} printed no surface`);
  return extracted.stdout;
}

function main(argv) {
  if (argv.length !== 1) {
    console.error("usage: node tools/docgen/extractors/dart.mjs <language.json>");
    return 2;
  }
  try {
    process.stdout.write(extractDart({ languageFile: argv[0] }));
    return 0;
  } catch (error) {
    if (!(error instanceof ExtractError)) throw error;
    console.error(`dart extractor: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
