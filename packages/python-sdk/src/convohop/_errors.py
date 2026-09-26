from __future__ import annotations

from typing import Optional


class CommunicationsError(Exception):
    """Base class for service, transport, and protocol failures."""


class APIError(CommunicationsError):
    """An error returned by the HTTP API or a realtime server frame."""

    def __init__(self, status_code: Optional[int], code: str, message: str) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message
        location = f"HTTP {status_code}" if status_code is not None else "realtime"
        super().__init__(f"{location} {code}: {message}")


class TransportError(CommunicationsError):
    """A network or WebSocket connection failure."""


class RequestTimeout(TransportError):
    """A request or WebSocket handshake exceeded its timeout."""


class ProtocolError(CommunicationsError):
    """A service response did not match the supported API contract."""

    def __init__(self, message: str, status_code: Optional[int] = None) -> None:
        self.status_code = status_code
        super().__init__(message)


class ReplayError(ProtocolError):
    """Durable replay could not restore an unbroken event sequence."""


def graphql_error(errors: object, status: Optional[int]) -> APIError:
    """Preserve typed GraphQL errors, including those returned with HTTP 200."""
    if not isinstance(errors, list) or not errors:
        raise ProtocolError("Invalid response: GraphQL errors must be a nonempty list", status)
    messages = []
    for error in errors:
        if not isinstance(error, dict) or not isinstance(error.get("message"), str):
            raise ProtocolError("Invalid response: GraphQL error has no message", status)
        messages.append(error["message"])
    extensions = errors[0].get("extensions")
    code = extensions.get("code") if isinstance(extensions, dict) else None
    if not isinstance(code, str) or not code:
        code = "GRAPHQL_ERROR"
    return APIError(status, code, "; ".join(messages))
