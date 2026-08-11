# Typing Test Web App --- MVP Specification

## 1. Purpose

Build a distraction-free typing practice web application primarily for
programmers.

The MVP supports:

- Programming source files and text files
- Pasted text
- Arbitrary text selection
- Offline operation
- Local browser persistence
- PostgreSQL persistence when the server is available
- Detailed per-keystroke recording
- Replayable completed runs
- Racing against previous runs
- Configurable typing behavior
- Multiple game types implemented as configurations
- Reports and charts

The primary goal is **typing-speed practice**, with separate measurement
of:

1. **Raw keyboard activity**
2. **Effective typing outcome**

The MVP is single-user. Multi-user architecture is explicitly deferred
to the next iteration.

---

# 2. Technology Stack

## Client

- SolidJS
- TypeScript
- Vite
- Development port: `30002`
- Production deployment target: GitHub Pages

## Server

- Go
- HTTP/JSON API
- Development/runtime port: `30001`

## Database

PostgreSQL:

- Host: `localhost`
- Port: `5432`
- Database: `typetest`
- User: `typetest1user`
- Password: `typetest1password`

Database credentials must exist only on the server and must never be
included in the client bundle.

---

# 3. Architecture

``` text
┌──────────────────────────────────────────────────────────────┐
│                     SolidJS Client :30002                    │
│                                                              │
│  UI                                                          │
│  Typing Engine                                               │
│  Game Configuration                                          │
│  Reports / Charts                                            │
│  localStorage                                                │
│  IndexedDB                                                   │
│  Synchronization                                             │
└─────────────────────────────┬────────────────────────────────┘
                              │
                    Server available?
                       ┌──────┴──────┐
                       │             │
                      YES            NO
                       │             │
                       ▼             ▼
              ┌────────────────┐   Browser storage
              │   Go Server    │
              │     :30001     │
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │   PostgreSQL   │
              │     :5432      │
              │    typetest    │
              └────────────────┘
```

The client must function independently of the server.

The application must not require the frontend and API to share an
origin.

---

# 4. Storage Strategy

The application is offline-first.

## 4.1 In-memory active run

While a run is active, the complete run event stream is kept in memory.

There is no streaming persistence to the server.

A run behaves like an immutable game record:

``` text
Run starts
    ↓
Clock starts
    ↓
Events accumulate in memory
    ↓
Run finishes
    ↓
Metrics calculated
    ↓
Complete run persisted
```

This is intentional and enables replay and racing.

## 4.2 localStorage

Use localStorage for small, universally supported data:

- application settings
- game configuration
- source metadata
- recent run summaries
- synchronization metadata
- UI preferences

Do not store complete run event streams in localStorage unless required
as a browser fallback.

## 4.3 IndexedDB

When available, use IndexedDB for larger data:

- complete run objects
- complete event streams
- source contents
- normalized target snapshots
- historical local runs

IndexedDB is an optimization/capability layer, not a requirement for the
application to function.

## 4.4 Browser fallback

If IndexedDB is unavailable:

- application remains usable
- localStorage remains available
- active runs remain in memory
- small run summaries can be retained locally

The application must detect IndexedDB capability rather than assume it.

## 4.5 PostgreSQL

When the Go server is available, completed runs are persisted to
PostgreSQL.

Persistence happens after the run finishes.

No live keystroke streaming is required.

---

# 5. Server Availability

The client checks:

``` text
GET /api/health
```

The header displays connection status.

Online:

``` text
● Online
```

Offline:

``` text
● Offline
```

The offline indicator must be grey.

Server availability must never prevent the user from starting or
completing a typing test.

The UI should not display intrusive connection errors during typing.

---

# 6. Layout

The application has:

1. Fixed/sticky header
2. Two-pane body
3. Left sidebar
4. Right content area
5. Normal-flow footer

