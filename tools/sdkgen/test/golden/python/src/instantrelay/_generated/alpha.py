"""Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.

Typed ``alpha`` operations. Items, jobs and realtime events.
"""

from __future__ import annotations

from collections.abc import AsyncIterator, Iterator, Mapping, Sequence
from typing import Any

from .operations import OPERATIONS, AsyncInvoker, SyncInvoker
from .types import (
    Capabilities,
    ResolveInput,
    Receipt,
    Fruit,
    HTTPMethod,
    Item,
    ItemsInput,
    Box_3dInput,
    ItemPage,
    Event,
    EventPage,
    EventsInput,
    StartJobPayload,
    StartJobInput,
    JobInput,
    Job,
    PingInput,
    FetchInput,
)


__all__ = [
    "AsyncAlphaOperations",
    "AlphaOperations",
]


class AlphaOperations(SyncInvoker):
    """Synchronous ``alpha`` operations. Items, jobs and realtime events."""

    __slots__ = ()

    def capabilities(self) -> Capabilities:
        """Read the server capabilities.

        Server capabilities.

        Authorization: ``serverKey``.

        Idempotency: ``safe``. Read-only. Repeat freely.
        """
        return Capabilities._from_wire(self._invoke(OPERATIONS["alpha.capabilities"], None, None))

    def resolve_request(
        self,
        *,
        request_id: str,
    ) -> Receipt:
        """Look up the outcome of an earlier alpha mutation by requestId.

        Authorization: ``serverKey`` with scope ``itemRead``.

        Idempotency: ``safe``. Read-only. Repeat freely.
        """
        _input = ResolveInput(
            request_id=request_id,
        ).to_dict()
        return Receipt._from_wire(self._invoke(OPERATIONS["alpha.resolveRequest"], _input, None))

    def items(
        self,
        *,
        limit: int | None = None,
        cursor: str | None = None,
        fruits: Sequence[Fruit] | None = None,
        min_weight: float | None = None,
        include_deprecated: bool | None = None,
        method: HTTPMethod | None = None,
        box: Box_3dInput | None = None,
        legacy_filter: str | None = None,
        item2: int | None = None,
        item10: int | None = None,
    ) -> ItemPage:
        """List items in server order.

        List items.

        Pages follow the cursor style.

        Authorization: ``serverKey`` with scope ``itemRead``.

        Idempotency: ``safe``. Read-only. Repeat freely.

        Pagination: ``cursor``. Server-ordered pages. :meth:`iter_items` follows the cursor for you.

        Args:
            limit: Page size. Defaults to 20. Defaults to ``20`` on the server.
            include_deprecated: Defaults to ``false`` on the server.
            method: Defaults to ``"GET"`` on the server.
            legacy_filter: Deprecated: Use fruits.
        """
        _input = ItemsInput(
            limit=limit,
            cursor=cursor,
            fruits=fruits,
            min_weight=min_weight,
            include_deprecated=include_deprecated,
            method=method,
            box=box,
            legacy_filter=legacy_filter,
            item2=item2,
            item10=item10,
        ).to_dict()
        return ItemPage._from_wire(self._invoke(OPERATIONS["alpha.items"], _input, None))

    def iter_items(
        self,
        *,
        limit: int | None = None,
        cursor: str | None = None,
        fruits: Sequence[Fruit] | None = None,
        min_weight: float | None = None,
        include_deprecated: bool | None = None,
        method: HTTPMethod | None = None,
        box: Box_3dInput | None = None,
        legacy_filter: str | None = None,
        item2: int | None = None,
        item10: int | None = None,
    ) -> Iterator[Item]:
        """Iterate the ``items`` of :meth:`items` across pages.

        Follows ``nextCursor`` until a page is ``complete``. A page that sets ``refreshRequired`` raises ``RESYNC_REQUIRED``; restart from the first page.

        Args:
            limit: Page size. Defaults to 20. Defaults to ``20`` on the server.
            include_deprecated: Defaults to ``false`` on the server.
            method: Defaults to ``"GET"`` on the server.
            legacy_filter: Deprecated: Use fruits.
        """
        _input = ItemsInput(
            limit=limit,
            cursor=cursor,
            fruits=fruits,
            min_weight=min_weight,
            include_deprecated=include_deprecated,
            method=method,
            box=box,
            legacy_filter=legacy_filter,
            item2=item2,
            item10=item10,
        ).to_dict()
        for _page in self._pages(OPERATIONS["alpha.items"], _input):
            for _item in _page["items"]:
                yield Item._from_wire(_item)

    def events(
        self,
        *,
        after: str | None = None,
        limit: int = 50,
    ) -> EventPage:
        """Replay alpha events after a cursor.

        Authorization: ``serverKey`` with scope ``itemRead``.

        Idempotency: ``safe``. Read-only. Repeat freely.

        Pagination: ``replay``. Events in ascending sequence after a cursor. :meth:`iter_events` follows the cursor for you.

        Args:
            limit: Defaults to 50, the largest page.
        """
        _input = EventsInput(
            after=after,
            limit=limit,
        ).to_dict()
        return EventPage._from_wire(self._invoke(OPERATIONS["alpha.events"], _input, None))

    def iter_events(
        self,
        *,
        after: str | None = None,
        limit: int = 50,
    ) -> Iterator[Event]:
        """Iterate the ``items`` of :meth:`events` across pages.

        Follows ``nextCursor`` until a page is ``complete``. A page that sets ``refreshRequired`` raises ``RESYNC_REQUIRED``; restart from the first page.

        Args:
            limit: Defaults to 50, the largest page.
        """
        _input = EventsInput(
            after=after,
            limit=limit,
        ).to_dict()
        for _page in self._pages(OPERATIONS["alpha.events"], _input):
            for _item in _page["items"]:
                yield Event._from_wire(_item)

    def job(
        self,
        *,
        operation_id: str,
    ) -> Job | None:
        """Poll a job that alpha.startJob started.

        Authorization: ``serverKey`` with scope ``itemRead``.

        Idempotency: ``safe``. Read-only. Repeat freely.
        """
        _input = JobInput(
            operation_id=operation_id,
        ).to_dict()
        _value = self._invoke(OPERATIONS["alpha.job"], _input, None)
        return None if _value is None else Job._from_wire(_value)

    def fetch_http_status(
        self,
        *,
        method: HTTPMethod | None = None,
    ) -> int | None:
        """Fetch a <status> for `GET` | *POST* calls, with #tags, {braces}, [links], ~tildes~, & a back\\slash for _escaping_ in snake_case.

        Deprecated: Use capabilities.

        Authorization: ``serverKey`` with all of the scopes ``itemRead`` and ``widgetWrite``.

        Idempotency: ``safe``. Read-only. Repeat freely.

        Args:
            method: Defaults to ``"GET"`` on the server.
        """
        _input = FetchInput(
            method=method,
        ).to_dict()
        _value: int | None = self._invoke(OPERATIONS["alpha.fetchHTTPStatus"], _input, None)
        return _value

    def start_job(
        self,
        *,
        item_id: str,
        repeat: int | None = None,
        props: Mapping[str, Any] | None = None,
        request_id: str | None = None,
    ) -> StartJobPayload:
        """Start a job. It finishes asynchronously.

        Authorization: ``serverKey`` with scope ``widgetWrite``.

        Idempotency: ``idempotent``. Retry with the same requestId and input; resolve an unknown outcome with resolveRequest.

        Long-running: returns the whole reply. Poll :meth:`job` with ``operation_id`` set to ``job.operation_id`` until the work completes.

        Args:
            repeat: How many times to run. Defaults to ``1`` on the server.
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = StartJobInput(
            item_id=item_id,
            repeat=repeat,
            props=props,
        ).to_dict()
        return StartJobPayload._from_wire(self._invoke(OPERATIONS["alpha.startJob"], _input, request_id))

    def ping(
        self,
        *,
        note: str | None = None,
        request_id: str | None = None,
    ) -> bool:
        """1. Send an ephemeral ping.

        Authorization: ``serverKey`` with scope ``itemRead``.

        Idempotency: ``ephemeral``. Transient signal. Never retried.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = PingInput(
            note=note,
        ).to_dict()
        _value: bool = self._invoke(OPERATIONS["alpha.ping"], _input, request_id)
        return _value


