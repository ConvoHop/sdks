#!/usr/bin/env node
/**
 * Swift surface extractor for the docs pipeline (docs/docs-pipeline.md).
 *
 *   node tools/docgen/extractors/swift.mjs docs/languages/swift/language.json
 *
 * Builds the swift-syntax-based extractor in tools/docgen/extractors/swift/
 * from its Package.resolved and runs it, so it needs a Swift 6.1 or later
 * toolchain. The extractor parses each module the language file documents,
 * without compiling the package or its dependencies, evaluates `#if` for iOS
 * and macOS, and prints surface JSON (spec/docs/surface.schema.json), which
 * this script prints on stdout. SwiftPM's output and the extractor's errors go
 * to stderr. Each package is one module, named by its source directory. `///`
 * comments become Markdown. Anything the extractor can't document faithfully
 * fails with its file and line; tools/docgen/extractors/swift/Tests covers the
 * rules.
 */
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
export const PACKAGE = "tools/docgen/extractors/swift";
export const PRODUCT = "swift-surface";
export const EXECUTABLE = `${PACKAGE}/.build/debug/${PRODUCT}`;

export class ExtractError extends Error {}

/**
 * The command that builds the extractor with its locked dependencies, to run
 * from the repository root. Without --disable-keychain, SwiftPM can stop
 * responding in a headless session, such as CI, as swift/README.md notes.
 */
export function buildCommand() {
  return ["swift", "build", "--package-path", PACKAGE, "--product", PRODUCT, "--force-resolved-versions", "--disable-keychain"];
}

/** The command that runs the extractor on a language file, to run from root. */
export function extractCommand(root, languageFile) {
  return [resolve(root, EXECUTABLE), root, resolve(root, languageFile)];
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
 * Builds the extractor, runs it on languageFile from root and returns the
 * surface JSON it printed. `run(command, cwd, { capture })` runs one command
 * and returns what spawnSync does; tests replace it.
 */
export function extractSwift({ root = ROOT, languageFile, run = spawn }) {
  check(`swift build --package-path ${PACKAGE}`, run(buildCommand(), root, { capture: false }));
  const extracted = run(extractCommand(root, languageFile), root, { capture: true });
  check(EXECUTABLE, extracted);
  if (!extracted.stdout) throw new ExtractError(`${EXECUTABLE} printed no surface`);
  return extracted.stdout;
}

function main(argv) {
  if (argv.length !== 1) {
    console.error("usage: node tools/docgen/extractors/swift.mjs <language.json>");
    return 2;
  }
  try {
    process.stdout.write(extractSwift({ languageFile: argv[0] }));
    return 0;
  } catch (error) {
    if (!(error instanceof ExtractError)) throw error;
    console.error(`swift extractor: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
