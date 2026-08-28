# ADR-0008: SM-2-style spaced repetition for topic mastery

## Status

Accepted

## Context

Activity completion alone doesn't indicate whether a learner will retain a topic. The project
needed some model of "when should this topic come back for review" that could be driven
automatically from graded-activity scores, without building a dedicated flashcard-review UI.

## Decision

Adapt the SM-2 spaced-repetition algorithm (used by classic flashcard tools like Anki/SuperMemo) to
run automatically from graded scores instead of manual recall grading: a 0–100 score is mapped to
a 0–5 "quality" value, which drives the standard SM-2 ease-factor and interval-progression formulas
in `src/data/topicMastery.ts`. See [adaptive-learning.md](../adaptive-learning.md) for the exact
formulas.

## Alternatives considered

- **A simple fixed review cadence** (e.g. "review every 7 days"). Rejected: doesn't adapt to how
  well a learner actually knows a topic: a topic they've mastered doesn't need the same review
  frequency as one they're struggling with.
- **A dedicated flashcard/spaced-repetition review UI with manual again/hard/good/easy grading**
  (the traditional SM-2 UX). Rejected for this project's scope: it would require a whole separate
  review mode outside the single-page dashboard (see
  [ADR-0001](0001-single-page-dashboard-over-wizard.md)); deriving quality automatically from the
  existing graded-activity score reuses the same evidence the mastery score already needs, at the
  cost of losing the nuance a learner's own self-assessed recall would provide.
- **A from-scratch custom spacing heuristic.** Rejected in favor of SM-2 specifically because it's
  a well-understood, published algorithm with known behavior, rather than an unvalidated invention.

## Consequences

**Positive:** review scheduling reuses evidence the app already collects (graded scores), so no
extra learner interaction is needed to drive it; the algorithm's behavior (ease factor, interval
growth, lapse handling) is well-documented prior art rather than a novel, unverified heuristic.

**Negative:** deriving "quality" automatically from a single score is a simplification of true SM-2
(no distinction between, say, a slow-but-correct answer and a fast-and-confident one); this is an
explainable heuristic that hasn't been validated against real retention outcomes, noted as a
"possible next step" in the [README](../../README.md).

## Update (2026-08-15)

A lightweight in-dashboard review surface was added: `ReviewQueue.tsx` lists topics from
`dueTopicReviews()` and lets the learner start an on-demand, AI-generated micro-quiz per due
topic (real mode only), feeding the result straight back into `updateTopicMastery()`. This isn't
the separate flashcard-style review mode this ADR rejected above: it stays inside the
single-page dashboard and quality is still derived automatically from the graded score, not a
manual again/hard/good/easy grade, so the "Alternatives considered" reasoning above still holds.
