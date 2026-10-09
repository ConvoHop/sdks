"""Protocol value parsers shared by the clients, webhooks and push builders."""

from __future__ import annotations

import ipaddress
import re
from typing import Any
from urllib.parse import urlsplit

NIL_UUID = "00000000-0000-0000-0000-000000000000"
_UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
_COUNTER = re.compile(r"0|[1-9][0-9]*")
_TIMESTAMP = re.compile(r"([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})\.[0-9]{3}Z")
_RETRY_AFTER = re.compile(r"[0-9]{1,10}")
_HOST = re.compile(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.?")
_MAX_COUNTER = 9223372036854775807
_MAX_COUNTER_DIGITS = len(str(_MAX_COUNTER))
_LOOPBACK = ("127.0.0.1", "localhost", "::1")


def is_id(value: object) -> bool:
    return isinstance(value, str) and _UUID.fullmatch(value) is not None and value != NIL_UUID


def parse_id(value: object) -> str:
    if not isinstance(value, str) or not is_id(value):
        raise TypeError("Expected a canonical nonzero UUID")
    return value


def parse_counter(value: object) -> str:
    if (
        not isinstance(value, str)
        or _COUNTER.fullmatch(value) is None
        or len(value) > _MAX_COUNTER_DIGITS
        or int(value) > _MAX_COUNTER
    ):
        raise TypeError("Expected a canonical decimal counter")
    return value


def is_leap(year: int) -> bool:
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)


def days_in_month(year: int, month: int) -> int:
    if month == 2:
        return 29 if is_leap(year) else 28
    return 30 if month in (4, 6, 9, 11) else 31


def parse_timestamp(value: object) -> str:
    """Accepts only ``YYYY-MM-DDTHH:MM:SS.mmmZ`` naming a real UTC instant."""
    if not isinstance(value, str):
        raise TypeError("Expected a UTC millisecond timestamp")
    match = _TIMESTAMP.fullmatch(value)
    if match is None:
        raise TypeError("Expected a UTC millisecond timestamp")
    year, month, day, hour, minute, second = (int(part) for part in match.groups())
    if not (
        1 <= month <= 12 and 1 <= day <= days_in_month(year, month) and hour <= 23 and minute <= 59 and second <= 59
    ):
        raise TypeError("Expected a UTC millisecond timestamp")
    return value


def retry_delay(value: object) -> int | None:
    """Whole-second retry delay from ``extensions.retryAfter`` or an HTTP ``Retry-After`` delta; else ``None``."""
    if isinstance(value, str) and _RETRY_AFTER.fullmatch(value):
        return int(value)
    if isinstance(value, int) and not isinstance(value, bool) and 0 <= value <= 2**53 - 1:
        return value
    if isinstance(value, float) and value.is_integer() and 0 <= value <= 2**53 - 1:
        return int(value)
    return None


def origin(value: Any) -> str:
    """Normalizes an HTTPS origin, or an explicit loopback HTTP origin for local development."""
    failure = TypeError("Use an HTTPS origin, or explicit loopback HTTP for local development")
    if not isinstance(value, str) or not value.isascii() or any(ch.isspace() or ch == "\\" for ch in value):
        raise failure
    try:
        parts = urlsplit(value)
        port = parts.port
    except ValueError:
        raise failure from None
    scheme = parts.scheme.lower()
    host = parts.hostname
    if (
        host is None
        or parts.username is not None
        or parts.password is not None
        or parts.query
        or parts.fragment
        or "?" in value
        or "#" in value
        or parts.path not in ("", "/")
        or "@" in parts.netloc
    ):
        raise failure
    bracketed = parts.netloc.startswith("[")
    if bracketed:
        try:
            host = ipaddress.IPv6Address(host).compressed
        except ValueError:
            raise failure from None
    elif _HOST.fullmatch(host) is None:
        raise failure
    if scheme != "https" and not (scheme == "http" and host in _LOOPBACK):
        raise failure
    authority = f"[{host}]" if bracketed else host
    if port is not None and port != (443 if scheme == "https" else 80):
        authority += f":{port}"
    return f"{scheme}://{authority}"
