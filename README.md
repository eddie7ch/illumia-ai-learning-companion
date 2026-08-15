# AI Learning Companion (Illumia Case Study Prototype)

**[Live demo →](https://illumia-one.vercel.app)**

A frontend prototype of an **AI Learning Companion** that helps a learner understand their
progress, strengths, and areas for improvement, and get personalized AI-powered guidance on
what to learn next — built for the Illumia software engineering case study.

![Dashboard screenshot showing progress, score trend, strengths, recommended next step, learning plan, and AI tutor chat in dark mode](docs/screenshot.png)

## What this is

A single-page React + TypeScript dashboard for a learner working through a "React Development"
track. It shows:

- **Progress overview** — overall completion percentage for the learning track.
- **Score trend** — a small line chart plotting AI feedback scores across graded activities over
  time, so a learner can see whether they're trending up or down at a glance (`src/components/ProgressTrend.tsx`).
- **Strengths & areas for improvement** — a summary generated from the learner's activity history.
- **Recommended next step** — a single, clear "what to do next" recommendation with reasoning.
- **AI-generated learning plan** — a short, ordered list of next steps generated from the
  learner's in-progress work, recommendation, and improvement areas (see
  `src/data/learningPlan.ts`).
- **Activity list** — lessons, coding exercises, and quizzes with completion status. Completed
  items with AI feedback can be expanded to reveal a score, strengths, and suggestions (matching
  the "Evaluate Learner Work" example from the case study).
- **AI tutor chat** — real mode uses a server-backed OpenAI tutor; demo mode keeps a zero-setup
  simulated fallback and optional bring-your-own-key path.
- **Adaptive learning loop** — a course diagnostic establishes topic baselines, quiz/graded-work
  evidence updates topic mastery, an SM-2-style queue schedules review, and the plan prioritizes
  due reviews and weak topics.
- **Live voice tutor** — secure OpenAI Realtime/WebRTC conversation with spoken responses,
  transcripts, mute, interruption, and a 15-minute safety cutoff.
- **Screen learning observer** — with explicit consent, samples changed frames, builds a timeline,
  and proposes progress updates that require confirmation. An optional bridge shares only
  sanitized observation text with the voice tutor, never raw frames.
- **Learning diary, voice notes, and presence** — saves AI session summaries, records downloadable
  local voice notes, and can pause observation when local-only face detection reports away.
- **Dark mode** — a manual light/dark toggle that respects the system preference by default and
  persists the learner's choice.

The app preserves a frontend-only demo mode, while the deployed real mode adds Supabase
authentication/persistence and authenticated Vercel AI endpoints.

## Approach & design decisions

_For a candid look at where this project stayed inside the case study's scope, where it went
beyond it (and why), and what a later cleanup pass changed and deliberately left alone, see
[`docs/housekeeping-and-scope.md`](docs/housekeeping-and-scope.md)._

**Problem framing.** The case study describes four learner needs: understand progress, get
feedback, see improvement areas, and know what to do next. Rather than spreading effort across
many shallow features, I prioritized a single, coherent dashboard that answers all four
questions at a glance, plus one deep, meaningful AI interaction (the tutor chat) rather than
several shallow ones. This matches the brief's emphasis on "rapidly build a polished and
functional prototype" over feature count.

**Why a dashboard + chat, not a wizard or multi-step flow.** Learners returning to a learning
platform want an immediate answer to "where do I stand and what's next," so the landing view
leads with progress and the recommendation, with activity detail and open-ended Q&A available
but not forced.

**Why feedback is inline/expandable rather than a separate page.** The brief explicitly excludes
additional pages. Expanding feedback in place keeps the activity list scannable while still
surfacing the score/strengths/suggestions structure from the "Evaluate Learner Work" example.

**Why keep a simulated tutor alongside real AI.** The brief accepts mocked AI, so demo mode keeps a
zero-setup keyword responder. Real mode adds authenticated text and Realtime voice AI, while BYOK
remains an optional fallback. This keeps the core reviewable without credentials and still
demonstrates secure production-style integration.

