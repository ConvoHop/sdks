"""ConvoHop conformance driver for the Python SDK: NDJSON over stdio (spec/conformance/driver-protocol.md).

Run it with the SDK's environment, for example ``python/.venv/bin/python conformance/drivers/python/driver.py``.
``--api async`` drives ``AsyncConvoHop`` and ``AsyncConvoHopManagement`` instead of the synchronous clients, and
``--roles`` narrows the declared roles.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import traceback
from typing import Any, BinaryIO, Final, Literal, NoReturn, TypeAlias

from params import Args, ParamsError, handle, optional_text, record, text
from sdk import (
    FEATURES,
    OPERATIONS,
    PACKAGES,
    ROLES,
    Api,
    ClientSpec,
    MemoryStorage,
    Role,
    SdkClient,
    close,
    create_client,
    driver_error,
    is_role,
    operation,
    verify_webhook,
)

_VERSION: Final = "0.1.0"
_PROTOCOL_ROLES: Final = ("user", "backend", "management")
_MAX_SAFE_INTEGER: Final = 2**53 - 1

ProtocolCode: TypeAlias = Literal[
    "INVALID_REQUEST", "UNKNOWN_METHOD", "INVALID_PARAMS", "UNKNOWN_HANDLE", "UNSUPPORTED", "DRIVER_FAILURE"
]


class ProtocolError(Exception):
    """The request itself could not be carried out; the driver keeps running."""

    def __init__(self, code: ProtocolCode, message: str) -> None:
        super().__init__(message)
        self.code: ProtocolCode = code


class Driver:
    """The handles of one driver process. Requests are handled strictly in order, on one event loop."""

    def __init__(self, roles: tuple[Role, ...], api: Api) -> None:
        self._roles = roles
        self._api = api
        self._clients: dict[str, SdkClient] = {}
        self._storages: dict[str, MemoryStorage] = {}
        self._negotiated = False
        self.finished = False

    async def handle(self, line: bytes) -> bytes | None:
        """The encoded response to one request line, or None for a blank line."""
        try:
            source = line.decode("utf-8")
        except UnicodeDecodeError:
            return _encode_error(None, "INVALID_REQUEST", "Request is not valid UTF-8")
        if not source.strip():
            return None
        try:
            request = json.loads(source, parse_constant=_reject_constant)
        except (ValueError, RecursionError):
            return _encode_error(None, "INVALID_REQUEST", "Request is not valid JSON")
        request_id = _request_id(request.get("id")) if isinstance(request, dict) else None
        if request_id is None:
            return _encode_error(None, "INVALID_REQUEST", "id must be a positive integer")
        try:
            method, params = _method(request)
            return _encode({"id": request_id, "result": await self._dispatch(method, params)})
        except Exception as error:  # noqa: BLE001 - every failure is answered and the driver keeps running
            return _encode({"id": request_id, "error": _failure(error)})

    async def reset(self) -> None:
        """Closes every client and discards every recovery store, returning to the state right after hello."""
        clients = list(self._clients.values())
        self._clients.clear()
        self._storages.clear()
        failures: list[Exception] = []
        for client in clients:
            try:
                await close(client)
            except Exception as error:  # noqa: BLE001 - close the rest before reporting the first failure
                failures.append(error)
        if failures:
            raise failures[0]

    async def _dispatch(self, method: str, args: Args) -> object:
        if not self._negotiated and method != "hello":
            raise ProtocolError("INVALID_REQUEST", "hello must be the first request")
        match method:
            case "hello":
                return self._hello()
            case "client.create":
                return self._create(args)
            case "client.close":
                return await self._close(args)
            case "invoke":
                return await self._invoke(args)
            case "realtime.subscribe" | "realtime.collect" | "realtime.close":
                raise ProtocolError("UNSUPPORTED", "This driver does not declare the realtime feature")
            case "webhooks.verify":
                return verify_webhook(args)
            case "reset":
                await self.reset()
                return {}
            case "shutdown":
                self.finished = True
                await self.reset()
                return {}
            case _:
                raise ProtocolError("UNKNOWN_METHOD", f"Unknown method {method}")

    def _hello(self) -> dict[str, Any]:
        if self._negotiated:
            raise ProtocolError("INVALID_REQUEST", "hello was already negotiated")
        self._negotiated = True
        return {
            "driver": {
                "name": "convohop-python-async" if self._api == "async" else "convohop-python",
                "version": _VERSION,
                "language": "python",
                "packages": dict(PACKAGES),
            },
            "roles": {role: {"operations": list(OPERATIONS[role])} for role in self._roles},
            "features": list(FEATURES),
        }

    def _client(self, args: Args) -> tuple[str, SdkClient]:
        name = text(args, "client")
        found = self._clients.get(name)
        if found is None:
            raise ProtocolError("UNKNOWN_HANDLE", f"Unknown client handle {name}")
        return name, found

    def _create(self, args: Args) -> dict[str, Any]:
        name = handle(args, "client")
        if name in self._clients:
            raise ParamsError(f"Client handle {name} already exists")
        role = text(args, "role")
        if role not in _PROTOCOL_ROLES:
            raise ParamsError(f"role must be one of {', '.join(_PROTOCOL_ROLES)}")
        if not is_role(role) or role not in self._roles:
            raise ProtocolError("UNSUPPORTED", f"This driver does not declare the {role} role")
        storage_name = None if "storage" not in args else handle(args, "storage")
        storage = None if storage_name is None else self._storages.get(storage_name)
        if storage_name is not None and storage is None:
            storage = MemoryStorage()
        spec = ClientSpec(
            role=role,
            base_url=text(args, "baseUrl"),
            credential=text(args, "credential"),
            project_id=optional_text(args, "projectId"),
            incarnation=optional_text(args, "incarnation"),
            actor_id=optional_text(args, "actorId"),
            storage=storage,
        )
        # Only user clients take a principal; a malformed one is still a malformed request.
        optional_text(args, "principalId")
        self._clients[name] = create_client(spec, self._api)
        if storage_name is not None and storage is not None:
            self._storages[storage_name] = storage
        return {}

    async def _close(self, args: Args) -> dict[str, Any]:
        name, client = self._client(args)
        del self._clients[name]
        await close(client)
        return {}

    async def _invoke(self, args: Args) -> dict[str, Any]:
        _, target = self._client(args)
        name = text(args, "operation")
        payload = {} if "args" not in args else record(args["args"], "args")
        pending = operation(target, name, payload)
        if pending is None:
            raise ProtocolError("UNSUPPORTED", f"The {target.role} role does not implement {name}")
        try:
            value = await pending
        except (ParamsError, ProtocolError):
            raise
        except Exception as error:  # noqa: BLE001 - an SDK failure is a normal result (driver-protocol.md)
            return {"ok": False, "error": driver_error(error)}
        return {"ok": True, "value": value}


def _reject_constant(name: str) -> NoReturn:
    raise ValueError(f"{name} is not JSON")


def _request_id(value: object) -> int | None:
    # JSON has one number type, so an integral 7.0 is the id 7, as for the reference driver.
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    if type(value) is int and 1 <= value <= _MAX_SAFE_INTEGER:
        return value
    return None


def _method(request: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    method = request.get("method")
    params = request.get("params")
    if not isinstance(method, str):
        raise ProtocolError("INVALID_REQUEST", "method must be a string")
    if params is None:
        return method, {}
    if not isinstance(params, dict):
        raise ProtocolError("INVALID_REQUEST", "params must be an object")
    return method, params


def _failure(error: Exception) -> dict[str, str]:
    if isinstance(error, ProtocolError):
        return {"code": error.code, "message": str(error)}
    if isinstance(error, ParamsError):
        return {"code": "INVALID_PARAMS", "message": str(error)}
    traceback.print_exception(error, file=sys.stderr)
    return {"code": "DRIVER_FAILURE", "message": str(error) or type(error).__name__}


def _encode(message: dict[str, Any]) -> bytes:
    return (json.dumps(message, ensure_ascii=True, allow_nan=False, separators=(",", ":")) + "\n").encode("ascii")


def _encode_error(request_id: int | None, code: ProtocolCode, message: str) -> bytes:
    return _encode({"id": request_id, "error": {"code": code, "message": message}})


def _write(output: BinaryIO, line: bytes) -> bool:
    """Writes one response; False once the runner has closed the pipe."""
    try:
        output.write(line)
        output.flush()
    except BrokenPipeError:
        # Point stdout at /dev/null so that the interpreter's final flush doesn't fail on the closed pipe too.
        devnull = os.open(os.devnull, os.O_WRONLY)
        os.dup2(devnull, output.fileno())
        os.close(devnull)
        return False
    return True


def _options(argv: list[str] | None = None) -> tuple[tuple[Role, ...], Api]:
    parser = argparse.ArgumentParser(description="ConvoHop conformance driver for the Python SDK", allow_abbrev=False)
    parser.add_argument("--roles", help=f"comma-separated subset of {', '.join(ROLES)} to declare (default: all)")
    parser.add_argument("--api", choices=("sync", "async"), default="sync", help="client API to drive")
    options = parser.parse_args(argv)
    roles = ROLES
    if options.roles is not None:
        requested = [role.strip() for role in options.roles.split(",")]
        if not all(is_role(role) for role in requested):
            parser.error(f"--roles must be a comma-separated subset of {', '.join(ROLES)}")
        roles = tuple(role for role in ROLES if role in requested)
    api: Api = "async" if options.api == "async" else "sync"
    return roles, api


def main(argv: list[str] | None = None) -> int:
    roles, api = _options(argv)
    output = sys.stdout.buffer
    # Only responses may reach stdout, so anything else that prints goes to stderr.
    sys.stdout = sys.stderr
    driver = Driver(roles, api)
    # One loop for the process: an asynchronous client stays bound to the loop it first ran on.
    with asyncio.Runner() as runner:
        for line in iter(sys.stdin.buffer.readline, b""):
            response = runner.run(driver.handle(line))
            if response is not None and not _write(output, response):
                return 0
            if driver.finished:
                return 0
        runner.run(driver.reset())
    return 0


if __name__ == "__main__":
    sys.exit(main())
