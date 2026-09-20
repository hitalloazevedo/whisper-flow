# 003. Stale-processing reclaim and retry backoff

## Status

Accepted

## Context

[ADR 002](002-postgres-as-job-queue.md) flagged a gap: a worker that
claims a job then crashes leaves it stuck in `processing` forever. Separately,
`mark_failed` already incremented `retryCount` on explicit failure but never
acted on it — failed jobs stayed `failed` permanently.

The two failure modes carry different information: an **explicit failure**
is a known signal the instant it happens; a **stale `processing` job** is
only *inferred* after sitting unchanged for a while — nothing told us it
actually failed.

## Decision

Share one `retryCount` / 3-attempt ceiling, but recover differently per path:

- New `nextAttemptAt: timestamptz | null` column on `jobs`
  (`AddNextAttemptAtToJobs`). `claim_next_job` only claims rows where
  `nextAttemptAt IS NULL OR nextAttemptAt <= now()`.
- **Explicit failure → backoff, then retry.** `mark_failed` increments
  `retryCount`; at 3 attempts the job goes `failed` (terminal). Otherwise
  back to `pending` with `nextAttemptAt = now() + retryCount minutes`.
- **Stale `processing` → immediate retry, no extra backoff.**
  `JobsStaleSweepService` (backend cron, every 5 minutes) finds jobs with
  `status = 'processing' AND updatedAt < now() - 30 minutes`, applies the
  same `retryCount`/ceiling logic, but sets `nextAttemptAt = NULL`
  (immediately claimable) — the 30-minute detection delay already is the
  cooldown; stacking a further wait adds no new information.
- The sweep lives in the **backend**, not the worker, so stale work keeps
  getting reclaimed even if the entire worker fleet is down — matching the
  precedent set by `JobsPurgeService` (ADR 001).
- `claim_next_job` still never looks at `processing` rows: claiming picks
  among many pending rows and needs `SKIP LOCKED`; reclaiming is a plain
  conditional `UPDATE` against a staleness predicate — different concerns.

## Consequences

- The ADR 002 gap is closed: a job is stuck for at most ~35 minutes
  (30-minute threshold + up to a 5-minute sweep tick) before being requeued.
- `retryCount` is now shared across both failure modes — one budget,
  regardless of *how* an attempt failed.
- A stale-reclaimed job's `errorMessage` is synthetic ("Job timed out..."),
  not a real error — worth knowing when reading it.
- `MAX_RETRIES` (worker/Python) and `MAX_JOB_ATTEMPTS` (backend/TS) are the
  same value (3) kept in sync by hand across two codebases, with only a
  comment pointing each at its counterpart — nothing fails loudly if they drift.

## Alternatives Considered

- **Backoff on stale-reclaim too.** Rejected: adds a further wait on top of
  an already-long, uninformative 30-minute detection delay.
- **Reclaim inside `claim_next_job` itself.** Rejected: ties reclaim
  reliability to worker uptime, and only triggers when a worker is idle
  enough to claim — a busy fleet might never reclaim a stuck sibling.
- **Separate retry counters per failure mode.** Rejected: adds a column for
  a distinction that doesn't change the ceiling — 3 total attempts either way.
