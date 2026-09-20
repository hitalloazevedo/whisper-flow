import select
from typing import Optional, TypedDict

import psycopg2
import psycopg2.extensions
import psycopg2.extras

NEW_JOB_CHANNEL = "new_job"


class JobRow(TypedDict):
    id: str
    createdBy: str
    inputPath: str
    originalFilename: str
    traceId: Optional[str]


def connect(database_url: str) -> psycopg2.extensions.connection:
    conn = psycopg2.connect(database_url)
    # LISTEN/NOTIFY delivers notifications between commands rather than mid
    # transaction, so autocommit keeps every statement (including LISTEN
    # itself) immediately visible instead of sitting inside an open one.
    conn.autocommit = True
    return conn


def listen_for_new_jobs(conn: psycopg2.extensions.connection) -> None:
    with conn.cursor() as cur:
        cur.execute(f"LISTEN {NEW_JOB_CHANNEL};")


def wait_for_notification(conn: psycopg2.extensions.connection, timeout_seconds: float) -> bool:
    """Blocks until a NOTIFY arrives on the channel or the timeout elapses.

    This is a latency shortcut on top of claim_next_job, not a replacement
    for polling: a trigger firing NOTIFY doesn't guarantee delivery (e.g. if
    this connection is busy processing another job), so the caller must
    still fall back to polling on timeout.
    """
    readable, _, _ = select.select([conn], [], [], timeout_seconds)
    if not readable:
        return False
    conn.poll()
    received = bool(conn.notifies)
    while conn.notifies:
        conn.notifies.pop()
    return received


def claim_next_job(conn: psycopg2.extensions.connection) -> Optional[JobRow]:
    """Atomically claims the oldest pending job.

    Uses SELECT ... FOR UPDATE SKIP LOCKED so multiple worker instances can
    poll the same table concurrently without ever claiming the same job.
    """
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            UPDATE jobs
            SET status = 'processing'::jobs_status_enum,
                "startedAt" = now(),
                "updatedAt" = now()
            WHERE id = (
                SELECT id FROM jobs
                WHERE status = 'pending'::jobs_status_enum
                ORDER BY "createdAt" ASC
                FOR UPDATE SKIP LOCKED
                LIMIT 1
            )
            RETURNING id, "createdBy", "inputPath", "originalFilename", "traceId"
            """
        )
        row = cur.fetchone()
        return dict(row) if row else None


def mark_completed(conn: psycopg2.extensions.connection, job_id: str, output_path: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE jobs
            SET status = 'completed'::jobs_status_enum,
                "outputPath" = %s,
                "completedAt" = now(),
                "updatedAt" = now()
            WHERE id = %s
            """,
            (output_path, job_id),
        )


def mark_failed(conn: psycopg2.extensions.connection, job_id: str, error_message: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE jobs
            SET status = 'failed'::jobs_status_enum,
                "errorMessage" = %s,
                "retryCount" = "retryCount" + 1,
                "updatedAt" = now()
            WHERE id = %s
            """,
            (error_message[:2000], job_id),
        )
