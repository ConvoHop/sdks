import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { LATEST_PROTOCOL_VERSION } from "@modelcontextprotocol/server";
import { mcpTools, serverOptionsFromEnvironment } from "@convohop/mcp";
import { startMockTarget } from "../../../conformance/mock/server.mjs";

const bin = fileURLToPath(new URL("../dist/bin.js", import.meta.url));
const management = { CONVOHOP_MANAGEMENT_URL: "https://management.convohop.test", CONVOHOP_PORTAL_TOKEN: "portal-token" };
const communication = { CONVOHOP_COMMUNICATION_URL: "https://communication.convohop.test",
  CONVOHOP_PROJECT_ID: "6f2a4c1e-0b7d-4e59-9a3f-2c8d1b5e7a90", CONVOHOP_INCARNATION: "1d9e3b7a-5c2f-4a86-b0e4-7f3a9c6d2b18",
  CONVOHOP_BACKEND_KEY: "backend-key" };

async function secretFile(t, text) {
  const directory = await mkdtemp(join(tmpdir(), "convohop-mcp-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, "secret");
  await writeFile(path, text, { mode: 0o600 });
  return path;
}

test("the environment configures either plane or both", async t => {
  assert.deepEqual(serverOptionsFromEnvironment({ ...management, ...communication, CONVOHOP_MCP_READ_ONLY: "true" }), {
    managementUrl: management.CONVOHOP_MANAGEMENT_URL, portalToken: "portal-token",
    communicationUrl: communication.CONVOHOP_COMMUNICATION_URL, projectId: communication.CONVOHOP_PROJECT_ID,
    incarnation: communication.CONVOHOP_INCARNATION, backendKey: "backend-key", readOnly: true,
  });
  assert.deepEqual(serverOptionsFromEnvironment({ ...management, ...Object.fromEntries(Object.keys(communication)
    .map(name => [name, ""])), CONVOHOP_MCP_READ_ONLY: "0" }),
  { managementUrl: management.CONVOHOP_MANAGEMENT_URL, portalToken: "portal-token" });
  assert.equal(serverOptionsFromEnvironment({ ...communication, CONVOHOP_MCP_READ_ONLY: "1" }).readOnly, true);
  assert.equal(Object.hasOwn(serverOptionsFromEnvironment({ ...communication, CONVOHOP_MCP_READ_ONLY: "false" }), "readOnly"), false);

  const { CONVOHOP_BACKEND_KEY, ...withoutKey } = communication;
  assert.equal(serverOptionsFromEnvironment({ ...withoutKey,
    CONVOHOP_BACKEND_KEY_FILE: await secretFile(t, "file-backend-key\n") }).backendKey, "file-backend-key");
  assert.equal(serverOptionsFromEnvironment({ CONVOHOP_MANAGEMENT_URL: management.CONVOHOP_MANAGEMENT_URL,
    CONVOHOP_PORTAL_TOKEN_FILE: await secretFile(t, "  file-portal-token  ") }).portalToken, "file-portal-token");
});

test("the environment names the variables to fix", async t => {
  const { CONVOHOP_BACKEND_KEY, ...withoutKey } = communication;
  const cases = [
    [{}, "Set CONVOHOP_MANAGEMENT_URL, CONVOHOP_COMMUNICATION_URL or both"],
    [{ CONVOHOP_PORTAL_TOKEN: "portal-token" },
      "Set CONVOHOP_MANAGEMENT_URL and CONVOHOP_PORTAL_TOKEN or CONVOHOP_PORTAL_TOKEN_FILE together"],
    [{ ...management, ...withoutKey }, "Set CONVOHOP_COMMUNICATION_URL, CONVOHOP_PROJECT_ID, CONVOHOP_INCARNATION and " +
      "CONVOHOP_BACKEND_KEY or CONVOHOP_BACKEND_KEY_FILE together"],
    [{ ...communication, CONVOHOP_BACKEND_KEY_FILE: "/unused" }, "Set CONVOHOP_BACKEND_KEY or CONVOHOP_BACKEND_KEY_FILE, not both"],
    [{ ...withoutKey, CONVOHOP_BACKEND_KEY_FILE: await secretFile(t, " \n") }, "CONVOHOP_BACKEND_KEY_FILE names an empty file"],
    [{ ...management, CONVOHOP_MCP_READ_ONLY: "yes" }, "CONVOHOP_MCP_READ_ONLY must be 1, true, 0 or false"],
  ];
  for (const [env, message] of cases) assert.throws(() => serverOptionsFromEnvironment(env), new TypeError(message));
});

function childEnvironment(variables) {
  return { ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("CONVOHOP_"))), ...variables };
}

