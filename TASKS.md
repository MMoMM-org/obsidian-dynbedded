# Tasks / Issue Backlog

Sourced from [GitHub Issues](https://github.com/MMoMM-org/obsidian-dynbedded/issues).

---

## Bugs

### #9 — Images not displayed in embedded sections
Local images inside an embedded section are not rendered — only text/markdown content shows up.
**Where:** `DynbeddedProcessor.ts` → `render()` — the `sourcePath` passed to `MarkdownRenderer.renderMarkdown()` may need to point to the source file's directory so relative image paths resolve correctly.

### #8 — Empty calendar entry shows error instead of nothing
When a daily note doesn't exist, the plugin displays an error. Users expect a silent/empty result.
**Where:** `DynbeddedProcessor.ts` → `render()` — detect "file not found" case and return early without calling `displayError()`.
**Resolution:** Add a setting `silentMode: boolean` (default `false`) to suppress all error output. When enabled, any error condition returns silently instead of rendering the red error block. Toggle in settings tab ("Suppress errors / silent mode").
**Settings changes:** `DynbeddedSettingTab.ts` — add toggle; `DynbeddedProcessor.ts` — wrap all `displayError()` calls with `if (!this.plugin.settings.silentMode)`.

### #3 — Misleading error when header has no content before next header
If a header exists but has no lines between it and the next header, `fileContents` is `""` and the error says the header wasn't found — which is wrong.
**Where:** `DynbeddedProcessor.ts` → `getHeaderSectionContent()` / `render()` — distinguish between "header not found" (position is undefined) and "header found but empty" (position defined, slice is empty). Show nothing or a clearer message for the empty case.

### #4 — `getFileCache()` may return null
`this.app.metadataCache.getFileCache(matchingFile)` can return `null` (e.g. cache not yet built), but the result is accessed without a null check, causing a runtime crash.
**Where:** `DynbeddedProcessor.ts` → `render()` line ~62 — add null guard before accessing `.headings`.

---

## Performance

### #5 — Break out of loop after header is found
The heading search loop continues iterating after a match is found.
**Where:** `DynbeddedProcessor.ts` → `render()` heading loop — add `break` after setting `position`.

---

## Enhancements

### #7 — Support dynamic headers
Allow the `#header` portion of `[[file#header]]` to use the same `{{format}}` date substitution syntax already supported for filenames. Example: `[[MyNote#{{YYYY-MM-DD}}]]`.
**Where:** `DynbeddedProcessor.ts` → `render()` — apply `getDynamicDate()` substitution to `header` string after splitting, similar to how it's applied to `fileName`.

---

## Technical Debt (Obsidian API)

The plugin targets `minAppVersion: 0.15.0` but the Obsidian API package was pinned to `0.16.3`. Current Obsidian is at `1.12.3`. The following API changes require attention.

### TD-1 — `MarkdownRenderer.renderMarkdown()` is deprecated ⚠️
Deprecated since Obsidian 1.x in favour of `MarkdownRenderer.render()`.
The new method requires `app` as the first argument.
```ts
// Old (deprecated)
await MarkdownRenderer.renderMarkdown(fileContents, container, ctx.sourcePath, this.plugin);

// New
await MarkdownRenderer.render(this.app, fileContents, container, ctx.sourcePath, this.plugin);
```
**Where:** `DynbeddedProcessor.ts` line 94. One-line fix; also resolves #9 (images), since `render()` uses `app` to resolve resource paths correctly.

### TD-2 — `minAppVersion` and obsidian package out of date
`manifest.json` declares `minAppVersion: 0.15.0` but the plugin uses APIs not available that far back, and misses improvements from 1.x. The obsidian devDependency should be updated to `latest` (it already is in package.json), and `minAppVersion` raised to a realistic value (e.g. `1.4.0`).

### TD-3 — `@ts-ignore` on `getFileCache()` result
`DynbeddedProcessor.ts` line 61 uses `// @ts-ignore` to suppress a type error on the `.headings` access. This is because `getFileCache()` returns `CachedMetadata | null` and `.headings` can be undefined. The ignore masks a real null-dereference bug (tracked as #4). Fixing #4 properly removes the need for the suppress comment.

### TD-4 — `app` global removed from Obsidian 1.x types ✅ fixed
`main.ts` initialized `dynbeddedProcessor` as a class field using the bare `app` global, which was removed from the type declarations in Obsidian 1.x. Fixed by moving the initialization into `onload()` using `this.app`. This was also a latent runtime bug — class fields execute at construction time before Obsidian sets `this.app`.

---

## Code Quality

### #6 — Refactor `position` from array to object
`position` is typed as `number[]` and accessed by index (`position[0]`, `position[1]`), which is unclear.
**Where:** `DynbeddedProcessor.ts` → `render()` and `getHeaderSectionContent()` — replace with a `{start: number, end: number}` object or use the Obsidian `Pos` type.

### #2 — Header level hierarchy not respected (known limitation)
When searching for a header, the plugin takes all content until the *next heading of any level* rather than respecting the hierarchy. E.g. embedding `## Section` also stops at `### SubSection`.
**Where:** `DynbeddedProcessor.ts` → `render()` heading loop — when finding the end boundary, only stop at headings of equal or higher level (lower or equal `heading.level`).

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
