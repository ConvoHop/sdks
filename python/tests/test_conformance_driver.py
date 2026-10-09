"""The conformance driver's protocol handling (spec/conformance/driver-protocol.md).

The shared scenarios exercise the driver's SDK calls through ``npm run conformance``; these tests pin the protocol
errors, lifecycle and options that the scenarios don't reach. Each test runs the driver as the runner does: a separate
process exchanging NDJSON over stdio. No test reaches an authority.
"""

from __future__ import annotations

import json
import socket
import subprocess
import sys
from collections.abc import Iterator
from typing import Any

import pytest

import convohop

from .support import REPOSITORY, new_secret, sign, spec

DRIVER = REPOSITORY / "conformance" / "drivers" / "python" / "driver.py"
PROJECT = "0b9c5f4e-3f5a-4d0e-9c43-2f3f0f6b8a11"
INCARNATION = "5e0f2c1a-8d4b-4b7e-a9f6-1c2d3e4f5a6b"
CONVERSATION = "7a6b5c4d-3e2f-4a1b-8c9d-0e1f2a3b4c5d"
HELLO = {"id": 1, "method": "hello", "params": {"runner": {"name": "pytest", "version": "0"}}}
NOW = 1_767_225_600

Line = dict[str, Any] | str | bytes


def request(request_id: int, method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"id": request_id, "method": method, "params": {} if params is None else params}


def backend(handle: str = "backend", base_url: str = "http://127.0.0.1:9", **extra: Any) -> dict[str, Any]:
    """client.create parameters for a backend client; creating one makes no request."""
    return {
        "client": handle,
        "role": "backend",
        "baseUrl": base_url,
        "credential": "test-backend-key",
        "projectId": PROJECT,
        "incarnation": INCARNATION,
        **extra,
    }


def invoke(request_id: int, operation: str, args: object, client: str = "backend") -> dict[str, Any]:
    return request(request_id, "invoke", {"client": client, "operation": operation, "args": args})


def _encode(line: Line) -> bytes:
    if isinstance(line, bytes):
        return line + b"\n"
    return (line if isinstance(line, str) else json.dumps(line)).encode() + b"\n"


def drive(*lines: Line, options: tuple[str, ...] = ()) -> tuple[list[Any], int]:
    """Writes the request lines to a driver process and closes its stdin; returns its responses and exit status."""
    completed = subprocess.run(  # noqa: S603 - runs the driver under test with this interpreter
        [sys.executable, str(DRIVER), *options],
        input=b"".join(_encode(line) for line in lines),
        capture_output=True,
        timeout=60,
        check=False,
    )
    return [json.loads(line) for line in completed.stdout.splitlines()], completed.returncode


def errors(responses: list[Any]) -> list[tuple[int | None, str]]:
    """The id and code of every error response, in order."""
    return [(response["id"], response["error"]["code"]) for response in responses if "error" in response]


