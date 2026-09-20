docker compose for postgres, node.js api and python + whisper

python + whisper: long lived process with as a queue consumer

postgres: auth + job queue

node.js: entry point, auth, add job, update frontend

Job table postgres

CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES users (id),
    status job_status NOT NULL DEFAULT 'pending',
    input_path TEXT NOT NULL,
    output_path TEXT,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_jobs_status_created_at ON jobs (status, created_at);