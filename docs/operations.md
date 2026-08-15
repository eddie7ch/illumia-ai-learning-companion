# Operations

Setup, deployment, and runbook reference for maintaining this project. For *why* Supabase and
Vercel specifically were chosen, see [ADR-0002](adr/0002-supabase-for-auth-and-persistence.md) and
[ADR-0003](adr/0003-vercel-serverless-functions.md).

## Local development

Requires [Node.js](https://nodejs.org/) 18+ and npm.

```bash
npm install
npm run dev
```

Open the URL printed in the terminal (typically `http://localhost:5173/`). This runs the frontend
only — demo mode works with zero further setup.

**Running the automated test suite:**

```bash
npm run test
```

**Production build:**

```bash
npm run build
npm run preview
```

## Enabling real mode (Supabase + OpenAI)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the project's SQL Editor, run [`supabase/schema.sql`](../supabase/schema.sql) once. This is a
   single idempotent script (uses `create table if not exists` / `add column if not exists`
   throughout), not a versioned migration chain — safe to re-run after pulling schema changes.
3. Copy `.env.example` to `.env` and fill in the project's **URL** and **anon public key** (Project
   Settings → API). Both are safe to expose client-side — RLS, not secrecy of this key, protects
   each learner's data.
4. Set these as **server-only** environment variables (Vercel dashboard for a deployed app, or a
   local `.env` read by `vercel dev`) — never commit them or paste them into client code:
   - `OPENAI_API_KEY` — used by every `api/*.ts` endpoint that calls OpenAI.
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — same values as step 3 (every serverless
     function re-validates the caller's session token independently of the browser).
5. Run `npm run dev` (or deploy) — once the Supabase variables are present, the app boots into real
   mode and prompts sign-up.

> **Local API note:** `npm run dev` serves the frontend at `http://localhost:5173`; its `/api`
> requests proxy to a separate `npx vercel dev --listen 3000` process. The live deployment needs no
> local setup at all.

## Deploying

```bash
npx vercel --prod --yes
```

This builds and deploys the current branch to the production alias
([illumia-one.vercel.app](https://illumia-one.vercel.app)). Standard flow used for this project:

1. Land changes on a short-lived feature/fix branch.
2. Run `npm run lint`, `npm run test -- --run`, and `npm run build` locally — all three must pass.
3. Push the branch, fast-forward merge into `master`, push `master`.
4. Deploy from `master` with the command above.
5. Spot-check the live URL (and any changed endpoints) after deploy.

## Rotating the OpenAI key

If a key is suspected invalid, leaked, or needs rotation:

```bash
vercel env rm OPENAI_API_KEY production
vercel env add OPENAI_API_KEY production   # paste interactively — never as a command-line arg,
                                            # so it isn't left in shell history or chat logs
npx vercel --prod --yes                    # redeploy so the new value takes effect
```

Then revoke the old key on the
[OpenAI dashboard](https://platform.openai.com/settings/organization/api-keys) once the new one is
confirmed working. See `housekeeping-and-scope.md`'s "Production incident" entry for a real example
of this procedure.

## Verifying budget/security safeguards after a deploy

Quick smoke tests that don't require a real OpenAI spend:

```bash
# Unauthenticated calls to authenticated endpoints must return 401
curl -s -o NUL -w "%{http_code}" -X POST "https://illumia-one.vercel.app/api/realtime-session" -H "Content-Type: application/json" -d "{}"
curl -s -o NUL -w "%{http_code}" -X POST "https://illumia-one.vercel.app/api/realtime-usage" -H "Content-Type: application/json" -d "{}"
```

Both should return `401`. See [security-and-privacy.md](security-and-privacy.md) for the full
control list these protect.

**Verifying the OpenAI hard limit:** OpenAI dashboard →
[Limits](https://platform.openai.com/settings/organization/limits) → confirm "Monthly spend limit"
and that **Enforce a hard limit** is enabled (not just an alert).

**Verifying the Supabase reservation function:** in the Supabase SQL Editor —

```sql
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'ai_usage_events'
  and column_name in ('session_id', 'reservation_usd', 'actual_cost_usd');

select routine_name from information_schema.routines
where routine_schema = 'public' and routine_name = 'reserve_realtime_ai_budget';
```

## Rollback

Since deploys are simple `git`-branch-to-`master` merges plus `vercel --prod`:

```bash
git revert <bad-commit-sha>   # or: git reset --hard <last-good-sha> if not yet shared further
git push
npx vercel --prod --yes
```

Vercel also retains prior deployments — `vercel rollback` (or re-aliasing a previous deployment URL
from the Vercel dashboard) is a faster option if the last-known-good build is still available and
no destructive database migration needs undoing.

## Common failures

| Symptom | Likely cause | Fix |
|---|---|---|
| AI endpoints return OpenAI's raw "Incorrect API key provided" | Stale/invalid `OPENAI_API_KEY` in the Vercel environment | Rotate the key (above) |
| `429` from any AI endpoint | Per-user rate limit, shared daily budget, or account-wide OpenAI limit hit | Expected behavior — see [security-and-privacy.md](security-and-privacy.md); wait for the relevant reset window |
| Voice session stops immediately with a budget error | `$0.75` session or `$5` daily reservation ceiling reached, or the budget heartbeat call failed | Expected fail-closed behavior; check `ai_usage_events` and the OpenAI dashboard spend |
| Real mode doesn't activate locally | `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` missing from `.env` | Re-check step 3 above |
| `/api/*` calls fail under plain `npm run dev` | The separate `vercel dev` proxy process isn't running | See the "Local API note" above |
