# 008. Lower the max upload size to 50MB

## Context

The worker runs `faster_whisper` on CPU (`WHISPER_DEVICE=cpu`,
`apps/worker/src/worker/transcriber.py`) on a CPU-only VPS, so job duration
directly drives per-job compute time and worker throughput. The upload cap
was 100MB (`uploadLimits.maxBytes`,
`apps/backend/src/upload-limits.controller.ts`), set without a clear basis
relative to that constraint.

File size is a *weak* proxy for duration: at 50MB, uncompressed WAV caps out
around ~5 minutes, but compressed formats (MP3/M4A/WebM) can run ~20 minutes
to over an hour. A real duration limit isn't adopted here — see Alternatives.

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

- **Enforce an actual duration limit.** Rejected for now: the backend never
  sees file content ([ADR 004](004-presigned-direct-to-s3-transfers.md)), so
  this needs a probe (e.g. `ffprobe`) in the worker, after download — not
  worth the complexity yet.
- **A separate pre-processing worker/stage** to probe duration (and
  normalize format) ahead of transcription. Rejected for now: a second
  worker type and queue stage to operate, for a problem the size cap
  already partially covers.
