import { echoable, globalOptions, type Args, type OptionSpec, type OptionSpecs } from "./args.js";
import type { MutationResult } from "./call.js";
import type { OperationKey } from "@convohop/server";
import { UsageError } from "./output.js";
import { uuidOption, type Context } from "./session.js";

/** A convohop command, such as keys issue. */
export interface Command {
  /** The command's words. */
  readonly name: string;
  readonly summary: string;
  /** The usage line after convohop and the name. */
  readonly usage: string;
  readonly options: OptionSpecs;
  /** How many positional arguments it takes. */
  readonly positionals?: number;
  /** Help after the summary. */
  readonly details?: string;
  /** Help that depends on the arguments, such as an operation's. */
  help?(args: Args): string | undefined;
  run(context: Context, args: Args): Promise<void>;
}

export const text = (value: string, description: string): OptionSpec => ({ kind: "string", value, description });
export const flag = (description: string): OptionSpec => ({ kind: "boolean", description });

export function requiredId(args: Args, name: string): string {
  const value = uuidOption(args, name);
  if (value === undefined) throw new UsageError(`--${name} is required`, args.command);
  return value;
}

/** A whole-number option from min to max. */
export function integerOption(args: Args, name: string, fallback: number, min: number, max: number): number {
  const value = args.string(name);
  if (value === undefined) return fallback;
  if (!/^[0-9]{1,9}$/.test(value) || Number(value) < min || Number(value) > max)
    throw new UsageError(`--${name} must be a whole number from ${min} to ${max}`, args.command);
  return Number(value);
}

/** The operation a reply names, read without trusting the reply's shape. */
export function operationRef(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null || !("operation" in payload)) return undefined;
  const operation = payload.operation;
  if (typeof operation !== "object" || operation === null || !("operationId" in operation)) return undefined;
  return typeof operation.operationId === "string" ? operation.operationId : undefined;
}

/** Prints a mutation's result, and how to follow its operation. */
export function printMutation<K extends OperationKey>(context: Context, result: MutationResult<K>): void {
  context.printer.data(result);
  const operationId = result.kind === "reply" ? operationRef(result.payload) : result.resolution.receipt?.operation?.operationId;
  if (operationId) context.printer.note(`Follow it with convohop operation get --operation ${operationId}`);
}

function optionLines(options: OptionSpecs): string[] {
  const labels = Object.entries(options).map(([name, spec]) =>
    [`--${name}${spec.kind === "boolean" ? "" : ` ${spec.value ?? "VALUE"}`}${spec.kind === "list" ? "..." : ""}`,
      spec.description] as const);
  const width = Math.max(...labels.map(([label]) => label.length));
  return labels.map(([label, description]) => `  ${label.padEnd(width)}  ${description}`);
}

export function commandHelp(command: Command): string {
  const lines = [`Usage: convohop ${command.name} ${command.usage}`.trimEnd(), "", command.summary];
  if (command.details) lines.push("", command.details);
  if (Object.keys(command.options).length) lines.push("", "Options:", ...optionLines(command.options));
  lines.push("", "Global options:", ...optionLines(globalOptions));
  return `${lines.join("\n")}\n`;
}

function commandLines(commands: readonly Command[]): string[] {
  const width = Math.max(...commands.map(command => command.name.length));
  return commands.map(command => `  ${command.name.padEnd(width)}  ${command.summary}`);
}

export function overview(commands: readonly Command[]): string {
  return [
    "convohop: the ConvoHop command-line interface for project operators.",
    "",
    "Usage: convohop [--profile NAME] COMMAND [options]",
    "",
    "Commands:",
    ...commandLines(commands),
    "",
    "Credentials come from convohop login, or CONVOHOP_PORTAL_TOKEN or CONVOHOP_PORTAL_TOKEN_FILE for management",
    "commands, and CONVOHOP_BACKEND_KEY or CONVOHOP_BACKEND_KEY_FILE for communication operations. convohop never prints",
    "credentials. Exit codes: 0 success, 1 failure, 2 usage error, 3 unknown outcome, 130 interrupted.",
    "",
    "Run convohop COMMAND --help for a command's options.",
    "",
  ].join("\n");
}

export function groupHelp(group: string, commands: readonly Command[]): string {
  const members = commands.filter(command => command.name.startsWith(`${group} `));
  return ["Usage: convohop " + group + " COMMAND [options]", "", "Commands:", ...commandLines(members), "",
    `Run convohop ${group} COMMAND --help for a command's options.`, ""].join("\n");
}

/** The longest command whose words start argv's words. */
export function findCommand(commands: readonly Command[], words: readonly string[]): Command | undefined {
  let found: Command | undefined;
  for (const command of commands) {
    const parts = command.name.split(" ");
    if (parts.length <= words.length && parts.every((part, index) => words[index] === part) &&
        (found === undefined || parts.length > found.name.split(" ").length)) found = command;
  }
  return found;
}

/** Words safe to repeat in an unknown-command error. */
export function echoWords(words: readonly string[]): string | undefined {
  return words.length > 0 && words.length <= 3 && words.every(word => echoable.test(word)) ? words.join(" ") : undefined;
}
