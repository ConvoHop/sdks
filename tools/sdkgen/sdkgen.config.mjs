import docSnippets from "./emitters/doc-snippets.mjs";
import graphqlOperations from "./emitters/graphql-operations.mjs";
import ir from "./emitters/ir.mjs";
import typescript from "./emitters/typescript.mjs";

/**
 * The emitters `npm run generate:graphql` runs, in order, and their options
 * keyed by emitter name. Register new language emitters here.
 */
export default {
  emitters: [ir, graphqlOperations, typescript, docSnippets],
  options: {
    typescript: { directory: "packages/core/src/generated" },
  },
};
