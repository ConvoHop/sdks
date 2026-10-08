import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { run } from "@convohop/cli";
import { ControlClient } from "../../../conformance/lib/control.mjs";
import { startMockTarget } from "../../../conformance/mock/server.mjs";
import { full, reply } from "../../../test/graphql-fixtures.mjs";

export const PORTAL_TOKEN = "fixture-portal-token-never-in-output";
export const BACKEND_KEY = "fixture-backend-key-never-in-output";
export const MANAGEMENT_URL = "https://management.convohop.test";
export const COMMUNICATION_URL = "https://communication.convohop.test";
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** A text output that keeps what is written to it. */
export class Capture {
  text = "";
  constructor(isTTY = false) {
    this.isTTY = isTTY;
  }
  write(text) {
    this.text += text;
    return true;
  }
}

/** Standard input holding text, or nothing; a terminal when tty is set. */
export function stdinOf(text, { tty = false } = {}) {
  const stream = Readable.from(text === undefined ? [] : [Buffer.from(text)]);
  if (tty) stream.isTTY = true;
  return stream;
}

/**
 * Runs convohop in this process. It never reaches the network, an OS credential store or the user's configuration:
 * fetch and runCommand fail unless the test passes its own, env replaces the process environment and must name a
 * configuration directory, and sleep returns at once, recording each wait in waits.
 */
export async function cli(argv, { env = {}, stdin = stdinOf(), fetch, runCommand, platform = "linux", now, signal, sleep } = {}) {
  assert.ok(env.CONVOHOP_CONFIG_DIR || env.XDG_CONFIG_HOME, "a test must not use the real configuration directory");
  const stdout = new Capture(), stderr = new Capture(), waits = [], sent = [];
  const code = await run({
    argv, env, stdin, stdout, stderr, platform, now, signal,
    fetch: fetch ?? (async url => {
      sent.push(String(url));
      throw new Error("The test expects no request");
    }),
    runCommand: runCommand ?? (async command => {
      throw new Error(`The test expects no ${command}`);
    }),
    sleep: sleep ?? (async milliseconds => {
      waits.push(milliseconds);
    }),
  });
  return { code, stdout: stdout.text, stderr: stderr.text, waits, sent };
}

/** A temporary directory, removed after the test, and a cli whose configuration directory is config inside it. */
export async function sandbox(t) {
  const directory = await mkdtemp(join(tmpdir(), "convohop-cli-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const config = join(directory, "config");
  return {
    directory, config,
    cli: (argv, options = {}) => cli(argv, { ...options, env: { CONVOHOP_CONFIG_DIR: config, ...options.env } }),
  };
}

/** Fails when stdout or stderr contains one of the secrets, without printing it. */
export function assertNoSecrets(result, ...secrets) {
  for (const [index, secret] of secrets.entries()) {
    assert.ok(secret.length > 0);
    assert.ok(!result.stdout.includes(secret), `stdout contains secret ${index}`);
    assert.ok(!result.stderr.includes(secret), `stderr contains secret ${index}`);
  }
}

/** The usage error output for message: exit code 2 and a pointer to the command's help. */
export function assertUsage(result, message, command) {
  assert.equal(result.code, 2, result.stderr);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, `convohop: ${message}\nRun convohop ${command ? `${command} ` : ""}--help for usage.\n`);
}

/** An authority that answers operations by name and routes every project to itself. */
export function fakeAuthority(answers = {}) {
  const projectId = randomUUID(), incarnation = randomUUID(), requests = [];
  const fetch = async (url, init) => {
    const request = JSON.parse(init.body);
    requests.push({ url: String(url), authorization: new Headers(init.headers).get("authorization"), ...request });
    const answer = answers[request.operationName] ?? (request.operationName === "CommunicationRoute"
      ? () => reply(request, { result: { projectId, incarnation, servingEpoch: "1" } }) : undefined);
    if (!answer) throw new Error(`Unexpected ${request.operationName}`);
    return answer(request, requests);
  };
  return {
    projectId, incarnation, requests, fetch,
    names: () => requests.map(request => request.operationName),
    env: {
      CONVOHOP_MANAGEMENT_URL: MANAGEMENT_URL, CONVOHOP_PORTAL_TOKEN: PORTAL_TOKEN,
      CONVOHOP_COMMUNICATION_URL: COMMUNICATION_URL, CONVOHOP_BACKEND_KEY: BACKEND_KEY,
      CONVOHOP_PROJECT_ID: projectId, CONVOHOP_INCARNATION: incarnation,
    },
  };
}

/** A GraphQL error answer, rejected unless extensions say otherwise. */
export const problem = (request, code, status, message, extensions = {}) => Response.json({ errors: [{ message,
  extensions: { code, requestId: request.variables.context.requestId, outcome: "rejected", status, ...extensions } }] });

export const capabilities = (request, fields = {}) => reply(request, { result: full("Capabilities", { serverRelease: "fixture",
  capabilityRevision: "1", limitsRevision: "1", limits: [], environment: "test", productionQualified: false, offerings: [],
  geos: [], installationProfiles: [], ...fields }) });

export const project = (projectId, incarnation, fields = {}) => full("Project", { projectId, deploymentId: randomUUID(),
  name: "Fixture", environment: "test", incarnation, servingRegion: "test-1", servingEpoch: "1", status: "active",
  revision: "1", policyRevision: "1", messagePreview: true, ...fields });

/** A mutation reply for an accepted long-running operation. */
export const accepted = (request, operationId, fields = {}) => reply(request, { status: "accepted",
  operation: full("OperationRef", { operationId, owner: "management", href: "/graphql", state: "requested" }), ...fields });

/** The conformance mock target, closed after the test, with an environment that points convohop at it. */
export async function mockTarget(t) {
  const target = await startMockTarget();
  t.after(() => target.close());
  const { descriptor } = target;
  return {
    descriptor, control: new ControlClient(descriptor.control),
    env: {
      CONVOHOP_MANAGEMENT_URL: descriptor.managementUrl, CONVOHOP_PORTAL_TOKEN: descriptor.credentials.management,
      CONVOHOP_COMMUNICATION_URL: descriptor.communicationUrl, CONVOHOP_BACKEND_KEY: descriptor.credentials.backend,
      CONVOHOP_PROJECT_ID: descriptor.projectId, CONVOHOP_INCARNATION: descriptor.incarnation,
    },
  };
}
