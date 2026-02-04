# Aperture Resume Context

> **Read this file first when starting a fresh session.**
> It tells you where we are, what to read, and what to do next.

---

## Current State

| Field | Value |
|-------|-------|
| **Phase** | 0 — UI Foundation |
| **Status** | NOT STARTED |
| **Last Updated** | 2026-02-04 |
| **Blocking Issues** | None |
| **Next Step** | Initialize Tauri + Svelte project, validate proxy concept |

---

## Quick Context (30 seconds)

**Aperture** is a universal LLM context visualization, management, and control proxy. It sits between AI coding tools (Claude Code, Codex, etc.) and their APIs, giving users full visibility and control over their context window.

### Key Architecture Decisions

- **Proxy model** — Intercept via `ANTHROPIC_BASE_URL` / `OPENAI_API_BASE`, zero tool modifications needed
- **Three layers** — Rust proxy core, Rust context engine, Svelte 5 + Canvas UI
- **UI-first build strategy** — Complete UI with mock data before wiring backend
- **Non-destructive compression** — Original content always preserved, multi-level compression slider
- **Cleaner model sidecar** — Local LLM for background tasks, async, never blocks proxy

---

## Implementation Phases

| Phase | Name | Status | Focus |
|-------|------|--------|-------|
| 0 | UI Foundation | NOT STARTED | Tauri + Svelte 5 shell, full visual UI with mock data, animations, dithering effects |
| 1 | Proxy Core | PENDING | HTTP intercept, request/response capture, SSE streaming, live UI updates |
| 2 | Context Engine | PENDING | Parsing, zones, token counting, block management |
| 3 | Dynamic Compression | PENDING | Multi-level compression, slider UI, LLM integration |
| 4+ | See APERTURE.md | PENDING | Heat maps, clustering, checkpoints, etc. |

**Read phase details**: `.context/phases/phase-{N}.md`

---

## What To Read

### Starting a Phase (Read in Order)
1. `.context/RESUME.md` — This file
2. `APERTURE.md` — Full design document (comprehensive)
3. `docs/ARCHITECTURE.md` — System architecture overview
4. `.context/phases/phase-{N}.md` — Current phase details
5. `.context/CODE_STANDARDS.md` — Before writing code

### Reference Materials
- `reference/context-forge-prototype.html` — Working HTML prototype of UI

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| App shell | Tauri v2 |
| Frontend | Svelte 5 + SvelteKit |
| Styling | Tailwind CSS + custom CSS |
| Visual effects | Canvas API / WebGL |
| Backend/Proxy | Rust (axum) |
| Context Engine | Rust |
| Token counting | tiktoken-rs |
| IPC | Tauri IPC + WebSocket |

---

## Environment Setup

```bash
# Prerequisites
rustup (Rust toolchain)
node >= 20
pnpm (preferred) or npm

# Install dependencies
pnpm install
cd src-tauri && cargo build

# Development
pnpm tauri dev

# Quality checks (run before completing phases)
make check

# Tests
make test        # Rust unit tests
make test-ui     # Frontend tests
```

---

## Key Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-04 | Svelte 5 over React | No virtual DOM, built-in animations, smaller bundle, better real-time perf |
| 2026-02-04 | UI-first build strategy | Visual experience is the value prop, faster iteration |
| 2026-02-04 | Proxy via env vars | Zero modification to tools, universal compatibility |
| 2026-02-04 | Halftone/dithering aesthetic | Distinctive, functional (density = data), Obra Dinn inspired |

---

## Session Workflow

### Starting Fresh
1. Read this file
2. Read current phase file
3. Continue from checkpoint

### Before Compaction (~70% context)
1. Update "Current State" above
2. Update phase file progress
3. Commit changes
4. Ask: "Context at ~70%. Ready to compact?"

### Completing a Phase
1. `make check` passes
2. Manual tests pass
3. Update RESUME.md
4. Add "Context from Phase N" to next phase
5. Commit: `phase-N: complete`