**Why Tailwind CSS v4.** Chosen for fast, consistent, responsive styling without hand-rolled CSS,
keeping the component code focused on structure and behavior.

**Why an AI-generated learning plan in addition to a single recommendation.** The case study lists
"an AI-generated learning plan" as one of several optional AI experiences. A single "next step"
recommendation answers *what's next*, but a short plan (`src/data/learningPlan.ts`) better answers
*what does my next stretch of learning look like*, by sequencing the in-progress activity, the
recommendation, upcoming activities tied to improvement areas, and a reminder to lean on existing
strengths. It's implemented as a small deterministic function (not a real LLM call) so its
reasoning is transparent and unit-testable.

**Why mastery, diagnostics, and spaced review.** Completion alone does not show retention. A
diagnostic establishes the starting point, topic evidence updates an explainable mastery score,
and spaced reviews close the loop from assessment back to planning.

**Why voice and screen context use separate permissions.** Voice makes tutoring natural; screen
context makes it specific. They remain independently controlled: WebRTC handles audio, the
observer samples only changed frames, progress changes require confirmation, and the voice bridge
receives sanitized descriptions rather than screenshots or video.

**Why a small automated test suite.** The case study doesn't require production-readiness, but a
focused set of tests (pure-function unit tests for the learning plan generator, plus component
tests for feedback expansion, progress display, and the chat flow) demonstrates the same care I'd
apply to real product code, without over-investing in test infrastructure for a 3-6 hour exercise.

