# Execution Prompt (Copy/Paste For Fresh Context)

You are resuming work in `/home/caden/projects/Aperture`.

Read in this exact order:
1. `.context/RESUME.md`
2. `.context/CODE_STANDARDS.md`
3. `dev/active/audit-2026-02-08/report.md`
4. `dev/active/audit-2026-02-08/review-of-audit.md`
5. `.context/AUDIT_PROMPT.md`

Then execute this plan end-to-end (do not stop at analysis):

## Objective
Implement P0 from the calibrated audit report:
- get `make check` green
- fix block-type semantics (`role` vs `blockType`) and remove unsafe casts
- remove backend panic surfaces in proxy/terminal internals
- apply security baseline pragmatically for future phases

## Required Deliverables
1. Code changes implementing all P0 items.
2. Updated docs for any changed behavior.
3. Passing verification output:
   - `make check`
   - `make test`
   - `npm run build`
4. A markdown implementation report at:
   - `dev/active/audit-2026-02-08/p0-execution-report.md`

## P0 Scope (Strict)

### A) Restore `make check` (lint gate)
- Fix all current lint failures.
- For `{@html}`:
  - do not remove safe Prism-based highlighting behavior
  - add explicit, minimal, line-local lint suppressions with short rationale
  - ensure the rationale references the safe invariant (`highlightCode`/`escapeHtml` path)

### B) Block Type Correctness
- Remove unsafe custom-role cast patterns.
- Keep `role` canonical (`system|user|assistant|tool_use|tool_result`).
- Use `blockType` for custom type identity.
- Ensure:
  - assign selected blocks to custom type works correctly
  - select/filter by custom type works correctly
  - no TypeScript role-cast hacks remain

### C) Backend Panic Surface Reduction
- Replace `unwrap/expect` in:
  - `src-tauri/src/proxy/mod.rs`
  - `src-tauri/src/terminal/session.rs`
- Preserve behavior while preventing avoidable process panics.
- `src-tauri/src/lib.rs` app-entry `run().expect(...)` may remain if justified in comments/report.

### D) Security Baseline (Future-Phase Hardened)
- Add a short security policy note in docs (new section or new file) covering:
  - CSP stance for current local Tauri model and future growth path
  - allowed `{@html}` usage boundary
  - logging/redaction policy by environment
- If changing runtime logging defaults, keep developer ergonomics and note tradeoffs.

## Constraints
- Do not over-engineer or add unused abstractions.
- Keep changes minimal, high-signal, and staff-level readable.
- Add/adjust tests for touched logic (at least for block-type semantics).
- Do not revert unrelated local changes.

## Verification + Output Format
- Run and report:
  - `make check`
  - `make test`
  - `npm run build`
- In final response include:
1. What changed (files + concise rationale)
2. Risks/tradeoffs
3. Exact verification results
4. Follow-up P1 recommendations
