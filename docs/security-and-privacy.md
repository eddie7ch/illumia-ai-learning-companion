# Security & privacy

This is the current-state reference for authentication, data protection, cost/abuse controls, and
privacy behavior. For the history of how these controls were added, what was found during review,
and what was consciously left as accepted risk, see
[`housekeeping-and-scope.md`](housekeeping-and-scope.md). For *why* specific enforcement designs
were chosen over alternatives, see the [ADR index](adr/README.md).

## Authentication and data isolation

- Every server-backed AI endpoint (`api/*.ts`) independently verifies the caller's Supabase bearer
  token via `supabase.auth.getUser(token)` — the returned `user.id` is the only source of truth for
  whose request this is; a client-supplied ID is never trusted.
- All learner data (`courses`, `activities`, `profiles`, mastery, diary, usage, rate-limit tables)
  is protected by Postgres Row Level Security scoped to `auth.uid() = user_id`. This is the actual
  access-control boundary — enforced at the database layer, not just in application code.
- The `OPENAI_API_KEY` is a server-only environment variable. It is never sent to, embedded in, or
  readable from the browser bundle.
- The Supabase `service_role` key is never used anywhere in this codebase, client or server —
  every server call still goes through the caller's own JWT so RLS still applies.
- HTTP security headers (`vercel.json`) set Content-Security-Policy, `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`, restricting framing,
  script/style/connect sources, referrers, and camera/microphone access to the app's own origin
  and the specific third parties it actually calls (`*.supabase.co`, `api.openai.com`).
- No use of `dangerouslySetInnerHTML`, `innerHTML`, `eval(`, `new Function(`, or `document.write`
  anywhere in `src/**`.
- No CSRF exposure: every API is stateless bearer-token authenticated, not cookie-session based.

## Per-feature rate limits

