# Typing Focus Fix — Keyboard Capture in a Real Text Input

## 1. Problem

During an active typing run, focus sits on a non-editable `<div tabIndex={0}>`
(`client/src/components/TypingArea.tsx:20-23`) and keystrokes are captured via
`onKeyDown`.

When focus is on a non-editable element the browser still applies its own
default actions to certain keys:

| Key      | Browser default action              |
| -------- | ----------------------------------- |
| `/`      | Chrome quick-find bar opens         |
| `'`      | Chrome find-as-you-type             |
| `Space`  | Page scroll (if page is scrollable) |
| Arrows   | Page scroll / caret-less movement   |
| Enter    | Activation of focused control       |

These defaults are only suppressed by the browser when the focused element is a
real editable field (`<input>`, `<textarea>`, `contenteditable`). The result is
jarring: the user is *typing* but the page behaves as if no text input exists.

## 2. Goal

Make the run feel like typing in a real text box:

- Browser quick-find/scroll/navigation shortcuts stop hijacking keys natively.
- The custom `TypingText` renderer and the typing engine stay unchanged.
- Focus is automatically captured upon transition to `RUNNING`.
- Clicking empty page space mid-run does not disable capture, but focus leaving the browser window/tab (`Alt+Tab`, address bar) is respected (no aggressive focus stealing).
- Pasting content into the field is blocked (no cheating); `Ctrl+C` copy-out
  stays allowed.
- European layouts using `AltGr` key combinations (e.g. `@`, `€`, `~`, `[`, `]`) continue to work across OS environment variants.

## 3. Architecture & Data Flow

Park focus in an **invisible, real `<textarea>`** during a run (the standard technique used by typing apps like Monkeytype). Because the focused element is genuinely editable, the browser suppresses quick-find, scroll, and navigation defaults for `/`, `'`, `Space`, arrows, etc., without fragile global `preventDefault` hacks.

### Component Structure

```text
TypingArea (div, existing wrapper/classes)
 └── textarea.typing-capture (invisible but focusable)
       ├── focus     → acquired on transition to RUNNING (component mount)
       ├── onKeyDown → filter shortcuts/paste, preventDefault, sendKey()
       ├── onBlur    → deferred: hasFocus()? else refocus only when activeElement is non-interactive
       ├── onPaste   → e.preventDefault() (blocked)
       ├── onDrop    → e.preventDefault() (blocked)
       └── onInput   → e.currentTarget.value = '' (safety net)
```

### Complete Event Pipeline & State Flow

```text
                     Transition to RUNNING State
                                   │
                                   ▼
                Mount <TypingArea> & focus <textarea.typing-capture>
                                   │
       ┌───────────────────────────┴───────────────────────────┐
       │ (User Keystroke)                                      │ (Blur Event)
       ▼                                                       ▼
┌────────────────────────────────┐           ┌───────────────────────────────────┐
│ <textarea> handleKeyDown       │           │ handleBlur (deferred, setTimeout) │
│  ├─ Is Paste? (Ctrl/Cmd+V...)  │           │  ├─ document.hasFocus() false?    │
│  │   └─ e.preventDefault()     │           │  │   └─ Focus left window ➔ Return│
│  ├─ Is AltGr? (Ctrl+Alt OR     │           │  └─ activeElement interactive?    │
│  │   getModifierState('AltGraph'))         │     (button, a, input, [tabindex])│
│  │   └─ Process character      │           │     ├─ Yes ➔ Allow blur (e.g. Stop)
│  ├─ Is Ctrl/Cmd shortcut?      │           │     └─ No  ➔ captureRef.focus()   │
│  │   └─ Pass through (Ctrl+C)  │           └───────────────────────────────────┘
│  ├─ e.preventDefault()         │
│  └─ sendKey(key, code)         │
└──────────────┬─────────────────┘
               │
               ▼
         Typing Engine ──► Updates runState store
                                 │
                                 ▼
                          TypingText (UI)

[Safety Net: onInput ➔ clears textarea value if untracked input bypasses keydown]
```

## 4. Detailed Component & Lifecycle Diagrams

### 4.1 Keydown Event Processing Flow

