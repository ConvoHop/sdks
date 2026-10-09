# Python SDK

`convohop` wraps the ConvoHop API for Python backends, with synchronous and `asyncio` clients. It runs on your servers with a secret backend key, verifies the webhooks that ConvoHop sends, and builds push requests from notification events.

## How it fits in

1. Your users sign in to your app with your own authentication.
2. Your backend uses `convohop` to map each user to a ConvoHop principal and issue a short-lived session for the user's device.
3. Your app passes the session to a client SDK, such as [`@convohop/client`](../typescript/quickstarts/client.md) in browsers, which sends, watches and calls as that one user.
4. ConvoHop sends signed webhooks to your backend. `convohop.webhooks` verifies them, and `convohop.push` builds APNs, FCM and Web Push requests from notification events for you to send with your own push credentials.

Keep the backend key on your servers. It never belongs in browser or mobile app code, bundles, storage, URLs or logs.

## Install

The package isn't on a package registry yet. Install it from a clone of [the SDK repository](https://github.com/ConvoHop/sdks): run `pip install ./python` in the clone, or add its `python` directory to your project as a path dependency. It needs Python 3.11 or later and depends only on `httpx`. It ships `py.typed`, so type checkers such as mypy and pyright see every signature.

## Clients

- `ConvoHop` calls one project with a backend key. `AsyncConvoHop` has the same methods as coroutines.
- `ConvoHopManagement` and `AsyncConvoHopManagement` call the Management API with an operator access token.

The clients are context managers: open one when your backend starts and close it when it stops. A synchronous client is safe to share between threads. Use each asynchronous client in one event loop.

The request and response models in `convohop.types` are frozen dataclasses, generated from the GraphQL schema like the TypeScript SDK's types.

## Tested examples

Every Python sample in these docs is a region of a file in [the examples project](https://github.com/ConvoHop/sdks/tree/main/docs/languages/python/examples), which CI type-checks with mypy and tests with pytest on Python 3.11 and 3.14:

- The server samples run against the conformance mock, a local stand-in for the ConvoHop API, including dropped connections.
- The webhooks samples verify deliveries signed the way ConvoHop signs them.
- The push samples run on every vector of the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md), and check the requests with `pywebpush` and `firebase-admin`.

## Packages

| Package | Layer | Runtime | Summary |
| --- | --- | --- | --- |
| [`convohop`](reference/convohop.md) | Server | Python 3.11 or later | Server SDK for trusted Python backends: sync and async clients for backend-key data-plane calls and management, with typed problems and recovery storage. |
| [`convohop.webhooks`](reference/webhooks.md) | Server | Python 3.11 or later | Verifies Standard Webhooks signatures and parses ConvoHop webhook deliveries into typed events. |
| [`convohop.push`](reference/push.md) | Server | Python 3.11 or later | Builds APNs, FCM and Web Push requests from ConvoHop push notification events. |
| [`convohop.types`](reference/types.md) | Server | Python 3.11 or later | Generated request and response models of the ConvoHop GraphQL API, as frozen dataclasses. |

## Quickstarts

| Quickstart | Summary |
| --- | --- |
| [Server](quickstarts/server.md) | Call ConvoHop from your backend with a backend key: principals, sessions, conversations and messages. |
| [Webhooks](quickstarts/webhooks.md) | Verify signed webhook deliveries and handle events. |
| [Push notifications](quickstarts/push.md) | Deliver messages and calls to your users' devices as APNs, FCM and Web Push notifications. |

## Reference

- [Package reference](reference/index.md): every public declaration, by package.
- [Operation coverage](reference/operations.md): the members that send each API operation.
- [Python in one file](llms-full.txt): every Python page, for LLMs and agents.
