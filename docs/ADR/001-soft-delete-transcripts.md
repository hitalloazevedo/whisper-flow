# 001. Soft-delete transcripts

## Context

Users need to delete a transcript (a `jobs` row, `apps/backend/src/jobs/job.entity.ts`).
A hard delete would remove the audit trail needed for abuse investigation,
support, or accidental-deletion recovery.

## Decision

Deletion sets a flag instead of removing the row:

- Nullable `deletedAt: timestamptz` column on `jobs`. `NULL` = active; a
  timestamp records when it was deleted.
- `DELETE /api/v1/jobs/:id`, scoped to `createdBy = currentUserId`, sets
  `deletedAt = now()` — it does not touch the underlying S3 objects.
- Every user-facing read (`GET /jobs`, the job-events stream, transcript
  download) filters `deletedAt IS NULL`. No route exposes deleted rows.
- In-flight jobs are unaffected by deletion; the worker ignores `deletedAt`.
- A scheduled job (`JobsPurgeService`, daily) hard-deletes rows and their S3
  objects once `deletedAt` is older than **60 days**.

## Consequences

- Deletion is reversible for 60 days (via direct DB access only — no
  undelete UI), then permanent.
- Every new read over `jobs` must remember to filter `deletedAt IS NULL`, or
  a deleted transcript leaks back into the UI.
- The purge job is new operational surface: it needs scheduling, monitoring,
  and its own failure handling.

## Alternatives Considered

- **Hard delete.** Rejected: no audit trail, no recovery from mistakes.
- **Boolean `isDeleted` flag.** Rejected: a timestamp gives the same
  filtering behavior plus *when*, at no extra cost.
- **Separate `deleted_jobs` table.** Rejected: duplicates the schema and
  adds a copy step for no real benefit over a flag on the existing row.
