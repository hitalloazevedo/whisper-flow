import pytest

from worker.config import Config, MissingConfigError

REQUIRED_VARS = {
    "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/whisper_flow",
    "S3_ENDPOINT": "http://localhost:9000",
    "S3_REGION": "us-east-1",
    "S3_BUCKET": "whisper-flow-audio",
    "S3_ACCESS_KEY_ID": "minioadmin",
    "S3_SECRET_ACCESS_KEY": "minioadmin",
}


def test_loads_required_variables(monkeypatch):
    for key, value in REQUIRED_VARS.items():
        monkeypatch.setenv(key, value)

    config = Config.from_env()

    assert config.database_url == REQUIRED_VARS["DATABASE_URL"]
    assert config.s3_bucket == REQUIRED_VARS["S3_BUCKET"]
    assert config.whisper_model == "base"
    assert config.s3_force_path_style is False


@pytest.mark.parametrize("missing", list(REQUIRED_VARS))
def test_raises_when_a_required_variable_is_missing(monkeypatch, missing):
    for key, value in REQUIRED_VARS.items():
        monkeypatch.setenv(key, value)
    monkeypatch.delenv(missing)

    with pytest.raises(MissingConfigError):
        Config.from_env()


def test_applies_optional_overrides(monkeypatch):
    for key, value in REQUIRED_VARS.items():
        monkeypatch.setenv(key, value)
    monkeypatch.setenv("WHISPER_MODEL", "small")
    monkeypatch.setenv("S3_FORCE_PATH_STYLE", "true")
    monkeypatch.setenv("POLL_INTERVAL_SECONDS", "2.5")

    config = Config.from_env()

    assert config.whisper_model == "small"
    assert config.s3_force_path_style is True
    assert config.poll_interval_seconds == 2.5
