# AI Learning Companion (Illumia Case Study Prototype)

A frontend prototype of an **AI Learning Companion** that helps a learner understand their
progress, strengths, and areas for improvement, and get personalized AI-powered guidance on
what to learn next — built for the Illumia software engineering case study.

![Dashboard screenshot showing progress, strengths, recommended next step, activity list, and AI tutor chat](docs/screenshot.png)

## What this is

A single-page React + TypeScript dashboard for a learner working through a "React Development"
track. It shows:

- **Progress overview** — overall completion percentage for the learning track.
- **Strengths & areas for improvement** — a summary generated from the learner's activity history.
- **Recommended next step** — a single, clear "what to do next" recommendation with reasoning.
- **AI-generated learning plan** — a short, ordered list of next steps generated from the
  learner's in-progress work, recommendation, and improvement areas (see
  `src/data/learningPlan.ts`).
- **Activity list** — lessons, coding exercises, and quizzes with completion status. Completed
  items with AI feedback can be expanded to reveal a score, strengths, and suggestions (matching
  the "Evaluate Learner Work" example from the case study).
- **AI tutor chat** — a simulated conversational assistant the learner can ask questions like
  *"Why is my React component re-rendering?"*, with a brief simulated "thinking" delay and
  auto-scrolling message list.

All data is realistic mock/placeholder data — there is no backend, database, or authentication.

## Approach & design decisions

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

**Why a simulated AI tutor instead of a real LLM call.** The brief states a real LLM integration
is optional and mocked responses are acceptable. A keyword-matched responder
(`src/data/aiTutor.ts`) demonstrates the intended UX (ask a question, get a targeted answer)
without adding API key management or network dependencies that would distract from the frontend
prototype itself. The response content mirrors the tone and structure of the case study's own
example answer.

**Why Tailwind CSS v4.** Chosen for fast, consistent, responsive styling without hand-rolled CSS,
keeping the component code focused on structure and behavior.

**Why an AI-generated learning plan in addition to a single recommendation.** The case study lists
"an AI-generated learning plan" as one of several optional AI experiences. A single "next step"
recommendation answers *what's next*, but a short plan (`src/data/learningPlan.ts`) better answers
*what does my next stretch of learning look like*, by sequencing the in-progress activity, the
recommendation, upcoming activities tied to improvement areas, and a reminder to lean on existing
strengths. It's implemented as a small deterministic function (not a real LLM call) so its
reasoning is transparent and unit-testable.

**Why a small automated test suite.** The case study doesn't require production-readiness, but a
focused set of tests (pure-function unit tests for the learning plan generator, plus component
tests for feedback expansion, progress display, and the chat flow) demonstrates the same care I'd
apply to real product code, without over-investing in test infrastructure for a 3-6 hour exercise.

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

## Tech stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) for the dev server and build
- [Tailwind CSS v4](https://tailwindcss.com/) for responsive styling
- [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/react) for
  automated tests

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
src/
  components/       UI components (progress, strengths, activities, learning plan, AI tutor chat)
  data/
    mockData.ts     Mock learner profile and activity/feedback data
    aiTutor.ts       Simulated AI tutor responses (keyword-based, no real LLM call)
    learningPlan.ts  Generates a personalized learning plan from profile + activity data
  test/
    setup.ts         Test environment setup (jest-dom matchers, cleanup, jsdom polyfills)
  types.ts          Shared TypeScript types
  App.tsx           Page layout wiring all sections together
```

Component and data files with matching `*.test.tsx` / `*.test.ts` files alongside them contain
automated tests for that module.

## AI experience

Three AI-powered capabilities are demonstrated, exceeding the case study's "at least one"
requirement:

1. **AI-generated feedback & recommendations** — pre-authored mock feedback (score, strengths,
   suggestions) attached to completed activities, plus a single recommended next activity with a
   reason, shown on the dashboard.
2. **AI-generated learning plan** — a short, ordered plan (`src/data/learningPlan.ts`) built from
   the learner's in-progress activity, recommendation, upcoming activities, and strengths.
3. **AI tutor chat** — an interactive chat box where the learner can type a question and get a
   response. Responses are simulated with simple keyword matching (see `src/data/aiTutor.ts`)
   rather than a real LLM call, since a live integration was optional for this exercise.

## Assumptions made

Since the case study intentionally leaves some details open, the following assumptions were made:

- **Single learner, single track.** The prototype shows one learner ("Jordan Lee") progressing
  through a React Development track, rather than supporting multiple users or course tracks.
- **Feedback is pre-generated, not computed live.** AI feedback (scores, strengths, suggestions)
  is attached to activities as mock data rather than generated from actual submitted work, since
  there's no code-execution or grading backend in scope.
- **One recommended next step at a time**, rather than a full ranked list, to keep the "what
  should I do next" decision simple and actionable.
- **AI tutor answers are simulated** via keyword matching against a small set of canned,
  topic-relevant responses. This keeps the chat experience functional and realistic without
  requiring an API key or real model integration.
- **No authentication, routing, backend, or persistence** — all state is in-memory (React state)
  and resets on page reload, per the "you do not need to build" list in the requirements.
- **Single page** — the AI tutor is presented as a panel within the same dashboard page rather
  than a separate page/route, since the brief asks for no additional pages.

## Possible next steps

Given more time, this could be extended with: a real LLM-backed tutor with retrieval over the
learner's actual activity history, multiple learning tracks/users, richer trend charts for
progress over time, and persisting learner state to a backend/database.