``` text
┌──────────────────────────────────────────────────────────────┐
│ Typing Test                    Tab: 4             ● Online    │
├────────────────┬─────────────────────────────────────────────┤
│                │                                             │
│ Typing Data    │                                             │
│                │                                             │
│ Sources        │              Main Content                   │
│                │                                             │
│ Upload File    │                                             │
│ Add Text       │                                             │
│                │                                             │
│ Reports        │                                             │
│                │                                             │
│                │                                             │
│ Settings       │                                             │
│                │                                             │
├────────────────┴─────────────────────────────────────────────┤
│ Footer                                                       │
└──────────────────────────────────────────────────────────────┘
```

## Header

Sticky/fixed.

Contains:

- application name
- current tab configuration
- online/offline status

The tab configuration appears immediately before the online/offline
status.

## Sidebar

Contains:

- typing data
- source list
- upload file
- add text
- reports
- settings at the bottom

## Footer

Not fixed.

Not sticky.

---

# 7. Distraction-Free Typing Screen

During an active run, the content area should be minimal.

Primary content:

``` text
Target text
```

Minimal status:

``` text
Effective WPM    Accuracy    Time
```

and:

``` text
[ Stop ]
```

Do not display the full analytics dashboard during typing.

Detailed analytics belong in the completed-run view and Reports.

---

# 8. Source Management

The application supports:

## Files

Initially support:

``` text
.go
.rs
.js
.jsx
.ts
.tsx
.py
.java
.c
.h
.cpp
.hpp
.sh
.bash
.zsh
.sql
.html
.css
.txt
.md
```

The extension list should be configurable in code.

## Pasted text

The user can click:

``` text
+ Add Text
```

and paste or type arbitrary content.

The source can be named.

## Uploaded files

The user can click:

``` text
+ Upload File
```

and select a local file.

Store metadata such as:

- source ID
- filename
- extension
- size
- content hash
- created/added timestamp

Normal browser file selection does not reliably expose the absolute
filesystem path. The filename is therefore the primary source identity.

---

# 9. Source Persistence

There is no special source-content privacy policy in the MVP.

Store source data according to storage availability:

- localStorage for metadata
- IndexedDB for full content when supported
- PostgreSQL when server persistence is available

The source content can therefore be persisted locally and/or remotely as
appropriate.

The application should not require source content to remain available
for historical runs because each completed run stores its own target
snapshot.

---

# 10. Text Selection

The user can practice:

- the whole source
- an arbitrary selected text range

A selection should be represented using source metadata where possible:

``` text
source_id
start_offset
end_offset
```

When a run begins, the selected target text is materialized into the
run.

This makes the run independent of later source changes or deletion.

---

# 11. Text Normalization

Before a run begins:

1. Normalize line endings:
    - `\r\n` → `\n`
    - `\r` → `\n`
2. Trim leading and trailing whitespace.
3. Preserve internal whitespace exactly.
4. Preserve the distinction between:
    - spaces
    - tabs
    - newlines

Example:

``` text
"  func main() {\r\n    return\r\n}\r\n"
```

becomes:

``` text
"func main() {\n    return\n}"
```

The final `}` is sufficient to complete the test.

Trailing spaces/newlines do not need to be typed.

---

# 12. Whitespace Model

The typing engine has explicit semantic categories:

  Type        Meaning
  ----------- ---------
  `SPACE`     Space
  `TAB`       Tab
  `NEWLINE`   Newline

`\r\n`, `\r`, and `\n` all become the same internal `NEWLINE`
representation.

Whitespace must remain distinguishable for statistics.

A tab must not be converted into an ordinary space in the underlying
target model.

---

# 13. Tab Configuration

The header exposes the current tab configuration.

Examples:

``` text
Tab: 2
Tab: 4
Tab: 8
Tab: literal
```

The configuration determines how tabs are visually represented/typed.

The exact internal representation of a tab remains distinct from spaces.

The user can change tab configuration directly from the header.

The complete configuration is also available under Settings.

---

