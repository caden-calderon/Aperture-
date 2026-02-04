# Code Standards

> **Read before writing code. Quality now prevents pain later.**

---

## Environment

```bash
# Development
pnpm tauri dev

# Before completing any phase
make check
```

---

## Rust Standards

### Principles
- **Explicit over implicit** — No magic, clear data flow
- **Errors as values** — Use `Result<T, E>`, avoid panics in library code
- **Zero-cost abstractions** — Don't pay for what you don't use

### Naming
```rust
// Types: PascalCase
struct ContextBlock { ... }
enum CompressionLevel { ... }

// Functions/methods: snake_case
fn calculate_tokens(content: &str) -> usize { ... }

// Constants: SCREAMING_SNAKE_CASE
const MAX_CONTEXT_SIZE: usize = 200_000;

// Modules: snake_case
mod context_engine;
```

### Error Handling
```rust
// Define domain errors
#[derive(Debug, thiserror::Error)]
pub enum ProxyError {
    #[error("connection failed: {0}")]
    ConnectionFailed(String),
    #[error("invalid request: {0}")]
    InvalidRequest(String),
}

// Propagate with ?
async fn forward_request(&self, req: Request) -> Result<Response, ProxyError> {
    let response = self.client.send(req).await?;
    Ok(response)
}
```

### Async
```rust
// Prefer tokio for async runtime
// Use channels for communication between tasks
// Avoid blocking in async contexts
```

### Documentation
```rust
/// Brief description of what this does.
///
/// # Arguments
/// * `content` - The text content to analyze
///
/// # Returns
/// Token count estimate
///
/// # Example
/// ```
/// let tokens = estimate_tokens("hello world");
/// assert_eq!(tokens, 3);
/// ```
pub fn estimate_tokens(content: &str) -> usize { ... }
```

### Clippy
All code must pass `cargo clippy` with no warnings. Key lints enforced:
- `clippy::unwrap_used` — Use `?` or `expect()` with context
- `clippy::pedantic` — Enabled for thorough checks

### Module Organization

```
src-tauri/src/
├── lib.rs              # Library root, re-exports public API
├── main.rs             # Binary entry
├── commands.rs         # Tauri IPC commands (grows with features)
├── proxy/              # Proxy layer (Phase 1)
│   ├── mod.rs         # Module root
│   ├── error.rs       # ProxyError types
│   ├── parser.rs      # Message parsing
│   └── capture.rs     # Request/response capture
├── engine/             # Context engine (Phase 2+)
│   ├── mod.rs         # Engine root, re-exports Block, Zone, etc.
│   ├── block.rs       # Universal Block struct (THE canonical definition)
│   ├── store.rs       # Block storage
│   └── ...
├── events/             # Event system (Phase 1)
│   ├── mod.rs
│   └── ...
└── sidecar/            # Cleaner model (Phase 7)
    ├── mod.rs
    └── ...
```

**Convention for nested modules:**
- Simple features: single file (`engine/tokens.rs`)
- Complex features: directory with `mod.rs` (`engine/compression/mod.rs`, `engine/compression/rules.rs`)

---

## Svelte 5 Standards

### Component Structure
```svelte
<script lang="ts">
  // 1. Imports
  import { onMount } from 'svelte';
  import Button from '$lib/components/Button.svelte';

  // 2. Props (Svelte 5 runes)
  let { blocks = $bindable([]), onSelect }: Props = $props();

  // 3. State
  let selectedIds = $state(new Set<string>());

  // 4. Derived
  let selectedCount = $derived(selectedIds.size);

  // 5. Effects
  $effect(() => {
    console.log('Selection changed:', selectedCount);
  });

  // 6. Functions
  function handleClick(id: string) {
    // ...
  }
</script>

<!-- Template -->
<div class="container">
  {#each blocks as block (block.id)}
    <Block {block} selected={selectedIds.has(block.id)} />
  {/each}
</div>

<style>
  /* Scoped styles */
  .container { ... }
</style>
```

### Naming
```typescript
// Components: PascalCase
ContextBlock.svelte
TokenBudgetBar.svelte

// Stores: camelCase with Store suffix
contextStore.ts
selectionStore.ts

// Utils: camelCase
tokenCounter.ts
```

### TypeScript
```typescript
// Always define types for props
interface Props {
  block: Block;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

// Use type inference where obvious
let count = 0; // number inferred

// Explicit for complex types
let blocks: Map<string, Block> = new Map();
```

### Styling
- Use Tailwind for layout, spacing, flexbox
- Use custom CSS for dithering/halftone effects (can't do per-pixel in Tailwind)
- CSS variables for theming
- Scoped styles in components

```svelte
<style>
  /* Custom effects that need CSS */
  .halftone {
    background-image: radial-gradient(circle, var(--dot-color) 1px, transparent 1px);
    background-size: var(--dot-spacing) var(--dot-spacing);
  }
</style>
```

---

## Testing

### Rust Tests
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_estimation_empty_string() {
        assert_eq!(estimate_tokens(""), 0);
    }

    #[tokio::test]
    async fn test_proxy_forwards_request() {
        // Arrange
        let proxy = Proxy::new(config);

        // Act
        let response = proxy.forward(mock_request()).await;

        // Assert
        assert!(response.is_ok());
    }
}
```

### Naming Pattern
`test_<what>_<condition>_<expected>`

```rust
fn test_compression_with_empty_input_returns_empty() { ... }
fn test_zone_assignment_system_prompt_goes_to_primacy() { ... }
```

### Test File Organization

**Unit Tests (inline):** Use `#[cfg(test)]` blocks within each `.rs` file.
```rust
// In src-tauri/src/engine/block.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_block_creation_sets_defaults() { ... }
}
```

**Integration Tests:** Separate files in `tests/integration/`.
```
tests/
├── integration/
│   ├── test_proxy_flow.rs     # End-to-end proxy tests
│   ├── test_engine_flow.rs    # Engine integration tests
│   └── ...
└── manual/
    ├── README.md              # How to run manual tests
    └── run_phase1_tests.py    # Manual test scripts
```

---

## Git Commits

### Format
```
<type>: <short description>

[optional body]

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Types
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `docs:` Documentation only
- `test:` Adding/updating tests
- `chore:` Build process, dependencies, etc.
- `phase-N:` Phase completion

### Examples
```
feat: add token budget bar component

phase-0: complete UI foundation
```

---

## Before Committing

1. `make check` passes
2. Would a senior engineer approve this?
3. Are names self-documenting?
4. Did you add tests for new functionality?
5. No TODO comments without linked issues
