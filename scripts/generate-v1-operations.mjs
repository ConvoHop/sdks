import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildSchema, getNamedType, isObjectType, isUnionType, isEnumType, isScalarType, parse, print, validate } from "graphql";

const root = fileURLToPath(new URL("../", import.meta.url));
const check = process.argv.includes("--check");
function output(path, text) {
  if (check) {
    if (readFileSync(root + path, "utf8") !== text) throw new Error(`Generated GraphQL drift: ${path}`);
  } else writeFileSync(root + path, text);
}
function responseName(type, field) {
  return type.name === "LegacyInviteOnlyCall" && field.name === "state" ? "legacyState" : field.name;
}
function selection(type, stack = []) {
  const named = getNamedType(type);
  if (isUnionType(named)) return "{ __typename " + named.getTypes().map(member =>
    `... on ${member.name} ${selection(member, [...stack, named.name])}`).join(" ") + " }";
  if (!isObjectType(named)) return "";
  if (stack.includes(named.name) || stack.length >= 12) throw new Error(`Unexpected recursive public result: ${named.name}`);
  return "{ " + Object.values(named.getFields()).map(field =>
    // Union leaf fields must have compatible response types even in exclusive fragments.
    (responseName(named, field) === field.name ? field.name : `${responseName(named, field)}: ${field.name}`)
      + selection(field.type, [...stack, named.name])).join(" ") + " }";
}
const operations = {}, documents = [], types = [], shapes = {};
for (const plane of ["communication", "management"]) {
  const schema = buildSchema(readFileSync(root + `schema/${plane}-v1.graphql`, "utf8"));
  for (const type of Object.values(schema.getTypeMap())) {
    if (type.name.startsWith("__")) continue;
    const shape = isObjectType(type) ? { kind: "object", fields: Object.fromEntries(Object.values(type.getFields())
      .map(field => [responseName(type, field), String(field.type)])) }
      : isUnionType(type) ? { kind: "union", members: type.getTypes().map(member => member.name) }
      : isEnumType(type) ? { kind: "enum", values: type.getValues().map(value => value.name) }
      : isScalarType(type) ? { kind: "scalar" } : undefined;
    if (shape && !["Query", "Mutation", "Subscription"].includes(type.name)) shapes[type.name] = shape;
  }
  for (const [kind, type] of [["query", schema.getQueryType()], ["mutation", schema.getMutationType()], ["subscription", schema.getSubscriptionType()]]) {
    if (!type) continue;
    for (const field of Object.values(type.getFields())) {
      const name = plane[0].toUpperCase() + plane.slice(1) + field.name[0].toUpperCase() + field.name.slice(1);
      const variables = field.args.map(arg => `$${arg.name}: ${arg.type}`).join(", ");
      const args = field.args.map(arg => `${arg.name}: $${arg.name}`).join(", ");
      const document = parse(`${kind} ${name}(${variables}) { ${field.name}(${args}) ${selection(field.type)} }`);
      const errors = validate(schema, document);
      if (errors.length) throw new Error(errors.map(error => error.message).join("\n"));
      let fields = 0, depth = 0;
      function count(set, level = 0) {
        if (!set) return;
        depth = Math.max(depth, level);
        for (const field of set.selections) { fields++; count(field.selectionSet, level + 1); }
      }
      count(document.definitions[0].selectionSet);
      if (fields > 500 || depth > 12) throw new Error(`Generated operation exceeds server bounds: ${name}: ${fields}/${depth}`);
      const key = `${plane}.${field.name}`, query = print(document);
      const input = field.args.find(arg => arg.name === "input");
      operations[key] = { plane, kind, field: field.name, operationName: name, query, resultType: String(field.type),
        inputFields: input ? Object.keys(getNamedType(input.type).getFields()) : [] };
      const typeName = name + kind[0].toUpperCase() + kind.slice(1);
      types.push(`  "${key}": { variables: Generated.${typeName}Variables; result: Generated.${typeName} };`);
      documents.push(query);
    }
  }
}
const routes = JSON.parse(readFileSync(root + "schema/v1-routes.json", "utf8"));
for (const [plane, , , binding] of routes) {
  if (!operations[`${plane}.${binding}`]) throw new Error(`Compatibility method has no typed operation: ${plane}.${binding}`);
}
const notice = "// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.\n";
output("schema/operations-v1.graphql", documents.join("\n\n") + "\n");
output("schema/v1-operations.json", JSON.stringify({ operations, routes }, null, 2) + "\n");
output("packages/browser-sdk/src/v1-operations.ts", notice +
  'import type * as Generated from "./v1-generated.js";\n' +
  `export interface V1OperationTypes {\n${types.join("\n")}\n}\n` +
  "export type V1OperationKey = keyof V1OperationTypes;\n" +
  "export interface V1Operation { plane: string; kind: string; field: string; operationName: string; query: string; resultType: string; inputFields: readonly string[] }\n" +
  'export type V1OutputShape = { kind: "scalar" } | { kind: "enum"; values: readonly string[] } | { kind: "object"; fields: Readonly<Record<string, string>> } | { kind: "union"; members: readonly string[] };\n' +
  `export const v1OutputShapes: Readonly<Record<string, V1OutputShape>> = ${JSON.stringify(shapes, null, 2)};\n` +
  `export const v1Operations: Record<V1OperationKey, V1Operation> = ${JSON.stringify(operations, null, 2)};\n` +
  `export const v1Routes: readonly (readonly string[])[] = ${JSON.stringify(routes, null, 2)};\n`);
console.log(`${Object.keys(operations).length} typed GraphQL operations validated against both exported schemas.`);
