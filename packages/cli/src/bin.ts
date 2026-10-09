#!/usr/bin/env node
import { run } from "./index.js";

const controller = new AbortController();
// The first Ctrl-C lets the command report what it knows, such as a request whose outcome is unknown; the second exits.
let stopping = false;
const stop = (): void => {
  if (stopping) process.exit(130);
  stopping = true;
  controller.abort();
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
// A closed pipe, as in convohop webhooks tail | head, stops the command instead of crashing it.
process.stdout.on("error", error => {
  if ("code" in error && error.code === "EPIPE") controller.abort();
  else throw error;
});
process.stderr.on("error", () => undefined);

process.exitCode = await run({ argv: process.argv.slice(2), signal: controller.signal });
