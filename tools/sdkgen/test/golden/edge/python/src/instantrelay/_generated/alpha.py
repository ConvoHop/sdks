"""Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.

Typed ``alpha`` operations. Items, jobs and realtime events.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from .operations import OPERATIONS, AsyncInvoker, SyncInvoker
from .types import (
    Capabilities,
    ResolveInput,
    Receipt,
    HTTPMethod,
    StartJobPayload,
    StartJobInput,
    JobInput,
    Job,
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
