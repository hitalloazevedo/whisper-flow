# Architecture Decision Records

Index of ADRs. Records live in [docs/ADR/](ADR/).

| ADR                                                                   | Title                       | Status   |
| ---------------------------------------------------------------------- | ---------------------------- | -------- |
| [001](ADR/001-soft-delete-transcripts.md) | Soft-delete transcripts | Accepted |
| [002](ADR/002-postgres-as-job-queue.md) | Postgres as the job queue instead of RabbitMQ | Accepted |
| [003](ADR/003-stale-job-reclaim-and-retry-backoff.md) | Stale-processing reclaim and retry backoff | Accepted |
| [004](ADR/004-presigned-direct-to-s3-transfers.md) | Presigned direct-to-S3 uploads and downloads | Accepted |
| [005](ADR/005-manual-trace-id-propagation.md) | Manual trace-ID propagation instead of a tracing stack | Accepted |
| [006](ADR/006-postgres-backed-sessions.md) | Postgres-backed sessions instead of Redis or JWT | Accepted |
| [007](ADR/007-docker-compose-topology.md) | Docker Compose topology with migrations as a separate service | Accepted |
| [008](ADR/008-lower-upload-size-limit.md) | Lower the max upload size to 50MB | Accepted |
