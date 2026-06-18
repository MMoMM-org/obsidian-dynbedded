# Quoth Replacement Design — obsidian-dynbedded

**Date:** 2026-06-18
**Branch:** `docs/quoth-replacement-spec`
**Status:** Approved — strategy = Silent only (opt-in `renderQuothBlocks`); bulk migration dropped. See `.claude/plans/quiet-juggling-finch.md`.
**Epic:** [#31](https://github.com/MMoMM-org/obsidian-dynbedded/issues/31)
**Issues:** [#26](https://github.com/MMoMM-org/obsidian-dynbedded/issues/26) · [#27](https://github.com/MMoMM-org/obsidian-dynbedded/issues/27) · [#28](https://github.com/MMoMM-org/obsidian-dynbedded/issues/28) · [#29](https://github.com/MMoMM-org/obsidian-dynbedded/issues/29) · [#30](https://github.com/MMoMM-org/obsidian-dynbedded/issues/30)

---

## Summary

Make Dynbedded a full replacement for the deprecated **Quoth** plugin (last release 2023) so Quoth can be uninstalled. Quoth is used in ~2255 daily notes in the Privat vault, almost always to embed *everything after a heading* from a (date-named) note, rendered *inline*:

```quoth
path: [[DP-2026-06-09]]
ranges: after "# Schedule"
display: inline
```

The core enabler is **range embedding** (#26). The other parity issues (#27 inline, #28 attribution, #29 copy-reference, #30 migration) and the **silent Quoth compatibility** strategy all build on the same foundation.

All new capability is **opt-in / additive** — existing dynbedded blocks render exactly as before (project rule: never change existing behaviour; new functionality defaults off).

---

## The key decision: Silent compatibility vs. forced rewrite

Two ways to retire Quoth:

| | **Silent** (render `quoth` blocks too) | **Rewrite** (convert blocks to `dynbedded`) |
|---|---|---|
| 2255 existing notes | untouched | edited (bulk) |
| Migration risk | none — no file churn | git churn + risk across 2255 notes |
| Decoupling | uninstall Quoth + enable flag | run migration, then uninstall Quoth |
| Long-term cost | a 2nd syntax to maintain/test forever | one syntax, but a one-off conversion + template update |
| Semantic-fidelity risk | must match Quoth exactly | must match Quoth exactly (same risk) |

**Recommendation: do both, on one shared internal model — not either/or.**

1. **Silent compatibility as an opt-in flag** (`renderQuothBlocks`, default `false`) for an instant, zero-risk cutover.
2. **Migration command** (#30) for users who later want native `dynbedded` blocks.

This works *only* if #26 is built around a **syntax-agnostic internal model** (`EmbedRequest`, below). With that model, silent compatibility is a thin Quoth-syntax adapter plus a second code-block registration — **not** a divergent second code path. Without the model (i.e. if #26 is hacked directly into today's string-parsing `render()`), silent would become a messy parallel implementation and *would* be "too divergent". The refactor is therefore a precondition, captured as Phase 0 below.

### Why silent makes sense here

- The ~2255 notes are never touched → no migration risk, no vault git churn, no broken history.
- Quoth has been abandoned since 2023; enabling the flag + uninstalling Quoth fully decouples the vault.
- The range engine is needed for #26 regardless — the Quoth adapter is the only marginal cost.
- Running silent rendering across 2255 real notes is a **live conformance test** of range/inline fidelity that the rewrite path would also need but can't get for free.

### Caveats the spec must respect

- **Single owner per code-block language.** Only one plugin can register the `quoth` processor. Enabling `renderQuothBlocks` while Quoth is still installed will conflict (Dynbedded's registration no-ops or throws). Documented order: **enable flag → reload → uninstall Quoth.** Registration must be guarded so a conflict degrades gracefully (log, don't crash).
- **Permanent surface area.** The Quoth-compat parser is a maintained, tested, documented artifact for as long as the flag exists. Keep it isolated (one adapter file) so it can be deleted wholesale if ever dropped.
- **Fidelity is the real work**, not registration. See the parity table.

---

## Architecture

### Phase 0 refactor: a syntax-agnostic embed model

Introduce an internal request object that both front-ends produce and the renderer consumes. This is the load-bearing change; everything else hangs off it.

> **Implemented** in `src/EmbedRequest.ts` (Phase 0). Corrected against the Quoth README
> after this spec's first draft: `display` uses Quoth's `embedded | inline` vocabulary (not
> `block`), positional addressing is `line:col` (not bare line numbers), and `join` defaults to
> `" ... "` (not a newline).

```ts
interface EmbedRequest {
    fileName: string;                     // link target; {{...}} tokens resolved by the orchestrator
    selector: Selector;                   // what slice of the file to embed
    display: 'embedded' | 'inline';       // #27 — 'embedded' === block (Quoth default)
    attribution: ('author' | 'title')[];  // #28 — title / author footer; empty = none
    headerHierarchy: boolean;             // existing #2 flag, only meaningful for heading selectors
    join: string;                         // #26 multi-range separator; default " ... "
}

type Selector =
    | { kind: 'whole' }                              // [[File]]
    | { kind: 'subpath'; subpath: string }           // [[File#Heading]] / #^block / #-list
    | { kind: 'after'; anchor: Anchor }              // #26 after "X" / after line:col
    | { kind: 'between'; from: Anchor; to: Anchor }  // #26 "X" to "Y"
    | { kind: 'multi'; parts: Selector[] };          // #26 multi-range, joined by EmbedRequest.join

type Anchor =
    | { kind: 'text'; text: string }                 // matches a line by raw text (incl. any '#')
    | { kind: 'pos'; line: number; col: number };    // positional, line:col (Quoth)
```

Pipeline:

```
source string
  → parse (dynbedded front-end | quoth front-end)   ← two parsers, one output
  → EmbedRequest
  → resolve date substitution (existing getDynamicDate)
  → resolve TFile (existing getFirstLinkpathDest)
  → extract content by Selector  ← new SelectorResolver (the #26 engine)
  → render (block via MarkdownRenderer.render | inline via MarkdownRenderer.render + unwrap)
  → optional attribution footer (#28)
```

### File layout

| File | Change |
|---|---|
| `src/EmbedRequest.ts` | **new** — types above + `Selector`/`Anchor` |
| `src/parsers/DynbeddedParser.ts` | **new** — today's `[[...]]` + `key: value` syntax → `EmbedRequest`; extended with range keys |
| `src/parsers/QuothParser.ts` | **new, opt-in** — `path:` / `ranges:` / `display:` / `show:` → `EmbedRequest`; the isolated, deletable compat adapter |
| `src/SelectorResolver.ts` | **new** — `EmbedRequest` + `TFile` → content string; the #26 range engine |
| `src/DynbeddedProcessor.ts` | refactor `render()` to orchestrate parse → resolve → extract → render; existing header/date/hierarchy logic moves into the parser + resolver |
| `src/DynbeddedBlock.ts` | unchanged structurally (one block = one `EmbedRequest`, still re-renders on refresh) |
| `src/main.ts` | second guarded `registerMarkdownCodeBlockProcessor('quoth', …)` behind `renderQuothBlocks` |
| `src/commands/CopyReference.ts` | **new** (#29) — build a `dynbedded` block from selection/cursor |
| `src/commands/MigrateQuoth.ts` | **new** (#30) — convert `quoth` blocks → `dynbedded` in current note / vault |

Refactor is behaviour-preserving: today's `whole` and `header` selectors must produce byte-identical output to the current `render()`. Existing test-vault notes are the regression baseline.

---

## Per-issue breakdown

### #26 — Range embedding (the foundation) · Effort L

The `SelectorResolver`. Operates on the file's lines + heading cache (already used today).

- **`after "anchor"`** — from the anchor line (exclusive) to end of section / end of file.
  - Heading anchor: reuse current header-section logic, honouring `headerHierarchy` for where the section ends.
  - Text anchor: first line containing the literal text → to end of file (or next blank-line block — see open question Q2).
- **`from "X" to "Y"`** — first line matching X (inclusive) to next line matching Y (inclusive/exclusive — Q3).
- **`line:col` positional** — Quoth's column-precise addressing (`line:col to line:col`, `after line:col`). Lower priority — the real daily-note workflow uses only text-anchored `after`.
- **multi-range / `join`** — array of selectors, concatenated with `EmbedRequest.join` (Quoth default `" ... "`, **not** a newline).
- Composes with existing date substitution (anchors may contain `{{…}}`) and `headerHierarchy`.

**Dynbedded-native syntax** (new keys, all optional, default = today's behaviour):

```dynbedded
[[File]]
after: "# Schedule"
```
```dynbedded
[[File]]
from: "## Start"
to: "## End"
```

### #27 — Inline display · Effort S

`display: embedded | inline` (default `embedded`; `embedded` === today's block behaviour). Inline renders the slice into the text flow rather than a wrapping `<div>`/`<p>`. Implementation: render via `MarkdownRenderer.render`, then unwrap the single top-level `<p>` (fallback to block for multi-block content). `embedded` stays the current behaviour.

### #28 — Source attribution · Effort S

`show: title | author` (Quoth) → `attribution` on `EmbedRequest`. Renders source title and/or author after the embedded content. Lower priority — unused in the daily-note workflow. Title comes from the file's basename / frontmatter `title`; author from frontmatter `author`. Styled via `styles.css`, no inline styles (stylelint/browserslist rules apply).

### #29 — Copy Dynbedded reference command · Effort M

Command "Copy Dynbedded reference": from the current selection/cursor, build a ready-to-paste `dynbedded` block (path + chosen selector + display) onto the clipboard. Mirrors Quoth's "Copy reference". Reuses the `EmbedRequest` → string serializer (the inverse of `DynbeddedParser`).

### #30 — Quoth → Dynbedded migration · Effort M–L

In-plugin command: convert each `quoth` block to an equivalent `dynbedded` block (current note / whole vault). Pipeline: `QuothParser` → `EmbedRequest` → `DynbeddedParser` serializer. Also update the daily-note template so new notes use `dynbedded`. Depends on #26 + #27. Offer a dry-run / preview (write to a scratch note or report count) before mutating 2255 files — and respect the repo rule against silent bulk edits.

---

## Settings

New fields in `DynbeddedSettings`, all default off / safe:

| Field | Type | Default | Description |
|---|---|---|---|
| `renderQuothBlocks` | `boolean` | `false` | Also render `quoth` code blocks (silent compatibility). Requires Quoth to be uninstalled. |
| `defaultDisplay` | `'embedded' \| 'inline'` | `'embedded'` | Fallback display when a block omits `display:` |

UI: add a **Quoth compatibility** section with the `renderQuothBlocks` toggle and an inline note about uninstalling Quoth first. Keep developer/debug settings last, as today.

---

## Quoth parity mapping

Ground truth from the [erykwalder/quoth README](https://github.com/erykwalder/quoth/blob/main/README.md):
`path:` accepts Obsidian subpaths `#Heading` / `#^blockid` / `#-list item` (chainable); `ranges:`
is `"text"` / `"X" to "Y"` / `line:col to line:col` / `after "text"` / `after line:col`,
comma-separated for multiple; `join:` default `" ... "`; `display:` is `embedded | inline`
(default `embedded`); `show:` is `author, title`.

| Quoth | Dynbedded (native) | `EmbedRequest` | Issue |
|---|---|---|---|
| `path: [[X]]` | `[[X]]` | `fileName` | — |
| `path: [[X#H]]` / `#^id` / `#-item` | `[[X#…]]` | `selector: subpath` | existing + #31 |
| `ranges: after "X"` | `after: "X"` | `selector: after` | #26 |
| `ranges: "X" to "Y"` | `from: / to:` | `selector: between` | #26 |
| `ranges: line:col to line:col` | (native key TBD) | `selector: between` (pos anchors) | #26 |
| `join` (multi-range) | repeated selectors | `selector: multi` + `join` | #26 |
| `display: embedded \| inline` | `display: embedded \| inline` | `display` | #27 |
| `show: author, title` | `show: author, title` | `attribution` | #28 |
| Copy reference cmd | Copy Dynbedded reference | — | #29 |

---

## Risks & open questions

- **Q1 — Quoth anchor literal form.** *Resolved:* `after "# Schedule"` matches the **raw line text including the `#`** (it is an arbitrary-text anchor, not a parsed heading). The text-anchor resolver must match line content literally. Still confirm slice boundaries against real blocks (Q2).
- **Q2 — Text-anchor section end.** For a non-heading `after "text"`, where does the slice end — EOF, next blank line, or next heading? Match Quoth.
- **Q3 — `from/to` inclusivity** of the `to` anchor. Match Quoth.
- **Q4 — Inline + block-level content.** A heading section often contains lists/tables; `display: inline` on multi-block content needs a defined fallback (unwrap only when single-paragraph; otherwise block).
- **Q5 — Registration conflict UX.** If `renderQuothBlocks` is on but Quoth is still installed, surface a clear notice rather than a silent no-op.
- **Q6 — Performance.** 2255 inline embeds rendering + the existing auto-refresh interval — confirm no pathological re-render cost; selector resolution reads via `cachedRead`.

---

## Phasing & sequencing

| Phase | Work | Issues | Effort |
|---|---|---|---|
| **0** | Refactor to `EmbedRequest` model + `DynbeddedParser` + `SelectorResolver`; behaviour-preserving | foundation | M |
| **1** | Range engine: `after` / `from-to` / `lines` / multi-range | #26 | L |
| **2** | Inline display | #27 | S |
| **3** | Quoth compat: `QuothParser` + guarded registration + `renderQuothBlocks` flag | (#31 silent) | M |
| **4** | Migration command + template update | #30 | M–L |
| **5** | Copy-reference command | #29 | M |
| **6** | Attribution (lowest priority) | #28 | S |

Phases 0→1 unblock everything. Phase 3 (silent) and Phase 4 (migration) are independent once 0–2 land — ship silent first for the zero-risk cutover, migration later for users who want native blocks.

---

## Out of scope

- Quoth features not present in the daily-note workflow beyond the parity table (e.g. any styling/theming Quoth-specific options) — add only if a real note needs them.
- Changing any existing `dynbedded` block behaviour.
