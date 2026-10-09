"""Synchronous clients: :class:`ConvoHop` for one project and :class:`ConvoHopManagement` for the control plane."""

from __future__ import annotations

from collections.abc import Iterator, Mapping
from types import TracebackType
from typing import Any, Self

import httpx

from ._engine import Engine, requested_cursors
from ._generated.communication import CommunicationOperations
from ._generated.management import ManagementOperations
from ._generated.operations import OperationSpec, SyncInvoker
from ._generated.types import RequestResolution
from ._transport import (
    DEFAULT_TIMEOUT,
    Secret,
    SyncDriver,
    endpoint,
    identifier,
    request_identity,
    storage_key,
    timeout_seconds,
)
from .recovery import MANAGEMENT_INCARNATION, RecoveryState, RecoveryStorage

__all__ = ["ConvoHop", "ConvoHopManagement"]


class _Client(SyncInvoker):
    """Request plumbing shared by the synchronous clients."""

    __slots__ = ("_driver", "_engine", "_http", "_owns_http")

    _driver: SyncDriver
    _engine: Engine
    _http: httpx.Client
    _owns_http: bool

    def _setup(
        self,
        engine: Engine,
        base_url: str,
        secret: Secret,
        timeout: float,
        recovery_storage: RecoveryStorage | None,
        http_client: httpx.Client | None,
        namespace: str,
    ) -> None:
        url = endpoint(base_url)
        seconds = timeout_seconds(timeout)
        if recovery_storage is not None and not isinstance(recovery_storage, RecoveryStorage):
            raise TypeError("recovery_storage must provide get_item and set_item")
        if http_client is not None and not isinstance(http_client, httpx.Client):
            raise TypeError("http_client must be an httpx.Client")
        key = storage_key(namespace)
        if recovery_storage is not None:
            engine.restore(recovery_storage.get_item(key))
        self._engine = engine
        self._owns_http = http_client is None
        self._http = httpx.Client() if http_client is None else http_client
        self._driver = SyncDriver(engine, self._http, url, secret, seconds, recovery_storage, key)

    def _invoke(self, operation: OperationSpec, payload: Mapping[str, Any] | None, request_id: str | None) -> Any:
        call = self._engine.prepare(operation, payload, request_id)
        return self._driver.run(self._engine.run(call))

    def _pages(self, operation: OperationSpec, payload: Mapping[str, Any]) -> Iterator[Any]:
        current: dict[str, Any] | None = dict(payload)
        seen = requested_cursors(operation, payload)
        while current is not None:
            envelope = self._invoke(operation, current, None)
            page, current = self._engine.page(operation, envelope, current, seen)
            yield page

    def retry_request(self, request_id: str) -> RequestResolution:
        """Resolves a recorded mutation, resending it with its original identity only if the authority never saw it.

        Returns the authority's resolution: ``committed`` or ``accepted`` once it has the request, else
        ``notObservedYet`` after a resend whose effect is not yet visible. A request the client observed committing,
        or one past its retry budget, raises ``RESOLUTION_REQUIRED``; resolve it read-only with ``resolve_request``.
        A ``replayOnly`` operation cannot be looked up and raises ``INVALID_REQUEST``; call the operation again with
        the same ``request_id`` and input instead.

        Raises:
            LookupError: This client has no recovery record for the request.
            ConvoHopProblem: The authority or the recovery checks refused the retry.
        """
        resolution = self._driver.run(self._engine.retry(request_identity(request_id)))
        return RequestResolution._from_wire(resolution)

    @property
    def recovery_states(self) -> tuple[RecoveryState, ...]:
        """Snapshots of the recorded mutations, oldest first. They never contain credentials."""
        with self._driver.lock:
            return self._engine.recovery_states()

    def close(self) -> None:
        """Closes the HTTP client this client created. A client passed as ``http_client`` stays open."""
        if self._owns_http:
            self._http.close()

    def __enter__(self) -> Self:
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        self.close()


class ConvoHop(_Client, CommunicationOperations):
    """Backend-key client for one project.

    Call :meth:`initialize` once before other operations: it checks the project incarnation and records the serving
    epoch that later requests report. Every method sends one request; mutations accept ``request_id`` and record a
    recovery entry first, so an uncertain outcome can be resolved with :meth:`resolve_request` or
    :meth:`retry_request`. The client never resends on its own. It is safe to share between threads.

    Args:
        base_url: The authority origin, for example ``https://api.convohop.example``. Plain HTTP is accepted only
            for loopback hosts.
        backend_key: The project's backend key. Keep it on trusted servers.
        project_id: The project the key belongs to.
        incarnation: The project incarnation from the console or deployment.
        recovery_storage: Durable storage for mutation recovery records; in memory only when omitted.
        http_client: An ``httpx.Client`` to send through. The SDK never closes a client it did not create.
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
        http_client: httpx.Client | None = None,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        project = identifier(project_id, "project_id")
        engine = Engine(
            project_id=project,
            incarnation=identifier(incarnation, "incarnation"),
            persistent=recovery_storage is not None,
        )
        secret = Secret(backend_key, "backend_key")
        self._setup(engine, base_url, secret, timeout, recovery_storage, http_client, "backend:" + project)

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

    def initialize(self) -> None:
        """Reads the project route and records its serving epoch.

        Raises:
            ConvoHopProblem: ``INCARNATION_MISMATCH`` when the project has a new incarnation; recover explicitly.
        """
        self._driver.run(self._engine.initialize())

    def __repr__(self) -> str:
        return f"ConvoHop(project_id={self.project_id!r}, incarnation={self.incarnation!r})"


class ConvoHopManagement(_Client, ManagementOperations):
    """Management client for organizations, projects, deployments, backend keys and webhooks.

    Args:
        base_url: The authority origin. Plain HTTP is accepted only for loopback hosts.
        access_token: An operator access token. Keep it on trusted servers.
        actor_id: The operator the token belongs to; it scopes stored recovery records.
        recovery_storage: Durable storage for mutation recovery records; in memory only when omitted.
        http_client: An ``httpx.Client`` to send through. The SDK never closes a client it did not create.
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
        http_client: httpx.Client | None = None,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        self._actor_id = identifier(actor_id, "actor_id")
        engine = Engine(project_id=None, incarnation=MANAGEMENT_INCARNATION, persistent=recovery_storage is not None)
        secret = Secret(access_token, "access_token")
        self._setup(engine, base_url, secret, timeout, recovery_storage, http_client, "management:" + self._actor_id)

    @property
    def actor_id(self) -> str:
        return self._actor_id

    def __repr__(self) -> str:
        return f"ConvoHopManagement(actor_id={self._actor_id!r})"
