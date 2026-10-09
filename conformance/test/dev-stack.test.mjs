// conformance/dev-stack.mjs, which starts the dev-stack image in CI: how it parses seed.env, what it exports
// and masks, and its start and logs commands end to end against a scriptable fake docker CLI on PATH.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { DESCRIPTOR, descriptorBindings, parseSeed, planExports, supervisorLines } from "../dev-stack.mjs";
import { readJson } from "../lib/files.mjs";
import { loadSpec } from "../lib/spec.mjs";
import { openTarget, substituteEnvironment } from "../lib/target.mjs";

const SCRIPT = fileURLToPath(new URL("../dev-stack.mjs", import.meta.url));
const FAKE_DOCKER = fileURLToPath(new URL("./fixtures/fake-docker.mjs", import.meta.url));
const IMAGE = "ghcr.io/convohop/dev-stack:main";
const TOKEN = "ghs_fakeJobToken0123456789";
// A seed.env like the image's, with fake values, plus a variable the descriptor does not read.
const SEED = {
  CONVOHOP_DEV_COMMUNICATION_URL: "http://127.0.0.1:18080",
  CONVOHOP_DEV_MANAGEMENT_URL: "http://127.0.0.1:18081",
  CONVOHOP_DEV_PROJECT_ID: "6f1c2d3e-4a5b-4c6d-8e7f-90a1b2c3d4e5",
  CONVOHOP_DEV_INCARNATION: "0e9d8c7b-6a5f-4e3d-9c2b-1a0f9e8d7c6b",
  CONVOHOP_DEV_MANAGEMENT_ACTOR_ID: "5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d",
  CONVOHOP_DEV_BACKEND_KEY: "fake-backend-key-secret",
  CONVOHOP_DEV_BACKEND_KEY_LIMITED: "fake-limited-key-secret",
  CONVOHOP_DEV_BACKEND_KEY_EXPIRED: "fake-expired-key-secret",
  CONVOHOP_DEV_MANAGEMENT_TOKEN: "fake-management-token-secret",
  CONVOHOP_DEV_FUTURE_TOKEN: "fake-unread-token-secret",
};
const { CONVOHOP_DEV_FUTURE_TOKEN: _unread, ...READ } = SEED;
const CREDENTIALS = [SEED.CONVOHOP_DEV_BACKEND_KEY, SEED.CONVOHOP_DEV_BACKEND_KEY_LIMITED,
  SEED.CONVOHOP_DEV_BACKEND_KEY_EXPIRED, SEED.CONVOHOP_DEV_MANAGEMENT_TOKEN];
const seedText = values => Object.entries(values).map(([name, value]) => `${name}=${value}\n`).join("");
const sorted = values => [...values].sort();

let work, bin, runs = 0;
before(async () => {
  work = await mkdtemp(join(tmpdir(), "convohop-dev-stack-"));
  bin = join(work, "bin");
  await mkdir(bin);
  // A shell wrapper runs the fake under this Node binary, whatever PATH holds.
  await writeFile(join(bin, "docker"), `#!/bin/sh\nexec "${process.execPath}" "${FAKE_DOCKER}" "$@"\n`, { mode: 0o755 });
});
after(async () => { await rm(work, { recursive: true, force: true }); });

