#!/usr/bin/env node
/**
 * Java and Kotlin surface extractor for the docs pipeline (docs/docs-pipeline.md).
 *
 *   node tools/docgen/extractors/jvm.mjs docs/languages/jvm/language.json
 *
 * Runs the extract task of the docs-surface Gradle project
 * (tools/docgen/extractors/jvm) with the JVM SDK's Gradle wrapper. The task
 * reads each package's Java sources with javac and its Kotlin sources with
 * the Kotlin compiler's parser, without building the SDK, and writes surface
 * JSON (spec/docs/surface.schema.json), which this script prints on stdout.
 * Gradle's own output goes to stderr. Gradle needs Java 17 or later, from
 * JAVA_HOME or the PATH.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
/** Where the extract task writes the surface, relative to the repository root. */
export const OUTPUT = "tools/docgen/extractors/jvm/build/surface.json";

export class ExtractError extends Error {}

/**
 * Arguments for the extractor's main class. Gradle's --args splits at
 * whitespace and reads quotes and backslashes, so arguments can't contain them.
 */
export function extractorArguments(language) {
  const args = ["--language", language.id, "--output", OUTPUT];
  for (const pkg of language.packages) args.push("--package", `${pkg.name}=${pkg.source}`);
  for (const arg of args) {
    if (/[\s'"\\]/.test(arg)) throw new ExtractError(`Gradle can't pass ${JSON.stringify(arg)} to the extractor; remove its whitespace, quotes and backslashes`);
  }
  return args;
}

/** The Gradle command, an argument vector to run from the repository root. */
export function gradleCommand(language) {
  return ["jvm/gradlew", "-p", "jvm", "--no-daemon", "--console=plain", "-q", ":docs-surface:extract", `--args=${extractorArguments(language).join(" ")}`];
}

function runGradle([file, ...args], cwd) {
  return spawnSync(file, args, { cwd, stdio: ["ignore", 2, 2] });
}

/**
 * Runs the extractor for a parsed language.json and returns the surface JSON
 * it wrote. `run(command, cwd)` returns a spawnSync result.
 */
export function extractJvm({ root = ROOT, language, run = runGradle }) {
  const command = gradleCommand(language);
  const output = join(root, OUTPUT);
  // A failed run must not leave an earlier surface to print.
  rmSync(output, { force: true });
  const result = run(command, root);
  if (result.error) throw new ExtractError(`couldn't run ${command[0]}: ${result.error.message}`);
  if (result.status !== 0) throw new ExtractError(`${command.slice(0, -1).join(" ")} exited with ${result.signal ?? `code ${result.status}`}`);
  if (!existsSync(output)) throw new ExtractError(`${command.slice(0, -1).join(" ")} didn't write ${OUTPUT}`);
  return readFileSync(output, "utf8");
}

function main(argv) {
  const [languageFile] = argv;
  if (!languageFile || argv.length !== 1) {
    console.error("usage: node tools/docgen/extractors/jvm.mjs <language.json>");
    return 2;
  }
  try {
    const language = JSON.parse(readFileSync(resolve(ROOT, languageFile), "utf8"));
    process.stdout.write(extractJvm({ language }));
    return 0;
  } catch (error) {
    if (error instanceof ExtractError || error.code === "ENOENT") {
      console.error(`jvm extractor: ${error.message}`);
      return 1;
    }
    throw error;
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
