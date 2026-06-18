---
title: "Quoth Replacement"
status: complete
version: "1.0"
---

# Implementation Plan

> Reverse-documented from the shipped work (v1.5.0, PR #32). All phases are **complete**;
> tasks are checked `[x]` and reference the commits that delivered them.

## Validation Checklist

### CRITICAL GATES (Must Pass)

- [x] All `[NEEDS CLARIFICATION]` markers addressed
- [x] All specification file paths are correct and exist
- [x] Each phase follows TDD spirit: Prime → Test → Implement → Validate
- [x] Every task has verifiable success criteria
- [x] A developer could follow this plan independently

### QUALITY CHECKS (Should Pass)

- [x] Context priming section complete
- [x] All phases defined with linked phase files
- [x] Dependencies between phases clear (no circular dependencies)
- [x] Parallel work tagged where applicable
- [x] Every phase references relevant SDD sections
- [x] Integration & validation defined in the final phase
- [x] Project commands match actual project setup

---

## Context Priming

*GATE: Read all files in this section before starting any implementation.*

**Specification**:
- `docs/XDD/specs/001-quoth-replacement/requirements.md` — Product Requirements
- `docs/XDD/specs/001-quoth-replacement/solution.md` — Solution Design

**Key Design Decisions** (from the SDD):
- **ADR-1**: Syntax-agnostic `EmbedRequest` model — one model, two parsers, one resolver.
- **ADR-2**: Silent compatibility behind an opt-in flag — render `quoth`, don't rewrite.
- **ADR-3**: `after` runs to end of file — distinct from `#header` section.
- **ADR-4**: Per-block overrides via `ParserDefaults` — settings set defaults, block keys override.
- **ADR-5**: Drop vault-wide bulk migration — per-note convert command only.

**Implementation Context**:
```bash
npm run build      # tsc -noEmit + esbuild production
npm run lint       # eslint src/ + stylelint styles.css
npm run build:dev  # deploy into the test vault
# Logic verification: bundle parsers with esbuild (obsidian aliased to a stub), run node assertions
```

---

## Implementation Phases

Each phase is in a separate file. Tasks follow Prime → Test → Implement → Validate.

- [x] [Phase 1: Foundation — model + parser/resolver split](phase-1.md)
- [x] [Phase 2: Native range embedding & inline display](phase-2.md)
- [x] [Phase 3: Silent Quoth compatibility](phase-3.md)
- [x] [Phase 4: Commands, attribution & visual parity](phase-4.md)
- [x] [Phase 5: Integration, validation & docs](phase-5.md)

---

## Plan Verification

| Criterion | Status |
|-----------|--------|
| A developer can follow this plan without additional clarification | ✅ |
| Every task produces a verifiable deliverable | ✅ |
| All PRD acceptance criteria map to specific tasks | ✅ |
| All SDD components have implementation tasks | ✅ |
| Dependencies are explicit with no circular references | ✅ |
| Each task has specification references | ✅ |
| Project commands in Context Priming are accurate | ✅ |
| All phase files exist and are linked from this manifest | ✅ |
