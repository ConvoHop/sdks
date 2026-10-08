import { defineEmitter } from "../lib/emitter.mjs";
import { operationCatalog } from "../lib/ir-model.mjs";

export const DOCUMENTS_PATH = "schema/operations.graphql";
export const CATALOG_PATH = "schema/operations.json";

/** Language-neutral operation documents and the runtime operation catalog. */
export default defineEmitter({
  name: "graphql-operations",
  description: "GraphQL operation documents and the JSON operation catalog",
  emit(ir) {
    return [
      { path: DOCUMENTS_PATH, contents: `${ir.operations.map(operation => operation.document.text).join("\n\n")}\n` },
      { path: CATALOG_PATH, contents: `${JSON.stringify({ operations: operationCatalog(ir) }, null, 2)}\n` },
    ];
  },
});
