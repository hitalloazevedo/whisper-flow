import urllib.error
import urllib.request

import pytest

from worker.health import HealthState, start_health_server


@pytest.fixture
def health_server():
    state = HealthState()
    server = start_health_server(state, port=0)  # port=0 -> OS picks a free port
    port = server.server_address[1]
    yield state, port
    server.shutdown()


def get(port, path):
    try:
        with urllib.request.urlopen(f"http://localhost:{port}{path}", timeout=2) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()


def test_returns_503_before_ready(health_server):
    _state, port = health_server

    status, body = get(port, "/health")

    assert status == 503
    assert body == b'{"status":"starting"}'


def test_returns_200_once_ready(health_server):
    state, port = health_server
    state.set_ready(True)

    status, body = get(port, "/health")

    assert status == 200
    assert body == b'{"status":"ok"}'


def test_flips_back_to_not_ready(health_server):
    state, port = health_server
    state.set_ready(True)
    state.set_ready(False)

    status, _body = get(port, "/health")

    assert status == 503


def test_returns_404_for_any_other_path(health_server):
    state, port = health_server
    state.set_ready(True)

    status, _body = get(port, "/")

    assert status == 404
