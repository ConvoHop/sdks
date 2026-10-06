# ConvoHop SDKs

[![SDK CI](https://github.com/ConvoHop/sdks/actions/workflows/sdk-ci.yml/badge.svg?branch=main)](https://github.com/ConvoHop/sdks/actions/workflows/sdk-ci.yml)

Official SDKs for ConvoHop, a platform for adding chat, voice and video calls
to your apps. Messages and calls share the same conversations, identities and
permissions, so you don't have to stitch separate services together.

> [!IMPORTANT]
> The SDKs are pre-release. No package has been published to a package
> registry yet, and APIs can change in any 0.x release. This repository
> contains SDK source code only, not the ConvoHop service.

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
| [Web client](packages/browser-sdk/README.md) | `@convohop/browser-sdk` | Current browsers | Chat, history and search, realtime updates with replay, and calls with explicit connect and capture |
| [Node.js server](packages/server-sdk/README.md) | `@convohop/server-sdk` | Node.js 24 or later | Organization and project management, user identities and sessions, conversations and membership |

These package names are transitional. The planned published names are listed
under [package names](docs/sdk-strategy.md#package-names).

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

Notification events and the webhook verification helpers for step 4 are in
development. See
[push notifications](docs/sdk-strategy.md#push-notifications-bring-your-own).
The package READMEs have code samples.

## Build from source

You need Node.js 24 or later.

```sh
npm ci
npm run check:graphql
npm run build
npm test
```

The unit tests don't need service credentials. They don't prove real WebRTC
media, database persistence or the behavior of a hosted service.
[CI](.github/workflows/sdk-ci.yml) runs the same checks on every pull request.
It doesn't publish packages or deploy anything.

## API contract

- The Communication API and the Management API have separate origins. Each
  serves GraphQL at an unversioned `/graphql` path. Realtime uses the
  `graphql-transport-ws` protocol on the Communication origin's `/graphql`.
- The schemas in [`schema/`](schema) are exported by the API. They're the
  source for generated operations, input and output types, and runtime
  response validation. After you change them, run `npm run generate:graphql`.
  `npm run check:graphql` detects drift. Don't edit generated files by hand.
- `V1` in type names identifies the current domain model. It isn't an API
  version that you select.
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
  [`asyncRecoveryStorage`](packages/server-sdk/README.md#asynchronous-database-recovery-storage).
  Your application must coordinate writers across processes and overlapping
  deployments. Backends can also read
  [credential-free session request outcomes](packages/server-sdk/README.md#read-only-session-request-outcomes).
  These reads never return a token, and a missing observation isn't proof
  that a request didn't commit.
- Browser apps can opt in to
  [session refresh](packages/browser-sdk/README.md#session-credential-lifetime).
- Starting or joining a call, connecting media, and turning on the microphone
  or camera are separate, explicit steps. A reconnect starts with capture
  off. Media admission needs the matching ConvoHop media server (SFU) and
  current authorization. A token, membership or open WebSocket alone doesn't
  grant media forwarding. After a server restart, the old call ends through
  durable recovery instead of continuing transparently.

## Documentation

- [SDK strategy](docs/sdk-strategy.md): layers, languages, push
  notifications, package names, versioning and support
- [Web client SDK](packages/browser-sdk/README.md)
- [Node.js server SDK](packages/server-sdk/README.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

The SDK source is licensed under the [Apache License, Version 2.0](LICENSE).
See [NOTICE](NOTICE). The license covers this source code. It doesn't grant
access to a hosted ConvoHop service.
