# Architecture Decision Records

Index of ADRs. Records live in [docs/ADR/](ADR/).

| ADR                                                                   | Title                       | Status   |
| ---------------------------------------------------------------------- | ---------------------------- | -------- |
| [0001](ADR/0001-soft-delete-transcripts.md) | Soft-delete transcripts | Accepted |
| [0002](ADR/0002-postgres-as-job-queue.md) | Postgres as the job queue instead of RabbitMQ | Accepted |
| [0003](ADR/0003-stale-job-reclaim-and-retry-backoff.md) | Stale-processing reclaim and retry backoff | Accepted |
| [0004](ADR/0004-presigned-direct-to-s3-transfers.md) | Presigned direct-to-S3 uploads and downloads | Accepted |
| [0005](ADR/0005-manual-trace-id-propagation.md) | Manual trace-ID propagation instead of a tracing stack | Accepted |
| [0006](ADR/0006-postgres-backed-sessions.md) | Postgres-backed sessions instead of Redis or JWT | Accepted |
| [0007](ADR/0007-docker-compose-topology.md) | Docker Compose topology with migrations as a separate service | Accepted |
| [0008](ADR/0008-lower-upload-size-limit.md) | Lower the max upload size to 50MB | Accepted |
