# Aperture Architecture

> Universal LLM context visualization, management, and control proxy.

---

## High-Level Overview

```
AI Coding Tool (Claude Code, Codex, etc.)
         │
         │  ANTHROPIC_BASE_URL / OPENAI_API_BASE
         │  pointed at localhost:5400
         ▼
┌──────────────────────────────────┐
│        Aperture Proxy            │
│                                  │
│  ┌────────────────────────────┐  │
│  │    Context Pipeline        │  │
│  │                            │  │
│  │  1. Ingest                 │  │
│  │  2. Parse to blocks        │  │
│  │  3. Zone assignment        │  │
│  │  4. Staged injection       │  │
│  │  5. Auto-condensation      │  │
│  │  6. Budget enforcement     │  │
│  │  7. Reorder by zone        │  │
│  │  8. Emit                   │  │
│  └────────────────────────────┘  │
│                                  │
│  Modified request ──────────────►│──► Actual API
│                                  │
│  Response captured + forwarded   │──► Back to tool
└──────────────────────────────────┘
         │
         │  IPC / WebSocket
         ▼
┌──────────────────────────────────┐
│      Tauri Window (UI)           │
│                                  │
│  Live block visualization        │
│  Zone management                 │
│  Pipeline config                 │
│  Snapshots / Presets             │
└──────────────────────────────────┘
```

---

## Three Layers

### 1. Proxy Core (Rust / axum)

The HTTP proxy that intercepts all API traffic.

**Responsibilities:**
- Listen on localhost:5400
- Intercept requests from coding tools
- Forward to real API (Anthropic, OpenAI, etc.)
- Handle SSE streaming responses (tee to UI + client)
- Capture full request/response for engine

**Critical path:** Must be fast. Target <5ms overhead for non-LLM operations.

**Key modules:**
- `proxy/server.rs` — axum HTTP server
- `proxy/handlers.rs` — Route handlers
- `proxy/streaming.rs` — SSE stream handling
- `proxy/client.rs` — Upstream API client

### 2. Context Engine (Rust)

The brain that manages context state.

**Responsibilities:**
- Parse messages into universal Block format
- Assign blocks to zones (primacy/middle/recency)
- Track token counts per block
- Apply rules (auto-condensation, budget enforcement)
- Manage snapshots and presets
- Coordinate with cleaner model sidecar

**Key modules:**
- `engine/block.rs` — Block data structure
- `engine/zone.rs` — Zone management
- `engine/pipeline.rs` — Processing pipeline
- `engine/rules.rs` — Rule engine
- `engine/snapshots.rs` — Snapshot management

### 3. UI Layer (Svelte 5 / Tauri)

The visual interface.

**Responsibilities:**
- Real-time block visualization
- Drag-and-drop zone management
- Selection and bulk operations
- Pipeline configuration UI
- Canvas effects (halftone, dithering)

**Key directories:**
- `src/lib/components/` — Svelte components
- `src/lib/stores/` — State management
- `src/lib/canvas/` — WebGL/Canvas effects

---

## Data Flow

### Request Flow

```
1. Claude Code sends request to localhost:5400
2. Proxy receives, parses message array
3. Engine processes through pipeline:
   - Parse → Blocks
   - Assign zones
   - Inject staged content
   - Apply auto-rules
   - Enforce budget
   - Reorder
4. Modified request sent to real API
5. Response streams back through proxy
6. UI updated via WebSocket
```

### UI Update Flow

```
1. Engine state changes (new block, selection, etc.)
2. Engine emits event via channel
3. Tauri IPC forwards to frontend
4. Svelte stores update
5. Components re-render
```

---

## Universal Block Format

