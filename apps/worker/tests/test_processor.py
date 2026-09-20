import os
from unittest.mock import MagicMock, patch

from worker import processor

JOB = {
    "id": "job-1",
    "createdBy": "user-1",
    "inputPath": "uploads/user-1/recording.mp3",
    "originalFilename": "recording.mp3",
}


def make_deps():
    conn = MagicMock()
    s3_client = MagicMock()
    transcriber = MagicMock()
    return conn, s3_client, transcriber


@patch("worker.processor.db")
@patch("worker.processor.storage")
def test_successful_job_downloads_transcribes_uploads_and_marks_completed(
    storage_mock, db_mock
):
    conn, s3_client, transcriber = make_deps()
    transcriber.transcribe.return_value = "hello world"

    processor.process_job(conn, s3_client, transcriber, "test-bucket", JOB)

    downloaded_path = storage_mock.download_to_file.call_args.args[3]
    storage_mock.download_to_file.assert_called_once_with(
        s3_client, "test-bucket", JOB["inputPath"], downloaded_path
    )
    transcriber.transcribe.assert_called_once_with(downloaded_path)
    storage_mock.upload_text.assert_called_once_with(
        s3_client, "test-bucket", "transcripts/user-1/job-1.txt", "hello world"
    )
    db_mock.mark_completed.assert_called_once_with(conn, "job-1", "transcripts/user-1/job-1.txt")
    db_mock.mark_failed.assert_not_called()
    assert not os.path.exists(downloaded_path)


@patch("worker.processor.db")
@patch("worker.processor.storage")
def test_failed_transcription_rolls_back_and_marks_job_failed(storage_mock, db_mock):
    conn, s3_client, transcriber = make_deps()
    transcriber.transcribe.side_effect = RuntimeError("model exploded")

    processor.process_job(conn, s3_client, transcriber, "test-bucket", JOB)

    conn.rollback.assert_called_once()
    db_mock.mark_failed.assert_called_once_with(conn, "job-1", "model exploded")
    db_mock.mark_completed.assert_not_called()
    storage_mock.upload_text.assert_not_called()


@patch("worker.processor.db")
@patch("worker.processor.storage")
def test_download_failure_cleans_up_temp_file_and_marks_failed(storage_mock, db_mock):
    conn, s3_client, transcriber = make_deps()
    storage_mock.download_to_file.side_effect = RuntimeError("bucket unreachable")

    processor.process_job(conn, s3_client, transcriber, "test-bucket", JOB)

    downloaded_path = storage_mock.download_to_file.call_args.args[3]
    db_mock.mark_failed.assert_called_once_with(conn, "job-1", "bucket unreachable")
    transcriber.transcribe.assert_not_called()
    assert not os.path.exists(downloaded_path)


@patch("worker.processor.db")
@patch("worker.processor.storage")
def test_temp_file_uses_the_input_path_extension(storage_mock, db_mock):
    conn, s3_client, transcriber = make_deps()
    job = {**JOB, "inputPath": "uploads/user-1/recording.wav"}

    processor.process_job(conn, s3_client, transcriber, "test-bucket", job)

    downloaded_path = storage_mock.download_to_file.call_args.args[3]
    assert downloaded_path.endswith(".wav")
