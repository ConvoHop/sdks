"""Type-checks the snippets and these tests with mypy's strict mode, for the Python version that runs the tests."""

import os
from pathlib import Path

from mypy import api

EXAMPLES = Path(__file__).resolve().parents[1]


def test_the_snippets_and_tests_type_check() -> None:
    stdout, stderr, status = api.run(["--config-file", str(EXAMPLES / "pyproject.toml"), "--cache-dir", os.devnull])
    assert status == 0, stdout + stderr
