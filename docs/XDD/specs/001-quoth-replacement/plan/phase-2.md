---
title: "Phase 2: Native range embedding & inline display"
status: complete
version: "1.0"
phase: 2
---

# Phase 2: Native range embedding & inline display

## Phase Context

**GATE**: Read ADR-3 (`after` → EOF) and the range/inline PRD features.

**Specification References**:
- `[ref: requirements.md / Feature 2: Range embedding]`
- `[ref: requirements.md / Feature 3: Inline display]`
- `[ref: solution.md / ADR-3 after runs to end of file]`

**Key Decisions**:
- `after` text anchor runs to end of file (distinct from `#header`).
- `display` uses Quoth vocabulary `embedded | inline`; default from the `defaultDisplay` setting.

**Dependencies**: Phase 1 (model + resolver).

**Delivered by**: commits `9012670` (#26), `111dc78` (#27).

---

## Tasks

Adds sub-range selectors and inline rendering on top of the core model.

- [x] **T2.1 Range selectors in resolver** `[activity: backend]`
  1. Prime: `Selector` after/between/multi `[ref: solution.md / Application Data Models]`
  2. Test: `after "X"` → anchor (exclusive) to EOF; `from/to` inclusive; multi joined by `join`; text anchor matches exact line then substring; missing anchor errors
  3. Implement: `resolveAfter` / `resolveBetween` / `multi` + `findAnchorLine` in `SelectorResolver.ts`
  4. Validate: build/lint; manual render in test vault
  5. Success: `after`/`from-to`/multi render correctly `[ref: PRD/Feature 2 AC]`

- [x] **T2.2 Range keys in native parser + date-on-anchors** `[activity: backend]`
  1. Prime: native key grammar
  2. Test: `after:` / `from:`+`to:` parse to selectors; missing one of from/to errors; `{{date}}` substituted in anchors
  3. Implement: range keys in `DynbeddedParser.ts`; extend `resolveDates` to walk anchors
  4. Validate: build/lint
  5. Success: date substitution applies to anchors `[ref: PRD/Feature 2 AC]`

- [x] **T2.3 Inline display** `[activity: frontend]`
  1. Prime: inline fallback rule `[ref: requirements.md / Feature 3]`
  2. Test: `display: inline` unwraps a single `<p>`; multi-block falls back to block; `defaultDisplay` applies when omitted
  3. Implement: `display:` parse + `defaultDisplay` setting + `renderInline` (unwrap) + `.dynbedded-inline` CSS
  4. Validate: build/lint; visual check
  5. Success: inline flows in one run, block unchanged `[ref: PRD/Feature 3 AC]`

- [x] **T2.4 Phase validation** `[activity: validate]`
  - Build + lint green; range + inline render as specified.
