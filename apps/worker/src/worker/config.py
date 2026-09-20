import os
from dataclasses import dataclass


class MissingConfigError(RuntimeError):
    pass


def _require(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise MissingConfigError(f"Missing required environment variable: {name}")
    return value


@dataclass(frozen=True)
class Config:
    database_url: str
    s3_endpoint: str
    s3_region: str
    s3_bucket: str
    s3_access_key_id: str
    s3_secret_access_key: str
    s3_force_path_style: bool
    whisper_model: str
    whisper_device: str
    whisper_compute_type: str
    poll_interval_seconds: float
    log_level: str
    health_port: int
    heartbeat_interval_seconds: float

    @staticmethod
    def from_env() -> "Config":
        return Config(
            database_url=_require("DATABASE_URL"),
            s3_endpoint=_require("S3_ENDPOINT"),
            s3_region=_require("S3_REGION"),
            s3_bucket=_require("S3_BUCKET"),
            s3_access_key_id=_require("S3_ACCESS_KEY_ID"),
            s3_secret_access_key=_require("S3_SECRET_ACCESS_KEY"),
            s3_force_path_style=os.environ.get("S3_FORCE_PATH_STYLE", "false") == "true",
            whisper_model=os.environ.get("WHISPER_MODEL", "base"),
            whisper_device=os.environ.get("WHISPER_DEVICE", "cpu"),
            whisper_compute_type=os.environ.get("WHISPER_COMPUTE_TYPE", "int8"),
            poll_interval_seconds=float(os.environ.get("POLL_INTERVAL_SECONDS", "5")),
            log_level=os.environ.get("LOG_LEVEL", "INFO"),
            health_port=int(os.environ.get("HEALTH_PORT", "8000")),
            heartbeat_interval_seconds=float(os.environ.get("HEARTBEAT_INTERVAL_SECONDS", "10")),
        )
