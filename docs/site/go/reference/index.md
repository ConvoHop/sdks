# Go reference

The public API of each Go package, generated from its declarations.

| Package | Layer | Summary |
| --- | --- | --- |
| [`github.com/ConvoHop/sdks/go`](relay.md) | Server | Server SDK for trusted Go backends: backend-key data-plane calls and operator management calls, with typed problems, request retries and recovery storage. |
| [`github.com/ConvoHop/sdks/go/webhooks`](webhooks.md) | Server | Verifies Standard Webhooks signatures and parses Relay webhook deliveries into typed events. |
| [`github.com/ConvoHop/sdks/go/push`](push.md) | Server | Builds APNs, FCM and Web Push requests from Relay push notification events. |

[Operation coverage](operations.md) lists the members that send each API operation.
