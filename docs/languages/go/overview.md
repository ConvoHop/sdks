# Go SDK

`github.com/ConvoHop/sdks/go` wraps the ConvoHop API for Go backends. It runs only in your backend, with a secret backend key, verifies the webhooks that ConvoHop sends, and builds push requests from notification events.

## How it fits in

1. Your users sign in to your app with your own authentication.
2. Your backend uses the `convohop` package to map each user to a ConvoHop principal and issue a short-lived session for the user's device.
3. Your app passes the session to a client SDK, such as [`@convohop/client`](../typescript/quickstarts/client.md) in browsers, which sends, watches and calls as that one user.
4. ConvoHop sends signed webhooks to your backend. The `webhooks` package verifies them, and the `push` package builds APNs, FCM and Web Push requests from notification events for you to send with your own push credentials.

Keep the backend key on your servers. It never belongs in browser or mobile app code, bundles, storage, URLs or logs.

## Install

No Go release is tagged yet. The module is in the `go` directory of [the SDK repository](https://github.com/ConvoHop/sdks), so pin a commit with `go get github.com/ConvoHop/sdks/go@<commit>`, which Go records as a pseudo-version. Releases will be tagged `go/vX.Y.Z`.

The module needs Go 1.26 or later and uses only the standard library.

## Clients

- `ProjectClient` calls one project with a backend key.
- `ManagementClient` calls the Management API with an operator access token.

Every method takes a `context.Context` first and returns the authority's reply, with the value in `Result`. Create a client when your backend starts and share it: clients are safe for concurrent use. Each paginated query also has a `Pages` method, such as `MessagesPages`, that you range over.

The request and response types are structs generated from the GraphQL schema, like the TypeScript SDK's types. Optional fields are pointers, and counters such as sequences and lifetimes are decimal strings.

## Tested examples

Every Go sample in these docs is a region of a file in [the examples module](https://github.com/ConvoHop/sdks/tree/main/docs/languages/go/examples), which CI vets and tests with the race detector on the two most recent Go releases:

- The server samples run against the conformance mock, a local stand-in for the ConvoHop API, including dropped connections.
- The webhooks samples verify deliveries signed the way ConvoHop signs them, through the sample's `http.Handler`.
- The push samples run on every vector of the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md), and send the FCM and APNs requests to local test servers, the APNs ones over HTTP/2. CI doesn't run a Web Push library or the Firebase Admin SDK, so the push quickstart's advice about them isn't tested.
