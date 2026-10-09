# Python server quickstart

Call ConvoHop from your Python backend with `convohop`: connect with a backend key, sign in your users, create a conversation, send and read messages as a member, recover a send whose response was lost, and do the same from `asyncio` code.

## Before you start

You need Python 3.11 or later and `convohop` ([install](../index.md#install)). For your project, you need the Communication API's base URL, the project ID, the project's incarnation and a backend key, which the [`management.issueBackendKey`](../../operations/management/issueBackendKey.md) operation delivers once.

Keep the backend key in your secret store. Its scopes limit what it can do. This quickstart needs `principalManage`, `sessionIssue`, `conversationManage`, `messageRead` and `messageWrite`.

## Connect

`initialize()` reads your project's route before the first call. It raises a `ConvoHopProblem` with the code `INCARNATION_MISMATCH` when the project has a new incarnation.

```python snippet=docs/languages/python/examples/src/server.py#connect
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass

from convohop import ConvoHop


@dataclass(frozen=True)
class ServerConfig:
    base_url: str
    project_id: str
    incarnation: str
    backend_key: str  # From your secret store. Never send it to a browser or an app.


# Open one client when your backend starts and share it: it is thread-safe. The with block closes it.
@contextmanager
def connect(config: ServerConfig) -> Iterator[ConvoHop]:
    with ConvoHop(
        base_url=config.base_url,
        backend_key=config.backend_key,
        project_id=config.project_id,
        incarnation=config.incarnation,
    ) as server:
        server.initialize()
        yield server
```

## Sign in a user

ConvoHop doesn't authenticate your users. After your own login succeeds, map the user to a principal and issue a session for the device. Return the result to the user's app, which passes it to a client SDK, as the [TypeScript client quickstart](../../typescript/quickstarts/client.md) shows.

```python snippet=docs/languages/python/examples/src/server.py#bootstrap
from typing import Any


# Call this after your own authentication. account_id is your user's ID:
# never trust a principal ID that a browser sends.
def bootstrap_user(server: ConvoHop, config: ServerConfig, account_id: str, device_id: str) -> dict[str, Any]:
    principal = server.create_principal(external_user_id=account_id)  # The same principal on every login.
    bootstrap = server.issue_session(
        principal_id=principal.principal_id,
        device_id=device_id,
        requested_ttl_ms="900000",  # 15 minutes.
    )
    # What your login endpoint returns, as JSON, to the signed-in user's app.
    return {**bootstrap.to_dict(), "baseUrl": config.base_url, "projectId": config.project_id}
```

`create_principal` returns the same principal for the same external user ID, so call it on every login. A session token acts only as its principal.

## Create a conversation

Commands such as `create_conversation` take a request ID that identifies the action. Create one per action, for example with `str(uuid.uuid4())`, and keep it until you know the outcome: [recover a lost response](#recover-a-lost-response) shows why.

```python snippet=docs/languages/python/examples/src/server.py#create-conversation
from collections.abc import Sequence

from convohop.types import MemberInputInput


def create_conversation(server: ConvoHop, title: str, principal_ids: Sequence[str], request_id: str) -> str:
    conversation = server.create_conversation(
        title=title,
        props={},
        members=[MemberInputInput(principal_id=principal_id, role="member") for principal_id in principal_ids],
        request_id=request_id,
    )
    return conversation.conversation_id
```

## Send and read messages

Your backend isn't a member of the conversation. To send or read as a member, pass `act_as_principal_id` with the member's principal ID. The authority checks what that member can do and audits the call. Without it, the backend's own service principal sends the message.

```python snippet=docs/languages/python/examples/src/server.py#send-message
# Sends as a member. Without act_as_principal_id, the backend's own principal is the sender.
def send_as(server: ConvoHop, conversation_id: str, author_id: str, text: str, request_id: str) -> str:
    ack = server.send_message(
        conversation_id=conversation_id,
        text=text,
        props={},
        act_as_principal_id=author_id,
        request_id=request_id,
    )
    return ack.message_id
```

```python snippet=docs/languages/python/examples/src/server.py#list-messages
from convohop.types import Message


# Reads what one member can see, newest first.
def latest_messages(server: ConvoHop, conversation_id: str, reader_id: str) -> tuple[Message, ...]:
    page = server.messages(conversation_id=conversation_id, act_as_principal_id=reader_id, limit=20)
    return page.items
```

## Recover a lost response

When a connection drops after a command is sent, the SDK can't tell whether the authority committed it, so it raises a `ConvoHopProblem` whose `outcome` is `"unknown"`. Sending again with a new request ID could post the message twice. Instead, `retry_request` asks the authority about the original request. If the authority never received it, `retry_request` resends the original command first. A `committed` resolution carries the command's result.

```python snippet=docs/languages/python/examples/src/server.py#recover
from convohop import ConvoHopProblem


# A lost response leaves the outcome unknown: the message may or may not exist. Ask about the
# same request ID instead of sending with a new one, which could post the message twice.
def send_once(server: ConvoHop, conversation_id: str, author_id: str, text: str, request_id: str) -> str | None:
    try:
        return send_as(server, conversation_id, author_id, text, request_id)
    except ConvoHopProblem as problem:
        if problem.outcome != "unknown":
            raise
        # Resolves the request first, and resends the original only if the authority never saw it.
        resolution = server.retry_request(request_id)
        if resolution.state != "committed":
            raise
        result = resolution.receipt.result if resolution.receipt else None
        return result.message_ack.message_id if result and result.message_ack else None
```

Retry with the same client, which keeps the original request in memory. It sends a request at most three times, within 60 seconds of the first attempt. To retry after a restart, give the client `recovery_storage`, as [recovery and retries](https://github.com/ConvoHop/sdks/blob/main/python/README.md#recovery-and-retries) describes. Recovery storage holds request inputs, never tokens or keys.

## Use asyncio

`AsyncConvoHop` has the same methods as `ConvoHop`, as coroutines, and closes with `async with`.

```python snippet=docs/languages/python/examples/src/server.py#async
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from convohop import AsyncConvoHop


# In asyncio code, AsyncConvoHop has the same methods as coroutines. Use each client in one event loop.
@asynccontextmanager
async def connect_async(config: ServerConfig) -> AsyncIterator[AsyncConvoHop]:
    async with AsyncConvoHop(
        base_url=config.base_url,
        backend_key=config.backend_key,
        project_id=config.project_id,
        incarnation=config.incarnation,
    ) as server:
        await server.initialize()
        yield server


async def send_as_async(server: AsyncConvoHop, conversation_id: str, author_id: str, text: str, request_id: str) -> str:
    ack = await server.send_message(
        conversation_id=conversation_id,
        text=text,
        props={},
        act_as_principal_id=author_id,
        request_id=request_id,
    )
    return ack.message_id
```

## Next steps

- [Webhooks quickstart](webhooks.md): react to events in your backend.
- [`ConvoHop` reference](../reference/convohop.md#convohop-class): every method, with the operation it sends.
