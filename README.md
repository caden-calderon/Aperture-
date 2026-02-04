# Aperture

> Universal LLM context visualization, management, and control proxy.

**Status:** Phase 0 - UI Foundation

## Overview

Aperture sits between AI coding tools (Claude Code, Codex, etc.) and their APIs, providing full visibility and control over your context window. See what's eating your tokens, surgically manage what stays and what goes, and define policies for automatic context management.

## Tech Stack

- **App Shell:** Tauri v2
- **Frontend:** Svelte 5 + SvelteKit
- **Backend/Proxy:** Rust (axum)
- **Styling:** Tailwind CSS + custom halftone/dithering effects

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run tauri dev

# Build for production
npm run tauri build

# Run quality checks
make check
```

## Documentation

- `APERTURE.md` — Full design document
- `docs/ARCHITECTURE.md` — System architecture
- `.context/RESUME.md` — Project state and phase tracking
- `.context/phases/` — Phase-specific documentation

## License

MIT
