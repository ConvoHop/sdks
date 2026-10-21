"""Canonical JSON, strict response parsing and request payload normalization."""

from __future__ import annotations

import json
import math
from collections.abc import Mapping
from typing import Any, NoReturn

MAX_SAFE_INTEGER = 2**53 - 1
_MAX_DEPTH = 256


def canonical(value: object) -> str:
    """Serializes JSON with sorted keys and no whitespace, byte-for-byte like the TypeScript SDK.

    Keys sort by UTF-16 code units and numbers format like JavaScript. Raises ``TypeError`` for values JSON cannot
    carry exactly: non-string keys, lone surrogates, non-finite or unsafe numbers and unsupported types.
    """
    parts: list[str] = []
    _write(value, parts, 0)
    return "".join(parts)


def _write(value: object, out: list[str], depth: int) -> None:
    if depth > _MAX_DEPTH:
        raise TypeError("JSON payload exceeds its depth bound")
    if value is None:
        out.append("null")
    elif value is True:
        out.append("true")
    elif value is False:
        out.append("false")
    elif isinstance(value, str):
        out.append(_string(value))
    elif isinstance(value, int):
        if abs(value) > MAX_SAFE_INTEGER:
            raise TypeError("Unsafe protocol number")
        out.append(str(int(value)))
    elif isinstance(value, float):
        out.append(_number(value))
    elif isinstance(value, Mapping):
        keys = list(value.keys())
        for key in keys:
            if not isinstance(key, str):
                raise TypeError("JSON object keys must be strings")
            _check_unicode(key)
        out.append("{")
        for index, key in enumerate(sorted(keys, key=_utf16)):
            if index:
                out.append(",")
            out.append(_string(key))
            out.append(":")
            _write(value[key], out, depth + 1)
        out.append("}")
    elif isinstance(value, list | tuple):
        out.append("[")
        for index, item in enumerate(value):
            if index:
                out.append(",")
            _write(item, out, depth + 1)
        out.append("]")
    else:
        raise TypeError(f"JSON payload cannot contain {type(value).__name__} values")


def _utf16(key: str) -> bytes:
    return key.encode("utf-16-be")


def _check_unicode(text: str) -> None:
    try:
        text.encode("utf-8")
    except UnicodeEncodeError:
        raise TypeError("JSON strings must be well-formed Unicode") from None


def _string(text: str) -> str:
    _check_unicode(text)
    return json.dumps(text, ensure_ascii=False)


def _number(value: float) -> str:
    """Formats a finite float like JavaScript's ``Number.prototype.toString``."""
    if not math.isfinite(value) or abs(value) > MAX_SAFE_INTEGER:
        raise TypeError("Unsafe protocol number")
    if value == 0:
        return "0"
    if value.is_integer():
        return str(int(value))
    sign = "-" if value < 0 else ""
    mantissa, _, exponent = repr(abs(value)).partition("e")
    whole, _, fraction = mantissa.partition(".")
    combined = whole + fraction
    digits = combined.lstrip("0")
    point = len(whole) + (int(exponent) if exponent else 0) - (len(combined) - len(digits))
    digits = digits.rstrip("0")
    count = len(digits)
    if count <= point <= 21:
        text = digits + "0" * (point - count)
    elif 0 < point <= 21:
        text = digits[:point] + "." + digits[point:]
    elif -6 < point <= 0:
        text = "0." + "0" * -point + digits
    else:
        power = point - 1
        text = (
            digits[0] + ("." + digits[1:] if count > 1 else "") + "e" + ("+" if power >= 0 else "-") + str(abs(power))
        )
    return sign + text


def _reject_constant(name: str) -> NoReturn:
    raise ValueError(f"Unsupported JSON constant {name}")


def _parse_float(text: str) -> int | float:
    value = _parse_number(text)
    if not math.isfinite(value):
        raise ValueError("Non-finite JSON number")
    return value


def _parse_number(text: str) -> int | float:
    value = float(text)
    # JavaScript has one number type; integral values compare and serialize as integers there.
    return int(value) if value.is_integer() else value


def parse(text: str, *, finite: bool = True) -> Any:
    """Parses JSON, rejecting ``NaN`` and ``Infinity``, which JSON doesn't have, and nesting deeper than the
    interpreter's recursion limit. With ``finite``, numbers that overflow to infinity are rejected too; otherwise they
    parse as infinities, like ``JSON.parse``."""
    try:
        return json.loads(text, parse_constant=_reject_constant, parse_float=_parse_float if finite else _parse_number)
    except RecursionError:
        raise ValueError("JSON nesting is too deep") from None


def normalize(value: object, depth: int = 0) -> Any:
    """Deep-copies a request payload to plain JSON types: dicts with string keys, lists, strings, numbers and None.

    Raises ``TypeError`` for anything canonical JSON cannot carry exactly.
    """
    if depth > _MAX_DEPTH:
        raise TypeError("JSON payload exceeds its depth bound")
    if value is None or isinstance(value, bool):
        return value
    if isinstance(value, str):
        _check_unicode(value)
        return str(value)
    if isinstance(value, int):
        if abs(value) > MAX_SAFE_INTEGER:
            raise TypeError("Unsafe protocol number")
        return int(value)
    if isinstance(value, float):
        if not math.isfinite(value) or abs(value) > MAX_SAFE_INTEGER:
            raise TypeError("Unsafe protocol number")
        return int(value) if value.is_integer() else float(value)
    if isinstance(value, Mapping):
        copy: dict[str, Any] = {}
        for key, item in value.items():
            if not isinstance(key, str):
                raise TypeError("JSON object keys must be strings")
            _check_unicode(key)
            copy[str(key)] = normalize(item, depth + 1)
        return copy
    if isinstance(value, list | tuple):
        return [normalize(item, depth + 1) for item in value]
    raise TypeError(f"JSON payload cannot contain {type(value).__name__} values")


def compact(value: object) -> str:
    """Serializes already-normalized JSON compactly, like ``JSON.stringify`` without sorting."""
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
