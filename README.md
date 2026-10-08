# ConvoHop SDKs

[![SDK CI](https://github.com/ConvoHop/sdks/actions/workflows/sdk-ci.yml/badge.svg?branch=main)](https://github.com/ConvoHop/sdks/actions/workflows/sdk-ci.yml)

Official SDKs for ConvoHop, a platform for adding chat, voice and video calls
to your apps. Messages and calls share the same conversations, identities and
permissions, so you don't have to stitch separate services together.

> [!IMPORTANT]
> The SDKs are pre-release. No package has been published to a package
> registry yet, and APIs can change in any 0.x release. Until registry
> publishing starts, releases are attached to GitHub Releases in this
> repository. This repository contains SDK source code only, not the
> ConvoHop service.

## Two kinds of SDK

ConvoHop SDKs are split by the credential they hold and where they run:

- **Server SDKs** run in trusted runtimes that you operate, such as
  application backends, workers, bots and AI agents. They use a secret
  backend key. They manage identities, sessions, conversations, members and
  webhooks, and they can also read and send messages for your backend.
- **Client SDKs** run in browsers and apps on end-user devices. They use a
  short-lived session for one signed-in user, which your backend issues. They
  handle chat, realtime updates, calls and the push notifications that you
  send.

Backend keys never belong in client code. The
[SDK strategy](docs/sdk-strategy.md) explains the split, and covers the
planned languages, push notifications, package names, versioning and support.

## SDKs

### Available as source

| SDK | Package | Runtime | Covers |
| --- | --- | --- | --- |
| [Client](packages/client/README.md) | `@convohop/client` | Current browsers. React Native isn't verified yet. | Chat, history and search, realtime updates with replay, and calls with explicit connect and capture |
| [Node.js server](packages/server/README.md) | `@convohop/server` | Node.js 22 or later | Organization and project management, user identities and sessions, conversations and membership, messages, inbox, search and calls for your backend, webhook verification, and push payload builders |

Both packages depend on [`@convohop/core`](packages/core/README.md), which
holds the generated GraphQL types and operations and the shared transport.
Don't import `@convohop/core` directly: everything you need from it is
re-exported by `@convohop/client` and `@convohop/server`.

The packages are ESM-only, with TypeScript declarations included. CommonJS
code on Node.js 22.12 or later can load them with `require()`.

These names match the planned registry names under
[package names](docs/sdk-strategy.md#package-names), but nothing is on a
package registry yet. [Install a release](#install-a-release) or
[build from source](#build-from-source).

### Planned

| Layer | Languages and platforms |
| --- | --- |
| Server | Python, .NET, Java and Kotlin, Go |
| Client | React hooks, iOS and macOS (Swift), Android (Kotlin), React Native, Flutter |

## How it fits together

1. Your users sign in to your app with your own authentication.
2. Your backend uses a server SDK to map each user to a ConvoHop identity and
   issue a short-lived session for that user's device.
3. Your app passes the session to a client SDK, which handles chat, realtime
   updates and calls for that user.
4. ConvoHop sends signed webhooks to your backend. You verify them with a
   server SDK and can, for example, send push notifications with your own
   APNs, FCM or Web Push credentials.

`@convohop/server` verifies these webhooks and returns typed events,
including the per-recipient notification events for push notifications. See
[push notifications](docs/sdk-strategy.md#push-notifications-bring-your-own).
The package READMEs have code samples.

## Install a release

Until the packages are on a registry, each release is attached to a
[GitHub Release](https://github.com/ConvoHop/sdks/releases) in this
repository, with checksums, an SBOM and signed build provenance. For
example, to install client 0.1.0 with the core version that it needs:

```sh
gh release download core-v0.1.0 --repo ConvoHop/sdks --dir convohop/core
gh release download client-v0.1.0 --repo ConvoHop/sdks --dir convohop/client

# Check the downloads. On macOS, use `shasum -a 256 -c SHA256SUMS`.
(cd convohop/core && sha256sum -c SHA256SUMS)
(cd convohop/client && sha256sum -c SHA256SUMS)

npm install ./convohop/core/convohop-core-0.1.0.tgz ./convohop/client/convohop-client-0.1.0.tgz
```

- Always install the `@convohop/core` tarball in the same command.
  Otherwise npm looks for `@convohop/core` on the registry, where it isn't
  published yet. To see the core version that a package needs, run
  `tar -xzOf convohop/client/convohop-client-0.1.0.tgz package/package.json`.
- npm saves the tarball paths in your `package.json`, so keep the tarballs
  with your project.
- To check that this repository's release workflow built a tarball, see
  [Installing and verifying a release](RELEASING.md#installing-and-verifying-a-release).

## Build from source

You need Node.js 22 or later.

```sh
npm ci
npm run check:annotations
npm run check:graphql
npm run build
npm test                 # package, generator and conformance harness tests
npm run check:packages   # publint and Are the Types Wrong? package checks
npm run check:release    # release scripts, release configuration and workflow rules
npm run conformance      # shared conformance scenarios against a local mock
```

The [conformance suite](spec/conformance/README.md) holds language-neutral
scenarios that every SDK must pass. `npm run conformance` runs them through
the TypeScript reference driver against a deterministic mock, and can also
run them against a real deployment.

The unit tests and the mock don't need service credentials. They don't prove
real WebRTC media, database persistence or the behavior of a hosted service.
[CI](.github/workflows/sdk-ci.yml) runs the other checks on Node.js 22 and 24
for every pull request. On Node.js 24, it also packs `@convohop/core`,
`@convohop/client` and `@convohop/server` and runs `npm publish --dry-run`.
The [Conformance workflow](.github/workflows/conformance.yml) runs the
scenarios on Node.js 24. Neither workflow publishes or deploys anything.

## API contract

- The Communication API and the Management API have separate origins. Each
  serves GraphQL at an unversioned `/graphql` path. Realtime uses the
  `graphql-transport-ws` protocol on the Communication origin's `/graphql`.
- The schemas in [`schema/`](schema) are exported by the API. They're the
  source for generated operations, input and output types, and runtime
  response validation. After you change them, run `npm run generate:graphql`.
  `npm run check:graphql` detects drift. Don't edit generated files by hand.
- [`schema/annotations.json`](schema/annotations.json) annotates every
  operation with its SDK layer, authorization, idempotency, pagination,
  realtime behavior and error codes. The schemas and annotations compile into
  a language-neutral IR that every SDK generator reads. See
  [SDK generation](docs/sdk-generation.md).
- Every generated operation is available through the low-level transport:
  `http.execute("communication.<operation>", projectId, input, requestId)` or
  `http.execute("management.<operation>", undefined, input, requestId)`.
  There are no REST-style routes or aliases.

## Security essentials

- Keep backend keys and management credentials on servers that you control.
  Never put them in browser or app bundles, URLs, storage or logs.
- Authenticate each user with your own sign-in before your backend maps them
  to a ConvoHop identity. A user ID sent by a client isn't proof of identity.
- Recovery storage holds original request inputs, which can include message
  text, so treat it as application data. It never holds bearer tokens, media
  grants or credential-delivery permits.

To report a vulnerability, see [SECURITY.md](SECURITY.md).

## Reliability

- Every mutation has a request ID. `client.requests.resolve(id)` reads the
  current receipt evidence for a request. `client.requests.retry(id)` resolves
  first. It then resends only a command that wasn't observed, with its
  original ID and payload, within the original budget of three attempts and
  60 seconds.
- A network failure is an unknown outcome, not a failure. Once a request is
  known to be accepted, or a media admission has been attempted, the SDK
  won't resend it.
- Backends can keep recovery state in their own database with
  [`asyncRecoveryStorage`](packages/server/README.md#asynchronous-database-recovery-storage).
  Your application must coordinate writers across processes and overlapping
  deployments. Backends can also read
  [credential-free session request outcomes](packages/server/README.md#read-only-session-request-outcomes).
  These reads never return a token, and a missing observation isn't proof
  that a request didn't commit.
- Browser apps can opt in to
  [session refresh](packages/client/README.md#session-credential-lifetime).
- Starting or joining a call, connecting media, and turning on the microphone
  or camera are separate, explicit steps. A reconnect starts with capture
  off. Media admission needs the matching ConvoHop media server (SFU) and
  current authorization. A token, membership or open WebSocket alone doesn't
  grant media forwarding. After a server restart, the old call ends through
  durable recovery instead of continuing transparently.

## Documentation

- [SDK strategy](docs/sdk-strategy.md): layers, languages, push
  notifications, package names, versioning and support
- [Client SDK](packages/client/README.md)
- [Node.js server SDK](packages/server/README.md)
- [Shared core package](packages/core/README.md)
- [Releasing](RELEASING.md): how releases happen, and how to install and
  verify them
- [Conformance suite](spec/conformance/README.md): scenarios, the driver
  protocol, targets and webhook signature vectors
- [Push payload contract](spec/push-payload/README.md): per-recipient
  notification events, the push requests built from them and shared vectors
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

The SDK source is licensed under the [Apache License, Version 2.0](LICENSE).
See [NOTICE](NOTICE). The license covers this source code. It doesn't grant
access to a hosted ConvoHop service.
