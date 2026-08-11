# Step 07 — Persistence: localStorage + IndexedDB

Goal: Implement local persistence for settings, metadata, and completed runs.

Tasks:

- Persist settings and small metadata to `localStorage`.
- Implement IndexedDB wrapper for full run objects and source contents.
- Provide graceful fallback when IndexedDB is unavailable.
- Save completed run locally before attempting server sync.

Deliverable: `client/src/storage/localStorage.ts` and `indexedDb.ts`.
