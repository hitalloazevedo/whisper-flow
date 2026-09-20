# 0007. Docker Compose topology with migrations as a separate service

## Status

Accepted

## Context

The system has independently-scalable pieces (API, Python worker, frontend)
plus stateful dependencies (Postgres, MinIO as an S3-compatible store for
local/dev). Running schema migrations needs to happen exactly once per
deploy, not once per API replica racing at boot.

## Decision

`docker-compose.yml` models each concern as its own service with explicit
`depends_on` health/completion gates:

- `postgres` and `minio` are the stateful dependencies, both with
  healthchecks.
- `minio-init` is a one-shot `mc` container that creates the bucket and sets
  a lifecycle rule expiring `pending-uploads/` after 1 day.
- `backend-migrate` is a one-shot service running `run-migrations.ts`,
  gated on Postgres being healthy, and is a dependency of `backend` — so
  migrations always run to completion before the API starts serving, and
  never run as a side effect of API boot.
- `backend` (NestJS), `worker` (Python/faster-whisper), and `frontend`
  (Vite build served by nginx) are the three long-running services, each
  with its own Dockerfile.
- The worker mounts a named volume for the Hugging Face model cache so
  Whisper model weights persist across container restarts.

## Consequences

- Multiple API replicas can start concurrently without racing to apply the
  same migration — `backend-migrate` is a single gated step ahead of all of
  them.
- The frontend bakes `VITE_API_URL` in at build time (a Vite build arg),
  which means the backend URL isn't runtime-configurable — an image rebuild
  is required to point the frontend at a different API host.
- One more service definition to maintain per new stateful dependency, but
  each service's failure mode (migration failure vs. app failure vs.
  storage-not-ready) stays isolated and visible in `docker compose ps`
  rather than folded into a single container's startup script.
