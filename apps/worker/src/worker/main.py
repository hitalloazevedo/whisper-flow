import logging
import signal

from dotenv import load_dotenv

from . import db, processor, storage
from .config import Config
from .health import HealthState, start_health_server
from .logging_utils import configure_logging, get_logger, log_event
from .transcriber import Transcriber

logger = get_logger("Bootstrap")


def _install_shutdown_handler(should_stop: dict) -> None:
    def handle_signal(signum, _frame):
        log_event(logger, logging.INFO, "shutdown_requested", signal=signal.Signals(signum).name)
        should_stop["value"] = True

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)


def run() -> None:
    load_dotenv()
    config = Config.from_env()
    configure_logging(config.log_level)

    health_state = HealthState()
    health_server = start_health_server(health_state, config.health_port)

    conn = db.connect(config.database_url)
    db.listen_for_new_jobs(conn)
    s3_client = storage.create_s3_client(config)
    transcriber = Transcriber(config.whisper_model, config.whisper_device, config.whisper_compute_type)

    should_stop = {"value": False}
    _install_shutdown_handler(should_stop)

    health_state.set_ready(True)
    log_event(
        logger,
        logging.INFO,
        "worker_started",
        model=config.whisper_model,
        device=config.whisper_device,
    )

    while not should_stop["value"]:
        job = db.claim_next_job(conn)
        if job is None:
            db.wait_for_notification(conn, config.poll_interval_seconds)
            continue

        processor.process_job(conn, s3_client, transcriber, config.s3_bucket, job)

    health_state.set_ready(False)
    health_server.shutdown()
    log_event(logger, logging.INFO, "worker_stopped")
    conn.close()


if __name__ == "__main__":
    run()
