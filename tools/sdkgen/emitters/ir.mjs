import { defineEmitter } from "../lib/emitter.mjs";
import { formatJson } from "../lib/json.mjs";

export const IR_PATH = "schema/ir.json";

/** Publishes the IR itself so emitters in other repositories and tools can read it without graphql-js. */
export default defineEmitter({
  name: "ir",
  description: "The language-neutral IR as schema/ir.json",
  emit(ir) {
    return [{ path: IR_PATH, contents: formatJson(ir) }];
  },
});
