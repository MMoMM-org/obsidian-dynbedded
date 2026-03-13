# Tasks / Issue Backlog

Sourced from [GitHub Issues](https://github.com/MMoMM-org/obsidian-dynbedded/issues).

---

## Open

### #2 — Header level hierarchy not respected (known limitation)
When searching for a header, the plugin takes all content until the *next heading of any level* rather than respecting the hierarchy. E.g. embedding `## Section` also stops at `### SubSection`.
**Where:** `DynbeddedProcessor.ts` → `render()` heading loop — when finding the end boundary, only stop at headings of equal or higher level (lower or equal `heading.level`).

---

## Technical Debt

### TD-2 — `minAppVersion` and obsidian package out of date
`manifest.json` declares `minAppVersion: 0.15.0` but the plugin uses APIs not available that far back, and misses improvements from 1.x. The obsidian devDependency should be updated to `latest` (it already is in package.json), and `minAppVersion` raised to a realistic value (e.g. `1.4.0`).

---

## Future Features (P+1D)

### F-1 — Automatic Refresh of Embeds (configurable interval)
Auto-refresh dynbedded blocks at a configurable interval so date-based embeds update without reopening the note.

**Behaviour:**
- Only active when the note contains at least one `dynbedded` code block
- Default interval: 60 seconds, configurable in settings
- Opt-in via a checkbox in the settings tab ("Enable auto-refresh")
- Each block manages its own timer independently via `MarkdownRenderChild` — no global state needed

**Implementation approach:**
- Refactor `DynbeddedProcessor.render()` to return/use a `MarkdownRenderChild` subclass (e.g. `DynbeddedBlock`)
- In `DynbeddedBlock.onload()`: run initial render, then `this.registerInterval(window.setInterval(() => this.render(), intervalMs))`
- `onunload()` is automatic — Obsidian clears the interval when the block leaves the DOM
- Only set the interval when auto-refresh is enabled in settings AND the source contains `{{...}}` (date substitution), to avoid unnecessary re-renders on static embeds

**Settings changes (`DynbeddedSettingTab.ts`):**
- Add `autoRefresh: boolean` (default `false`)
- Add `refreshIntervalSeconds: number` (default `60`)

**Complexity: Medium**

### F-2 — Day name as relative date (`DWed`, `D-1Wed`)
Allow `{{DWed}}` to resolve to this week's Wednesday, and `{{D-1Wed}}` to last week's Wednesday.

**Syntax:** `{{[format]|D[±N][Mon|Tue|Wed|Thu|Fri|Sat|Sun]}}` or as standalone token.

**Implementation:** Pre-processing step in `getDynamicDate()` before moment.js formatting — detect pattern, compute date with `moment().day('Wednesday')` / `moment().subtract(N, 'week').day('Wednesday')`, substitute result.

**Complexity: Low**

---

## Done

### #3 — Misleading error when header has no content ✅ `0e8951b`
### #4 — `getFileCache()` may return null ✅ `0e8951b`
### #5 — Break out of loop after header is found ✅ `0e8951b`
### #6 — Refactor `position` from array to object ✅ `834e8df`
### #7 — Support dynamic headers ✅ `b8fe4b7`
### #8 — Silent mode for missing files ✅ `0a08eaa`
### #9 — Images not displayed in embedded sections ✅ `cf4d4f4`
### TD-1 — `MarkdownRenderer.renderMarkdown()` deprecated ✅ `cf4d4f4`
### TD-3 — `@ts-ignore` on `getFileCache()` result ✅ `0e8951b`
### TD-4 — `app` global removed from Obsidian 1.x types ✅ fixed
