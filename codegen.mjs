export default {
  schema: ["schema/communication-v1.graphql", "schema/management-v1.graphql"],
  documents: ["schema/operations-v1.graphql"],
  generates: {
    "packages/core/src/generated/v1-generated.ts": {
      plugins: ["typescript-operations"],
      config: {
        useTypeImports: true,
        skipTypename: true,
        strictScalars: true,
        scalars: {
          UUID: "string",
          Decimal: "string",
          PageSize: "number",
          Properties: "Record<string, unknown>",
          SignedProof: "Record<string, unknown>",
        },
      },
    },
  },
};
