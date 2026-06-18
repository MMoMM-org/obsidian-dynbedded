# Specification: 001-quoth-replacement

## Status

| Field | Value |
|-------|-------|
| **Created** | 2026-06-18 |
| **Current Phase** | Implemented |
| **Last Updated** | 2026-06-18 |

## Documents

| Document | Status | Notes |
|----------|--------|-------|
| requirements.md | completed | PRD — migrated from superpowers design doc |
| solution.md | completed | SDD — architecture + ADRs (confirmed) |
| plan/ | completed | PLAN — 5 phases, all shipped |

**Status values**: `pending` | `in_progress` | `completed` | `skipped`

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-18 | Migrate `docs/superpowers/specs/2026-06-18-quoth-replacement-design.md` into XDD | superpowers/ is a relic of the briefly-installed obra/superpowers plugin (commit 372210f); the project uses XDD. Restructure the design doc into requirements → solution → plan rather than copy verbatim. |
| 2026-06-18 | Strategy: silent only | Render `quoth` blocks directly via opt-in setting; the ~2255 Quoth notes need no rewrite. Bulk migration dropped. |
| 2026-06-18 | Implementation complete | Shipped in v1.5.0 (PR #32); issues #26–#31 closed. PRD/SDD/PLAN reverse-documented from the merged work. |

## Context

Full replacement for the deprecated Quoth plugin (Epic #31, issues #26–#30), already
shipped in **v1.5.0** (PR #32). This spec retroactively captures the requirements,
design and plan in XDD form, migrated from the superpowers-era design document.

Source design doc: `docs/superpowers/specs/2026-06-18-quoth-replacement-design.md` (removed
after migration). Implementation: syntax-agnostic `EmbedRequest` model + two front-end
parsers (`parsers/DynbeddedParser.ts`, `parsers/QuothParser.ts`) + one `SelectorResolver`.

---
*This file is managed by the xdd-meta skill.*
