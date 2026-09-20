# 0002. Use Postgres as the job queue instead of RabbitMQ

## Status

Accepted

## Context

Transcription jobs are created by the backend and processed asynchronously
by the worker (`apps/worker`). Something has to hand a new job off from the
backend to a worker, let multiple worker instances share the load without
double-processing a job, and let a worker pick up work with low latency
rather than only on a fixed poll interval.

The conventional answer is a message broker (e.g. RabbitMQ): the backend
publishes a job, workers consume from a queue, and the broker handles
delivery, acking, and redelivery. That means running, operating, and paying
attention to another stateful service in addition to Postgres.

## Decision

The `jobs` table in Postgres (already the system of record for job state)
*is* the queue. No broker is introduced.

- **Handoff:** inserting a row is the enqueue. A trigger on `jobs`
  (`notify_new_job` / `notify_job_update`, see the
  `AddJobsNotifyTrigger`/`AddJobsNotifyUpdateTrigger` migrations) calls
  `pg_notify` on the `new_job` channel whenever a job is inserted or its
  status changes.
- **Low-latency pickup:** the worker holds a `LISTEN new_job` connection and
  blocks on it between polls (`apps/worker/src/worker/db.py:wait_for_notification`),
  so it reacts near-instantly to a new job instead of waiting out a fixed
  poll interval.
- **Safe concurrent claiming:** a worker claims the oldest pending job with
  `UPDATE jobs SET status = 'processing' ... WHERE id = (SELECT id FROM jobs
  WHERE status = 'pending' ... FOR UPDATE SKIP LOCKED LIMIT 1)`
  (`apps/worker/src/worker/db.py:claim_next_job`). `SKIP LOCKED` means
  multiple worker instances can run this concurrently against the same
  table and never claim the same row — the same guarantee a broker's
  consumer-ack model gives, implemented with a single SQL statement.
- **Fallback polling:** `NOTIFY` is a notification, not a guaranteed
  delivery — if the worker is busy when it fires, the message is lost. The
  worker's loop always falls back to re-querying on the poll interval
  (`POLL_INTERVAL_SECONDS`), so `LISTEN/NOTIFY` is purely a latency
  optimization on top of polling, never a replacement for it.

## Consequences

- One fewer service to run, monitor, upgrade, and reason about in
  production. Job state and job data live in the same transactional store,
  so there is no dual-write problem between "update the job row" and
  "tell the queue" — they're the same statement.
- Postgres is handling this load without issue at current volume; this
  decision is a good fit for that, and revisiting it is a scale problem to
  have, not a default to design around now.
- **No redelivery on worker crash.** A real broker redelivers a message
  when a consumer disconnects without acking. Here, a worker that claims a
  job (sets `status = 'processing'`) and then crashes leaves that job
  stuck in `processing` forever — nothing currently detects or requeues
  it. This is an accepted, known gap for now, not solved by this decision.
  A future pass to close it would look like a periodic sweep that resets
  jobs stuck in `processing` past some staleness threshold back to
  `pending`, without needing a broker to do it.
- No dead-letter queue, retry backoff scheduling, or delivery metrics —
  anything like that has to be built directly against the `jobs` table
  (e.g. `retryCount`, `errorMessage` already exist for this) rather than
  configured on a broker.
- This scales to multiple worker instances today (via `SKIP LOCKED`), but
  the queue is a single Postgres table taking writes on every claim,
  completion, and failure. If job volume grows enough for that write load
  or table bloat to matter, that's the point to revisit this decision, not
  before.

## Alternatives Considered

- **RabbitMQ (or another broker).** Rejected for now: gives redelivery,
  backoff, and dead-lettering for free, but adds an operational dependency
  the current job volume doesn't need. The gap this leaves (no
  redelivery on crash) is real but small enough to accept rather than pay
  for a broker to close it.
- **Fixed-interval polling only, no `LISTEN/NOTIFY`.** Rejected: simpler,
  but trades away pickup latency for no real operational benefit — the
  `NOTIFY` trigger was cheap to add and keeps polling as a fallback anyway.
