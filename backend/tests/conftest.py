import pytest

from app.data import load_snapshot
from app.forecasts import build_index


@pytest.fixture(scope="session")
def snap():
    return load_snapshot()


@pytest.fixture(scope="session")
def index(snap):
    return build_index(snap.forecasts)