@pytest.fixture
def refused_url() -> Iterator[str]:
    """A loopback origin whose port is bound but not listening, so that connecting to it is refused."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as bound:
        bound.bind(("127.0.0.1", 0))
        yield f"http://127.0.0.1:{bound.getsockname()[1]}"


def test_hello_declares_the_catalog_operations_of_the_server_roles() -> None:
    responses, status = drive(HELLO, request(2, "shutdown"))
    assert status == 0
    assert responses[1] == {"id": 2, "result": {}}
    hello = responses[0]
    assert hello["id"] == 1
    declared = hello["result"].pop("roles")
    assert hello["result"] == {
        "driver": {
            "name": "convohop-python",
            "version": "0.1.0",
            "language": "python",
            "packages": {"convohop": convohop.__version__},
        },
        "features": ["recovery.storage", "retryAfter", "webhooks.verify"],
    }
    catalog = spec("conformance/operations.json")["operations"]
    assert {role: set(entry["operations"]) for role, entry in declared.items()} == {
        role: {name for name, operation in catalog.items() if role in operation["roles"]}
        for role in ("backend", "management")
    }


def test_hello_comes_first_and_only_once() -> None:
    responses, status = drive(request(1, "reset"), HELLO | {"id": 2}, request(3, "hello"), request(4, "reset"))
    assert status == 0
    assert errors(responses) == [(1, "INVALID_REQUEST"), (3, "INVALID_REQUEST")]
    assert responses[-1] == {"id": 4, "result": {}}


def test_answers_unparsable_requests_with_a_null_id_and_keeps_running() -> None:
    unparsable: list[Line] = [
        "not json",
        b'{"id":2,"method":"reset","params":{"text":"\xff"}}',
        '{"id":2,"method":"reset","params":{"number":NaN}}',
        "[2]",
        '{"method":"reset"}',
        '{"id":0,"method":"reset"}',
        '{"id":true,"method":"reset"}',
        '{"id":"2","method":"reset"}',
        '{"id":2.5,"method":"reset"}',
        '{"id":9007199254740992,"method":"reset"}',
    ]
    responses, status = drive(HELLO, *unparsable, request(3, "shutdown"))
    assert status == 0
    assert errors(responses) == [(None, "INVALID_REQUEST")] * len(unparsable)
    assert responses[-1] == {"id": 3, "result": {}}


def test_answers_malformed_requests_with_their_id() -> None:
    responses, _ = drive(
        HELLO,
        "",
        '{"id":2.0,"method":"reset","params":null}',
        '{"id":3,"method":7}',
        '{"id":4,"method":"reset","params":[]}',
        request(5, "nope"),
        request(6, "shutdown"),
    )
    assert responses[1:] == [
        {"id": 2, "result": {}},
        {"id": 3, "error": {"code": "INVALID_REQUEST", "message": "method must be a string"}},
        {"id": 4, "error": {"code": "INVALID_REQUEST", "message": "params must be an object"}},
        {"id": 5, "error": {"code": "UNKNOWN_METHOD", "message": "Unknown method nope"}},
        {"id": 6, "result": {}},
    ]


def test_client_create_validates_the_role_handle_and_options() -> None:
    responses, _ = drive(
        HELLO,
        request(2, "client.create", backend() | {"role": "user", "principalId": PROJECT}),
        request(3, "client.create", backend() | {"role": "admin"}),
        request(4, "client.create", backend("not a handle")),
        request(5, "client.create", backend(base_url="ftp://127.0.0.1")),
        request(6, "client.create", {key: value for key, value in backend().items() if key != "incarnation"}),
        request(7, "client.create", backend(principalId=7)),
        request(8, "client.create", backend(storage="")),
        request(9, "client.create", {"client": "admin", "role": "management", "baseUrl": "http://127.0.0.1:9"}),
        request(10, "client.create", backend()),
        request(11, "client.create", backend()),
        request(12, "shutdown"),
    )
    assert errors(responses) == [
        (2, "UNSUPPORTED"),
        (3, "INVALID_PARAMS"),
        (4, "INVALID_PARAMS"),
        (5, "INVALID_PARAMS"),
        (6, "INVALID_PARAMS"),
        (7, "INVALID_PARAMS"),
        (8, "INVALID_PARAMS"),
        (9, "INVALID_PARAMS"),
        (11, "INVALID_PARAMS"),
    ]
    assert responses[9] == {"id": 10, "result": {}}


def test_invoke_resolves_the_handle_operation_and_arguments() -> None:
    responses, _ = drive(
        HELLO,
        request(2, "client.create", backend()),
        invoke(3, "principals.create", {}, client="missing"),
        invoke(4, "events.list", {}),
        invoke(5, "backendKeys.issue", {}),
        invoke(6, "principals.create", {"externalUserId": 5}),
        invoke(7, "principals.create", None),
        invoke(8, "members.list", {"conversationId": CONVERSATION, "limit": 101}),
        invoke(9, "messages.delete", {"message": {"conversationId": CONVERSATION}}),
        request(10, "realtime.subscribe", {"client": "backend", "subscription": "s", "conversationId": CONVERSATION}),
        request(11, "client.close", {"client": "backend"}),
        request(12, "client.close", {"client": "backend"}),
        request(13, "shutdown"),
    )
    assert errors(responses) == [
        (3, "UNKNOWN_HANDLE"),
        (4, "UNSUPPORTED"),
        (5, "UNSUPPORTED"),
        (6, "INVALID_PARAMS"),
        (7, "INVALID_PARAMS"),
        (8, "INVALID_PARAMS"),
        (9, "INVALID_PARAMS"),
        (10, "UNSUPPORTED"),
        (12, "UNKNOWN_HANDLE"),
    ]


@pytest.mark.parametrize("api", ["sync", "async"])
def test_reports_sdk_failures_as_results(api: str, refused_url: str) -> None:
    responses, status = drive(
        HELLO,
        request(2, "client.create", backend(base_url=refused_url, storage="shared")),
        invoke(3, "principals.create", {"externalUserId": "user-1"}),
        request(4, "shutdown"),
        options=("--api", api),
    )
    assert status == 0
    assert responses[0]["result"]["driver"]["name"] == (
        "convohop-python-async" if api == "async" else "convohop-python"
    )
    assert responses[1:2] + responses[3:] == [{"id": 2, "result": {}}, {"id": 4, "result": {}}]
    result = responses[2]["result"]
    assert result["ok"] is False
    failure = result["error"]
    assert (failure["code"], failure["status"], failure["outcome"], failure["retryAfterMs"]) == (
        "TRANSPORT_UNKNOWN",
        None,
        "unknown",
        None,
    )
    assert isinstance(failure["requestId"], str)
    assert isinstance(failure["message"], str)


def test_webhooks_verify_projects_the_sdk_result() -> None:
    secret = new_secret()
    payload = '{"type":"conversation.updated"}'
    headers = {
        "webhook-id": "msg_1",
        "webhook-timestamp": str(NOW),
        "webhook-signature": sign(secret, "msg_1", NOW, payload),
    }
    verify = {"payload": payload, "headers": headers, "secrets": [secret], "nowSeconds": NOW, "toleranceSeconds": 300}
    responses, _ = drive(
        HELLO,
        request(2, "webhooks.verify", verify),
        request(3, "webhooks.verify", verify | {"nowSeconds": NOW + 301}),
        request(4, "webhooks.verify", verify | {"headers": {}}),
        request(5, "webhooks.verify", verify | {"secrets": []}),
        request(6, "webhooks.verify", verify | {"secrets": ["not-a-secret"]}),
        request(7, "webhooks.verify", verify | {"headers": headers | {"webhook-id": 1}}),
        request(8, "webhooks.verify", {key: value for key, value in verify.items() if key != "toleranceSeconds"}),
        request(9, "webhooks.verify", verify | {"nowSeconds": 8_640_000_000_000}),
        request(10, "shutdown"),
    )
    assert [response.get("result") for response in responses[1:4]] == [
        {"valid": True, "code": None},
        {"valid": False, "code": "WEBHOOK_TIMESTAMP_EXPIRED"},
        {"valid": False, "code": "WEBHOOK_HEADERS_MISSING"},
    ]
    assert errors(responses) == [(request_id, "INVALID_PARAMS") for request_id in range(5, 10)]


def test_roles_option_narrows_the_declaration() -> None:
    responses, status = drive(HELLO, request(2, "client.create", backend()), options=("--roles", "management"))
    assert status == 0
    assert list(responses[0]["result"]["roles"]) == ["management"]
    assert errors(responses) == [(2, "UNSUPPORTED")]


def test_rejects_unknown_roles_option() -> None:
    assert drive(HELLO, options=("--roles", "backend,user")) == ([], 2)


def test_exits_when_stdin_closes() -> None:
    responses, status = drive(HELLO, request(2, "client.create", backend()))
    assert (len(responses), status) == (2, 0)


def test_stops_reading_after_shutdown() -> None:
    responses, status = drive(HELLO, request(2, "shutdown"), request(3, "reset"))
    assert (responses[1:], status) == ([{"id": 2, "result": {}}], 0)
