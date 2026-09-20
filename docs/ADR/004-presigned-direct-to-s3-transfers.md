# 004. Presigned direct-to-S3 uploads and downloads

## Context

Audio uploads (up to 50MB, see [ADR 008](008-lower-upload-size-limit.md)) and transcript downloads need to move between the
browser and blob storage. Routing that traffic through the NestJS API would
tie up backend connections and memory on large binary bodies for the entire
transfer duration.

## Decision

The backend never proxies file bytes. It only issues short-lived presigned
S3 URLs and the browser talks to S3 (or MinIO) directly:

- `POST /upload-url` returns a presigned `PutObject` URL scoped to
  `pending-uploads/{userId}/{uuid}.{ext}` (15-minute TTL).
- The client PUTs the file straight to S3 via `XMLHttpRequest` (enabling
  upload-progress events), then calls `POST /jobs` to register the job.
- Since the backend never sees the bytes, `JobsService` verifies the object
  after the fact with a `HeadObject` call against `uploadLimits.maxBytes`,
  and checks the upload key is prefixed with the caller's own `userId`
  before accepting it.
- On acceptance, `StorageService.commitUpload` does a server-side
  `CopyObject`+`DeleteObject` from `pending-uploads/` to `uploads/` — no
  bytes pass through the backend for this move either.
- Transcript downloads use the same pattern: `GET /jobs/:id/transcript-url`
  returns a presigned `GetObject` URL (5-minute TTL).
- Abandoned `pending-uploads/` objects (presigned URL issued, `/jobs` never
  called) are cleaned up by a bucket lifecycle rule that expires objects
  under that prefix after 1 day, independent of the 60-day soft-delete purge.

## Consequences

- Backend stays stateless w.r.t. file bytes; it scales on request count, not
  upload bandwidth.
- Size and extension validation happen after upload, not before — a
  deliberate trade-off (`HeadObject` check + key-prefix ownership check)
  since the backend can't intercept the stream.
- Two-step commit workflow (`pending-uploads/` → `uploads/`) and the
  lifecycle rule are extra moving parts needed only because of this split.

## Alternatives Considered

- **Proxy uploads/downloads through the API.** Rejected: holds a backend
  connection open for the full transfer and requires streaming large
  multipart bodies through Node, for no benefit over presigned URLs.
