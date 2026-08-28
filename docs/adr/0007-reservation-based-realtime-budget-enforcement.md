# ADR-0007: Reservation-based budget enforcement for Realtime voice

## Status

Accepted

## Context

The existing shared AI budget (`_aiBudget.ts`) estimates cost *after* an OpenAI call completes,
from that call's own `usage.prompt_tokens`/`completion_tokens`, then logs it: a post-hoc,
fail-open pattern that's fine for short request/response calls. Realtime voice is different: a
single session can run for minutes, cost is metered continuously across multiple modalities
(text/audio/image, input/output), and a runaway or unmetered session is a far larger single-shot
cost risk than one extra grading/chat call.

## Decision

Reserve cost **before** a Realtime session is allowed to start, and enforce **fail-closed**
throughout the session:

1. `reserve_realtime_ai_budget()` atomically reserves a fixed **$0.75** via a Postgres advisory
   lock before the session's SDP handshake completes, and refuses the reservation (and therefore
   the session) if it would exceed the shared $5/day cap or if the reservation call itself fails.
2. During the session, the browser reports actual cumulative usage every 5 seconds; the server
   enforces monotonic token counts (a stale/lower report can never reduce recorded usage) and stops
   the session immediately if the per-session or shared daily ceiling is reached, or if the budget
   check itself errors.
3. A hard 10-minute session timeout applies regardless of spend.

## Alternatives considered

- **Reuse the existing post-hoc, fail-open logging pattern used for chat/grading.** Rejected: that
  pattern only ever finds out cost *after* an OpenAI call already happened, and fails open on error
  ("allow and log later, don't block"). For a request that can hold an open, continuously-billing
  session for up to 10 minutes, discovering the overage after the fact is too late, and failing
  open on an infrastructure hiccup could let an unmetered session run unbounded.
- **No pre-reservation, just poll usage more frequently.** Rejected: still allows an initial
  in-flight session to start with zero budget guarantee, and doesn't prevent two sessions from
  simultaneously starting past the cap in a race (the advisory lock specifically prevents this).
- **A fixed per-session token budget instead of a dollar reservation.** Rejected: token costs
  differ by modality (text vs. audio vs. image, input vs. output), so a token-count cap doesn't
  map cleanly to a dollar ceiling the way a direct USD reservation does.

## Consequences

**Positive:** a Realtime session can never start once the shared daily budget is effectively
exhausted; an infrastructure failure during an active session stops it rather than silently
disabling cost enforcement; concurrent session starts can't race past the cap thanks to the
advisory lock.

**Negative:** the fixed $0.75 reservation is deliberately conservative (a typical session likely
costs less), so it can reject a new session slightly earlier than the "true" remaining budget would
strictly require: an intentional overcount rather than a risk of undercounting.