# 14. Visible Whitespace

Tabs and newlines must be visibly distinguishable.

Default visual representation:

``` text
Space     ·
Tab       →
Newline   ↵
```

The user can configure:

- show spaces
- show tabs
- show newlines
- space symbol
- tab symbol
- newline symbol

These settings are under the Settings section at the bottom of the
sidebar.

---

# 15. Typing Text Rendering

Each target character has a state:

- untyped
- current
- correct
- incorrect

While typing, the character color changes according to state.

The application should keep the rendering simple and readable.

Whitespace glyphs should be visually distinct from ordinary characters.

---

# 16. Keyboard Input

The typing engine records keyboard behavior rather than relying solely
on final input values.

Relevant events include:

- normal character keys
- numbers
- punctuation
- symbols
- Space
- Tab
- Enter
- Backspace
- Delete
- Arrow keys
- other navigation keys relevant to typing

Modifier-only events such as Shift/Ctrl/Alt/Meta are recorded if needed
for event reconstruction but do not count as independent typing actions
for Raw WPM.

---

# 17. Error Behavior

Error handling is configurable.

Default:

``` text
blockOnError = false
```

The user can continue typing after an error.

Example:

``` text
Target: function
Typed:  functoin
```

The user may continue.

The incorrect event is retained in the run history.

---

# 18. Correction

Backspace and Delete are supported.

Navigation is contextual.

The user may:

- press Backspace
- move with arrow keys
- use Delete
- move back to a previous location
- correct previously entered content

The event stream must record these actions exactly.

Do not reduce all correction behavior to a Backspace-only model.

Example:

``` text
character
character
ArrowLeft
ArrowLeft
Delete
character
```

must remain reconstructable.

Correction can be enabled or disabled by game/user configuration.

---

# 19. Game Types

Game types are configuration presets over the common typing engine.

They are not separate typing-engine implementations.

Initial game types:

## Normal

Default practice mode.

- errors allowed
- corrections enabled
- default time limit: 90 seconds
- completion ends the run
- manual stop allowed

## Sudden Death

- first qualifying typing error ends the run

## Racing

- compare current run against a previous completed run
- previous run's clock/event data becomes the opponent/reference

## Correction Mode

- correction is explicitly enabled and emphasized

## No Correction

- correction operations are disabled/ignored according to
    configuration

Future game types should be composable from the same configuration
primitives.

---

# 20. Game Configuration

A run stores the complete configuration used for that run.

Example:

``` json
{
  "gameType": "normal",
  "timeLimitMs": 90000,
  "allowCorrection": true,
  "blockOnError": false,
  "showSpaces": true,
  "showTabs": true,
  "showNewlines": true,
  "tabWidth": 4
}
```

Historical runs must remain interpretable even if current settings
change.

---

# 21. Time Limits

Default:

``` text
90 seconds
```

Preset values should include:

``` text
30
60
90
120
180
300
```

and additional reasonable values.

The user can enter a custom duration.

Custom durations can be saved for future use.

The time limit is game configuration data, not hard-coded typing-engine
behavior.

---

# 22. Run Termination

A run can end through:

1. Target completion
2. Manual Stop
3. Time limit
4. Game rule, such as Sudden Death

No resume functionality is required.

An interrupted active run is discarded.

---

# 23. Run Lifecycle

``` text
READY
  ↓
RUNNING
  ├── COMPLETED
  ├── MANUAL_STOP
  ├── TIME_LIMIT
  └── GAME_RULE
```

There is no resume state.

---

# 24. Run Event Model

Every meaningful keyboard action is recorded.

Each event has a timestamp relative to run start.

Example:

``` json
{
  "t": 1842,
  "type": "keydown",
  "key": "a",
  "code": "KeyA"
}
```

Backspace:

``` json
{
  "t": 2931,
  "type": "keydown",
  "key": "Backspace",
  "code": "Backspace"
}
```

Navigation:

