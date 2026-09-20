# Authentication Hardening TODO

This checklist takes the current Google OAuth flow from local MVP to production-ready authentication.

## P0: Do Before Public Access

- [ ] Rotate `GOOGLE_CLIENT_SECRET` and `SESSION_SECRET` because both were exposed during development.
  - [ ] Update the Google Cloud OAuth client secret.
  - [ ] Generate and store a new session secret in the deployment secret manager.
  - [ ] Confirm secrets are absent from Git history and logs.

- [x] Regenerate the session after a successful Google callback.
  - [x] Preserve the authenticated user ID after `request.session.regenerate()`.
  - [x] Return an error if regeneration fails.
  - [x] Add unit coverage for the auth/session controller flow.

- [x] Persist application users and OAuth identities in Postgres.
  - [x] Add a `users` table with UUID primary key, email, display name, avatar URL, and timestamps.
  - [x] Add an `oauth_accounts` table with provider, provider subject (`sub`), user ID, and timestamps.
  - [x] Add a unique constraint on `(provider, provider_subject)`.
  - [x] Find or create the local user during the Google callback.
  - [x] Store only the provider identity and profile metadata, never Google access or refresh tokens unless a future feature requires them.

- [x] Use the persisted user ID as the session identity.
  - [x] Store `userId` in the session instead of treating the profile object as the identity.
  - [x] Make `/api/v1/auth/me` load the current user from Postgres.
  - [x] Remove access for disabled users.

- [ ] Enforce authentication and ownership on protected routes.
  - [x] Add an authenticated-user guard for the jobs route.
  - [ ] Add the guard to uploads, transcripts, and future account routes.
  - [ ] Scope every database query by the authenticated user ID.
  - [ ] Add tests proving one user cannot access another user's jobs or transcripts.

## P1: Harden Request Boundaries

- [x] Replace `createTableIfMissing` with a TypeORM migration for the session table.
  - [x] Run migrations as an explicit deployment step.
  - [x] Keep `synchronize: false` in every environment.

- [x] Tighten logout CSRF protection.
  - [x] Require a matching `Origin` header for browser state-changing requests.
  - [ ] Decide whether to add a CSRF token for future state-changing endpoints.
  - [ ] Keep `SameSite=Lax` and `Secure` production cookies.

- [x] Add baseline rate limiting and abuse controls.
  - [x] Apply global request throttling to Google auth, `/auth/me`, logout, and API routes.
  - [x] Add stricter per-route limits for Google auth failures.
  - [ ] Add upload/job quotas per user.

- [ ] Validate OAuth profile data.
  - [x] Require a Google subject ID and verified email.
  - [x] Reject callbacks without the required identity fields.
  - [ ] Normalize and validate profile values before persistence.

- [x] Validate runtime configuration at startup.
  - [x] Require `DATABASE_URL`, `FRONTEND_URL`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL`.
  - [x] Validate that production URLs use HTTPS.
  - [x] Fail startup with actionable configuration errors.

## P2: Production Operations

- [ ] Use a managed or dedicated PostgreSQL session store with backups and monitoring.
- [ ] Configure session cleanup and database indexes for expiration queries.
- [ ] Add structured auth logs without logging cookies, OAuth codes, tokens, or secrets.
- [ ] Add alerts for OAuth callback failures, session-store errors, and abnormal login volume.
- [ ] Document the Google Cloud OAuth consent-screen and redirect-URI setup.
- [ ] Verify logout, cookie, and callback behavior behind the production reverse proxy.
- [ ] Add a security review before public launch.

## Acceptance Criteria

- [ ] A Google user is mapped to one durable local user account.
- [ ] Refreshing the frontend preserves the authenticated session.
- [ ] Restarting the API preserves the session until expiry or logout.
- [ ] OAuth callback session IDs are regenerated.
- [ ] Logout destroys the server-side session and clears the browser cookie.
- [ ] Cross-user job and transcript access is denied.
- [ ] No secrets or tokens appear in source, logs, test output, or Git history.
- [x] Unit security-flow tests run for auth service, logout, anonymous sessions, and route guards.
- [ ] Auth integration tests pass with Postgres and a Google OAuth test configuration.
