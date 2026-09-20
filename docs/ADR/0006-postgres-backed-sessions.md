# 0006. Postgres-backed sessions instead of Redis or JWT

## Status

Accepted

## Context

The API needs to track authenticated users after Google OAuth login. The
stack already runs Postgres as the primary datastore; adding Redis purely
for session storage would be a second stateful service for one narrow job.

## Decision

Use `express-session` with `connect-pg-simple`, storing sessions in a
`user_sessions` table in the existing Postgres database. Cookies are
`httpOnly`, `sameSite: 'lax'`, `secure` in production, with a 7-day
`maxAge`. `AuthenticatedGuard` simply checks `request.session.userId`.

## Consequences

- No new stateful infrastructure: one database to operate, back up, and
  monitor instead of two.
- Session reads/writes add load to the primary Postgres instance, and
  session storage now scales (and fails over) with the main database rather
  than independently.
- Logout/session invalidation is a row delete, not a cache eviction — simple
  to reason about, but revocation is only as fast as a DB write.

## Alternatives Considered

- **Redis-backed sessions.** Rejected: faster and horizontally scales
  session storage independently, but not justified at this scale — it adds
  an operational dependency for a problem Postgres already handles.
- **Stateless JWT.** Rejected: revoking a session before expiry requires a
  denylist anyway (reintroducing server-side state), and cookie-based
  server sessions are simpler to invalidate outright.
