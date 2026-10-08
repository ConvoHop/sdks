# TypeScript SDKs

`@convohop/server` and `@convohop/client` wrap the ConvoHop API for TypeScript and JavaScript. The server SDK runs in your backend with a secret backend key, and the client SDK runs in your users' apps with a short-lived session for one user.

## How they fit together

1. Your users sign in to your app with your own authentication.
2. Your backend uses `@convohop/server` to map each user to a ConvoHop principal and issue a short-lived session for the user's device.
3. Your app passes the session to `@convohop/client`, which sends, watches and calls as that one user.
4. ConvoHop sends signed webhooks to your backend. `@convohop/server` verifies them, and builds APNs, FCM and Web Push requests from notification events for you to send with your own push credentials.

Keep the backend key on your servers. It never belongs in browser code, bundles, storage, URLs or logs.

## Install

The packages aren't on a package registry yet. [Build them from source](https://github.com/ConvoHop/sdks#build-from-source), or [install a GitHub release](https://github.com/ConvoHop/sdks#install-a-release) once one is published. Both packages are ESM-only and include TypeScript declarations, and `@convohop/server` needs Node.js 22 or later.

Both depend on `@convohop/core`. Import its types and errors, such as `ConvoHopProblem`, from `@convohop/server` or `@convohop/client`, never from `@convohop/core`.

## Tested examples

Every TypeScript sample in these docs is a region of a file in [the examples package](https://github.com/ConvoHop/sdks/tree/main/docs/languages/typescript/examples), which CI typechecks and tests on every change:

- The server and client samples run against the conformance mock, a local stand-in for the ConvoHop API, including dropped connections.
- The webhooks samples verify deliveries signed the way ConvoHop signs them.
- The push samples run on every vector of the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md), and check the requests with `web-push` and `firebase-admin`.
- The calling samples need a browser with WebRTC, so CI only typechecks them.
