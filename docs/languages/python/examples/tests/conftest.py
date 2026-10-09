from collections.abc import Iterator

import pytest

from conformance_mock import MockTarget, start_mock
from server import ServerConfig


@pytest.fixture(scope="session")
def mock_target() -> Iterator[MockTarget]:
    with start_mock() as target:
        yield target


@pytest.fixture
def config(mock_target: MockTarget) -> ServerConfig:
    return ServerConfig(
        base_url=mock_target.communication_url,
        project_id=mock_target.project_id,
        incarnation=mock_target.incarnation,
        backend_key=mock_target.backend_key,
    )
