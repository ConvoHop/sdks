// The runner CLI end to end: options and setup errors, the full suite through the TypeScript reference
// driver against the mock, a descriptor-file target, and how the runner reports drivers that skip,
// fail, die or change across restarts (via the scriptable fake driver). Needs the built reference driver.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { SCENARIO_DIR, specFile } from "../lib/files.mjs";
import { startMockTarget } from "../mock/server.mjs";
import { run } from "../runner.mjs";

const FAKE = fileURLToPath(new URL("./fixtures/fake-driver.mjs", import.meta.url));
const DEV_STACK = fileURLToPath(new URL("../targets/dev-stack.json", import.meta.url));
const REFERENCE = "convohop-typescript-reference";
const ALL_IDS = readdirSync(SCENARIO_DIR).filter(name => name.endsWith(".json")).sort()
  .flatMap(name => JSON.parse(readFileSync(join(SCENARIO_DIR, name), "utf8")).scenarios.map(scenario => scenario.id));
const VECTORS = JSON.parse(readFileSync(specFile("vectors/webhooks.json"), "utf8")).vectors;
const FEATURES = JSON.parse(readFileSync(specFile("scenario.schema.json"), "utf8")).$defs.feature.enum;
const DEV_STACK_VARIABLES = Object.keys(process.env).filter(name => name.startsWith("CONVOHOP_DEV_"));

const fake = (...args) => [`"${process.execPath}"`, `"${FAKE}"`, ...args].join(" ");
const lines = (text, prefix) => text.split("\n").filter(line => line.startsWith(prefix));
const count = (text, pattern) => text.match(pattern)?.length ?? 0;

let work, runs = 0;
before(async () => { work = await mkdtemp(join(tmpdir(), "convohop-conformance-runner-")); });
after(async () => { await rm(work, { recursive: true, force: true }); });

/** Runs the CLI with captured streams, isolated reports and no CI step summary unless `env` sets one. */
async function cli(args, { env = {} } = {}) {
  const out = [], err = [];
  const reports = join(work, `reports-${++runs}`);
  const environment = { ...process.env, GITHUB_STEP_SUMMARY: "", ...env };
  for (const name of DEV_STACK_VARIABLES) if (!Object.hasOwn(env, name)) delete environment[name];
  const code = await run([...args, "--reports", reports], {
    stdout: { write: text => { out.push(String(text)); return true; } },
    stderr: { write: text => { err.push(String(text)); return true; } },
    env: environment,
  });
  return { code, stdout: out.join(""), stderr: err.join(""), reports, output: `${out.join("")}${err.join("")}` };
}

async function readReports(directory) {
  return { junit: await readFile(join(directory, "junit.xml"), "utf8"),
    summary: JSON.parse(await readFile(join(directory, "summary.json"), "utf8")),
    markdown: await readFile(join(directory, "summary.md"), "utf8") };
}

const results = summary => summary.suites.flatMap(suite => suite.scenarios);

/** Asserts that stdout, JUnit, summary.json and summary.md agree on every scenario's status. */
async function assertConsistent(result) {
  const reports = await readReports(result.reports);
  const scenarios = results(reports.summary);
  const tally = status => scenarios.filter(scenario => scenario.status === status).length;
  const [passed, failed, skipped] = ["passed", "failed", "skipped"].map(tally);
  assert.match(result.stdout, new RegExp(`\\n${passed} passed, ${failed} failed, ${skipped} skipped of ${scenarios.length} scenarios\\n`));
  assert.equal(lines(result.stdout, "PASS ").length, passed);
  assert.equal(lines(result.stdout, "FAIL ").length, failed);
  assert.equal(lines(result.stdout, "SKIP ").length, skipped);
  assert.match(reports.junit, new RegExp(`<testsuites name="ConvoHop conformance" tests="${scenarios.length}" failures="${failed}" errors="0" skipped="${skipped}"`));
  assert.equal(count(reports.junit, /<testcase /g), scenarios.length);
  assert.equal(count(reports.junit, /<failure /g), failed);
  assert.equal(count(reports.junit, /<skipped /g), skipped);
  assert.ok(reports.markdown.includes(`**${passed} passed, ${failed} failed, ${skipped} skipped** of ${scenarios.length} scenarios`));
  for (const scenario of scenarios) {
    if (scenario.status === "passed") assert.ok(lines(result.stdout, `PASS ${scenario.id} (`).length === 1, scenario.id);
    if (scenario.status === "skipped") assert.ok(result.stdout.includes(`SKIP ${scenario.id}: ${scenario.reason}\n`), scenario.id);
    if (scenario.status === "failed") assert.ok(lines(result.stdout, `FAIL ${scenario.id} (`).length === 1, scenario.id);
  }
  return reports;
}

