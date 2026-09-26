from __future__ import annotations

from typing import AsyncIterator

from ._errors import ProtocolError
from ._models import CallEvent, IncomingCall, IncomingCallSnapshot
from ._realtime import CallSubscription


class IncomingCallFeed(AsyncIterator[CallEvent]):
    """A snapshot of ringing invites, kept current by a resumable subscription."""

    def __init__(self, snapshot: IncomingCallSnapshot, subscription: CallSubscription) -> None:
        self.snapshot = snapshot
        self._subscription = subscription
        self._calls = {item.call.id: item for item in snapshot.items}
        self._versions = {item.call.id: item.sequence for item in snapshot.items}

    @property
    def cursor(self) -> int:
        """The first snapshot page's cursor used for the WebSocket handoff."""
        return self.snapshot.cursor

    @property
    def after(self) -> int:
        """The last event acknowledged by requesting the next item."""
        return self._subscription.after

    @property
    def items(self) -> tuple[IncomingCall, ...]:
        """Currently ringing calls, ordered by project event sequence."""
        return tuple(sorted(self._calls.values(), key=lambda item: item.sequence))

    def __aiter__(self) -> IncomingCallFeed:
        return self

    async def __anext__(self) -> CallEvent:
        while True:
            event = await self._subscription.__anext__()
            if event.sequence <= self._versions.get(event.call_id, 0):
                continue
            if event.kind == "call.ringing":
                if event.call is None:
                    raise ProtocolError("Ringing event requires call details")
                self._calls[event.call_id] = IncomingCall(
                    event.call, event.sequence, event.created_at
                )
            else:
                self._calls.pop(event.call_id, None)
            self._versions[event.call_id] = event.sequence
            return event

    async def __aenter__(self) -> IncomingCallFeed:
        await self._subscription.__aenter__()
        return self

    async def __aexit__(self, *_: object) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        await self._subscription.aclose()
