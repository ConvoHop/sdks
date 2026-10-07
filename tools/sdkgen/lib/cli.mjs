import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import config from "../sdkgen.config.mjs";
import { checkAnnotations, formatAnnotationReport } from "./annotations.mjs";
import { EmitterError, runEmitters } from "./emitter.mjs";
import { buildIr, IrBuildError } from "./ir.mjs";
import { SchemaCompileError } from "./json-schema.mjs";
import { formatJson } from "./json.mjs";
import { loadSources, SourceError } from "./sources.mjs";

const DEFAULT_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const REGENERATE = "Run npm run generate:graphql and commit the result.";

const USAGE = `Usage: node tools/sdkgen/cli.mjs <command> [--check] [--root <dir>]

Commands:
  check-annotations         Check schema/annotations.json against the GraphQL schemas.
  generate [--check]        Build the IR and run every configured emitter. With --check, write
                            nothing and fail if a generated file is missing, stale or edited.
  emit <name>... [--check]  Run only the named emitters: ${config.emitters.map(emitter => emitter.name).join(", ")}.
  ir                        Print the IR to stdout.

Options:
  --root <dir>  Repository root to read schema/ from and write into (default: this checkout).`;

const COMMANDS = ["check-annotations", "generate", "emit", "ir"];

class UsageError extends Error {}

function parse(argv) {
  try {
    return parseArgs({
      args: argv,
      allowPositionals: true,
      options: { check: { type: "boolean", default: false }, root: { type: "string" }, help: { type: "boolean", short: "h" } },
    });
  } catch (error) {
    throw new UsageError(error.message);
  }
}

function selectEmitters(names) {
  if (names.length === 0) throw new UsageError("emit needs at least one emitter name");
  return names.map(name => {
    const emitter = config.emitters.find(candidate => candidate.name === name);
    if (!emitter) throw new UsageError(`unknown emitter "${name}"`);
    return emitter;
  });
}

function generate({ root, check, emitters, out, err }) {
  const ir = buildIr(loadSources({ root }));
  const result = runEmitters(ir, emitters, { root, check, options: config.options });
  if (result.drift.length) {
    for (const path of result.drift) err(`Generated GraphQL drift: ${path}`);
    err(REGENERATE);
    return 1;
  }
  for (const path of result.written) out(`wrote ${path}`);
  for (const path of result.removed) out(`removed ${path}`);
  const planes = ir.planes.length === 2 ? "both" : String(ir.planes.length);
  out(`${ir.operations.length} typed GraphQL operations validated against ${planes} exported schemas.`);
  if (check) out(`${result.files.length} generated files are up to date.`);
  return 0;
}

/** Runs the CLI and returns its exit code. `out` and `err` receive whole lines. */
export function run(argv, { out = line => console.log(line), err = line => console.error(line) } = {}) {
  try {
    const { values, positionals } = parse(argv);
    if (values.help) {
      out(USAGE);
      return 0;
    }
    const [command, ...names] = positionals;
    if (!COMMANDS.includes(command)) throw new UsageError(command ? `unknown command "${command}"` : "missing command");
    if (command !== "emit" && names.length) throw new UsageError(`unexpected argument "${names[0]}"`);
    if (values.check && !["generate", "emit"].includes(command)) throw new UsageError(`--check does not apply to "${command}"`);
    const root = values.root ? resolve(values.root) : DEFAULT_ROOT;
    switch (command) {
      case "check-annotations": {
        const result = checkAnnotations(loadSources({ root }));
        (result.ok ? out : err)(formatAnnotationReport(result));
        return result.ok ? 0 : 1;
      }
      case "generate":
        return generate({ root, check: values.check, emitters: config.emitters, out, err });
      case "emit":
        return generate({ root, check: values.check, emitters: selectEmitters(names), out, err });
      case "ir":
        out(formatJson(buildIr(loadSources({ root }))).trimEnd());
        return 0;
      default:
        throw new Error(`unhandled command "${command}"`);
    }
  } catch (error) {
    if (error instanceof UsageError) {
      err(`${error.message}\n\n${USAGE}`);
      return 2;
    }
    if (error instanceof IrBuildError || error instanceof EmitterError || error instanceof SchemaCompileError || error instanceof SourceError) {
      err(error.message);
      return 1;
    }
    throw error;
  }
}
