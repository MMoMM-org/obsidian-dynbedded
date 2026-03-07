# CLAUDE.md — obsidian-dynbedded

Obsidian plugin that enables dynamic embeds: embed files or header sections with optional date-based filename substitution.

---

## Build & Dev

```bash
npm run build   # type-check + production build → build/
npm run dev     # watch build → Dynbedded/.obsidian/plugins/obsidian-dynbedded/
```

The test vault is `Dynbedded/` in the repo root. `npm run dev` writes directly into it so Obsidian hot-reloads the plugin instantly (hot-reload plugin must be enabled in the vault).

---

## Architecture

| File | Role |
|------|------|
| `src/main.ts` | Plugin entry point. Registers the `dynbedded` code block processor. |
| `src/DynbeddedProcessor.ts` | All rendering logic: parse link, date substitution, header extraction, markdown rendering. |
| `src/DynbeddedSettingTab.ts` | Settings UI. Currently only exposes debug logging toggle. |

### Code block syntax

````
```dynbedded
[[FileName]]
[[FileName#Header]]
[[{{YYYY-MM-DD}}]]
[[{{YYYY-MM-DD|offset}}#Header]]
```
````

- `{{format}}` — replaced with `moment().format(format)`, supports ISO duration or day offsets via `|` (e.g. `{{YYYY-MM-DD|-1}}` = yesterday)
- `#Header` — extracts only the content under that heading (until the next heading)

### Rendering flow (`DynbeddedProcessor.render`)

1. Extract `[[...]]` link from source
2. If `{{...}}` present, resolve dynamic date → replace in filename
3. If `#header` present, split off header name
4. Resolve file via `app.metadataCache.getFirstLinkpathDest()`
5. If header: find heading position in file cache, slice lines
6. Render content via `MarkdownRenderer.renderMarkdown()`

---

## Toolchain

- **TypeScript 5** — type checking only (`tsc -noEmit`); esbuild does the actual bundling
- **esbuild 0.27** — bundles to CJS, target ES2018; watch mode uses `esbuild.context()` API
- **eslint 8 + @typescript-eslint 8** — linting (`.eslintrc`)
- **semantic-release 25** — automated releases via GitHub Actions (`.github/workflows/release.yml`)

## Release

Releases are fully automated via semantic-release on push to `main`. Commit message format follows Angular convention:
- `fix:` → patch
- `feat:` → minor
- `BREAKING CHANGE:` → major

Build artifacts committed back to repo: `build/main.js`, `build/manifest.json`, `build/styles.css`.

---

## Known Issues / Backlog

See `TASKS.md` for the full issue list with implementation notes.

Quick wins ready to implement:
- **#4** null guard on `getFileCache()` return value
- **#5** `break` after header found in loop
- **#3** distinguish "header not found" from "header empty"
