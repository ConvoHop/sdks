"""Asynchronous clients for asyncio: :class:`AsyncConvoHop` and :class:`AsyncConvoHopManagement`."""

from __future__ import annotations

from collections.abc import AsyncIterator, Mapping
from types import TracebackType
from typing import Any, Self

import httpx

from ._engine import Engine, requested_cursors
from ._generated.communication import AsyncCommunicationOperations
from ._generated.management import AsyncManagementOperations
from ._generated.operations import AsyncInvoker, OperationSpec
from ._generated.types import RequestResolution
from ._transport import (
    DEFAULT_TIMEOUT,
    AsyncDriver,
    Secret,
    endpoint,
    identifier,
    request_identity,
    storage_key,
    timeout_seconds,
)
from .recovery import MANAGEMENT_INCARNATION, AsyncRecoveryStorage, RecoveryState, RecoveryStorage

__all__ = ["AsyncConvoHop", "AsyncConvoHopManagement"]


class _AsyncClient(AsyncInvoker):
    """Request plumbing shared by the asynchronous clients."""

    __slots__ = ("_driver", "_engine", "_http", "_owns_http")

    _driver: AsyncDriver
    _engine: Engine
    _http: httpx.AsyncClient
    _owns_http: bool

    def _setup(
        self,
        engine: Engine,
        base_url: str,
        secret: Secret,
        timeout: float,
        recovery_storage: RecoveryStorage | None,
        async_recovery_storage: AsyncRecoveryStorage | None,
        http_client: httpx.AsyncClient | None,
        namespace: str,
    ) -> None:
        url = endpoint(base_url)
        seconds = timeout_seconds(timeout)
        if recovery_storage is not None and async_recovery_storage is not None:
            raise TypeError("Choose recovery_storage or async_recovery_storage, not both")
        if recovery_storage is not None and not isinstance(recovery_storage, RecoveryStorage):
            raise TypeError("recovery_storage must provide get_item and set_item")
        if async_recovery_storage is not None and not isinstance(async_recovery_storage, AsyncRecoveryStorage):
            raise TypeError("async_recovery_storage must provide get_item and set_item")
        if http_client is not None and not isinstance(http_client, httpx.AsyncClient):
            raise TypeError("http_client must be an httpx.AsyncClient")
        key = storage_key(namespace)
        if recovery_storage is not None:
            engine.restore(recovery_storage.get_item(key))
        self._engine = engine
        self._owns_http = http_client is None
        self._http = httpx.AsyncClient() if http_client is None else http_client
        self._driver = AsyncDriver(
            engine, self._http, url, secret, seconds, recovery_storage, async_recovery_storage, key
        )

    async def _invoke(self, operation: OperationSpec, payload: Mapping[str, Any] | None, request_id: str | None) -> Any:
        call = self._engine.prepare(operation, payload, request_id)
        await self._driver.initialize()
        return await self._driver.run(self._engine.run(call))

    async def _pages(self, operation: OperationSpec, payload: Mapping[str, Any]) -> AsyncIterator[Any]:
        current: dict[str, Any] | None = dict(payload)
        seen = requested_cursors(operation, payload)
        while current is not None:
            envelope = await self._invoke(operation, current, None)
            page, current = self._engine.page(operation, envelope, current, seen)
            yield page

    async def initialize_recovery(self) -> None:
        """Loads ``async_recovery_storage``. Operations do this on first use; a load failure is raised to each call."""
        await self._driver.initialize()

    async def retry_request(self, request_id: str) -> RequestResolution:
        """Resolves a recorded mutation, resending it with its original identity only if the authority never saw it.

        Returns the authority's resolution: ``committed`` or ``accepted`` once it has the request, else
        ``notObservedYet`` after a resend whose effect is not yet visible. A request the client observed committing,
        or one past its retry budget, raises ``RESOLUTION_REQUIRED``; resolve it read-only with ``resolve_request``.

        Raises:
            LookupError: This client has no recovery record for the request.
            ConvoHopProblem: The authority or the recovery checks refused the retry.
        """
        request_id = request_identity(request_id)
        await self._driver.initialize()
        resolution = await self._driver.run(self._engine.retry(request_id))
        return RequestResolution._from_wire(resolution)

    @property
    def recovery_states(self) -> tuple[RecoveryState, ...]:
        """Snapshots of the recorded mutations, oldest first. They never contain credentials."""
        if not self._driver.ready:
            raise RuntimeError("Await initialize_recovery() before inspecting asynchronous recovery state")
        return self._engine.recovery_states()

    async def aclose(self) -> None:
        """Closes the HTTP client this client created. A client passed as ``http_client`` stays open."""
        if self._owns_http:
            await self._http.aclose()

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        await self.aclose()


