"""Strict decoding of driver-protocol parameters. Failures are protocol errors (INVALID_PARAMS), never SDK results."""

from __future__ import annotations

import re
from collections.abc import Mapping
from typing import Any, TypeAlias

Args: TypeAlias = Mapping[str, Any]

_HANDLE = re.compile(r"[A-Za-z0-9._:-]{1,64}")


class ParamsError(Exception):
    """A parameter is missing, has the wrong type or cannot be converted to the SDK's types."""


def record(value: object, name: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ParamsError(f"{name} must be an object")
    return value


def text(args: Args, name: str) -> str:
    value = args.get(name)
    if not isinstance(value, str):
        raise ParamsError(f"{name} must be a string")
    return value


def optional_text(args: Args, name: str) -> str | None:
    return None if name not in args else text(args, name)


def integer(args: Args, name: str, minimum: int, maximum: int) -> int | None:
    if name not in args:
        return None
    value = args[name]
    # bool is an int subclass; JSON true is not an integer.
    if type(value) is not int or not minimum <= value <= maximum:
        raise ParamsError(f"{name} must be an integer in {minimum}..{maximum}")
    return value


def strings(args: Args, name: str) -> list[str]:
    value = args.get(name)
    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
        raise ParamsError(f"{name} must be an array of strings")
    return value


def entries(args: Args, name: str) -> list[dict[str, Any]]:
    value = args.get(name)
    if not isinstance(value, list):
        raise ParamsError(f"{name} must be an array")
    return [record(entry, f"{name}[{index}]") for index, entry in enumerate(value)]


def handle(args: Args, name: str) -> str:
    value = text(args, name)
    if not _HANDLE.fullmatch(value):
        raise ParamsError(f"{name} must match [A-Za-z0-9._:-]{{1,64}}")
    return value
