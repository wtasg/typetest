# Feature Specification: Uploaded File Text Selection

## 1. Feature Overview

Add a source-selection workflow for uploaded files.

The user can open an uploaded programming/text file, select the portion they want to practice, and start a typing test using only that selection.

This is particularly useful for programming files containing license headers, copyright notices, SPDX headers, generated-file notices, large comment blocks, or boilerplate that is not useful typing practice.

Selection is a normal part of the uploaded-file workflow, not an advanced feature.

---

## 2. Goal

The user can:

1. Upload a supported file via [FileUploader.tsx](file:///home/user/src/gh/wtasg/typetest/client/src/components/FileUploader.tsx).
2. Open the uploaded file from the source list in [TypingView.tsx](file:///home/user/src/gh/wtasg/typetest/client/src/components/TypingView.tsx).
3. View its content with line numbers in a dedicated source viewer.
4. Select an arbitrary contiguous portion of text using native browser mouse/keyboard selection.
5. View live feedback showing the selected line range (e.g. `lines 6–12`) and character count (`86 characters`).
6. Start a typing test using that exact selection via Practice Selection.
7. Optionally practice the entire file without making a selection via Practice All.

The feature integrates directly with [TypingEngine](file:///home/user/src/gh/wtasg/typetest/client/src/typing/engine.ts) and [runState](file:///home/user/src/gh/wtasg/typetest/client/src/state/typing.ts) without altering engine internals or scoring metrics.

---

## 3. User Workflow

```text
Upload File (FileUploader)
    ↓
File appears in Sources (sourcesState / IndexedDB)
    ↓
Select Source (SourceList)
    ↓
Render Source Content with Line Numbers (SourceViewer)
    ↓
Select portion using Browser Selection (live via selectionchange)
    ↓
Update Selection State (TextSelection | null)
    ↓
Practice Selection ──► Extract ➔ Normalize ➔ startRun() ➔ RUNNING
```

Alternative (Practice Whole File):

```text
Upload File
    ↓
Select Source
    ↓
Practice All ──► Full Content ➔ Normalize ➔ startRun() ➔ RUNNING
```

---

## 4. Source View Architecture

The main typing setup view ([TypingView.tsx](file:///home/user/src/gh/wtasg/typetest/client/src/components/TypingView.tsx)) contains the source selection sidebar and source content workspace:

```text
┌───────────────────────────┬─────────────────────────────────────────────────────────────┐
│ Sources                   │ server.go                                  [ Practice All ] │
├───────────────────────────┼──────┬──────────────────────────────────────────────────────┤
│ • server.go               │  1   │ /*                                                   │
│ • main.rs                 │  2   │  * Copyright 2026 ...                                │
│ • utils.ts                │  3   │  * Licensed under ...                                │
│                           │  4   │  */                                                  │
│ [+ Upload File]           │  5   │                                                      │
│                           │  6   │ package main                                         │
│                           │  7   │                                                      │
│                           │  8   │ import "fmt"                                         │
│                           │  9   │                                                      │
│                           │ 10   │ func main() {                                        │
│                           │ 11   │     fmt.Println("hello")                             │
│                           │ 12   │ }                                                    │
│                           ├──────┴──────────────────────────────────────────────────────┤
│                           │ Selection: lines 6–12 · 86 characters                       │
│                           │                                                             │
│                           │                                  [ Practice Selection ]     │
└───────────────────────────┴─────────────────────────────────────────────────────────────┘
```

The source view remains visually simple, using minimal CSS that seamlessly aligns with [index.css](file:///home/user/src/gh/wtasg/typetest/client/src/index.css).

---

## 5. File Display & Line Numbering

The source viewer renders the normalized raw file content with separate line numbers:

- Display line numbers in a left gutter element.
- Gutter element has `user-select: none;` to prevent line numbers from entering browser selection ranges.
- Display source text in an adjacent `<pre class="source-content-pre">` element.
- Preserve all whitespace (spaces, tabs `\t`, newlines `\n`).
- Do not apply syntax highlighting (keeps browser Selection offset mapping 1:1 with text offset).

### DOM Layout & CSS

```html
<div class="source-viewer">
  <div class="line-number-gutter" aria-hidden="true">
    <div>1</div>
    <div>2</div>
    ...
  </div>
  <pre class="source-content-pre">{sourceContent}</pre>
</div>
```

```css
.source-viewer {
    display: flex;
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: auto;
    max-height: 500px;
    font-family: var(--font-mono);
}

.line-number-gutter {
    user-select: none;
    -webkit-user-select: none;
    padding: 0.5rem;
    background: var(--bg-dim);
    color: var(--fg-dim);
    text-align: right;
    border-right: 1px solid var(--border);
}

.source-content-pre {
    margin: 0;
    padding: 0.5rem;
    white-space: pre;
    font-family: inherit;
    user-select: text;
    -webkit-user-select: text;
    flex-grow: 1;
}
```

---

## 6. Syntax Highlighting Policy

Syntax highlighting is excluded from the selection view.

Splitting text across syntax-highlighted `<span>` tokens (e.g. Prism/Shiki/Highlight.js) breaks simple character offset calculations during `window.getSelection()`.

Using a plain `<pre>` ensures `Range.startOffset` and `Range.endOffset` map directly to the character indices in the underlying source content string.

Syntax highlighting may be evaluated as a future extension without changing the offset data model.

---

## 7. Selection Model & Offset Mapping (CRLF & Unicode Handling)

### Data Model

The selection model is defined as a clean nullable type in [types.ts](file:///home/user/src/gh/wtasg/typetest/client/src/typing/types.ts):

```ts
export interface TextSelection {
    startOffset: number; // inclusive 0-based character index
    endOffset: number;   // exclusive 0-based character index
}
```

### Line Ending Normalization (`CRLF` / `CR` ➔ `LF`) & Offsets

DOM text nodes in browsers treat line breaks as single `\n` characters (1 code unit). If raw source text contains Windows `\r\n` (CRLF), DOM selection offsets reported by `Range` measure 1 character per newline, whereas string slicing against un-normalized `\r\n` text would count 2 characters per newline (`\r` + `\n`), resulting in offset drift.

Contract: When source content is stored or loaded into `SourceViewer`, line endings are normalized (`\r\n` / `\r` ➔ `\n`). This ensures that JavaScript string indices and DOM text node offsets align 1:1.

For Unicode surrogate pairs (e.g. Emoji / UTF-16 code units), JavaScript `.length` and DOM `Range` offsets both operate on UTF-16 code units, maintaining exact alignment.

### Live DOM Browser Selection Handler (`selectionchange`)

Instead of relying solely on `mouseup` / `keyup`, we attach a `selectionchange` listener to `document` to provide truly continuous, live UI feedback as the user drags or modifies a selection:

```ts
export function getSelectionOffsetsFromDOM(
    containerEl: HTMLElement,
    textLength: number,
): TextSelection | null {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        return null;
    }

    const range = sel.getRangeAt(0);
    if (!containerEl.contains(range.commonAncestorContainer)) {
        return null;
    }

    // Measure character offsets relative to pre container text content
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(containerEl);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preCaretRange.toString().length;

    preCaretRange.setEnd(range.endContainer, range.endOffset);
    const endOffset = preCaretRange.toString().length;

    if (startOffset >= endOffset || startOffset < 0 || endOffset > textLength) {
        return null;
    }

    return { startOffset, endOffset };
}
```

---

## 8. Selection UI & Shared Metadata Resolver

### Store Integration ([sources.ts](file:///home/user/src/gh/wtasg/typetest/client/src/state/sources.ts))

The state store maintains selection as `TextSelection | null` rather than sentinel numbers:

```ts
export interface SourcesState {
    sources: Source[];
    selectedId: string | null;
    selection: TextSelection | null;
}
```

### Shared Metadata Resolver (`computeSelectionMeta`)

All components and helper functions use a single, canonical function to compute selection metadata:

```ts
export interface SelectionMeta {
    startLine: number;
    endLine: number;
    charCount: number;
}

export function computeSelectionMeta(
    content: string,
    selection: TextSelection | null,
): SelectionMeta | null {
    if (!selection) return null;
    const { startOffset, endOffset } = selection;
    if (startOffset < 0 || endOffset <= startOffset || endOffset > content.length) {
        return null;
    }

    let startLine = 1;
    for (let i = 0; i < startOffset; i++) {
        if (content[i] === '\n') startLine++;
    }

    let endLine = startLine;
    for (let i = startOffset; i < endOffset; i++) {
        if (content[i] === '\n') endLine++;
    }

    const charCount = endOffset - startOffset;
    return { startLine, endLine, charCount };
}
```

### UI Render States

- No Selection (`selection === null`):

  ```text
  Selection: None
  [ Practice Selection ] (disabled)
  ```

- Active Selection:

  ```text
  Selection: lines 6–12 · 86 characters
  [ Practice Selection ] (enabled)
  ```

---

## 9. Practice All (Full-File Standardized Range)

Clicking Practice All:

1. Retrieves raw source string `source.content` from IndexedDB via `getSourceContent(id)`.
2. Standardizes full-file selection range as `{ startOffset: 0, endOffset: content.length }`.
3. Routes content through `prepareRunTarget(content, 0, content.length)`.
4. Calls `startRun(normalizedTarget, source.id, source.name, 0, content.length)` in [src/state/typing.ts](file:///home/user/src/gh/wtasg/typetest/client/src/state/typing.ts).

---

## 10. Practice Selection

Clicking Practice Selection:

1. Validates `sourcesState.selection` is non-null.
2. Routes content and selection through `prepareRunTarget(content, selection.startOffset, selection.endOffset)`.
3. Calls `startRun(normalizedTarget, source.id, source.name, selection.startOffset, selection.endOffset)`.

---

## 11. Unified Target Pipeline (`prepareRunTarget`)

Both Practice Selection and Practice All route through the single authoritative function `prepareRunTarget()` to guarantee identical extraction, line ending normalization, and trimming rules:

```text
Source Content (`source.content`)
               │
               ▼
Extract Slice (`content.slice(startOffset, endOffset)`)
               │
               ▼
Normalize Line Endings (`\r\n` / `\r` ➔ `\n`)
               │
               ▼
Trim Outer Whitespace (`.trim()`)
               │
               ▼
Run Target Snapshot (`runState.target`)
```

### Implementation Code

```ts
export function prepareRunTarget(
    content: string,
    startOffset = 0,
    endOffset = content.length,
): string {
    const rawSlice = (endOffset > startOffset && (startOffset > 0 || endOffset < content.length))
        ? content.slice(startOffset, endOffset)
        : content;

    return rawSlice
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();
}
```

---

## 12. Line Ending Normalization

Line endings are normalized strictly after extraction:

```text
\r\n  ──►  \n
\r    ──►  \n
\n    ──►  \n
```

This guarantees consistent cross-platform line break rendering in [TypingText.tsx](file:///home/user/src/gh/wtasg/typetest/client/src/components/TypingText.tsx).

---

## 13. Outer Whitespace Trimming

After extraction and line ending normalization, leading and trailing whitespace is trimmed using `.trim()`.

Example:

```text
Input slice:   "\n\n  func main() {\n      return\n  }\n\n"
Normalized:    "func main() {\n      return\n  }"
```

Trimming ensures the run target starts on the first printable/code character and ends cleanly on the final character without trailing newline artifacts.

---

## 14. Internal Whitespace Preservation

Internal whitespace within the selected slice is strictly preserved:

- Space characters (`' '`) remain spaces.
- Tabs (`'\t'`) remain tabs.
- Internal newlines (`'\n'`) remain newlines.

Tabs are not expanded to spaces during normalization. Tab visual width (`tabWidth`: 2, 4, or 8) and tab mode (`expand` | `literal`) continue to be controlled by [GameConfig](file:///home/user/src/gh/wtasg/typetest/client/src/typing/types.ts#L30-L44) settings.

---

## 15. Run Snapshot & Persistence

When a run starts, `startRun(...)` creates an immutable target snapshot:

```ts
const run: CompletedRun = {
    id: crypto.randomUUID(),
    startedAt: snap.startedAt?.toISOString() ?? new Date().toISOString(),
    durationMs: snap.elapsedMs,
    configuration: { ...settings },
    source: {
        id: _activeSourceId,
        name: _activeSourceName,
        selection: { start: startOffset, end: endOffset },
    },
    target: snap.target, // Normalized immutable target snapshot
    events: snap.events,
    metrics: { raw: rawMetrics, effective: effectiveMetrics },
    status,
    syncStatus: 'pending',
};
```

Because `CompletedRun.target` stores the exact target snapshot, historical runs, replays, and race targets remain 100% valid even if the underlying source file is modified or deleted later.

---

## 16. Source Mutation & Selection Invalidation

If a source is edited, updated, or removed:

- Existing completed runs: Unaffected (they rely on `CompletedRun.target`).
- Active selection in UI: When `updateSource(id, ...)` is called on an active source, `selection` is set to `null` (invalidating the active selection and requiring a fresh selection).

```ts
export function resetSourceSelection(): void {
    setSourcesState('selection', null);
}
```

---

## 17. Source Data Model & Storage Architecture

### TypeScript Type ([src/typing/types.ts](file:///home/user/src/gh/wtasg/typetest/client/src/typing/types.ts#L63-L71))

```ts
export interface Source {
    id: string;
    name: string;
    filename: string;
    extension: string;
    size: number;
    contentHash: string;
    createdAt: string;
}

export interface StoredSource extends Source {
    content: string;
}
```

### Storage Persistence Layers

1. `localStorage` ([src/storage/localStorage.ts](file:///home/user/src/gh/wtasg/typetest/client/src/storage/localStorage.ts)): Stores metadata array `Source[]` under key `'tt:sources'`.
2. `IndexedDB` ([src/storage/indexedDb.ts](file:///home/user/src/gh/wtasg/typetest/client/src/storage/indexedDb.ts)): Stores full file content `StoredSource` in `sources` object store.
3. Backend Sync ([src/storage/sync.ts](file:///home/user/src/gh/wtasg/typetest/client/src/storage/sync.ts)): Syncs runs and sources when online.

---

## 18. Saved Selections (Future-proofing)

The data model structure `selection: { start: number; end: number }` in `RunSource` is structured to support saved/reusable named selections in future releases.

For the initial feature, selection is transient state stored in `sourcesState` during the source selection session.

---

## 19. Transient Selection State

During the source setup view, selection state resides in `sourcesState`:

```ts
sourcesState.selection; // TextSelection | null
```

Selection state does not need to be written to `localStorage` unless explicitly saved by the user. When switching sources, `selection` resets to `null`.

---

## 20. Boilerplate & Header Manual Selection Policy

The system does not employ automated heuristics or AST parsers to strip license headers, copyright notices, or imports.

The user manually selects the code range they wish to practice. This avoids parser edge cases and keeps the workflow predictable across all 20+ supported programming languages.

---

## 21. Supported File Extensions

Text selection applies uniformly to all supported extensions in [FileUploader.tsx](file:///home/user/src/gh/wtasg/typetest/client/src/components/FileUploader.tsx):

```ts
const ALLOWED_EXTS = new Set([
    'go', 'rs', 'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'h', 'cpp', 'hpp',
    'sh', 'bash', 'zsh', 'sql', 'html', 'css', 'txt', 'md',
]);
```

Selection calculation operates on character offsets within JavaScript strings and is agnostic of file extension.

---

## 22. Selection Boundaries & Contiguity

- Selection offsets refer only to characters inside the source content string.
- Gutter line numbers are excluded via `user-select: none;` and DOM range filtering.
- Only contiguous single-range selections (`Range`) are supported. Multi-range selections (`Selection.addRange`) are collapsed to the primary range.

---

## 23. Empty Selection Handling

If `selection === null`:

- No valid selection exists.
- Selection UI displays `Selection: None`.
- Practice Selection button has `disabled={true}`.
- Practice All remains enabled.

---

## 24. Error Handling & Edge Cases

| Edge Case | Defense / Behavior |
| :--- | :--- |
| Missing IndexedDB content | `getSelectedContent()` returns `null`; show error toast/fallback |
| Invalid selection offsets | If `startOffset >= endOffset` or out of bounds, reset selection to `null` |
| Source file updated/deleted | Selection is invalidated (`resetSourceSelection()`); active runs use immutable `CompletedRun.target` |
| Zero-length extracted target | If `.trim()` produces empty target `""`, show alert "Selection contains no practiceable text" |
| Async IndexedDB Race Condition | Guard `createEffect` async loads with a cancellation flag (`let cancelled = false; onCleanup(...)`) |

---

## 25. Integration With Typing Configuration

Starting a test from a selection uses the exact same [GameConfig](file:///home/user/src/gh/wtasg/typetest/client/src/typing/types.ts#L30-L44) settings loaded in [src/state/settings.ts](file:///home/user/src/gh/wtasg/typetest/client/src/state/settings.ts):

- `gameType` (`normal`, `suddenDeath`, `racing`, `correctionMode`, `noCorrection`)
- `timeLimitMs`
- `allowCorrection`, `blockOnError`
- `showSpaces`, `showTabs`, `showNewlines`
- `tabWidth`, `tabMode`

Selection does not introduce special typing modes or alter metric scoring formulas.

---

## 26. Integration With Reports

Completed runs record full source context in [RunSource](file:///home/user/src/gh/wtasg/typetest/client/src/typing/types.ts#L75-L79):

```ts
run.source = {
    id: "source-uuid-1234",
    name: "server.go",
    selection: { start: 245, end: 1089 }
};
```

Reports in [ReportsView.tsx](file:///home/user/src/gh/wtasg/typetest/client/src/components/ReportsView.tsx) and `RunResults.tsx` display whether a run was full-file (`selection: { start: 0, end: content.length }`) or range-selected (`selection: lines 12–45`).

---

## 27. Integration With Racing Mode

In `racing` mode, previous runs serve as ghosts.

Because `CompletedRun` contains `target` (the normalized target snapshot), `events` (timestamped keystrokes), and `configuration`, racing against a selected-text run works out of the box without requiring source re-extraction.

---

## 28. Detailed UI Component Specification

### Component Code Structure: `SourceViewer.tsx`

Includes:

- Async race condition guard (`cancelled` flag in `createEffect` and `onCleanup`).
- Live `selectionchange` listener on `document`.
- Shared `computeSelectionMeta` and unified `prepareRunTarget`.
- Standardized full-file range `{ startOffset: 0, endOffset: content.length }`.

```tsx
import { Component, createSignal, createEffect, Show, onCleanup } from 'solid-js';
import { Source, TextSelection } from '../typing/types';
import { getSourceContent } from '../storage/indexedDb';
import { sourcesState, selectSource, setSourceSelection } from '../state/sources';
import { startRun } from '../state/typing';
import {
    getSelectionOffsetsFromDOM,
    computeSelectionMeta,
    prepareRunTarget,
} from '../utils/selection';

interface SourceViewerProps {
    source: Source;
}

const SourceViewer: Component<SourceViewerProps> = (props) => {
    const [content, setContent] = createSignal<string>('');
    let preRef!: HTMLPreElement;

    // Guard async IndexedDB loading against stale race conditions
    createEffect(() => {
        let cancelled = false;
        const sourceId = props.source.id;

        getSourceContent(sourceId).then(stored => {
            if (cancelled) return;
            const normalized = (stored?.content ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            setContent(normalized);
            setSourceSelection(null);
        });

        onCleanup(() => { cancelled = true; });
    });

    // Live selection listener using document selectionchange
    createEffect(() => {
        function handleSelectionChange(): void {
            if (!preRef) return;
            const text = content();
            const sel = getSelectionOffsetsFromDOM(preRef, text.length);
            setSourceSelection(sel);
        }

        document.addEventListener('selectionchange', handleSelectionChange);
        onCleanup(() => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        });
    });

    const meta = () => computeSelectionMeta(content(), sourcesState.selection);

    async function handlePracticeSelection(): Promise<void> {
        const text = content();
        const sel = sourcesState.selection;
        if (!sel) return;
        const target = prepareRunTarget(text, sel.startOffset, sel.endOffset);
        if (!target) return;
        startRun(target, props.source.id, props.source.name, sel.startOffset, sel.endOffset);
    }

    async function handlePracticeAll(): Promise<void> {
        const text = content();
        const target = prepareRunTarget(text, 0, text.length);
        if (!target) return;
        startRun(target, props.source.id, props.source.name, 0, text.length);
    }

    const lines = () => content().split('\n');

    return (
        <div class="source-viewer-pane">
            <div class="source-header">
                <h3>{props.source.name}</h3>
                <button class="btn-practice-all" onClick={handlePracticeAll}>Practice All</button>
            </div>

            <div class="source-viewer">
                <div class="line-number-gutter">
                    {lines().map((_, idx) => <div>{idx + 1}</div>)}
                </div>
                <pre ref={preRef} class="source-content-pre">
                    {content()}
                </pre>
            </div>

            <div class="selection-footer">
                <Show
                    when={meta()}
                    fallback={<span class="selection-meta">Selection: None</span>}
                >
                    {info => (
                        <span class="selection-meta">
                            Selection: lines {info().startLine}–{info().endLine} · {info().charCount} characters
                        </span>
                    )}
                </Show>
                <button
                    class="btn-practice-selection"
                    disabled={meta() === null}
                    onClick={handlePracticeSelection}
                >
                    Practice Selection
                </button>
            </div>
        </div>
    );
};

export default SourceViewer;
```

---

## 29. Acceptance Criteria

- [x] Uploaded files appear in the source list (`SourceList.tsx`).
- [x] User can open an uploaded file from the list.
- [x] Source content is displayed with line numbers in `SourceViewer`.
- [x] Line endings (`\r\n` / `\r`) are normalized to `\n` on display/store to guarantee 1:1 DOM text node to string offset alignment.
- [x] Gutter line numbers have `user-select: none;` and cannot enter text selection.
- [x] User receives live feedback during selection via `document.addEventListener('selectionchange', ...)`.
- [x] Selection is stored as `TextSelection | null` (`startOffset`, `endOffset`).
- [x] Shared `computeSelectionMeta` formats selected line range (`lines X–Y`) and character count (`Z characters`).
- [x] Async IndexedDB source loading is guarded against race conditions with cancellation flags.
- [x] `Practice Selection` button is disabled when there is no valid selection.
- [x] Both `Practice Selection` and `Practice All` route through unified `prepareRunTarget()`.
- [x] Extraction occurs strictly before line ending normalization and whitespace trimming.
- [x] Full-file practice standardizes selection as `{ startOffset: 0, endOffset: content.length }`.
- [x] Leading/trailing whitespace is trimmed via `.trim()` after extraction.
- [x] Internal whitespace (spaces, tabs, newlines) is preserved.
- [x] Existing tab configuration (`tabWidth`, `tabMode`) continues to apply.
- [x] Completed runs store immutable target snapshot in `CompletedRun.target`.
- [x] Historical runs remain valid even if the source file is modified or deleted.
- [x] Works across all supported file extensions (`.go`, `.rs`, `.ts`, `.py`, `.md`, etc.).
- [x] Syntax highlighting is omitted to keep selection-to-offset calculations 1:1.
- [x] CSS additions follow existing app design system in `index.css`.
- [x] Existing typing engine, metrics, WPM, and reporting calculations remain unchanged.

---

## 30. Future Extensions

The selection data model (`startOffset`, `endOffset`) allows easy future additions:

- Saved named selections per source (`SavedSelection` entity).
- Line-range numerical input (e.g. "Jump to line 20–50").
- AST-aware / language block detection (e.g. "Select Function `main`").
- Automatic license header skipping preset.
- Selection-specific practice metrics and history filters.

These features remain strictly outside the scope of the initial implementation.

---

## 31. Implementation Principle

Keep selection isolated from the typing engine:

```text
Uploaded Source (IndexedDB)
            │
            ▼
Selectable Source View (SourceViewer)
            │
            ▼
Character Offset Selection (TextSelection | null)
            │
            ▼
Unified Pipeline (prepareRunTarget)
            │
            ▼
Run Target Snapshot (CompletedRun.target)
            │
            ▼
Existing Typing Engine (TypingEngine & TypingArea)
```

The selection feature is solely responsible for producing the normalized target text and source offset metadata. Once `startRun(...)` is called, the typing run executes using the standard engine pipeline.

---

## 32. Integration With Typing Focus Architecture

As established in the focus architecture, keyboard capture uses an invisible, viewport-fixed `<textarea class="typing-capture">` during `RUNNING` status:

- [TypingArea.tsx](file:///home/user/src/gh/wtasg/typetest/client/src/components/TypingArea.tsx): Mounts only when `runState.status === 'RUNNING'`.
- Keyboard capture textarea handles `keydown`, supports `AltGr`, blocks paste, and uses a macrotask-deferred `setTimeout` blur handler with `document.hasFocus()`.
- [index.css](file:///home/user/src/gh/wtasg/typetest/client/src/index.css#L259-L276): `.typing-capture` uses `position: fixed; top: 0; left: 0;` to avoid scroll jumps.

Separation of Concerns:

- The source selection view operates during `status === 'READY'`.
- `<textarea class="typing-capture">` is not mounted or active during source selection.
- Normal browser text selection operates unhindered in `SourceViewer`.
- Clicking Practice Selection or Practice All transitions status to `RUNNING`, mounting `TypingArea` and acquiring keyboard capture automatically.

```text
Source Viewer (status === 'READY')
    │  • Normal browser text selection
    │  • Offsets calculated & displayed
    ▼
Click Practice Selection / Practice All
    │
    ▼
startRun() (status ➔ 'RUNNING')
    │  • Mount TypingArea
    │  • Focus <textarea class="typing-capture">
    ▼
Typing Engine Active
```

---

## 33. Final Feature Boundary

The feature has one responsibility:

> Allow the user to choose exactly which part of an uploaded source becomes the target of a typing run.

It does not modify:

- Typing metrics (`rawWPM`, `effectiveWPM`, accuracy formulas).
- Correction logic (`allowCorrection`, `blockOnError`).
- Game modes (`suddenDeath`, `racing`, `correctionMode`).
- Event stream recording (`RunEvent[]`).
- Persistence architecture (IndexedDB + localStorage).
- Keyboard capture behavior ([TypingArea.tsx](file:///home/user/src/gh/wtasg/typetest/client/src/components/TypingArea.tsx)).

The single handoff interface:

```ts
// Handed off to startRun(target, sourceId, sourceName, startOffset, endOffset)
{
    target: string;        // Normalized, trimmed slice
    sourceId: string;      // ID of source
    sourceName: string;    // Display name of source
    startOffset: number;   // Raw start offset (0 for full file)
    endOffset: number;     // Raw end offset (content.length for full file)
}
```
