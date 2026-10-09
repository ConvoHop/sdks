"""Helpers shared by the tests."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
from pathlib import Path
from typing import Any

REPOSITORY = Path(__file__).resolve().parents[2]
_LONE_SURROGATE = re.compile("[\ud800-\udfff]")


def spec(path: str) -> Any:
    """A language-neutral fixture from the repository's ``spec/`` directory."""
    return json.loads((REPOSITORY / "spec" / path).read_text("utf-8"))


def dumps(value: object) -> str:
    """Serializes like ``JSON.stringify``: compact, non-ASCII as is and lone surrogates escaped."""
    text = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    return _LONE_SURROGATE.sub(lambda match: f"\\u{ord(match[0]):04x}", text)


def new_secret(size: int = 32) -> str:
    """A random Standard Webhooks secret of ``size`` bytes."""
    return "whsec_" + base64.b64encode(os.urandom(size)).decode()


def sign(secret: str, webhook_id: str, timestamp: int | str, body: str | bytes) -> str:
    """Signs independently of the SDK: HMAC-SHA256 over ``{id}.{timestamp}.{body}`` bytes."""
    key = base64.b64decode(secret.removeprefix("whsec_"))
    signed = f"{webhook_id}.{timestamp}.".encode() + (body.encode() if isinstance(body, str) else body)
    return "v1," + base64.b64encode(hmac.new(key, signed, hashlib.sha256).digest()).decode()
