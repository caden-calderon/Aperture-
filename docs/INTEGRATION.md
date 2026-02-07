# Aperture Integration Reference

Backend-to-frontend data flow, IPC commands, events, module inventory,
and the localStorage-to-SQLite migration strategy.

---

## 1. Data Flow Diagram

```
                       ┌─────────────────────────────────────────────────┐
                       │                  Tauri Process                   │
                       │                                                 │
 ┌──────────┐  HTTP    │  ┌──────────────┐        ┌───────────────────┐  │
 │  Client   ├────────►│  │ Proxy (axum) │        │  Context Engine   │  │
 │  Tool     │  :5400  │  │  handler.rs  ├───────►│  engine/block.rs  │  │
 │           │◄────────┤  │              │ parse   │  engine/types.rs  │  │
 │ Claude    │  SSE /  │  │  Upstream    │ blocks  │                   │  │
 │ Codex     │  JSON   │  │  Detection:  │         └────────┬──────────┘  │
 │ OpenCode  │         │  │  • x-api-key │                  │             │
 └──────────┘         │  │  • Bearer sk- │           emit() │             │
                       │  │  • path-based│                  ▼             │
                       │  └──────┬───────┘         ┌───────────────────┐  │
                       │         │ reqwest          │  Tauri Events     │  │
                       │         ▼                  │  events/types.rs  │  │
                       │  ┌──────────────┐         │                   │  │
                       │  │ Upstream API │         │ aperture:events   │  │
                       │  │              │         │ aperture:stream-  │  │
                       │  │ Anthropic    │         │   progress        │  │
                       │  │ OpenAI       │         │ terminal:output   │  │
                       │  └──────────────┘         │ terminal:exit     │  │
                       │                           └────────┬──────────┘  │
                       └────────────────────────────────────┼─────────────┘
                                                            │
                                          Tauri listen()    │
                                                            ▼
                                               ┌────────────────────────┐
                                               │   Svelte 5 Frontend    │
                                               │                        │
                                               │  stores/ ($state)      │
                                               │  ├─ context.svelte.ts  │
                                               │  ├─ selection.svelte.ts│
                                               │  ├─ terminal.svelte.ts │
                                               │  └─ zones.svelte.ts    │
                                               │                        │
                                               │  Canvas: halftone/heat │
                                               │  DOM: blocks/zones     │
                                               │  xterm.js: terminal    │
                                               └────────────────────────┘
```

**Request lifecycle (Phase 1, when wired):**

1. Client tool sends HTTP request to `127.0.0.1:5400`
2. `proxy_handler` assigns a `request_id` (UUID v4), detects upstream (Anthropic/OpenAI)
3. `forward_request` streams the body to the upstream API via `reqwest`
4. Engine parses request/response into `Block` structs (Phase 2)
5. Events are emitted to the frontend over Tauri event channels
6. Svelte stores update reactively, driving the visualization

---

## 2. Tauri IPC Command Reference

All commands are registered in `src-tauri/src/lib.rs` via `generate_handler![]`.

| Command | Module | Parameters | Return | Called By |
|---------|--------|------------|--------|-----------|
| `get_proxy_address` | `lib.rs` | — | `String` (`"http://127.0.0.1:5400"`) | Frontend status bar, connection display |
| `is_proxy_running` | `lib.rs` | — | `bool` (TCP connect check, 500ms timeout) | Frontend health polling |
| `spawn_shell` | `terminal/mod.rs` | `cols?: u16`, `rows?: u16` | `Result<String, TerminalError>` — session UUID | `Terminal.svelte` on mount / reconnect |
| `send_input` | `terminal/mod.rs` | `session_id: String`, `data: String` | `Result<(), TerminalError>` | `Terminal.svelte` xterm.js `onData` handler |
| `resize_terminal` | `terminal/mod.rs` | `session_id: String`, `cols: u16`, `rows: u16` | `Result<(), TerminalError>` | `Terminal.svelte` `ResizeObserver` / `FitAddon` |
| `kill_session` | `terminal/mod.rs` | `session_id: String` | `Result<(), TerminalError>` | `Terminal.svelte` on unmount / `beforeunload` |

**Notes:**
- `spawn_shell` detects the user's shell from `$SHELL` (falls back to `/bin/sh`), sets `TERM=xterm-256color`, and inherits `$HOME`.
- `resize_terminal` validates dimensions are in the range 1–500 for both cols and rows.
- Terminal errors are serialized as plain strings for the IPC boundary (`TerminalError` implements `serde::Serialize` as a string).

---

## 3. Tauri Events Reference (Active)

These events are emitted **now** by the terminal subsystem.

| Event | Direction | Payload | Emitted From | Consumed By |
|-------|-----------|---------|--------------|-------------|
| `terminal:output` | Rust → Frontend | `(sessionId: string, data: string)` | `terminal/session.rs` — PTY reader thread | `Terminal.svelte` → `xterm.write()` |
| `terminal:exit` | Rust → Frontend | `sessionId: string` | `terminal/session.rs` — on EOF or read error | `Terminal.svelte` → shows "exited" state, reconnect on Enter |

**Emission details:**
- `terminal:output` fires on every PTY read (up to 4096 bytes per chunk). The payload is a 2-tuple `(&session_id, &text)` emitted via `app.emit()`.
- `terminal:exit` fires once when the PTY reader encounters EOF (shell exited) or an I/O error. Payload is the bare session ID string.

