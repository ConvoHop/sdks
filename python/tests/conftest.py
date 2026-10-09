from __future__ import annotations

import pytest


@pytest.fixture
def anyio_backend() -> str:
    """The async clients support asyncio."""
    return "asyncio"
