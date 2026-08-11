# Step 10 — Server API and sync

Goal: Implement the Go server API for health, sources, and runs; support idempotent uploads.

Tasks:

- Implement `GET /api/health`, `GET/POST /api/sources`, `GET/POST /api/runs`.
- Use `run_id` UUID to enforce idempotency on `POST /api/runs`.
- Add database migrations and simple `typing_runs`/`sources` tables with JSONB fields.
- Add a simple `client/src/api/client.ts` to talk to the server and sync completed runs.

Deliverable: runnable Go server and sync logic.
