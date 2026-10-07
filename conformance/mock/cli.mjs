#!/usr/bin/env node
// Starts the deterministic conformance mock and prints its target descriptor as one JSON line.
import { startMockTarget } from "./server.mjs";

const seedIndex = process.argv.indexOf("--seed");
const target = await startMockTarget(seedIndex > 0 ? { seed: process.argv[seedIndex + 1] } : {});
process.stdout.write(JSON.stringify(target.descriptor) + "\n");
const stop = async () => { await target.close(); process.exit(0); };
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
