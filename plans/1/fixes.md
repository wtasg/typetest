# Post-MVP Fixes

## 1. Run never completes when there are typing mistakes

Problem: The engine only called `finish('COMPLETED')` when every character state was `correct`. If the user typed past an incorrect character (with `blockOnError: false`), the cursor could reach the end of the target but the run would never finish.

Solution: Remove the `allCorrect` guard. Completion fires as soon as `cursor >= target.length`, regardless of error states. Uncorrected errors are captured in the metrics.

---

## 2. WPM not updating during an active run

Problem: The 250 ms ticker only updated `elapsedMs` in the store. `effectiveWPM`, `rawWPM`, and `accuracy` were only computed in `finalizeRun`, so the HUD showed zeros the whole time.

Solution: The ticker now calls `computeRawMetrics` and `computeEffectiveMetrics` on every tick and writes all three values into the store alongside `elapsedMs`.

---

## 3. Edit button for saved text sources had no CSS

Problem: `SourceList` already rendered a ✎ edit button and `TextEditor` already supported an `editSource` prop, but `.source-edit` had no style rule, so the button was invisible.

Solution: Added `.source-edit` alongside `.source-delete` in the stylesheet — hidden by default, revealed on hover, turns accent colour on hover.

---

## 4. Dynamic import warning from TextEditor

Problem: `TextEditor` loaded `indexedDb.ts` via a dynamic `import()` to fetch source content. Because the same module was also statically imported elsewhere, Vite emitted a warning about the module being duplicated across chunks.

Solution: Changed to a static `import` at the top of the file. The module ends up in the main bundle either way, so there is no code-splitting benefit to the dynamic import.

---

## 5. Vite ESM / CommonJS warning on build

Problem: `vite.config.ts` uses ESM `import` syntax but the package had no `"type"` field, so Node loaded it as CommonJS and Vite warned that `configLoader: 'native'` would not work in a future version.

Solution: Added `"type": "module"` to `client/package.json`.

---

## 6. App title in header did not navigate home

Problem: "Typing Test" in the top-left was a plain `<span>`, so clicking it did nothing.

Solution: Replaced the `<span>` with a `<button>` that calls `setCurrentView('typing')`. CSS strips the button chrome so it looks identical to before.

---

## 7. Upload / Add Text mixed into main nav

Problem: "+ Upload File" and "+ Add Text" sat inline with Typing and Reports in the sidebar nav list, with no visual grouping to indicate they were source-management actions rather than navigation items.

Solution: Moved them into a dedicated `<div class="sidebar-section">` with a "SOURCES" label, bordered top and bottom, positioned between the navigation links and the Settings button at the bottom.

---

## 8. `scripts/test.sh` prompted to install jsdom and then failed

Problem: Vitest defaulted to the `jsdom` environment, which is not bundled. When run in a sandboxed environment with no network access, the automatic `npm install jsdom` it attempted returned a 403 and the test suite failed to start entirely.

Solution: Set `environment: 'node'` in `vite.config.ts` and scoped tests to pure-logic modules (normalization, metrics, distributions) that need no browser APIs. Also switched `defineConfig` import from `'vite'` to `'vitest/config'` so the `test` field is correctly typed.

---

## 9. `npm` / `npx` not available in script execution context

Problem: `scripts/test.sh` called `npm test` to run the client test suite. In the sandbox shell context, neither `npm` nor `npx` was on `PATH`, so the command was not found.

Solution: Changed the script to invoke the vitest binary directly via `node_modules/.bin/vitest run`, which requires no package manager on PATH.

---

## 10. Go server tests failed due to sandboxed network

Problem: `go test ./...` attempted to download `github.com/lib/pq` from the module proxy at test time (it was not cached). The proxy was blocked, causing setup to fail for any package that imports `lib/pq`.

Solution: Narrowed the server test target to `./internal/api/...`, which has no DB dependency. The database package is exercised at runtime rather than in automated tests.
