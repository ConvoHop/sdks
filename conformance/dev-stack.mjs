#!/usr/bin/env node
// Starts the ConvoHop dev-stack image for a CI job that runs the conformance scenarios against it, and
// shows why the stack stopped. Every dev-stack job uses it (spec/conformance/targets.md#dev-stack-target):
//
//   node conformance/dev-stack.mjs start  Pulls and starts CONVOHOP_DEV_STACK_IMAGE, waits until it is ready
//                                         and appends the seed.env values that conformance/targets/dev-stack.json
//                                         reads to $GITHUB_ENV, masking the credentials first.
//   node conformance/dev-stack.mjs logs   Prints the container's state and the last lines of the stack's
//                                         supervisor. Never fails, so it suits an `if: failure()` step.
//
// The repository's CI logs are public, so the script never prints a seed value or the platform's own logs.
import { spawn } from "node:child_process";
import { appendFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

export const CONTAINER = "convohop-dev-stack";
export const SEED_FILE = "/run/convohop/dev-stack/seed.env";
export const DESCRIPTOR = fileURLToPath(new URL("./targets/dev-stack.json", import.meta.url));
export const LOG_LINES = 40;
const REGISTRY = "ghcr.io";
const READY_TIMEOUT_SECONDS = 900;
const USAGE = "Usage: node conformance/dev-stack.mjs start|logs (see spec/conformance/targets.md#dev-stack-target)";

const IMAGE = /^[A-Za-z0-9][A-Za-z0-9._\/:@-]{0,511}$/;
const SEED_LINE = /^([A-Z][A-Z0-9_]*)=(.*)$/s;
const SEED_VALUE = /^[A-Za-z0-9_.:\/-]{1,256}$/;
// The `${env:NAME}` references that lib/target.mjs substitutes.
const ENV_REFERENCE = /\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}/g;
const SECRET_NAME = /(?:^|_)(?:KEY|TOKEN|SECRET|PASSWORD)(?:_|$)/;
// `docker logs --timestamps` starts each line with an RFC 3339 time. The supervisor starts its own lines with
// "[dev-stack] " and the CLI its errors with "convohop-dev-stack: "; it starts platform lines with "[<process>] ".
const SUPERVISOR_LINE = /^(?:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z )?(?:\[dev-stack\] |convohop-dev-stack: )/;

export class DevStackError extends Error {
  constructor(message) { super(message); this.name = "DevStackError"; }
}

const print = line => { process.stdout.write(`${line}\n`); };

/** Parses seed.env, one NAME=value line per variable. Errors name the line or variable, never a value. */
export function parseSeed(text) {
  const seed = new Map();
  text.split("\n").forEach((line, index) => {
    if (line === "") return;
    const match = SEED_LINE.exec(line);
    if (!match) throw new DevStackError(`seed.env line ${index + 1} is not NAME=value`);
    const [, name, value] = match;
    if (seed.has(name)) throw new DevStackError(`seed.env sets ${name} more than once`);
    if (!SEED_VALUE.test(value))
      throw new DevStackError(`seed.env has an unexpected value for ${name}: expected 1 to 256 of A-Z a-z 0-9 _ . : / -`);
    seed.set(name, value);
  });
  return seed;
}

/** Each `${env:NAME}` reference in a target descriptor, with the path of the field it sets. */
export function descriptorBindings(descriptor) {
  const bindings = [];
  const visit = (value, path) => {
    if (typeof value === "string") for (const [, name] of value.matchAll(ENV_REFERENCE)) bindings.push({ name, path });
    else if (Array.isArray(value)) value.forEach((item, index) => visit(item, [...path, index]));
    else if (value !== null && typeof value === "object")
      for (const [key, item] of Object.entries(value)) visit(item, [...path, key]);
  };
  visit(descriptor, []);
  return bindings;
}

/**
 * What `start` exports: the seed values the descriptor reads. It masks the descriptor's credentials and
 * any secret-looking name, and reports the variables the descriptor reads that the seed lacks, and the
 * seed variables it does not read, which stay unexported.
 */
export function planExports(seed, descriptor) {
  const bindings = descriptorBindings(descriptor);
  const read = [...new Set(bindings.map(binding => binding.name))];
  const credentials = new Set(bindings.filter(binding => binding.path[0] === "credentials").map(binding => binding.name));
  const exports = read.filter(name => seed.has(name)).map(name => [name, seed.get(name)]);
  return {
    exports,
    masks: exports.filter(([name]) => credentials.has(name) || SECRET_NAME.test(name)).map(([, value]) => value),
    missing: read.filter(name => !seed.has(name)),
    unread: [...seed.keys()].filter(name => !read.includes(name)),
  };
}

/** The last `limit` lines that the stack's supervisor or CLI wrote itself. A platform line never passes. */
export async function supervisorLines(lines, limit = LOG_LINES) {
  const kept = [];
  for await (const line of lines) {
    if (!SUPERVISOR_LINE.test(line)) continue;
    kept.push(line);
    if (kept.length > limit) kept.shift();
  }
  return kept;
}

// Docker never needs the job's token in its environment: `pull` passes it to `docker login` on stdin.
const dockerEnvironment = () => Object.fromEntries(Object.entries(process.env).filter(([name]) => name !== "GITHUB_TOKEN"));

