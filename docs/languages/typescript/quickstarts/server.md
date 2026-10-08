# TypeScript server quickstart

Call ConvoHop from your Node.js backend with `@convohop/server`: connect with a backend key, sign in your users, create a conversation, send and read messages as a member, and recover a send whose response was lost.

## Before you start

You need Node.js 22 or later and `@convohop/server` ([install](../index.md#install)). For your project, you need the Communication API's base URL, the project ID, the project's incarnation and a backend key, which the [`management.issueBackendKey`](../../operations/management/issueBackendKey.md) operation delivers once.

Keep the backend key in your secret store. Its scopes limit what it can do. This quickstart needs `principalManage`, `sessionIssue`, `conversationManage`, `messageRead` and `messageWrite`.

## Connect

`initialize()` looks up your project's route before the first call.

```ts include=examples/src/server.ts#connect
```

## Sign in a user

ConvoHop doesn't authenticate your users. After your own login succeeds, map the user to a principal and issue a session for the device. Return the result to the user's app, which passes it to `@convohop/client`, as the [client quickstart](client.md) shows.

```ts include=examples/src/server.ts#bootstrap
```

`createPrincipal` returns the same principal for the same account ID, so call it on every login. A session token acts only as its principal.

## Create a conversation

Commands such as `conversations.create` take a request ID that identifies the action. Create one per action, for example with `crypto.randomUUID()`, and keep it until you know the outcome: [recover a lost response](#recover-a-lost-response) shows why.

```ts include=examples/src/server.ts#create-conversation
```

## Send and read messages

Your backend isn't a member of the conversation. To send or read as a member, pass `actAs` with the member's principal ID. The authority checks what that member can do and audits the call. Without `actAs`, the backend's own service principal sends the message.

```ts include=examples/src/server.ts#send-message
```

```ts include=examples/src/server.ts#list-messages
```

## Recover a lost response

When a connection drops after a command is sent, the SDK can't tell whether the authority committed it, so it throws a `ConvoHopProblem` whose `outcome` is `unknown`. Sending again with a new request ID could post the message twice. Instead, `requests.retry` asks the authority about the original request. It returns the committed result, or resends the original command if the authority never received it.

```ts include=examples/src/server.ts#recover
```

Retry with the same `ProjectServerClient`, which keeps the original request in memory. It sends a request at most three times, within 60 seconds of the first attempt. To retry after a restart, give the client `recoveryStorage` or `asyncRecoveryStorage`, as [asynchronous database recovery storage](https://github.com/ConvoHop/sdks/blob/main/packages/server/README.md#asynchronous-database-recovery-storage) describes. Recovery storage holds request inputs, never tokens or keys.

## Next steps

- [Client quickstart](client.md): use the session in your users' browsers.
- [Webhooks quickstart](webhooks.md): react to events in your backend.
- [`ProjectServerClient` reference](../reference/server.md#projectserverclient-class): every method, with the operation it sends.