class AsyncAlphaOperations(AsyncInvoker):
    """Asynchronous ``alpha`` operations. Items, jobs and realtime events."""

    __slots__ = ()

    async def capabilities(self) -> Capabilities:
        """Read the server capabilities.

        Server capabilities.

        Authorization: ``serverKey``.

        Idempotency: ``safe``. Read-only. Repeat freely.
        """
        return Capabilities._from_wire(await self._invoke(OPERATIONS["alpha.capabilities"], None, None))

    async def resolve_request(
        self,
        *,
        request_id: str,
    ) -> Receipt:
        """Look up the outcome of an earlier alpha mutation by requestId.

        Authorization: ``serverKey`` with scope ``itemRead``.

        Idempotency: ``safe``. Read-only. Repeat freely.
        """
        _input = ResolveInput(
            request_id=request_id,
        ).to_dict()
        return Receipt._from_wire(await self._invoke(OPERATIONS["alpha.resolveRequest"], _input, None))

    async def items(
        self,
        *,
        limit: int | None = None,
        cursor: str | None = None,
        fruits: Sequence[Fruit] | None = None,
        min_weight: float | None = None,
        include_deprecated: bool | None = None,
        method: HTTPMethod | None = None,
        box: Box_3dInput | None = None,
        legacy_filter: str | None = None,
        item2: int | None = None,
        item10: int | None = None,
    ) -> ItemPage:
        """List items in server order.

        List items.

        Pages follow the cursor style.

        Authorization: ``serverKey`` with scope ``itemRead``.

        Idempotency: ``safe``. Read-only. Repeat freely.

        Pagination: ``cursor``. Server-ordered pages. :meth:`iter_items` follows the cursor for you.

        Args:
            limit: Page size. Defaults to 20. Defaults to ``20`` on the server.
            include_deprecated: Defaults to ``false`` on the server.
            method: Defaults to ``"GET"`` on the server.
            legacy_filter: Deprecated: Use fruits.
        """
        _input = ItemsInput(
            limit=limit,
            cursor=cursor,
            fruits=fruits,
            min_weight=min_weight,
            include_deprecated=include_deprecated,
            method=method,
            box=box,
            legacy_filter=legacy_filter,
            item2=item2,
            item10=item10,
        ).to_dict()
        return ItemPage._from_wire(await self._invoke(OPERATIONS["alpha.items"], _input, None))

    async def iter_items(
        self,
        *,
        limit: int | None = None,
        cursor: str | None = None,
        fruits: Sequence[Fruit] | None = None,
        min_weight: float | None = None,
        include_deprecated: bool | None = None,
        method: HTTPMethod | None = None,
        box: Box_3dInput | None = None,
        legacy_filter: str | None = None,
        item2: int | None = None,
        item10: int | None = None,
    ) -> AsyncIterator[Item]:
        """Iterate the ``items`` of :meth:`items` across pages.

        Follows ``nextCursor`` until a page is ``complete``. A page that sets ``refreshRequired`` raises ``RESYNC_REQUIRED``; restart from the first page.

        Args:
            limit: Page size. Defaults to 20. Defaults to ``20`` on the server.
            include_deprecated: Defaults to ``false`` on the server.
            method: Defaults to ``"GET"`` on the server.
            legacy_filter: Deprecated: Use fruits.
        """
        _input = ItemsInput(
            limit=limit,
            cursor=cursor,
            fruits=fruits,
            min_weight=min_weight,
            include_deprecated=include_deprecated,
            method=method,
            box=box,
            legacy_filter=legacy_filter,
            item2=item2,
            item10=item10,
        ).to_dict()
        async for _page in self._pages(OPERATIONS["alpha.items"], _input):
            for _item in _page["items"]:
                yield Item._from_wire(_item)

    async def events(
        self,
        *,
        after: str | None = None,
        limit: int = 50,
    ) -> EventPage:
        """Replay alpha events after a cursor.

        Authorization: ``serverKey`` with scope ``itemRead``.

        Idempotency: ``safe``. Read-only. Repeat freely.

        Pagination: ``replay``. Events in ascending sequence after a cursor. :meth:`iter_events` follows the cursor for you.

        Args:
            limit: Defaults to 50, the largest page.
        """
        _input = EventsInput(
            after=after,
            limit=limit,
        ).to_dict()
        return EventPage._from_wire(await self._invoke(OPERATIONS["alpha.events"], _input, None))

    async def iter_events(
        self,
        *,
        after: str | None = None,
        limit: int = 50,
    ) -> AsyncIterator[Event]:
        """Iterate the ``items`` of :meth:`events` across pages.

        Follows ``nextCursor`` until a page is ``complete``. A page that sets ``refreshRequired`` raises ``RESYNC_REQUIRED``; restart from the first page.

        Args:
            limit: Defaults to 50, the largest page.
        """
        _input = EventsInput(
            after=after,
            limit=limit,
        ).to_dict()
        async for _page in self._pages(OPERATIONS["alpha.events"], _input):
            for _item in _page["items"]:
                yield Event._from_wire(_item)

    async def job(
        self,
        *,
        operation_id: str,
    ) -> Job | None:
        """Poll a job that alpha.startJob started.

        Authorization: ``serverKey`` with scope ``itemRead``.

        Idempotency: ``safe``. Read-only. Repeat freely.
        """
        _input = JobInput(
            operation_id=operation_id,
        ).to_dict()
        _value = await self._invoke(OPERATIONS["alpha.job"], _input, None)
        return None if _value is None else Job._from_wire(_value)

    async def fetch_http_status(
        self,
        *,
        method: HTTPMethod | None = None,
    ) -> int | None:
        """Fetch a <status> for `GET` | *POST* calls, with #tags, {braces}, [links], ~tildes~, & a back\\slash for _escaping_ in snake_case.

        Deprecated: Use capabilities.

        Authorization: ``serverKey`` with all of the scopes ``itemRead`` and ``widgetWrite``.

        Idempotency: ``safe``. Read-only. Repeat freely.

        Args:
            method: Defaults to ``"GET"`` on the server.
        """
        _input = FetchInput(
            method=method,
        ).to_dict()
        _value: int | None = await self._invoke(OPERATIONS["alpha.fetchHTTPStatus"], _input, None)
        return _value

    async def start_job(
        self,
        *,
        item_id: str,
        repeat: int | None = None,
        props: Mapping[str, Any] | None = None,
        request_id: str | None = None,
    ) -> StartJobPayload:
        """Start a job. It finishes asynchronously.

        Authorization: ``serverKey`` with scope ``widgetWrite``.

        Idempotency: ``idempotent``. Retry with the same requestId and input; resolve an unknown outcome with resolveRequest.

        Long-running: returns the whole reply. Poll :meth:`job` with ``operation_id`` set to ``job.operation_id`` until the work completes.

        Args:
            repeat: How many times to run. Defaults to ``1`` on the server.
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = StartJobInput(
            item_id=item_id,
            repeat=repeat,
            props=props,
        ).to_dict()
        return StartJobPayload._from_wire(await self._invoke(OPERATIONS["alpha.startJob"], _input, request_id))

    async def ping(
        self,
        *,
        note: str | None = None,
        request_id: str | None = None,
    ) -> bool:
        """1. Send an ephemeral ping.

        Authorization: ``serverKey`` with scope ``itemRead``.

        Idempotency: ``ephemeral``. Transient signal. Never retried.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = PingInput(
            note=note,
        ).to_dict()
        _value: bool = await self._invoke(OPERATIONS["alpha.ping"], _input, request_id)
        return _value
