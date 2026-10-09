"""Authority problems: typed classes, retry delays, scope names and redaction."""

from __future__ import annotations

import pickle
from collections.abc import Callable
from typing import Any

import httpx
import pytest

from convohop import (
    ConvoHopProblem,
    PlanLimitExceededProblem,
    QuotaExceededProblem,
    RateLimitedProblem,
    ScopeRequiredProblem,
)

from .graphql import BACKEND_KEY, Authority, Received, graphql_error, uid

Respond = Callable[[Received], httpx.Response]


def scope_message(scope: str) -> str:
    return f"The backend key requires the current {scope} scope"


def graphql(headers: dict[str, str] | None = None, message: str = "Rate limited", **extensions: Any) -> Respond:
    """An HTTP 200 GraphQL error; ``extensions`` replace the defaults, so ``status`` must be given."""

    def respond(request: Received) -> httpx.Response:
        defaults: dict[str, Any] = {"requestId": request.request_id, "outcome": "rejected"}
        error = {"message": message, "extensions": defaults | extensions}
        return httpx.Response(200, json={"errors": [error]}, headers=headers)

    return respond


def http(body: dict[str, Any], headers: dict[str, str] | None = None, status: int = 429) -> Respond:
    """A non-2xx HTTP error with a plain JSON body and no GraphQL errors."""
    return lambda _request: httpx.Response(status, json=body, headers=headers)


def problem(respond: Respond, call: Callable[[Any], object] = lambda client: client.capabilities()) -> ConvoHopProblem:
    authority = Authority(respond)
    client = authority.project()
    with pytest.raises(ConvoHopProblem) as caught:
        call(client)
    error = caught.value
    assert error.request_id == authority.requests[-1].request_id
    for view in (str(error), repr(error), error.message, *map(str, error.args)):
        assert BACKEND_KEY not in view
    return error


LIMITED: dict[str, Any] = {"code": "RATE_LIMITED", "status": 429, "retryable": True}
SLOW_DOWN: dict[str, Any] = {"code": "RATE_LIMITED", "outcome": "rejected", "message": "Slow down"}


@pytest.mark.parametrize(
    ("respond", "expected"),
    [
        (graphql(**LIMITED, retryAfter=7), 7),
        (graphql(**LIMITED, retryAfter="12"), 12),
        (graphql(**LIMITED, retryAfter=0), 0),
        (graphql({"retry-after": "5"}, **LIMITED), 5),
        (graphql({"retry-after": "9"}, **LIMITED, retryAfter=3), 3),
        # An unusable extension falls back to the header rather than hiding it.
        (graphql({"retry-after": "6"}, **LIMITED, retryAfter="soon"), 6),
        (http(SLOW_DOWN | {"retryAfter": 4}), 4),
        (http(SLOW_DOWN, {"retry-after": "8"}), 8),
        (http(SLOW_DOWN | {"retryAfter": 2}, {"retry-after": "8"}), 2),
    ],
)
def test_retry_after_comes_from_the_extension_else_the_header_on_either_error_path(
    respond: Respond, expected: int
) -> None:
    error = problem(respond)
    assert type(error) is RateLimitedProblem
    assert (error.code, error.outcome, error.status, error.retry_after) == ("RATE_LIMITED", "rejected", 429, expected)
    assert error.retryable


@pytest.mark.parametrize(
    "retry_after", [-1, 1.5, "1.5", "", " 5", "+5", "0x10", "\u0665", "12345678901", 2**53, True, None, {}, [5]]
)
def test_delays_that_are_not_whole_seconds_are_ignored(retry_after: object) -> None:
    error = problem(graphql(code="RATE_LIMITED", status=429, retryAfter=retry_after))
    assert (error.code, error.retry_after) == ("RATE_LIMITED", None)


@pytest.mark.parametrize("header", ["Wed, 21 Oct 2026 07:28:00 GMT", "1.5", "-1", "5, 6", "12345678901"])
def test_http_dates_and_malformed_retry_after_headers_are_ignored(header: str) -> None:
    for respond in (
        graphql({"retry-after": header}, code="RATE_LIMITED", status=429),
        http(SLOW_DOWN, {"retry-after": header}),
    ):
        error = problem(respond)
        assert (error.code, error.retry_after) == ("RATE_LIMITED", None)


def test_an_unannotated_problem_has_no_retry_delay() -> None:
    error = problem(graphql(message="Not found", code="NOT_FOUND", status=404))
    assert type(error) is ConvoHopProblem
    assert (error.code, error.status, error.retry_after, error.retryable) == ("NOT_FOUND", 404, None, False)


