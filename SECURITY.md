# Security policy

## Report a vulnerability

**Don't report security vulnerabilities in public GitHub issues, discussions
or pull requests.**

Report them privately with GitHub's private vulnerability reporting:

1. Open the repository's [Security tab](https://github.com/ConvoHop/sdks/security).
2. Select **Report a vulnerability**, or go straight to the
   [advisory form](https://github.com/ConvoHop/sdks/security/advisories/new).

Only you and the repository maintainers can see the report. Include as much
of the following as you can:

- The affected package, and its version or the commit you built from.
- The kind of issue, for example credential exposure, authorization bypass,
  request replay, injection or denial of service.
- Steps to reproduce, ideally with a minimal proof of concept.
- The impact: what an attacker can do, and what they need first.
- Any mitigation or fix you suggest.

Never include working credentials. Redact tokens, backend keys, session
credentials and personal data from code, logs and screenshots. If a ConvoHop
credential was exposed, revoke or rotate it before you report.

## What to expect

We aim to:

- Acknowledge your report within 3 business days.
- Give you an initial assessment within 10 business days.
- Keep you updated while we work on a fix, and agree a disclosure date with
  you.
- Publish a GitHub security advisory with the fix, request a CVE where one
  applies, and credit you if you'd like to be credited.

These are targets, not contractual commitments.

## Supported versions

The SDKs are pre-release (0.x) and nothing has been published to a package
registry yet.

| Version | Security fixes |
| --- | --- |
| `main` | Yes |
| Latest 0.x minor release of each package, once published | Yes |
| Older 0.x releases | No. Upgrade to the latest release. |

After 1.0, the [support policy](docs/sdk-strategy.md#support-policy) defines
which major versions receive security fixes.

## Scope

In scope:

- Source code in this repository: the SDK packages, generated code, code
  generation and build scripts, examples and CI workflows.
- SDK behavior that could expose credentials, bypass authorization, replay or
  duplicate requests, or leak data between users.

Vulnerabilities in the hosted ConvoHop service can be reported through the
same form. We'll route them to the right team.

Out of scope:

- Publicly known vulnerabilities in third-party dependencies. Report them
  upstream. Tell us if the way the SDKs use a dependency makes it exploitable.
- Attacks that need an already compromised device, browser or backend.
- Reports from automated scanners with no demonstrated impact.

## Research guidelines

When you research a vulnerability:

- Test only against projects, accounts and data that you own.
- Don't access, change or keep other people's data. If you reach it by
  accident, stop and tell us in your report.
- Don't run denial-of-service, load or spam tests against hosted services.
- Give us reasonable time to release a fix before you disclose anything
  publicly.

## How the SDKs handle credentials

The [security model](docs/sdk-strategy.md#security-model) describes how the
SDKs separate secret backend credentials from short-lived user credentials.
