# Phase 2: Context Engine

**Status**: PENDING
**Goal**: Core engine for block management, zones, token counting, and context classification
**Prerequisites**: Phase 1 complete
**Estimated Scope**: ~55k context

---

## Context from Phase 1

Phase 1 delivers:
- Proxy that intercepts and forwards API calls
- Request/response parsing into universal Block format
- WebSocket event system for real-time UI updates
- Provider auto-detection (Anthropic vs OpenAI)
- Pause/hold mode for request inspection

**Key imports:**
```rust
use crate::proxy::parser::{parse_anthropic, parse_openai, Block};
use crate::events::{EventDispatcher, ContextEvent};
```

**Integration point:** Phase 2 builds the engine that processes parsed blocks.

---

## Problem Statement

1. **No zone management** — Blocks parsed but not assigned to primacy/middle/recency
2. **No accurate token counting** — Need tiktoken integration per model
3. **No staleness tracking** — Can't identify old/unused blocks
4. **No sorting pipeline** — No automatic classification based on content/age
5. **No session management** — Can't track multiple concurrent sessions

---

## Deliverables

### 1. Block Management System

Create `src-tauri/src/engine/`:
- In-memory block storage with efficient lookup
- CRUD operations for blocks
- Batch operations (select multiple, compress multiple)
- Block versioning (track edits)

### 2. Zone System

Implement the three-zone model:
- **Primacy** — System prompts, pinned critical content
- **Middle** — Default zone, conversation history
- **Recency** — Last N turns, latest tool outputs

Auto-assignment rules:
- System role → primacy
- Last 5 turns → recency
- Everything else → middle
- Manual pinning overrides auto-assignment

### 3. Token Counting

Accurate per-model token counting:
- Integrate tiktoken-rs for OpenAI models
- Handle Anthropic tokenization (claude-3 tokenizer)
- Cache token counts per block
- Update UI token displays in real-time

### 4. Staleness Scoring

Track block freshness:
```
staleness = (turns_since_created × token_cost) / relevance_boost
```

- `turns_since_created` — How old is this block
- `token_cost` — Higher cost = more pressure to remove
- `relevance_boost` — References from later blocks reduce staleness

### 5. Context Sorting Pipeline

Fast classification pipeline (microseconds, not milliseconds):

**Pass 1 — Role-based (instant):**
- System prompts → primacy
- Last N turns → recency
- Everything else → middle

**Pass 2 — Content heuristics (fast):**
- Error/traceback → boost toward recency
- Old file reads → demote in middle
- Correction patterns ("actually", "wait") → flag preceding block

**Pass 3 — Budget-aware ranking:**
- Approaching limit → rank middle zone by staleness
- Flag worst offenders for compression/removal

### 6. Session Management

Track multiple concurrent sessions:
- Session ID per active tool connection
- Separate block stores per session
- Session metadata (provider, start time, token budget)
- Session switching in UI

---

## Key Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src-tauri/src/engine/mod.rs` | **NEW** | Engine module root |
| `src-tauri/src/engine/block.rs` | **NEW** | Block struct + operations |
| `src-tauri/src/engine/store.rs` | **NEW** | In-memory block storage |
| `src-tauri/src/engine/zone.rs` | **NEW** | Zone management |
| `src-tauri/src/engine/tokens.rs` | **NEW** | Token counting |
| `src-tauri/src/engine/staleness.rs` | **NEW** | Staleness scoring |
| `src-tauri/src/engine/pipeline.rs` | **NEW** | Sorting/classification |
| `src-tauri/src/engine/session.rs` | **NEW** | Session management |
| `src-tauri/src/commands.rs` | Modify | Add engine IPC commands |
| `src/lib/stores/context.ts` | Modify | Use real engine data |

---

## Implementation Steps

### Step 1: Block & Store (~15k context)

1. Define complete Block struct with all fields
2. Implement BlockStore with HashMap-based storage
3. CRUD operations with proper event emission
4. Batch operations (get_many, update_many)
5. Unit tests for store operations

### Step 2: Zone System (~12k context)

1. Define Zone enum and ZoneConfig
2. Implement zone assignment logic
3. Implement pinning (primacy_top, primacy_bottom, recency_top, recency_bottom)
4. Implement zone reordering
5. Unit tests for zone assignment

### Step 3: Token Counting (~10k context)

1. Integrate tiktoken-rs
2. Create model-aware tokenizer selection
3. Cache token counts in blocks
4. Add token recalculation on content change
5. Unit tests for various models

### Step 4: Staleness & Pipeline (~10k context)

1. Implement staleness scoring algorithm
2. Implement three-pass classification pipeline
3. Add content heuristics (error detection, correction patterns)
4. Performance optimization (target <100μs per classification)
5. Unit tests for pipeline stages

### Step 5: Session Management (~8k context)

1. Define Session struct
2. Implement session store (multiple concurrent sessions)
3. Add session switching logic
4. Integrate with proxy (create session on first request)
5. UI integration for session picker

---

## Test Coverage

### Unit Tests (~40 tests)

| File | Tests | Focus |
|------|-------|-------|
| `src-tauri/src/engine/block.rs` | 8 | Block creation, modification |
| `src-tauri/src/engine/store.rs` | 10 | Store CRUD, batch ops |
| `src-tauri/src/engine/zone.rs` | 8 | Zone assignment, pinning |
| `src-tauri/src/engine/tokens.rs` | 6 | Token counting accuracy |
| `src-tauri/src/engine/staleness.rs` | 4 | Staleness calculation |
| `src-tauri/src/engine/pipeline.rs` | 4 | Pipeline classification |

### Integration Tests (~10 tests)

| File | Tests | Focus |
|------|-------|-------|
| `tests/integration/test_engine_flow.rs` | 6 | Parse → store → classify flow |
| `tests/integration/test_session.rs` | 4 | Multi-session handling |

### Manual Tests (6 tests)

| Test | Description |
|------|-------------|
| `test_zone_display` | Verify blocks appear in correct zones in UI |
| `test_token_accuracy` | Compare token counts with official API |
| `test_staleness_visual` | Verify stale blocks visually dim |
| `test_multi_session` | Switch between sessions, verify state |
| `test_pinning` | Pin block to zone, verify it stays |
| `test_large_context` | Load 100+ blocks, verify performance |

---

## Success Criteria

- [ ] Blocks stored and retrievable by ID
- [ ] Zones auto-assigned based on role and position
- [ ] Manual pinning works and overrides auto-assignment
- [ ] Token counts accurate within 2% of official API
- [ ] Staleness scores calculated and displayed
- [ ] Classification pipeline runs in <100μs
- [ ] Multiple sessions tracked concurrently
- [ ] Session switching works in UI
- [ ] `make check` passes
- [ ] 40+ unit tests passing
- [ ] 10+ integration tests passing
- [ ] All manual tests documented and passing

---

## Key Imports for Next Phase

```rust
use crate::engine::{Engine, Block, BlockStore, Zone, Session};
use crate::engine::tokens::count_tokens;
use crate::engine::pipeline::classify_blocks;
use crate::engine::staleness::calculate_staleness;
```
