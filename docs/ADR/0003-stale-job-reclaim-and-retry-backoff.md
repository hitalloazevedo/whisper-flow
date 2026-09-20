# 0003. Stale-processing reclaim and retry backoff

## Status

Accepted

## Context

[ADR 0002](0002-postgres-as-job-queue.md) uses the `jobs` table as the
queue and flagged an accepted gap: if a worker claims a job (`status =
'processing'`) and crashes before finishing it, nothing detects or
requeues it — the job is stuck forever. Separately, `mark_failed` already
incremented `retryCount` on an explicit processing failure (an exception in
`processor.process_job`), but nothing ever acted on that counter — a failed
job stayed `failed` permanently, and `retryCount` was dead data.

This closes both gaps with one shared retry budget, while keeping the two
failure modes' *recovery behavior* distinct, because they carry different
information:

- An **explicit failure** (exception during processing) is a known,
  immediate signal — we found out about it the instant it happened.
- A **stale `processing` job** (worker crashed, was killed, lost its
  connection) is not a known failure at all — nothing told us it failed. We
  only *infer* a problem after it sits in `processing` unchanged for 30
  minutes.

## Decision

Both paths share one `retryCount` and a 3-attempt ceiling (the original
attempt plus 2 retries), but apply recovery differently:

- **New column:** `nextAttemptAt: timestamptz | null` on `jobs`
  (`AddNextAttemptAtToJobs1780000000000`). `claim_next_job`
  (`apps/worker/src/worker/db.py`) only claims `status = 'pending' AND
  ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= now())` — a job in backoff
  is invisible to claiming until its wait elapses. This query still never
  touches `processing` rows at all, by design (see below).

- **Explicit failure → backoff, then retry.** `mark_failed` increments
  `retryCount`; if it has reached 3, the job goes to `failed` (terminal,
  `nextAttemptAt = NULL`). Otherwise it goes back to `pending` with
  `nextAttemptAt = now() + N minutes`, where `N` is the new `retryCount`
  (1 minute after the 1st failure, 2 minutes after the 2nd). We just
  learned something failed; giving it a short, increasing cooldown before
  retrying is standard practice and cheap to do here.

- **Stale `processing` → immediate retry, no backoff.** A new backend
  service, `JobsStaleSweepService`, runs every 5 minutes
  (`@Cron(CronExpression.EVERY_5_MINUTES)`) and finds jobs where `status =
  'processing' AND "updatedAt" < now() - 30 minutes`. It applies the exact
  same `retryCount` / 3-attempt logic as `mark_failed`, but sets
  `nextAttemptAt = NULL` (immediately claimable) instead of a backoff
  window. Reasoning: we don't know anything actually failed yet — the
  30-minute detection delay already *is* the cooldown. Adding a further
  backoff on top would just compound an already-long, uninformative wait
  with no new signal justifying it.

- **Why the sweep lives in the backend, not the worker:** the worker only
  runs this logic while some worker instance is alive and looping. A
  backend-side scheduled job keeps reclaiming stale work even if the
  entire worker fleet is down or mid-deploy — which is exactly when a
  stuck job most needs to be found, so a worker picks it up the moment it's
  healthy again. This also matches the existing precedent
  (`JobsPurgeService` from ADR 0001) rather than introducing a second,
  different scheduling mechanism in Python where none currently exists.

- **Why `claim_next_job` still never looks at `processing` rows:** claiming
  and reclaiming are different operations with different safety
  requirements. Claiming picks among many equally-eligible pending rows and
  needs `SKIP LOCKED` to split work safely across concurrent workers.
  Reclaiming isn't "picking one of many" — it's a conditional `UPDATE`
  against rows matching a staleness predicate, safe to run as a plain
  `UPDATE` (a second concurrent sweep run just re-evaluates the `WHERE` and
  no-ops on rows already moved). Mixing that into the claim query would
  couple two different concerns for no benefit.

## Consequences

- The gap ADR 0002 flagged — a crashed worker leaving a job stuck forever
  — is closed: worst case, a job is stuck for up to ~35 minutes (30-minute
  threshold + up to a 5-minute sweep interval) before being requeued.
- `retryCount` is now load-bearing (it wasn't before) and is shared across
  both failure modes: a job can fail once explicitly, get stuck and
  reclaimed once, then fail explicitly a third time and land in `failed`.
  That's intentional — one budget, regardless of *how* the attempt failed.
- `errorMessage` on a stale-reclaimed job is a synthetic message ("Job
  timed out while processing..."), not a real error, since none exists.
  Anyone reading it needs to know that distinction — it does not mean the
  transcription itself threw.
- The 5-minute sweep interval and 30-minute staleness threshold are
  independent knobs (both currently hardcoded constants, not env-driven,
  matching ADR 0001's `DELETED_JOB_RETENTION_DAYS` precedent). A job stuck
  for exactly 31 minutes could wait up to 4 more minutes for the next sweep
  tick before being reclaimed — acceptable imprecision for this use case.
- `MAX_RETRIES` (worker, Python) and `MAX_JOB_ATTEMPTS` (backend,
  TypeScript) are the same value (3) enforced in two separate codebases
  with no shared source of truth — each file carries a comment pointing at
  its counterpart, but nothing fails loudly if they drift out of sync.

## Alternatives Considered

- **Apply the same backoff to stale-reclaim as to explicit failure.**
  Rejected: would add a further wait after 30 minutes have already been
  spent detecting the problem, for a failure mode that carries no new
  information to justify it.
- **Have `claim_next_job` also reclaim stale `processing` rows itself**
  (worker-side, folded into the existing `SKIP LOCKED` query). Rejected:
  ties reclaim's reliability to worker uptime, and only a claim attempt
  (i.e. an idle worker) would ever trigger it — a busy worker fleet
  processing a steady stream of jobs might never idle long enough to
  reclaim a stuck sibling job.
- **Two separate retry counters** (one for explicit failures, one for
  staleness). Rejected: adds a column and branching for a distinction that
  doesn't change the ceiling decision — either way, 3 total attempts is 3
  total attempts.
