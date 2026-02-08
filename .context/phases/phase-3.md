# Phase 3: Dynamic Compression

**Status**: PENDING
**Goal**: Multi-level compression system with slider UI, preview, and async LLM integration
**Prerequisites**: Phase 2 complete
**Estimated Scope**: ~55k context

---

## Context from Phase 2

Phase 2 delivers:
- Context engine with block management
- Zone system (primacy/middle/recency) with auto-assignment
- Accurate token counting via tiktoken
- Staleness scoring for blocks
- Classification pipeline
- Multi-session management

**Key imports:**
```rust
use crate::engine::{Engine, Block, BlockStore, Zone};
use crate::engine::tokens::count_tokens;
use crate::engine::staleness::calculate_staleness;
```

**Integration point:** Phase 3 adds compression to blocks managed by the engine.

---

## Problem Statement

1. **No compression** — Blocks are all-or-nothing, no levels
2. **No preview** — Can't see what compression will produce before applying
3. **No LLM integration** — Need external model for summarization
4. **No async processing** — Compression shouldn't block the UI
5. **No preservation** — Need to keep original content always recoverable

---

## Deliverables

### 1. Compression Level System

Four compression levels per block:
- **Original** — Full verbatim content (always preserved)
- **Trimmed** — Boilerplate/noise removed, substance kept
- **Summarized** — Key points and findings only
- **Minimal** — One-line description

Each level pre-computed and stored:
```rust
pub struct CompressionVersions {
    pub original: CompressionVersion,    // Always present
    pub trimmed: Option<CompressionVersion>,
    pub summarized: Option<CompressionVersion>,
    pub minimal: Option<CompressionVersion>,
}

pub struct CompressionVersion {
    pub content: String,
    pub tokens: usize,
    pub generated_at: DateTime<Utc>,
    pub model: Option<String>,  // None for rule-based
}
```

### 2. Compression Generators

Two types of compression:
- **Rule-based** (fast, no LLM) — Trimmed level only
  - Remove markdown boilerplate
  - Remove repeated whitespace
  - Remove common noise patterns
- **LLM-based** (async) — Summarized and minimal levels
  - Configurable model (Haiku, local Ollama, etc.)
  - Batch processing for efficiency
  - Quality scoring (flag bad compressions)

### 3. Compression Slider UI

Per-block slider in `ContextBlock.svelte`:
- Horizontal slider with 4 detent stops
- Real-time visual compression as you drag
- Token count updates live
- Snap feel at each level
- Preview text at each position

Group compression:
- Select multiple blocks → slider affects all
- Topic cluster compression → one action, many blocks

### 4. Compression Preview Modal

Before batch compression:
```
These 8 blocks will be compressed:

Block #4 (config.py read)
  Original    847 tok  "The MarketStream class..."
  Trimmed     412 tok  "MarketStream connects..."
  Summarized   89 tok  "WebSocket client for..."
  Minimal      12 tok  "Market data module"

Block #7 (test output)
  Original   1,203 tok  "Running tests..."
  ...

Total savings: 4,200 tokens (62%)
[Cancel] [Apply]
```

### 5. Async Compression Pipeline

Background worker for LLM compression:
- Task queue with priority ordering
- Batch requests to LLM for efficiency
- Results cached and available for next request
- Status indicator in UI ("3 blocks compressing...")
- Never blocks proxy or UI

This phase establishes the compression queue contract and local execution path.
Phase 7 upgrades execution with a dedicated sidecar runtime and tiered model routing.

### 6. Preserve-Keys System

Always keep certain content verbatim:
- Error messages
- File paths
- Line numbers
- Stack traces
- User-specified keywords

Configured per project or globally.

### 7. Compression Quality Metrics

Quality scoring to flag potentially bad compressions (will evolve over time):

**Initial heuristics:**
- Token ratio check (warn if >15:1 compression)
- Key phrase preservation (check if important terms survive)
- Structural integrity (code blocks, lists preserved)

**LLM-assisted (via cleaner model in Phase 7):**
- Self-evaluation prompt: "Does this summary preserve the key information?"
- Confidence scoring

**User-configurable:**
- Threshold sliders for each metric
- Per-project quality profiles
- "Flag for review" vs "auto-reject" behavior

