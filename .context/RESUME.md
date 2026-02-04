# Aperture Resume Context

> **Read this file first when starting a fresh session.**
> It tells you where we are, what to read, and what to do next.

---

## Current State

| Field | Value |
|-------|-------|
| **Phase** | 0 — UI Foundation |
| **Status** | ✅ READY FOR SPRINT |
| **Last Updated** | 2026-02-04 |
| **Blocking Issues** | None |
| **Next Step** | Begin Phase 0 implementation (Zone, ContextBlock, interactions) |

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
| 0 | UI Foundation | PLANNING | Tauri + Svelte 5 shell, full visual UI with mock data, animations, dithering |
| 1 | Proxy Core | PENDING | HTTP intercept, request/response capture, WebSocket events |
| 2 | Context Engine | PENDING | Block management, zones, token counting, classification |
| 3 | Dynamic Compression | PENDING | Multi-level compression, slider UI, async LLM |
| 4 | Heat & Clustering | PENDING | Usage heat, position relevance, topic clusters, dedup |
| 5 | Checkpoints & Forking | PENDING | Hard/soft checkpoints, forking, ghost blocks, trash |
| 6 | Staging & Presets | PENDING | Pre-loaded injection, presets, templates, CLI, profiles |
| 7 | Cleaner Sidecar | PENDING | Local model, tiered routing, dependency graph |
| 8 | Search & NLP | PENDING | Full-text/semantic search, NL commands, annotations |
| 9 | Analytics | PENDING | Cost tracking, timeline, replay, health score, warnings |
| 10 | Task Integration | PENDING | TODO parsing, completion hooks, pre-fetching, pause/swap |
| 11 | System Prompts & Git | PENDING | Prompt composition, A/B testing, git integration, learning |
| 12 | Plugins & Ecosystem | PENDING | Plugin system, API, community, multi-agent (deferred) |

**Phase docs**: `.context/phases/phase-{N}.md` — All 13 phases documented

### Planning Strategy (COMPLETE)
1. ~~**Create** detailed phase files for phases 0-12~~ ✅ Done
2. ~~**Review** each phase for completeness, dependencies, acceptance criteria~~ ✅ Done
3. ~~**Refine** based on review — resolve ambiguities, add missing details~~ ✅ Done
4. **Code** — sprint with no blockers ← **START HERE**

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
- `.claude/skills/aperture-ui.md` — **USE FOR ALL UI WORK** (design system, colors, typography, animations)

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

---

## Progress Log

### 2026-02-04: Repo Setup Complete

**Completed:**
- ✅ Git repo initialized (`main` branch)
- ✅ Tauri v2 + Svelte 5 + SvelteKit project skeleton
- ✅ Rust dependencies configured (axum, tokio, tiktoken-rs, reqwest, tower-http, etc.)
- ✅ Basic UI shell with header, token bar, sidebar, zones placeholder
- ✅ Design system (CSS variables, halftone patterns, animations)
- ✅ TypeScript types for Block, Session, Snapshot
- ✅ Agent handoff structure (`.context/`, phases, RESUME.md)
- ✅ Initial commit: `f951650`

**Key files:**
- `src/routes/+page.svelte` — UI shell with animated token bar
- `src/app.css` — Design system with CSS variables
- `src/lib/types.ts` — TypeScript interfaces
- `src-tauri/Cargo.toml` — Rust dependencies
- `reference/context-forge-prototype.html` — HTML prototype archived

**Next session:**
1. Live test proxy with real API call
2. Continue Phase 0 UI components (Zone, ContextBlock)

---

### 2026-02-04: Proxy Spike Complete

**Completed:**
- ✅ Proxy module created (`src-tauri/src/proxy/`)
- ✅ SSE streaming passthrough for real-time responses
- ✅ Upstream routing (detects Anthropic vs OpenAI by headers/path)
- ✅ Request/response logging with sensitive header redaction
- ✅ Unit tests passing (3/3)
- ✅ Clippy clean

