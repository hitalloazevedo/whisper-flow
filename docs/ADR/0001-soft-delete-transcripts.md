# 0001. Soft-delete transcripts

## Status

Accepted

## Context

Users need a way to delete a transcript from their view. A transcript is the
output of a row in the `jobs` table (`apps/backend/src/jobs/job.entity.ts`):
each job has a `status` (`pending` | `processing` | `completed` | `failed`),
an `outputPath` pointing at the stored transcript, and is owned by a user via
`createdBy`.

A hard delete (removing the row, and the S3 objects it references) would lose
the record entirely. That makes it impossible to audit what a user uploaded
or generated, investigate abuse or billing disputes, or recover a transcript
deleted by mistake. Since jobs are also the append-only log the worker
processes and reports progress against, permanently erasing rows removes
history the system may need later for support or compliance purposes.

## Decision

Deletion is a **soft delete**: the transcript disappears from the user's UI,
but its row is kept in the database, flagged, and excluded from normal reads.

- Add a nullable `deletedAt: timestamptz` column to the `jobs` table via a
  TypeORM migration. `NULL` means active; a timestamp means deleted (and
  records *when*, which a boolean flag would not).
- Add `DELETE /api/v1/jobs/:id`, scoped to `createdBy = currentUserId` (a
  user may only delete their own jobs), which sets `deletedAt = now()`. It
  does not touch the underlying audio/transcript objects in blob storage.
- Every read path that lists or serves transcripts to end users (`GET
  /api/v1/jobs`, the job-events stream, `GET /api/v1/jobs/:id/transcript-url`)
  filters on `deletedAt IS NULL`. Deleted jobs are excluded by default and
  are only reachable through direct, privileged DB/audit access — no API
  route exposes them.
- The worker and any background job processing ignore `deletedAt`: a job
  already in flight when deleted finishes normally, and its result is simply
  filtered out of the user-facing views once complete.
- Soft-deleted rows are retained for **60 days** from `deletedAt`, then
  permanently purged: the row is hard-deleted from `jobs` and its audio and
  transcript objects are removed from blob storage. A scheduled job scans
  for `deletedAt < now() - interval '60 days'` and performs the purge. Until
  that window elapses, deleted transcripts remain available for auditing
  through direct DB access; after it, they are unrecoverable.

## Consequences

- Users can delete transcripts from the product without any user-visible
  data-recovery or "are you sure, this is permanent" burden — it is
  reversible internally, for 60 days.
- Deleted rows, and their S3 objects, persist for a bounded 60-day window
  rather than indefinitely, capping storage growth from deletions. The purge
  job is a new piece of operational infrastructure (needs scheduling,
  monitoring, and failure handling of its own) and its 60-day cutoff is a
  hard limit on how far back an audit or abuse investigation can reach into
  deleted transcripts.
- Every new read path added over `jobs` must remember to filter
  `deletedAt IS NULL`, or a soft-deleted transcript will leak back into the
  UI. This is a recurring cost of the approach; a repository-level default
  scope (or an equivalent query helper) is recommended to make the safe
  behavior the default rather than something each call site must remember.
- No UI is added to restore a deleted transcript. Undelete is only possible
  by clearing `deletedAt` directly in the database.

## Alternatives Considered

- **Hard delete.** Rejected: destroys the audit trail and cannot be
  recovered from user error, abuse investigation, or support requests.
- **Boolean `isDeleted` flag.** Rejected in favor of a nullable `deletedAt`
  timestamp: same filtering behavior, but also records *when* the deletion
  happened at no extra cost, which is useful for auditing and future
  retention policies.
- **Separate `deleted_jobs` audit table.** Rejected: duplicates the schema,
  adds a move/copy step on every delete, and complicates joins for any
  future audit tooling. A flag on the existing row is simpler and keeps a
  single source of truth.
