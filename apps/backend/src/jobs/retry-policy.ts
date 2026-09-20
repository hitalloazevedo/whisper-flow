// Total attempts allowed before a job is permanently marked 'failed': the
// original attempt plus 2 retries. Mirrored by MAX_RETRIES in
// apps/worker/src/worker/db.py — the two are not shared code, so keep them
// in sync by hand if this changes.
export const MAX_JOB_ATTEMPTS = 3
