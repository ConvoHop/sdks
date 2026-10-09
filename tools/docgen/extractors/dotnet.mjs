#!/usr/bin/env node
/**
 * .NET surface extractor for the docs pipeline (docs/docs-pipeline.md).
 *
 *   node tools/docgen/extractors/dotnet.mjs docs/languages/dotnet/language.json
 *
 * Builds the Roslyn-based extractor in tools/docgen/extractors/dotnet/ and runs
 * it, so it needs the .NET SDK that global.json pins. The extractor compiles
 * each package's C# sources once per target framework of its project, without
 * restoring or building the package, and prints surface JSON
 * (spec/docs/surface.schema.json), which this script prints on stdout. Build
 * output and the extractor's errors go to stderr. Each package is one
 * namespace. XML doc comments become Markdown. Anything the extractor can't
 * document faithfully fails with its file and line;
 * tools/docgen/extractors/dotnet/test covers the rules.
 */
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
export const PROJECT = "tools/docgen/extractors/dotnet/src/ConvoHop.Docgen.csproj";
export const ASSEMBLY = "tools/docgen/extractors/dotnet/src/bin/Release/net10.0/ConvoHop.Docgen.dll";
const ENV = { ...process.env, DOTNET_NOLOGO: "1", DOTNET_CLI_TELEMETRY_OPTOUT: "1" };

export class ExtractError extends Error {}

/** The command that builds the extractor, an argument vector to run from the repository root. */
export function buildCommand() {
  return ["dotnet", "build", PROJECT, "--configuration", "Release", "--nologo", "--verbosity", "quiet", "-consoleLoggerParameters:NoSummary", "--disable-build-servers"];
}

/** The command that runs the built extractor on a language file, to run from root. */
export function extractCommand(root, languageFile) {
  return ["dotnet", ASSEMBLY, root, resolve(root, languageFile)];
}

/** Runs a command from cwd. Its stderr goes to this process's stderr, and its stdout too unless captured. */
function spawn(command, cwd, { capture }) {
  return spawnSync(command[0], command.slice(1), {
    cwd,
    env: ENV,
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
export function extractDotnet({ root = ROOT, languageFile, run = spawn }) {
  check(`dotnet build ${PROJECT}`, run(buildCommand(), root, { capture: false }));
  const extracted = run(extractCommand(root, languageFile), root, { capture: true });
  check(`dotnet ${ASSEMBLY}`, extracted);
  if (!extracted.stdout) throw new ExtractError(`dotnet ${ASSEMBLY} printed no surface`);
  return extracted.stdout;
}

function main(argv) {
  if (argv.length !== 1) {
    console.error("usage: node tools/docgen/extractors/dotnet.mjs <language.json>");
    return 2;
  }
  try {
    process.stdout.write(extractDotnet({ languageFile: argv[0] }));
    return 0;
  } catch (error) {
    if (!(error instanceof ExtractError)) throw error;
    console.error(`dotnet extractor: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
