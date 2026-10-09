"""Errors the SDK raises.

Every failure tied to a request is a :class:`ConvoHopProblem`. Its ``outcome`` says what is known about the request:
``rejected`` (it had no effect), ``committed``, ``accepted`` or ``unknown``. Resolve an ``unknown`` mutation with
``resolve_request`` or ``retry_request`` before acting on it again. The SDK never resends a request on its own.
"""

from __future__ import annotations

import re
from typing import Any

from ._generated.operations import ERRORS

__all__ = [
    "ConvoHopProblem",
    "PlanLimitExceededProblem",
    "QuotaExceededProblem",
    "RateLimitedProblem",
    "ScopeRequiredProblem",
]

_SCOPE = re.compile(r"The backend key requires the current ([a-z][A-Za-z0-9]{0,63}) scope")


class ConvoHopProblem(Exception):
    """A failure the authority reported or the SDK detected for one request.

    Attributes:
        code: The error code, for example ``SCOPE_REQUIRED`` or ``TRANSPORT_UNKNOWN``.
        request_id: The request the problem belongs to.
        outcome: ``rejected``, ``committed``, ``accepted`` or ``unknown``.
        status: The HTTP status, or 0 when no response was received or storage failed.
        retry_after: Whole seconds to wait before resending the same request, when the authority sent a delay
            (``extensions.retryAfter``, else an HTTP ``Retry-After`` delay in seconds). The SDK never waits or
            resends on its own because of it.
    """

    code: str
    request_id: str
    outcome: str
    status: int
    retry_after: int | None

    def __init__(
        self,
        code: str,
        request_id: str,
        outcome: str,
        status: int,
        message: str,
        *,
        retry_after: int | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.request_id = request_id
        self.outcome = outcome
        self.status = status
        self.retry_after = retry_after

    @property
    def message(self) -> str:
        return str(self.args[0]) if self.args else ""

    @property
    def retryable(self) -> bool:
        """Whether the error catalog marks the code as retryable with the same request ID."""
        spec = ERRORS.get(self.code)
        return spec.retryable if spec is not None else False

    def __reduce__(self) -> tuple[Any, ...]:
        return (
            _restore,
            (type(self), self.code, self.request_id, self.outcome, self.status, self.message, self.retry_after),
        )

    def __repr__(self) -> str:
        return (
            f"{type(self).__name__}(code={self.code!r}, request_id={self.request_id!r}, outcome={self.outcome!r}, "
            f"status={self.status!r}, message={self.message!r}, retry_after={self.retry_after!r})"
        )


class ScopeRequiredProblem(ConvoHopProblem):
    """``SCOPE_REQUIRED``: the backend key lacks a scope the operation requires (403, rejected, not retryable).

    ``scope`` names the missing scope. The authority names it only in the message, so it is ``None`` when the
    message does not match the documented wording. A missing read scope is reported as the read scope even where its
    manage scope would also satisfy the operation.
    """

    scope: str | None

    def __init__(
        self,
        code: str,
        request_id: str,
        outcome: str,
        status: int,
        message: str,
        *,
        retry_after: int | None = None,
    ) -> None:
        super().__init__(code, request_id, outcome, status, message, retry_after=retry_after)
        match = _SCOPE.fullmatch(message)
        self.scope = match.group(1) if match else None


class RateLimitedProblem(ConvoHopProblem):
    """``RATE_LIMITED``: wait ``retry_after`` seconds, then resend with the same request ID."""


class QuotaExceededProblem(ConvoHopProblem):
    """``QUOTA_EXCEEDED``: a hard usage quota refused new work until ``retry_after`` seconds pass."""


class PlanLimitExceededProblem(ConvoHopProblem):
    """``PLAN_LIMIT_EXCEEDED``: the plan does not permit the resource or feature."""


_CLASSES: dict[str, type[ConvoHopProblem]] = {
    "SCOPE_REQUIRED": ScopeRequiredProblem,
    "RATE_LIMITED": RateLimitedProblem,
    "QUOTA_EXCEEDED": QuotaExceededProblem,
    "PLAN_LIMIT_EXCEEDED": PlanLimitExceededProblem,
}


def authority_problem(
    code: str, request_id: str, outcome: str, status: int, message: str, retry_after: int | None = None
) -> ConvoHopProblem:
    """Builds the problem class that matches an authority error code."""
    return _CLASSES.get(code, ConvoHopProblem)(code, request_id, outcome, status, message, retry_after=retry_after)


def _restore(
    cls: type[ConvoHopProblem],
    code: str,
    request_id: str,
    outcome: str,
    status: int,
    message: str,
    retry_after: int | None,
) -> ConvoHopProblem:
    return cls(code, request_id, outcome, status, message, retry_after=retry_after)
