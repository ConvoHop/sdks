# ConvoHop SDK core

`@convohop/core` holds the protocol types, generated GraphQL operations and
HTTP transport that the ConvoHop client and server SDKs share. It's an ESM
package with TypeScript declarations. It isn't on a package registry yet:
[install it from a GitHub Release](https://github.com/ConvoHop/sdks#install-a-release)
together with the client or server SDK. License: [Apache-2.0](LICENSE).

**Don't import `@convohop/core` directly.** It's installed as a dependency of
[`@convohop/client`](../client/README.md) and
[`@convohop/server`](../server/README.md), and both re-export its public API.

## Entry points

| Subpath | Contents | Stability |
| --- | --- | --- |
| `.` | `V1Problem`, `V1Transport`, protocol validators and types, `v1Operations` and the generated `V1Graphql` types. | Public only through `@convohop/client` and `@convohop/server`. |
| `./internal` | Helpers shared by the client and server packages. | Internal. Can change in any release. |
| `./internal/generated` | Generated operation types, without the `V1Graphql` namespace. | Internal. Can change in any release. |

## Runtimes

Core has no Node.js or DOM imports and no import side effects. It uses only
these globals: `fetch`, `URL`, `TextEncoder`, `structuredClone`,
`AbortSignal.timeout`, `crypto.randomUUID` and `crypto.subtle.digest`.

It's built for browsers, React Native and Node.js 22+. CI runs its unit tests
on Node.js 22 and 24 only. Browsers and React Native aren't verified in CI.

## Generated code

`npm run generate:graphql` writes `src/generated/` from the schemas and
operation annotations in [`schema/`](../../schema). Don't edit these files by
hand. `npm run check:graphql` fails when they're stale. For details, see
[Generated code](../../CONTRIBUTING.md#generated-code).
