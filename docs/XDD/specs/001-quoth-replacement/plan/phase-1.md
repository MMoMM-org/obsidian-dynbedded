---
title: "Phase 1: Foundation — model + parser/resolver split"
status: complete
version: "1.0"
phase: 1
---

# Phase 1: Foundation — model + parser/resolver split

## Phase Context

**GATE**: Read the SDD building-block view and ADR-1 before this phase.

**Specification References**:
- `[ref: solution.md / Building Block View]`
- `[ref: solution.md / ADR-1 Syntax-agnostic EmbedRequest model]`

**Key Decisions**:
- ADR-1: introduce one internal model both parsers produce and the resolver consumes.

**Dependencies**: none (this is the load-bearing refactor everything else builds on).

**Delivered by**: commit `44ffc53` (refactor).

---

## Tasks

Establishes the syntax-agnostic core and refactors rendering without changing behaviour.

- [x] **T1.1 `EmbedRequest` model** `[activity: domain-modeling]`
  1. Prime: Read the data-model spec `[ref: solution.md / Application Data Models]`
  2. Test: model expresses whole / subpath / after / between / multi selectors and text/pos anchors
  3. Implement: `src/EmbedRequest.ts` (`EmbedRequest`, `Selector`, `Anchor`, `DynbeddedError`, `DEFAULT_JOIN`)
  4. Validate: `npm run build` types check
  5. Success: model covers every selector in the SDD `[ref: SDD/Building Block View]`

- [x] **T1.2 Native parser** `[activity: backend]`
  1. Prime: existing `[[...]]` + `key: value` syntax and `#header` split
  2. Test: `[[File]]` → whole; `[[File#H]]` → subpath; `headerHierarchy: true` detected
  3. Implement: `src/parsers/DynbeddedParser.ts`
  4. Validate: parses existing test-vault blocks unchanged
  5. Success: existing syntax → correct `EmbedRequest` `[ref: PRD/Feature 2 AC]`

- [x] **T1.3 SelectorResolver (whole + heading)** `[activity: backend]`
  1. Prime: current header-section slicing logic
  2. Test: whole-file read; heading section honours `headerHierarchy`; empty header renders nothing; missing header errors
  3. Implement: `src/SelectorResolver.ts` reproducing the legacy slice (`start+1..end`, trailing-newline trick)
  4. Validate: output byte-identical to pre-refactor for whole + `#header`
  5. Success: regression baseline holds `[ref: PRD/Feature 2 AC — unchanged behaviour]`

- [x] **T1.4 Refactor processor into orchestrator** `[activity: backend]`
  1. Prime: ADR-1 pipeline `[ref: solution.md / Runtime View]`
  2. Test: parse → date-resolve → file-resolve → extract → render path; `DynbeddedError` routed via silent-mode-aware `showError`
  3. Implement: refactor `DynbeddedProcessor.render()`; move date logic to `substituteDate`/`getDynamicDate`
  4. Validate: `npm run build` + `npm run lint` green; test-vault notes render identically
  5. Success: behaviour-preserving refactor `[ref: SDD/Quality — byte-identical]`

- [x] **T1.5 Phase validation** `[activity: validate]`
  - Build + lint green; existing embeds byte-identical.