```text
                    Keystroke Received (keydown)
                               │
                               ▼
                    Is Paste (Ctrl+V / Cmd+V / Shift+Insert)?
                      ├── Yes ──► e.preventDefault() ──► Return (Block paste)
                      └── No
                           │
                           ▼
                    Is Ctrl/Cmd Shortcut (and NOT AltGr)?
                      ├── Yes ──► Pass through (e.g. Ctrl+C / Ctrl+T) ──► Return
                      └── No
                           │
                           ▼
                    e.preventDefault() (Stop native textarea character insertion)
                           │
                           ▼
                    sendKey(e.key, e.code) ──► TypingEngine
```

### 4.2 Focus Retention & Blur Decision Flow

```text
                        Blur Event Triggered
                                 │
                                 ▼
                   Defer to next macrotask (setTimeout)
                                 │
                                 ▼
                    document.hasFocus() == false?
                     (Alt+Tab, DevTools, URL bar)
                       ├── Yes ──► Do Not Steal Focus
                       └── No
                            │
                            ▼
              Is activeElement interactive (button, a, input, select, textarea, [tabindex])?
                ├── Yes ──► Skip Refocus ──► Allow Focus Transfer (e.g. Stop Button)
                └── No
                     │
                     ▼
              Is Run Status === 'RUNNING'?
                ├── Yes ──► captureRef.focus() (Restore keyboard capture)
                └── No  ──► Do Nothing
```

## 5. Implementation Changes

### 5.1 `client/src/components/TypingArea.tsx`

- Keep `<div class="typing-area-wrapper">` as the container.
- Declare ref variable: `let captureRef!: HTMLTextAreaElement;`
- Focus `captureRef` on component mount (which corresponds to transition to `RUNNING` status in `TypingView.tsx`):

  ```tsx
  onMount(() => {
      if (runState.status === 'RUNNING') {
          captureRef?.focus();
      }
  });
  ```

- Add hidden capture textarea:

  ```tsx
  <textarea
      ref={captureRef}
      class="typing-capture"
      aria-label="Typing input"
      spellcheck={false}
      autocorrect="off"
      autocapitalize="off"
      autocomplete="off"
      wrap="off"
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onPaste={e => e.preventDefault()}
      onDrop={e => e.preventDefault()}
      onInput={e => { e.currentTarget.value = ''; }}
  />
  ```

- `handleKeyDown`:

  ```tsx
  function handleKeyDown(e: KeyboardEvent): void {
      const isPaste =
          ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') ||
          (e.shiftKey && e.key === 'Insert');

      if (isPaste) {
          e.preventDefault();
          return;
      }

      // Allow Ctrl/Cmd browser shortcuts (Ctrl+C, Ctrl+T, etc.)
      // Note: AltGr (e.g., German/European layout chars @, €, ~) sets ctrlKey + altKey
      // or reports 'AltGraph' modifier state (e.g., Linux setups).
      // We must NOT return early for AltGr, so those character keys can be processed.
      const isAltGr = (e.ctrlKey && e.altKey) || Boolean(e.getModifierState?.('AltGraph'));
      if ((e.ctrlKey || e.metaKey) && !isAltGr) {
          return;
      }

      // Consume event so textarea native caret/insertion logic never fires
      e.preventDefault();
      sendKey(e.key, e.code);
  }
  ```

- `handleBlur` — deferred to the next macrotask so the decision is made from the
  *post-click* focus state, not the possibly-null `relatedTarget`:

  ```tsx
  function handleBlur(): void {
      setTimeout(() => {
          if (!document.hasFocus()) return;                       // focus left the window
          const el = document.activeElement as HTMLElement | null;
          if (runState.status === 'RUNNING'
              && el !== captureRef
              && !el?.closest('button, a, input, select, textarea, [tabindex]')) {
              captureRef.focus();
          }
      });
  }
  ```

  - `document.hasFocus()` reliably distinguishes "focus left the window/tab"
    (Alt+Tab, DevTools, URL bar) — never steals focus back there.
  - `document.activeElement` reliably reflects the real click target: empty
    page space → `body`/non-interactive element → refocus; the Stop button (or
    any `button`/`a`/`input`/`select`/`textarea`/`[tabindex]`) → skip, so the
    click completes normally.
  - Deferring to a macrotask lets the Stop button's click handler run first,
    so once status leaves `RUNNING` the refocus check is a no-op.

