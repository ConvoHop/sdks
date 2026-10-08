#!/usr/bin/env node
// ConvoHop conformance runner: executes the language-neutral scenarios in spec/conformance/scenarios
// against a target through a driver and writes JUnit, JSON and Markdown reports.
// Usage and exit codes: spec/conformance/README.md#running.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { DriverSlot, Engine, redact } from "./lib/engine.mjs";
import { parseCommand } from "./lib/driver-client.mjs";
import { REFERENCE_DRIVER, REPORT_DIR, RUNNER, SCENARIO_DIR } from "./lib/files.mjs";
import { failureText, totals, writeReports } from "./lib/report.mjs";
import { loadSuites, selected } from "./lib/scenarios.mjs";
import { loadSpec } from "./lib/spec.mjs";
import { openTarget } from "./lib/target.mjs";

const HELP = `Usage: node conformance/runner.mjs [options]

Options:
  --target <mock|file>        Target: "mock" starts the built-in deterministic mock (default),
                              otherwise a target descriptor JSON file.
  --driver <command>          Driver under test (default: the TypeScript reference driver).
  --fixture-driver <command>  Driver for roles the driver under test does not declare
                              (default: the TypeScript reference driver; "none" disables it).
  --scenarios <dir>           Scenario directory (default: spec/conformance/scenarios).
  --filter <pattern>          Run matching scenario ids only; repeatable. "crud" selects
                              crud.*, "*" is a wildcard.
  --reports <dir>             Report directory (default: conformance/reports).
  --strict                    Exit 1 when any scenario is skipped.
  --list                      Check and list the selected scenarios without running them.
  -h, --help                  Show this help.

Exit codes: 0 all selected scenarios passed (or were skipped without --strict),
1 a scenario failed (or was skipped with --strict), 2 usage, spec, target or driver setup error.
`;

const OPTIONS = {
  target: { type: "string", default: "mock" },
  driver: { type: "string" },
  "fixture-driver": { type: "string" },
  scenarios: { type: "string" },
  filter: { type: "string", multiple: true, default: [] },
  reports: { type: "string" },
  strict: { type: "boolean", default: false },
  list: { type: "boolean", default: false },
  help: { type: "boolean", short: "h", default: false },
};

class SetupError extends Error {
  constructor(message) { super(message); this.name = "SetupError"; }
}

const reason = error => error instanceof Error ? error.message : String(error);
const referenceCommand = () => [process.execPath, REFERENCE_DRIVER];

function driverCommand(text, label) {
  if (text === undefined) {
    if (!existsSync(REFERENCE_DRIVER))
      throw new SetupError(`the reference driver is not built (${REFERENCE_DRIVER}); run "npm run build" first`);
    return referenceCommand();
  }
  try { return parseCommand(text); }
  catch (error) { throw new SetupError(`${label}: ${reason(error)}`); }
}

function describeDriver(hello) {
  return { name: hello.driver.name, version: hello.driver.version, language: hello.driver.language,
    ...(hello.driver.packages === undefined ? {} : { packages: hello.driver.packages }),
    roles: Object.keys(hello.roles), features: hello.features };
}

