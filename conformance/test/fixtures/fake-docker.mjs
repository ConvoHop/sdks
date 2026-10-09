#!/usr/bin/env node
// A scriptable docker CLI for the tests of conformance/dev-stack.mjs, which put it first on PATH. Each call
// appends one JSON line to FAKE_DOCKER_CALLS: its arguments, its stdin (read only for --password-stdin) and
// whether GITHUB_TOKEN reached its environment.
//
// Environment:
//   FAKE_DOCKER_FAIL   comma-separated steps that exit 1: login, pull, logout, run, wait, cat, inspect, logs
//   FAKE_DOCKER_SEED   what `docker exec convohop-dev-stack cat <seed.env>` prints
//   FAKE_DOCKER_STATE  what `docker inspect` prints (default {})
//   FAKE_DOCKER_LOGS   JSON [stream, line] pairs that `docker logs` writes, in order, to stdout or stderr
import { appendFileSync, readFileSync, writeSync } from "node:fs";

const args = process.argv.slice(2);
const step = args[0] === "exec" ? (args[2] === "cat" ? "cat" : args[3]) : args[0];
const stdin = args.includes("--password-stdin") ? readFileSync(0, "utf8") : null;
appendFileSync(process.env.FAKE_DOCKER_CALLS, `${JSON.stringify({ args, stdin, token: "GITHUB_TOKEN" in process.env })}\n`);

// Synchronous writes keep stdout and stderr lines in order when both go to one pipe.
const write = (stream, text) => writeSync(stream === "stderr" ? 2 : 1, text);

if ((process.env.FAKE_DOCKER_FAIL ?? "").split(",").includes(step)) {
  write("stderr", `fake docker: ${step} failed\n`);
  process.exit(1);
}
switch (step) {
  case "login": write("stdout", "Login Succeeded\n"); break;
  case "pull": write("stdout", `${args.at(-1)}\n`); break;
  case "logout": write("stdout", "Removing login credentials for ghcr.io\n"); break;
  case "run": write("stdout", "0123456789abcdef\n"); break;
  case "wait": write("stdout", "ConvoHop dev stack ready (development only); seed: /run/convohop/dev-stack/seed.env\n"); break;
  case "cat": write("stdout", process.env.FAKE_DOCKER_SEED ?? ""); break;
  case "inspect": write("stdout", `${process.env.FAKE_DOCKER_STATE ?? "{}"}\n`); break;
  case "logs":
    for (const [stream, line] of JSON.parse(process.env.FAKE_DOCKER_LOGS ?? "[]")) write(stream, `${line}\n`);
    break;
  default:
    write("stderr", `fake docker: unexpected call ${args.join(" ")}\n`);
    process.exit(125);
}