function collect(stream) {
  let text = "";
  stream.setEncoding("utf8");
  stream.on("data", chunk => { text += chunk; });
  return () => text;
}

test("the convohop-mcp binary serves MCP over stdio", async t => {
  const target = await startMockTarget();
  t.after(() => target.close());
  const { descriptor } = target;
  const backendKey = descriptor.credentials.backend;
  const child = spawn(process.execPath, [bin], { stdio: ["pipe", "pipe", "pipe"], env: childEnvironment({
    CONVOHOP_COMMUNICATION_URL: descriptor.communicationUrl, CONVOHOP_PROJECT_ID: descriptor.projectId,
    CONVOHOP_INCARNATION: descriptor.incarnation, CONVOHOP_BACKEND_KEY_FILE: await secretFile(t, backendKey),
    CONVOHOP_MANAGEMENT_URL: descriptor.managementUrl, CONVOHOP_PORTAL_TOKEN: descriptor.credentials.management,
  }) });
  const exited = new Promise(resolve => child.on("exit", code => resolve(code)));
  t.after(() => child.kill());
  const stdout = collect(child.stdout), stderr = collect(child.stderr);
  const responses = async count => {
    for (let waited = 0; stdout().split("\n").filter(Boolean).length < count; waited += 10) {
      if (waited > 10_000) assert.fail(`No response from convohop-mcp: ${stderr()}`);
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return stdout().split("\n").filter(Boolean).map(line => JSON.parse(line));
  };
  const send = message => child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);

  send({ id: 1, method: "initialize", params: { protocolVersion: LATEST_PROTOCOL_VERSION, capabilities: {},
    clientInfo: { name: "convohop-mcp-test", version: "0.0.0" } } });
  send({ method: "notifications/initialized" });
  send({ id: 2, method: "tools/list", params: {} });
  send({ id: 3, method: "tools/call", params: { name: "communication_route" } });
  const [initialized, listed, routed] = await responses(3);
  assert.deepEqual([initialized.id, initialized.result.serverInfo.name], [1, "convohop"]);
  assert.equal(listed.result.tools.length, mcpTools.length + 1);
  assert.equal(routed.result.isError, undefined);
  assert.equal(routed.result.structuredContent.result.projectId, descriptor.projectId);

  child.stdin.end();
  assert.equal(await exited, 0, "the server exits when its client closes stdin");
  assert.equal(stderr(), "");
  for (const secret of [backendKey, descriptor.credentials.management]) assert.ok(!stdout().includes(secret));
});

test("the convohop-mcp binary reports a configuration error on stderr without the secrets", async t => {
  const child = spawn(process.execPath, [bin], { stdio: ["pipe", "pipe", "pipe"],
    env: childEnvironment({ CONVOHOP_PORTAL_TOKEN: "portal-token-never-printed", ...communication, CONVOHOP_PROJECT_ID: "" }) });
  t.after(() => child.kill());
  const stdout = collect(child.stdout), stderr = collect(child.stderr);
  const code = await new Promise(resolve => child.on("exit", resolve));
  assert.equal(code, 1);
  assert.equal(stdout(), "");
  assert.equal(stderr(), "convohop-mcp: Set CONVOHOP_MANAGEMENT_URL and CONVOHOP_PORTAL_TOKEN or " +
    "CONVOHOP_PORTAL_TOKEN_FILE together\n");
});
