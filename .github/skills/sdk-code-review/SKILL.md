---
name: sdk-code-review
description: Review current ConvoHop SDK changes for schema alignment, authorization, retry/replay correctness and native media lifecycle defects. Use for pull request and release reviews.
---

# SDK review

Read `.github/copilot-instructions.md`, affected public declarations,
implementations, examples and tests. Establish which client/language and
protocol version the change actually supports.

Trace request construction, transport behavior, response validation and
caller-visible state together. Prioritize:

- Browser/backend credential separation and safe diagnostics.
- Stable mutation identity and payload after uncertainty, bounded retries
  across restarts, receipt resolution and explicit cancellation semantics.
- String counters, pagination progress, replay cursors and visibility-epoch
  cache invalidation; no rounding or silent recovery-from-zero.
- Subscription cleanup, reauthentication, scope changes, slow consumers and
  stale asynchronous callbacks.
- One-use native admission, exact acknowledgment handling, no bypassing
  reconnect, source rights and cleanup of media tracks/elements/listeners.
- Current generated exports/builds, matching types/runtime behavior, Node 22
  and 24, and honest capability/publication documentation.
- Package boundaries: `client` and `server` import only `@convohop/core`
  entry points, never each other; `server` holds no browser/media code;
  backend-key code never reaches `client`; deprecated shims stay frozen.
  Exports maps, `types`, `sideEffects` and `engines` stay accurate
  (`npm run check:packages`). Do not reintroduce removed
  prototype clients, invitation-only calls or the earlier Python/Go SDKs. New
  language SDKs must follow `docs/sdk-strategy.md`.

Reproduce suspected defects with the existing test frameworks. Add a failing
regression before fixing behavior where practical. Inspect consumer effects
without copying private backend source into this public repository.

Report each finding with location, triggering conditions, impact,
confidence and test evidence. Separate untested integration/release gates
from known defects. No findings in a narrow diff does not certify every
language SDK or production media behavior.
