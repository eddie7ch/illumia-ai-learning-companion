# ADR-0006: Local, on-device face-presence detection

## Status

Accepted

## Context

The screen learning observer should pause analysis while the learner has stepped away, to avoid
wasting AI calls/budget analyzing an idle screen and to avoid implying the app is "watching"
someone who isn't there.

## Decision

Use `@mediapipe/tasks-vision`'s `FaceDetector` (the `blaze_face_short_range` model), loaded and run
entirely client-side via WebAssembly. Camera frames never leave the browser; only a derived
`present`/`away` boolean is used, locally, to gate whether screen analysis runs.

## Alternatives considered

- **Send camera frames to a cloud vision API** (or reuse the existing OpenAI vision path). Rejected
  outright: this would turn an incidental convenience feature (auto-pause when away) into a much
  larger privacy commitment (uploading a learner's webcam feed) for a benefit that doesn't require
  it — a simple present/away signal never needs the image itself to leave the device.
- **No presence detection at all** (rely on the learner manually pausing). Considered, but a
  fully local, zero-network-cost detector was cheap enough to add real value (automatically
  avoiding wasted analysis while away) without the privacy tradeoff a cloud-based approach would
  require.

## Consequences

**Positive:** camera data has zero server-side exposure — there is no path for a camera frame to
reach any backend, which sidesteps an entire category of privacy/consent questions a cloud-based
version would raise.

**Negative:** local WASM face detection is less accurate than a cloud model and depends on the
learner's device having enough resources to run it smoothly; it is also easy to defeat (e.g.
covering the camera briefly counts as "away") — acceptable since this is a convenience/UX feature,
not a security control.
