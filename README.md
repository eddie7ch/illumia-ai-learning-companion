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
- **Activity list** — lessons, coding exercises, and quizzes with completion status. Completed
  items with AI feedback can be expanded to reveal a score, strengths, and suggestions (matching
  the "Evaluate Learner Work" example from the case study).
- **AI tutor chat** — a simulated conversational assistant the learner can ask questions like
  *"Why is my React component re-rendering?"*.

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

## Getting started

Requires [Node.js](https://nodejs.org/) 18+ and npm.

```bash
npm install
npm run dev
```

Then open the URL printed in the terminal (typically http://localhost:5173/).

To create a production build:

```bash
npm run build
npm run preview
```

## Project structure

```
src/
  components/       UI components (progress, strengths, activities, AI tutor chat, etc.)
  data/
    mockData.ts     Mock learner profile and activity/feedback data
    aiTutor.ts       Simulated AI tutor responses (keyword-based, no real LLM call)
  types.ts          Shared TypeScript types
  App.tsx           Page layout wiring all sections together
```

## AI experience

Two AI-powered capabilities are demonstrated, per the case study requirements:

1. **AI-generated feedback & recommendations** — pre-authored mock feedback (score, strengths,
   suggestions) attached to completed activities, plus a single recommended next activity with a
   reason, shown on the dashboard.
2. **AI tutor chat** — an interactive chat box where the learner can type a question and get a
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

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
