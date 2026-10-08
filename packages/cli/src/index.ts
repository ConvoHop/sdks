import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { leadingOptions, parseArgs } from "./args.js";
import { authCommands } from "./auth.js";
import { commandHelp, echoWords, findCommand, groupHelp, overview, type Command } from "./command.js";
import { ConfigFiles, configDirectory, type Environment } from "./config.js";
import { runCommand, type CommandRunner } from "./credentials.js";
import { callCommand } from "./invoke.js";
import { keyCommands } from "./keys.js";
import { CliError, Printer, UsageError, type TextOutput } from "./output.js";
import { projectCommands } from "./projects.js";
import { abortableFetch, type Context, type InputStream } from "./session.js";
import { webhookCommands } from "./webhooks.js";

export type { CommandResult, CommandRunner } from "./credentials.js";
export type { InputStream } from "./session.js";
export type { TextOutput } from "./output.js";
export { REDACTED, redact, redactedFields } from "./output.js";
export {
  cliOperations, cliScopes, cliTypes, withheldOperations, type CliInputField, type CliOperation, type CliType,
} from "./generated/operations.js";

const commands: readonly Command[] = [...authCommands, ...projectCommands, ...keyCommands, ...webhookCommands, callCommand];
const groups = new Set(commands.flatMap(command => command.name.includes(" ") ? [command.name.split(" ")[0] ?? ""] : []));

/** What run reads and writes. Each defaults to the process's own. */
export interface RunOptions {
  /** The arguments after convohop. */
  readonly argv: readonly string[];
  readonly env?: Environment;
  readonly stdin?: InputStream;
  readonly stdout?: TextOutput;
  readonly stderr?: TextOutput;
  readonly fetch?: typeof fetch;
  /** Aborting it interrupts the command, as Ctrl-C does. */
  readonly signal?: AbortSignal;
  readonly platform?: NodeJS.Platform;
  /** Runs the OS credential store tools: security on macOS, secret-tool on Linux. */
  readonly runCommand?: CommandRunner;
  /** Waits between polls and retries. */
  readonly sleep?: (milliseconds: number) => Promise<void>;
  readonly now?: () => Date;
}

function packageVersion(): string {
  const manifest: unknown = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const version = manifest !== null && typeof manifest === "object" && "version" in manifest ? manifest.version : undefined;
  if (typeof version !== "string") throw new TypeError("The @convohop/cli package manifest has no version");
  return version;
}

async function dispatch(context: Context, argv: readonly string[]): Promise<void> {
  const { options, rest } = leadingOptions(argv);
  const asked = rest[0] === "help";
  const words = asked ? rest.slice(1) : rest;
  const command = findCommand(commands, words);
  if (command === undefined) {
    const first = words[0];
    if (first === undefined || first.startsWith("-")) {
      if (!asked && words.length === 0 && options.length === 1 && options[0] === "--version") {
        context.printer.text(`${packageVersion()}\n`);
        return;
      }
      parseArgs([...options, ...words], {}, "");
      context.printer.text(overview(commands));
      return;
    }
    if (groups.has(first) && (words[1] === undefined || words[1].startsWith("-"))) {
      parseArgs([...options, ...words.slice(1)], {}, first);
      context.printer.text(groupHelp(first, commands));
      return;
    }
    const end = words.findIndex(word => word.startsWith("-"));
    const echo = echoWords(end === -1 ? words : words.slice(0, end));
    throw new UsageError(echo === undefined ? "Unknown command" : `Unknown command ${echo}`);
  }
  const args = parseArgs([...options, ...words.slice(command.name.split(" ").length)], command.options, command.name,
    command.positionals ?? 0);
  if (asked || args.flag("help")) {
    context.printer.text(command.help?.(args) ?? commandHelp(command));
    return;
  }
  await command.run(context, args);
}

/**
 * Runs convohop with argv, as the convohop binary does, and returns its exit code: 0 success, 1 failure, 2 usage error,
 * 3 unknown outcome and 130 interrupted. Output never contains a credential.
 */
export async function run(options: RunOptions): Promise<number> {
  const env = options.env ?? process.env, platform = options.platform ?? process.platform;
  const stdout = options.stdout ?? process.stdout, stderr = options.stderr ?? process.stderr;
  const signal = options.signal ?? new AbortController().signal, sleep = options.sleep;
  const printer = new Printer(stdout, stderr);
  const context: Context = {
    env, printer, stdin: options.stdin ?? process.stdin, stdout, stderr, signal, platform,
    fetch: abortableFetch(options.fetch ?? globalThis.fetch, signal),
    runCommand: options.runCommand ?? runCommand,
    sleep: sleep === undefined ? milliseconds => delay(milliseconds, undefined, { signal }) : async milliseconds => {
      signal.throwIfAborted();
      await sleep(milliseconds);
      signal.throwIfAborted();
    },
    now: options.now ?? (() => new Date()),
    files: new ConfigFiles(configDirectory(env, platform), platform),
  };
  try {
    await dispatch(context, options.argv);
    return 0;
  } catch (error) {
    if (signal.aborted && !(error instanceof CliError)) {
      printer.note("convohop: Interrupted");
      return 130;
    }
    return printer.error(error);
  }
}
