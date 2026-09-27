# ConvoHop SDK instructions

This is the canonical public `ConvoHop/sdks` repository. Browser, trusted
Node, Python and Go SDKs live under `packages/`. The private backend consumes
this repository through a pinned submodule; never create a second SDK in a
consumer or include private service implementation/configuration here.

Browser and Node are root npm workspaces. Use Node 24 and the root
`package-lock.json`: `npm ci`, `npm run build`, `npm test`. Package tests use
Node's test runner and strict TypeScript builds. Python uses
`python -m unittest discover -s packages/python-sdk/tests -v` after installing
that local package; Go uses `go test ./...` and `go vet ./...` from
`packages/go-sdk`. Preserve supported-language/version checks in CI.

Do not conflate an existing GraphQL API with the separately named v1
REST/WSS API. Preserve compatibility until a deliberate documented
migration. Do not advertise Python/Go v1 parity or registry publication
without implementation and release evidence.

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
Do not bypass the prelude or reuse cached credentials for autonomous native
reconnect. Clean up owned media elements, tracks, listeners and bindings.
Unit mocks do not prove real WebRTC transport or packet expiry.

Use the `sdk-code-review` and `sdk-testing` skills. Put regression assertions
in maintained framework tests, not one-off scripts. Update public examples
and generated declarations with API changes, never with real credentials.
Report exactly which language/client paths and integration environments
were verified; a green unit suite is not production certification.
