# ADR-0004: WebRTC + OpenAI Realtime for the live voice tutor

## Status

Accepted

## Context

A spoken tutor conversation needs low-latency, natural turn-taking (including the learner
interrupting the AI mid-response), which is a poor fit for a request/response HTTP call per
utterance, and a poor fit for proxying continuous audio through a stateless serverless function.

## Decision

Use OpenAI's Realtime API over WebRTC: the browser negotiates an SDP offer/answer through an
authenticated Vercel function (`api/realtime-session.ts`), which forwards it to OpenAI using the
server-only key and returns OpenAI's answer. After that handshake, audio flows directly between the
browser and OpenAI — Vercel is not in the media path.

## Alternatives considered

- **Plain WebSockets to a custom relay server.** Would still require running and paying for an
  always-on relay process just to shuttle audio, reintroducing the "always-on server" cost this
  project otherwise avoids by using serverless functions (see
  [ADR-0003](0003-vercel-serverless-functions.md)) — and OpenAI's Realtime API supports WebRTC
  natively for exactly this browser-to-model use case.
- **Browser-native Speech Recognition/Speech Synthesis APIs** (`SpeechRecognition`/
  `speechSynthesis`) calling a text-only chat endpoint. Rejected: browser speech-to-text quality and
  availability vary a lot across browsers, and round-tripping through a separate text chat endpoint
  adds latency and loses the natural interruption handling Realtime provides out of the box.
- **Proxying raw audio chunks through a serverless function per request.** Rejected: serverless
  functions have execution-time limits and per-invocation overhead that fit poorly with a
  continuous, low-latency audio stream; WebRTC's peer connection is designed for exactly this.

## Consequences

**Positive:** low-latency, interruptible spoken conversation; the permanent OpenAI key never
reaches the browser, since only the ephemeral SDP answer/session crosses that boundary; Vercel's
per-invocation cost is limited to the brief handshake, not the whole conversation.

**Negative:** usage/cost metering works completely differently from normal chat completions
(per-`response.done` cumulative token totals instead of a single `usage` object per call), which is
why Realtime needed its own budget-reservation system rather than reusing the existing
`_aiBudget.ts` estimate-and-log pattern — see
[ADR-0007](0007-reservation-based-realtime-budget-enforcement.md). It also means the voice tutor
only ever sees what's explicitly sent to it (sampled images/text), not a continuous view of the
screen — see [ADR-0005](0005-sampled-screen-images-not-continuous-video.md).
