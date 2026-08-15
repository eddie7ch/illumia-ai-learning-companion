# Architecture decision records

Each ADR captures a decision, the alternatives considered, and the consequences accepted —
answering not just what was built but why, and why not something else. See
[architecture.md](../architecture.md) for the resulting system as built.

| ADR | Decision |
|---|---|
| [0001](0001-single-page-dashboard-over-wizard.md) | Single dashboard + chat, not a wizard/multi-step flow |
| [0002](0002-supabase-for-auth-and-persistence.md) | Supabase for auth and persistence |
| [0003](0003-vercel-serverless-functions.md) | Vercel serverless functions as the AI/API boundary |
| [0004](0004-webrtc-openai-realtime-for-voice.md) | WebRTC + OpenAI Realtime for the live voice tutor |
| [0005](0005-sampled-screen-images-not-continuous-video.md) | Sampled screen frames, not continuous video |
| [0006](0006-local-mediapipe-face-presence-detection.md) | Local, on-device face-presence detection |
| [0007](0007-reservation-based-realtime-budget-enforcement.md) | Reservation-based budget enforcement for Realtime voice |
| [0008](0008-sm2-style-spaced-repetition-for-mastery.md) | SM-2-style spaced repetition for topic mastery |
