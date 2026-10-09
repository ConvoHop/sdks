"""Starts the conformance mock, a local stand-in for the ConvoHop API, as a Node.js process."""

import json
import shutil
import subprocess
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import httpx

REPO_ROOT = Path(__file__).resolve().parents[5]

FaultAction = Literal["dropBeforeCommit", "dropAfterCommit"]


@dataclass(frozen=True)
class MockTarget:
    communication_url: str
    project_id: str
    incarnation: str
    backend_key: str
    control: str


@contextmanager
def start_mock() -> Iterator[MockTarget]:
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("The tests start the conformance mock with Node.js, which isn't on PATH.")
    # The mock prints its descriptor as one JSON line. It imports graphql, so run npm ci at the repository root.
    with subprocess.Popen(
        [node, str(REPO_ROOT / "conformance" / "mock" / "cli.mjs")], stdout=subprocess.PIPE
    ) as process:
        try:
            assert process.stdout is not None
            line = process.stdout.readline()
            if not line:
                raise RuntimeError("The conformance mock exited before it started. Did you run npm ci at the root?")
            descriptor = json.loads(line)
            yield MockTarget(
                communication_url=descriptor["communicationUrl"],
                project_id=descriptor["projectId"],
                incarnation=descriptor["incarnation"],
                backend_key=descriptor["credentials"]["backend"],
                control=descriptor["control"],
            )
        finally:
            process.terminate()


# Makes the mock fail the next request to a GraphQL field: it closes the socket before or after committing.
def inject_fault(target: MockTarget, field: str, action: FaultAction) -> None:
    response = httpx.post(f"{target.control}/fault", json={"field": field, "action": action})
    response.raise_for_status()


# Whether each request the mock received for a field and request ID was dropped, oldest first.
def attempts(target: MockTarget, field: str, request_id: str) -> list[bool]:
    response = httpx.get(f"{target.control}/log")
    response.raise_for_status()
    return [
        entry["dropped"]
        for entry in response.json()["entries"]
        if entry["kind"] == "request" and entry["field"] == field and entry["requestId"] == request_id
    ]
