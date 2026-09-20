# 002. Use Postgres as the job queue instead of RabbitMQ

## Context

The backend creates transcription jobs; the worker processes them
asynchronously. Something needs to hand jobs off, let multiple workers share
load without double-processing, and support low-latency pickup. The usual
answer is a message broker — at the cost of running a second stateful
service alongside Postgres.

## Decision

The `jobs` table *is* the queue; no broker.

- **Handoff:** inserting/updating a row triggers `pg_notify('new_job', ...)`
  (`AddJobsNotifyTrigger`/`AddJobsNotifyUpdateTrigger` migrations).
- **Low-latency pickup:** the worker holds a `LISTEN new_job` connection and
  blocks on it between polls (`db.py:wait_for_notification`).
- **Safe concurrent claiming:** `UPDATE jobs SET status = 'processing' ...
  WHERE id = (SELECT id FROM jobs WHERE status = 'pending' ... FOR UPDATE
  SKIP LOCKED LIMIT 1)` (`db.py:claim_next_job`) — `SKIP LOCKED` lets
  multiple workers claim concurrently without collisions.
- **Fallback polling:** `NOTIFY` can be missed if the worker is busy, so the
  loop always falls back to polling on `POLL_INTERVAL_SECONDS`. `LISTEN/
  NOTIFY` is a latency optimization on top of polling, not a replacement.

## Consequences

- One fewer service to run and operate; job state and "the queue" are the
  same table, so there's no dual-write problem.
- **No redelivery on worker crash**: a job claimed then abandoned mid-crash
  stays `processing` forever unless something else reclaims it (closed in
  [ADR 003](003-stale-job-reclaim-and-retry-backoff.md)).
- No dead-letter queue or delivery metrics — anything like that has to be
  built directly against the `jobs` table.
- Fine at current volume; revisit if the table's write load (claim/complete/
  fail on every job) becomes the bottleneck.

## Alternatives Considered

- **RabbitMQ (or another broker).** Rejected for now: gives redelivery and
  dead-lettering for free, but is an operational cost the current volume
  doesn't justify.
- **Polling only, no `LISTEN/NOTIFY`.** Rejected: trades away pickup latency
  for no real benefit — the trigger was cheap to add.
