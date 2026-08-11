# Step 03 — Typing engine implementation

Goal: Implement the in-memory typing engine that records events and maintains target/cursor state.

Tasks:

- Implement event clock and event recording with relative timestamps.
- Support key types, navigation, backspace, delete, and corrections.
- Implement normalization (line endings, trim) before a run.
- Provide an API to start/stop runs and export completed run object.

Deliverable: `client/src/typing/engine.ts` with unit tests.
