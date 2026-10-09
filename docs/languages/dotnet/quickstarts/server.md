# .NET server quickstart

Call ConvoHop from your .NET backend with the `ConvoHop` package: connect with a backend key, sign in your users, create a conversation, send and read messages as a member, and recover a send whose response was lost.

## Before you start

You need .NET 8 or later and the `ConvoHop` package ([install](../index.md#install)). For your project, you need the Communication API's base URL, the project ID, the project's incarnation and a backend key, which the [`management.issueBackendKey`](../../operations/management/issueBackendKey.md) operation delivers once.

Keep the backend key in your secret store. Its scopes limit what it can do. This quickstart needs `principalManage`, `sessionIssue`, `conversationManage`, `messageRead` and `messageWrite`.

The samples use these namespaces:

```cs include=examples/src/Server.cs#usings
```

## Connect

`InitializeAsync` reads your project's route before the first call. It throws an `InvalidOperationException` when the project has a new incarnation: recover explicitly instead of switching incarnations.

```cs include=examples/src/Server.cs#connect
```

`BaseUrl` is an HTTPS origin, or HTTP on a loopback host for local development. The client gives each request 12 seconds and never follows redirects. To pass your own `HttpClient`, create it with `AllowAutoRedirect = false`, as the [`ProjectServerClientOptions` reference](../reference/convohop.md#projectserverclientoptions-class) describes.

## Sign in a user

ConvoHop doesn't authenticate your users. After your own login succeeds, map the user to a principal and issue a session for the device. Return the result to the user's app, which passes it to a client SDK, as the [TypeScript client quickstart](../../typescript/quickstarts/client.md) shows.

```cs include=examples/src/Server.cs#bootstrap
```

`Principals.CreateAsync` returns the same principal for the same external user ID, so call it on every login. A session token acts only as its principal.

## Create a conversation

Commands such as `Conversations.CreateAsync` take a request ID that identifies the action. Create one per action, for example with `Guid.NewGuid().ToString()`, and keep it until you know the outcome: [recover a lost response](#recover-a-lost-response) shows why.

```cs include=examples/src/Server.cs#create-conversation
```

## Send and read messages

Your backend isn't a member of the conversation. To send or read as a member, pass `actAs` with the member's principal ID. The authority checks what that member can do and audits the call. Without it, the backend's own service principal sends the message.

```cs include=examples/src/Server.cs#send-message
```

```cs include=examples/src/Server.cs#list-messages
```

## Recover a lost response

When a connection drops after a command is sent, the SDK can't tell whether the authority committed it, so it throws a `ConvoHopException` whose `Outcome` is `"unknown"`. Sending again with a new request ID could post the message twice. Instead, `Requests.RetryAsync` asks the authority about the original request. If the authority never received it, `RetryAsync` resends the original command first. A `committed` resolution carries the command's result.

```cs include=examples/src/Server.cs#recover
```

Retry with the same client, which keeps the original request in memory. It sends a request at most three times, within 60 seconds of the first attempt. To retry after a restart, set `RecoveryStorage` in the client's options, as [recovery](https://github.com/ConvoHop/sdks/blob/main/dotnet/README.md#recovery) describes. Recovery storage holds request inputs, never tokens or keys.

## Next steps

- [Webhooks quickstart](webhooks.md): react to events in your backend.
- [`ProjectServerClient` reference](../reference/convohop.md#projectserverclient-class): every method, with the operation it sends.
