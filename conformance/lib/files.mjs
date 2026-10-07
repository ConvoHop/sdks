// Shared locations and JSON loading for the conformance runner. Paths resolve from this file so
// the runner behaves the same from any working directory.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const SPEC_DIR = fileURLToPath(new URL("../../spec/conformance/", import.meta.url));
export const SCENARIO_DIR = fileURLToPath(new URL("../../spec/conformance/scenarios/", import.meta.url));
export const REPORT_DIR = fileURLToPath(new URL("../reports/", import.meta.url));
export const REFERENCE_DRIVER = fileURLToPath(new URL("../drivers/ts/dist/driver.mjs", import.meta.url));
export const RUNNER = Object.freeze({ name: "convohop-conformance-runner", version: "0.1.0" });

export async function readJson(path) {
  const text = await readFile(path, "utf8");
  try { return JSON.parse(text); }
  catch (error) { throw new Error(`${path} is not valid JSON: ${error instanceof Error ? error.message : error}`); }
}

export const specFile = name => fileURLToPath(new URL(name, new URL("../../spec/conformance/", import.meta.url)));