/** Runs the CLI and resolves to its exit code. */
export async function run(argv, { stdout = process.stdout, stderr = process.stderr, env = process.env, cwd = process.cwd() } = {}) {
  const print = text => stdout.write(`${text}\n`);
  const fail = text => { stderr.write(`conformance: ${text}\n`); return 2; };
  let options;
  try { options = parseArgs({ args: argv, options: OPTIONS, strict: true, allowPositionals: false }).values; }
  catch (error) { return fail(`${reason(error)}\n\n${HELP}`); }
  if (options.help) { stdout.write(HELP); return 0; }

  let spec, suites;
  try {
    spec = await loadSpec();
    suites = await loadSuites(options.scenarios === undefined ? SCENARIO_DIR : resolve(cwd, options.scenarios),
      { validate: spec.validators.scenario, catalog: spec.catalog, vectors: spec.vectors });
  } catch (error) { return fail(reason(error)); }

  const chosen = suites.map(suite => ({ ...suite, scenarios: suite.scenarios.filter(entry => selected(entry.definition.id, options.filter)) }))
    .filter(suite => suite.scenarios.length);
  if (!chosen.length) return fail(`no scenario matches --filter ${options.filter.join(", ")}`);

  if (options.list) {
    for (const suite of chosen) for (const { definition } of suite.scenarios)
      print(`${definition.id}  [${definition.covers.join(", ")}]  ${definition.title}`);
    return 0;
  }

  const startedAt = new Date().toISOString(), clock = performance.now();
  const slotOptions = { validators: spec.validators.protocol, runner: RUNNER, cwd, env };
  let target, primary, fixture;
  try {
    const primaryCommand = driverCommand(options.driver, "--driver");
    const fixtureCommand = options["fixture-driver"] === "none" ? undefined : driverCommand(options["fixture-driver"], "--fixture-driver");
    target = await openTarget(options.target, { validate: spec.validators.target, environment: env, cwd });
    primary = new DriverSlot("primary", primaryCommand, slotOptions);
    await primary.start();
    const needed = new Set(chosen.flatMap(suite => suite.scenarios.flatMap(entry => [...entry.requirements.roles])));
    const missing = [...needed].filter(role => !primary.serves(role));
    if (fixtureCommand && missing.length) {
      fixture = new DriverSlot("fixture", fixtureCommand, slotOptions);
      await fixture.start();
    }
  } catch (error) {
    await Promise.allSettled([primary?.stop(), fixture?.stop(), target?.close()]);
    // A failed handshake reports the driver's stderr, which can echo the target's credentials.
    return fail(redact(reason(error), new Set(Object.values(target?.descriptor.credentials ?? {}))));
  }

  const roles = hello => Object.keys(hello.roles).join(", ");
  print(`driver ${primary.hello.driver.name} ${primary.hello.driver.version} (${primary.hello.driver.language}; ` +
    `roles ${roles(primary.hello)}; features ${primary.hello.features.join(", ") || "none"})`);
  if (fixture) print(`fixture driver ${fixture.hello.driver.name} ${fixture.hello.driver.version} serves roles the driver under test lacks`);
  print(`target ${target.kind}:${target.descriptor.name} (capabilities ${(target.descriptor.capabilities ?? []).join(", ") || "none"})`);

  const engine = new Engine({ descriptor: target.descriptor, primary, fixture, vectors: spec.vectors });
  const results = [];
  try {
    for (const suite of chosen) {
      const suiteClock = performance.now(), scenarios = [];
      for (const entry of suite.scenarios) {
        const result = await engine.runScenario(entry);
        scenarios.push(result);
        const timing = `(${result.durationMs} ms)`;
        if (result.status === "passed") print(`PASS ${result.id} ${timing}`);
        else if (result.status === "skipped") print(`SKIP ${result.id}: ${result.reason}`);
        else print(`FAIL ${result.id} ${timing}\n  ${failureText(result.failure).replaceAll("\n", "\n  ")}`);
      }
      results.push({ suite: suite.suite, title: suite.title, durationMs: Math.round(performance.now() - suiteClock), scenarios });
    }
  } finally {
    await Promise.allSettled([primary.stop(), fixture?.stop()]);
    await target.close();
  }

  const summary = {
    runner: RUNNER, driver: describeDriver(primary.hello),
    fixtureDriver: fixture ? describeDriver(fixture.hello) : null,
    target: { kind: target.kind, name: target.descriptor.name, capabilities: target.descriptor.capabilities ?? [] },
    startedAt, durationMs: Math.round(performance.now() - clock), suites: results,
  };
  const reportDir = options.reports === undefined ? REPORT_DIR : resolve(cwd, options.reports);
  let files;
  try { files = await writeReports(reportDir, summary, { stepSummary: env.GITHUB_STEP_SUMMARY || null }); }
  catch (error) { return fail(`could not write reports: ${reason(error)}`); }
  const count = totals(results.flatMap(suite => suite.scenarios));
  print(`\n${count.passed} passed, ${count.failed} failed, ${count.skipped} skipped of ${count.scenarios} scenarios`);
  print(`reports: ${files.junit}, ${files.summary}, ${files.markdown}`);
  if (count.failed) return 1;
  if (options.strict && count.skipped) { print("--strict: skipped scenarios count as failures"); return 1; }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await run(process.argv.slice(2));
