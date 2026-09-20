# Whisper Flow Worker

Long-lived Python process that consumes the `jobs` table and transcribes audio with [faster-whisper](https://github.com/SYSTRAN/faster-whisper).

## How it works

1. `LISTEN`s on the `new_job` Postgres channel — a trigger (migration
   `1740000000000-AddJobsNotifyTrigger`) fires `pg_notify('new_job', ...)`
   on every insert into `jobs`, so the worker wakes up immediately instead
   of waiting out a poll interval.
2. Either way — woken by a notification or by the `POLL_INTERVAL_SECONDS`
   fallback timeout — it tries to claim the oldest `pending` job atomically
   with `SELECT ... FOR UPDATE SKIP LOCKED`, so multiple worker instances
   can run safely side by side and a missed/duplicate notification can
   never cause a job to be processed twice.
3. Downloads the audio from S3/MinIO (`inputPath`).
4. Transcribes it with faster-whisper.
5. Uploads the transcript as `transcripts/{userId}/{jobId}.txt` and records
   that key as the job's `outputPath`, marking it `completed`.
6. On any failure, marks the job `failed`, records `errorMessage`, and
   increments `retryCount` (no automatic retry in this version).

## Health check

`GET /health` on `HEALTH_PORT` (default `8000`) is the only HTTP route —
there is no other API surface. Returns `200 {"status":"ok"}` once startup
(DB connect, S3 client, model load) has finished, `503` before that, and
`404` for anything else. The Dockerfile's `HEALTHCHECK` uses it.

## Run (Docker)

The worker runs as its own service in the repo-root `docker-compose.yml`,
alongside `postgres` and `minio`:

```bash
docker-compose up -d --build
```

`--build` is only needed the first time, or after changing
`requirements.txt`/`src/`. The `worker` service depends on `postgres` being
healthy and `minio-init` having finished (so the bucket/lifecycle rule
already exist) before it starts. Its model cache
(`~/.cache/huggingface` inside the container) is persisted in the
`whisper_model_cache` volume, so the model isn't re-downloaded on every
restart.

Apply backend migrations once before starting it (from `apps/backend`):

```bash
npm run db:migrate
```

View logs with:

```bash
docker-compose logs -f worker
```

## Local development (without Docker)

Useful for iterating on the code or running tests without rebuilding the
image each time.

```bash
cd apps/worker
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
```

Requires the same Postgres and MinIO containers
(`docker-compose up -d postgres minio minio-init` from the repo root), with
migrations applied.

```bash
source .venv/bin/activate
PYTHONPATH=src python -m worker.main
```

## Test

```bash
cd apps/worker
source .venv/bin/activate
pytest
```

Tests mock the database, S3, and the Whisper model — they don't require the
containers to be running.

## Configuration

See `.env.example` for local development. In `docker-compose.yml`, the same
variables are set directly as the `worker` service's `environment` (pointing
at the `postgres`/`minio` service names rather than `localhost`).
`WHISPER_MODEL` accepts any faster-whisper model size (`tiny`, `base`,
`small`, `medium`, `large-v3`, ...). `WHISPER_DEVICE`/`WHISPER_COMPUTE_TYPE`
control CPU vs GPU inference — `cpu`/`int8` works without a GPU.
