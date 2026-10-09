# Java and Kotlin SDKs

`com.convohop:convohop-server` wraps the ConvoHop API for Java backends, and `com.convohop:convohop-server-kotlin` adds coroutine extensions to it. Both run only in your backend, with a secret backend key. Never put them, or the key, in an Android app or any other client.

## How they fit together

1. Your users sign in to your app with your own authentication.
2. Your backend uses `convohop-server` to map each user to a ConvoHop principal and issue a short-lived session for the user's device.
3. Your app passes the session to a client SDK, such as [`@convohop/client`](../typescript/quickstarts/client.md), which sends, watches and calls as that one user.
4. ConvoHop sends signed webhooks to your backend. `convohop-server` verifies them, and builds APNs, FCM and Web Push requests from notification events for you to send with your own push credentials.

Keep the backend key on your servers. It never belongs in an app, browser code, bundles, storage, URLs or logs.

## Install

The packages aren't on a package registry yet. [Build them from source](https://github.com/ConvoHop/sdks/blob/main/jvm/README.md#install-from-source) with JDK 17 or later: run `./gradlew publishToMavenLocal` in the repository's `jvm` directory, add `mavenLocal()` to your build's repositories, and depend on `com.convohop:convohop-server:0.1.0-SNAPSHOT`. For coroutines, depend on `com.convohop:convohop-server-kotlin:0.1.0-SNAPSHOT` too. The Maven group might change to `io.github.convohop` before the first release. The package names stay `com.convohop.server`.

`convohop-server` needs Java 11 or later. It uses the JDK's HTTP client, and its only dependency is the JSpecify nullness annotations, so Kotlin sees exact nullability. Its calls block the calling thread, and its clients are safe for concurrent use. `convohop-server-kotlin` needs Kotlin 2.2 or later and adds `kotlinx-coroutines-core`.

## Tested examples

Every Java and Kotlin sample in these docs is a region of a file in [the examples project](https://github.com/ConvoHop/sdks/tree/main/docs/languages/jvm/examples), which CI compiles and tests with the SDK:

- The server and coroutine samples run against the conformance mock, a local stand-in for the ConvoHop API, including dropped connections.
- The webhooks samples verify deliveries signed the way ConvoHop signs them, through the JDK's HTTP server.
- The push samples run on every vector of the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md), and send the FCM messages, to a token and to a FID, through the Firebase Admin SDK to a mock FCM. CI doesn't run a Web Push library or an APNs client, so the push quickstart's advice about them isn't tested.

## Packages

| Package | Layer | Runtime | Summary |
| --- | --- | --- | --- |
| [`com.convohop:convohop-server`](reference/server.md) | Server | Java 11 or later | Java server SDK for trusted JVM backends: backend-key data-plane calls, management, webhook verification and push requests. |
| [`com.convohop:convohop-server-kotlin`](reference/server-kotlin.md) | Server | Kotlin 2.2 or later, on Java 11 or later | Kotlin coroutine extensions for the Java server SDK: suspending APIs, page flows and interruptible blocking calls. |

## Quickstarts

| Quickstart | Summary |
| --- | --- |
| [Server](quickstarts/server.md) | Call ConvoHop from your backend with a backend key: principals, sessions, conversations and messages. |
| [Webhooks](quickstarts/webhooks.md) | Verify signed webhook deliveries and handle events. |
| [Push notifications](quickstarts/push.md) | Deliver messages and calls to your users' devices as APNs, FCM and Web Push notifications. |

## Reference

- [Package reference](reference/index.md): every public declaration, by package.
- [Operation coverage](reference/operations.md): the members that send each API operation.
- [Java and Kotlin in one file](llms-full.txt): every Java and Kotlin page, for LLMs and agents.