describe("options", () => {
  test("--help prints usage and exits 0", async () => {
    const result = await cli(["--help"]);
    assert.equal(result.code, 0);
    assert.match(result.stdout, /^Usage: node conformance\/runner\.mjs \[options\]\n/);
    assert.match(result.stdout, /Exit codes: 0 all selected scenarios passed/);
    assert.equal(result.stderr, "");
  });

  test("unknown options and positional arguments are usage errors", async () => {
    for (const [args, message] of [[["--bogus"], /^conformance: Unknown option '--bogus'/], [["extra"], /^conformance: Unexpected argument 'extra'/]]) {
      const result = await cli(args);
      assert.equal(result.code, 2, args.join(" "));
      assert.match(result.stderr, message);
      assert.match(result.stderr, /\n\nUsage: node conformance\/runner\.mjs/);
      assert.equal(result.stdout, "");
    }
  });

  test("--list checks and lists the selected scenarios without a target or driver", async () => {
    const all = await cli(["--list", "--driver", "/nonexistent/driver", "--target", "/nonexistent/target.json"]);
    assert.equal(all.code, 0, all.stderr);
    assert.deepEqual(all.stdout.trimEnd().split("\n").map(line => line.split("  ")[0]), ALL_IDS);
    for (const line of all.stdout.trimEnd().split("\n")) assert.match(line, /^[a-z][a-z0-9.-]+ {2}\[[A-Za-z.]+(, [A-Za-z.]+)*\] {2}\S/);

    const some = await cli(["--list", "--filter", "crud", "--filter", "webhooks.*-secret"]);
    assert.equal(some.code, 0, some.stderr);
    assert.deepEqual(some.stdout.trimEnd().split("\n").map(line => line.split("  ")[0]),
      ALL_IDS.filter(id => id.startsWith("crud.") || /^webhooks\..*-secret$/.test(id)));
  });
});

