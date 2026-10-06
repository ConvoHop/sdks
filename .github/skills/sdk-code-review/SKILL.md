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
- Current generated exports/builds, matching types/runtime behavior, Node 24
  and honest capability/publication documentation. Do not reintroduce removed
  prototype clients, invitation-only calls or unsupported Python/Go SDKs.

Reproduce suspected defects with the existing test frameworks. Add a failing
regression before fixing behavior where practical. Inspect consumer effects
without copying private backend source into this public repository.

Report each finding with location, triggering conditions, impact,
confidence and test evidence. Separate untested integration/release gates
from known defects. No findings in a narrow diff does not certify every
language SDK or production media behavior.
