# Go server quickstart

Call ConvoHop from your Go backend with `github.com/ConvoHop/sdks/go`: connect with a backend key, sign in your users, create a conversation, send and read messages as a member, and recover a send whose response was lost.

## Before you start

You need Go 1.26 or later and the `github.com/ConvoHop/sdks/go` module ([install](../index.md#install)). For your project, you need the Communication API's base URL, the project ID, the project's incarnation and a backend key, which the [`management.issueBackendKey`](../../operations/management/issueBackendKey.md) operation delivers once.

Keep the backend key in your secret store. Its scopes limit what it can do. This quickstart needs `principalManage`, `sessionIssue`, `conversationManage`, `messageRead` and `messageWrite`.

The samples on this page use these imports:

```go include=examples/server.go#imports
```

## Connect

`NewProjectClient` checks your configuration and sends nothing. `Initialize` reads your project's route before the first call. It fails with a `*convohop.Problem` whose code is `INCARNATION_MISMATCH` when the project has a new incarnation.

```go include=examples/server.go#connect
```

## Sign in a user

ConvoHop doesn't authenticate your users. After your own login succeeds, map the user to a principal and issue a session for the device. Return the result to the user's app, which passes it to a client SDK, as the [TypeScript client quickstart](../../typescript/quickstarts/client.md) shows.

```go include=examples/server.go#bootstrap
```

`CreatePrincipal` returns the same principal for the same external user ID, so call it on every login. A session token acts only as its principal. `RequestedTTLMs` is the session's lifetime in milliseconds, as a decimal string like every counter.

## Create a conversation

Commands such as `CreateConversation` take a request ID that identifies the action. Create one per action with `convohop.NewRequestID()`, pass it with `convohop.WithRequestID`, and keep it until you know the outcome: [recover a lost response](#recover-a-lost-response) shows why.

```go include=examples/server.go#create-conversation
```

## Send and read messages

Your backend isn't a member of the conversation. To send or read as a member, set `ActAsPrincipalID` to the member's principal ID. The authority checks what that member can do and audits the call. With a nil `ActAsPrincipalID`, the backend's own service principal sends the message.

```go include=examples/server.go#send-message
```

```go include=examples/server.go#list-messages
```

A page holds at most `Limit` messages. Each paginated query, such as `Messages`, also has a `Pages` method that iterates over every page:

```go include=examples/server.go#all-messages
```

## Recover a lost response

When a connection drops after a command is sent, the SDK can't tell whether the authority committed it, so it fails with a `*convohop.Problem` whose `Outcome` is `convohop.OutcomeUnknown`. Sending again with a new request ID could post the message twice. Instead, `Retry` asks the authority about the original request. It returns the committed result, or resends the original command first if the authority never received it.

```go include=examples/server.go#recover
```

Retry with the same `ProjectClient`, which keeps the original request in memory. It sends a request at most three times, within a minute of the first attempt. After that, `Retry` fails with a `*convohop.Problem` whose code is `RESOLUTION_REQUIRED` instead of resending. To retry after a restart, create the client with `convohop.WithRecoveryStore`, as [recovery](https://github.com/ConvoHop/sdks/blob/main/go/README.md#recovery) describes. Recovery records hold request inputs, never tokens or keys.

## Next steps

- [Webhooks quickstart](webhooks.md): react to events in your backend.
- [`ProjectClient` reference](../reference/convohop.md#projectclient-struct): every method, with the operation it sends.
