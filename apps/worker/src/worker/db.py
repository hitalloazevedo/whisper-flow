import select
from typing import Optional, TypedDict

import psycopg2
import psycopg2.extensions
import psycopg2.extras

NEW_JOB_CHANNEL = "new_job"

# Total attempts allowed before a job is permanently marked 'failed': the
# original attempt plus 2 retries. Mirrored by MAX_JOB_ATTEMPTS in
# apps/backend/src/jobs/retry-policy.ts — the two are not shared code, so
# keep them in sync by hand if this changes.
MAX_RETRIES = 3


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
                  AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= now())
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
    """Marks a job failed and schedules a retry, unless retries are exhausted.

    Backoff is simply the new retry count in minutes (1min, then 2min, for
    the two retries MAX_RETRIES=3 allows). Deliberately no backoff is used
    when a job is instead reclaimed from a stale 'processing' state by the
    backend's sweep (see JobsStaleSweepService) - the staleness window
    already served as the cooldown there.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            WITH updated AS (
                SELECT "retryCount" + 1 AS new_retry_count FROM jobs WHERE id = %(job_id)s
            )
            UPDATE jobs
            SET "retryCount" = updated.new_retry_count,
                status = CASE WHEN updated.new_retry_count >= %(max_retries)s
                              THEN 'failed'::jobs_status_enum
                              ELSE 'pending'::jobs_status_enum
                         END,
                "errorMessage" = %(error_message)s,
                "nextAttemptAt" = CASE WHEN updated.new_retry_count >= %(max_retries)s
                                       THEN NULL
                                       ELSE now() + (updated.new_retry_count || ' minutes')::interval
                                  END,
                "updatedAt" = now()
            FROM updated
            WHERE jobs.id = %(job_id)s
            """,
            {
                "job_id": job_id,
                "max_retries": MAX_RETRIES,
                "error_message": error_message[:2000],
            },
        )