``` json
{
  "t": 3512,
  "type": "keydown",
  "key": "ArrowLeft",
  "code": "ArrowLeft"
}
```

The event stream must contain enough information to reconstruct the run.

---

# 25. Event Clock

Every event uses:

``` text
t = milliseconds since run start
```

The run itself stores an absolute local timestamp:

``` text
startedAt
```

Therefore:

``` text
absolute event time = startedAt + t
```

This supports:

- replay
- race comparison
- timing analysis
- historical reporting

A monotonic clock should be used for elapsed-duration measurement where
possible, while the absolute timestamp is used for historical/calendar
reporting.

---

# 26. Completed Run Object

A completed run is self-contained.

Conceptually:

``` json
{
  "id": "UUID",
  "startedAt": "...",
  "durationMs": 84213,

  "configuration": {
    "gameType": "normal",
    "timeLimitMs": 90000,
    "allowCorrection": true,
    "blockOnError": false
  },

  "source": {
    "id": "...",
    "name": "server.go",
    "selection": {
      "start": 120,
      "end": 840
    }
  },

  "target": "func main() {\n    ...}",

  "events": [
    {
      "t": 413,
      "type": "keydown",
      "key": "f",
      "code": "KeyF"
    }
  ],

  "metrics": {
    "raw": {},
    "effective": {}
  },

  "status": "completed"
}
```

The exact TypeScript type should be defined before implementation.

---

# 27. Replayability

A completed run must contain enough information to reconstruct the
typing session.

At minimum:

- normalized target text
- game configuration
- event stream
- relative event timestamps
- run start timestamp
- final run state

The source itself may subsequently change or be deleted without
invalidating the historical run.

---

# 28. Raw Typing Metrics

Raw metrics measure physical keyboard activity.

Examples:

- total meaningful keystrokes
- character keypresses
- whitespace keypresses
- correction keys
- Backspace count
- Delete count
- navigation-key count
- incorrect keypresses
- key timing
- inter-key intervals
- dwell time where available

Modifier-only events are not independent typing actions.

---

# 29. Effective Typing Metrics

Effective metrics measure the resulting typing outcome.

Examples:

- target characters
- correctly completed characters
- effective characters
- incorrect characters
- corrected errors
- uncorrected errors
- accuracy
- effective error rate
- effective WPM

---

# 30. WPM Definitions

The application reports at least two WPM values.

## Effective WPM

Measures successfully completed target content:

``` text
Effective WPM =
    effective characters / 5 / elapsed minutes
```

The effective-character count represents target content successfully
produced in the resulting typing state.

Corrections do not directly add effective characters.

## Raw Keystroke WPM

Measures meaningful keyboard activity:

``` text
Raw WPM =
    meaningful keystrokes / 5 / elapsed minutes
```

Meaningful keystrokes include:

- character keys
- Space
- Tab
- Enter
- Backspace
- Delete
- Arrow/navigation keys

Modifier-only keys are excluded.

Example:

``` text
a
Backspace
a
```

produces three meaningful raw keystrokes.

This makes Raw WPM a measure of physical typing activity rather than
conventional final-text speed.

---

# 31. Accuracy and Error Metrics

Reports distinguish raw activity from effective outcome.

Example:

``` text
Effective WPM       72
Raw Keystroke WPM   91

Accuracy           97.9%
Effective Errors    7
Corrected Errors   10

Total Keystrokes  455
Backspaces         11
Deletes             3
```

The exact definitions of accuracy/error counts must be implemented
consistently across all game types.

The two WPM values must always be explicitly labeled.

---

# 32. Source and Target Statistics

The target text provides expected character frequencies.

Character categories include:

- letters
- digits
- punctuation
- symbols
- spaces
- tabs
- newlines

Programming-specific symbols must be treated as first-class characters:

``` text
{ } [ ] ( )
< > / \
: ; , .
_ -
= + *
```

---

# 33. Key Distribution Reports

