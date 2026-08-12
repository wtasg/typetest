# Typing Test

[Live demo (client only): wtasg.github.io/typetest](https://wtasg.github.io/typetest) | [Repo: gh/wtasg/typetest](https://github.com/wtasg/typetest)

A distraction-free typing practice app for programmers. Offline-first, runs entirely in the browser, with optional PostgreSQL persistence via a Go API server.

## Stack

| Layer | Technology |
| --- | --- |
| Client | SolidJS · TypeScript · Vite |
| Server | Go · `net/http` |
| Database | PostgreSQL (optional) |
| Charts | D3 |

## Quick start

```bash
# Install client dependencies
cd client && npm install

# Dev — client on :30002, server on :30001
./scripts/run.sh --execute

# Production build
./scripts/build.sh --execute

# Deploy to GitHub Pages (gh-pages branch)
./scripts/deploy.sh --execute

# Tests
./scripts/test.sh --execute
```

All scripts default to dry-run. Pass `--execute` to actually run.

## Features

- Upload source files (`.go`, `.ts`, `.py`, `.rs`, and 15 more) or paste arbitrary text
- Configurable game types: Normal, Sudden Death, Correction Mode, No Correction
- Per-keystroke event recording — runs are fully replayable and raceable
- Visible whitespace glyphs (space `·`, tab `→`, newline `↵`) — all configurable
- Dual WPM reporting: Effective WPM and Raw Keystroke WPM
- Offline-first: works without the server; syncs completed runs when available
- Reports with D3 charts: WPM over time, accuracy, key distribution, inter-key interval histogram

## Project layout

```text
client/        SolidJS + Vite front-end
  src/
    typing/    Engine, normalization, metrics, distributions
    games/     Game type configuration presets
    state/     SolidJS reactive stores
    storage/   localStorage + IndexedDB + server sync
    api/       Health check + HTTP client
    components/

server/        Go HTTP API
  cmd/server/  Entry point + embedded migrations
  internal/
    api/       Route handlers (health, sources, runs, reports)
    database/  PostgreSQL connection + migration runner
  migrations/  SQL schema files

plans/1/       Specification, step plans, and fix log
scripts/       build.sh · deploy.sh · run.sh · test.sh
```

## Database

PostgreSQL is optional. The client works fully without it. When available, completed runs and sources are synced after each run.

To configure the database connection, copy `.env.sample` to `.env` and update with your database credentials:

```bash
cp .env.example .env
```

Then edit `.env` with your database configuration:

```text
DB_HOST=localhost
DB_PORT=5432
DB_NAME=typetest
DB_USER=your_db_user
DB_PASSWORD=your_db_password
```

Database credentials are stored only in the `.env` file (local development) and never included in the client bundle or version control.

## Local Network Access prompt

![Local Network Access prompt](/images/Screenshot%20from%202026-08-12%2010-57-44.png)

This is Chrome's Local Network Access prompt, not anything malicious. The app makes network requests to your own local Go API server at http://localhost:30001 (the optional PostgreSQL sync backend):

- On startup it polls the server every 15s: initApp() → startHealthCheck(15_000) → fetch('http://localhost:30001/api/health') (client/src/api/health.ts:26, client/src/state/app.ts:11)
- After each run it POSTs the result: persistAndSync() → postRun() → fetch('http://localhost:30001/api/runs') (client/src/storage/sync.ts:9, client/src/state/typing.ts:145)
- Sources are also POSTed/DELETEd to localhost:30001/api/sources (client/src/api/client.ts:20)

When the page is served over HTTPS (e.g. the GitHub Pages demo), Chrome treats the connection to the device-local localhost port as "accessing other apps and services on this device" and asks for permission. The request targets your own server, which is fully optional - the app works offline-first without it. You can deny the prompt safely, or remove the server entirely and the app still functions.
