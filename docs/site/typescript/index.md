# TypeScript SDKs

`@convohop/server` and `@convohop/client` wrap the ConvoHop API for TypeScript and JavaScript. The server SDK runs in your backend with a secret backend key, and the client SDK runs in your users' apps with a short-lived session for one user. `@convohop/react` adds React hooks over the client SDK, and `@convohop/client/push` subscribes browsers to Web Push and shows the notifications.

## How they fit together

1. Your users sign in to your app with your own authentication.
2. Your backend uses `@convohop/server` to map each user to a ConvoHop principal and issue a short-lived session for the user's device.
3. Your app passes the session to `@convohop/client`, which sends, watches and calls as that one user.
4. ConvoHop sends signed webhooks to your backend. `@convohop/server` verifies them, and builds APNs, FCM and Web Push requests from notification events for you to send with your own push credentials.

Keep the backend key on your servers. It never belongs in browser code, bundles, storage, URLs or logs.

## Install

The packages aren't on a package registry yet. [Build them from source](https://github.com/ConvoHop/sdks#build-from-source), or [install a GitHub release](https://github.com/ConvoHop/sdks#install-a-release) once one is published. They're ESM-only and include TypeScript declarations. `@convohop/server` needs Node.js 22 or later, and `@convohop/react` needs React 18 or later. `@convohop/client/push` ships with `@convohop/client`.

`@convohop/server` and `@convohop/client` depend on `@convohop/core`. Import its types and errors, such as `ConvoHopProblem`, from `@convohop/server` or `@convohop/client`, never from `@convohop/core`.

## Tested examples

Every TypeScript sample in these docs is a region of a file in [the examples package](https://github.com/ConvoHop/sdks/tree/main/docs/languages/typescript/examples), which CI typechecks and tests on every change:

- The server and client samples run against the conformance mock, a local stand-in for the ConvoHop API, including dropped connections. The mock doesn't renew sessions, so CI only typechecks session renewal.
- The webhooks samples verify deliveries signed the way ConvoHop signs them.
- The push samples run on every vector of the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md), and check the requests with `web-push` and `firebase-admin`. The browser's service worker runs on every Web Push request of the contract.
- The calling, React and browser subscription samples need a browser, so CI only typechecks them.

## Packages

| Package | Layer | Runtime | Summary |
| --- | --- | --- | --- |
| [`@convohop/server`](reference/server.md) | Server | Node.js 22 or later | Server SDK for trusted Node.js runtimes: backend-key data-plane calls, management, webhook verification and push requests. |
| [`@convohop/client`](reference/client.md) | Client | Current browsers. React Native isn't verified yet. | Client SDK for apps on end-user devices: one signed-in user's conversations, realtime events and calls. |
| [`@convohop/client/push`](reference/client-push.md) | Client | Current browsers and their service workers. No dependencies. | Web Push for browsers and service workers: subscribe a browser, then show and open the notifications your backend sends. It ships with the client SDK. |
| [`@convohop/react`](reference/react.md) | Client | React 18 or later in current browsers. React Native isn't verified yet. | React hooks over the client SDK: conversations with offline-safe sends, typing, session renewal, calls and browser media. |

## Quickstarts

| Quickstart | Summary |
| --- | --- |
| [Server](quickstarts/server.md) | Call ConvoHop from your backend with a backend key: principals, sessions, conversations and messages. |
| [Client](quickstarts/client.md) | Sign in a user with a session token, then send, watch and replay messages. |
| [Webhooks](quickstarts/webhooks.md) | Verify signed webhook deliveries and handle events. |
| [Push notifications](quickstarts/push.md) | Deliver messages and calls to your users' devices as APNs, FCM and Web Push notifications. |
| [Calling](quickstarts/calling.md) | Start, join and end voice and video calls. |

## Reference

- [Package reference](reference/index.md): every public declaration, by package.
- [Operation coverage](reference/operations.md): the members that send each API operation.
- [TypeScript in one file](llms-full.txt): every TypeScript page, for LLMs and agents.
