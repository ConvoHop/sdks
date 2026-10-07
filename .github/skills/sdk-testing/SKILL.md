---
name: sdk-testing
description: Build maintainable current ConvoHop Browser/Node regression tests with node:test. Use for SDK validation, recovery/protocol changes and integration coverage.
---

# SDK framework testing

Use the existing package test suites:

- TypeScript packages (`core`, `client` and `server`): root `npm test` builds
  packages and runs `node:test` from `packages/<name>/test/`.
- Generated contract: root `npm run check:graphql`.
- Operation annotations: root `npm run check:annotations`.
- SDK generator (`tools/sdkgen`): root `npm run test:sdkgen` (also part of
  `npm test`). Emitters are tested against the edge-case fixture in
  `tools/sdkgen/test/fixtures/` and golden files; refresh goldens only for
  intended output changes with `UPDATE_GOLDEN=1 npm run test:sdkgen` and
  review the diff. Add new GraphQL shapes to the fixture rather than relying
  on the production schema.
- Package metadata and export maps: root `npm run check:packages` (publint
  and attw). Each package's `surface.test.mjs` pins its runtime exports and
  allowed imports.
- Cross-SDK behavior: scenarios in `spec/conformance/scenarios/`, run with
  root `npm run conformance` (reference driver against the mock). The
  harness's own tests in `conformance/test/` run as part of `npm test`.

Prototype clients and the earlier Python/Go implementations were deliberately
removed. New language SDKs follow `docs/sdk-strategy.md`. Test the current
exported contract, not compatibility aliases.

Reuse fixtures and transport seams. Do not deliver standalone assertion
scripts or a second SDK-shaped test client. Keep unit stubs deterministic
and clearly separate from real backend/browser integration evidence.

Cover successful and malformed responses, application rejection versus
transport uncertainty, exact mutation identities/fingerprints, retries and
deadlines, recovery across restarts, cursor validation and deduplication,
reauthentication, cancellation and cleanup. Test values beyond JavaScript's
safe integer range without converting SQL counters to numbers.

For media protocol changes, test prelude-before-native-open ordering,
one-use token binding, acknowledgment filtering, invalid/replayed/expired
proof handling and disposal. Actual audio/video integration belongs in the
consumer's maintained Playwright suite against a real service/SFU; synthetic
camera/microphone sources are acceptable, fabricated RTP counters are not.

Use isolated artifacts and no real credentials. Run focused cases while
iterating, then the complete affected package suites and Node 22 and 24 CI.
Record skipped or unavailable integration explicitly.