Show expected vs actual key distribution.

Example:

  Key     Expected   Actual   Deviation
  ----- ---------- -------- -----------
  `e`        12.4%    13.1%       +0.7%
  `t`         9.8%     8.9%       -0.9%
  `a`         8.2%     7.4%       -0.8%

The distribution is normalized by occurrence count in the target text.

Whitespace is separately categorized:

``` text
Space
Tab
Newline
```

---

# 34. Timing Distributions

Charts/statistics should support:

- inter-key interval
- key dwell time where available
- correction latency
- character completion timing

Statistics:

- mean
- median
- standard deviation
- P50
- P90
- P95
- P99

If a normal distribution is fitted, clearly label it as a fitted
distribution rather than assuming typing data is normally distributed.

---

# 35. Reports

Required report views:

  Report                  Type
  ----------------------- ------------
  Previous Run            Single run
  Previous Previous Run   Single run
  Last 7 Days             Aggregate
  Last 30 Days            Aggregate
  All Time                Aggregate

All date/time calculations use the user's local timezone.

## Previous Run

Display:

- effective WPM
- raw WPM
- accuracy
- error rate
- duration
- target size
- keystrokes
- corrections
- Backspace/Delete/navigation counts
- key distributions
- timing distributions

## Previous Previous Run

Same single-run structure.

## Last 7 Days

Aggregate runs from the previous rolling seven days.

## Last 30 Days

Aggregate runs from the previous rolling thirty days.

## All Time

Aggregate all available runs.

---

# 36. Report Slicing

The underlying run data should support future filtering by:

- date/time
- source
- language/extension
- game type
- time limit
- WPM
- accuracy
- error rate
- run duration
- correction behavior

The MVP UI does not need to expose every filter.

The data model should not prevent it.

---

# 37. Charts

MVP chart categories:

## Speed

- Effective WPM
- Raw WPM
- WPM over time
- previous-run comparison

## Accuracy/Error

- accuracy over time
- effective error rate
- corrected vs uncorrected errors

## Keyboard

- expected key distribution
- actual key distribution
- normalized deviation
- correction-key distribution

## Whitespace

- expected vs actual spaces
- tabs
- newlines

## Timing

- inter-key interval histogram
- timing distribution
- correction latency

---

# 38. Racing

Racing uses a previous completed run.

The previous run provides:

- target
- event timestamps
- effective progress over time

The current run can be compared against the historical run.

Conceptually:

``` text
Previous:
t=1.2s → character 1
t=1.4s → character 2
t=1.7s → character 3

Current:
t=1.0s → character 1
t=1.5s → character 2
t=1.8s → character 3
```

The UI can show whether the current run is ahead or behind.

The event stream is retained specifically to enable this functionality.

---

# 39. Settings

Settings are located at the bottom of the left sidebar.

Settings include:

## Typing

- default game type
- error blocking
- correction enabled
- default time limit

## Display

- show spaces
- show tabs
- show newlines
- space glyph
- tab glyph
- newline glyph

## Keyboard

- tab configuration
- tab width

## Storage

- local persistence
- server synchronization

The tab configuration is additionally exposed directly in the header for
quick access.

---

# 40. Local Synchronization

Every completed run gets a unique ID before persistence.

Example:

``` text
run_id = UUID
```

The local run is persisted first.

If the server is available, the complete run is sent to:

``` text
POST /api/runs
```

The request must be idempotent.

Uploading the same `run_id` multiple times must not create duplicate
database records.

Possible local synchronization states:

``` text
pending
synced
failed
```

Synchronization occurs after the run completes.

---

# 41. Database Model

A first-pass PostgreSQL model:

``` text
sources
────────────────────────
id
name
filename
extension
size
content_hash
content
created_at
updated_at
```

``` text
typing_runs
────────────────────────
id
source_id
started_at
duration_ms
status

game_type
configuration

target
events

raw_metrics
effective_metrics

created_at
```

