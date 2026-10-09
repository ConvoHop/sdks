// The React Native driver runs the reference driver's protocol loop with its own SDK module in a Node process that
// emulates React Native (conformance/drivers/react-native). It must declare the reference's user operations, refuse
// what it doesn't declare, and pass scenarios that restore clients from its asynchronous storage. This is a quick
// check: .github/workflows/react-native.yml runs every scenario through the driver.
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, test } from "node:test";
import { FEATURES, OPERATIONS } from "../drivers/ts/dist/sdk.mjs";
import { DriverProtocolError, startDriver } from "../lib/driver-client.mjs";
import { RUNNER } from "../lib/files.mjs";
import { loadSpec } from "../lib/spec.mjs";
import { run } from "../runner.mjs";

const DRIVER = fileURLToPath(new URL("../drivers/react-native/driver.mjs", import.meta.url));
const version = async name => JSON.parse(await readFile(new URL(`../../packages/${name}/package.json`, import.meta.url), "utf8")).version;

let spec, work;
before(async () => {
  spec = await loadSpec();
  work = await mkdtemp(join(tmpdir(), "convohop-react-native-driver-"));
});
after(async () => { await rm(work, { recursive: true, force: true }); });

const start = (...args) => startDriver([process.execPath, DRIVER, ...args], { validators: spec.validators.protocol, runner: RUNNER });
const refusal = (driver, method, params) => driver.request(method, params).then(
  result => assert.fail(`${method} answered ${JSON.stringify(result)}`),
  error => { assert.ok(error instanceof DriverProtocolError, String(error)); return error.code; });

describe("the React Native driver", () => {
  test("declares the reference driver's user operations and features, without webhook verification", async () => {
    const { driver, hello } = await start();
    try {
      assert.deepEqual(hello, {
        driver: { name: "convohop-react-native", version: "0.1.0", language: "typescript", packages: {
          "@convohop/core": await version("core"), "@convohop/client": await version("client"),
          "@convohop/react-native": await version("react-native") } },
        roles: { user: { operations: OPERATIONS.user } },
        features: FEATURES.filter(feature => feature !== "webhooks.verify"),
      });
    } finally { await driver.shutdown(); }
  });

  test("answers UNSUPPORTED for the roles and features it doesn't declare", async () => {
    const { driver } = await start();
    try {
      const { payload, headers, secrets, nowSeconds, toleranceSeconds } = spec.vectors.get("valid-single-secret");
      assert.equal(await refusal(driver, "webhooks.verify", { payload, headers, secrets, nowSeconds, toleranceSeconds }),
        "UNSUPPORTED");
      for (const role of ["backend", "management"]) {
        assert.equal(await refusal(driver, "client.create",
          { client: role, role, baseUrl: "http://127.0.0.1:9", credential: "unused" }), "UNSUPPORTED", role);
      }
    } finally { await driver.shutdown(); }
  });

  test("refuses --roles beyond the user role", async () => {
    await assert.rejects(start("--roles", "user,backend"), /--roles must be a comma-separated subset of user/);
  });

  test("passes scenarios that restore clients from asynchronous storage, and a realtime one", async () => {
    const out = [], err = [], reports = join(work, "reports");
    const ids = ["recovery.storage.restart", "realtime.resume.stored-cursor", "realtime.ordering.late-member-visibility"];
    const code = await run(["--driver", `"${process.execPath}" "${DRIVER}"`, ...ids.flatMap(id => ["--filter", id]),
      "--reports", reports], {
      stdout: { write: text => { out.push(String(text)); return true; } },
      stderr: { write: text => { err.push(String(text)); return true; } },
      env: { ...process.env, GITHUB_STEP_SUMMARY: "" },
    });
    assert.equal(code, 0, `${out.join("")}${err.join("")}`);
    const summary = JSON.parse(await readFile(join(reports, "summary.json"), "utf8"));
    assert.equal(summary.driver.name, "convohop-react-native");
    assert.deepEqual(summary.suites.flatMap(suite => suite.scenarios).map(({ id, status }) => [id, status]).sort(),
      ids.map(id => [id, "passed"]).sort());
  });
});
