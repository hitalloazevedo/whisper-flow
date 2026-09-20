# 009. Multi-worker scaling: heartbeat health, per-worker models, no orchestrator

## Context

`claim_next_job` (`apps/worker/src/worker/db.py`) already uses `SELECT ...
FOR UPDATE SKIP LOCKED`, so multiple worker replicas can safely poll `jobs`
concurrently. Two things still block scaling out: the worker's `/health`
endpoint only answers for its own container, with no stable address per
replica under Compose; and each worker loads the Whisper model into its own
process memory on startup.

## Decision

- **Health via a Postgres heartbeat table**, not HTTP polling. Each worker
  UPSERTs its own row (keyed by hostname+PID) with `lastSeenAt`, `status`,
  and current job, on its poll cadence. The backend's status endpoint reads
  this table and treats a stale `lastSeenAt` as down — same staleness
  pattern as [ADR 003](003-stale-job-reclaim-and-retry-backoff.md), applied
  to workers instead of jobs. No need for the backend to discover or
  address individual containers.
- **Each worker loads its own model copy.** `base`/`int8` is small enough
  (a few hundred MB) that duplicating it per replica is fine. The model
  cache volume already shares the downloaded weights on disk; only the
  in-memory decoder is per-process.
- **No orchestrator.** Scale with `docker compose --scale worker=N` (after
  dropping the worker's fixed `container_name`, which collides across
  replicas). Coordination is already solved by `SKIP LOCKED`.

## Consequences

- One aggregate status endpoint (DB + MinIO + worker fleet) reads two
  tables — no network calls to worker containers.
- A hard-crashed worker leaves a stale heartbeat row; "stale" must be
  treated as "down," same tradeoff ADR 003 accepts for stale jobs.
- Memory/CPU scales linearly with replica count. Fine at `base`/`int8` on
  CPU; revisit if the model grows or moves to GPU.
- Replica count is a manual choice — no autoscaling on queue depth.

## Alternatives Considered

- **Backend HTTP-polls each worker.** Rejected: no stable per-replica
  address under Compose without extra service discovery.
- **Shared inference server** for all workers. Rejected: adds a service and
  a failure mode to solve a memory problem that doesn't exist at
  `base`/`int8`/CPU.
- **Dedicated orchestrator** (k8s, Nomad, custom autoscaler). Rejected:
  buys dynamic/multi-host scaling nobody needs yet, at real operational
  cost.