**Key files:**
- `src-tauri/src/proxy/mod.rs` — Main proxy with axum router
- `src-tauri/src/proxy/error.rs` — ProxyError types
- `src-tauri/src/lib.rs` — Updated to spawn proxy on startup
- `tests/test_proxy.sh` — Manual test script

**Architecture validated:**
- Proxy starts on port 5400 in background thread
- Forwards requests to upstream (Anthropic/OpenAI) based on headers
- Streams SSE responses back to client
- Logs all requests/responses for debugging

---

### 2026-02-04: Dev Environment Setup Complete

**Completed:**
- ✅ MCPs installed: rust-tools, crates (+ existing svelte, pal, context7, openrouter)
- ✅ Project skill created: `.claude/skills/aperture-ui.md` (combined frontend-design + Aperture aesthetic)
- ✅ Project CLAUDE.md created
- ✅ Fish function installed: `aperture claude` wrapper
- ✅ .env setup with dotenvy for config loading
- ✅ SSE streaming validated with real API call

**Dev environment ready:**
- `aperture claude` — Launch Claude Code through proxy
- `aperture status` — Check proxy health
- `make check` — Quality checks before phase completion

**Next session:**
1. ~~Create phase files for all 13 phases (0-12)~~ ✅ Done
2. Review and refine each phase doc
3. Resolve any ambiguities or missing acceptance criteria
4. Then begin Phase 0 coding sprint

---

### 2026-02-04: Phase Documentation Complete

**Completed:**
- ✅ Created detailed phase docs for all 13 phases (phase-0.md through phase-12.md)
- ✅ Each phase includes: context from previous phase, deliverables, implementation steps, test coverage, success criteria
- ✅ Total estimated scope: ~650k context across all phases
- ✅ Updated RESUME.md with full phase table

**Phase overview:**
| Phase | Estimated Context | Unit Tests | Integration Tests |
|-------|------------------|------------|-------------------|
| 0 | ~60-80k | TBD | TBD |
| 1 | ~50k | 25+ | 8+ |
| 2 | ~55k | 40+ | 10+ |
| 3 | ~55k | 35+ | 8+ |
| 4 | ~50k | 30+ | 6+ |
| 5 | ~50k | 30+ | 6+ |
| 6 | ~55k | 30+ | 8+ |
| 7 | ~55k | 35+ | 8+ |
| 8 | ~50k | 30+ | 6+ |
| 9 | ~55k | 35+ | 6+ |
| 10 | ~50k | 30+ | 6+ |
| 11 | ~55k | 35+ | 8+ |
| 12 | ~50k | 30+ | 6+ |

**Review completed. Ready for implementation.**

---

### 2026-02-04: Phase Documentation Review Complete

**Completed:**
- ✅ Feature coverage review — all APERTURE.md features assigned to phases
- ✅ Technical consistency review — paths, imports, module conventions clarified
- ✅ Repo readiness review — build environment verified, configs fixed
- ✅ ESLint config created (`eslint.config.js`)
- ✅ Prettier config created (`.prettierrc`)
- ✅ Makefile updated (npm instead of pnpm)
- ✅ `make check` passes (lint + typecheck + test)

**Key refinements made:**
- Phase 2: Added basic block versioning, dependency tracking, budget alerts (moved from Phase 7/9/11)
- Phase 0: Context estimate adjusted (60-80k → 40-50k)
- Phase 1: Context estimate adjusted (50k → 60-70k), hot patch mode detailed
- CODE_STANDARDS.md: Module organization and test structure clarified
- Block type clarified: Canonical definition in `engine::block.rs`, re-exported elsewhere

**Issues identified and deferred:**
- Provider adapters beyond Anthropic/OpenAI (post-Phase 12, community-driven)
- Timeline/replay complexity in Phase 9 (document core vs enhancement if time-constrained)
- Multi-agent sharing (correctly deferred to Phase 12)

**Sprint readiness: ✅ READY**
