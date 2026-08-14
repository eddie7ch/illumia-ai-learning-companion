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
- **No CI pipeline (e.g. GitHub Actions).** Would be reasonable on a real project, but this is a
  3–6-hour take-home exercise per the brief; the equivalent value (fast, visible feedback that the
  build/tests/lint are green) is already provided locally and re-checked before every deploy. Listed
  as a "possible next step" in the README rather than built, so the reasoning is visible either way.
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
  ("Explain your decisions and tradeoffs... document any assumptions"); the README's "Approach &
  design decisions" and "Assumptions made" sections address it directly, and this document extends
  that same practice to the cleanup pass itself.

**Where this arguably underdid it, relative to a "real" production repo (not the brief itself):**

- **No CI, no committed end-to-end test suite.** Verification (Playwright checks against the live
  deploy) happened ad hoc during development, not as a saved, repeatable suite. Reasonable for a
  take-home, but worth naming rather than leaving implicit.
- **Direct-to-`master` commits, no PR/branch workflow.** Already called out in the README's "Git
  workflow note" as a deliberate solo/demo speed trade-off, not an oversight.
- **Shared demo API keys/rate limits, not per-reviewer isolation.** The server-backed AI features
  use one shared OpenAI key with global caps (see README's "Cost controls & abuse prevention")
  rather than per-user provisioning — appropriate for a cost-bounded demo, not how a multi-tenant
  product would actually be built.

**Net assessment:** the brief's actual, graded scope (one page, one meaningful AI interaction,
documented assumptions, a working frontend prototype) is met and, on the AI-experience and
documentation criteria specifically, exceeded in ways that stay inside what's being evaluated. The
backend/auth/database work goes well beyond the brief in both time and surface area — genuinely
useful to demonstrate broader ability, but it's additive scope creep relative to the assignment as
written, not a sign that the minimal version was under-scoped. Both facts are worth saying rather
than only presenting the more impressive outcome.
