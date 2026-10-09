# Python server quickstart

Call ConvoHop from your Python backend with `convohop`: connect with a backend key, sign in your users, create a conversation, send and read messages as a member, recover a send whose response was lost, and do the same from `asyncio` code.

## Before you start

You need Python 3.11 or later and `convohop` ([install](../index.md#install)). For your project, you need the Communication API's base URL, the project ID, the project's incarnation and a backend key, which the [`management.issueBackendKey`](../../operations/management/issueBackendKey.md) operation delivers once.

Keep the backend key in your secret store. Its scopes limit what it can do. This quickstart needs `principalManage`, `sessionIssue`, `conversationManage`, `messageRead` and `messageWrite`.

## Connect

`initialize()` reads your project's route before the first call. It raises a `ConvoHopProblem` with the code `INCARNATION_MISMATCH` when the project has a new incarnation.

```python include=examples/src/server.py#connect
```

## Sign in a user

ConvoHop doesn't authenticate your users. After your own login succeeds, map the user to a principal and issue a session for the device. Return the result to the user's app, which passes it to a client SDK, as the [TypeScript client quickstart](../../typescript/quickstarts/client.md) shows.

```python include=examples/src/server.py#bootstrap
```

`create_principal` returns the same principal for the same external user ID, so call it on every login. A session token acts only as its principal.

## Create a conversation

Commands such as `create_conversation` take a request ID that identifies the action. Create one per action, for example with `str(uuid.uuid4())`, and keep it until you know the outcome: [recover a lost response](#recover-a-lost-response) shows why.

```python include=examples/src/server.py#create-conversation
```

## Send and read messages

Your backend isn't a member of the conversation. To send or read as a member, pass `act_as_principal_id` with the member's principal ID. The authority checks what that member can do and audits the call. Without it, the backend's own service principal sends the message.

```python include=examples/src/server.py#send-message
```

```python include=examples/src/server.py#list-messages
```

## Recover a lost response

When a connection drops after a command is sent, the SDK can't tell whether the authority committed it, so it raises a `ConvoHopProblem` whose `outcome` is `"unknown"`. Sending again with a new request ID could post the message twice. Instead, `retry_request` asks the authority about the original request. If the authority never received it, `retry_request` resends the original command first. A `committed` resolution carries the command's result.

```python include=examples/src/server.py#recover
```

Retry with the same client, which keeps the original request in memory. It sends a request at most three times, within 60 seconds of the first attempt. To retry after a restart, give the client `recovery_storage`, as [recovery and retries](https://github.com/ConvoHop/sdks/blob/main/python/README.md#recovery-and-retries) describes. Recovery storage holds request inputs, never tokens or keys.

## Use asyncio

`AsyncConvoHop` has the same methods as `ConvoHop`, as coroutines, and closes with `async with`.

```python include=examples/src/server.py#async
```

## Next steps

- [Webhooks quickstart](webhooks.md): react to events in your backend.
- [`ConvoHop` reference](../reference/convohop.md#convohop-class): every method, with the operation it sends.