/** Runs the script with the fake docker first on PATH and only the environment given here (undefined unsets). */
async function devStack(args, { seed = seedText(SEED), fail = [], state, logs, env = {} } = {}) {
  const directory = join(work, `run-${++runs}`);
  await mkdir(directory);
  const calls = join(directory, "calls.jsonl"), githubEnv = join(directory, "github.env");
  await writeFile(githubEnv, "");
  const environment = Object.fromEntries(Object.entries({
    PATH: `${bin}${delimiter}${process.env.PATH}`, CONVOHOP_DEV_STACK_IMAGE: IMAGE, GITHUB_TOKEN: TOKEN,
    GITHUB_ACTOR: "octocat", GITHUB_ENV: githubEnv, FAKE_DOCKER_CALLS: calls, FAKE_DOCKER_SEED: seed,
    FAKE_DOCKER_FAIL: fail.join(","), FAKE_DOCKER_STATE: state && JSON.stringify(state),
    FAKE_DOCKER_LOGS: logs && JSON.stringify(logs), ...env,
  }).filter(([, value]) => value !== undefined));
  const child = spawn(process.execPath, [SCRIPT, ...args], { env: environment, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = "";
  child.stdout.setEncoding("utf8").on("data", chunk => { stdout += chunk; });
  child.stderr.setEncoding("utf8").on("data", chunk => { stderr += chunk; });
  const code = await new Promise((resolve, reject) => { child.once("error", reject); child.once("close", resolve); });
  const recorded = await readFile(calls, "utf8").catch(error => { if (error.code === "ENOENT") return ""; throw error; });
  return { code, stdout, stderr, output: `${stdout}${stderr}`, exported: await readFile(githubEnv, "utf8"),
    calls: recorded.split("\n").filter(Boolean).map(line => JSON.parse(line)) };
}

const masked = result => result.stdout.split("\n").filter(line => line.startsWith("::add-mask::"))
  .map(line => line.slice("::add-mask::".length));

/** Asserts that no seed value or token appears in the output, other than in the commands that mask it. */
function assertShowsNoValues(result) {
  const shown = result.output.split("\n").filter(line => !line.startsWith("::add-mask::")).join("\n");
  for (const value of [...Object.values(SEED), TOKEN]) assert.ok(!shown.includes(value), `the output shows ${value}`);
}

describe("seed.env and the dev-stack descriptor", () => {
  test("seed.env has one NAME=value line per variable; errors name the line or variable, never the value", () => {
    assert.deepEqual(parseSeed("CONVOHOP_DEV_A=x\n\nCONVOHOP_DEV_B=http://127.0.0.1:1/p\n"),
      new Map([["CONVOHOP_DEV_A", "x"], ["CONVOHOP_DEV_B", "http://127.0.0.1:1/p"]]));
    for (const [text, message] of [
      ["CONVOHOP_DEV_A=x\nexport CONVOHOP_DEV_B=secret-value\n", /^seed\.env line 2 is not NAME=value$/],
      ["CONVOHOP_DEV_A=secret-value\nCONVOHOP_DEV_A=secret-value\n", /^seed\.env sets CONVOHOP_DEV_A more than once$/],
      ["CONVOHOP_DEV_A=secret value\n", /^seed\.env has an unexpected value for CONVOHOP_DEV_A: /],
      ["CONVOHOP_DEV_A=secret-value\r\n", /^seed\.env has an unexpected value for CONVOHOP_DEV_A: /],
      ["CONVOHOP_DEV_A=\n", /^seed\.env has an unexpected value for CONVOHOP_DEV_A: /],
      [`CONVOHOP_DEV_A=secret-value${"x".repeat(250)}\n`, /^seed\.env has an unexpected value for CONVOHOP_DEV_A: /],
    ]) {
      assert.throws(() => parseSeed(text), error => message.test(error.message) && !error.message.includes("secret"), text);
    }
  });

  test("each descriptor field reads one variable, as lib/target.mjs substitutes it", async () => {
    const descriptor = await readJson(DESCRIPTOR);
    const bindings = descriptorBindings(descriptor);
    assert.deepEqual(bindings.map(({ name, path }) => [name, path.join(".")]), [
      ["CONVOHOP_DEV_COMMUNICATION_URL", "communicationUrl"], ["CONVOHOP_DEV_MANAGEMENT_URL", "managementUrl"],
      ["CONVOHOP_DEV_PROJECT_ID", "projectId"], ["CONVOHOP_DEV_INCARNATION", "incarnation"],
      ["CONVOHOP_DEV_MANAGEMENT_ACTOR_ID", "managementActorId"], ["CONVOHOP_DEV_BACKEND_KEY", "credentials.backend"],
      ["CONVOHOP_DEV_BACKEND_KEY_LIMITED", "credentials.backendLimited"],
      ["CONVOHOP_DEV_BACKEND_KEY_EXPIRED", "credentials.backendExpired"],
      ["CONVOHOP_DEV_MANAGEMENT_TOKEN", "credentials.management"], ["CONVOHOP_DEV_CONTROL_URL", "control"],
    ]);
    const resolved = substituteEnvironment(descriptor, Object.fromEntries(bindings.map(({ name }) => [name, `${name}-value`])));
    for (const { name, path } of bindings) assert.equal(path.reduce((value, key) => value[key], resolved), `${name}-value`);
  });

  test("start exports what the descriptor reads and masks its credentials and secret-looking names", async () => {
    const plan = planExports(new Map(Object.entries(SEED)), await readJson(DESCRIPTOR));
    assert.deepEqual(new Map(plan.exports), new Map(Object.entries(READ)));
    assert.deepEqual(sorted(plan.masks), sorted(CREDENTIALS));
    assert.deepEqual(plan.missing, ["CONVOHOP_DEV_CONTROL_URL"]);
    assert.deepEqual(plan.unread, ["CONVOHOP_DEV_FUTURE_TOKEN"]);
    const names = ["A_URL", "A_TOKEN", "A_SIGNING_KEY", "KEYRING", "A_PASSWORD_FILE"];
    const custom = planExports(new Map(names.map(name => [name, name.toLowerCase()])),
      Object.fromEntries(names.map(name => [name, `\${env:${name}}`])));
    assert.deepEqual(custom.masks, ["a_token", "a_signing_key", "a_password_file"]);
  });

  test("the logs keep the supervisor's last lines and never a platform line", async () => {
    const log = [
      "2026-10-09T08:00:00.000000001Z [dev-stack] starting cockroach",
      "2026-10-09T08:00:01.5Z [cockroach] [dev-stack] a platform line that quotes the supervisor",
      "[dev-stack] a line without a timestamp",
      "2026-10-09T08:00:02Z convohop-dev-stack: backend exited with status 1",
      "2026-10-09T08:00:03Z [backend] platform output",
      "2026-10-09T08:00:04Z  [dev-stack] after two spaces",
      "backend [dev-stack] after another prefix",
    ];
    assert.deepEqual(await supervisorLines(log), [log[0], log[2], log[3]]);
    const many = Array.from({ length: 50 }, (_, index) => `[dev-stack] line ${index}`);
    assert.deepEqual(await supervisorLines(many), many.slice(-40));
    assert.deepEqual(await supervisorLines(many, 3), many.slice(-3));
  });
});

describe("node conformance/dev-stack.mjs start", () => {
  test("pulls a GHCR image with the job's token, starts it and exports what the descriptor reads", async () => {
    const result = await devStack(["start"]);
    assert.equal(result.code, 0, result.output);
    assert.deepEqual(result.calls.map(call => call.args), [
      ["login", "ghcr.io", "--username", "octocat", "--password-stdin"],
      ["pull", "--quiet", IMAGE],
      ["logout", "ghcr.io"],
      ["run", "--detach", "--name", "convohop-dev-stack", "--network", "host", IMAGE],
      ["exec", "convohop-dev-stack", "convohop-dev-stack", "wait", "--timeout", "900"],
      ["exec", "convohop-dev-stack", "cat", "/run/convohop/dev-stack/seed.env"],
    ]);
    // The token reaches docker only on login's stdin, never in arguments or the environment.
    assert.deepEqual(result.calls.map(call => call.stdin), [TOKEN, null, null, null, null, null]);
    assert.ok(result.calls.every(call => !call.token));
    assert.deepEqual(sorted(masked(result)), sorted(CREDENTIALS));
    assertShowsNoValues(result);
    assert.deepEqual(parseSeed(result.exported), new Map(Object.entries(READ)));
    assert.match(result.stdout, /^seed\.env does not set CONVOHOP_DEV_CONTROL_URL$/m);
    assert.match(result.stdout, /^Not exported, because the descriptor does not read them: CONVOHOP_DEV_FUTURE_TOKEN$/m);

    // The runner resolves the dev-stack target from exactly what start exported.
    const spec = await loadSpec();
    const target = await openTarget(DESCRIPTOR, { validate: spec.validators.target,
      environment: Object.fromEntries(parseSeed(result.exported)) });
    assert.deepEqual(target.descriptor.credentials, { backend: SEED.CONVOHOP_DEV_BACKEND_KEY,
      backendLimited: SEED.CONVOHOP_DEV_BACKEND_KEY_LIMITED, backendExpired: SEED.CONVOHOP_DEV_BACKEND_KEY_EXPIRED,
      management: SEED.CONVOHOP_DEV_MANAGEMENT_TOKEN });
    assert.equal(target.descriptor.projectId, SEED.CONVOHOP_DEV_PROJECT_ID);
    assert.equal(target.descriptor.control, undefined);
  });

  test("sends the token to no other registry, and pulls without it when there is none", async () => {
    for (const env of [{ CONVOHOP_DEV_STACK_IMAGE: `registry.example.test/convohop/dev-stack@sha256:${"a".repeat(64)}` },
      { GITHUB_TOKEN: undefined }]) {
      const result = await devStack(["start"], { env });
      assert.equal(result.code, 0, result.output);
      assert.deepEqual(result.calls.map(call => call.args[0]), ["pull", "run", "exec", "exec"]);
      assert.ok(result.calls.every(call => call.stdin === null && !call.token && !call.args.includes(TOKEN)));
      assert.deepEqual(parseSeed(result.exported), new Map(Object.entries(READ)));
    }
  });

  test("logs out after a failed pull and starts nothing", async () => {
    const result = await devStack(["start"], { fail: ["pull"] });
    assert.equal(result.code, 1);
    assert.deepEqual(result.calls.map(call => call.args[0]), ["login", "pull", "logout"]);
    assert.match(result.stderr, /^dev-stack: pulling the image failed: docker exited with code 1$/m);
    assert.equal(result.exported, "");
  });

  test("exports nothing when the stack is not ready or seed.env is malformed", async () => {
    const notReady = await devStack(["start"], { fail: ["wait"] });
    assert.equal(notReady.code, 1);
    assert.deepEqual(notReady.calls.at(-1).args.slice(2, 4), ["convohop-dev-stack", "wait"]);
    assert.match(notReady.stderr, /^dev-stack: waiting for the dev stack failed: docker exited with code 1$/m);
    assert.equal(notReady.exported, "");

    for (const [seed, message] of [
      [seedText({ ...SEED, CONVOHOP_DEV_MANAGEMENT_TOKEN: "fake management token secret" }),
        /^dev-stack: seed\.env has an unexpected value for CONVOHOP_DEV_MANAGEMENT_TOKEN: /m],
      [`${seedText(SEED)}CONVOHOP_DEV_BACKEND_KEY=${SEED.CONVOHOP_DEV_BACKEND_KEY}\n`,
        /^dev-stack: seed\.env sets CONVOHOP_DEV_BACKEND_KEY more than once$/m],
    ]) {
      const result = await devStack(["start"], { seed });
      assert.equal(result.code, 1);
      assert.match(result.stderr, message);
      assert.equal(result.exported, "");
      assert.deepEqual(masked(result), []);
      assertShowsNoValues(result);
      assert.ok(!result.output.includes("fake management token secret"));
    }
  });

  test("checks its environment and arguments before it runs docker", async () => {
    for (const [env, message] of [
      [{ CONVOHOP_DEV_STACK_IMAGE: undefined }, /^dev-stack: CONVOHOP_DEV_STACK_IMAGE is not set$/m],
      [{ CONVOHOP_DEV_STACK_IMAGE: "--privileged" }, /^dev-stack: CONVOHOP_DEV_STACK_IMAGE is not an image reference/m],
      [{ CONVOHOP_DEV_STACK_IMAGE: `${IMAGE} --privileged` }, /^dev-stack: CONVOHOP_DEV_STACK_IMAGE is not an image reference/m],
      [{ GITHUB_ENV: undefined }, /^dev-stack: GITHUB_ENV is not set/m],
      [{ GITHUB_ACTOR: undefined }, /^dev-stack: GITHUB_ACTOR is not set/m],
    ]) {
      const result = await devStack(["start"], { env });
      assert.equal(result.code, 1, JSON.stringify(env));
      assert.match(result.stderr, message);
      assert.deepEqual(result.calls, []);
    }
    for (const args of [[], ["stop"], ["start", "logs"]]) {
      const result = await devStack(args);
      assert.equal(result.code, 2);
      assert.match(result.stderr, /^Usage: node conformance\/dev-stack\.mjs start\|logs/);
      assert.deepEqual(result.calls, []);
    }
  });
});

describe("node conformance/dev-stack.mjs logs", () => {
  test("shows the container's state and its supervisor's last lines, in order, never the platform's", async () => {
    const logs = [
      ["stdout", "2026-10-09T08:00:00.000000001Z [dev-stack] starting backend"],
      ["stderr", "2026-10-09T08:00:01.000000001Z [backend] a private platform line"],
      ["stderr", "2026-10-09T08:00:02.000000001Z [dev-stack] backend exited with status 1"],
      ["stdout", "2026-10-09T08:00:03.000000001Z [cockroach] another private platform line"],
      ["stdout", "2026-10-09T08:00:04.000000001Z convohop-dev-stack: the stack stopped"],
    ];
    const result = await devStack(["logs"], { state: { Status: "exited", ExitCode: 1, OOMKilled: true }, logs });
    assert.equal(result.code, 0, result.output);
    assert.deepEqual(result.calls.map(call => call.args), [
      ["inspect", "--type", "container", "--format", "{{json .State}}", "convohop-dev-stack"],
      ["logs", "--timestamps", "convohop-dev-stack"],
    ]);
    assert.equal(result.stdout, [
      "Dev-stack container: exited, exit code 1, killed when it ran out of memory",
      "The last 3 lines of the stack's supervisor (the platform's own logs stay private):",
      logs[0][1], logs[2][1], logs[4][1], "",
    ].join("\n"));
    assert.ok(!result.output.includes("private platform line"));
  });

  test("explains a missing container or unreadable logs and never fails", async () => {
    const missing = await devStack(["logs"], { fail: ["inspect"] });
    assert.equal(missing.code, 0);
    assert.deepEqual(missing.calls.map(call => call.args[0]), ["inspect"]);
    assert.match(missing.stdout, /^No dev-stack container to show: inspecting the dev stack failed: docker exited with code 1$/m);

    const unreadable = await devStack(["logs"], { state: { Status: "running", Health: { Status: "starting" } }, fail: ["logs"] });
    assert.equal(unreadable.code, 0);
    assert.equal(unreadable.stdout, ["Dev-stack container: running, health starting", "docker logs exited with code 1",
      "The stack's supervisor wrote no lines.", ""].join("\n"));
  });
});
