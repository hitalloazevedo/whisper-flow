# 0008. Lower the max upload size to 50MB

## Status

Accepted

## Context

The worker runs `faster_whisper` on CPU (`WHISPER_DEVICE=cpu`,
`apps/worker/src/worker/transcriber.py`), and the first deployment target is
a CPU-only VPS — no GPU inference available. CPU transcription is
significantly slower than realtime-ish GPU inference, so job duration
directly drives per-job compute time and how many jobs a single worker
instance can get through. The upload cap was 100MB (`uploadLimits.maxBytes`,
`apps/backend/src/upload-limits.controller.ts`), set without a clear basis
relative to that constraint.

A duration limit was considered but rejected for now — per
[ADR 0004](0004-presigned-direct-to-s3-transfers.md), the backend never sees
uploaded bytes (presigned direct-to-S3), so enforcing an actual duration cap
would require a decode step somewhere in the pipeline, which wasn't judged
worth the added complexity yet.

Note that file size is a *weak* proxy for duration: at 50MB, uncompressed
WAV caps out around ~5 minutes, but compressed formats (MP3/M4A/WebM at
typical bitrates) can run anywhere from ~20 minutes to well over an hour.
This limit does not reliably bound worker compute time per job — it only
reduces the worst case for uncompressed audio.

## Decision

Lower `uploadLimits.maxBytes` from 100MB to 50MB. This is the single
enforcement point (`jobs.service.ts` and the frontend both derive their
checks from this value via `GET /upload-limits`), so this is a one-constant
change plus keeping the frontend's offline fallback in sync.

## Consequences

- Smaller worst-case blob storage and transfer size per job, and a lower
  worst-case bound on CPU transcription time for uncompressed audio, which
  matters directly on a single-instance CPU worker.
- Does not meaningfully cap transcription time or worker load for
  compressed formats — a long, well-compressed file can still tie up the
  CPU worker for a long time. A real duration limit would need to move the
  decision point into the worker (probe duration after download, before
  transcribing) if CPU capacity becomes a real bottleneck.

## Alternatives Considered

- **Enforce an actual duration limit (e.g. 3 minutes).** Rejected for now:
  would require a duration probe (e.g. `ffprobe`) in the worker after
  download, since the backend can't see file content under the presigned
  upload model. Left as the more direct fix once CPU-bound worker capacity
  becomes a real constraint (e.g. moving off a single CPU VPS, or adding
  GPU inference, would also reopen this decision).
- **A separate pre-processing worker/stage** that probes duration (and
  could normalize format/sample rate) before a job reaches the
  transcription worker, rejecting or flagging jobs that don't meet
  requirements ahead of the expensive CPU stage. Not adopted now: it's a
  second worker type and queue stage to build, deploy, and operate for a
  problem the size cap already partially covers. Worth revisiting instead
  of duration checks in the transcription worker itself if preprocessing
  needs grow beyond a single probe (e.g. transcoding, denoising).
