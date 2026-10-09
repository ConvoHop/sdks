"""Server quickstart snippets. tests/test_server.py runs them against the conformance mock."""

# #region connect
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


# #endregion connect

# #region bootstrap
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


# #endregion bootstrap

# #region create-conversation
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


# #endregion create-conversation


# #region send-message
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


# #endregion send-message

# #region list-messages
from convohop.types import Message


# Reads what one member can see, newest first.
def latest_messages(server: ConvoHop, conversation_id: str, reader_id: str) -> tuple[Message, ...]:
    page = server.messages(conversation_id=conversation_id, act_as_principal_id=reader_id, limit=20)
    return page.items


# #endregion list-messages

# #region recover
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


# #endregion recover

# #region async
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


# #endregion async
