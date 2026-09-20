import os
import tempfile

from . import db, storage
from .logging_utils import get_logger, log_event
from .trace_context import set_trace_id
import logging

logger = get_logger("JobProcessor")

TRANSCRIPT_PREFIX = "transcripts"


def _transcript_key(job: db.JobRow) -> str:
    return f"{TRANSCRIPT_PREFIX}/{job['createdBy']}/{job['id']}.txt"


def process_job(conn, s3_client, transcriber, bucket: str, job: db.JobRow) -> None:
    job_id = job["id"]
    set_trace_id(job.get("traceId"))
    _, extension = os.path.splitext(job["inputPath"])
    temp_file = tempfile.NamedTemporaryFile(suffix=extension, delete=False)
    temp_file.close()

    try:
        log_event(logger, logging.INFO, "job_started", jobId=job_id)
        storage.download_to_file(s3_client, bucket, job["inputPath"], temp_file.name)

        transcript = transcriber.transcribe(temp_file.name)

        output_key = _transcript_key(job)
        storage.upload_text(s3_client, bucket, output_key, transcript)

        db.mark_completed(conn, job_id, output_key)
        log_event(logger, logging.INFO, "job_completed", jobId=job_id, outputPath=output_key)
    except Exception as error:  # noqa: BLE001 - a job failure must never crash the worker loop
        conn.rollback()
        db.mark_failed(conn, job_id, str(error))
        log_event(logger, logging.ERROR, "job_failed", jobId=job_id, error=str(error))
    finally:
        os.unlink(temp_file.name)
