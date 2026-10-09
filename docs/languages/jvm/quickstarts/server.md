# Java and Kotlin server quickstart

Call ConvoHop from your Java or Kotlin backend with `convohop-server`: connect with a backend key, sign in your users, create a conversation, send and read messages as a member, recover a send whose response was lost, and make the calls from coroutines.

## Before you start

You need Java 11 or later and `convohop-server` ([install](../index.md#install)). For your project, you need the Communication API's base URL, the project ID, the project's incarnation and a backend key, which the [`management.issueBackendKey`](../../operations/management/issueBackendKey.md) operation delivers once.

Keep the backend key in your secret store. Its scopes limit what it can do. This quickstart needs `principalManage`, `sessionIssue`, `conversationManage`, `messageRead` and `messageWrite`.

The Java samples on this page use these imports:

```java include=examples/src/main/java/com/convohop/examples/Server.java#imports
```

## Connect

Building the client sends nothing. `initialize()` looks up your project's route before the first call, and throws `IllegalStateException` if the project or its incarnation changed. Calls block the calling thread, and the client is safe for concurrent use, so create one and share it.

```java include=examples/src/main/java/com/convohop/examples/Server.java#connect
```

## Sign in a user

ConvoHop doesn't authenticate your users. After your own login succeeds, map the user to a principal and issue a session for the device. Return the result to the user's app, which passes it to a client SDK, as the [TypeScript client quickstart](../../typescript/quickstarts/client.md) shows.

```java include=examples/src/main/java/com/convohop/examples/Server.java#bootstrap
```

`principals().create` returns the same principal for the same account ID, so call it on every login. A session token acts only as its principal.

## Create a conversation

Commands such as `conversations().create` take a request ID that identifies the action. Create one per action, for example with `UUID.randomUUID().toString()`, and keep it until you know the outcome: [recover a lost response](#recover-a-lost-response) shows why.

```java include=examples/src/main/java/com/convohop/examples/Server.java#create-conversation
```

## Send and read messages

Your backend isn't a member of the conversation. To send or read as a member, pass the member's principal ID as `actAs`. The authority checks what that member can do and audits the call. With a null `actAs`, the backend's own service principal sends the message.

```java include=examples/src/main/java/com/convohop/examples/Server.java#send-message
```

```java include=examples/src/main/java/com/convohop/examples/Server.java#list-messages
```

## Recover a lost response

When a connection drops after a command is sent, the SDK can't tell whether the authority committed it, so it throws a `ConvoHopProblem` whose `getOutcome()` is `unknown`. Sending again with a new request ID could post the message twice. Instead, `requests().retry` asks the authority about the original request. It returns the committed result, or resends the original command if the authority never received it.

```java include=examples/src/main/java/com/convohop/examples/Server.java#recover
```

Retry with the same `ProjectServerClient`, which keeps the original request in memory. It sends a request at most three times, within a minute of the first attempt. After that, `retry` throws a `ConvoHopProblem` whose code is `RESOLUTION_REQUIRED`. To retry after a restart, pass a `RecoveryStorage` to the builder's `recoveryStorage`, as [recovery](https://github.com/ConvoHop/sdks/blob/main/jvm/README.md#recovery) describes. Recovery storage holds request inputs, never tokens or keys.

## Use coroutines in Kotlin

`convohop-server-kotlin` turns each plane API into a suspending one: `server.communication().suspending()`. Its calls run on `Dispatchers.IO` unless you pass another dispatcher, and its methods that page return a cold `Flow`. Run the client's blocking helpers, such as `principals()` and `sessions()`, in `interruptible`.

```kotlin include=examples/src/main/kotlin/com/convohop/examples/Coroutines.kt#coroutines
```

Cancelling the calling coroutine interrupts the blocking request. The call then fails with a `CancellationException` whose cause is the `TRANSPORT_UNKNOWN` problem, and a mutation stays in the client's recovery records, so you can resolve or retry it.

## Next steps

- [Webhooks quickstart](webhooks.md): react to events in your backend.
- [`ProjectServerClient` reference](../reference/server.md#projectserverclient-class): every method, with the operation it sends.
- [`convohop-server-kotlin` reference](../reference/server-kotlin.md): the suspending APIs, `interruptible` and the page flows.
