# Tasks / Issue Backlog

Sourced from [GitHub Issues](https://github.com/MMoMM-org/obsidian-dynbedded/issues).

> **Lifecycle:** Tasks move to *Pending Confirmation* when committed, and to *Done* when a release is published.

---

## Open

*(none)*

---

## Pending Confirmation

Epic [#31](https://github.com/MMoMM-org/obsidian-dynbedded/issues/31) — Quoth replacement (silent strategy). Built on a syntax-agnostic `EmbedRequest` model (`src/EmbedRequest.ts`) with two front-end parsers (`parsers/DynbeddedParser.ts`, `parsers/QuothParser.ts`) and one `SelectorResolver`. See `docs/superpowers/specs/2026-06-18-quoth-replacement-design.md`.

| Task | Commit |
|------|--------|
| Phase 0 — `EmbedRequest` model + parser/resolver split (behaviour-preserving) | `44ffc53` |
| #26 — Range embedding (`after` / `from`-`to` / multi-range) | `9012670` |
| #27 — Inline display (`display: embedded\|inline`, `defaultDisplay` setting) | `111dc78` |
| #31 — Opt-in silent rendering of `quoth` blocks (`renderQuothBlocks`) | `75af261` |
| #28 — Source attribution footer (`show: author, title`) | `8266583` |
| #29 — "Copy reference" command (selection → dynbedded block) | `5a947a4` |
| #30 (reduced) — "Convert quoth blocks in current note" command | `f3d0a57` |
| #31 follow-up — Quoth visual parity: quote styling (`--interactive-accent` accent + indent), source-link icon, include-heading (per-block `includeHeading: true\|false`, setting = default) | `54da5c3`, `72d224b` |

> **#30 scope note:** under the silent strategy the bulk vault-wide migration is intentionally dropped — `quoth` notes render as-is. Only the per-note convert command remains. The daily-note template change is a vault-side action documented in the README.

---

## Technical Debt

### TD-6 — Auto-close issues and apply labels on release

Issues are currently closed manually after a release. Issue #9 was closed automatically because its commit contained `fixes #9` — the others only had `(#N)` in brackets, which GitHub doesn't recognise as a closing keyword.

Two things to fix:

1. **Commit convention:** Always use `closes #N` or `fixes #N` in commit messages (not just `(#N)`) so GitHub closes the issue automatically on merge to main.

2. **Released label:** Add a workflow step (or semantic-release plugin) that applies a `released` / `fixed` label to all issues closed by a release. Options:
   - [`semantic-release/github`](https://github.com/semantic-release/github) plugin already supports `successComment` and `releasedLabels` config — check if it's wired up in `.releaserc` or `package.json`
   - Alternatively, a small post-release GitHub Actions step using `gh issue edit --add-label released`

**Where:** `.github/workflows/release.yml`, commit message convention, optional `.releaserc`

**Complexity: XS–S**

---

## Future Features (P+1D)

### F-2 — Day name as relative date (`DWed`, `D-1Wed`)
Allow `{{DWed}}` to resolve to this week's Wednesday, and `{{D-1Wed}}` to last week's Wednesday.

**Syntax:** `{{[format]|D[±N][Mon|Tue|Wed|Thu|Fri|Sat|Sun]}}` or as standalone token.

**Implementation:** Pre-processing step in `getDynamicDate()` before moment.js formatting — detect pattern, compute date with `moment().day('Wednesday')` / `moment().subtract(N, 'week').day('Wednesday')`, substitute result.

**Complexity: Low**

---

## Done (released in v1.3.1)

| Task | Commit |
|------|--------|
| ESLint 9 + eslint-plugin-obsidianmd migration; sentence-case labels; "Plugin Settings"→"Embedding" / "Developer Settings"→"Logging" heading renames; `console.log`→`error`/`debug`; typed `loadSettings` | `abfc0bd` (#21) |

## Done (released in v1.3.0)

| Task | Commit |
|------|--------|
| Plugin review compliance bundle — code, settings, release pipeline (TFile path, render-child component, void onload/blur, setHeading/banner, styles.css `!important` removed, builtin-modules→`node:module`, zip asset dropped, build-provenance attestations, untracked third-party test plugins) | `c369ecb` (#19) |
| Security & permissions cleanup — 20 Dependabot alerts cleared + workflow `permissions:` block | `9a9e884` (#17) |

## Done (released in v1.2.3)

| Task | Commit |
|------|--------|
| #13 — Refresh Interval Seconds: visual feedback when gated by Auto-Refresh | `1f0498a` |

## Done (released in v1.2.2)

| Task | Commit |
|------|--------|
| #13 — Refresh Interval Seconds: native HTML `disabled` attribute on Windows | `6c88390` |

## Done (released in v1.2.0)

| Task | Commit |
|------|--------|
| F-1 — Automatic Refresh of Embeds | `acb0b93` |

## Done (released in v1.1.0)

| Task | Commit |
|------|--------|
| #2 — Header level hierarchy (`headerHierarchy` flag) | `967cfbd` |
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
