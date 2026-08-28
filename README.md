# AI Learning Companion (Illumia Case Study Prototype)

**[Live demo →](https://illumia-one.vercel.app)**

A frontend prototype of an **AI Learning Companion** that helps a learner understand their
progress, strengths, and areas for improvement, and get personalized AI-powered guidance on
what to learn next, built for the Illumia software engineering case study.

![Dashboard screenshot showing the study session tracker, screen learning observer, and live AI tutor chat with voice tutor in dark mode](docs/screenshot.png)

> The screenshot above is the optional "real mode" (signed-in, Supabase + OpenAI-backed)
> experience: clicking "Live demo" now takes you to its sign-in screen. The frontend-only,
> no-login "demo mode" described throughout this README (and required by the brief) is what
> you get by running the app locally without Supabase configured. See "Getting started".

## What this is

A single-page React + TypeScript dashboard for a learner working through a "React Development"
track. It shows:

- **Progress overview**: overall completion percentage for the learning track.
- **Score trend**: a small line chart plotting AI feedback scores across graded activities over
  time, so a learner can see whether they're trending up or down at a glance (`src/components/ProgressTrend.tsx`).
- **Strengths & areas for improvement**: a summary generated from the learner's activity history.
- **Recommended next step**: a single, clear "what to do next" recommendation with reasoning.
- **AI-generated learning plan**: a short, ordered list of next steps generated from the
  learner's in-progress work, recommendation, and improvement areas (see
  `src/data/learningPlan.ts`).
- **Activity list**: lessons, coding exercises, and quizzes with completion status. Completed
  items with AI feedback can be expanded to reveal a score, strengths, and suggestions (matching
  the "Evaluate Learner Work" example from the case study).
- **AI tutor chat**: real mode uses a server-backed OpenAI tutor that uses a Socratic teaching
  style (guiding questions/hints before full answers on conceptual questions); demo mode keeps a
  zero-setup simulated fallback and optional bring-your-own-key path.
- **Adaptive learning loop**: a course diagnostic establishes topic baselines, quiz/graded-work
  evidence updates topic mastery, an SM-2-style queue schedules review, and the plan prioritizes
  due reviews and weak topics.
- **Live voice tutor**: secure OpenAI Realtime/WebRTC conversation with spoken responses,
  transcripts, mute, interruption, a 10-minute cutoff, and live spending status.
- **Screen learning observer**: with explicit consent, samples changed frames, builds a timeline,
  and proposes progress updates that require confirmation. An optional bridge shares changed,
  reduced screen samples plus sanitized context with the voice tutor, never continuous video.
- **Learning diary, voice notes, and presence**: saves AI session summaries, records downloadable
  local voice notes, and can pause observation when local-only face detection reports away.
- **Dark mode**: a manual light/dark toggle that respects the system preference by default and
  persists the learner's choice.
- **Mobile-optimized layout**: responsive grids collapse into a single-column dashboard, the AI
  tutor moves into a touch-friendly drawer/FAB, controls wrap without overlap, and dialogs use
  viewport-safe sizing for phones and tablets.

The app preserves a frontend-only demo mode, while the deployed real mode adds Supabase
authentication/persistence and authenticated Vercel AI endpoints.

## Documentation

This README is a short index. The reasoning and current-state detail live in focused docs:

- [`docs/architecture.md`](docs/architecture.md): system components, demo vs. real mode, request
  flows, trust boundaries, tech stack, and project structure.
- [`docs/security-and-privacy.md`](docs/security-and-privacy.md): auth/RLS, rate limits, the
  shared AI budget cap, Realtime voice budget enforcement, consent controls, and data retention.
- [`docs/adaptive-learning.md`](docs/adaptive-learning.md): mastery scoring, diagnostics, and the
  SM-2-style spaced review schedule.
- [`docs/operations.md`](docs/operations.md): setup, deployment, key rotation, and troubleshooting.
- [`docs/adr/`](docs/adr/README.md): architecture decision records: what was chosen, what
  alternatives were considered, and why.
- [`docs/housekeeping-and-scope.md`](docs/housekeeping-and-scope.md): a candid audit of where this
  project stayed inside the case study's scope, where it went beyond it (and why), a security
  review, and production incident history.

**In short:** the case study describes four learner needs (understand progress, get feedback, see
improvement areas, know what to do next) and explicitly excludes extra pages. This prototype
answers all four from one dashboard plus one deep AI interaction (the tutor chat), rather than
spreading effort across many shallow features or a multi-step wizard, see
[ADR-0001](docs/adr/0001-single-page-dashboard-over-wizard.md) for the full reasoning.

## Built with AI assistance

In the spirit of the case study's evaluation criteria ("use AI tools while applying your own
judgment"), this prototype was built using GitHub Copilot (Claude) as a pair-programming
assistant. AI tooling was used to:

- Scaffold boilerplate (Vite/React/TypeScript/Tailwind setup)
- Generate component and type code from a design I specified
- Extract and parse the original case study `.docx` into plain text

Product decisions, what to build, what to leave out, how to prioritize the four learner needs,
how AI should show up in the experience, and what assumptions to make, were made deliberately
and are documented above and below, not left to the AI tool's default suggestions.

**Git workflow note.** Early prototype commits favored speed; later features use validated feature
branches before merging to `master`, and CI (lint/test/build) runs on every push and pull request.
A team project would additionally require mandatory PR review.

