import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { syncFiles } from "../../sdkgen/lib/emitter.mjs";
import { formatJson } from "../../sdkgen/lib/json.mjs";
import defaultConfig from "../docgen.config.mjs";
import { buildSite } from "./generate.mjs";
import { checkConfig, checkSurface, discoverLanguages, schemaReference } from "./languages.mjs";

const DEFAULT_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const USAGE = `Usage: node tools/docgen/cli.mjs <command> [options] [<language>...]

Commands:
  extract [--check] [<language>...]  Run each language's extractor and write docs/languages/<id>/surface.json.
                                     Extractors read built packages, so run npm run build first. With --check,
                                     write nothing and fail if a surface is out of date.
  generate [--check]                 Render docs/site from the language directories, schema/ir.json and
                                     docs/snippets. With --check, write nothing and fail if docs/site is out
                                     of date.
  test [--install] [<language>...]   Compile and run each language's snippets with its test command. With
                                     --install, install their dependencies first.

Languages default to every directory in docs/languages.

Options:
  --root <dir>  Repository root to read and write (default: this checkout).`;

const COMMANDS = ["extract", "generate", "test"];

class UsageError extends Error {}

function parse(argv) {
  try {
    return parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        check: { type: "boolean", default: false },
        install: { type: "boolean", default: false },
        root: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
    });
  } catch (error) {
    throw new UsageError(error.message);
  }
}

/** Runs an argument vector from the repository root without a shell; `node` is this Node.js. */
function execute(root, command, options) {
  const [file, ...args] = command;
  return spawnSync(file === "node" ? process.execPath : file, args, { cwd: root, maxBuffer: 256 * 1024 * 1024, ...options });
}

function describeFailure(command, result) {
  if (result.error) return `couldn't run ${command.join(" ")}: ${result.error.message}`;
  return `${command.join(" ")} exited with ${result.signal ?? `code ${result.status}`}`;
}

function selectLanguages(root, config, ids, problems) {
  checkConfig(config, problems);
  const languages = discoverLanguages(root, config, problems);
  for (const id of ids) {
    if (!languages.some(language => language.id === id)) problems.push(`unknown or invalid language "${id}"`);
  }
  return ids.length ? languages.filter(language => ids.includes(language.id)) : languages;
}

function extract({ root, config, ids, check, out, err }) {
  const problems = [];
  const files = [];
  for (const language of selectLanguages(root, config, ids, problems)) {
    const command = language.config.extract.command;
    const result = execute(root, command, { encoding: "utf8" });
    if (result.error || result.status !== 0) {
      problems.push(`${language.id}: ${describeFailure(command, result)}${result.stderr ? `\n${result.stderr.trimEnd()}` : ""}`);
      continue;
    }
    let surface;
    try {
      surface = JSON.parse(result.stdout);
    } catch (error) {
      problems.push(`${language.id}: ${command.join(" ")} didn't print JSON: ${error.message}`);
      continue;
    }
    const path = `${language.directory}/surface.json`;
    const { $schema, ...rest } = surface ?? {};
    if (!checkSurface(root, language, surface, `${command.join(" ")} output`, problems)) continue;
    files.push({ path, contents: formatJson({ $schema: schemaReference(path, "surface"), ...rest }) });
  }
  if (problems.length) {
    for (const problem of problems) err(problem);
    return 1;
  }
  const result = syncFiles(root, files, { check });
  if (result.drift.length) {
    for (const path of result.drift) err(`Extracted surface drift: ${path}`);
    const languages = files.filter(file => result.drift.some(path => path.startsWith(file.path))).map(file => file.path.split("/").at(-2));
    err(`Run npm run build && npm run extract:docs -- ${languages.join(" ")} && npm run generate:docs and commit the result.`);
    return 1;
  }
  for (const path of result.written) out(`wrote ${path}`);
  const count = `${files.length} ${files.length === 1 ? "surface" : "surfaces"}`;
  out(check ? `${count} up to date.` : `Extracted ${count}.`);
  return 0;
}

function generate({ root, config, check, out, err }) {
  const { files, problems } = buildSite(root, config);
  if (problems.length) {
    for (const problem of problems) err(problem);
    err(`${problems.length} docs ${problems.length === 1 ? "problem" : "problems"}; nothing was written.`);
    return 1;
  }
  const result = syncFiles(root, files, { check, owns: [config.outputDirectory] });
  if (result.drift.length) {
    for (const path of result.drift) err(`Generated docs drift: ${path}`);
    err("Run npm run generate:docs and commit the result.");
    return 1;
  }
  for (const path of result.written) out(`wrote ${path}`);
  for (const path of result.removed) out(`removed ${path}`);
  const pages = files.filter(file => file.path.endsWith(".md")).length;
  out(`${pages} pages and ${files.length - pages} other files in ${config.outputDirectory} ${check ? "are up to date" : "generated"}.`);
  return 0;
}

function test({ root, config, ids, install, err }) {
  const problems = [];
  const languages = selectLanguages(root, config, ids, problems);
  if (problems.length) {
    for (const problem of problems) err(problem);
    return 1;
  }
  const failed = [];
  for (const language of languages) {
    const commands = [...(install && language.config.test.install ? [language.config.test.install] : []), language.config.test.command];
    for (const command of commands) {
      err(`> ${language.id}: ${command.join(" ")}`);
      const result = execute(root, command, { stdio: "inherit" });
      if (result.error || result.status !== 0) {
        failed.push(`${language.id}: ${describeFailure(command, result)}`);
        break;
      }
    }
  }
  for (const failure of failed) err(failure);
  return failed.length ? 1 : 0;
}

/** Runs the CLI and returns its exit code. `out` and `err` receive whole lines. */
export function run(argv, { out = line => console.log(line), err = line => console.error(line), config = defaultConfig } = {}) {
  try {
    const { values, positionals } = parse(argv);
    if (values.help) {
      out(USAGE);
      return 0;
    }
    const [command, ...ids] = positionals;
    if (!COMMANDS.includes(command)) throw new UsageError(command ? `unknown command "${command}"` : "missing command");
    if (command === "generate" && ids.length) throw new UsageError(`unexpected argument "${ids[0]}"; generate renders every language`);
    if (values.check && command === "test") throw new UsageError('--check does not apply to "test"');
    if (values.install && command !== "test") throw new UsageError(`--install does not apply to "${command}"`);
    const root = values.root ? resolve(values.root) : DEFAULT_ROOT;
    switch (command) {
      case "extract":
        return extract({ root, config, ids, check: values.check, out, err });
      case "generate":
        return generate({ root, config, check: values.check, out, err });
      case "test":
        return test({ root, config, ids, install: values.install, err });
      default:
        throw new Error(`unhandled command "${command}"`);
    }
  } catch (error) {
    if (error instanceof UsageError) {
      err(`${error.message}\n\n${USAGE}`);
      return 2;
    }
    throw error;
  }
}
