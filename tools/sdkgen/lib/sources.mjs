import { readdirSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { Kind, buildASTSchema, parse, validateSchema } from "graphql";
import { isPlainObject } from "./json.mjs";
import { ROOT_KINDS } from "./graphql-model.mjs";
import { codeUnitCompare } from "./naming.mjs";

/** Repository-relative inputs. Every path may be overridden (tests point them at fixtures). */
export const DEFAULT_PATHS = Object.freeze({
  schemaDir: "schema",
  annotations: "schema/annotations.json",
  annotationsSchema: "schema/annotations.schema.json",
  irSchema: "schema/ir.schema.json",
});

const PLANE_FILE = /^([a-z][A-Za-z0-9]*)\.graphql$/;

/** An input file is missing, unreadable, not valid JSON or not a valid GraphQL schema. */
export class SourceError extends Error {}

/**
 * Loads the GraphQL plane schemas and the annotations. `root` is an absolute
 * directory; relative paths resolve against it and are reported relative to it.
 */
export function loadSources({ root, paths = {} }) {
  const resolved = { ...DEFAULT_PATHS, ...paths };
  const absolute = path => (isAbsolute(path) ? path : join(root, path));
  const json = path => {
    const text = attempt(path, "cannot be read", () => readFileSync(absolute(path), "utf8"));
    return attempt(path, "is not valid JSON", () => JSON.parse(text));
  };
  return {
    root,
    paths: resolved,
    annotationsPath: resolved.annotations,
    annotations: json(resolved.annotations),
    annotationsSchema: json(resolved.annotationsSchema),
    irSchema: json(resolved.irSchema),
    planes: discoverPlanes(absolute(resolved.schemaDir), resolved.schemaDir),
  };
}

/**
 * Finds `<plane>.graphql` type-system files. Executable documents with the
 * same naming pattern (the generated `operations.graphql`) are skipped.
 */
export function discoverPlanes(directory, displayDirectory) {
  const files = attempt(displayDirectory, "cannot be read", () => readdirSync(directory));
  return files
    .filter(file => PLANE_FILE.test(file))
    .sort(codeUnitCompare)
    .flatMap(file => {
      const path = `${displayDirectory}/${file}`;
      const text = attempt(path, "cannot be read", () => readFileSync(join(directory, file), "utf8"));
      const document = attempt(path, "is not valid GraphQL", () => parse(text));
      const typeSystem = document.definitions.some(definition =>
        definition.kind === Kind.SCHEMA_DEFINITION || definition.kind === Kind.OBJECT_TYPE_DEFINITION);
      if (!typeSystem) return [];
      const schema = attempt(path, "is not a valid GraphQL schema", () => buildASTSchema(document));
      const errors = validateSchema(schema);
      if (errors.length) throw new SourceError(`${path} is not a valid GraphQL schema: ${errors.map(error => error.message).join("; ")}`);
      return [{ name: PLANE_FILE.exec(file)[1], file, path, text, document, schema }];
    });
}

function attempt(path, problem, read) {
  try {
    return read();
  } catch (error) {
    throw new SourceError(`${path} ${problem}: ${error.message}`);
  }
}

/** Plane generation order: annotated planes first (in annotation order), then undeclared ones. */
export function planeOrder(planes, annotations) {
  const discovered = planes.map(plane => plane.name);
  const declared = isPlainObject(annotations?.planes) ? Object.keys(annotations.planes).filter(name => discovered.includes(name)) : [];
  return [...declared, ...discovered.filter(name => !declared.includes(name))];
}

/** Every root field, by plane, then query, mutation and subscription, in schema order. */
export function schemaOperations(planes, order) {
  const byName = new Map(planes.map(plane => [plane.name, plane]));
  const operations = [];
  for (const name of order) {
    const plane = byName.get(name);
    if (!plane) continue;
    for (const [kind, getter] of ROOT_KINDS) {
      const type = plane.schema[getter]();
      if (!type) continue;
      for (const field of Object.values(type.getFields())) {
        operations.push({ id: `${name}.${field.name}`, plane: name, kind, field, schema: plane.schema, schemaPath: plane.path });
      }
    }
  }
  return operations;
}
