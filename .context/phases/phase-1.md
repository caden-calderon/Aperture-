# Phase 1: Proxy Core

**Status**: PENDING
**Goal**: HTTP proxy that intercepts API calls, streams responses, and updates UI in real-time
**Prerequisites**: Phase 0 complete
**Estimated Scope**: ~50k context

---

## Context from Phase 0

Phase 0 delivers the complete visual UI with mock data:
- Tauri v2 + Svelte 5 app shell
- All core components (TokenBudgetBar, Zone, ContextBlock, Sidebar, Toolbar)
- Selection, drag-drop, keyboard shortcuts working
- Canvas effects layer (halftone, dissolution, materialization)
- Mock data system

**Proxy spike already exists** (`src-tauri/src/proxy/`):
- Basic axum server on port 5400
- SSE streaming passthrough
- Request/response logging
- Unit tests passing

**Key imports:**
```rust
use crate::proxy::{ProxyServer, ProxyError};
```

**Integration point:** Phase 1 extends the proxy spike to connect with the UI.

---

## Problem Statement

1. **No live data flow** — UI shows mock data, not real API traffic
2. **No request capture** — Proxy forwards but doesn't extract context for engine
3. **No UI updates** — No WebSocket/IPC to push state changes to frontend
4. **No provider detection** — Need to auto-detect Anthropic vs OpenAI from requests
5. **No pause/hold** — Can't intercept requests for inspection before forwarding

---

## Deliverables

### 1. Enhanced Proxy Server

Extend `src-tauri/src/proxy/` to:
- Capture full request/response message arrays
- Emit structured events for engine consumption
- Support pause/hold mode for request inspection
- Handle all Anthropic API endpoints (`/v1/messages`, `/v1/complete`)
- Handle OpenAI-compatible endpoints (`/v1/chat/completions`)

### 2. Request/Response Parsing

Create `src-tauri/src/proxy/parser.rs`:
- Parse Anthropic message format into blocks
- Parse OpenAI message format into blocks
- Normalize both into universal Block format
- Handle tool_use and tool_result blocks
- Extract token counts from responses

### 3. WebSocket Event System

Create `src-tauri/src/events/`:
- WebSocket server for real-time UI updates
- Event types: `blocks_updated`, `request_captured`, `response_streaming`, `response_complete`
- Tauri IPC bridge to frontend stores

### 4. Frontend Integration

Update Svelte stores:
- `src/lib/stores/context.ts` — Subscribe to WebSocket events
- Replace mock data with live data from proxy
- Show real-time streaming indicator during responses
- Handle connection state (connected/disconnected/reconnecting)

### 5. Provider Auto-Detection

Detect provider from request characteristics:
- `x-api-key` header → Anthropic
- `Authorization: Bearer` → OpenAI
- Path patterns (`/v1/messages` vs `/v1/chat/completions`)
- Store detected provider per session

---

## Key Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src-tauri/src/proxy/parser.rs` | **NEW** | Message array → Block parsing |
| `src-tauri/src/proxy/capture.rs` | **NEW** | Request/response capture logic |
| `src-tauri/src/events/mod.rs` | **NEW** | Event system module |
| `src-tauri/src/events/websocket.rs` | **NEW** | WebSocket server |
| `src-tauri/src/events/types.rs` | **NEW** | Event type definitions |
| `src-tauri/src/proxy/mod.rs` | Modify | Integrate capture + events |
| `src/lib/stores/context.ts` | Modify | WebSocket subscription |
| `src/lib/stores/connection.ts` | **NEW** | Connection state management |

---

## Implementation Steps

### Step 1: Request/Response Parsing (~15k context)

1. Define `ParsedRequest` and `ParsedResponse` types
2. Implement Anthropic message parser
3. Implement OpenAI message parser
4. Implement normalization to universal Block format
5. Unit tests for both parsers

### Step 2: Capture System (~10k context)

1. Create capture middleware for axum
2. Extract message arrays from requests
3. Extract content + tokens from responses
4. Handle SSE streaming (accumulate chunks for parsing)
5. Unit tests for capture

### Step 3: Event System (~15k context)

1. Set up WebSocket server alongside HTTP proxy
2. Define event types with serde serialization
3. Create event dispatcher (broadcasts to all connected clients)
4. Integrate with Tauri IPC
5. Unit tests for event serialization

### Step 4: Frontend Integration (~10k context)

1. Create WebSocket client in Svelte
2. Update context store to receive live events
3. Add connection status indicator to UI
4. Handle reconnection logic
5. Test with real API call through proxy

---

## Test Coverage

### Unit Tests (~25 tests)

| File | Tests | Focus |
|------|-------|-------|
| `src-tauri/src/proxy/parser.rs` | 10 | Message parsing edge cases |
| `src-tauri/src/proxy/capture.rs` | 8 | Request/response capture |
| `src-tauri/src/events/types.rs` | 4 | Event serialization |
| `src-tauri/src/events/websocket.rs` | 3 | WebSocket basics |

### Integration Tests (~8 tests)

| File | Tests | Focus |
|------|-------|-------|
| `tests/integration/test_proxy_flow.rs` | 5 | Full request → parse → event flow |
| `tests/integration/test_websocket.rs` | 3 | WebSocket connection + events |

### Manual Tests (6 tests)

| Test | Description |
|------|-------------|
| `test_anthropic_passthrough` | Real Claude API call through proxy |
| `test_openai_passthrough` | Real OpenAI API call through proxy |
| `test_sse_streaming` | Verify streaming responses display in UI |
| `test_ui_live_update` | Verify UI updates when request captured |
| `test_reconnection` | Disconnect/reconnect WebSocket, verify state |
| `test_pause_mode` | Enable pause, verify request held until released |

---

## Success Criteria

- [ ] Proxy intercepts and forwards Anthropic API calls
- [ ] Proxy intercepts and forwards OpenAI-compatible API calls
- [ ] Message arrays parsed into universal Block format
- [ ] UI receives real-time updates via WebSocket
- [ ] Streaming responses show progress indicator
- [ ] Connection status visible in UI
- [ ] Pause mode holds request until manual release
- [ ] Provider auto-detected from request headers
- [ ] `make check` passes
- [ ] 25+ unit tests passing
- [ ] 8+ integration tests passing
- [ ] All manual tests documented and passing

---

## Key Imports for Next Phase

```rust
use crate::proxy::{ProxyServer, ProxyConfig, CapturedRequest, CapturedResponse};
use crate::proxy::parser::{parse_anthropic, parse_openai, Block};
use crate::events::{EventDispatcher, ContextEvent};
```

```typescript
import { contextStore, connectionStore } from '$lib/stores';
import type { Block, ContextEvent } from '$lib/types';
```