For the MVP, `target`, `events`, and metric structures can be stored as
PostgreSQL `jsonb`/text fields where appropriate.

A separate `run_events` table is not required initially because the run
is naturally an immutable event document.

The schema should remain open to normalization if event-level querying
becomes necessary later.

---

# 42. API

Initial API:

``` text
GET    /api/health

GET    /api/sources
POST   /api/sources
GET    /api/sources/{id}
DELETE /api/sources/{id}

GET    /api/runs
GET    /api/runs/{id}
POST   /api/runs

GET    /api/reports/previous
GET    /api/reports/previous-previous
GET    /api/reports/7-days
GET    /api/reports/30-days
GET    /api/reports/all-time
```

Use JSON request/response bodies.

Do not expose PostgreSQL-specific details through the client API.

---

# 43. Single-User MVP

The MVP has no authentication.

Do not implement:

- registration
- login
- sessions
- users table
- authorization
- multi-user permissions

The server represents one user's dataset.

---

# 44. Next Iteration: Multi-User

Multi-user support is explicitly deferred.

The next architecture can introduce:

``` text
users
  │
  ├── sources
  ├── runs
  ├── settings
  └── game configurations
```

with user ownership and authentication.

The MVP should avoid prematurely implementing these concepts.

---

# 45. CSS and Visual Design

CSS must remain minimal.

Use:

- semantic HTML
- CSS variables
- Flexbox
- CSS Grid where useful
- system fonts
- a small number of reusable classes

Avoid:

- large CSS frameworks
- elaborate component libraries
- excessive animations
- decorative UI
- unnecessary gradients
- excessive borders
- large dashboard elements during typing

The typing surface is the primary visual element.

---

# 46. Suggested Client Structure

``` text
src/
├── components/
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── Footer.tsx
│   ├── TypingArea.tsx
│   ├── TypingText.tsx
│   ├── RunControls.tsx
│   ├── SourceList.tsx
│   ├── FileUploader.tsx
│   ├── TextEditor.tsx
│   └── reports/
│       ├── RunReport.tsx
│       ├── AggregateReport.tsx
│       └── charts/
│
├── typing/
│   ├── engine.ts
│   ├── events.ts
│   ├── metrics.ts
│   ├── errors.ts
│   ├── normalization.ts
│   └── distributions.ts
│
├── games/
│   ├── types.ts
│   ├── normal.ts
│   ├── suddenDeath.ts
│   ├── racing.ts
│   └── configuration.ts
│
├── storage/
│   ├── localStorage.ts
│   ├── indexedDb.ts
│   └── sync.ts
│
├── api/
│   ├── client.ts
│   └── health.ts
│
├── state/
│   ├── typing.ts
│   ├── sources.ts
│   ├── settings.ts
│   └── reports.ts
│
└── App.tsx
```

---

# 47. Suggested Go Structure

``` text
server/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── api/
│   ├── database/
│   ├── sources/
│   ├── runs/
│   └── reports/
├── migrations/
└── go.mod
```

---

# 48. Core Data Flow

``` text
                    SOURCE
                       │
             ┌─────────┴─────────┐
             │                   │
         File upload          Pasted text
             │                   │
             └─────────┬─────────┘
                       ▼
                  Source Model
                       │
                       ▼
                Select text range
                       │
                       ▼
               Normalize target
                       │
                       ▼
                Game Configuration
                       │
                       ▼
                   Begin Run
                       │
                       ▼
               ┌───────────────┐
               │ Typing Engine │
               │               │
               │ Target state  │
               │ Cursor state  │
               │ Event stream  │
               │ Relative clock│
               └───────┬───────┘
                       │
                  Run finishes
                       │
                       ▼
                 Complete Run
                       │
             ┌─────────┼─────────┐
             ▼         ▼         ▼
          local      IndexedDB PostgreSQL
        metadata      full run   if online
             │         │         │
             └─────────┼─────────┘
                       ▼
                 Reports/Charts
```

