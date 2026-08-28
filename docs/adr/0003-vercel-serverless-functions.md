# ADR-0003: Vercel serverless functions as the AI/API boundary

## Status

Accepted

## Decision

Every AI-backed capability (grading, chat, quiz/diagnostic generation, screen observation, session
summaries, Realtime SDP negotiation) is a Vercel serverless function under `api/*.ts`. Each
function is the only place the server-only `OPENAI_API_KEY` exists.

## Context

The frontend is already deployed as a static Vite build on Vercel. Any server-side code needs to
hold the OpenAI key away from the browser, needs to be reachable from that same deployed frontend
with minimal added infrastructure, and needs to fit a project whose time budget was already spent
well beyond the brief's suggested 3–6 hours.

## Alternatives considered

- **A separate always-on server** (Express/Fastify on a VM or container host). Rejected: adds a
  second deployment target, its own scaling/uptime concerns, and CORS configuration, for a
  workload (short-lived, bursty AI calls) that fits serverless functions well.
- **Calling OpenAI directly from the browser for every feature** (not just the optional BYOK
  fallback). Rejected outright: would require shipping the permanent API key to the client,
  defeating the entire point of a server boundary.
- **A different serverless host** (AWS Lambda + API Gateway, Cloudflare Workers). Viable
  alternatives, but Vercel was already the natural choice since the frontend is deployed there:
  `api/*.ts` functions deploy from the exact same repo and build step with no extra
  infrastructure-as-code to write.

## Consequences

**Positive:** one deployment (`npx vercel --prod --yes`) ships both frontend and API; each function
is a small, independently testable unit; cold-start latency is acceptable for chat/grading-style
request/response calls.

**Negative:** serverless functions are not well-suited to long-lived connections; this is exactly
why the Realtime voice feature only uses a Vercel function for the initial SDP handshake and then
lets audio flow directly between the browser and OpenAI over WebRTC (see
[ADR-0004](0004-webrtc-openai-realtime-for-voice.md)) rather than proxying the whole voice stream
through a serverless function.