class AsyncConvoHop(_AsyncClient, AsyncCommunicationOperations):
    """Asynchronous backend-key client for one project, for one asyncio event loop.

    Await :meth:`initialize` once before other operations. Each method sends one request; mutations record a
    recovery entry first, and run to completion even if the awaiting task is cancelled, so their outcome is
    recorded. Resolve an uncertain mutation with :meth:`resolve_request` or :meth:`retry_request`.

    Args:
        base_url: The authority origin. Plain HTTP is accepted only for loopback hosts.
        backend_key: The project's backend key. Keep it on trusted servers.
        project_id: The project the key belongs to.
        incarnation: The project incarnation from the console or deployment.
        recovery_storage: Synchronous storage for recovery records. It runs on the event loop, so keep it fast.
        async_recovery_storage: Asynchronous storage for recovery records. Choose one of the two.
        http_client: An ``httpx.AsyncClient`` to send through. The SDK never closes a client it did not create.
        timeout: Seconds allowed for each connect, write and read, and for the whole response body.
    """

    __slots__ = ()

    def __init__(
        self,
        *,
        base_url: str,
        backend_key: str,
        project_id: str,
        incarnation: str,
        recovery_storage: RecoveryStorage | None = None,
        async_recovery_storage: AsyncRecoveryStorage | None = None,
        http_client: httpx.AsyncClient | None = None,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        project = identifier(project_id, "project_id")
        persistent = recovery_storage is not None or async_recovery_storage is not None
        engine = Engine(project_id=project, incarnation=identifier(incarnation, "incarnation"), persistent=persistent)
        secret = Secret(backend_key, "backend_key")
        self._setup(
            engine,
            base_url,
            secret,
            timeout,
            recovery_storage,
            async_recovery_storage,
            http_client,
            "backend:" + project,
        )

    @property
    def project_id(self) -> str:
        project = self._engine.project_id
        assert project is not None
        return project

    @property
    def incarnation(self) -> str:
        return self._engine.incarnation

    @property
    def serving_epoch(self) -> str | None:
        """The serving epoch :meth:`initialize` observed, or ``None`` before it runs."""
        return self._engine.serving_epoch

    async def initialize(self) -> None:
        """Reads the project route and records its serving epoch.

        Raises:
            ConvoHopProblem: ``INCARNATION_MISMATCH`` when the project has a new incarnation; recover explicitly.
        """
        await self._driver.initialize()
        await self._driver.run(self._engine.initialize())

    def __repr__(self) -> str:
        return f"AsyncConvoHop(project_id={self.project_id!r}, incarnation={self.incarnation!r})"


class AsyncConvoHopManagement(_AsyncClient, AsyncManagementOperations):
    """Asynchronous management client, for one asyncio event loop.

    Args:
        base_url: The authority origin. Plain HTTP is accepted only for loopback hosts.
        access_token: An operator access token. Keep it on trusted servers.
        actor_id: The operator the token belongs to; it scopes stored recovery records.
        recovery_storage: Synchronous storage for recovery records. It runs on the event loop, so keep it fast.
        async_recovery_storage: Asynchronous storage for recovery records. Choose one of the two.
        http_client: An ``httpx.AsyncClient`` to send through. The SDK never closes a client it did not create.
        timeout: Seconds allowed for each connect, write and read, and for the whole response body.
    """

    __slots__ = ("_actor_id",)

    def __init__(
        self,
        *,
        base_url: str,
        access_token: str,
        actor_id: str,
        recovery_storage: RecoveryStorage | None = None,
        async_recovery_storage: AsyncRecoveryStorage | None = None,
        http_client: httpx.AsyncClient | None = None,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        self._actor_id = identifier(actor_id, "actor_id")
        persistent = recovery_storage is not None or async_recovery_storage is not None
        engine = Engine(project_id=None, incarnation=MANAGEMENT_INCARNATION, persistent=persistent)
        secret = Secret(access_token, "access_token")
        self._setup(
            engine,
            base_url,
            secret,
            timeout,
            recovery_storage,
            async_recovery_storage,
            http_client,
            "management:" + self._actor_id,
        )

    @property
    def actor_id(self) -> str:
        return self._actor_id

    def __repr__(self) -> str:
        return f"AsyncConvoHopManagement(actor_id={self._actor_id!r})"
