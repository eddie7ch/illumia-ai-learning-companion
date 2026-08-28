# ADR-0001: Single dashboard + chat, not a wizard or multi-step flow

## Status

Accepted

## Context

The case study describes four learner needs: understand progress, get feedback, see improvement
areas, and know what to do next. The brief also explicitly forbids adding pages beyond the single
assigned page, and asks for a prototype buildable in 3–6 hours.

## Decision

Build one coherent dashboard that answers all four questions at a glance (progress, score trend,
strengths/improvements, one recommended next step, an AI-generated plan), plus a single deep AI
interaction (the tutor chat) rather than several shallow ones. The learning plan surfaces exactly
**one** recommended next step at a time rather than a fully ranked list.

## Alternatives considered

- **A multi-step wizard** ("first see progress, then see feedback, then get a recommendation").
  Rejected: adds navigation complexity the brief doesn't ask for, and a returning learner wants an
  immediate answer to "where do I stand," not a guided tour every visit.
- **A ranked list of several recommended next steps.** Rejected: more choices for the same
  decision ("what should I do next") adds cognitive load without adding clarity; a single
  recommendation plus a short supporting plan gives both the immediate answer and the "what does my
  next stretch of learning look like" context, without asking the learner to prioritize themselves.
- **A separate page per feature** (progress page, feedback page, chat page). Rejected outright by
  the brief's "no other pages" constraint.

## Consequences

**Positive:** the landing view is scannable in seconds; matches the brief's "rapidly build a
polished and functional prototype" emphasis over feature count; keeps the single-page constraint
trivially satisfied.

**Negative:** a dashboard with many panels needs careful responsive/mobile layout work (collapsing
grids, a drawer for chat) to avoid feeling cluttered; accepted and addressed via the mobile-first
layout described in [security-and-privacy.md](../security-and-privacy.md)'s consent section and the
architecture doc's project structure.
