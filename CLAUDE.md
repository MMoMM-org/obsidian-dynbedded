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
| `src/main.ts` | Plugin entry point. Registers the `dynbedded` (and opt-in `quoth`) code block processors + commands. |
| `src/EmbedRequest.ts` | Syntax-agnostic internal model (`EmbedRequest`, `Selector`, `Anchor`, `ParseFn`, `DynbeddedError`) shared by both parsers and the resolver. |
| `src/parsers/DynbeddedParser.ts` | Native syntax → `EmbedRequest`, plus `serializeDynbedded` (inverse, for Copy reference). |
| `src/parsers/QuothParser.ts` | Opt-in, deletable compat adapter: Quoth syntax → `EmbedRequest`. |
| `src/parsers/shared.ts` | `splitTopLevel` / `parseShow` shared by both parsers. |
| `src/SelectorResolver.ts` | `Selector` → content slice (whole / heading / `#^block` / after / between / multi). |
| `src/DynbeddedProcessor.ts` | Orchestrator: parse → date-substitute → resolve file → extract → render (block/inline) → attribution. |
| `src/DynbeddedSettingTab.ts` | Settings UI (silent mode, auto-refresh, default display, render quoth blocks, debug logging). |
| `src/commands/CopyReference.ts` | Builds an `EmbedRequest` from the editor selection/cursor (#29). |
| `src/commands/ConvertQuoth.ts` | Rewrites `quoth` blocks → `dynbedded` in one note's text (#30, reduced). |

### Code block syntax

````
```dynbedded
[[FileName]]
[[FileName#Header]]
[[{{YYYY-MM-DD}}]]
[[{{YYYY-MM-DD|offset}}#Header]]
after: "anchor"        # anchor line (exclusive) → end of file
from: "X"              # text-anchored range, both ends inclusive
to: "Y"
display: inline        # embedded (default) | inline
show: title, author    # attribution footer
headerHierarchy: true  # section ends at equal/higher heading only
```
````

- `{{format}}` — replaced with `moment().format(format)`, supports ISO duration or day offsets via `|` (e.g. `{{YYYY-MM-DD|-1}}` = yesterday); applies to the filename and to text anchors
- `#Header` — extracts only the content under that heading (until the next heading); `after:` instead runs to end of file
- The opt-in `quoth` front-end (`renderQuothBlocks`) maps `path` / `ranges` / `join` / `display` / `show` onto the same model — see the Quoth replacement spec under `docs/superpowers/specs/`.

### Rendering flow (`DynbeddedProcessor.render`)

1. `parse(source)` (dynbedded or quoth front-end) → `EmbedRequest`
2. Resolve `{{...}}` date tokens in `fileName` and every selector anchor
3. Resolve file via `app.metadataCache.getFirstLinkpathDest()`
4. `SelectorResolver.resolve()` extracts the content slice for the `Selector`
5. Render via `MarkdownRenderer.render()` (block) or unwrap a single paragraph (inline)
6. Optional `show:` attribution footer

The pre-refactor single-pass logic now lives split across the parser (link/header/date-token extraction) and the resolver (heading-section slicing, `headerHierarchy`); existing whole-file and `#header` embeds are byte-identical.

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