```rust
pub struct Block {
    pub id: String,
    pub role: Role,                    // system | user | assistant | tool_use | tool_result
    pub content: String,
    pub tokens: usize,
    pub timestamp: DateTime<Utc>,
    pub zone: Zone,                    // primacy | middle | recency
    pub pinned: Option<PinPosition>,   // top | bottom

    // Compression (non-destructive)
    pub compression_level: CompressionLevel,
    pub compressed_versions: CompressionVersions,

    // Heat & Attention
    pub usage_heat: f32,               // 0.0-1.0
    pub position_relevance: f32,       // 0.0-1.0
    pub last_referenced_turn: usize,
    pub reference_count: usize,

    // Clustering
    pub topic_cluster: Option<String>,
    pub topic_keywords: Vec<String>,

    // Metadata
    pub metadata: BlockMetadata,
}
```

---

## Provider Adapters

Each AI tool gets an adapter:

```rust
pub trait ProviderAdapter {
    fn name(&self) -> &str;
    fn detect_sessions(&self) -> Vec<Session>;
    fn parse_context(&self, session: &Session) -> Vec<Block>;
    fn watch(&self, session: &Session) -> Receiver<ContextEvent>;
    fn write_back(&self, session: &Session, blocks: &[Block]) -> Result<()>;
    fn api_base_url(&self) -> &str;
    fn transform_request(&self, req: ApiRequest) -> ApiRequest;
    fn transform_response(&self, res: ApiResponse) -> ApiResponse;
}
```

**Initial targets:**
- Claude Code (`~/.claude/projects/` JSONL)
- OpenAI-compatible (generic)

---

## Cleaner Model Sidecar

Background worker for LLM-powered tasks.

```
Aperture Engine
       │
       ├──► Proxy (fast path, zero model calls)
       │
       └──► Cleaner Sidecar (async background)
            │
            ├── Task Queue (priority-ordered)
            ├── Model Backend (ollama / llama.cpp)
            ├── Results Cache
            └── Health Monitor
```

**Tasks:**
- Pre-compute compression levels
- Attention echo analysis
- Semantic deduplication detection
- Topic classification
- Checkpoint boundary detection

**Key principle:** Never blocks the proxy. Results available on next request.

---

## IPC Protocol

Tauri IPC for frontend ↔ backend communication.

### Commands (Frontend → Backend)

```typescript
// Invoke Rust functions
await invoke('get_blocks');
await invoke('select_block', { id: '...' });
await invoke('compress_blocks', { ids: ['...'], level: 'summarized' });
await invoke('save_snapshot', { name: '...' });
```

### Events (Backend → Frontend)

```typescript
// Listen for state changes
listen('blocks_updated', (event) => { ... });
listen('selection_changed', (event) => { ... });
listen('token_count_changed', (event) => { ... });
```

---

## File Structure

```
aperture/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs              # Tauri entry point
│   │   ├── lib.rs               # Library root
│   │   ├── proxy/               # HTTP proxy
│   │   │   ├── mod.rs
│   │   │   ├── server.rs
│   │   │   ├── handlers.rs
│   │   │   └── streaming.rs
│   │   ├── engine/              # Context engine
│   │   │   ├── mod.rs
│   │   │   ├── block.rs
│   │   │   ├── zone.rs
│   │   │   └── pipeline.rs
│   │   ├── adapters/            # Provider adapters
│   │   │   ├── mod.rs
│   │   │   ├── claude_code.rs
│   │   │   └── openai.rs
│   │   └── commands.rs          # Tauri IPC commands
│   └── Cargo.toml
│
├── src/                         # Svelte frontend
│   ├── lib/
│   │   ├── components/
│   │   ├── stores/
│   │   ├── canvas/
│   │   └── types.ts
│   └── routes/
│       └── +page.svelte
│
└── tests/
```

---

## Performance Targets

| Operation | Target |
|-----------|--------|
| Proxy overhead (non-LLM) | <5ms |
| Block parsing | <1ms per block |
| Zone assignment | <100μs |
| UI update | <16ms (60fps) |
| Canvas render | <8ms |

---

## Security Considerations

- API keys pass through proxy — never logged, never stored
- All data stays local — no telemetry, no cloud sync
- Proxy binds to localhost only by default
- Optional encryption for snapshot storage
