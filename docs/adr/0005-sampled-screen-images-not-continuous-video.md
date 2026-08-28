# ADR-0005: Sampled screen frames, not continuous video

## Status

Accepted

## Context

Learners wanted the voice tutor to be able to "see" what they're working on. A naive
implementation would stream continuous video (or a live screen-share track) directly into the
Realtime session so the model always has an up-to-date view.

## Decision

Sample a single reduced, changed screen frame periodically (currently every 12 seconds while
recording), and only forward that latest still frame plus a sanitized text description into the
active session: first to `api/observe-screen.ts` for an AI-generated observation, and optionally
(if the learner separately opts into the voice bridge) as an `input_image`/`input_text` message
into the Realtime conversation. Duplicate frames (identical to the previous sample) are skipped
entirely.

## Alternatives considered

- **Stream continuous video/screen-share directly to OpenAI's Realtime API.** Rejected: this is
  the single biggest cost and privacy driver of the whole feature. Continuous frames at even a
  modest rate multiply token/image costs far beyond the periodic-sample approach, and continuously
  transmitting a learner's full screen (which may contain unrelated windows, other tabs, personal
  information) is a much larger privacy exposure than a periodic, explicitly-recorded sample.
- **Send full-resolution frames instead of reduced ones.** Rejected: full-resolution images cost
  more in vision-model tokens for no meaningful gain in tutoring usefulness (the model needs to
  read approximate code/UI state, not pixel-perfect detail).
- **Only ever use text descriptions, never real images (the original bridge implementation).**
  This was tried first and found insufficient: see the "Live voice tutor still cannot see the
  screen" fix referenced in this project's history: OpenAI's Realtime API needs an actual
  `input_image` content part for vision, not a text-only `system` message, so a reduced real image
  is necessary, just not a continuous stream of them.

## Consequences

**Positive:** bounded, predictable cost per sample; a much smaller privacy surface than continuous
video; duplicate-frame skipping avoids redundant analysis when the screen hasn't changed.

**Negative:** the voice tutor's "view" of the screen is a snapshot, not truly live; it can lag
behind what the learner is currently doing between samples. This tradeoff is explained to users
(see the README's live-demo description) rather than hidden.
