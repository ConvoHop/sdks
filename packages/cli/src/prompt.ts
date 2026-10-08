import { createInterface } from "node:readline";
import type { Args } from "./args.js";
import type { CliOperation } from "./generated/operations.js";
import { CliError, UsageError } from "./output.js";
import type { Context } from "./session.js";

/** Reads a line typed at a terminal without showing it. Ctrl-C interrupts; Backspace and Ctrl-U edit. */
export function promptHidden(context: Context, prompt: string): Promise<string> {
  const input = context.stdin;
  context.stderr.write(prompt);
  input.setRawMode?.(true);
  input.resume();
  return new Promise<string>((resolve, reject) => {
    let value = "";
    const finish = (error: CliError | undefined): void => {
      input.removeListener("data", onData);
      input.removeListener("end", onEnd);
      input.removeListener("error", onEnd);
      context.signal.removeEventListener("abort", onAbort);
      input.setRawMode?.(false);
      input.pause();
      context.stderr.write("\n");
      if (error) reject(error);
      else resolve(value);
    };
    const onAbort = (): void => finish(new CliError("Interrupted", 130));
    const onEnd = (): void => finish(new CliError("Standard input closed before Enter was pressed"));
    const onData = (chunk: Buffer | string): void => {
      for (const char of chunk.toString()) {
        if (char === "\r" || char === "\n") return finish(undefined);
        if (char === "\u0003") return finish(new CliError("Interrupted", 130));
        if (char === "\u0004") {
          if (value === "") return finish(new CliError("Nothing was entered"));
        } else if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else if (char === "\u0015") value = "";
        else value += char;
      }
    };
    input.on("data", onData);
    input.once("end", onEnd);
    input.once("error", onEnd);
    if (context.signal.aborted) onAbort();
    else context.signal.addEventListener("abort", onAbort, { once: true });
  });
}

/** Reads one line from standard input; undefined when it ends first. */
export function readLine(context: Context): Promise<string | undefined> {
  const lines = createInterface({ input: context.stdin, terminal: false, crlfDelay: Infinity });
  return new Promise<string | undefined>((resolve, reject) => {
    const finish = (line: string | undefined, error?: CliError): void => {
      context.signal.removeEventListener("abort", onAbort);
      lines.removeAllListeners("line");
      lines.removeAllListeners("close");
      lines.close();
      if (error) reject(error);
      else resolve(line);
    };
    const onAbort = (): void => finish(undefined, new CliError("Interrupted; nothing was sent", 130));
    lines.once("line", line => finish(line));
    lines.once("close", () => finish(undefined));
    if (context.signal.aborted) onAbort();
    else context.signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Asks before a destructive operation, unless --yes is given. Without a terminal to ask at, fails with a usage error
 * so that scripts must pass --yes.
 */
export async function confirm(context: Context, args: Args, operation: CliOperation): Promise<void> {
  if (!operation.destructive || args.flag("yes")) return;
  if (!context.stdin.isTTY)
    throw new UsageError(`${operation.id} is destructive. Pass --yes to run it without a prompt`, args.command);
  context.printer.note(`${operation.id} is destructive: ${operation.summary}`);
  context.stderr.write("Type yes to run it: ");
  const answer = await readLine(context);
  if (answer?.trim() !== "yes") throw new CliError("Cancelled; nothing was sent");
}
