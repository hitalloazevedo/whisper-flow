# How to write an ADR

ADRs must be concise, meaningful, and easy to ingest — a reader should
understand the engineering decision at a glance, with no information
overhead. Prefer fewer words per section over exhaustive justification.

## File

- `docs/ADR/NNN-kebab-case-title.md`, zero-padded 3-digit sequence.
- Add a row to the table in `docs/ADR.md`.

## Sections, in order

```markdown
# NNN. Title

## Context

## Decision

## Consequences

## Alternatives Considered
```

No Status section — an ADR in this repo is written after the decision is
made, so it's implicitly accepted. If a decision is later reversed, note it
at the top of the superseded ADR (`Superseded by NNN`) rather than tracking
status as its own field.

- **Context** — the problem or gap as it stands now, in a few sentences.
  Link a prior ADR instead of restating it (`[ADR 002](002-....md)`).
- **Decision** — what was decided, stated as concrete facts: specific
  files, functions, config values. One tight paragraph or bullet per
  sub-decision — not multiple sentences of justification each.
- **Consequences** — real tradeoffs accepted, not just benefits. Include
  the annoying ones (extra column to maintain, manual sync required, etc).
- **Alternatives Considered** — real options, one line each, with the
  actual reason they were rejected. Never omit this section.

## Style

- Terse and technical. No marketing language, no restating what the linked
  code or ADR already says.
- Reference exact file/function names so the decision is checkable against
  the code.
- If one ADR bundles several related decisions, keep each to a short
  paragraph rather than expanding into a subsection of its own.

## Before submitting

Re-read once and cut anything that doesn't change what a future reader
would do. If a sentence restates something already said elsewhere in the
ADR or in a linked one, delete it.
