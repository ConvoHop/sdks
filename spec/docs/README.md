# Docs pipeline schemas

JSON Schemas for the [docs pipeline](../../docs/docs-pipeline.md), which
generates the SDK documentation in [`docs/site`](../../docs/site). docgen
validates every input and output against them, with the same JSON Schema
subset as the [SDK generator](../../docs/sdk-generation.md#json-schema-validation).

Each language provides these inputs in `docs/languages/<id>/`:

| Schema | Validates |
| --- | --- |
| [`language.schema.json`](language.schema.json) | `language.json`: the language's packages, quickstarts, snippet roots, and extractor and test commands |
| [`surface.schema.json`](surface.schema.json) | `surface.json`: the packages' public API, as the language's extractor prints it |
| [`operation-map.schema.json`](operation-map.schema.json) | `operations.json`: the public members that send each operation |

docgen writes these outputs in `docs/site`, and a website reads them:

| Schema | Validates |
| --- | --- |
| [`manifest.schema.json`](manifest.schema.json) | `manifest.json`: navigation and metadata for every page |
| [`reference.schema.json`](reference.schema.json) | `<language>/reference/<slug>.json`: a package's reference as data |
| [`operation-index.schema.json`](operation-index.schema.json) | `operations/index.json`: every operation with the SDK members that send it |

The output schemas, with the layout of `docs/site`, are the contract with
the website. Change them only by adding to them. See
[Output](../../docs/docs-pipeline.md#output).
