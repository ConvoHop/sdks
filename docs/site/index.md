# Relay SDK documentation

Reference documentation, quickstarts and tested examples for the Relay SDKs.

## Languages

| Language | Status | Packages |
| --- | --- | --- |
| [TypeScript](typescript/index.md) | Preview | [`@instantrelay/server`](typescript/reference/server.md), [`@instantrelay/client`](typescript/reference/client.md), [`@instantrelay/client/push`](typescript/reference/client-push.md), [`@instantrelay/react`](typescript/reference/react.md) |
| [Python](python/index.md) | Preview | [`instantrelay`](python/reference/instantrelay.md), [`instantrelay.webhooks`](python/reference/webhooks.md), [`instantrelay.push`](python/reference/push.md), [`instantrelay.types`](python/reference/types.md) |
| [.NET](dotnet/index.md) | Preview | [`Relay`](dotnet/reference/relay.md), [`Relay.Api`](dotnet/reference/api.md), [`Relay.Models`](dotnet/reference/models.md) |
| [Java and Kotlin](jvm/index.md) | Preview | [`dev.instantrelay:relay-server`](jvm/reference/server.md), [`dev.instantrelay:relay-server-kotlin`](jvm/reference/server-kotlin.md) |
| [Go](go/index.md) | Preview | [`github.com/ConvoHop/sdks/go`](go/reference/relay.md), [`github.com/ConvoHop/sdks/go/webhooks`](go/reference/webhooks.md), [`github.com/ConvoHop/sdks/go/push`](go/reference/push.md) |
| [Swift](swift/index.md) | Preview | [`Relay`](swift/reference/relay.md), [`RelayLiveKit`](swift/reference/livekit.md), [`RelayPush`](swift/reference/push.md), [`RelayCalls`](swift/reference/calls.md), [`RelayNotificationService`](swift/reference/notification-service.md) |
| [Android](android/index.md) | Preview | [`dev.instantrelay:relay-android`](android/reference/android.md), [`dev.instantrelay:relay-android-core`](android/reference/android-core.md), [`dev.instantrelay:relay-android-push`](android/reference/android-push.md) |
| [Flutter](flutter/index.md) | Preview | [`package:instantrelay/instantrelay.dart`](flutter/reference/instantrelay.md), [`package:instantrelay/calls.dart`](flutter/reference/calls.md), [`package:instantrelay/push.dart`](flutter/reference/push.md), [`package:instantrelay/io.dart`](flutter/reference/io.md) |
| [React Native](react-native/index.md) | Preview | [`@instantrelay/react-native`](react-native/reference/react-native.md), [`@instantrelay/react-native/media`](react-native/reference/media.md), [`@instantrelay/client`](react-native/reference/client.md), [`@instantrelay/react`](react-native/reference/react.md) |

## Quickstarts

| Topic | Summary | Languages |
| --- | --- | --- |
| Server | Call Relay from your backend with a backend key: principals, sessions, conversations and messages. | [TypeScript](typescript/quickstarts/server.md), [Python](python/quickstarts/server.md), [.NET](dotnet/quickstarts/server.md), [Java and Kotlin](jvm/quickstarts/server.md), [Go](go/quickstarts/server.md) |
| Client | Sign in a user with a session token, then send, watch and replay messages. | [TypeScript](typescript/quickstarts/client.md), [Swift](swift/quickstarts/client.md), [Android](android/quickstarts/client.md), [Flutter](flutter/quickstarts/client.md), [React Native](react-native/quickstarts/client.md) |
| Webhooks | Verify signed webhook deliveries and handle events. | [TypeScript](typescript/quickstarts/webhooks.md), [Python](python/quickstarts/webhooks.md), [.NET](dotnet/quickstarts/webhooks.md), [Java and Kotlin](jvm/quickstarts/webhooks.md), [Go](go/quickstarts/webhooks.md) |
| Push notifications | Deliver messages and calls to your users' devices as APNs, FCM and Web Push notifications. | [TypeScript](typescript/quickstarts/push.md), [Python](python/quickstarts/push.md), [.NET](dotnet/quickstarts/push.md), [Java and Kotlin](jvm/quickstarts/push.md), [Go](go/quickstarts/push.md), [Swift](swift/quickstarts/push.md), [Android](android/quickstarts/push.md), [Flutter](flutter/quickstarts/push.md), [React Native](react-native/quickstarts/push.md) |
| Calling | Start, join and end voice and video calls. | [TypeScript](typescript/quickstarts/calling.md), [Swift](swift/quickstarts/calling.md), [Android](android/quickstarts/calling.md), [Flutter](flutter/quickstarts/calling.md), [React Native](react-native/quickstarts/calling.md) |

## API operations

The [operation reference](operations/index.md) documents each of the 92 GraphQL operations and the SDK members that send it.

## For LLMs and agents

[llms.txt](llms.txt) lists these pages and [llms-full.txt](llms-full.txt) contains all of them. Each language also has one file with all of its pages, linked from its home page.
