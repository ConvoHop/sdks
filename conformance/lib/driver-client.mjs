// Runner side of the driver protocol (spec/conformance/driver-protocol.md): one child process,
// NDJSON over stdio, strictly validated responses and fatal handling of protocol violations.
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { setTimeout as delay } from "node:timers/promises";
import { compileDefinition, formatErrors } from "./json-schema.mjs";

/** The driver answered with a protocol error ({"error": {...}}). */
export class DriverProtocolError extends Error {
  constructor(method, code, message) {
    super(`${method} returned protocol error ${code}: ${message}`);
    this.name = "DriverProtocolError"; this.method = method; this.code = code;
  }
}

/** The driver broke the protocol, crashed or hung; it is unusable and must be restarted. */
export class DriverFailure extends Error {
  constructor(message) { super(message); this.name = "DriverFailure"; }
}

/** One response had a result of the wrong shape; the step fails but the driver stays usable. */
export class DriverResultError extends Error {
  constructor(message) { super(message); this.name = "DriverResultError"; }
}

const RESULTS = Object.freeze({ hello: "helloResult", "client.create": "emptyResult", "client.close": "emptyResult",
  invoke: "invokeResult", "realtime.subscribe": "subscribeResult", "realtime.collect": "collectResult",
  "realtime.close": "emptyResult", "webhooks.verify": "verifyResult", reset: "emptyResult", shutdown: "emptyResult" });

export function protocolValidators(schema) {
  return { response: compileDefinition(schema, "response"),
    results: Object.fromEntries(Object.entries(RESULTS).map(([method, name]) => [method, compileDefinition(schema, name)])) };
}

/** Splits a driver command line (no shell). Quotes group words; a leading `node` means this Node binary. */
export function parseCommand(text) {
  const tokens = [];
  let current = "", quote, started = false;
  for (const char of text) {
    if (quote) { if (char === quote) quote = undefined; else current += char; continue; }
    if (char === "\"" || char === "'") { quote = char; started = true; continue; }
    if (/\s/.test(char)) { if (started) { tokens.push(current); current = ""; started = false; } continue; }
    current += char; started = true;
  }
  if (quote) throw new Error("the command has an unterminated quote");
  if (started) tokens.push(current);
  if (!tokens.length) throw new Error("the command is empty");
  if (tokens[0] === "node") tokens[0] = process.execPath;
  return tokens;
}

export class DriverClient {
  #child; #validators; #pending = new Map(); #nextId = 1; #dead; #stderr = []; #closed; #hasClosed = false;

  constructor(command, { validators, cwd = process.cwd(), env = process.env }) {
    this.command = command;
    this.#validators = validators;
    const child = spawn(command[0], command.slice(1), { cwd, env, stdio: ["pipe", "pipe", "pipe"], shell: false, windowsHide: true });
    this.#child = child;
    let markClosed;
    this.#closed = new Promise(resolve => { markClosed = resolve; });
    const closed = error => {
      this.#die(error);
      if (this.#hasClosed) return;
      this.#hasClosed = true;
      markClosed();
    };
    child.once("close", (code, signal) =>
      closed(new DriverFailure(`driver exited (code ${code ?? "none"}, signal ${signal ?? "none"})`)));
    child.once("error", error => {
      const failure = new DriverFailure(`driver process failed: ${error.message}`);
      // A process that never spawned emits no reliable "close"; one that did will still close normally.
      if (child.pid === undefined) closed(failure); else this.#die(failure);
    });
    child.stdin.on("error", () => {});
    createInterface({ input: child.stdout, crlfDelay: Infinity }).on("line", line => this.#onLine(line));
    createInterface({ input: child.stderr, crlfDelay: Infinity }).on("line", line => {
      this.#stderr.push(line);
      if (this.#stderr.length > 200) this.#stderr.shift();
    });
  }

  get alive() { return this.#dead === undefined; }

  stderrTail(lines = 20) { return this.#stderr.slice(-lines).join("\n"); }

  #die(error) {
    if (this.#dead) return;
    this.#dead = error;
    for (const pending of this.#pending.values()) { clearTimeout(pending.timer); pending.reject(error); }
    this.#pending.clear();
  }

  #fatal(message) {
    this.#die(new DriverFailure(message));
    if (!this.#hasClosed) this.#child.kill("SIGKILL");
  }

  #onLine(line) {
    if (this.#dead || !line.trim()) return;
    let message;
    try { message = JSON.parse(line); }
    catch { this.#fatal(`driver wrote non-JSON to stdout: ${line.slice(0, 200)}`); return; }
    const errors = this.#validators.response(message);
    if (errors.length) { this.#fatal(`driver wrote an invalid response: ${formatErrors(errors)}`); return; }
    const pending = this.#pending.get(message.id);
    if (!pending) { this.#fatal(`driver answered unknown request id ${JSON.stringify(message.id)}`); return; }
    this.#pending.delete(message.id);
    clearTimeout(pending.timer);
    if (message.error) { pending.reject(new DriverProtocolError(pending.method, message.error.code, message.error.message)); return; }
    const resultErrors = this.#validators.results[pending.method]?.(message.result) ?? [];
    if (resultErrors.length) pending.reject(new DriverResultError(`${pending.method} result is invalid: ${formatErrors(resultErrors)}`));
    else pending.resolve(message.result);
  }

  request(method, params = {}, { timeoutMs = 60_000 } = {}) {
    if (this.#dead) return Promise.reject(this.#dead);
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.#fatal(`driver did not answer ${method} within ${timeoutMs} ms`), timeoutMs);
      this.#pending.set(id, { method, resolve, reject, timer });
      this.#child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
    });
  }

  /** Introduces the runner and returns the driver's declaration. */
  async hello(runner) {
    return this.request("hello", { runner }, { timeoutMs: 30_000 });
  }

  /** Asks the driver to exit, then kills it if it does not. */
  async shutdown() {
    if (!this.#dead) { try { await this.request("shutdown", {}, { timeoutMs: 5000 }); } catch { /* exiting anyway */ } }
    if (!this.#hasClosed) this.#child.stdin.end();
    // Unreferenced so the grace period never keeps the runner alive after the driver has exited.
    const grace = () => delay(5000, undefined, { ref: false });
    await Promise.race([this.#closed, grace()]);
    if (!this.#hasClosed) { this.#child.kill("SIGKILL"); await Promise.race([this.#closed, grace()]); }
  }
}

/** Starts a driver and completes `hello`; on failure the process is cleaned up and the error carries stderr. */
export async function startDriver(command, { validators, runner, cwd, env }) {
  const driver = new DriverClient(command, { validators, cwd, env });
  try {
    const hello = await driver.hello(runner);
    return { driver, hello };
  } catch (error) {
    await driver.shutdown();
    const tail = driver.stderrTail(10);
    const reason = error instanceof Error ? error.message : String(error);
    throw new DriverFailure(`driver handshake failed: ${reason}${tail ? `\n--- driver stderr ---\n${tail}` : ""}`);
  }
}
