// Loads scenario suites and checks them statically (spec/conformance/README.md#static-checks) so a
// broken scenario fails before any driver or target is touched. Also derives what each scenario
// needs from a driver and a target, which is how unsupported features become explicit skips.
import { readdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { readJson } from "./files.mjs";
import { checkReference, references } from "./interpolate.mjs";
import { formatErrors } from "./json-schema.mjs";
import { validateMatcher } from "./matchers.mjs";

export class ScenarioError extends Error {
  constructor(problems) {
    super(`scenario definitions are invalid:\n  ${problems.join("\n  ")}`);
    this.name = "ScenarioError";
    this.problems = problems;
  }
}

const CONTROL_CAPABILITIES = Object.freeze({
  "control.fault": "control.fault",
  "control.realtimeDrop": "control.realtimeDrop",
  "control.waitLog": "control.waitLog",
});

/**
 * Statically checks one scenario. Requirements:
 * - roles: client roles the scenario creates.
 * - operations: "<role>:<operation>" pairs it invokes.
 * - features: "<role>:<feature>" or "primary:<feature>" driver features it needs.
 * - capabilities: target capabilities it needs.
 * - targetFields: descriptor paths (e.g. "credentials.backend") it reads.
 */
export function analyzeScenario(scenario, { catalog, vectors }) {
  const problems = [];
  const requirements = {
    roles: new Set(),
    operations: new Set(),
    features: new Set(),
    capabilities: new Set(scenario.requires?.capabilities ?? []),
    targetFields: new Set(),
  };
  const clients = new Map();
  const subscriptions = new Map();
  const saved = new Set();

  scenario.steps.forEach((step, index) => {
    const problem = message => problems.push(`${scenario.id} step ${index + 1} (${step.do}): ${message}`);
    const matcher = (pattern, label) => { for (const issue of validateMatcher(pattern)) problem(`${label}: ${issue}`); };
    const save = () => {
      if (step.save === undefined) return;
      if (saved.has(step.save)) problem(`save name ${step.save} is already used`);
      saved.add(step.save);
    };
    const openClient = handle => {
      const role = clients.get(handle);
      if (role === undefined) problem(`client ${handle} is not open`);
      return role;
    };

    for (const reference of references(step)) {
      const issue = checkReference(reference);
      if (issue) { problem(issue); continue; }
      const [root, ...segments] = reference.split(".");
      if (root === "saved" && !saved.has(segments[0])) problem(`\${${reference}} reads ${segments[0]}, which no earlier step saves`);
      if (root === "target") requirements.targetFields.add(segments.join("."));
    }

    switch (step.do) {
      case "client.create": {
        if (clients.has(step.client)) problem(`client ${step.client} is already open`);
        clients.set(step.client, step.role);
        requirements.roles.add(step.role);
        if (step.role === "user" && step.principalId === undefined) problem("user clients need principalId");
        if (step.role !== "user" && step.principalId !== undefined) problem(`${step.role} clients do not take principalId`);
        if (step.role === "management") {
          for (const field of ["projectId", "incarnation"])
            if (step[field] !== undefined) problem(`management clients do not take ${field}`);
          if (step.baseUrl === undefined) requirements.targetFields.add("managementUrl");
          if (step.actorId === undefined) requirements.targetFields.add("managementActorId");
        } else if (step.actorId !== undefined) problem("only management clients take actorId");
        if (step.storage !== undefined) requirements.features.add(`${step.role}:recovery.storage`);
        break;
      }
      case "client.close":
        openClient(step.client);
        clients.delete(step.client);
        for (const [subscription, owner] of subscriptions) if (owner === step.client) subscriptions.delete(subscription);
        break;
      case "invoke": {
        const role = openClient(step.client);
        const operation = catalog[step.operation];
        if (operation === undefined) problem(`unknown operation ${step.operation}; see spec/conformance/operations.json`);
        else {
          const args = Object.keys(step.args ?? {});
          for (const name of args)
            if (!operation.required.includes(name) && !operation.optional.includes(name)) problem(`${step.operation} has no argument ${name}`);
          for (const name of operation.required) if (!args.includes(name)) problem(`${step.operation} needs argument ${name}`);
          if (role !== undefined && !operation.roles.includes(role)) problem(`${step.operation} is not available to ${role} clients`);
        }
        if (role !== undefined) {
          requirements.operations.add(`${role}:${step.operation}`);
          for (const feature of step.requires ?? []) requirements.features.add(`${role}:${feature}`);
        }
        if (step.expect !== undefined) {
          if (Object.hasOwn(step.expect, "value")) matcher(step.expect.value, "expect.value");
          else matcher(step.expect.error, "expect.error");
        }
        save();
        break;
      }
      case "realtime.subscribe": {
        const role = openClient(step.client);
        if (role !== undefined && role !== "user") problem("only user clients subscribe");
        if (subscriptions.has(step.subscription)) problem(`subscription ${step.subscription} is already open`);
        requirements.features.add("user:realtime");
        if (step.expect !== undefined) matcher(step.expect.error, "expect.error");
        else subscriptions.set(step.subscription, step.client);
        break;
      }
      case "realtime.collect":
        if (!subscriptions.has(step.subscription)) problem(`subscription ${step.subscription} is not open`);
        if (step.expect?.events !== undefined) matcher(step.expect.events, "expect.events");
        if (step.expect?.errors !== undefined) matcher(step.expect.errors, "expect.errors");
        save();
        break;
      case "realtime.close":
        if (!subscriptions.has(step.subscription)) problem(`subscription ${step.subscription} is not open`);
        subscriptions.delete(step.subscription);
        break;
      case "webhooks.verify":
        if (!vectors.has(step.vector)) problem(`unknown webhook vector ${step.vector}; see spec/conformance/vectors/webhooks.json`);
        requirements.features.add("primary:webhooks.verify");
        break;
      case "control.fault": case "control.realtimeDrop": case "control.waitLog":
        requirements.capabilities.add(CONTROL_CAPABILITIES[step.do]);
        if (step.do === "control.realtimeDrop" && step.expect !== undefined) matcher(step.expect.closed, "expect.closed");
        if (step.do === "control.waitLog" && step.expect !== undefined) matcher(step.expect, "expect");
        save();
        break;
      default: break;
    }
  });
  return { problems, requirements };
}

/** Reads every <suite>.json in `directory` (sorted) and returns analysed suites, or throws ScenarioError. */
export async function loadSuites(directory, { validate, catalog, vectors }) {
  let names;
  try { names = (await readdir(directory)).filter(name => name.endsWith(".json")).sort(); }
  catch (error) { throw new ScenarioError([`cannot read ${directory}: ${error instanceof Error ? error.message : error}`]); }
  if (!names.length) throw new ScenarioError([`${directory} contains no *.json scenario files`]);
  const problems = [], suites = [], owners = new Map();
  for (const name of names) {
    let document;
    try { document = await readJson(join(directory, name)); }
    catch (error) { problems.push(error instanceof Error ? error.message : String(error)); continue; }
    const errors = validate(document);
    if (errors.length) { problems.push(`${name}: ${formatErrors(errors, 10)}`); continue; }
    if (document.suite !== basename(name, ".json")) problems.push(`${name}: suite must be "${basename(name, ".json")}" to match the file name`);
    const scenarios = [];
    for (const definition of document.scenarios) {
      if (!definition.id.startsWith(`${document.suite}.`)) problems.push(`${name}: scenario id ${definition.id} must start with "${document.suite}."`);
      if (owners.has(definition.id)) problems.push(`${name}: scenario id ${definition.id} is already defined in ${owners.get(definition.id)}`);
      owners.set(definition.id, name);
      const analysis = analyzeScenario(definition, { catalog, vectors });
      problems.push(...analysis.problems.map(text => `${name}: ${text}`));
      scenarios.push({ definition, requirements: analysis.requirements });
    }
    suites.push({ suite: document.suite, title: document.title, file: name, scenarios });
  }
  if (problems.length) throw new ScenarioError(problems);
  return suites;
}

const escapeRegExp = text => text.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

/**
 * True when `id` is selected by any pattern. A pattern selects its exact id, every id below it
 * ("crud" selects "crud.messages.edit") or, with `*` wildcards, every id it fully matches.
 */
export function selected(id, patterns) {
  if (!patterns.length) return true;
  return patterns.some(pattern => {
    if (id === pattern || id.startsWith(`${pattern}.`)) return true;
    return pattern.includes("*") && new RegExp(`^${pattern.split("*").map(escapeRegExp).join(".*")}$`, "u").test(id);
  });
}
