---
title: "Phase 4: Commands, attribution & visual parity"
status: complete
version: "1.0"
phase: 4
---

# Phase 4: Commands, attribution & visual parity

## Phase Context

**GATE**: Read the Should/Could PRD features and ADR-4/ADR-5.

**Specification References**:
- `[ref: requirements.md / Should Have Features]`
- `[ref: requirements.md / Could Have Features]`
- `[ref: solution.md / ADR-4 Per-block overrides; ADR-5 Drop bulk migration]`

**Key Decisions**:
- Settings set defaults; block keys override (`display`, `includeHeading`) via `ParserDefaults`.
- Bulk migration dropped — per-note convert only.
- Visual options are opt-in CSS classes; accent uses `var(--interactive-accent)`.

**Dependencies**: Phases 1–3.

**Delivered by**: commits `8266583` (#28), `5a947a4` (#29), `f3d0a57` (#30), `54da5c3`/`72d224b` (visual parity + per-block includeHeading), `ee5fe3b` (accent fix).

---

## Tasks

Rounds out parity: attribution, commands, and opt-in visual options.

- [x] **T4.1 Source attribution** `[activity: frontend]`
  1. Prime: `show:` mapping `[ref: requirements.md / Should Have]`
  2. Test: `show: title, author` footer; title falls back to file name; author from frontmatter; order preserved
  3. Implement: `show:` parse (shared) + `renderAttribution` + `.dynbedded-attribution` CSS
  4. Validate: build/lint; visual check
  5. Success: citation footer renders `[ref: PRD/Should Have]`

- [x] **T4.2 Copy reference command** `[activity: backend]` `[parallel: true]`
  1. Prime: serializer as inverse of parser
  2. Test: selection → `from/to`; cursor on heading → `#subpath`; else whole; clipboard receives a valid block
  3. Implement: `serializeDynbedded` + `src/commands/CopyReference.ts` + command registration
  4. Validate: round-trip parse(serialize(req)) ≈ req
  5. Success: ready-to-paste block on clipboard `[ref: PRD/Should Have]`

- [x] **T4.3 Convert command** `[activity: backend]` `[parallel: true]`
  1. Prime: reduced #30 scope (per-note) `[ref: solution.md / ADR-5]`
  2. Test: each `quoth` block → `dynbedded`; unparseable left untouched; count reported; surrounding text preserved
  3. Implement: `src/commands/ConvertQuoth.ts` + command registration
  4. Validate: node logic assertions
  5. Success: per-note conversion works `[ref: PRD/Could Have]`

- [x] **T4.4 Visual parity + per-block includeHeading** `[activity: frontend]`
  1. Prime: ADR-4 overrides; Quoth visual look
  2. Test: `quoteStyle` accent+indent (embedded only); `showSourceLink` opens note (keyboard accessible); `includeHeading` setting default + per-block `includeHeading: true|false` override; serializer emits it for subpath+true
  3. Implement: three opt-in settings; `ParserDefaults`; `EmbedRequest.includeHeading`; resolver uses `request.includeHeading`; CSS classes
  4. Validate: build/lint; side-by-side vs Quoth (heading line now matches)
  5. Success: visual parity + override `[ref: PRD/Could Have; SDD/ADR-4]`

- [x] **T4.5 Phase validation** `[activity: validate]`
  - Build + lint green; commands and options behave as specified.
