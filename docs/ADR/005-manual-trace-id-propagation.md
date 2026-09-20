# 005. Manual trace-ID propagation instead of a tracing stack

## Status

Accepted

## Context

A single upload crosses three processes in two languages: the frontend, the
NestJS API, and the Python worker (connected only via a Postgres row and S3
objects, not a shared request context). Debugging a failed transcription
means correlating log lines across all three without a shared framework.

## Decision

Thread one UUID through the whole pipeline by hand, no OpenTelemetry/Jaeger:

- The frontend generates `crypto.randomUUID()` per upload and sends it as
  `X-Trace-Id` on the presigned-URL and job-creation requests.
- `TraceIdMiddleware` validates the header against a strict UUID regex
  (reusing it if valid, minting a new one otherwise), stores it in Node's
  `AsyncLocalStorage`, and echoes it back as a response header.
- The `Job` row persists `traceId` (`jobs.service.ts`, migration
  `1750000000000-AddTraceIdToJobs.ts`), so it survives the handoff to the
  worker via the DB rather than an in-flight message header.
- The worker's claim query (`SELECT ... RETURNING "traceId"`) picks it back
  up and sets it on a Python `ContextVar` before processing starts.
- Both sides' loggers (Winston JSON formatter; a hand-rolled Python
  `JsonFormatter`) pull the trace ID out of their respective context
  primitives automatically, so no call site passes it explicitly.

## Consequences

- One `grep traceId` finds every log line for a request across frontend
  intent, API handling, and worker processing — without adding an
  APM/tracing vendor or agent.
- No spans, timing breakdowns, or service-dependency graphs — this is
  correlation, not distributed tracing. It won't show where time was spent.
- The propagation logic (context primitive, JSON log formatter, validation
  regex) is duplicated by hand in TypeScript and Python; there's no shared
  library enforcing they stay consistent.

## Alternatives Considered

- **OpenTelemetry with an exporter (Jaeger/Tempo/etc.).** Rejected for this
  project's scale: real spans and a collector are more infrastructure than
  a three-process pipeline needs; a single correlatable ID covers the
  debugging need at a fraction of the setup cost.
