// The runner must survive every way a driver can misbehave. The scriptable fake driver provokes each
// failure; DriverClient must classify it as fatal, per-step or a protocol error, and clean up.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { before, describe, test } from "node:test";
import { DriverFailure, DriverProtocolError, startDriver } from "../lib/driver-client.mjs";
import { RUNNER } from "../lib/files.mjs";
import { loadSpec } from "../lib/spec.mjs";

const FAKE = fileURLToPath(new URL("./fixtures/fake-driver.mjs", import.meta.url));
let spec;
before(async () => { spec = await loadSpec(); });
const start = (...args) => startDriver([process.execPath, FAKE, ...args], { validators: spec.validators.protocol, runner: RUNNER });
const verifyParams = id => {
  const { payload, headers, secrets, nowSeconds, toleranceSeconds, expected } = spec.vectors.get(id);
  return [{ payload, headers, secrets, nowSeconds, toleranceSeconds }, expected];
};

describe("a conforming driver", () => {
  test("negotiates the protocol, answers requests and exits on shutdown", async () => {
    const { driver, hello } = await start("--roles", "user,backend", "--features", "realtime,webhooks.verify");
    assert.deepEqual(hello, { protocolVersion: 1, driver: { name: "fake-driver", version: "0.0.0", language: "javascript" },
      roles: { user: { operations: [] }, backend: { operations: [] } }, features: ["realtime", "webhooks.verify"] });
    assert.deepEqual(await driver.request("reset"), {});
    for (const id of ["valid-single-secret", "wrong-secret"]) {
      const [params, expected] = verifyParams(id);
      assert.deepEqual(await driver.request("webhooks.verify", params), expected);
    }
    assert.equal(driver.alive, true);
    await driver.shutdown();
    assert.equal(driver.alive, false);
    await assert.rejects(driver.request("reset"), { name: "DriverFailure", message: "driver exited (code 0, signal none)" });
  });
});

describe("handshake failures", () => {
  const cases = [
    [["--on", "hello=non-json"], "driver wrote non-JSON to stdout: this is not JSON"],
    [["--on", "hello=unknown-id"], "driver answered unknown request id 1001"],
    [["--on", "hello=invalid-response"], /^driver wrote an invalid response: /],
    [["--on", "hello=bad-result"], /^hello result is invalid: /],
    [["--on", "hello=protocol-error"], "hello returned protocol error UNSUPPORTED: fake driver refuses hello"],
    [["--on", "hello=exit"], "driver exited (code 3, signal none)", "fake driver exits during hello"],
    [["--protocol-version", "2"], "driver selected protocol version 2, which was not offered"],
    [["--protocol-version", "0"], /^hello result is invalid: \/protocolVersion /],
  ];
  for (const [args, reason, extraStderr] of cases) {
    test(`${args.join(" ")} fails with the reason and the driver's stderr`, async () => {
      const error = await start("--stderr", "stderr marker", ...args).then(() => assert.fail("expected a handshake failure"), failure => failure);
      assert.ok(error instanceof DriverFailure, String(error));
      const [message, stderr] = error.message.split("\n--- driver stderr ---\n");
      const prefix = "driver handshake failed: ";
      assert.ok(message.startsWith(prefix), message);
      if (typeof reason === "string") assert.equal(message.slice(prefix.length), reason);
      else assert.match(message.slice(prefix.length), reason);
      assert.equal(stderr, ["stderr marker", extraStderr].filter(Boolean).join("\n"));
    });
  }

  test("a missing executable fails without stderr", async () => {
    await assert.rejects(startDriver([join(tmpdir(), `missing-driver-${randomUUID()}`)], { validators: spec.validators.protocol, runner: RUNNER }),
      error => error instanceof DriverFailure && /^driver handshake failed: driver process failed: spawn .*ENOENT$/.test(error.message));
  });
});

describe("failures after the handshake", () => {
  test("a malformed result fails that request only", async () => {
    const { driver } = await start("--on", "reset=bad-result");
    try {
      await assert.rejects(driver.request("reset"), { name: "DriverResultError", message: "reset result is invalid: /unexpected is not an allowed property" });
      assert.equal(driver.alive, true);
      assert.deepEqual(await driver.request("client.close", { client: "a" }), {});
    } finally { await driver.shutdown(); }
  });

  test("a protocol error carries the driver's code and keeps the driver", async () => {
    const { driver } = await start("--on", "reset=protocol-error");
    try {
      await assert.rejects(driver.request("reset"), error => error instanceof DriverProtocolError && error.code === "UNSUPPORTED" &&
        error.method === "reset" && error.message === "reset returned protocol error UNSUPPORTED: fake driver refuses reset");
      await assert.rejects(driver.request("invoke", {}), { name: "DriverProtocolError", code: "UNKNOWN_METHOD" });
      assert.equal(driver.alive, true);
    } finally { await driver.shutdown(); }
  });

  test("a driver that stops answering is killed at the deadline", async () => {
    const { driver } = await start("--on", "reset=ignore");
    const started = Date.now();
    await assert.rejects(driver.request("reset", {}, { timeoutMs: 100 }), { name: "DriverFailure", message: "driver did not answer reset within 100 ms" });
    assert.ok(Date.now() - started < 5000);
    assert.equal(driver.alive, false);
    await assert.rejects(driver.request("client.close", { client: "a" }), { message: "driver did not answer reset within 100 ms" });
    await driver.shutdown();
  });

  test("a driver that exits fails the pending request and keeps its stderr", async () => {
    const { driver } = await start("--on", "reset=exit");
    await assert.rejects(driver.request("reset"), { name: "DriverFailure", message: "driver exited (code 3, signal none)" });
    assert.equal(driver.alive, false);
    assert.equal(driver.stderrTail(), "fake driver exits during reset");
    await driver.shutdown();
  });

  test("stdout noise after the handshake is fatal", async () => {
    const { driver } = await start("--on", "reset=non-json");
    await assert.rejects(driver.request("reset"), { name: "DriverFailure", message: "driver wrote non-JSON to stdout: this is not JSON" });
    assert.equal(driver.alive, false);
    await driver.shutdown();
  });
});
