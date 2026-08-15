# Housekeeping & scope notes

This doc records a cleanup pass over the repo, why each change was (or wasn't) made, and how the
finished project's scope compares against the original brief (`Illumia Case Study Assignment -
Eddie.docx`). It's meant to make the reasoning behind the repo's current state explicit for anyone
reviewing it, rather than requiring them to reconstruct it from commit history.

## What changed in this pass

| Change | Reasoning |
|---|---|
| Removed unused `postcss` and `autoprefixer` devDependencies | Leftover from an earlier scaffold. This project has no `postcss.config.js` or `tailwind.config.js`, and Tailwind v4 runs entirely through the `@tailwindcss/vite` plugin (see `vite.config.ts`) — confirmed via a repo-wide search that neither package was referenced anywhere before removing them. Fewer installed packages, fewer transitive-dependency vulnerabilities to track, no behavior change. |
| Fixed the one outstanding lint warning (`react-hooks/exhaustive-deps` in `AiTutorChat.tsx`) | The effect that auto-starts a quiz called `onAutoStartQuizHandled` without listing it as a dependency. Adding it naively would have been wrong: callers pass a fresh inline function on every render, so it would have re-fired the effect (and re-started the quiz) on unrelated re-renders. Fixed with the same "latest callback in a ref" pattern already used elsewhere in the file for `activities`, which keeps the effect correct without over-firing. |
| Deduplicated `.gitignore` | A `.env*` line had been appended near the bottom of the file in an earlier session, after an existing `.env` / `.env.*` / `!.env.example` block. Because gitignore rules are order-dependent, the later line re-ignored `.env.example` right after it had been un-ignored, which is confusing to read even though it happened not to break anything in practice (the file's already tracked in git). Consolidated to one clean block. |
| Deleted `docs/project-export-for-review.md` | A stale, untracked snapshot of the source tree from an earlier session (never `git add`-ed). It served no ongoing purpose, duplicated content that's now better explained in the README, and made the `docs/` folder look cluttered/unfinished to anyone browsing the repo. |
| Retitled the browser tab (`index.html`) | Was the raw package name `ai-learning-companion`; changed to `AI Learning Companion` since it's the first thing a reviewer sees in a browser tab. |
| Ran `npm audit fix` (non-breaking) | Applied automatically; see below for what's left and why. |

All of the above were verified against the existing checks after every change: `oxlint` (0
warnings), `tsc --noEmit` (0 errors), `vitest run` (78/78 passing), and `vite build` (succeeds).
Nothing here changes runtime behavior.

## What we deliberately left alone (and why)

- **10 remaining `npm audit` findings.** All of them are transitive dependencies of
  `@vercel/node` (a **devDependency** used only for the `VercelRequest`/`VercelResponse` TypeScript
  types in `api/*.ts` — Vercel's own build system compiles and runs those functions, this package's
  code doesn't ship or execute in the deployed app or the browser bundle). The only fix `npm audit`
  offers is `--force`, which downgrades `@vercel/node` to `3.0.1` — a breaking change to the
  API-route type definitions, for a package whose vulnerable code is never actually reachable at
  runtime. Breaking the build to silence a devDependency-only, unreachable finding is a worse
  trade than leaving it and documenting why.
- **No CI pipeline (e.g. GitHub Actions), at the time of this pass.** Would be reasonable on a real
  project, but this is a 3–6-hour take-home exercise per the brief; the equivalent value (fast,
  visible feedback that the build/tests/lint are green) was already provided locally and re-checked
  before every deploy. (Update: added later — see "Hardening pass after the incident" below.)
- **No folder restructuring.** The current `components/` / `data/` / `hooks/` / `services/` /
  `types/` split is conventional, already discoverable, and every file in it is used (verified by
  searching for references before writing this doc). Reorganizing into e.g. feature folders would
  churn a lot of import paths for no functional benefit and risks introducing regressions in a repo
  that currently has a clean baseline (tests/types/lint all green) — not worth the risk for a
  cosmetic reorg.
- **No `LICENSE` file.** This is a private take-home submission for a job application, not a
  package intended for public reuse or redistribution, so a license doesn't apply the way it would
  for an open-source project.

## Overdid or underdid, relative to the brief?

The brief (see box below) asks for a **3–6 hour**, **frontend-only** prototype: a single page, mock
or simulated AI, no auth/backend/database required, evaluated on product judgment and use of AI
tools — explicitly **not** evaluated on production-readiness or feature count.

> "Expected effort: 3–6 hours... We are not expecting a production-ready application... You do not
> need to build: Authentication / Backend services / A database / Production AI infrastructure /
> Or any other pages aside from the assigned page... A real LLM integration is optional. Mocked or
> simulated AI responses are acceptable."
> — *Illumia Case Study Assignment*

**Where this clearly overdid it:**

- **Time invested.** This went well past the suggested 3–6 hour box across multiple sessions —
  the brief is explicit that a bigger feature set isn't the goal, and that's worth stating plainly
  rather than implying otherwise.
- **Everything the brief says you don't need to build, we built anyway:** real Supabase
  authentication, a real Postgres database with Row Level Security, three serverless AI endpoints
  (`api/grade.ts`, `api/chat.ts`, `api/generate-quiz.ts`) backed by a real OpenAI integration,
  server-side rate limiting/abuse controls, and a multi-course switcher. None of this was required.
- **Why do it anyway:** to demonstrate what the natural "next version" of the brief-compliant
  prototype looks like, and because it was more interesting to build and demo live than to stop at
  the minimum. That's a legitimate reason for a portfolio piece, but it is *extra*, not evidence of
  better judgment about the assignment's actual ask — the brief is graded on focused problem-solving
  within a tight time box, not on how much can be added.
- **Mitigating the downside:** the brief-compliant experience is still the *default*. Opening the
  app with no environment configuration at all boots the required, frontend-only, mock-data "demo
  mode" (`App.tsx`) exactly as specified — real accounts/database/AI grading ("real mode",
  `RealApp.tsx`) only activate if a reviewer deliberately configures Supabase, so the required
  submission isn't buried under the optional one, but the optional one is undeniably a lot more
  surface area for a reviewer to have to wade through if they do look, which is a real cost of
  overdoing it, not just a neutral bonus.

**Where this matched the brief well:**

- **Single page, no routing.** Both demo mode and real mode are one page each — no router, no
  extra pages, respecting the brief's explicit "no other pages" instruction even while overbuilding
  elsewhere.
- **At least one meaningful AI interaction.** The brief asks for at least one; this shipped
  four (AI feedback/recommendations, a score-trend visualization, a generated learning plan, and an
  AI tutor chat) plus two independent real-LLM integrations. Comfortably exceeds the bar, and unlike
  the backend/infra work, this is squarely inside what the brief actually asked to be evaluated on.
- **Documented assumptions and tradeoffs.** The brief asks explicitly for this
  ("Explain your decisions and tradeoffs... document any assumptions"); the
  [ADR index](adr/README.md) and the README's "Operating assumptions" section address it directly,
  and this document extends that same practice to the cleanup pass itself.

**Where this arguably underdid it, relative to a "real" production repo (not the brief itself):**

- **No committed end-to-end test suite.** Verification (Playwright checks against the live
  deploy) happened ad hoc during development, not as a saved, repeatable suite. Reasonable for a
  take-home, but worth naming rather than leaving implicit. (A CI workflow for lint/unit-test/build
  was added later — see "Hardening pass after the incident" below — but it doesn't include these
  ad hoc end-to-end checks.)
- **Direct-to-`master` commits, no PR/branch workflow.** Already called out in the README's "Git
  workflow note" as a deliberate solo/demo speed trade-off, not an oversight.
- **Shared demo API keys/rate limits, not per-reviewer isolation.** The server-backed AI features
  use one shared OpenAI key with global caps (see
  [`security-and-privacy.md`](security-and-privacy.md)) rather than per-user provisioning —
  appropriate for a cost-bounded demo, not how a multi-tenant product would actually be built.

**Net assessment:** the brief's actual, graded scope (one page, one meaningful AI interaction,
documented assumptions, a working frontend prototype) is met and, on the AI-experience and
documentation criteria specifically, exceeded in ways that stay inside what's being evaluated. The
backend/auth/database work goes well beyond the brief in both time and surface area — genuinely
useful to demonstrate broader ability, but it's additive scope creep relative to the assignment as
written, not a sign that the minimal version was under-scoped. Both facts are worth saying rather
than only presenting the more impressive outcome.

## Security review

A pass was done specifically over the "real mode" backend (Supabase auth/RLS, the three serverless
API routes, client-side code) since that's the part of the project that goes beyond the brief and
therefore carries real security surface area that a frontend-only mock demo wouldn't have.

**What was already correct (no changes needed):**

- All three API routes (`api/grade.ts`, `api/chat.ts`, `api/generate-quiz.ts`) verify the caller's
  Supabase session server-side (`supabase.auth.getUser(token)`) and derive `userId` only from that
  verified token — never from a client-supplied id. Input strings are length-capped, and AI output
  is sanitized/capped before being returned to the browser.
- No use of `dangerouslySetInnerHTML`, `innerHTML`, `eval(`, `new Function(`, or `document.write`
  anywhere in `src/**` — no XSS injection vectors found.
- No hardcoded secrets in the repo; `.env` holds only the public Supabase URL and anon key (by
  design — this codebase never uses the Supabase `service_role` key anywhere, client or server).
- `src/data/liveAi.ts`'s "bring your own OpenAI key" client-side mode was already disclosed in the
  README as an accepted risk (the key lives only in component state for that browser tab, never
  persisted or sent anywhere but OpenAI directly).
- `courses`, `activities`, `profiles`, and `grading_events` all have owner-scoped RLS
  (`auth.uid() = user_id`) — verified no cross-user read/write path through any of them.
- No CSRF exposure: every API is stateless bearer-token authenticated, not cookie-session based.

**What was found and fixed:**

1. **Missing HTTP security headers.** No `vercel.json` existed, so the deployed site had no
   Content-Security-Policy, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or
   `Permissions-Policy`. Added `vercel.json` with all five, including a CSP whose `connect-src`
   allowlist (`'self'`, `https://*.supabase.co`, `https://api.openai.com`) was checked against
   every external URL actually used client-side (only one: the OpenAI endpoint in `liveAi.ts`) so
   it doesn't silently break anything. Verified live: headers are present on the production
   response.
2. **`chat_events` table let any signed-in user read every other user's rows.** `/api/chat.ts`
   enforces a *shared, global* (not per-user) daily AI-chat cap, which needs to count rows across
   all users. The RLS policy that made this possible —
   `for select using (auth.role() = 'authenticated')` — technically satisfied that requirement, but
   as a side effect let any signed-in user query `chat_events` directly via supabase-js/PostgREST
   (bypassing the app entirely) and see every other user's `user_id` and reply timestamps. Not
   message content (none is stored in that table), but still real cross-user metadata exposure that
   shouldn't have been readable outside the app.
   **Fix:** replaced that policy with an owner-only `auth.uid() = user_id` policy, and added a
   `SECURITY DEFINER` Postgres function (`chat_events_daily_count()`) that returns just the global
   count needed for the rate-limit check, without exposing any raw rows to the caller. Updated
   `api/chat.ts` to call `supabase.rpc('chat_events_daily_count')` instead of selecting from the
   table directly. This avoids introducing a `service_role` key anywhere in the app (which would
   have been the other way to solve this) while still closing the leak. Applied to the live
   database and verified the function returns a correct count; redeployed and confirmed the new
   headers and updated rate-limit check are live.

**What was found and consciously left as accepted/documented risk (not fixed):**

- **TOCTOU race on rate limits.** The count-check and the insert into `grading_events`/`chat_events`
  aren't atomic, so a burst of concurrent requests could theoretically exceed the stated per-hour/
  per-day limits before the insert lands. Building an atomic counter (e.g. a Postgres advisory lock
  or an atomic increment-and-check function) is reasonable for a real product but is more than this
  demo needs — the OpenAI account-level spend cap (see
  [`security-and-privacy.md`](security-and-privacy.md)) is the actual backstop against runaway
  cost, and the rate limits are best-effort UX, not the last line of defense.
- **Self-scoped prompt injection via user-supplied text** (e.g. course/activity titles fed into AI
  prompts). A user could try to manipulate the AI's response to *their own* request, but there's no
  path for it to affect any other user's data, session, or the server itself — worst case is a
  weird response to yourself, not a security boundary crossing.
- **Client-side "bring your own key" OpenAI mode** (`src/data/liveAi.ts`) — already disclosed in the
  README before this review; re-confirmed here as still accurate (key never leaves that browser tab
  except to call OpenAI directly).

## Shared global $5/day AI spend cap (added after the review above)

The per-feature rate limits above (grading, chat) bound *how often* one user or the whole app can
call OpenAI, but not the total dollar cost if every limit were hit simultaneously — and by this
point three more AI endpoints (`generate-diagnostic.ts`, `observe-screen.ts`,
`save-session-summary.ts`) had been added, each with its own separate limit. Rather than reason
about worst-case spend as a sum of six independent caps, `api/_aiBudget.ts` adds one shared backstop
that all six endpoints check before calling OpenAI:

- Each OpenAI response's `usage.prompt_tokens`/`completion_tokens` is converted to an estimated USD
  cost at `gpt-4o-mini` pricing and logged to `ai_usage_events` (owner-scoped RLS, same pattern as
  `chat_events`/`grading_events`).
- A `SECURITY DEFINER` function, `ai_usage_daily_cost_usd()`, sums the last 24h of estimated cost
  across *all* users without exposing per-row data to callers — same reasoning as
  `chat_events_daily_count()` above: the check needs a global total, not per-user RLS access.
- Every endpoint calls it before making an OpenAI request and returns `429` once the rolling 24h
  total hits **$5**, regardless of which feature or user caused it. It fails *open* (allows the
  call) if the RPC itself errors, matching the existing `chat_events_daily_count()` behavior, so a
  transient DB hiccup degrades to "no extra cap" rather than "AI features go down."
- This sits *underneath* the OpenAI dashboard's own account-wide monthly spend limit (see
  [`security-and-privacy.md`](security-and-privacy.md)) — the $5/day cap is enforced by the app
  itself and resets daily; the dashboard limit is the final, provider-side backstop and only
  resets monthly.

## Realtime voice cost containment and abuse protection

Realtime audio/image usage is metered differently from normal chat completions, so it has a
separate conservative control path:

- Uses lower-cost `gpt-realtime-2.1-mini` rather than the full Realtime model.
- `reserve_realtime_ai_budget()` takes a Postgres advisory lock and reserves exactly **$0.75**
  before a session starts. It rejects null, negative, or caller-selected reservation amounts and
  refuses admission when the reservation would exceed the shared **$5 rolling daily cap**.
- Reservation and budget lookup failures are fail-closed for voice. An infrastructure problem
  therefore disables new/active voice sessions rather than disabling cost enforcement.
- Every `response.done` reports cumulative text-input/output, audio-input/output, and image-input
  token totals. The server stores monotonic token counts plus separate modality costs in
  `ai_usage_events`; stale reports cannot reduce previously recorded usage.
- The browser checks budget every five seconds and stops WebRTC immediately at either the **$0.75
  session ceiling** or the **$5 combined daily ceiling**. Sessions also stop after ten minutes and
  are limited to three starts/hour and ten/day per user.
- The OpenAI organization is independently verified at a **$10 monthly hard limit** with
  enforcement enabled. That provider-side `429` remains the final backstop against application
  bugs, concurrency, or missing client reports.

## Mobile optimization

The deployed app is designed for phones and tablets as well as desktop: multi-column dashboard
grids collapse to one column, the AI tutor becomes a floating-action-button drawer, controls wrap
instead of overlapping, and drawers/dialogs use viewport-safe sizing. This keeps diagnostics,
quizzes, activity feedback, voice controls, and progress views available on narrow screens rather
than maintaining a reduced mobile-only feature set.

## Production incident: invalid `OPENAI_API_KEY` after deploy (2026-08-15)

**What happened:** shortly after a deploy, AI-backed features (e.g. the review-queue quiz
generation) started failing in production with OpenAI's own `Incorrect API key provided` error
surfaced directly to the user. `vercel env ls production` showed `OPENAI_API_KEY` was present, but
the stored value didn't match any key OpenAI still considered valid — most likely a stale/incorrect
value carried over from unrelated concurrent work on the same shared environment, not a code bug
(billing/quota was fine: OpenAI's usage dashboard showed $0.01 of a $10 limit spent).

**Why this class of bug is easy to miss:** `api/generate-quiz.ts` (and the other five AI endpoints)
forward OpenAI's raw `error.message` straight to the client on a non-`ok` response
(`res.status(502).json({ error: body?.error?.message || ... })`). That's why the *exact* OpenAI
wording reached the browser instead of a generic failure message — convenient for debugging this
incident quickly, but also a minor information-disclosure smell worth hardening later (log the raw
error server-side only, return a generic message to the client).

**Fix:** generated a fresh OpenAI secret key (`illumia-prod`, scoped to the same project/permissions
as the key it replaced), rotated it into Vercel (`vercel env rm` + `vercel env add
OPENAI_API_KEY production`, entered interactively so the key value was never pasted into chat or
logs), and redeployed. Verified fixed by re-running the previously-failing action in the app.

**Follow-up not yet done:** revoke the old broken key on the OpenAI dashboard now that it's
confirmed unused.

## Hardening pass after the incident (2026-08-15)

Two of the gaps flagged above (and by the incident itself) were quick, low-risk fixes and worth
doing rather than just documenting:

- **Raw OpenAI error messages no longer reach the client.** `api/chat.ts`, `api/generate-quiz.ts`,
  and `api/grade.ts` used to forward `body?.error?.message` straight from OpenAI's response into the
  `502` sent to the browser — convenient for debugging the key-rotation incident quickly, but an
  information-disclosure smell in general (leaks upstream-provider internals to end users). Now all
  three `console.error` the real message server-side (visible in Vercel logs) and return a fixed
  generic message instead, matching the pattern `api/generate-diagnostic.ts`,
  `api/observe-screen.ts`, and `api/save-session-summary.ts` already used.
- **Added a CI workflow** (`.github/workflows/ci.yml`) that runs `npm run lint`, `npm run test --
  run`, and `npm run build` on every push to `master` and every pull request. Previously these
  checks were only ever run manually/locally before a deploy — this makes "tests/lint/build are
  green" a guarantee rather than a habit.

**Left as-is, deliberately:** the TOCTOU race on rate-limit counters (would need an atomic
Postgres function replacing the current count-then-insert pattern across five tables/endpoints —
a bigger, riskier change to the live schema than the two fixes above) and the single-developer/
no-peer-review/shared-workspace gaps, none of which a code change can fix.
