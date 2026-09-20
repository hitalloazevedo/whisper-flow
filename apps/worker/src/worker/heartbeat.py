import logging
import os
import socket
import threading
import time
from typing import Optional

import psycopg2

from .logging_utils import get_logger, log_event

logger = get_logger("Heartbeat")


class WorkerState:
    """Tracks this process's current status for the heartbeat thread to report.

    Updated by the main loop as it claims/finishes jobs; read on the
    heartbeat thread's own cadence, independent of how long a job takes.
    """

    def __init__(self) -> None:
        self._status = "idle"
        self._current_job_id: Optional[str] = None
        self._lock = threading.Lock()

    def set_processing(self, job_id: str) -> None:
        with self._lock:
            self._status = "processing"
            self._current_job_id = job_id

    def set_idle(self) -> None:
        with self._lock:
            self._status = "idle"
            self._current_job_id = None

    def snapshot(self) -> tuple[str, Optional[str]]:
        with self._lock:
            return self._status, self._current_job_id


def upsert_heartbeat(
    conn: psycopg2.extensions.connection, hostname: str, pid: int, state: WorkerState
) -> None:
    status, current_job_id = state.snapshot()
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO worker_heartbeats (hostname, pid, status, "currentJobId", "lastSeenAt")
            VALUES (%(hostname)s, %(pid)s, %(status)s, %(current_job_id)s, now())
            ON CONFLICT (hostname, pid) DO UPDATE
            SET status = EXCLUDED.status,
                "currentJobId" = EXCLUDED."currentJobId",
                "lastSeenAt" = now()
            """,
            {
                "hostname": hostname,
                "pid": pid,
                "status": status,
                "current_job_id": current_job_id,
            },
        )


def start_heartbeat_loop(
    database_url: str, state: WorkerState, interval_seconds: float
) -> threading.Thread:
    hostname = socket.gethostname()
    pid = os.getpid()

    def _connect() -> psycopg2.extensions.connection:
        conn = psycopg2.connect(database_url)
        conn.autocommit = True
        return conn

    def _loop() -> None:
        conn = _connect()
        while True:
            try:
                upsert_heartbeat(conn, hostname, pid, state)
            except psycopg2.Error as error:
                log_event(logger, logging.WARNING, "heartbeat_write_failed", error=str(error))
                conn.close()
                conn = _connect()
            time.sleep(interval_seconds)

    thread = threading.Thread(target=_loop, daemon=True)
    thread.start()
    return thread