describe("setup errors exit 2 before any scenario runs", () => {
  const assertSetupError = (result, message) => {
    assert.equal(result.code, 2, result.output);
    assert.match(result.stderr, message);
    assert.ok(!/^(PASS|FAIL|SKIP) /m.test(result.stdout), result.stdout);
  };

  test("a filter that selects nothing", async () => {
    assertSetupError(await cli(["--filter", "nothing.matches", "--filter", "crud.nope"]),
      /^conformance: no scenario matches --filter nothing\.matches, crud\.nope\n$/);
  });

  test("an empty, missing or invalid scenario directory", async () => {
    const empty = join(work, "empty-scenarios");
    await mkdir(empty);
    assertSetupError(await cli(["--scenarios", empty]), /contains no \*\.json scenario files/);
    assertSetupError(await cli(["--scenarios", join(work, "missing-scenarios")]),
      /^conformance: scenario definitions are invalid:\n {2}cannot read .*missing-scenarios: ENOENT/);

    const invalid = join(work, "invalid-scenarios");
    await mkdir(invalid);
    await writeFile(join(invalid, "alpha.json"), JSON.stringify({ suite: "beta", title: "Mismatched", scenarios: [
      { id: "beta.one", title: "One", covers: ["crud"], steps: [{ do: "sleep", ms: 1 }] }] }));
    assertSetupError(await cli(["--scenarios", invalid]),
      /^conformance: scenario definitions are invalid:\n {2}alpha\.json: suite must be "alpha" to match the file name/);
  });

  test("a missing or invalid target descriptor", async () => {
    const missing = join(work, "missing-target.json");
    assertSetupError(await cli(["--target", missing, "--filter", "crud"]), new RegExp(`^conformance: cannot read target ${missing.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")}: `));
    const invalid = join(work, "invalid-target.json");
    const id = "00000000-0000-4000-8000-000000000001";
    await writeFile(invalid, JSON.stringify({ name: "x", communicationUrl: "http://127.0.0.1:9", projectId: id, incarnation: id,
      capabilities: ["control.reset"] }));
    assertSetupError(await cli(["--target", invalid, "--filter", "crud"]), /^conformance: target declares control\.reset but no control URL\n$/);
    await writeFile(invalid, JSON.stringify({ name: "x", communicationUrl: "http://127.0.0.1:9", projectId: "p", incarnation: id }));
    assertSetupError(await cli(["--target", invalid, "--filter", "crud"]),
      /^conformance: target descriptor is invalid: \/projectId must match \^\[0-9a-f\]\{8\}-/);
  });

  test("the dev-stack descriptor without its environment", async () => {
    assertSetupError(await cli(["--target", DEV_STACK, "--filter", "crud"]),
      /^conformance: target descriptor is invalid: \/ must have property "communicationUrl"; \/ must have property "projectId"; \/ must have property "incarnation"\n$/);
  });

  test("an unparsable or failing driver command", async () => {
    assertSetupError(await cli(["--driver", "node 'driver.mjs", "--filter", "crud"]), /^conformance: --driver: the command has an unterminated quote\n$/);
    assertSetupError(await cli(["--fixture-driver", " ", "--filter", "crud"]), /^conformance: --fixture-driver: the command is empty\n$/);
    assertSetupError(await cli(["--driver", join(work, "no-such-driver"), "--filter", "crud"]),
      /^conformance: driver handshake failed: driver process failed: .*ENOENT/);
    assertSetupError(await cli(["--driver", fake("--on", "hello=exit", "--stderr", "'cannot load the SDK'"), "--filter", "crud"]),
      /^conformance: driver handshake failed: driver exited \(code 3, signal none\)\n--- driver stderr ---\ncannot load the SDK\nfake driver exits during hello\n$/);
  });

  test("a failed handshake does not reveal the target's credentials", async () => {
    assertSetupError(await cli(["--driver", fake("--on", "hello=exit", "--stderr", "'debug: backend key mock-backend-key-full'"), "--filter", "crud"]),
      /^conformance: driver handshake failed: driver exited \(code 3, signal none\)\n--- driver stderr ---\ndebug: backend key \[redacted\]\nfake driver exits during hello\n$/);
  });

  test("a fixture driver that fails its handshake", async () => {
    assertSetupError(await cli(["--driver", fake("--roles", "user"), "--fixture-driver", fake("--protocol-version", "2"), "--filter", "crud"]),
      /^conformance: driver handshake failed: driver selected protocol version 2, which was not offered\n$/);
  });
});