**Note:** This is a foundation. Quality metrics will be refined based on real-world usage and user feedback.

---

## Key Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src-tauri/src/engine/compression.rs` | **NEW** | Compression system |
| `src-tauri/src/engine/compression/rules.rs` | **NEW** | Rule-based trimming |
| `src-tauri/src/engine/compression/llm.rs` | **NEW** | LLM compression |
| `src-tauri/src/engine/compression/queue.rs` | **NEW** | Async task queue |
| `src-tauri/src/engine/compression/preserve.rs` | **NEW** | Preserve-keys logic |
| `src/lib/components/CompressionSlider.svelte` | **NEW** | Slider component |
| `src/lib/components/CompressionPreview.svelte` | **NEW** | Preview modal |
| `src/lib/components/ContextBlock.svelte` | Modify | Add slider |
| `src-tauri/src/engine/block.rs` | Modify | Add compression fields |

---

## Implementation Steps

### Step 1: Compression Data Model (~10k context)

1. Define `CompressionLevel` enum
2. Define `CompressionVersions` struct
3. Add compression fields to Block
4. Implement level switching logic
5. Unit tests for data model

### Step 2: Rule-Based Compression (~12k context)

1. Implement trimming rules (whitespace, boilerplate)
2. Implement preserve-keys detection
3. Add configurable rule sets
4. Benchmark performance (target <1ms per block)
5. Unit tests for rule application

### Step 3: LLM Compression (~15k context)

1. Create LLM client abstraction used by compression
2. Implement summarization prompts
3. Implement minimal description prompts
4. Add quality scoring (reject bad compressions)
5. Unit tests with mocked LLM

### Step 4: Async Queue (~10k context)

1. Create task queue with priority
2. Implement batch processing
3. Add progress tracking
4. Integrate with UI status indicator
5. Unit tests for queue operations

### Step 5: UI Components (~8k context)

1. Build CompressionSlider component
2. Build CompressionPreview modal
3. Integrate slider into ContextBlock
4. Add group compression support
5. Add visual feedback (block shrinks, dithers)

---

## Test Coverage

### Unit Tests (~35 tests)

| File | Tests | Focus |
|------|-------|-------|
| `src-tauri/src/engine/compression.rs` | 8 | Level switching, storage |
| `src-tauri/src/engine/compression/rules.rs` | 10 | Rule application |
| `src-tauri/src/engine/compression/llm.rs` | 8 | LLM integration |
| `src-tauri/src/engine/compression/queue.rs` | 6 | Queue operations |
| `src-tauri/src/engine/compression/preserve.rs` | 3 | Preserve-keys |

### Integration Tests (~8 tests)

| File | Tests | Focus |
|------|-------|-------|
| `tests/integration/test_compression_flow.rs` | 5 | Full compression flow |
| `tests/integration/test_compression_queue.rs` | 3 | Async queue behavior |

### Manual Tests (6 tests)

| Test | Description |
|------|-------------|
| `test_slider_visual` | Drag slider, verify visual compression |
| `test_preview_accuracy` | Preview matches actual compression |
| `test_llm_compression` | Real LLM compression produces good output |
| `test_batch_compression` | Select 10 blocks, compress all |
| `test_preserve_keys` | Error messages stay verbatim |
| `test_compression_recovery` | Expand compressed block to original |

---

## Success Criteria

- [ ] Four compression levels work (original → trimmed → summarized → minimal)
- [ ] Rule-based trimming runs in <1ms per block
- [ ] LLM compression produces quality summaries
- [ ] Async queue processes without blocking UI
- [ ] Slider UI updates block visual in real-time
- [ ] Preview modal shows accurate token savings
- [ ] Group compression works on selection
- [ ] Preserve-keys keeps critical content verbatim
- [ ] Original content always recoverable
- [ ] `make check` passes
- [ ] 35+ unit tests passing
- [ ] 8+ integration tests passing
- [ ] All manual tests documented and passing

---

## Key Imports for Next Phase

```rust
use crate::engine::compression::{
    CompressionLevel, CompressionVersions, CompressionQueue,
    compress_rule_based, compress_with_llm,
};
```

```typescript
import CompressionSlider from '$lib/components/CompressionSlider.svelte';
import CompressionPreview from '$lib/components/CompressionPreview.svelte';
```
