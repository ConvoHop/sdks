// Loads the language-neutral files under spec/conformance/, validates them against their schemas
// and cross-checks what JSON Schema cannot express. Every runner invocation starts here.
import { protocolValidators } from "./driver-client.mjs";
import { readJson, specFile } from "./files.mjs";
import { compileSchema, formatErrors } from "./json-schema.mjs";

export class SpecError extends Error {
  constructor(problems) {
    super(`conformance spec files are invalid:\n  ${problems.join("\n  ")}`);
    this.name = "SpecError";
    this.problems = problems;
  }
}

export const SPEC_FILES = Object.freeze({
  scenarioSchema: "scenario.schema.json",
  targetSchema: "target.schema.json",
  protocolSchema: "driver-protocol.schema.json",
  vectorSchema: "webhook-vectors.schema.json",
  operationSchema: "operations.schema.json",
  operations: "operations.json",
  vectors: "vectors/webhooks.json",
});

export async function readSpecFiles() {
  const entries = await Promise.all(Object.entries(SPEC_FILES).map(async ([key, name]) => [key, await readJson(specFile(name))]));
  return Object.fromEntries(entries);
}

function crossCheck(files) {
  const problems = [];
  for (const [name, operation] of Object.entries(files.operations.operations)) {
    const overlap = operation.required.filter(argument => operation.optional.includes(argument));
    if (overlap.length) problems.push(`operations.json: ${name} lists ${overlap.join(", ")} as both required and optional`);
    for (const argument of Object.keys(operation.arguments ?? {}))
      if (!operation.required.includes(argument) && !operation.optional.includes(argument))
        problems.push(`operations.json: ${name} documents undeclared argument ${argument}`);
  }
  const seen = new Set();
  for (const vector of files.vectors.vectors) {
    if (seen.has(vector.id)) problems.push(`vectors/webhooks.json: duplicate vector id ${vector.id}`);
    seen.add(vector.id);
  }
  return problems;
}

/**
 * Returns compiled validators, the operation catalog and the webhook vectors by id.
 * Throws SpecError when a spec file is malformed; schema compile failures throw SchemaError.
 */
export async function loadSpec() {
  const files = await readSpecFiles();
  const validators = {
    scenario: compileSchema(files.scenarioSchema),
    target: compileSchema(files.targetSchema),
    protocol: protocolValidators(files.protocolSchema),
    operations: compileSchema(files.operationSchema),
    vectors: compileSchema(files.vectorSchema),
  };
  const problems = [];
  for (const [name, validate, value] of [[SPEC_FILES.operations, validators.operations, files.operations],
    [SPEC_FILES.vectors, validators.vectors, files.vectors]]) {
    const errors = validate(value);
    if (errors.length) problems.push(`${name}: ${formatErrors(errors, 10)}`);
  }
  if (problems.length) throw new SpecError(problems);
  problems.push(...crossCheck(files));
  if (problems.length) throw new SpecError(problems);
  return {
    validators,
    catalog: files.operations.operations,
    vectors: new Map(files.vectors.vectors.map(vector => [vector.id, vector])),
  };
}