**Why this is deployed live, even though the brief doesn't require it.** A hosted link
([illumia-one.vercel.app](https://illumia-one.vercel.app)) lets a reviewer open the working
prototype in one click, on any device, with zero setup — no cloning the repo, installing Node,
or running `npm install`/`npm run dev` first. It also doubles as a quick sanity check that the
build actually works outside my own machine, not just in local dev.

## Built with AI assistance

In the spirit of the case study's evaluation criteria ("use AI tools while applying your own
judgment"), this prototype was built using GitHub Copilot (Claude) as a pair-programming
assistant. AI tooling was used to:

- Scaffold boilerplate (Vite/React/TypeScript/Tailwind setup)
- Generate component and type code from a design I specified
- Extract and parse the original case study `.docx` into plain text

Product decisions — what to build, what to leave out, how to prioritize the four learner needs,
how AI should show up in the experience, and what assumptions to make — were made deliberately
and are documented above and below, not left to the AI tool's default suggestions.

**Git workflow note.** Early prototype commits favored speed; later features use validated feature
branches before merging to `master`. A team project would additionally require PR review and CI.

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
3. Ask a question — it's sent directly from your browser to OpenAI's Chat Completions API.

Security notes (this is a demo pattern, not a production one):

- The key lives only in component state for the current tab and is **never persisted**
  (no `localStorage`/cookies) and never sent anywhere except OpenAI's API.
- Calling a third-party API directly from the browser means the key is visible in that browser's
  network requests — acceptable for briefly demoing your *own* key, but a real product would
  proxy this call through a backend so the key never reaches the client.
- If the request fails (bad key, network error, timeout), the chat automatically falls back to
  the simulated responder and shows an inline notice rather than breaking the experience.
- Live voice uses `gpt-realtime-2.1-mini`, is rate-limited, reserves $0.75 before connecting, and
  automatically stops after 10 minutes. Screen images reach voice only after explicit opt-in.

## Real mode (optional): accounts, persistence, and AI-graded courses

By default this app runs as the **demo prototype** described above: one fixed learner, mock data,
nothing persists. There's also an optional **real mode** that turns it into something you can
actually use for your own learning:

- **Real accounts** — email/password sign-up and sign-in via [Supabase Auth](https://supabase.com/auth).
- **Persisted courses and activities** — stored in a Postgres database with Row Level Security, so
  each learner only ever sees their own data, and progress survives a reload.
- **Multiple, customizable courses** — pick from a few presets (`src/data/coursePresets.ts`: React,
  Python, JavaScript, Data Structures & Algorithms) or build your own by naming a course and
  listing topics.
- **AI-graded activities** — submit an answer/code for any activity and a serverless function
  (`api/grade.ts`) grades it with OpenAI, using a **server-only** API key that never reaches the
  browser (unlike the client-side "bring your own key" tutor chat above).
- **Server-backed AI tutor chat** — once signed in, the tutor chat panel answers with real OpenAI
  responses by default via another serverless function (`api/chat.ts`), using the same server-only
  key. No key needed from the learner; the "bring your own key" panel is still there as an
  alternative. Shared across all users by a global daily cap (see below), since this is a demo, not
  a paid product.

Real mode activates automatically once Supabase is configured; otherwise the app falls back to the
demo experience, so the existing [live demo](https://illumia-one.vercel.app) keeps working
unchanged.

**Testing the server-backed AI (grading/chat) without setting up your own OpenAI key:** either use
the [live demo](https://illumia-one.vercel.app) directly (already configured with the maintainer's
key, subject to the shared cost caps below), or use the "bring your own key" option in the chat
panel (see [AI tutor modes](#ai-tutor-modes) above) with your own OpenAI key — that one
works locally under plain `npm run dev` too, no Supabase or `vercel dev` required. Running the
server-backed grading/chat/quiz-generation functions yourself (locally or on your own deployment)
always requires your own OpenAI key and Supabase project, per the setup steps below.

### Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. In the project's SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql) once to create the
  learner, course, activity, mastery, review, diary, usage, and rate-limit records with RLS.
3. Copy `.env.example` to `.env` and fill in your project's **URL** and **anon public key** (Project
   Settings → API). Both are safe to expose client-side — Supabase's Row Level Security, not
   secrecy of this key, is what protects each user's data.
4. For AI grading and tutor chat, set these as **server-only** environment variables (in Vercel's
   dashboard for a deployed app, or a local `.env` read by `vercel dev`) — never commit them or
   paste them into client code:
   - `OPENAI_API_KEY` — your own OpenAI key, used by both `api/grade.ts` and `api/chat.ts`.
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — same values as step 3 (both serverless
     functions re-validate the caller's session token independently of the browser).
5. Run `npm run dev` (or deploy) — once `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are present,
   the app boots into real mode and prompts you to sign up.

> **Local AI note:** use `npm run dev` for the frontend at `http://localhost:5173`; its `/api`
> requests proxy to a separate `npx vercel dev --listen 3000` process. The learner-facing URL
> remains port 5173. The live deployment needs no local setup.

### Cost controls & abuse prevention

Since AI grading and tutor chat both call OpenAI using a shared server-side key, several layers of
protection keep costs bounded even if the app is left publicly reachable:

- **Per-user rate limiting on grading** — `api/grade.ts` caps each signed-in user at **15 grading
  calls/hour** and **50/day**, enforced server-side via a `grading_events` log table (see
  `supabase/schema.sql`) with its own owner-scoped RLS policy. Requests over the limit get a `429`
  before any OpenAI call is made, so a single account can't drive up spend.
- **Shared global daily limit on tutor chat** — `api/chat.ts` caps the *whole app* at **100
  server-backed chat replies/day** (not per-user, since this is a demo cost cap rather than
  per-account abuse prevention), tracked via a `chat_events` table. Once the shared cap is hit for
  the day, the chat falls back to a simulated response with a notice until it resets.
  Cost-wise, each reply is a small `gpt-4o-mini` call (~500 input tokens of prompt/history +
  up to 200 output tokens), roughly **$0.0002 per chat**. At the full 100/day cap that's about
  **$0.02/day, or under $1/month** even if the limit is hit every single day — well inside the
  $10/month account-wide cap below.
- **Shared global $5/day AI spend cap across every endpoint** — `api/_aiBudget.ts` estimates the
  USD cost (from each OpenAI response's `usage.prompt_tokens`/`completion_tokens`, at `gpt-4o-mini`
  pricing) of every call made by `chat.ts`, `grade.ts`, `generate-quiz.ts`,
  `generate-diagnostic.ts`, `observe-screen.ts`, and `save-session-summary.ts`, and logs it to an
  `ai_usage_events` table. Before making an OpenAI call, every endpoint checks the combined
  estimated spend across all of them for the last 24 hours (via the `ai_usage_daily_cost_usd()`
  Postgres function) and returns a `429` once it reaches **$5**, regardless of which feature or
  user is responsible. Realtime voice fails closed unless an atomic **$0.75 reservation** succeeds;
  each `response.done` stores separate text/audio/image token counts and costs, and a 5-second
  heartbeat stops WebRTC at the session or combined daily ceiling. Reservations never reconcile
  below $0.75, intentionally overcounting rather than risking an unexpected bill.
- **OpenAI account-wide spend limit** — a hard monthly budget (with a hard-enforcement toggle, not
  just an alert) is set directly in the OpenAI dashboard at
  [platform.openai.com/settings/organization/limits](https://platform.openai.com/settings/organization/limits).
  Once total spend across *all* keys on the account hits the limit, further API requests fail with
  `429` regardless of what the app's own rate limiting does. This is the backstop against bugs or
  limits being bypassed. This deployment is verified at **$10/month** with **Enforce a hard
  limit** enabled.

Both are independent of the client-side "bring your own key" tutor chat (`src/data/liveAi.ts`) —
that feature uses a key the learner supplies themselves in their own browser session, so it can't
run up cost on the app owner's account.

## Getting started

Requires [Node.js](https://nodejs.org/) 18+ and npm.

```bash
npm install
npm run dev
```

Then open the URL printed in the terminal (typically http://localhost:5173/).

To run the automated test suite:

```bash
npm run test
```

To create a production build:

```bash
npm run build
npm run preview
```

## Project structure

```
api/
  grade.ts            Serverless endpoint: AI-grades a submission using a server-only OpenAI key
  chat.ts             Serverless endpoint: server-backed AI tutor chat replies (shared daily cap)
  generate-quiz.ts    Serverless endpoint: generates live, course-scoped quiz questions with OpenAI
  generate-diagnostic.ts  Generates one prerequisite question per course topic
  observe-screen.ts       Produces sanitized observations from consented sampled frames
  save-session-summary.ts Persists a summary/timeline to the learning diary
  realtime-session.ts    Authenticated OpenAI Realtime WebRTC SDP negotiation
src/
  components/         UI components — progress, trend chart, activity calendar, strengths,
                       activity list/cards, quiz runner, learning plan, AI tutor chat, auth
                       (sign in/up, password reset), course switcher, theme toggle, live clock
  context/
    StudySessionContext.tsx  Tracks active/idle time-on-page for the study session tracker
    ScreenObservationProvider.tsx  Shares sanitized observer metadata across dashboard panels
    useStudySession.ts       Hook consuming that context
    studySessionCore.ts      Pure timing/idle-detection logic (unit-testable, no React/DOM)
  data/
    mockData.ts         Mock learner profile and activity/feedback data (demo mode)
    coursePresets.ts    Starter activity lists for preset courses (real mode)
    deriveInsights.ts   Derives strengths/improvements/recommendation from real activity data
    aiTutor.ts          Simulated AI tutor responses (keyword-based, no real LLM call)
    liveAi.ts           Optional "bring your own key" OpenAI integration with graceful fallback
    learningPlan.ts     Generates a personalized learning plan from profile + activity data
    topicMastery.ts     Mastery updates, levels, and SM-2-style review scheduling
  hooks/
    useTheme.ts             Light/dark theme state, persisted to localStorage
    useAuth.ts              Supabase auth session state (real mode)
    useCourseData.ts        Courses/activities data + grading/live-quiz actions (real mode)
    useRealtimeVoiceSession.ts WebRTC voice lifecycle, transcripts, interruption, and cleanup
    useLearnerCompanion.ts  Demo mode's in-memory activity/chat/feedback state (App.tsx)
  services/
    supabaseClient.ts   Supabase client, only created when configured
    courseService.ts    Supabase CRUD for courses/activities + grading/live-quiz requests
    aiService.ts        Demo mode's simulated AI feedback/recommendation logic
  utils/
    duration.ts         Formats minute counts as human-readable durations (e.g. "1h 15m")
  test/
    setup.ts           Test environment setup (jest-dom matchers, cleanup, jsdom polyfills)
  types/
    index.ts           Shared TypeScript types (activities, feedback, quiz questions, etc.)
    database.ts        Types matching the Supabase schema (real mode)
  App.tsx             Demo mode dashboard (mock data)
  RealApp.tsx         Real mode dashboard (Supabase-backed, multi-course, AI-graded)
  main.tsx            Picks App vs. RealApp based on whether Supabase is configured
supabase/
  schema.sql          Postgres schema + Row Level Security policies for real mode
```

Component and data files with matching `*.test.tsx` / `*.test.ts` files alongside them contain
automated tests for that module.

## AI experience and reasoning

- **Feedback, quizzes, and diagnostics:** turn learner work into evidence instead of generic
  content. AI output is capped/sanitized and requests are authenticated and rate-limited.
- **Mastery, adaptive planning, and spaced review:** connect diagnosis, practice, assessment, and
  retention in one explainable loop instead of treating activity completion as mastery.
- **Text and Realtime voice tutoring:** support deliberate typed questions and natural spoken
  coaching. WebRTC enables low-latency responses and interruption while the permanent key stays
  behind the server boundary.
- **Screen-aware guidance:** make tutoring relevant to visible work without silent monitoring.
  Sharing requires consent; duplicate frames are skipped; progress suggestions require
  confirmation; the voice bridge receives sanitized text and can be disabled independently.
- **Learning diary and privacy controls:** retain useful summaries while giving learners local-only
  download, optional private upload, deletion, pause/stop, and separate screen/mic/camera controls.

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
- **Single page** — the AI tutor is presented as a panel within the same dashboard page rather
  than a separate page/route, since the brief asks for no additional pages.

## Possible next steps

The main remaining work is evaluation rather than feature count: measure whether tutoring and
review scheduling improve later scores, add learner challenge/feedback flows for AI grading, and
redact likely secrets before sampled screen frames leave the browser.

- **Token streaming (SSE):** in a production implementation, `aiService.ts` would consume a
  Server-Sent Events (SSE) `ReadableStream` from a backend API rather than resolving a single
  Promise, rendering AI tutor responses token-by-token in real time instead of all at once.
- **Implemented beyond the brief — automatic live progress tracking:** the app can
  optionally use screen sharing (the browser's `getDisplayMedia` API, explicit consent required)
  to sample a reduced frame every 12 seconds while recording, sending it to OpenAI for a live,
  privacy-filtered observation (visible action, evidence, an optional clarifying question, and a
  suggested activity/progress update the learner must confirm — nothing updates automatically).
  Starting a recording also starts the Study Session Tracker below, so both begin from one click.
  When the learner stops, they choose whether (and how) to analyze the session: "Analyze (video
  stays local)" sends only the sampled frames for a short AI summary saved to a persistent
  "learning diary" (Supabase `screen_recordings` table) and the recorded video itself is never
  uploaded or stored; "Analyze + upload full video" additionally uploads the recording to private
  Supabase Storage so a copy is kept alongside the summary. A "Download locally" link always lets
  the learner keep the raw video on their own device, entirely client-side, regardless of which
  analysis option (if any) they choose. A companion feature — an in-app "Study Session Tracker"
  using only Page Visibility/focus and input events (no video, no permissions, nothing ever leaves
  the browser) — is also built, giving a time-on-activity timeline and idle/active breakdown even
  for learners who never turn on screen sharing.
