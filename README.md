# Aperture

> Universal LLM context visualization, management, and control proxy.

**Status:** Active development (post-audit hardening + Phase 1 foundation work in progress)

## What It Is

Aperture runs as a local proxy between AI coding tools (Claude Code, Codex, etc.) and provider APIs. It provides real-time context visibility, block-level manipulation, snapshot branching, and a path toward policy-driven context management.

## Tech Stack

- **App Shell:** Tauri v2
- **Frontend:** Svelte 5 + SvelteKit
- **Backend/Proxy:** Rust (axum)
- **Testing/Checks:** Vitest + ESLint + svelte-check + cargo clippy/test

## Development Commands

```bash
# Install dependencies
make install

# Start development server
make dev

# Build for production
make build

# Run full quality gate (lint + typecheck + tests)
make check

# Run tests only
make test
```

## Documentation

- `docs/ARCHITECTURE.md` — System architecture
- `docs/INTEGRATION.md` — Frontend/backend integration and IPC contracts
- `docs/SECURITY_BASELINE.md` — Security constraints and hardening baseline
- `dev/active/audit-2026-02-08/` — Latest audit execution docs and reports
- `docs/archive/APERTURE-brainstorm.md` — Original brainstorming/design doc (archived)

## License

MIT
