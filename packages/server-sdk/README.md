# `@convohop/server-sdk` (deprecated)

This package is deprecated. Use [`@convohop/server`](../server/README.md)
instead.

`@convohop/server-sdk` is a frozen shim that re-exports `@convohop/server`,
so existing source consumers keep working while they migrate. It gets no new
exports or fixes of its own, and it will be removed. It won't be published.

## Migrate

Change the import specifier:

```diff
-import { V1ProjectServerClient } from "@convohop/server-sdk";
+import { V1ProjectServerClient } from "@convohop/server";
```

Every export keeps its name and behavior. For details, see
[Migrating from `@convohop/server-sdk`](../server/README.md#migrating-from-convohopserver-sdk).

## What the shim keeps

The package `exports` map exposes only the root entry point, as before. The
build still writes the old `dist/index.js` and `dist/v1.js` modules for code
that loads them by file path.
