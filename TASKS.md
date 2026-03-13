# Tasks / Issue Backlog

Sourced from [GitHub Issues](https://github.com/MMoMM-org/obsidian-dynbedded/issues).

> **Lifecycle:** Tasks move to *Pending Confirmation* when committed, and to *Done* when a release is published.

---

## Open

### #2 — Header level hierarchy (opt-in via code block flag)
By default the plugin stops a header section at the next heading of *any* level. With `headerHierarchy: true` it should stop only at a heading of equal or higher level, so subheadings are included.

**Syntax:**
```dynbedded
[[File#Header]]
headerHierarchy: true
```

- Absent or `false` → current behaviour (no change)
- `true` → stop only at headings with `level <=` the matched heading's level

**Where:** `DynbeddedProcessor.ts` → `render()`:
1. Parse optional `headerHierarchy` flag from `source` (second line, if present)
2. In the heading loop, when `headerHierarchy` is true, skip headings with `level >` matched heading's level when determining the end boundary
3. Update README and test vault (`Dynbedded/`) with examples

---

## Technical Debt

*(none open)*

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

## Pending Confirmation

*(released when next version is published)*

| Task | Commit |
|------|--------|
| #3 — Misleading error: header empty vs. not found | `0e8951b` |
| #4 — `getFileCache()` null guard | `0e8951b` |
| #5 — Break after header match | `0e8951b` |
| #6 — `position` array → typed object | `834e8df` |
| #7 — Dynamic headers (`[[File#{{YYYY-MM-DD}}]]`) | `b8fe4b7` |
| #8 — Silent mode setting | `0a08eaa` |
| #9 — Images in embedded sections | `cf4d4f4` |
| TD-1 — `MarkdownRenderer.renderMarkdown()` deprecated | `cf4d4f4` |
| TD-2 — `minAppVersion` raised to `1.4.0` | (manifest) |
| TD-3 — `@ts-ignore` removed | `0e8951b` |
| TD-4 — `app` global fix | (older) |
