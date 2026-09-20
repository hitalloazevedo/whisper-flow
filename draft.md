docker compose for postgres, node.js api and python + whisper

python + whisper: long lived process with as a queue consumer

postgres: auth + job queue

node.js: entry point, auth, add job, update frontend

Job table postgres

CREATE TABLE jobs (
    id UUID,
    created_at DATE,
    created_by UUID,
    foreign key (created_by) on users (id)
);

CREATE TABLE users (
    id UUID
);