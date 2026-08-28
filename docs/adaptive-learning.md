# Adaptive learning: mastery, diagnostics, and spaced review

This document specifies the current mastery/review logic (`src/data/topicMastery.ts`) and the
learning-plan sequencing (`src/data/learningPlan.ts`). For *why* this loop exists at all instead of
treating activity completion as mastery, see
[ADR-0008](adr/0008-sm2-style-spaced-repetition-for-mastery.md).

## Why not just "percent complete"

Completion alone doesn't show whether a learner actually retained a topic. The adaptive loop
closes that gap: a diagnostic establishes a starting point per topic, every graded activity is
evidence that updates a per-topic mastery score, and a spaced-review schedule brings topics back
before they're likely to be forgotten.

## Mastery score

Each topic's mastery score is a 0–100 running average, weighted toward recent evidence:

```text
masteryScore = round(previousScore * 0.65 + newActivityScore * 0.35)
```

This means mastery moves meaningfully with each new result but isn't wiped out by a single bad or
good score: a deliberate smoothing choice over either a simple average (too slow to reflect
recent struggle/improvement) or "last score wins" (too noisy).

## Mastery levels

The score maps to a label shown in the UI:

| Score range | Level |
|---|---|
| 90–100 | Mastered |
| 75–89 | Strong |
| 60–74 | Proficient |
| 35–59 | Developing |
| 0–34 | New |

## Spaced review (SM-2–style)

Each topic also tracks an SM-2-inspired review schedule: `easeFactor`, `repetitions`, and
`reviewIntervalDays`. A raw 0–100 score is first mapped to a 0–5 "quality of recall" value:

| Score | Quality |
|---|---|
| ≥ 90 | 5 |
| ≥ 80 | 4 |
| ≥ 70 | 3 |
| ≥ 60 | 2 |
| < 60 | 1 |

Then, on every new evidence point:

- **Ease factor** updates using the standard SM-2 formula, floored at `1.3` so it can never make
  intervals collapse to unusably short:
  ```text
  ease' = max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
  ```
- **Repetitions** increments only when `quality >= 3` (a "pass"); any lower score resets it to `0`,
  meaning a real lapse restarts the spacing progression rather than just slowing it down.
- **Next interval** follows the classic SM-2 progression: `1` day after the first pass, `3` days
  after the second, then `round(previousInterval * ease)` (minimum `4`) after that, but any
  `quality < 3` forces the interval back down to `1` day regardless of history.

This is a deliberate simplification of full SM-2 (no manual "again/hard/good/easy" grading UI;
quality is derived automatically from the graded score) chosen to fit a single AI-graded activity
flow rather than a dedicated flashcard-review interface.

## Diagnostics as the starting point

A course diagnostic (`api/generate-diagnostic.ts`) asks one prerequisite question per topic before
any activity is attempted. The first answer for a topic seeds `diagnosticScore` and the initial
`masteryScore`, `reviewIntervalDays: 1`, `easeFactor: 2.5`, `repetitions: 0`, the same defaults
SM-2 conventionally starts from.

## Due reviews

`dueTopicReviews()` filters to topics whose `nextReviewAt` has passed and sorts by how overdue they
are, so the most overdue topic is always surfaced first.

## Learning plan sequencing

`generateLearningPlan()` is a small deterministic function (not a real LLM call, so its reasoning
is transparent and unit-testable) that assembles a short, ordered plan:

1. **Up to 2 due reviews**, surfaced first, since spaced review closing the loop is the most
   time-sensitive item.
2. **The in-progress activity**, if any, described as reinforcing the existing recommendation
   when it matches, or as general progress otherwise.
3. **The single recommended next step** (see
   [ADR-0001](adr/0001-single-page-dashboard-over-wizard.md) for why only one, not a ranked list),
   unless it's already covered by the in-progress activity above.
4. **Up to 2 "up next" activities**, preferring ones tagged with the learner's current weakest
   topic (the lowest-mastery topic from `deriveTopicMasteries()`).
5. **A reminder to lean on an existing strength**, if any strength is recorded.

Each step is deduplicated against activities already surfaced earlier in the same plan so nothing
appears twice.

## Review queue

Beyond surfacing due reviews in the learning plan text, `ReviewQueue` (real mode) lists each due
topic from `dueTopicReviews()` with a "Review now" action that generates a fresh AI micro-quiz for
that topic (`requestReview` in `useCourseData.ts`) and feeds the result straight back into
`updateTopicMastery()` on submit. Quality is still derived automatically from the graded score,
not a manual again/hard/good/easy grade; see the "Update" note on
[ADR-0008](adr/0008-sm2-style-spaced-repetition-for-mastery.md) for how this differs from a full
flashcard-review UI.

## Socratic tutor dialogue

The server-backed tutor (`api/chat.ts`) and the bring-your-own-key tutor (`src/data/liveAi.ts`)
both use a Socratic system prompt: for conceptual questions, the tutor first asks a short guiding
question or gives a small hint instead of stating the full answer immediately, so the learner
reasons toward it themselves. It still answers quick factual lookups (syntax, terminology)
directly, and gives the direct answer once the learner says they're stuck or asks for it outright.
The simulated demo/fallback responder (`src/data/aiTutor.ts`) is unchanged: canned keyword-matched
answers, not a live model, so Socratic prompting doesn't apply to it.

## Limitations

- Quality is derived only from a single graded score per activity; it doesn't yet account for
  response time, hint usage, or repeated attempts.
- This is an explainable heuristic, not a validated spaced-repetition study; see "Possible next
  steps" in the [README](../README.md) for the intent to eventually measure whether this loop
  improves later scores.