def test_a_rejected_mutation_keeps_its_retry_delay_and_is_never_resent() -> None:
    error = problem(
        graphql(code="RATE_LIMITED", status=429, retryAfter=30),
        lambda client: client.create_principal(external_user_id="fixture-user"),
    )
    assert (error.code, error.retry_after) == ("RATE_LIMITED", 30)


def test_scope_required_is_a_scope_required_problem_that_names_the_missing_scope() -> None:
    for respond in (
        graphql(message=scope_message("messageRead"), code="SCOPE_REQUIRED", status=403, retryable=False),
        http({"code": "SCOPE_REQUIRED", "outcome": "rejected", "message": scope_message("messageRead")}, status=403),
    ):
        error = problem(respond)
        assert isinstance(error, ScopeRequiredProblem)
        assert (error.code, error.status, error.outcome, error.scope) == (
            "SCOPE_REQUIRED",
            403,
            "rejected",
            "messageRead",
        )
        assert error.retry_after is None
        assert not error.retryable


@pytest.mark.parametrize(
    "message",
    [
        "Missing scope",
        scope_message("messageRead") + ".",
        scope_message("MessageRead"),
        scope_message("message read"),
        scope_message("messageRead") + "\n",
        "Note: " + scope_message("messageRead"),
        scope_message("m" + "x" * 64),
    ],
)
def test_a_scope_required_message_in_another_wording_keeps_the_class_but_not_a_guessed_scope(message: str) -> None:
    error = problem(graphql(message=message, code="SCOPE_REQUIRED", status=403))
    assert isinstance(error, ScopeRequiredProblem)
    assert (error.code, error.scope, error.message) == ("SCOPE_REQUIRED", None, message)


def test_an_unexplained_scope_required_error_uses_the_default_message() -> None:
    def respond(request: Received) -> httpx.Response:
        extensions = {"code": "SCOPE_REQUIRED", "requestId": request.request_id, "outcome": "rejected", "status": 403}
        return httpx.Response(200, json={"errors": [{"extensions": extensions}]})

    error = problem(respond)
    assert isinstance(error, ScopeRequiredProblem)
    assert (error.scope, error.message) == (None, "GraphQL rejected the request")


@pytest.mark.parametrize(
    ("code", "status", "cls"),
    [("QUOTA_EXCEEDED", 429, QuotaExceededProblem), ("PLAN_LIMIT_EXCEEDED", 403, PlanLimitExceededProblem)],
)
def test_quota_and_plan_problems_are_typed(code: str, status: int, cls: type[ConvoHopProblem]) -> None:
    error = problem(lambda request: graphql_error(request, code, status, "Limit reached", retryAfter=60))
    assert type(error) is cls
    assert (error.code, error.status, error.outcome, error.retry_after) == (code, status, "rejected", 60)


def test_problems_constructed_directly_keep_the_same_shape() -> None:
    request_id = uid()
    limited = ConvoHopProblem("RATE_LIMITED", request_id, "rejected", 429, "Rate limited", retry_after=3)
    assert (limited.message, limited.retry_after, str(limited)) == ("Rate limited", 3, "Rate limited")
    assert ConvoHopProblem("NOT_FOUND", request_id, "rejected", 404, "Not found").retry_after is None
    scoped = ScopeRequiredProblem("SCOPE_REQUIRED", request_id, "rejected", 403, scope_message("callRead"))
    assert isinstance(scoped, ConvoHopProblem)
    assert (scoped.code, scoped.scope, scoped.request_id) == ("SCOPE_REQUIRED", "callRead", request_id)
    assert repr(limited) == (
        f"ConvoHopProblem(code='RATE_LIMITED', request_id='{request_id}', outcome='rejected', status=429, "
        "message='Rate limited', retry_after=3)"
    )


@pytest.mark.parametrize(
    "error",
    [
        ConvoHopProblem("TRANSPORT_UNKNOWN", "00000000-0000-4000-8000-000000000001", "unknown", 0, "Lost"),
        RateLimitedProblem("RATE_LIMITED", "00000000-0000-4000-8000-000000000002", "rejected", 429, "", retry_after=4),
        ScopeRequiredProblem(
            "SCOPE_REQUIRED", "00000000-0000-4000-8000-000000000003", "rejected", 403, scope_message("callRead")
        ),
    ],
)
def test_problems_survive_pickling_with_their_class_and_fields(error: ConvoHopProblem) -> None:
    restored = pickle.loads(pickle.dumps(error))  # noqa: S301 - round-trips an object this test created.
    assert type(restored) is type(error)
    assert repr(restored) == repr(error)
    assert getattr(restored, "scope", None) == getattr(error, "scope", None)
    if isinstance(error, ScopeRequiredProblem):
        assert getattr(restored, "scope", None) == "callRead"