---

# 49. MVP Acceptance Criteria

The MVP is complete when all of the following work.

## Typing

- [ ] User can upload a supported programming/text file.
- [ ] User can paste text.
- [ ] User can select arbitrary text.
- [ ] Line endings are normalized.
- [ ] Leading/trailing whitespace is trimmed.
- [ ] Internal spaces, tabs, and newlines remain distinct.
- [ ] Spaces, tabs, and newlines can be visually displayed.
- [ ] Tab behavior is configurable.
- [ ] Characters change visual state while typing.
- [ ] Incorrect typing is recorded.
- [ ] Backspace works.
- [ ] Delete works.
- [ ] Arrow-key navigation works contextually.
- [ ] Correction can be enabled/disabled.
- [ ] Error blocking can be enabled/disabled.
- [ ] Test automatically completes at target completion.
- [ ] User can manually stop.
- [ ] Time limit can terminate a run.
- [ ] Default time limit is 90 seconds.
- [ ] No run can be resumed.

## Game modes

- [ ] Normal mode works.
- [ ] Sudden Death works.
- [ ] Racing against a previous run works.
- [ ] Correction mode works.
- [ ] No Correction mode works.
- [ ] Game modes are configuration-driven.

## Recording

- [ ] Every meaningful keyboard action is recorded.
- [ ] Events have relative timestamps.
- [ ] The complete run exists in memory until completion.
- [ ] Completed runs contain the normalized target snapshot.
- [ ] Completed runs are replayable/reconstructable.
- [ ] No event streaming to the server is required.

## Metrics

- [ ] Effective WPM is calculated.
- [ ] Raw Keystroke WPM is calculated.
- [ ] Accuracy is calculated.
- [ ] Effective error rate is calculated.
- [ ] Corrected errors are counted.
- [ ] Uncorrected errors are counted.
- [ ] Backspace/Delete/navigation activity is counted.
- [ ] Key distributions are calculated.
- [ ] Whitespace distributions are calculated.
- [ ] Timing distributions are calculated.

## Persistence

- [ ] Application works without a server.
- [ ] Settings persist in localStorage.
- [ ] Small run/source metadata persists in localStorage.
- [ ] IndexedDB is used when available.
- [ ] Application has a functional fallback when IndexedDB is
    unavailable.
- [ ] Server availability is detected.
- [ ] Offline state appears grey in the header.
- [ ] Completed runs are uploaded when the server is available.
- [ ] Duplicate run uploads are idempotent.
- [ ] PostgreSQL stores completed runs.

## Reports

- [ ] Previous Run exists.
- [ ] Previous Previous Run exists.
- [ ] Last 7 Days exists.
- [ ] Last 30 Days exists.
- [ ] All Time exists.
- [ ] Reports use local timezone.
- [ ] Reports expose raw and effective performance separately.
- [ ] Reports include charts.
- [ ] Historical runs remain interpretable after source
    deletion/modification.

## UI

- [ ] Header is sticky/fixed.
- [ ] Sidebar is on the left.
- [ ] Main content is on the right.
- [ ] Footer is neither sticky nor fixed.
- [ ] Upload File exists in sidebar.
- [ ] Add Text exists in sidebar.
- [ ] Reports exist in sidebar.
- [ ] Settings are at the bottom of the sidebar.
- [ ] Tab configuration is visible in the header immediately before
    connection status.
- [ ] Typing view is distraction-free.
- [ ] CSS remains minimal.

---

# 50. Deferred Features

The following are intentionally outside MVP:

- multi-user accounts
- authentication
- cross-device synchronization
- leaderboards
- cloud sharing
- social features
- public races
- advanced keyboard heatmaps
- random code-generation modes
- difficulty scoring
- streak systems
- achievements
- native filesystem integration
- advanced replay controls
- calendar-based report customization
- arbitrary report query builder
- server-side source indexing