| Feature | Limit | Enforced by |
|---|---|---|
| AI grading | 15 calls/hour, 50/day per user | `grading_events` table + owner-scoped RLS |
| Server-backed tutor chat | 100 replies/day, shared across all users | `chat_events` table + `chat_events_daily_count()` |
| Realtime voice session starts | 3/hour, 10/day per user | `chat_events` table (shared with chat's rate-limit pattern) |

Requests over a limit return `429` before any OpenAI call is made.

## Shared global AI spend cap ($5/day)

`api/_aiBudget.ts` estimates the USD cost of every OpenAI call made by `chat.ts`, `grade.ts`,
`generate-quiz.ts`, `generate-diagnostic.ts`, `observe-screen.ts`, and `save-session-summary.ts`
(from each response's `usage.prompt_tokens`/`completion_tokens` at `gpt-4o-mini` pricing) and logs
it to `ai_usage_events`. Before making an OpenAI call, every endpoint checks the combined estimated
spend across all of them for the rolling last 24 hours (via the `ai_usage_daily_cost_usd()`
Postgres function) and returns `429` once it reaches **$5**, regardless of which feature or user is
responsible. This check fails **open** on a database error — a monitoring hiccup degrades to
"no extra cap that moment," not "every AI feature goes down."

## Realtime voice budget enforcement ($0.75/session reservation)

Realtime audio/image usage is metered per-token by OpenAI, differently from normal chat
completions, so it has its own conservative, fail-**closed** control path (see
[ADR-0007](adr/0007-reservation-based-realtime-budget-enforcement.md) for the reasoning):

1. Before a voice session starts, `api/realtime-session.ts` calls `reserve_realtime_ai_budget()`,
   a `SECURITY DEFINER` Postgres function that takes an advisory lock and atomically reserves
   exactly **$0.75** against the shared $5 rolling daily cap. It rejects null, negative, or
   caller-chosen reservation amounts, and refuses admission if the reservation would exceed $5.
2. The session uses the lower-cost `gpt-realtime-2.1-mini` model.
3. Every `response.done` event reports cumulative text-input/output, audio-input/output, and
   image-input token totals to `api/realtime-usage.ts`. The server stores **monotonic** token
   counts and separate per-modality costs in `ai_usage_events` — a stale or out-of-order report can
   never reduce previously recorded usage.
4. The browser polls `api/realtime-usage.ts` every 5 seconds and immediately stops the WebRTC
   session if either the **$0.75 session ceiling** or the **$5 combined daily ceiling** is reached,
   or if the budget check itself fails (fail-closed, not fail-open, unlike the cap above — an
   unmetered voice session is a much larger single-session cost risk than one blocked text call).
5. Sessions also hard-stop after **10 minutes** regardless of spend.

## OpenAI account-wide spend limit

A hard monthly budget is set directly in the OpenAI dashboard
([platform.openai.com/settings/organization/limits](https://platform.openai.com/settings/organization/limits))
with **Enforce a hard limit** enabled, currently **$10/month**. Once total spend across *all* keys
on the account hits the limit, further API requests fail with `429` regardless of what the app's
own rate limiting does — this is the final backstop against bugs, concurrency issues, or a client
that stops reporting usage.

## "Bring your own key" mode

The client-side BYOK tutor chat (`src/data/liveAi.ts`) is a separate, explicitly lower-trust path:
the key lives only in component state for the current browser tab, is never persisted
(`localStorage`/cookies) or sent anywhere except directly to OpenAI, and cannot run up cost on the
app owner's account. This is disclosed in-app as a demo pattern, not a production one — a real
product would proxy this call through a backend so the key never reaches the client.

## Consent and privacy controls

Screen sharing, microphone (voice), and camera-based presence detection are **independently**
opt-in and can be stopped separately at any time:

- **Screen sharing** — only a learner-selected window/tab (`getDisplayMedia`) is captured. Frames
  identical to the previous sample are skipped before analysis. Any progress/activity update the
  AI suggests from screen content requires explicit learner confirmation; nothing is applied
  automatically.
- **Screen → voice bridge** (optional, off by default) — sends the latest sampled, reduced frame
  plus sanitized text into the active Realtime session only while both screen analysis and the
  bridge toggle are on. It is never continuous video — see
  [ADR-0005](adr/0005-sampled-screen-images-not-continuous-video.md).
- **Camera presence** (`FacePresenceMonitor.tsx`) — runs `@mediapipe/tasks-vision`'s face detector
  entirely in the browser via WebAssembly. Camera frames are never uploaded, recorded, or sent to
  any server; only a derived `present`/`away` boolean leaves the component, used only to locally
  pause screen analysis while the learner is away. See
  [ADR-0006](adr/0006-local-mediapipe-face-presence-detection.md).
- **Learning diary** — "Analyze (video stays local)" sends only sampled frames for a short AI
  summary saved to the diary; the recording itself is never uploaded. "Analyze + upload full
  video" is a separate, explicit choice that uploads to private Supabase Storage. Voice notes are
  recorded and offered as a local download, not uploaded anywhere.

## Data retention

| Data | Processed where | Persisted? | Retention | Learner control |
|---|---|---|---|---|
| Screen video (default) | Browser only | No | Discarded when recording stops | N/A — never leaves the browser |
| Sampled screen frame | Browser → OpenAI (`observe-screen.ts`) | No | Per-request only | Pause/stop screen analysis |
| Screen → voice image | Browser → OpenAI Realtime | No | Per-message only | Disable the bridge toggle |
| Learning-diary summary | Supabase (`screen_recordings`, no video) | Yes | Until learner deletes it | Delete from diary |
| Uploaded full recording (opt-in) | Supabase Storage (private) | Yes | Until learner deletes it | Delete from diary |
| Voice tutor audio | Browser ↔ OpenAI Realtime (WebRTC) | No (server-side) | Session only | End the voice session |
| Voice note recording | Browser only | No (local download only) | Until tab closes or downloaded | Download or discard |
| Camera frames (presence) | Browser only (WASM) | No | Never leaves the component | Stop camera/presence |
| Course/activity/mastery data | Supabase Postgres | Yes | Account lifetime | Standard account data controls |

## Accepted risks (not fixed, and why)

These are intentionally left as documented tradeoffs rather than gaps that were missed:

- **TOCTOU race on rate limits.** The count-check and the insert into `grading_events`/
  `chat_events` aren't atomic, so a burst of concurrent requests could theoretically exceed the
  stated per-hour/day limits before the insert lands. The OpenAI account-level spend cap above is
  the actual backstop against runaway cost; these rate limits are best-effort UX, not the last line
  of defense. (Note: the newer Realtime reservation *is* atomic via a Postgres advisory lock,
  specifically because a single voice session is a much larger potential single-shot cost than one
  extra grading/chat call.)
- **Self-scoped prompt injection.** A learner could try to manipulate the AI's response to *their
  own* request via course/activity titles fed into prompts, but there is no path for it to affect
  any other user's data, session, or the server itself.
- **10 remaining `npm audit` findings**, all transitive dependencies of `@vercel/node` (a
  devDependency used only for TypeScript types — its code never ships in the deployed app or
  browser bundle). Fixing requires a breaking downgrade for an unreachable-at-runtime finding.

## Incident history

Production incidents (e.g. a stale/invalid `OPENAI_API_KEY` after a deploy) and their resolutions
are recorded in [`housekeeping-and-scope.md`](housekeeping-and-scope.md) rather than here, since
that document is the project's chronological audit trail.
