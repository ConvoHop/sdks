# ConvoHop SDK documentation

Reference documentation, quickstarts and tested examples for the ConvoHop SDKs.

## Languages

| Language | Status | Packages |
| --- | --- | --- |
| [TypeScript](typescript/index.md) | Preview | [`@convohop/server`](typescript/reference/server.md), [`@convohop/client`](typescript/reference/client.md), [`@convohop/client/push`](typescript/reference/client-push.md), [`@convohop/react`](typescript/reference/react.md) |
| [Python](python/index.md) | Preview | [`convohop`](python/reference/convohop.md), [`convohop.webhooks`](python/reference/webhooks.md), [`convohop.push`](python/reference/push.md), [`convohop.types`](python/reference/types.md) |
| [.NET](dotnet/index.md) | Preview | [`ConvoHop`](dotnet/reference/convohop.md), [`ConvoHop.Api`](dotnet/reference/api.md), [`ConvoHop.Models`](dotnet/reference/models.md) |
| [Java and Kotlin](jvm/index.md) | Preview | [`com.convohop:convohop-server`](jvm/reference/server.md), [`com.convohop:convohop-server-kotlin`](jvm/reference/server-kotlin.md) |
| [Go](go/index.md) | Preview | [`github.com/ConvoHop/sdks/go`](go/reference/convohop.md), [`github.com/ConvoHop/sdks/go/webhooks`](go/reference/webhooks.md), [`github.com/ConvoHop/sdks/go/push`](go/reference/push.md) |
| [Android](android/index.md) | Preview | [`com.convohop:convohop-android`](android/reference/android.md), [`com.convohop:convohop-android-core`](android/reference/android-core.md), [`com.convohop:convohop-android-push`](android/reference/android-push.md) |

## Quickstarts

| Topic | Summary | Languages |
| --- | --- | --- |
| Server | Call ConvoHop from your backend with a backend key: principals, sessions, conversations and messages. | [TypeScript](typescript/quickstarts/server.md), [Python](python/quickstarts/server.md), [.NET](dotnet/quickstarts/server.md), [Java and Kotlin](jvm/quickstarts/server.md), [Go](go/quickstarts/server.md) |
| Client | Sign in a user with a session token, then send, watch and replay messages. | [TypeScript](typescript/quickstarts/client.md), [Android](android/quickstarts/client.md) |
| Webhooks | Verify signed webhook deliveries and handle events. | [TypeScript](typescript/quickstarts/webhooks.md), [Python](python/quickstarts/webhooks.md), [.NET](dotnet/quickstarts/webhooks.md), [Java and Kotlin](jvm/quickstarts/webhooks.md), [Go](go/quickstarts/webhooks.md) |
| Push notifications | Deliver messages and calls to your users' devices as APNs, FCM and Web Push notifications. | [TypeScript](typescript/quickstarts/push.md), [Python](python/quickstarts/push.md), [.NET](dotnet/quickstarts/push.md), [Java and Kotlin](jvm/quickstarts/push.md), [Go](go/quickstarts/push.md), [Android](android/quickstarts/push.md) |
| Calling | Start, join and end voice and video calls. | [TypeScript](typescript/quickstarts/calling.md), [Android](android/quickstarts/calling.md) |

## API operations

The [operation reference](operations/index.md) documents each of the 79 GraphQL operations and the SDK members that send it.

## For LLMs and agents

[llms.txt](llms.txt) lists these pages and [llms-full.txt](llms-full.txt) contains all of them. Each language also has one file with all of its pages, linked from its home page.
