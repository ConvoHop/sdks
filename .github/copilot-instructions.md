# ConvoHop SDK instructions

This is the canonical public `ConvoHop/sdks` repository. The TypeScript
packages live under `packages/`: `core` (generated types/operations and the
isomorphic transport; not a supported entry point), `client` (user-session
SDK for browsers and React Native) and `server` (backend-key/management SDK
for Node.js). `client` and `server` depend only on `core`. The private backend
consumes this repository through a pinned submodule; never create a second
SDK in a consumer or include private service implementation/configuration
here.

All packages are root npm workspaces. Use Node 22 or later (CI: 22 and 24)
and the root `package-lock.json`: `npm ci`, `npm run build`, `npm test`.
Package tests use Node's test runner and strict TypeScript builds.
`npm run check:graphql` checks actual authority-exported schemas and
generated operations/types in `packages/core/src/generated/`.
`npm run check:packages` runs publint and attw on every package.
`npm run check:release` tests the release scripts, release-please config
and workflow policy. Releases follow `RELEASING.md`: never hand-edit package
versions, `CHANGELOG.md` files or `.release-please-manifest.json`; keep
unreleased workspaces `private`; pin every action to a full commit SHA and
grant each job least-privilege `permissions`. npm publishing stays a dry run
until registry publishing (REL-PUB) is approved.

`tools/sdkgen` generates from the schemas plus `schema/v1-annotations.json`
through a versioned language-neutral IR (`schema/v1-ir.json`); see
`docs/sdk-generation.md`. Every schema operation needs an annotation entry
(`npm run check:annotations`; see CONTRIBUTING "Annotating operations").
Annotate real behavior: layer must match the accepted credentials, and
mutations need an accurate idempotency class. Regenerate with
`npm run generate:graphql`; never hand-edit or hand-merge generated files.
Generator changes update goldens with `UPDATE_GOLDEN=1 npm run test:sdkgen`.

Only the current Conversation/LiveSession/Participation model is supported.
The zero-customer consolidation deliberately removed prototype clients and
the earlier Python/Go SDKs; do not restore them. Add new language SDKs only
as planned in `docs/sdk-strategy.md`, generated from the shared schema and
passing the shared conformance tests. Do not restore compatibility adapters
or REST-shaped logical routes: HTTP and graphql-transport-ws use unversioned
`/graphql`.
`V1*` is a current SDK/domain name, not a selectable API version.
Do not advertise registry publication without release evidence.

Keep browser credentials short-lived and scoped. Trusted backend/operator
keys must never enter browser code, bundles, storage, URLs or examples.
Redact authentication from errors and diagnostics. Keep SQL counters as
canonical strings, validate response/proof shapes and reject unsupported
features explicitly. Do not use casts or defaults to disguise malformed
responses as success.

Mutation retries preserve the original request ID, payload, incarnation
and retry budget. Transport uncertainty is not rejection or commit.
Persist only caller-approved recovery state, never tokens. Use current
authorized replay cursors; do not silently reset invalid/expired cursors.
Visibility changes invalidate old receipt coverage.

Native media uses one-attempt admission and server-owned forwarding leases.
The Web client admits with the `convohop.admission.v1` prelude. Clients that
wrap a stock LiveKit SDK connect with the grant's single-use `connectToken`
and resume only with it or SFU-pushed refresh tokens (see
`docs/sdk-strategy.md`). Never bypass admission or reuse cached credentials
for a new native connection. Clean up owned media elements, tracks,
listeners and bindings.
Unit mocks do not prove real WebRTC transport or packet expiry.

Use the `sdk-code-review` and `sdk-testing` skills. Put regression assertions
in maintained framework tests, not one-off scripts. Update public examples
and generated declarations with API changes, never with real credentials.
Report exactly which language/client paths and integration environments
were verified; a green unit suite is not production certification.