### 5.2 `client/src/index.css`

Add CSS rules to anchor the hidden textarea to the top-left of the viewport so focus calls never trigger viewport scroll jumps:

```css
.typing-capture {
    position: fixed;
    top: 0;
    left: 0;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: 0;
    border: 0;
    background: transparent;
    color: transparent;
    opacity: 0;
    pointer-events: none;
    clip-path: inset(50%);
    resize: none;
    overflow: hidden;
    caret-color: transparent;
}
```

- `position: fixed; top: 0; left: 0;` anchors the 1px textarea to the top-left of the viewport. Viewport anchoring ensures that calling `captureRef.focus()` will never trigger browser `scrollIntoView` jumps regardless of how far down `.main-content` is scrolled.
- `opacity: 0`, `pointer-events: none`, `clip-path: inset(50%)` cleanly hide the control visually while preserving full programmatic focusability.
- Must **not** use `display: none` or `visibility: hidden` (those render the element unfocusable).

## 6. Out of Scope / Non-Changes

- No changes to the typing engine, event model, metrics, or run stores.
- No changes to `TypingText`, `RunControls`, or the READY/results views.
- Text-entry editing UI (`TextEditor.tsx`) is untouched.

## 7. Edge Cases Handled

- **Clicking Stop mid-run**: the deferred blur handler lets the button's click
  handler run first; once status leaves `RUNNING` the refocus check is a no-op.
- **Focus leaving window/tab**: `document.hasFocus()` is `false` after
  Alt+Tab, DevTools, or the address bar, so the handler returns without
  stealing focus — no focus fighting.
- **Clicking empty page space inside the document**: `activeElement` becomes
  `body`/a non-interactive element, so the handler refocuses the capture
  textarea and typing continues.
- **Run transition focus**: `captureRef.focus()` is scoped to the transition to `RUNNING` status when `TypingArea` mounts.
- **Paste cheating**: `Ctrl+V`, `Cmd+V`, `Shift+Insert`, context-menu paste, and drag-drop are all blocked; copy-out (`Ctrl+C`) remains allowed.
- **European layouts / `AltGr`**: Keystrokes using `Ctrl+Alt` or reporting `AltGraph` modifier state bypass the shortcut passthrough filter and are sent to `sendKey`.
- **Browser shortcuts**: `Ctrl+C`, `Ctrl+W`, `Ctrl+T`, `Cmd+C`, etc. are passed through untouched without `preventDefault()`.
- **Viewport scroll jumps**: Viewport-fixed positioning (`position: fixed; top: 0; left: 0;`) keeps the element constantly in view so programmatic `.focus()` never scrolls `.main-content`.
- **Native textarea editing**: `preventDefault()` on `keydown` stops native insertion/caret movement; `onInput` clearing acts as a redundant fallback.
- **IME/autocomplete interference**: `autocorrect`, `autocapitalize`, `spellcheck`, and `autocomplete` are disabled.

## 8. Verification

1. `cd client && npm run test` — existing vitest suite stays green.
2. `cd client && npm run build` — production build succeeds.
3. Manual test matrix in Chrome/Firefox during an active run:
   - `/` and `'` no longer open quick-find.
   - `Space` and arrow keys do not scroll the page.
   - `Backspace`, `Tab`, and navigation keys behave normally.
   - European `AltGr` characters (including Linux/Windows environments) register properly.
   - `Ctrl+C`, `Ctrl+W`, `Ctrl+T` shortcuts function as expected.
   - `Ctrl+V`, `Cmd+V`, `Shift+Insert`, and context-menu paste do nothing.
   - Clicking empty page space inside the document retains capture via auto-refocus.
   - Pressing `Alt+Tab` or clicking the URL bar smoothly leaves the window without focus fighting.
   - Scrolling long text and clicking/focusing retains scroll position without jumping to top.
   - Clicking **Stop** stops the run without interference.
