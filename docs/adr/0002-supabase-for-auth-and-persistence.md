# ADR-0002: Supabase for auth and persistence

## Status

Accepted

## Context

The brief explicitly says authentication, a backend, and a database are not required. Real mode
was built anyway (see [`housekeeping-and-scope.md`](../housekeeping-and-scope.md)'s "overdid it"
section) to demonstrate the natural next version of the prototype. Whatever backend was chosen
needed to support real accounts, per-user data isolation, and be usable within the time available
for a project that was already well beyond its suggested scope.

## Decision

Use Supabase: hosted Postgres, built-in email/password auth, and Row Level Security as the actual
enforcement boundary for per-user data isolation.

## Alternatives considered

- **Firebase (Auth + Firestore).** Viable, but its document model is a worse fit for the
  relational shape of this data (courses → activities → mastery/review records with joins), and
  its security-rules language is a separate DSL to write and audit rather than reusing standard
  SQL/RLS policies.
- **A custom Node/Express backend + self-hosted Postgres.** Rejected: would require hosting,
  connection pooling, and hand-rolled auth (sessions, password hashing, token refresh) — all
  solved problems that would consume time better spent on the actual learner-facing features this
  project is evaluated on.
- **No backend at all (stay frontend-only).** This remains the *default* demo mode; real mode is
  additive, not a replacement, so this wasn't a strict either/or.

## Consequences

**Positive:** RLS enforces per-user isolation at the database layer, independent of any bug in
application code; Supabase's generated client and auth session handling removed most
authentication boilerplate; a `SECURITY DEFINER` Postgres function pattern was reusable across
every "shared global count/total" need (chat's daily count, the AI budget total, the Realtime
reservation) without ever introducing the `service_role` key into the app.

**Negative:** ties the real-mode deployment to a third-party managed service and its own
availability/pricing; schema changes are applied by re-running `supabase/schema.sql` by hand in the
SQL Editor rather than through a versioned migration tool (acceptable for this project's scale, but
noted in [operations.md](../operations.md) as a manual step to be careful with).
