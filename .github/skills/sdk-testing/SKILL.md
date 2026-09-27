---
name: sdk-testing
description: Build maintainable ConvoHop SDK regression tests with Node node:test, Python unittest and Go testing. Use for SDK validation, recovery/protocol changes and integration coverage.
---

# SDK framework testing

Use the existing package test suites:

- Browser/Node: root `npm test` builds packages and runs `node:test`.
- Python: install `./packages/python-sdk`, then run
  `python -m unittest discover -s packages/python-sdk/tests -v`.
- Go: run `go test ./...` and `go vet ./...` in `packages/go-sdk`.

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
iterating, then the complete affected package suites and supported-version
CI matrix. Record skipped or unavailable integration explicitly.