---

## 4. Planned Events (Phase 1)

Defined in `src-tauri/src/events/types.rs` but **not yet emitted**. The `ApertureEvent` enum is tagged with `#[serde(tag = "type", rename_all = "snake_case")]`.

### Channel: `aperture:events`

| Event Variant | Fields | Purpose |
|---------------|--------|---------|
| `request_captured` | `request_id`, `method`, `path`, `provider` | New API request intercepted by the proxy |
| `response_complete` | `request_id`, `status`, `tokens_used?` | Response fully received and processed |
| `context_updated` | `block_count`, `total_tokens` | Engine updated the block model (add/modify/remove) |
| `proxy_error` | `request_id?`, `message` | Error during proxy forwarding |

### Channel: `aperture:stream-progress`

| Event Variant | Fields | Purpose |
|---------------|--------|---------|
| `response_streaming` | `request_id`, `bytes_received` | High-frequency SSE progress updates (separated to avoid flooding the main channel) |

**Wiring plan:** The proxy handler will call `app_handle.emit("aperture:events", event)` after parsing each request/response. Streaming updates go to the dedicated `aperture:stream-progress` channel to keep the main event bus low-frequency.

---

## 5. Backend Module Map

All modules live under `src-tauri/src/`.

| Module | Files | Status | Purpose |
|--------|-------|--------|---------|
| `proxy/` | `mod.rs`, `handler.rs`, `error.rs` | **Active** | Transparent HTTP proxy. Binds port 5400, detects upstream (Anthropic/OpenAI) by headers/path, forwards requests via `reqwest`, streams SSE responses back. |
| `terminal/` | `mod.rs`, `session.rs`, `error.rs` | **Active** | PTY-backed embedded terminal. Manages shell sessions (spawn, write, resize, kill) with Tauri IPC. Reader thread emits output/exit events. |
| `engine/` | `mod.rs`, `block.rs`, `types.rs` | **Skeleton** (Phase 0.5) | Context engine data model. Defines `Block`, `Role`, `Zone`, `CompressionLevel`, `PinPosition`, and compression version structs. No processing logic yet. |
| `events/` | `mod.rs`, `types.rs` | **Skeleton** (Phase 0.5) | Event type definitions. `ApertureEvent` enum and channel name constants. Not yet wired to emit from the proxy or engine. |
| `lib.rs` | — | **Active** | App entry point. Loads `.env`, initializes logging (`tracing`), spawns proxy on a background thread with its own tokio runtime, registers Tauri commands, starts the Tauri app. |

**Dependency highlights:**
- Proxy uses `axum` (routing, handlers) + `reqwest` (upstream HTTP) + `tokio` (async runtime)
- Terminal uses `portable-pty` (cross-platform PTY) + `uuid` (session IDs)
- Error types use `thiserror` for domain errors
- All serializable types use `serde` with `rename_all = "snake_case"`

---

## 6. localStorage → Backend Migration Strategy

### Current State (Phase 0–1): localStorage Only

All persistent frontend state lives in `localStorage` with debounced writes:

| Key | Data | Debounce |
|-----|------|----------|
| `aperture-context` | Blocks, snapshots, activeSnapshotId, workingStateCache | 1500ms |
| `aperture-custom-zones` | Zone config, heights, expand states, token history | 1500ms |
| `aperture-edit-history` | Per-block edit entries (max 50 per block) | 1500ms |
| `aperture-theme` | Theme preset + custom colors | immediate |
| `aperture-sidebar-width` | Sidebar width in px | immediate |
| `aperture-density` | UI density scale | immediate |
| `aperture-terminal-*` | Terminal height, width, visible, position | immediate |
| `aperture-custom-block-types` | Custom block type definitions | 1500ms |

**Safety net:** `flushPendingWrites()` is called on `beforeunload` to ensure debounced data is not lost when the window closes.

### Phase 2 Target: SQLite for Structured Data

```
┌─────────────────────────────────────┐
│            Frontend                  │
│                                     │
│  UI preferences ──► localStorage    │  (theme, density, sidebar, terminal)
│                                     │
│  Blocks/sessions ──► Tauri IPC ─────┼──► SQLite (via engine)
│  Edit history    ──► Tauri IPC ─────┼──► SQLite
│  Snapshots       ──► Tauri IPC ─────┼──► SQLite
└─────────────────────────────────────┘
```

**Migration principles:**

1. **UI preferences stay in localStorage.** They are small, frequently accessed, and frontend-only. No reason to round-trip through IPC.
2. **Structured data moves to SQLite.** Blocks, snapshots, edit history, and zone state become authoritative in the backend. The frontend reads via Tauri commands and receives updates via events.
3. **The 1500ms debounce pattern is a stepping stone.** It already batches writes and tolerates losing the most recent 1.5s of changes on crash. SQLite replaces this with proper transactions, but the batching discipline carries over — the frontend will still debounce IPC calls to avoid flooding the command channel.
4. **`flushPendingWrites()` on `beforeunload` translates directly** to a final IPC sync call before window close. The pattern is preserved; only the storage target changes.
5. **Migration path:** On first launch after upgrade, a one-time migration reads existing localStorage keys, writes them to SQLite via Tauri commands, then deletes the migrated keys. UI preference keys are left in place.
