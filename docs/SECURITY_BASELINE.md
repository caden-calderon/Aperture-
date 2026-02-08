# Security Baseline

Last updated: 2026-02-08

This document defines the current security boundary for Aperture (local Tauri desktop app)
and the required hardening path as the proxy moves into later phases.

## CSP Stance (Current vs Future)

- Current model: `src-tauri/tauri.conf.json` uses `"csp": null`.
  This is intentional for the local `tauri://localhost` app model in Phase 0.5/1.
- Future growth path:
  once remote content loading, plugin surfaces, or web deployment is introduced,
  move to an explicit restrictive CSP (default-src `'self'`, explicit script/style/connect allow-lists).
- Rule: any phase that introduces remote origins must include CSP enablement in the same phase.

## `{@html}` Usage Boundary

- Allowed only for reviewed rendering paths:
  - Prism output from `highlightCode()` in `src/lib/utils/syntax.ts`
  - search highlighting from `highlightContent()` in `src/lib/components/blocks/ContextBlock.svelte`,
    which escapes user text via `escapeHtml()` before inserting markup.
- Disallowed:
  - direct rendering of user/tool/provider content via raw `{@html}`
  - new `{@html}` callsites without a documented escaping invariant and line-local lint suppression rationale.

## Logging and Redaction Policy

- Request/response visibility is a product feature for local debugging, but logs must still redact credentials.
- Required redaction:
  - `authorization`
  - `x-api-key`
  - any future auth-bearing headers
- Environment policy:
  - default local development: info-level logs with Aperture crate debug enabled for proxy diagnostics
  - production/release builds: prefer info-or-higher without request/response payload previews
- Any logging policy change must preserve developer troubleshooting ergonomics and be documented in this file.
