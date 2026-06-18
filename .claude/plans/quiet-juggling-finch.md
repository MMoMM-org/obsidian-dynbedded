# Plan: Quoth Replacement (Epic #31) — Silent strategy, full feature parity

## Context

The deprecated **Quoth** plugin (last release 2023) is used in ~2255 daily notes in the
Privat vault — almost always to embed *everything after a heading* from a date-named note,
rendered *inline*:

```quoth
path: [[DP-2026-06-09]]
ranges: after "# Schedule"
display: inline
```

Goal: make Dynbedded a full replacement so Quoth can be uninstalled.

**Decisions taken (this session):**
- **Strategy = Silent only.** Dynbedded renders `quoth` code blocks directly via an opt-in
  flag (`renderQuothBlocks`, default off). The ~2255 notes are **never edited** — zero file
  churn, zero migration risk. They stay in quoth syntax, rendered by Dynbedded.
- **Scope = whole epic** (full feature parity): range embedding (#26), inline display (#27),
  attribution (#28), copy-reference (#29) — built on one shared internal model so the silent
  quoth front-end and the native dynbedded front-end produce identical output.
- **#30 reconciliation:** under the silent strategy the *bulk file conversion* is unnecessary
  and intentionally dropped. #30 reduces to a **daily-note template update** (new notes use
  `dynbedded`) plus an *optional* convert-current-note command (low priority). No vault-wide
  rewrite.

**Foundational principle (project rule):** existing `dynbedded` blocks must render byte-identical
to today. All new capability is additive and defaults off.

A design spec already exists at `docs/superpowers/specs/2026-06-18-quoth-replacement-design.md`
(committed on this branch). It must be updated during Phase 0 with the corrected Quoth syntax
facts below (the spec was written before the Quoth README was checked).

### Quoth syntax — ground truth (from erykwalder/quoth README)

| Field | Values / grammar | Default |
|---|---|---|
| `path:` | `[[file#subpath]]`; subpath = `#Heading`, `#^blockid`, `#-list item`, chainable | required |
| `ranges:` | `"text"` (single) · `"X" to "Y"` · `line:col to line:col` · `after "text"` · `after line:col`; comma-separated for multiple | whole file |
| `join:` | `"string"` joining 2+ ranges | `" ... "` |
| `display:` | `embedded` \| `inline` | `embedded` |
| `show:` | `author`, `title` (comma combos) | none |

Key fidelity facts: `after "# Schedule"` matches the **raw line text including the `#`** (not a
parsed heading). `join` default is `" ... "`, **not** a newline. Positional addressing is
`line:col` (column-precise), not bare line numbers. Default display is `embedded`, not block.

## Architecture

One syntax-agnostic internal model; two front-end parsers; one resolver + renderer.

```
quoth block ──→ QuothParser ──┐
                              ├──→ EmbedRequest ──→ SelectorResolver ──→ render (block|inline) ──→ [attribution]
dynbedded block ─→ DynbeddedParser ┘
```

### New model — `src/EmbedRequest.ts`

```ts
interface EmbedRequest {
  fileName: string;                 // after date-substitution; no [[ ]], no subpath
  selector: Selector;
  display: 'embedded' | 'inline';   // matches Quoth vocabulary
  attribution: ('author' | 'title')[]; // empty = none
  headerHierarchy: boolean;         // existing #2 flag, only for heading selectors
  join: string;                     // default " ... "
}
type Selector =
  | { kind: 'whole' }
  | { kind: 'subpath'; subpath: string }     // #Heading / #^block / #-list — Obsidian subpath
  | { kind: 'after'; anchor: Anchor }
  | { kind: 'between'; from: Anchor; to: Anchor }
  | { kind: 'multi'; parts: Selector[] };    // joined by EmbedRequest.join
type Anchor =
  | { kind: 'text'; text: string }           // raw line text, incl. any '#'
  | { kind: 'pos'; line: number; col: number };
```

### Front-end parsers — `src/parsers/`

- **`DynbeddedParser.ts`** — today's `[[...]]` + `key: value` syntax, extended with range keys
  (`after:`, `from:`/`to:`, `display:`, `show:`). Also exposes a **serializer** (`EmbedRequest`
  → dynbedded source string) reused by #29 and the optional #30 convert.
- **`QuothParser.ts`** — `path:`/`ranges:`/`join:`/`display:`/`show:` → `EmbedRequest`. Isolated,
  deletable compat adapter. Only loaded when `renderQuothBlocks` is on.

### Resolver — `src/SelectorResolver.ts`

`(EmbedRequest, TFile) → content string`. The #26 engine. Reuses today's heading-cache logic
for `subpath` headings (incl. `headerHierarchy`), adds text/positional anchor resolution and
multi-range join. Reads via `app.vault.cachedRead` (as today). Obsidian subpath resolution
(`#^block`, `#-list`) via `metadataCache.getFileCache()` `blocks`/`listItems`.

### Renderer — refactored `src/DynbeddedProcessor.ts`

`render()` becomes an orchestrator: pick parser → `EmbedRequest` → existing date substitution
(`getDynamicDate`) on `fileName` + anchors → `getFirstLinkpathDest` → `SelectorResolver` →
`MarkdownRenderer.render`; inline mode unwraps the single top-level `<p>` (fallback to block for
multi-block content) → optional attribution footer. Existing `whole`/heading paths must stay
byte-identical.

### Registration — `src/main.ts`

Add a **guarded** second `registerMarkdownCodeBlockProcessor('quoth', …)`, only when
`settings.renderQuothBlocks` is true. Guard against the "language already owned" conflict (Quoth
still installed) — log a Notice, do not crash. Documented order: enable flag → reload → uninstall
Quoth.

## Phases

| Phase | Work | Issue | Effort |
|---|---|---|---|
| 0 | `EmbedRequest` model + `DynbeddedParser` + `SelectorResolver` skeleton; refactor `render()` behaviour-preserving (`whole` + heading subpath only). Update spec with Quoth ground-truth. | foundation | M |
| 1 | Range engine: `after "text"`, `from/to`, `line:col`, multi-range + `join` | #26 | L |
| 2 | Inline display + unwrap logic; `defaultDisplay` setting | #27 | S |
| 3 | `QuothParser` + guarded `quoth` registration + `renderQuothBlocks` flag + subpath `#^`/`#-` | #31 silent | M |
| 4 | Copy-reference command (selection → dynbedded block via serializer) | #29 | M |
| 5 | Attribution footer (`show: title \| author`) + `styles.css` | #28 | S |
| 6 | Daily-template update (+ optional convert-current-note command) | #30 (reduced) | S |

Phases 0→1 unblock everything. Phase 3 delivers the actual Quoth cutover (the user's primary
need). Phases 4–6 round out parity.

## Files

| File | Change |
|---|---|
| `src/EmbedRequest.ts` | new — model + `Selector`/`Anchor` |
| `src/parsers/DynbeddedParser.ts` | new — parse + serialize dynbedded syntax |
| `src/parsers/QuothParser.ts` | new — quoth→`EmbedRequest` adapter (opt-in) |
| `src/SelectorResolver.ts` | new — range/anchor/subpath engine |
| `src/DynbeddedProcessor.ts` | refactor render() into orchestrator; move heading/date logic into parser+resolver |
| `src/DynbeddedSettingTab.ts` | new `renderQuothBlocks`, `defaultDisplay` settings + Quoth-compat UI section |
| `src/main.ts` | guarded second code-block registration |
| `src/commands/CopyReference.ts` | new (#29) |
| `src/commands/MigrateNote.ts` | new, optional (#30 reduced) |
| `styles.css` | attribution styling (no inline styles — stylelint/browserslist apply) |
| `Dynbedded/` test vault | add quoth + range/inline test notes for regression |
| `docs/.../2026-06-18-quoth-replacement-design.md` | update with Quoth ground-truth (Phase 0) |

## Reuse existing code

- `DynbeddedProcessor.getDynamicDate()` — date substitution, unchanged; called on `fileName` + anchors.
- Heading-section + `headerHierarchy` logic (current `render()` lines 96–139) — moves into
  `SelectorResolver` for the `subpath` heading + `after`-heading cases.
- `getHeaderSectionContent()` slicing pattern — generalise for line ranges.
- `DynbeddedBlock` lifecycle (auto-refresh, re-render) — unchanged; one block = one `EmbedRequest`.
- `metadataCache.getFirstLinkpathDest`, `vault.cachedRead` — unchanged.

## Open fidelity questions — verify against the real Privat vault before locking

1. Where does `after "text"` end — EOF, next blank line, or next heading? (Most likely EOF;
   confirm with real notes.)
2. `from "X" to "Y"` — is `to` inclusive? Does matching anchor on the same line work?
3. `line:col` semantics — 0- or 1-based; col = character offset within the line.
4. `inline` rendering of multi-block content (lists/tables under `# Schedule`) — define unwrap
   fallback.
5. Block/list subpath (`#^id`, `#-item`) exact slice — match Obsidian/Quoth.

Pull ~5 representative quoth blocks from the Privat vault, render under the flag, diff against
Quoth's output to nail #1–#5.

## Verification

- `npm run build` — tsc type-check + esbuild bundle must pass.
- `npm run lint` (eslint `src/`) + `npm run lint:css` (stylelint/browserslist) must pass.
- Test vault `Dynbedded/`: add notes exercising each selector (whole, heading, `after`, `from/to`,
  `line:col`, multi-range/join), both `embedded` and `inline`, plus a `quoth`-keyword block under
  the flag. `npm run dev` → hot-reload → visually confirm each renders correctly and existing
  dynbedded notes are unchanged.
- Regression gate: existing `Dynbedded/` notes (whole-file + `#header` embeds) render identical
  to pre-refactor (the byte-identical requirement).
- Fidelity gate: the 5 real Privat-vault quoth blocks render identically under the flag vs Quoth.
- Per project conventions: branch per phase, conventional commits (`feat:` for #26/#27/#28/#29
  source, `chore:` for vault/docs/template), `closes #N`, release only on feat/fix.

## Out of scope

- Bulk vault-wide quoth→dynbedded conversion (dropped under Silent strategy).
- Any change to existing dynbedded block behaviour.
- Quoth features absent from the daily-note workflow beyond the parity table.
