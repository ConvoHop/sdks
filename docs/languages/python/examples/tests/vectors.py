"""spec/push-payload/vectors.json: notification events, builder options, and the requests each builder must return."""

import json
from pathlib import Path
from typing import Any, NotRequired, TypedDict

REPO_ROOT = Path(__file__).resolve().parents[5]


class Expected(TypedDict):
    request: Any
    bytes: int


class ExpectedRequests(TypedDict):
    apnsAlert: Expected | None
    apnsVoip: Expected | None
    fcm: Expected | None
    webPush: Expected | None


class VectorOptions(TypedDict):
    bundleId: str
    title: NotRequired[str]
    body: NotRequired[str]
    preview: NotRequired[bool]


class PushVector(TypedDict):
    id: str
    event: dict[str, Any]
    options: VectorOptions
    nowSeconds: int
    expected: ExpectedRequests


def push_vectors() -> list[PushVector]:
    document = json.loads((REPO_ROOT / "spec" / "push-payload" / "vectors.json").read_text(encoding="utf-8"))
    vectors: list[PushVector] = document["vectors"]
    return vectors
