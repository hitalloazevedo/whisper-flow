import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HEALTH_PATH = "/health"


class HealthState:
    """Tracks whether the worker has finished starting up.

    Nothing else lives on the HTTP surface — this is a liveness/readiness
    check, not a general-purpose API.
    """

    def __init__(self) -> None:
        self._ready = False
        self._lock = threading.Lock()

    def set_ready(self, ready: bool) -> None:
        with self._lock:
            self._ready = ready

    def is_ready(self) -> bool:
        with self._lock:
            return self._ready


def _make_handler(health_state: HealthState):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802 - required BaseHTTPRequestHandler name
            if self.path != HEALTH_PATH:
                self.send_response(404)
                self.end_headers()
                return

            if health_state.is_ready():
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'{"status":"ok"}')
            else:
                self.send_response(503)
                self.end_headers()
                self.wfile.write(b'{"status":"starting"}')

        def log_message(self, format: str, *args) -> None:  # noqa: A002
            pass  # the worker already logs structured events; silence the default access log

    return Handler


def start_health_server(health_state: HealthState, port: int) -> ThreadingHTTPServer:
    server = ThreadingHTTPServer(("0.0.0.0", port), _make_handler(health_state))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server
