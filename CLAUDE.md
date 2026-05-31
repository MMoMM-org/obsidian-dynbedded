# CLAUDE.md — obsidian-dynbedded

Obsidian plugin that enables dynamic embeds: embed files or header sections with optional date-based filename substitution.

@~/Kouzou/standards/general.md

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
2. If `#header` present, split off header name (#7: before date substitution)
3. If `{{...}}` present in filename, resolve dynamic date → replace in filename
4. If `{{...}}` present in header, resolve dynamic date → replace in header (#7)
5. Resolve file via `app.metadataCache.getFirstLinkpathDest()`
6. If header: find heading position in file cache, slice lines
7. Render content via `MarkdownRenderer.render()`

---

## Toolchain

- **TypeScript 5** — type checking only (`tsc -noEmit`); esbuild does the actual bundling
- **esbuild 0.27** — bundles to CJS, target ES2018; watch mode uses `esbuild.context()` API
- **eslint 8 + @typescript-eslint 8** — linting (`.eslintrc`)
- **stylelint + stylelint-no-unsupported-browser-features** — CSS browser-compat lint that mirrors the Obsidian community-plugin review bot (doiuse + browserslist + caniuse). Run via `npm run lint` (chained after eslint) or `npm run lint:css`. The `browserslist` floor in `package.json` is pinned to **`chrome 114`** — this is the Chromium of `minAppVersion` 1.4.0 (Obsidian 1.4.x → Electron 25 → Chromium 114). Raise it only when `minAppVersion` rises; pinning too high hides features Obsidian's older Chromium can't run, pinning too low produces noise on long-stable features (grid/flex/gap). With `ignorePartialSupport: false`, partially-supported features (e.g. the `text-decoration` shorthand carrying a line-style like `underline dotted`/`wavy`) are flagged — these slip past ESLint, which never lints CSS. Prefer `border-bottom` (inherits currentColor) over `text-decoration` for underline-style cues.
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
