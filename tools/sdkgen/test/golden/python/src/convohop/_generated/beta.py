"""Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.

Typed ``beta`` operations. Widgets.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from .operations import OPERATIONS, AsyncInvoker, SyncInvoker
from .types import (
    Capabilities,
    ResolveInput,
    Receipt,
    WidgetState,
    Widget,
    WidgetPage,
    WidgetsInput,
    ShapeInput,
    CreateWidgetInput,
)


__all__ = [
    "AsyncBetaOperations",
    "BetaOperations",
]


class BetaOperations(SyncInvoker):
    """Synchronous ``beta`` operations. Widgets."""

    __slots__ = ()

    def capabilities(self) -> Capabilities:
        """Read the server capabilities.

        Server capabilities.

        Authorization: ``serverKey``.

        Idempotency: ``safe``. Read-only. Repeat freely.
        """
        return Capabilities._from_wire(self._invoke(OPERATIONS["beta.capabilities"], None, None))

    def resolve_request(
        self,
        *,
        request_id: str,
    ) -> Receipt:
        """Look up the outcome of an earlier beta mutation by requestId.

        Authorization: ``serverKey`` with scope ``widgetWrite``.

        Idempotency: ``safe``. Read-only. Repeat freely.
        """
        _input = ResolveInput(
            request_id=request_id,
        ).to_dict()
        return Receipt._from_wire(self._invoke(OPERATIONS["beta.resolveRequest"], _input, None))

    def widgets(
        self,
        *,
        states: Sequence[WidgetState] | None = None,
    ) -> WidgetPage | None:
        """List widgets in one bounded page.

        Authorization: ``serverKey`` with scope ``itemRead``.

        Idempotency: ``safe``. Read-only. Repeat freely.

        Pagination: ``bounded``. One bounded page.
        """
        _input = WidgetsInput(
            states=states,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["beta.widgets"], _input, None)
        _value = _envelope["result"]
        return None if _value is None else WidgetPage._from_wire(_value)

    def create_widget(
        self,
        *,
        label: str,
        state: WidgetState | None = None,
        ratio: float | None = None,
        nested: Sequence[Sequence[int]] | None = None,
        shape: ShapeInput | None = None,
        request_id: str | None = None,
    ) -> Widget:
        """Create a widget.

        Authorization: ``serverKey`` with scope ``widgetWrite``.

        Idempotency: ``singleUse``. Like idempotent, but the result is good for one use.

        Args:
            state: Defaults to ``"ACTIVE"`` on the server.
            ratio: Defaults to ``0.5`` on the server.
            shape: Defaults to ``{"kind":"box","sides":[1,2]}`` on the server.
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = CreateWidgetInput(
            label=label,
            state=state,
            ratio=ratio,
            nested=nested,
            shape=shape,
        ).to_dict()
        return Widget._from_wire(self._invoke(OPERATIONS["beta.createWidget"], _input, request_id))


class AsyncBetaOperations(AsyncInvoker):
    """Asynchronous ``beta`` operations. Widgets."""

    __slots__ = ()

    async def capabilities(self) -> Capabilities:
        """Read the server capabilities.

        Server capabilities.

        Authorization: ``serverKey``.

        Idempotency: ``safe``. Read-only. Repeat freely.
        """
        return Capabilities._from_wire(await self._invoke(OPERATIONS["beta.capabilities"], None, None))

    async def resolve_request(
        self,
        *,
        request_id: str,
    ) -> Receipt:
        """Look up the outcome of an earlier beta mutation by requestId.

        Authorization: ``serverKey`` with scope ``widgetWrite``.

        Idempotency: ``safe``. Read-only. Repeat freely.
        """
        _input = ResolveInput(
            request_id=request_id,
        ).to_dict()
        return Receipt._from_wire(await self._invoke(OPERATIONS["beta.resolveRequest"], _input, None))

    async def widgets(
        self,
        *,
        states: Sequence[WidgetState] | None = None,
    ) -> WidgetPage | None:
        """List widgets in one bounded page.

        Authorization: ``serverKey`` with scope ``itemRead``.

        Idempotency: ``safe``. Read-only. Repeat freely.

        Pagination: ``bounded``. One bounded page.
        """
        _input = WidgetsInput(
            states=states,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["beta.widgets"], _input, None)
        _value = _envelope["result"]
        return None if _value is None else WidgetPage._from_wire(_value)

    async def create_widget(
        self,
        *,
        label: str,
        state: WidgetState | None = None,
        ratio: float | None = None,
        nested: Sequence[Sequence[int]] | None = None,
        shape: ShapeInput | None = None,
        request_id: str | None = None,
    ) -> Widget:
        """Create a widget.

        Authorization: ``serverKey`` with scope ``widgetWrite``.

        Idempotency: ``singleUse``. Like idempotent, but the result is good for one use.

        Args:
            state: Defaults to ``"ACTIVE"`` on the server.
            ratio: Defaults to ``0.5`` on the server.
            shape: Defaults to ``{"kind":"box","sides":[1,2]}`` on the server.
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = CreateWidgetInput(
            label=label,
            state=state,
            ratio=ratio,
            nested=nested,
            shape=shape,
        ).to_dict()
        return Widget._from_wire(await self._invoke(OPERATIONS["beta.createWidget"], _input, request_id))
