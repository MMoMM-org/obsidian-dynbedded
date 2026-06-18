---
title: "Quoth Replacement"
status: complete
version: "1.0"
---

# Product Requirements Document

> Reverse-documented from `docs/superpowers/specs/2026-06-18-quoth-replacement-design.md`.
> The feature shipped in **v1.5.0** (Epic [#31](https://github.com/MMoMM-org/obsidian-dynbedded/issues/31), issues #26–#30, PR #32). Acceptance criteria are marked `[x]` where the shipped build satisfies them.

## Validation Checklist

### CRITICAL GATES (Must Pass)

- [x] All required sections are complete
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Problem statement is specific and measurable
- [x] Every feature has testable acceptance criteria (Gherkin format)
- [x] No contradictions between sections

### QUALITY CHECKS (Should Pass)

- [x] Problem is validated by evidence (real vault usage — ~2255 notes)
- [x] Context → Problem → Solution flow makes sense
- [x] Every persona has at least one user journey
- [x] All MoSCoW categories addressed (Must/Should/Could/Won't)
- [x] Every metric has corresponding tracking events (manual/observational — see note)
- [x] No feature redundancy
- [x] No technical implementation details included (those live in solution.md)
- [x] A new team member could understand this PRD

---

## Product Overview

### Vision
Let an Obsidian user retire the deprecated Quoth plugin without losing or rewriting any of their existing embeds — Dynbedded renders Quoth code blocks directly and offers equivalent native syntax.

### Problem Statement
Quoth (last release 2023, abandoned) is used in ~2255 daily notes in the maintainer's vault — almost always to embed *everything after a heading* from a date-named note, rendered *inline*:

```quoth
path: [[DP-2026-06-09]]
ranges: after "# Schedule"
display: inline
```

Dynbedded historically could embed only a whole note or a whole `#header` section, as a block. It could not embed a sub-range, render inline, or read Quoth syntax. So a user could not drop Quoth without either losing those embeds or hand-editing thousands of notes. As an abandoned plugin, Quoth is also an unmaintained dependency and compatibility risk.

### Value Proposition
A **zero-rewrite cutover**: enable one opt-in setting, reload, uninstall Quoth — the ~2255 notes keep rendering untouched. Users who want native Dynbedded blocks get equivalent syntax (range embedding, inline, attribution) plus commands to copy/convert references. Existing Dynbedded behaviour is unchanged because every new capability is opt-in and off by default.

## User Personas

### Primary Persona: The daily-notes power user
- **Demographics:** Long-time Obsidian user, comfortable with plugins and code-block syntax; maintains date-named daily notes (`DP-YYYY-MM-DD`) with structured headings (e.g. `# Schedule`).
- **Goals:** Stop depending on an abandoned plugin; keep every existing embed rendering exactly as before; not touch thousands of historical notes.
- **Pain Points:** Quoth is unmaintained; migrating by hand across ~2255 notes is infeasible and risky; any rendering difference is immediately visible across the whole vault.

### Secondary Personas
- **The Dynbedded user wanting partial embeds:** already uses `dynbedded` blocks and wants to embed a sub-range (after a heading, between two anchors), render inline, or add a source citation — without knowing or caring about Quoth.

## User Journey Maps

### Primary User Journey: Cutover from Quoth
1. **Awareness:** User learns (README top callout) that Dynbedded can render Quoth blocks.
2. **Consideration:** Compares output side-by-side (Quoth block vs. equivalent Dynbedded block) to confirm fidelity.
3. **Adoption:** Enables **Render quoth blocks**, reloads Obsidian, uninstalls Quoth.
4. **Usage:** Existing `quoth` blocks now render via Dynbedded; new notes use native `dynbedded` syntax (optionally via the daily-note template).
5. **Retention:** No regressions across the vault; optional visual parity (quote accent, source link) makes embeds feel native.

### Secondary User Journey: Native partial embed
1. User writes a `dynbedded` block with `after: "# Schedule"` (or `from:`/`to:`), optionally `display: inline` / `show: title`.
2. Or selects text and runs **Copy reference** to get a ready-to-paste block.

## Feature Requirements

### Must Have Features

#### Feature 1: Render Quoth code blocks (silent compatibility)
- **User Story:** As a daily-notes power user, I want Dynbedded to render my existing `quoth` blocks so that I can uninstall Quoth without rewriting any notes.
- **Acceptance Criteria (Gherkin Format):**
  - [x] Given **Render quoth blocks** is off (default), When a note contains a `quoth` block, Then Dynbedded does not touch it (existing behaviour).
  - [x] Given the setting is on and Quoth is uninstalled, When a `quoth` block with `path` + `ranges: after "X"` + `display` is rendered, Then it shows the same content Quoth showed.
  - [x] Given the setting is on but Quoth is still installed (language conflict), When the plugin loads, Then it surfaces a clear notice and does not crash.

#### Feature 2: Range embedding
- **User Story:** As a user, I want to embed a sub-range of a note (not only a whole note or whole `#section`) so that I can mirror Quoth's core capability.
- **Acceptance Criteria:**
  - [x] Given `after: "# Schedule"`, When the block renders, Then it shows everything from the anchor line (exclusive) to the end of the file.
  - [x] Given `from: "X"` and `to: "Y"`, When the block renders, Then it shows the range between those text anchors (both ends inclusive).
  - [x] Given a `{{date}}` token in an anchor, When the block renders, Then the date is substituted before matching.
  - [x] Given a block with neither range key nor `#header`, When it renders, Then the whole file is embedded (unchanged behaviour).

#### Feature 3: Inline display
- **User Story:** As a user, I want embedded content to flow inline so that short quotes don't break into their own block.
- **Acceptance Criteria:**
  - [x] Given `display: inline`, When a single-paragraph slice renders, Then the surrounding paragraph is unwrapped so content flows in one run.
  - [x] Given `display` is omitted, When the block renders, Then it uses the **Default display mode** setting (default `embedded`).
  - [x] Given multi-block content (lists/tables) with `display: inline`, When it renders, Then it falls back to block layout rather than breaking.

### Should Have Features

- **Source attribution** (`show: author, title`) — a citation footer after the embed; title falls back to file name, author from frontmatter. *(shipped)*
- **Copy reference command** — turn the current selection/cursor into a ready-to-paste `dynbedded` block on the clipboard. *(shipped)*

### Could Have Features

- **Convert quoth blocks in current note** — a per-note command rewriting `quoth` blocks to `dynbedded`. *(shipped, reduced from the original vault-wide migration)*
- **Visual parity options** (all opt-in): quote styling (accent + indent), source-link icon, include-heading-in-section (per-block override). *(shipped as a follow-up)*

### Won't Have (This Phase)
- **Vault-wide bulk migration** of `quoth` → `dynbedded` across all notes — dropped under the silent strategy; notes stay in `quoth` syntax, rendered by Dynbedded.
- **`#-list-item` subpaths** and **column-precise `line:col`** (resolved per line; column ignored) — not used in the daily-note workflow.
- **Quoth-specific theming/styling options** beyond the parity table.
- Any change to existing `dynbedded` block behaviour.

## Detailed Feature Specifications

### Feature: Render Quoth code blocks (silent compatibility)
**Description:** With an opt-in setting on, Dynbedded registers a second code-block processor for the `quoth` language and renders those blocks through the same engine as `dynbedded`, mapping Quoth's fields onto the same outcome.

**User Flow:**
1. User enables **Render quoth blocks** and reloads Obsidian.
2. User uninstalls Quoth (only one plugin may own the `quoth` language).
3. System renders every `quoth` block via Dynbedded.

**Business Rules:**
- Rule 1: When the setting is off, `quoth` blocks are ignored entirely.
- Rule 2: When registration conflicts (Quoth still installed), surface a notice and continue — never crash on load.
- Rule 3: Quoth's own defaults govern `quoth` blocks (e.g. `display` defaults to `embedded`, `join` to `" ... "`) for fidelity.

**Edge Cases:**
- Quoth still installed → registration conflict → notice, graceful degradation.
- Unparseable `quoth` block → render an error (silent-mode aware), do not crash.
- `#-list` subpath → unsupported → surfaces as "header not found" rather than wrong content.

## Success Metrics

### Key Performance Indicators
- **Adoption (decoupling):** The maintainer can uninstall Quoth and keep all ~2255 notes rendering — measured by side-by-side comparison showing no visible differences on the daily-note workflow.
- **Regression safety:** Existing whole-file and `#header` `dynbedded` embeds render byte-identical to the pre-change build.
- **Quality:** Build + lint green; parser/serialize/convert logic covered by assertions (23/23 at ship).

### Tracking Requirements
No telemetry is collected (an Obsidian plugin; privacy-respecting). "Tracking" here is observational/manual verification:

| Event | Properties | Purpose |
|-------|------------|---------|
| Side-by-side comparison (Quoth vs Dynbedded) | per-case match/mismatch | Confirm rendering fidelity before cutover |
| Regression check on test-vault notes | byte-identical vs baseline | Guard the never-change-existing-behaviour rule |

## Constraints and Assumptions

### Constraints
- **Never change existing behaviour:** every new capability must be opt-in and off by default (project rule / backwards compatibility for current users).
- **One plugin per code-block language:** Dynbedded can only render `quoth` blocks once Quoth is uninstalled.
- **Obsidian/Electron platform:** CSS limited to the `minAppVersion` Chromium floor (stylelint/browserslist gate); UI text must be sentence case (community-plugin review).
- Maintainer time — a single-maintainer plugin; the Quoth-compat surface must stay isolated and deletable.

### Assumptions
- Quoth remains abandoned (no competing updates).
- The daily-note workflow (`after "# Heading"`, inline) is the dominant real usage; rarer Quoth features can be lower priority.
- Users can follow the documented order: enable flag → reload → uninstall Quoth.

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Rendering fidelity differs from Quoth across 2255 notes | High | Medium | Side-by-side comparison note; match Quoth semantics (anchor = raw line text, `after` → EOF); `includeHeading` option to match heading inclusion |
| Code-block language registration conflict | Medium | Medium | Guard registration in try/catch; notice; documented uninstall order |
| Permanent second-syntax maintenance burden | Medium | High | Isolate the Quoth adapter in one deletable file behind an opt-in flag |
| Changing existing behaviour by accident | High | Low | Behaviour-preserving refactor; byte-identical regression baseline |

## Open Questions

- [x] Anchor literal form — *resolved:* `after "# Schedule"` matches the raw line text including `#`.
- [ ] Exact `after` / `from-to` slice boundaries vs Quoth on edge cases (verify against more real blocks).
- [ ] Inline rendering of multi-block content — defined fallback (block) shipped; confirm it matches user expectation.

---

## Supporting Research

### Competitive Analysis
Quoth ([erykwalder/quoth](https://github.com/erykwalder/quoth)) is the direct predecessor. Its fields: `path` (with `#heading`/`#^block`/`#-list` subpaths), `ranges` (`"text"`, `"X" to "Y"`, `line:col`, `after`), `join` (default `" ... "`), `display` (`embedded`/`inline`), `show` (`author`/`title`). Dynbedded maps each onto a shared internal model. Obsidian's native `![[...]]` embeds are block-only and offer no range/inline control — the gap Dynbedded fills.

### User Research
Direct maintainer-as-user evidence: ~2255 daily notes using the `after "# Schedule"` + `display: inline` pattern. Side-by-side comparison against a live Quoth install confirmed parity on the core workflow.

### Market Data
Niche (Obsidian community plugin). Value is concentrated in users with existing Quoth content who need a maintained path forward.
