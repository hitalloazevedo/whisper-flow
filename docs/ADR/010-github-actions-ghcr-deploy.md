# 010. Manual GitHub Actions deploy: build to GHCR, pull on the VPS

## Context

The app runs on a single ARM VPS reachable over SSH, running Podman (not
Docker) as its container engine, per [ADR 007](007-docker-compose-topology.md)'s
Compose topology. Deploys need to be triggerable on demand without loading
the VPS's own CPU/RAM with image builds — the worker image in particular
installs a Python ML stack. The VPS also already runs a shared Postgres
instance (its own compose stack, one Postgres serving multiple apps via
per-app database/user) on an external `shared-db` network, rather than
each app running its own Postgres container.

## Decision

- `.github/workflows/deploy.yml` is `workflow_dispatch`-only (no
  push-to-main trigger) with an optional `ref` input, defaulting to `main`.
- The `build-and-push` job builds `apps/backend/Dockerfile`,
  `apps/frontend/Dockerfile`, and `apps/worker/Dockerfile` with
  `docker/build-push-action`, each for `platforms: linux/arm64` (via
  `docker/setup-qemu-action`, since the runner is amd64 and the VPS is
  ARM), and pushes to `ghcr.io/<owner>/whisper-flow-{backend,frontend,worker}`
  tagged with the short commit SHA and `latest`. The frontend's
  `VITE_API_URL` build arg comes from the `VITE_API_URL` repo variable, per
  ADR 007's build-time baking.
- The `deploy` job SSHes into the VPS (`appleboy/ssh-action`, using the
  `VPS_HOST`/`VPS_USER`/`VPS_SSH_KEY`/`VPS_PORT`/`VPS_DEPLOY_PATH` repo
  secrets), `podman login`s with the job's own `GITHUB_TOKEN` (valid only for
  the run's duration), pulls, then brings services up in four explicit
  single- or few-service `up -d` calls — `minio`; `minio-init`; then
  `backend-migrate` (waiting for the latter two to exit 0); then
  `backend`/`worker`/`frontend` — instead of one `up -d --remove-orphans`.
  `docker-compose.prod.yml` has no `depends_on` between services; podman
  4.9.3's `--requires` dependency-graph resolver unreliably fails to find
  already-running containers referenced transitively through it, so
  ordering is enforced by the deploy script itself, not podman.
- `minio-init`/`backend-migrate`/`backend`/`worker`/`frontend` are brought
  up with `--force-recreate` (`minio` is not — its image is always
  `:latest`, nothing to pick up): when service names are passed explicitly,
  podman-compose's hash-based recreate check unreliably no-ops and falls
  back to `podman start` on whatever container already holds that name,
  silently leaving the old image running instead of the newly pulled one.
  `minio-init` and `backend-migrate` are two separate single-service calls
  rather than one combined call — podman-compose's service-scoping has a
  distinct bug where `minio` isn't excluded from that specific two-service
  combination, and with `--force-recreate` active that stray inclusion
  tore `minio` down as collateral damage. The script verifies every
  container is actually `running` before pruning, so a future failure
  leaves diagnosable state instead of the prune step silently deleting it.
- `docker-compose.prod.yml` mirrors the dev topology from ADR 007 but
  references `ghcr.io/${GHCR_NAMESPACE}/whisper-flow-*:${IMAGE_TAG}` images
  instead of `build:` blocks, drops the `postgres` service entirely, and
  reads secrets (`DATABASE_URL`, `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`,
  `SESSION_SECRET`, `GOOGLE_CLIENT_ID`/`SECRET`, etc.) from a `.env` file
  that lives only on the VPS. `.env.example` at the repo root documents the
  required keys. `GHCR_NAMESPACE`/`IMAGE_TAG` are exported by the
  workflow's SSH step, not read from that file.
- `backend-migrate`, `backend`, and `worker` join the external `shared-db`
  network (declared `external: true`) in addition to the compose file's
  default network, so they can resolve the shared Postgres container by its
  service name (`postgres`) and reach it without publishing 5432. The
  `whisper_flow` database and its owning user are provisioned by hand on
  the shared instance (`CREATE DATABASE` / `CREATE USER`), once, outside
  this repo — `DATABASE_URL` in `.env` points at them.
- `minio` also publishes a loopback-only port (`MINIO_PORT`, default 9000)
  and gets an nginx location matched on the bucket name (`/whisper-flow-audio/`,
  i.e. `S3_BUCKET`), because pre-signed upload/download URLs are followed by
  the browser, not the backend — they must be signed against
  `S3_PUBLIC_ENDPOINT` (that nginx host), not the internal
  `S3_ENDPOINT=http://minio:9000` the backend uses to reach it. Unlike the
  frontend/backend locations, this one has no path prefix and no rewrite:
  the SigV4 signature covers the exact path the SDK signed, and MinIO has
  no notion of a base-path prefix to strip against, so nginx must forward
  the request untouched.

## Consequences

- The VPS only ever pulls and runs images — no build tools, no Node/Python
  toolchain, no QEMU emulation overhead on the VPS itself.
- Deploys are versioned and reproducible by commit SHA; rolling back means
  re-running the workflow with an older `ref`.
- Cross-compiling `linux/arm64` under QEMU on an amd64 runner is slower
  than a native build, most noticeably for the worker image's
  `ctranslate2`/`faster-whisper` install.
- GHCR packages default to private, so the VPS must `podman login ghcr.io`
  on every deploy using the run's ephemeral `GITHUB_TOKEN` — there's no
  standing credential on the VPS, but a deploy can't authenticate outside
  of a workflow run (e.g. no ad-hoc manual `pull` on the box without its
  own PAT).
- No CI runs on push — a broken `main` isn't caught until someone manually
  triggers a deploy. No automated rollback if the new images fail health
  checks; `podman compose ps` must be checked manually after a deploy.
- One fewer container to run and back up, but the app now depends on
  infrastructure (`shared-db`, the DB itself) that lives outside this
  repo's compose file — `podman compose down -v` here can no longer wipe
  and recreate the database, and the external network must already exist
  before `up` is run the first time.

## Alternatives Considered

- **Deploy on push to `main`.** Rejected: the user wants deploys to be a
  deliberate, manual action rather than continuous.
- **rsync the repo and `podman compose build` on the VPS.** Rejected: pushes
  build load (and the worker's Python ML deps) onto the VPS instead of a
  CI runner, and slower per-deploy since nothing is cached between runs.
- **Public GHCR packages to skip VPS login.** Rejected for now: keeps the
  images private by default; revisit if the login step becomes a problem.
- **Dedicated `postgres` container per ADR 007's dev topology.** Rejected
  for production: the VPS already runs a shared Postgres instance other
  apps use, and duplicating one per app wastes memory on a single small
  VPS for no isolation benefit beyond what a separate database/user already
  gives.
