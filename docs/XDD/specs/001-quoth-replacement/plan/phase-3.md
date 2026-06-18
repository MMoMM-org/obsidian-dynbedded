---
title: "Phase 3: Silent Quoth compatibility"
status: complete
version: "1.0"
phase: 3
---

# Phase 3: Silent Quoth compatibility

## Phase Context

**GATE**: Read ADR-2 and the Quoth-compat PRD feature + risks.

**Specification References**:
- `[ref: requirements.md / Feature 1: Render Quoth code blocks]`
- `[ref: solution.md / ADR-2 Silent compatibility behind an opt-in flag]`
- `[ref: solution.md / Error Handling]`

**Key Decisions**:
- Second, guarded `quoth` registration behind `renderQuothBlocks` (default off).
- Quoth defaults govern `quoth` blocks (display `embedded`, join `" ... "`).
- Adapter isolated/deletable; `ParseFn` lets one processor render either syntax.

**Dependencies**: Phases 1–2 (model, resolver, range engine).

**Delivered by**: commit `75af261` (#31).

---

## Tasks

Lets Dynbedded render `quoth` blocks so Quoth can be uninstalled.

- [x] **T3.1 QuothParser adapter** `[activity: backend]`
  1. Prime: Quoth grammar `[ref: requirements.md / Supporting Research; Quoth README]`
  2. Test: `path` (+ `#heading`/`#^block`); `ranges` after / "X" to "Y" / line:col / multi; `join`; `display`; `show`; quote-aware comma/`to` splitting
  3. Implement: `src/parsers/QuothParser.ts` + `src/parsers/shared.ts` (`splitTopLevel`/`parseShow`)
  4. Validate: node logic assertions on the real-world block
  5. Success: real `quoth` block → equivalent `EmbedRequest` `[ref: PRD/Feature 1 AC]`

- [x] **T3.2 ParseFn wiring** `[activity: backend]`
  1. Prime: `ParseFn` type `[ref: solution.md / Application Data Models]`
  2. Test: `DynbeddedBlock` renders with the parser passed at registration
  3. Implement: thread `ParseFn` through `DynbeddedBlock` + `DynbeddedProcessor.render`
  4. Validate: build/lint
  5. Success: one processor renders both syntaxes `[ref: SDD/Solution Strategy]`

- [x] **T3.3 Guarded registration + setting + block subpath** `[activity: backend]`
  1. Prime: registration-conflict risk `[ref: requirements.md / Risks]`
  2. Test: setting off → quoth ignored; on → rendered; conflict → Notice, no crash; `#^block` via `resolveSubpath`
  3. Implement: `renderQuothBlocks` setting + UI; guarded `registerMarkdownCodeBlockProcessor("quoth")`; `resolveBlock` in resolver
  4. Validate: build/lint; side-by-side vs live Quoth
  5. Success: zero-rewrite cutover works `[ref: PRD/Feature 1 AC]`

- [x] **T3.4 Phase validation** `[activity: validate]`
  - Build + lint green; quoth blocks render; conflict path degrades gracefully.
