import type { OperationInput, OperationKey } from "@convohop/server";
import type { Args } from "./args.js";
import { isOperationKey, mutate, query, type MutationResult } from "./call.js";
import { flag, printMutation, text, type Command } from "./command.js";
import { cliOperations, cliTypes, withheldOperations, type CliOperation } from "./generated/operations.js";
import { UsageError } from "./output.js";
import { confirm } from "./prompt.js";
import { communicationPlane, managementPlane, readInput, type Context } from "./session.js";

const inputLimit = 64 * 1024;
const operationName = /^[a-z]+\.[A-Za-z][A-Za-z0-9]{0,63}$/;
const fieldName = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
const deliveryOperations = new Set(["communication.redeemCredential", "communication.acknowledgeCredential"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function operation(id: string | undefined, command: string): CliOperation {
  if (id === undefined) throw new UsageError("Name an operation, such as management.getProject, or pass --list", command);
  const found = Object.hasOwn(cliOperations, id) ? cliOperations[id] : undefined;
  if (found !== undefined) return found;
  const withheld = Object.hasOwn(withheldOperations, id) ? withheldOperations[id] : undefined;
  if (withheld !== undefined) throw new UsageError(`convohop call doesn't run ${id}, which ${withheld}`, command);
  if (deliveryOperations.has(id))
    throw new UsageError(`convohop redeem runs ${id}, and keeps the credential out of its output`, command);
  if (isOperationKey(id)) throw new UsageError(`convohop call doesn't run ${id}`, command);
  throw new UsageError(`${operationName.test(id) ? `Unknown operation ${id}` : "Unknown operation"}. ` +
    "convohop call --list lists them", command);
}

async function inputObject(context: Context, args: Args): Promise<Record<string, unknown>> {
  const inline = args.string("input"), path = args.string("input-file");
  if (inline !== undefined && path !== undefined) throw new UsageError("Set --input or --input-file, not both", args.command);
  let source: string;
  if (inline !== undefined) {
    if (Buffer.byteLength(inline, "utf8") > inputLimit)
      throw new UsageError(`--input must be at most ${inputLimit} bytes`, args.command);
    source = inline;
  } else if (path !== undefined) {
    source = (await readInput(context, path, inputLimit, "--input-file", args.command)).toString("utf8");
  } else return {};
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    // The parser's message can quote the input.
    throw new UsageError(`${inline !== undefined ? "--input" : "--input-file"} is not valid JSON`, args.command);
  }
  if (!isRecord(value)) throw new UsageError("The input must be a JSON object", args.command);
  return value;
}

/** Checks the input's top-level fields against the operation's input type. The transport checks the rest. */
function checkInput(op: CliOperation, input: Record<string, unknown>, command: string): void {
  const type = op.input === undefined ? undefined : cliTypes[op.input];
  const fields = type?.kind === "input" ? type.fields : [];
  for (const name of Object.keys(input))
    if (!fields.some(field => field.name === name))
      throw new UsageError(`${op.id} has no input field${fieldName.test(name) ? ` ${name}` : " with that name"}. ` +
        `convohop call ${op.id} --help lists them`, command);
  for (const field of fields)
    if (field.required && (input[field.name] === undefined || input[field.name] === null))
      throw new UsageError(`The input needs ${field.name}. convohop call ${op.id} --help lists the fields`, command);
}

/** The credential delivery a reply names, such as a new webhook signing secret's. */
function deliveryHint<K extends OperationKey>(result: MutationResult<K>): string | undefined {
  if (result.kind !== "reply" || !isRecord(result.payload) || !isRecord(result.payload.result)) return undefined;
  const delivery = result.payload.result.delivery;
  if (!isRecord(delivery) || typeof delivery.deliveryId !== "string" || typeof delivery.projectId !== "string")
    return undefined;
  return `Redeem the credential with convohop redeem --delivery ${delivery.deliveryId} --project ${delivery.projectId} --out FILE`;
}

const baseType = (type: string): string => type.replace(/[[\]!]/g, "");

/** An operation's help: its annotations, input fields and the input types and enums they use. */
export function operationHelp(op: CliOperation): string {
  const communication = op.plane === "communication";
  const lines = [
    `Usage: convohop call ${op.id} [--input JSON | --input-file FILE]${communication ? " [--project ID] [--incarnation ID]" : ""}` +
      `${op.destructive ? " [--yes]" : ""}`,
    "", op.summary,
  ];
  if (op.description) lines.push("", op.description);
  lines.push("", `Kind: ${op.plane} ${op.kind}`, `Credential: ${op.credential}`, `Requires: ${op.requires}`,
    `Idempotency: ${op.idempotency}`);
  if (op.destructive) lines.push("Destructive: yes. convohop asks first, unless --yes is given");
  if (op.paged) lines.push(`Paging: ${op.paged}`);
  if (op.longRunning) lines.push(`Long-running: follow it with ${op.longRunning.poll}, using the reply's ${op.longRunning.refField}`);
  if (op.input === undefined) lines.push("", "Input: none");
  const queue = op.input === undefined ? [] : [op.input];
  const shown = new Set<string>();
  for (let name = queue.shift(); name !== undefined; name = queue.shift()) {
    const type = shown.has(name) ? undefined : cliTypes[name];
    shown.add(name);
    if (type === undefined) continue;
    if (type.kind === "enum") lines.push("", `${name}: ${type.values.join(", ")}`);
    else if (type.kind === "scalar") lines.push("", `${name}${type.description ? `: ${type.description}` : ""}`);
    else {
      lines.push("", name === op.input ? `Input (${name}):` : `${name}:`);
      const nameWidth = Math.max(...type.fields.map(field => field.name.length));
      const typeWidth = Math.max(...type.fields.map(field => field.type.length));
      for (const field of type.fields) {
        const notes = [field.required ? "required" : undefined,
          field.default === undefined ? undefined : `default ${JSON.stringify(field.default)}`,
          field.deprecated ? `deprecated${field.deprecated.reason ? `: ${field.deprecated.reason}` : ""}` : undefined,
          field.description].filter(note => note !== undefined);
        lines.push(`  ${field.name.padEnd(nameWidth)}  ${field.type.padEnd(typeWidth)}  ${notes.join(". ")}`.trimEnd());
        queue.push(baseType(field.type));
      }
    }
  }
  if (communication)
    lines.push("", "Communication operations use a backend key from CONVOHOP_BACKEND_KEY or CONVOHOP_BACKEND_KEY_FILE.");
  return `${lines.join("\n")}\n`;
}

export const callCommand: Command = {
  name: "call",
  summary: "Run any operation in the schema by its ID, such as management.getProject.",
  usage: "OPERATION [--input JSON | --input-file FILE] [--project ID] [--incarnation ID] [--yes] | --list",
  positionals: 1,
  details: "convohop call OPERATION --help shows an operation's input and annotations. Mutations get a new request ID; " +
    "when their outcome is unknown, convohop resolves the request and resends it only while the authority hasn't seen " +
    "it. Destructive operations ask first. Operations whose results are credentials aren't available.",
  options: {
    input: text("JSON", "The operation's input, as a JSON object."),
    "input-file": text("FILE", "Read the input from FILE; - reads standard input."),
    list: flag("List the operations."),
    project: text("ID", "Communication operations: the project. Default: CONVOHOP_PROJECT_ID."),
    incarnation: text("ID", "Communication operations: the project's incarnation. Default: CONVOHOP_INCARNATION."),
    yes: flag("Run a destructive operation without asking."),
  },
  help(args) {
    const id = args.positionals[0];
    return id === undefined ? undefined : operationHelp(operation(id, args.command));
  },
  async run(context, args) {
    if (args.flag("list")) {
      if (args.positionals.length > 0) throw new UsageError("--list takes no operation", args.command);
      context.printer.data(Object.values(cliOperations).map(({ id, plane, kind, destructive, summary }) =>
        ({ id, plane, kind, destructive, summary })));
      return;
    }
    const op = operation(args.positionals[0], args.command);
    if (!isOperationKey(op.id)) throw new Error(`The operation catalog has no ${op.id}`);
    const key = op.id;
    if (op.plane !== "communication" && (args.has("project") || args.has("incarnation")))
      throw new UsageError("--project and --incarnation apply to communication operations. Put the project in the input",
        args.command);
    const input = await inputObject(context, args);
    checkInput(op, input, args.command);
    const plane = op.plane === "communication" ? await communicationPlane(context, args, client => client.initialize())
      : await managementPlane(context, args);
    await confirm(context, args, op);
    // checkInput checked the top-level fields against the operation's input type; the authority validates the values.
    const typed = input as OperationInput<OperationKey>;
    if (op.kind === "query") {
      context.printer.data(await query(context, plane, key, typed));
      return;
    }
    const result = await mutate(context, plane, key, typed);
    printMutation(context, result);
    const hint = deliveryHint(result);
    if (hint) context.printer.note(hint);
  },
};