## Tech stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) for the dev server and build
- [Tailwind CSS v4](https://tailwindcss.com/) for responsive styling, with a class-based dark mode
- [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/react) for
  100+ tests across components, data logic, privacy, and WebRTC lifecycle

## AI tutor modes

The tutor supports three modes:

1. **Server-backed text AI** in real mode, authenticated through Supabase and using a server-only
  OpenAI key.
2. **Live voice AI** using OpenAI Realtime over WebRTC. The browser sends an SDP offer to an
  authenticated Vercel endpoint; the permanent OpenAI key remains server-side.
3. **Demo/BYOK fallback** with simulated responses by default or a learner-supplied key held only
  in the current browser tab.

To use the optional BYOK mode:

1. Open the chat panel and click **"Connect a real AI (optional)"**.
2. Paste an [OpenAI API key](https://platform.openai.com/api-keys) you control.
3. Ask a question. It's sent directly from your browser to OpenAI's Chat Completions API.

This is a demo pattern, not a production one: the key lives only in that tab's component state,
is never persisted, and is never sent anywhere except OpenAI's API directly. See
[docs/security-and-privacy.md](docs/security-and-privacy.md) for the full security model,
including Realtime voice's budget reservation and rate limits.

## Real mode (optional): accounts, persistence, and AI-graded courses

By default this app runs as the **demo prototype** described above: one fixed learner, mock data,
nothing persists. There's also an optional **real mode** that turns it into something you can
actually use for your own learning:

- **Real accounts**: email/password sign-up and sign-in via [Supabase Auth](https://supabase.com/auth).
- **Persisted courses and activities**: stored in a Postgres database with Row Level Security, so
  each learner only ever sees their own data, and progress survives a reload.
- **Multiple, customizable courses**: pick from a few presets (`src/data/coursePresets.ts`: React,
  Python, JavaScript, Data Structures & Algorithms) or build your own by naming a course and
  listing topics.
- **AI-graded activities**: submit an answer/code for any activity and a serverless function
  (`api/grade.ts`) grades it with OpenAI, using a **server-only** API key that never reaches the
  browser (unlike the client-side "bring your own key" tutor chat above).
- **Server-backed AI tutor chat**: once signed in, the tutor chat panel answers with real OpenAI
  responses by default via another serverless function (`api/chat.ts`), using the same server-only
  key. No key needed from the learner; the "bring your own key" panel is still there as an
  alternative. Shared across all users by a global daily cap (see below), since this is a demo, not
  a paid product.

Real mode activates automatically once Supabase is configured; otherwise the app falls back to the
demo experience, so the existing [live demo](https://illumia-one.vercel.app) keeps working
unchanged. You can also test server-backed AI without your own OpenAI key via the
[live demo](https://illumia-one.vercel.app) or the "bring your own key" chat option above.

Full setup steps (Supabase project, schema, environment variables, local `vercel dev` proxy) are in
[docs/operations.md](docs/operations.md#enabling-real-mode-supabase--openai).

AI grading and tutor chat share a server-side OpenAI key, so several layers of protection keep
costs bounded even if the app is left publicly reachable: per-user rate limits, a shared $5/day
AI spend cap, a $0.75-per-session Realtime voice reservation, and a $10/month OpenAI account-wide
hard limit. Full detail in [docs/security-and-privacy.md](docs/security-and-privacy.md).

## Getting started

Requires [Node.js](https://nodejs.org/) 18+ and npm.

```bash
npm install
npm run dev
```

Open the URL printed in the terminal (typically http://localhost:5173/). See
[docs/operations.md](docs/operations.md) for running tests, building for production, enabling real
mode, deploying, and troubleshooting.

## Project structure and AI experience reasoning

See [docs/architecture.md](docs/architecture.md) for the full project structure, request flows,
and trust boundaries, and [docs/adaptive-learning.md](docs/adaptive-learning.md) for how mastery,
diagnostics, and spaced review connect assessment back to planning.

## Operating assumptions

Since the case study intentionally leaves some details open, the following assumptions were made:

- **Demo and real modes remain separate.** Demo mode uses one mock learner and no setup; real mode
  supports authenticated learners, persisted multi-course data, and server-backed AI.
- **AI grading evaluates submitted text/code but does not execute untrusted code.** This keeps the
  server boundary simple and avoids presenting model feedback as runtime verification.
- **One recommended next step at a time**, rather than a full ranked list, to keep the "what
  should I do next" decision simple and actionable.
- **AI evidence is advisory.** Diagnostics, mastery updates, and screen observations adapt the
  plan, but screen-inferred progress is never applied without learner confirmation.
- **Sensitive permissions are independent.** Screen, microphone, camera-presence, voice, diary
  upload, and the screen-to-voice bridge can be started/stopped separately.
- **Single page**: the AI tutor is presented as a panel within the same dashboard page rather
  than a separate page/route, since the brief asks for no additional pages.

## Possible next steps

The main remaining work is evaluation rather than feature count: measure whether tutoring and
review scheduling improve later scores, add learner challenge/feedback flows for AI grading, and
redact likely secrets before sampled screen frames leave the browser.

- **Token streaming (SSE):** in a production implementation, `aiService.ts` would consume a
  Server-Sent Events (SSE) `ReadableStream` from a backend API rather than resolving a single
  Promise, rendering AI tutor responses token-by-token in real time instead of all at once.
- **Implemented beyond the brief: automatic live progress tracking.** Screen sharing (explicit
  consent required) samples reduced frames for live, privacy-filtered observations that require
  learner confirmation before updating progress; an in-app Study Session Tracker (Page
  Visibility/focus events only, nothing leaves the browser) runs alongside it. See
  [docs/architecture.md](docs/architecture.md#request-flows) for the full data flow and
  [docs/security-and-privacy.md](docs/security-and-privacy.md#data-retention) for what is/isn't
  persisted or uploaded.
