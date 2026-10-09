"""Validation of responses and requests against the generated catalogs."""

from __future__ import annotations

import re
from collections.abc import Mapping
from functools import cache
from typing import Any

from ._generated.operations import ENUMS, INPUTS, OBJECTS, SCALARS, ScalarSpec
from ._json import MAX_SAFE_INTEGER, canonical

MISSING: Any = object()
_MAX_OUTPUT_DEPTH = 16
_MAX_LIST = 100


@cache
def _pattern(source: str) -> re.Pattern[str]:
    # Catalog patterns are anchored ECMAScript patterns; fullmatch keeps a trailing newline from matching "$".
    return re.compile(source.removeprefix("^").removesuffix("$"))


def validate_output(value: Any, type_name: str, depth: int = 0) -> None:
    """Checks a response value against a GraphQL output type. Raises ``TypeError`` when it does not match."""
    if depth > _MAX_OUTPUT_DEPTH:
        raise TypeError("GraphQL response exceeds its depth bound")
    required = type_name.endswith("!")
    if required:
        type_name = type_name[:-1]
    if value is MISSING:
        raise TypeError(f"Missing GraphQL response field: {type_name}")
    if value is None:
        if required:
            raise TypeError(f"Missing GraphQL response field: {type_name}")
        return
    if type_name.startswith("["):
        if not isinstance(value, list) or len(value) > _MAX_LIST:
            raise TypeError("Invalid bounded GraphQL list")
        for item in value:
            validate_output(item, type_name[1:-1], depth + 1)
        return
    fields = OBJECTS.get(type_name)
    if fields is not None:
        if not isinstance(value, dict):
            raise TypeError("Expected a GraphQL protocol object")
        if type_name == "RetainedResult" and sum(item is not None for item in value.values()) != 1:
            raise TypeError("Retained receipt requires exactly one typed result")
        for field, child in fields.items():
            validate_output(value.get(field, MISSING), child, depth + 1)
        return
    values = ENUMS.get(type_name)
    if values is not None:
        if not isinstance(value, str) or value not in values:
            raise TypeError(f"Unknown {type_name}")
        return
    scalar = SCALARS.get(type_name)
    if scalar is None:
        raise TypeError(f"Unknown generated output type: {type_name}")
    _scalar(value, scalar, type_name, inbound=True)


def _scalar(value: Any, spec: ScalarSpec, type_name: str, *, inbound: bool) -> None:
    kind = spec.representation
    if kind == "object":
        if not isinstance(value, dict):
            raise TypeError(f"Expected a GraphQL {type_name} object")
        if inbound:
            return
        if spec.max_canonical_json_bytes is not None and (
            len(canonical(value).encode("utf-8")) > spec.max_canonical_json_bytes
        ):
            raise TypeError(f"{type_name} exceeds {spec.max_canonical_json_bytes} canonical JSON bytes")
        for name in spec.required_string_properties:
            if not isinstance(value.get(name), str):
                raise TypeError(f"{type_name} requires a string {name}")
    elif kind == "boolean":
        if not isinstance(value, bool):
            raise TypeError("Expected GraphQL boolean")
    elif kind == "integer":
        if not isinstance(value, int) or isinstance(value, bool) or abs(value) > MAX_SAFE_INTEGER:
            raise TypeError("Expected safe GraphQL integer")
        _range(value, spec, type_name, inbound=inbound)
    elif kind == "number":
        if not isinstance(value, int | float) or isinstance(value, bool) or value != value:
            raise TypeError("Expected GraphQL number")
        _range(value, spec, type_name, inbound=inbound)
    else:
        if not isinstance(value, str):
            raise TypeError(f"Expected GraphQL {type_name} string")
        if spec.pattern is not None and _pattern(spec.pattern).fullmatch(value) is None:
            raise TypeError(_scalar_message(type_name))
        if value in spec.disallowed:
            raise TypeError(_scalar_message(type_name))
        if spec.maximum_decimal is not None and _exceeds(value, spec.maximum_decimal):
            raise TypeError(_scalar_message(type_name))


def _exceeds(value: str, maximum: str) -> bool:
    # Both are canonical decimals here; comparing digits avoids int() on unbounded strings.
    return len(value) > len(maximum) or (len(value) == len(maximum) and value > maximum)


def _scalar_message(type_name: str) -> str:
    if type_name == "UUID":
        return "Expected a canonical UUID"
    if type_name == "Decimal":
        return "Invalid GraphQL decimal"
    return f"Invalid GraphQL {type_name}"


def _range(value: float, spec: ScalarSpec, type_name: str, *, inbound: bool) -> None:
    if inbound:
        return
    if (spec.minimum is not None and value < spec.minimum) or (spec.maximum is not None and value > spec.maximum):
        raise TypeError(f"{type_name} is out of range")


def validate_input(input_type: str, value: Mapping[str, Any], depth: int = 0) -> None:
    """Checks a normalized request input against its GraphQL input type. Raises ``TypeError`` when it does not."""
    _input_object(input_type, value, depth)


def _input_object(input_type: str, value: Any, depth: int) -> None:
    if depth > _MAX_OUTPUT_DEPTH:
        raise TypeError("GraphQL input exceeds its depth bound")
    fields = INPUTS[input_type]
    if not isinstance(value, dict):
        raise TypeError(f"Expected a {input_type} object")
    for name in value:
        if name not in fields:
            raise TypeError("Unknown GraphQL input field")
    for name, (field_type, has_default) in fields.items():
        item = value.get(name, MISSING)
        if item is MISSING:
            if field_type.endswith("!") and not has_default:
                raise TypeError(f"Missing required GraphQL input field: {name}")
            continue
        if item is None:
            if field_type.endswith("!"):
                raise TypeError(f"Missing required GraphQL input field: {name}")
            continue
        _input_value(item, field_type, depth + 1, name)


def _input_value(value: Any, type_name: str, depth: int, name: str) -> None:
    type_name = type_name.removesuffix("!")
    if value is None:
        raise TypeError(f"Missing required GraphQL input field: {name}")
    if type_name.startswith("["):
        if not isinstance(value, list):
            raise TypeError(f"Expected a GraphQL list for {name}")
        inner = type_name[1:-1]
        for item in value:
            if item is None:
                if inner.endswith("!"):
                    raise TypeError(f"Missing required GraphQL list item in {name}")
                continue
            _input_value(item, inner, depth + 1, name)
        return
    if type_name in INPUTS:
        _input_object(type_name, value, depth)
        return
    values = ENUMS.get(type_name)
    if values is not None:
        if not isinstance(value, str) or value not in values:
            raise TypeError(f"Unknown {type_name} for {name}")
        return
    scalar = SCALARS.get(type_name)
    if scalar is None:
        raise TypeError(f"Unknown generated input type: {type_name}")
    try:
        _scalar(value, scalar, type_name, inbound=False)
    except TypeError as error:
        raise TypeError(f"{error} ({name})") from None