/** Runs docker, streaming its output or capturing stdout. Rejects, naming `what` it was doing, if it fails. */
function docker(args, what, { input, capture = false } = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("docker", args, { env: dockerEnvironment(),
      stdio: [input === undefined ? "ignore" : "pipe", capture ? "pipe" : "inherit", "inherit"] });
    let output = "";
    child.stdout?.setEncoding("utf8").on("data", chunk => { output += chunk; });
    child.once("error", error => reject(new DevStackError(`${what} failed: cannot run docker (${error.code ?? error.message})`)));
    child.once("close", (code, signal) => {
      if (code === 0) resolvePromise(output);
      else reject(new DevStackError(`${what} failed: docker exited with ${code === null ? signal : `code ${code}`}`));
    });
    if (input !== undefined) { child.stdin.on("error", () => {}); child.stdin.end(input); }
  });
}

/** Pulls the image. Only a GHCR image is pulled with the job's token, so no other registry receives it. */
async function pull(image, env) {
  const login = image.startsWith(`${REGISTRY}/`) && Boolean(env.GITHUB_TOKEN);
  if (login) {
    if (!env.GITHUB_ACTOR) throw new DevStackError("GITHUB_ACTOR is not set, so the job cannot log in to ghcr.io");
    await docker(["login", REGISTRY, "--username", env.GITHUB_ACTOR, "--password-stdin"], "logging in to ghcr.io",
      { input: env.GITHUB_TOKEN });
  }
  let failure;
  try { await docker(["pull", "--quiet", image], "pulling the image"); }
  catch (error) { failure = error; }
  // Logging out removes the token from the runner's Docker configuration.
  if (login) await docker(["logout", REGISTRY], "logging out of ghcr.io").catch(error => { failure ??= error; });
  if (failure) throw failure;
}

async function start(env) {
  const image = env.CONVOHOP_DEV_STACK_IMAGE ?? "";
  if (image === "") throw new DevStackError("CONVOHOP_DEV_STACK_IMAGE is not set");
  if (!IMAGE.test(image))
    throw new DevStackError("CONVOHOP_DEV_STACK_IMAGE is not an image reference such as ghcr.io/convohop/dev-stack:main");
  if (!env.GITHUB_ENV) throw new DevStackError("GITHUB_ENV is not set; run this in a GitHub Actions step");
  const descriptor = JSON.parse(await readFile(DESCRIPTOR, "utf8"));

  await pull(image, env);
  // The stack listens only on the container's loopback, which the host network makes the runner's.
  await docker(["run", "--detach", "--name", CONTAINER, "--network", "host", image], "starting the dev stack");
  await docker(["exec", CONTAINER, "convohop-dev-stack", "wait", "--timeout", String(READY_TIMEOUT_SECONDS)],
    "waiting for the dev stack");
  const seed = parseSeed(await docker(["exec", CONTAINER, "cat", SEED_FILE], "reading seed.env", { capture: true }));
  const plan = planExports(seed, descriptor);
  // The keys and tokens are development-only and die with the container; mask them anyway, before any
  // later step can print them.
  for (const value of plan.masks) print(`::add-mask::${value}`);
  await appendFile(env.GITHUB_ENV, plan.exports.map(([name, value]) => `${name}=${value}\n`).join(""));
  print(`Exported for conformance/targets/dev-stack.json: ${plan.exports.map(([name]) => name).join(", ") || "nothing"}`);
  if (plan.missing.length) print(`seed.env does not set ${plan.missing.join(", ")}`);
  if (plan.unread.length) print(`Not exported, because the descriptor does not read them: ${plan.unread.join(", ")}`);
}

/** One line about the container from `docker inspect --format '{{json .State}}'`. */
function describeState(text) {
  let state;
  try { state = JSON.parse(text); } catch { return "unknown state"; }
  if (typeof state?.Status !== "string") return "unknown state";
  const parts = [state.Status];
  if (state.Status === "exited" || state.Status === "dead") parts.push(`exit code ${state.ExitCode}`);
  if (state.OOMKilled === true) parts.push("killed when it ran out of memory");
  if (typeof state.Health?.Status === "string") parts.push(`health ${state.Health.Status}`);
  return parts.join(", ");
}

/** The supervisor's last lines from `docker logs`, read with stderr merged into stdout so they stay in order. */
async function supervisorLog() {
  const child = spawn("sh", ["-c", 'exec docker logs --timestamps "$1" 2>&1', "sh", CONTAINER],
    { env: dockerEnvironment(), stdio: ["ignore", "pipe", "inherit"] });
  const exit = new Promise(resolvePromise => {
    child.once("error", error => resolvePromise(error.code ?? error.message));
    child.once("close", (code, signal) => resolvePromise(code === null ? signal : `code ${code}`));
  });
  const lines = await supervisorLines(createInterface({ input: child.stdout, crlfDelay: Infinity }));
  return { exit: await exit, lines };
}

async function logs() {
  let state;
  try {
    state = await docker(["inspect", "--type", "container", "--format", "{{json .State}}", CONTAINER],
      "inspecting the dev stack", { capture: true });
  } catch (error) {
    print(`No dev-stack container to show: ${error.message}`);
    return;
  }
  print(`Dev-stack container: ${describeState(state)}`);
  const { exit, lines } = await supervisorLog();
  if (exit !== "code 0") print(`docker logs exited with ${exit}`);
  if (lines.length === 0) { print("The stack's supervisor wrote no lines."); return; }
  print(`The last ${lines.length} lines of the stack's supervisor (the platform's own logs stay private):`);
  for (const line of lines) print(line);
}

const COMMANDS = { start, logs };

export async function main(argv, env = process.env) {
  if (argv.length !== 1 || !Object.hasOwn(COMMANDS, argv[0])) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  try {
    await COMMANDS[argv[0]](env);
    return 0;
  } catch (error) {
    if (!(error instanceof DevStackError)) throw error;
    process.stderr.write(`dev-stack: ${error.message}\n`);
    return 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