describe("the TypeScript reference driver against the mock", () => {
  test("declares every driver feature and passes every scenario with --strict", async () => {
    const result = await cli(["--strict"]);
    assert.equal(result.code, 0, result.output);
    assert.equal(result.stderr, "");
    const [driverLine, targetLine] = result.stdout.split("\n");
    assert.match(driverLine, new RegExp(`^driver ${REFERENCE} \\S+ \\(typescript; roles user, backend, management; features \\S`));
    assert.match(targetLine, /^target mock:mock \(capabilities \S/);
    assert.ok(!result.stdout.includes("fixture driver"), "the reference driver serves every role");

    const { summary } = await assertConsistent(result);
    assert.deepEqual(results(summary).map(scenario => scenario.id), ALL_IDS);
    assert.equal(summary.driver.name, REFERENCE);
    assert.deepEqual([...summary.driver.features].sort(), [...FEATURES].sort());
    assert.equal(summary.fixtureDriver, null);
    assert.equal(summary.target.kind, "mock");
    assert.deepEqual(results(summary).filter(scenario => scenario.status !== "passed").map(scenario => scenario.id), []);
  });

  test("--strict turns skips into failure and appends the CI step summary", async () => {
    const stepSummary = join(work, "step-summary.md");
    await writeFile(stepSummary, "previous step\n");
    const result = await cli(["--driver", fake(), "--fixture-driver", "none", "--strict", "--filter", "webhooks.valid-single-secret"],
      { env: { GITHUB_STEP_SUMMARY: stepSummary } });
    assert.equal(result.code, 1, result.output);
    assert.match(result.stdout, /\nSKIP webhooks\.valid-single-secret: driver fake-driver does not declare feature webhooks\.verify\n/);
    assert.match(result.stdout, /\n--strict: skipped scenarios count as failures\n$/);
    const appended = await readFile(stepSummary, "utf8");
    assert.ok(appended.startsWith("previous step\n## ConvoHop conformance\n"), appended);
    assert.match(appended, /\| `webhooks\.valid-single-secret` \| driver fake-driver does not declare feature webhooks\.verify \|/);
  });
});

describe("a descriptor-file target", () => {
  let mock;
  before(async () => { mock = await startMockTarget({ host: "127.0.0.1" }); });
  after(async () => { await mock?.close(); });

  test("the dev-stack descriptor runs against any target its environment points at", async () => {
    const { descriptor } = mock;
    const env = { CONVOHOP_DEV_COMMUNICATION_URL: descriptor.communicationUrl, CONVOHOP_DEV_MANAGEMENT_URL: descriptor.managementUrl,
      CONVOHOP_DEV_PROJECT_ID: descriptor.projectId, CONVOHOP_DEV_INCARNATION: descriptor.incarnation,
      CONVOHOP_DEV_MANAGEMENT_ACTOR_ID: descriptor.managementActorId, CONVOHOP_DEV_BACKEND_KEY: descriptor.credentials.backend,
      CONVOHOP_DEV_MANAGEMENT_TOKEN: descriptor.credentials.management };
    const result = await cli(["--target", DEV_STACK, "--filter", "auth", "--filter", "crud"], { env });
    assert.equal(result.code, 0, result.output);
    assert.match(result.stdout, /\ntarget file:dev-stack \(capabilities none\)\n/);
    const { summary } = await assertConsistent(result);
    assert.equal(summary.target.kind, "file");
    const skipped = results(summary).filter(scenario => scenario.status === "skipped");
    assert.ok(skipped.length > 0 && skipped.length < results(summary).length);
    for (const scenario of skipped)
      assert.match(scenario.reason, /^target (does not provide credentials\.backend(Limited|Expired)|lacks capability [\w.]+)(; |$)/, scenario.id);
    for (const id of ["crud.conversations.create-and-get", "auth.backend-key.accepted", "auth.management.invalid-credential"])
      assert.equal(results(summary).find(scenario => scenario.id === id)?.status, "passed", id);
  });
});

describe("drivers under test", () => {
  const webhookArgs = ["--fixture-driver", "none", "--filter", "webhooks"];

  test("a driver that verifies webhooks like the reference passes every vector, even with --strict", async () => {
    const result = await cli(["--driver", fake("--features", "webhooks.verify"), ...webhookArgs, "--strict"]);
    assert.equal(result.code, 0, result.output);
    assert.match(result.stdout, /^driver fake-driver 0\.0\.0 \(javascript; roles user; features webhooks\.verify\)\n/);
    const { summary } = await assertConsistent(result);
    assert.equal(results(summary).length, VECTORS.length);
    assert.ok(results(summary).every(scenario => scenario.status === "passed"));
    assert.equal(summary.fixtureDriver, null);
  });

  test("a driver that accepts every signature fails exactly the invalid vectors", async () => {
    const result = await cli(["--driver", fake("--features", "webhooks.verify", "--on", "webhooks.verify=valid"), ...webhookArgs]);
    assert.equal(result.code, 1, result.output);
    const { summary, junit } = await assertConsistent(result);
    const failed = results(summary).filter(scenario => scenario.status === "failed").map(scenario => scenario.id).sort();
    assert.deepEqual(failed, VECTORS.filter(vector => !vector.expected.valid).map(vector => `webhooks.${vector.id}`).sort());
    const wrongSecret = VECTORS.find(vector => vector.id === "wrong-secret");
    assert.ok(result.stdout.includes(`FAIL webhooks.wrong-secret (`));
    assert.ok(result.stdout.includes(`  step 1 (webhooks.verify): vector wrong-secret (${wrongSecret.title}) expected ` +
      `{"valid":false,"code":"${wrongSecret.expected.code}"} but the driver returned {"valid":true,"code":null}\n`));
    assert.match(junit, /<failure message="step 1 \(webhooks\.verify\): vector wrong-secret [^"]*" type="webhooks\.verify">/);
  });

  test("roles the driver under test lacks are served by the fixture driver", async () => {
    const result = await cli(["--driver", fake("--roles", "user"), "--filter", "crud"]);
    assert.equal(result.code, 0, result.output);
    assert.match(result.stdout, new RegExp(`\\nfixture driver ${REFERENCE} \\S+ serves roles the driver under test lacks\\n`));
    const { summary } = await assertConsistent(result);
    assert.equal(summary.fixtureDriver.name, REFERENCE);
    assert.deepEqual(summary.driver.roles, ["user"]);
    for (const scenario of results(summary)) {
      assert.equal(scenario.status, "skipped", scenario.id);
      assert.match(scenario.reason, /^(driver fake-driver does not implement [\w.]+ for user clients|it only uses backend clients, which the driver under test does not declare)(; |$)/, scenario.id);
    }
  });

  test("one scenario can drive the fixture driver's clients and the driver under test's features", async () => {
    const directory = join(work, "mixed-scenarios");
    await mkdir(directory);
    await writeFile(join(directory, "mixed.json"), JSON.stringify({ suite: "mixed", title: "Mixed drivers", scenarios: [
      { id: "mixed.fixture-then-primary", title: "Backend steps on the fixture, verification on the primary", covers: ["webhooks.signature"], steps: [
        { do: "client.create", client: "backend", role: "backend", credential: "${target.credentials.backend}" },
        { do: "invoke", client: "backend", operation: "principals.create", args: { externalUserId: "mixed-${nonce}" },
          expect: { value: { principalId: { $type: "uuid" } } } },
        { do: "webhooks.verify", vector: "wrong-secret" }] }] }));
    const result = await cli(["--driver", fake("--roles", "user", "--features", "webhooks.verify"), "--scenarios", directory, "--strict"]);
    assert.equal(result.code, 0, result.output);
    const { summary } = await assertConsistent(result);
    assert.equal(summary.fixtureDriver.name, REFERENCE);
    assert.equal(results(summary)[0].status, "passed");
  });

  test("without a fixture driver, scenarios needing undeclared roles skip", async () => {
    const result = await cli(["--driver", fake("--roles", "user"), "--fixture-driver", "none", "--filter", "crud"]);
    assert.equal(result.code, 0, result.output);
    assert.ok(!result.stdout.includes("fixture driver"));
    const { summary } = await assertConsistent(result);
    for (const scenario of results(summary)) assert.match(scenario.reason, /^no driver declares the backend role(; |$)/, scenario.id);
  });

  test("a driver that dies during a scenario fails that scenario and is restarted for the next", async () => {
    const startFile = join(work, "starts-recover");
    const result = await cli(["--driver", fake("--features", "webhooks.verify", "--on", "reset=exit-first-start", "--start-file", `"${startFile}"`),
      "--fixture-driver", "none", "--filter", "webhooks.valid-single-secret", "--filter", "webhooks.wrong-secret"]);
    assert.equal(result.code, 1, result.output);
    assert.match(result.stdout, /\nFAIL webhooks\.valid-single-secret \(\d+ ms\)\n {2}preparing the scenario failed: driver exited \(code 3, signal none\)\n {2}\(driver fake-driver died; stderr:\n {2}fake driver exits during reset\)\nPASS webhooks\.wrong-secret \(/);
    await assertConsistent(result);
    assert.equal(readFileSync(startFile, "utf8"), "2");
  });

  test("a driver that changes its declaration when restarted is unusable for the rest of the run", async () => {
    const startFile = join(work, "starts-vary");
    const result = await cli(["--driver", fake("--features", "webhooks.verify", "--on", "reset=exit", "--vary-on-restart", "--start-file", `"${startFile}"`),
      "--fixture-driver", "none", "--filter", "webhooks.valid-single-secret", "--filter", "webhooks.wrong-secret", "--filter", "webhooks.tampered-payload"]);
    assert.equal(result.code, 1, result.output);
    const { summary } = await assertConsistent(result);
    const [first, ...rest] = results(summary);
    assert.match(first.failure.message, /^preparing the scenario failed: driver exited \(code 3, signal none\)/);
    for (const scenario of rest)
      assert.equal(scenario.failure.message, "driver fake-driver is unusable: it died and could not be restarted: " +
        "the restarted driver declared different roles, operations or features");
    assert.equal(readFileSync(startFile, "utf8"), "2", "an unusable driver is not restarted again");
  });
});

describe("reports", () => {
  const probe = {
    suite: "probe",
    title: "Runner probes",
    scenarios: [
      { id: "probe.passes", title: "A backend client creates a principal", covers: ["crud"], steps: [
        { do: "client.create", client: "backend", role: "backend", credential: "${target.credentials.backend}" },
        { do: "invoke", client: "backend", operation: "principals.create", args: { externalUserId: "probe-${nonce}" },
          expect: { value: { principalId: { $type: "uuid" } } } }] },
      { id: "probe.leaks", title: "A failure that would <echo> bearer material & markup", covers: ["auth.userToken"], steps: [
        { do: "client.create", client: "backend", role: "backend", credential: "${target.credentials.backend}" },
        { do: "invoke", client: "backend", operation: "principals.create", args: { externalUserId: "probe-${nonce}" }, save: "alice" },
        { do: "invoke", client: "backend", operation: "sessions.issue",
          args: { principalId: "${saved.alice.principalId}", deviceId: "${uuid.device}" },
          expect: { value: { sessionToken: "${target.credentials.backend}" } } }] },
    ],
  };

  test("failures are reported consistently with bearer material redacted everywhere", async () => {
    const directory = join(work, "probe-scenarios");
    await mkdir(directory);
    await writeFile(join(directory, "probe.json"), JSON.stringify(probe));
    const stepSummary = join(work, "probe-step-summary.md");
    const result = await cli(["--scenarios", directory], { env: { GITHUB_STEP_SUMMARY: stepSummary } });
    assert.equal(result.code, 1, result.output);
    const { junit, summary, markdown } = await assertConsistent(result);
    assert.deepEqual(results(summary).map(scenario => [scenario.id, scenario.status]), [["probe.passes", "passed"], ["probe.leaks", "failed"]]);

    const failure = results(summary)[1].failure;
    assert.equal(failure.step, 3);
    assert.equal(failure.do, "invoke");
    assert.match(failure.message, /^sessions\.issue returned an unexpected value:\n {2}/);
    assert.ok(failure.message.includes("[redacted]"), failure.message);
    assert.match(junit, /<testcase classname="conformance\.probe" name="probe\.leaks" time="\d+\.\d{3}">\n {6}<failure message="step 3 \(invoke\): sessions\.issue returned an unexpected value:" type="invoke"><!\[CDATA\[A failure that would <echo> bearer material & markup\nstep 3 \(invoke\): /);
    assert.match(markdown, /\n### Failures\n\n\| Scenario \| Failure \|\n\| --- \| --- \|\n\| `probe\.leaks` \| step 3 \(invoke\): sessions\.issue returned an unexpected value: /);

    const everything = [result.output, junit, JSON.stringify(summary), markdown, await readFile(stepSummary, "utf8")].join("\n");
    for (const secret of ["mock-session.", "mock-backend-key-full"]) assert.ok(!everything.includes(secret), `${secret} leaked`);
  });

  /** Asserts the reports agree and that none of `secrets` appears in any output or report. */
  async function assertRedacted(result, secrets) {
    const { junit, summary, markdown } = await assertConsistent(result);
    const everything = [result.output, junit, JSON.stringify(summary), markdown].join("\n");
    for (const secret of secrets) assert.ok(!everything.includes(secret), `${secret} leaked`);
    return results(summary);
  }

  test("a dead driver's stderr does not reveal credentials from earlier scenarios", async () => {
    const directory = join(work, "echo-scenarios");
    await mkdir(directory);
    const [earlier, later] = ["earlier-user-credential", "later-user-credential"];
    await writeFile(join(directory, "echo.json"), JSON.stringify({ suite: "echo", title: "Credential echo", scenarios: [
      { id: "echo.create", title: "The driver logs the credential it is given", covers: ["auth.userToken"], steps: [
        { do: "client.create", client: "alice", role: "user", credential: earlier, principalId: "${uuid.alice}" }] },
      { id: "echo.dies", title: "The driver logs another credential and dies", covers: ["auth.userToken"], steps: [
        { do: "client.create", client: "bob", role: "user", credential: later, principalId: "${uuid.bob}" },
        { do: "client.close", client: "bob" }] }] }));
    const result = await cli(["--driver", fake("--echo-credentials", "--on", "client.close=exit"), "--fixture-driver", "none",
      "--scenarios", directory]);
    assert.equal(result.code, 1, result.output);
    const [created, died] = await assertRedacted(result, [earlier, later]);
    assert.equal(created.status, "passed");
    assert.deepEqual(died.failure, { step: 2, do: "client.close", message: "driver exited (code 3, signal none)\n" +
      "(driver fake-driver died; stderr:\nclient.create credential [redacted]\nclient.create credential [redacted]\n" +
      "fake driver exits during client.close)" });
  });

  test("an unusable driver's restart failure does not reveal credentials", async () => {
    const startFile = join(work, "starts-unusable");
    const driver = fake("--features", "webhooks.verify", "--stderr", "'debug: backend key mock-backend-key-full'",
      "--on", "reset=exit", "--on", "hello=exit-on-restart", "--start-file", `"${startFile}"`);
    const result = await cli(["--driver", driver, "--fixture-driver", "none",
      "--filter", "webhooks.valid-single-secret", "--filter", "webhooks.wrong-secret"]);
    assert.equal(result.code, 1, result.output);
    const [died, unusable] = await assertRedacted(result, ["mock-backend-key-full"]);
    assert.equal(died.failure.message, "preparing the scenario failed: driver exited (code 3, signal none)\n" +
      "(driver fake-driver died; stderr:\ndebug: backend key [redacted]\nfake driver exits during reset)");
    assert.equal(unusable.failure.message, "driver fake-driver is unusable: it died and could not be restarted: " +
      "driver handshake failed: driver exited (code 3, signal none)\n--- driver stderr ---\n" +
      "debug: backend key [redacted]\nfake driver exits during hello");
    assert.equal(readFileSync(startFile, "utf8"), "2");
  });
});
