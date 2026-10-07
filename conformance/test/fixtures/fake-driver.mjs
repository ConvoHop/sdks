#!/usr/bin/env node
// A scriptable driver for the harness's own tests. It speaks just enough of the driver protocol
// (spec/conformance/driver-protocol.md) to provoke each failure the runner must handle, and it
// answers webhooks.verify with the reference verifier so it can stand in for a conforming SDK.
//
// Options:
//   --roles <a,b>            roles to declare, each with no operations (default user)
//   --features <a,b>         features to declare
//   --stderr <text>          line to write to stderr at startup
//   --on <method>=<behavior> override one method; behaviors: non-json, unknown-id, invalid-response,
//                            bad-result, protocol-error, ignore, exit, exit-first-start, exit-on-restart, valid
//   --start-file <path>      counts starts in this file (needed by exit-first-start and exit-on-restart)
//   --vary-on-restart        declares one more feature on every start after the first
//   --echo-credentials       writes every client.create credential to stderr, like a careless debug log
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { verify } from "../../lib/webhooks.mjs";

const { values } = parseArgs({ options: {
  roles: { type: "string", default: "user" },
  features: { type: "string", default: "" },
  stderr: { type: "string" },
  on: { type: "string", multiple: true, default: [] },
  "start-file": { type: "string" },
  "vary-on-restart": { type: "boolean", default: false },
  "echo-credentials": { type: "boolean", default: false },
} });

let start = 1;
if (values["start-file"]) {
  const file = values["start-file"];
  start = (existsSync(file) ? Number(readFileSync(file, "utf8")) : 0) + 1;
  writeFileSync(file, String(start));
}
if (values.stderr) process.stderr.write(`${values.stderr}\n`);

const list = text => text.split(",").map(item => item.trim()).filter(Boolean);
const features = list(values.features);
if (values["vary-on-restart"] && start > 1) features.push("restarted");
const behaviors = new Map(values.on.map(entry => {
  const separator = entry.indexOf("=");
  return [entry.slice(0, separator), entry.slice(separator + 1)];
}));

const hello = () => ({
  driver: { name: "fake-driver", version: "0.0.0", language: "javascript" },
  roles: Object.fromEntries(list(values.roles).map(role => [role, { operations: [] }])),
  features,
});
const createClient = params => {
  if (values["echo-credentials"]) process.stderr.write(`client.create credential ${params.credential}\n`);
  return {};
};
const HANDLERS = { hello, reset: () => ({}), shutdown: () => ({}), "client.create": createClient, "client.close": () => ({}),
  "realtime.close": () => ({}), "webhooks.verify": params => verify(params) };

const write = (message, done) => process.stdout.write(`${JSON.stringify(message)}\n`, done);
const exit = method => { process.stderr.write(`fake driver exits during ${method}\n`); process.exit(3); };

createInterface({ input: process.stdin, crlfDelay: Infinity }).on("line", line => {
  const { id, method, params } = JSON.parse(line);
  switch (behaviors.get(method)) {
    case "non-json": process.stdout.write("this is not JSON\n"); return;
    case "unknown-id": write({ id: id + 1000, result: {} }); return;
    case "invalid-response": write({ id, result: {}, error: { code: "DRIVER_FAILURE", message: "both" } }); return;
    case "bad-result": write({ id, result: { unexpected: true } }); return;
    case "protocol-error": write({ id, error: { code: "UNSUPPORTED", message: `fake driver refuses ${method}` } }); return;
    case "ignore": return;
    case "exit": exit(method); return;
    case "exit-first-start": if (start === 1) { exit(method); return; } break;
    case "exit-on-restart": if (start > 1) { exit(method); return; } break;
    case "valid": write({ id, result: { valid: true, code: null } }); return;
    default: break;
  }
  const handler = HANDLERS[method];
  if (!handler) { write({ id, error: { code: "UNKNOWN_METHOD", message: `fake driver does not implement ${method}` } }); return; }
  write({ id, result: handler(params) }, method === "shutdown" ? () => process.exit(0) : undefined);
});
