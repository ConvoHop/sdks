# `@convohop/browser-sdk` (deprecated)

This package is deprecated. Use [`@convohop/client`](../client/README.md)
instead.

`@convohop/browser-sdk` is a frozen shim that re-exports `@convohop/client`,
so existing source consumers keep working while they migrate. It gets no new
exports or fixes of its own, and it will be removed. It won't be published.

## Migrate

Change the import specifier:

```diff
-import { V1Client } from "@convohop/browser-sdk";
+import { V1Client } from "@convohop/client";
```

Every root export keeps its name and behavior. For details, see
[Migrating from `@convohop/browser-sdk`](../client/README.md#migrating-from-convohopbrowser-sdk).

## What the shim keeps

The package `exports` map exposes only the root entry point, as before. The
build still writes the old `dist/` modules for code that loads them by file
path: `index.js`, `v1.js`, `live.js`, `v1-media.js`, `v1-graphql.js`,
`v1-operations.js` and `v1-generated.js`.
