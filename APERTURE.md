# Aperture

> Universal LLM context visualization, management, and control proxy.

**Status:** Planning / Brainstorming
**Author:** Caden
**Stack:** Tauri v2 (Rust backend) + Svelte 5 frontend + Canvas effects layer

---

## Table of Contents

**Vision & Core Concepts**
- [The Problem](#the-problem) / [The Vision](#the-vision)
- [Core Concepts](#core-concepts) — Priority Zones, Dynamic Compression, Heat Map, Checkpoints, Live Editing, Topic Clustering, Deduplication, Forking, Compression Preview, Templates, Adaptive Learning, Health Score, Context Search, NL Commands, Pre-Fetching & Task Integration, System Prompt Management, Annotations, A/B Testing, Git Integration, Economics Dashboard, Project Profiles, Block Versioning, Multi-Agent Sharing

**Architecture & Technical Design**
- [Architecture](#architecture) — Proxy model, three layers
- [Context Pipeline](#context-pipeline) — Stages, operating modes, user modes, CLI integration
- [Context Sorting & Classification](#context-sorting--classification) — Sorting pipeline, staleness scoring
- [Provider Adapter Interface](#provider-adapter-interface)
- [Tech Stack](#tech-stack) — Svelte 5, Tauri v2, Rust/axum, Canvas, UI-first build strategy

**Feature Deep-Dives**
- [Rules System](#rules-system) / [Staging Area](#staging-area)
- [Cleaner Model Architecture](#cleaner-model-architecture-local-sidecar) — Sidecar, tasks, tiered model selection
- [Block Dependency Graph](#block-dependency-graph) / [Ghost Blocks](#ghost-blocks) / [Recently Deleted](#recently-deleted-context-trash)
- [Context Replay](#context-replay) / [Token Cost Forecasting](#token-cost-forecasting) / [Warning System](#warning-system)
- [Session Timeline View](#session-timeline-view) / [Plugin System](#plugin--extension-system) / [Multi-Window](#multi-window--split-view)
- [Cross-Session Memory](#cross-session-memory)

**Design & UI**
- [Aesthetic Direction](#aesthetic-direction) — Halftone/dithering, visual language, typography, color
- [UI Layout](#ui-layout) / [Interaction Design & Animation Spec](#interaction-design--animation-spec)
- [Sound Design](#sound-design-optional) / [Theming](#theming)

**Roadmap & Planning**
- [Features Roadmap](#features) (v0–v12) / [Build Order](#build-order) (Phase 0–12)
- [Open Questions](#open-questions) / [Notes & Ideas](#notes--ideas)

---

## The Problem

Current AI coding tools (Claude Code, Codex, OpenCode, Gemini CLI, etc.) give you zero visibility into your context window. You can't see what's eating your tokens, you can't surgically remove what you don't need, and compacting is a blunt instrument that throws away context you might want to keep. There's no way to control what goes in, what stays, or how it's organized.

## The Vision

**Full context sovereignty.** Aperture is a local proxy + visual editor that sits between any AI coding tool and its API. You see everything in the context window in real time, you control what stays and what goes, and you define policies that manage context automatically. Think of it as a DAW mixer for your context window — every block is a channel you can solo, mute, compress, or route.

---

## Core Concepts

### Priority Zones (Primacy / Middle / Recency)

LLMs recall information best from the **beginning** (primacy) and **end** (recency) of the context window. The middle gets the weakest attention ("lost in the middle" problem, Liu et al. 2023). Aperture uses this to organize blocks:

- **Primacy Zone** — Top of context. High recall. Pin system prompts, architecture docs, critical instructions here.
- **Middle Zone** — The kill zone. Lower recall. Candidates for condensation, summarization, or removal.
- **Recency Zone** — Bottom of context. High recall. Recent conversation turns, latest tool outputs.

Users can pin blocks to zones, and auto-rules can manage zone assignment based on block age, type, or token cost.

### Dynamic Compression (Context Breathing)

Blocks don't have a binary compressed/uncompressed state — they have a **compression slider** with multiple levels. The original content is always preserved locally; what changes is how much of it occupies your token budget right now.

**Compression Levels:**
- **Original** — full verbatim content
- **Trimmed** — boilerplate/noise removed, substance kept
- **Summarized** — key points and findings only
- **Minimal** — one-line description

Each level is pre-computed (either rule-based trimming or LLM-generated) and stored alongside the original. Switching levels is instant — no re-computation needed.

**Topic-aware rebalancing:** When you pivot from working on "safety" to "plugins," blocks in the safety cluster auto-compress (slide left) while plugin-related blocks auto-expand (slide right). Your token budget stays balanced, nothing is lost, and everything is reversible. Like editing a photo — every change can be reverted, the original is never touched.

**Group operations:** Select a topic cluster and compress/expand all blocks in it at once. "Compress all safety context to summarized" — one action, 15 blocks affected, 6000 tokens freed.

### Context Heat Map & Attention Echo

Every block has two metrics that combine into a unified "heat" visualization:

**Usage Heat** (backward-looking): How much has this block been referenced, quoted, or built upon in recent model responses? Tracked by analyzing responses for references to source blocks. High heat = the model keeps coming back to this, it's load-bearing context.

**Position Relevance** (forward-looking): Based on where the block sits (primacy/middle/recency) and its age, how likely is the model to attend to it on the next request? Predictive, based on the primacy/recency research.

**The combination matrix:**
- High heat + high relevance = **Critical.** Keep expanded.
- High heat + low relevance = **Mispositioned.** Important content buried in middle — move to a better zone.
- Low heat + high relevance = **Underperforming.** Well-positioned but not useful — candidate for compression.
- Low heat + low relevance = **Dead weight.** Compress aggressively or remove.

This gives you an instant visual read on where tokens are wasted and where context is actually working.

### Checkpoints (Hard & Soft)

Two types of checkpoints for different use cases:

**Hard Checkpoints** — Exact snapshots. Byte-for-byte, this is what the context was at that moment. Restore = get exactly that state. No summarization, no interpretation, no loss. Use case: "I'm about to try something risky, let me save state." Stored locally, size doesn't matter.

**Soft Checkpoints** — Intelligent summaries. Smaller, portable, designed for cross-session use. Contains: condensed conversation summary, files read + key findings, current task status, decisions made + rationale, known issues. Use case: "Done for today, capture where I left off" — inject into primacy on next session start.

Auto-checkpointing at meaningful boundaries: subtask completion, successful file writes, passing tests, topic shifts. Plus manual checkpoint via hotkey.

### Live Editing & Interruption

Since every request flows through the proxy, Aperture can **pause** outbound requests:

1. Agent sends a request
2. Aperture intercepts and holds it
3. UI shows the full context about to be sent
4. You scan it, spot a misunderstanding, edit inline
5. Hit "send" — corrected context forwards to API
6. Agent gets response based on your fix, never knows anything happened

**Hot Patch mode** (lighter weight): Edit a block while the agent is working. The fix takes effect on the *next* API call. You see the agent misread a file, correct the block, and the next response self-corrects without you typing "actually that file does X not Y."

### Topic Clustering

Lightweight, no-LLM clustering that groups related blocks:

- Keyword extraction and overlap scoring between blocks
- Blocks sharing file references, function names, or key terms get clustered
- Clusters enable group operations (compress all blocks in a topic)
- Powers the dynamic compression rebalancing on topic pivots
- Displayed in UI as color-coded cluster labels

### Semantic Deduplication

The agent reads the same file three times across a long session. Aperture detects that blocks 4, 17, and 31 all contain the contents of `config.py` and auto-deduplicates — keeps only the most recent read, compresses the others to just "read config.py (see block 31)." Massive token savings for free.

### Context Forking

Fork the context at a decision point. Exploring "WebSockets vs SSE?" — fork into two branches, each with its own context state. Compare results, merge the winner back. Context-level git branching. Ties naturally into the checkpoint and snapshot systems.

### Compression Preview

Before any compression happens (manual or auto), show a preview of what each level produces and the token savings. A dropdown or expandable panel per block:

```
Original    (847 tok)  "The MarketStream class connects via WebSocket to..."
Trimmed     (412 tok)  "MarketStream connects via WebSocket to Alpaca..."
Summarized  ( 89 tok)  "MarketStream: async WebSocket client for Alpaca..."
Minimal     ( 12 tok)  "Alpaca market data streaming module"
```

You pick the level, or the auto system picks and you can adjust. For auto-compression, the preview shows what *would* happen before it's applied — "these 8 blocks will be compressed, saving 4,200 tokens. Here's what each one looks like after." Approve, reject, or adjust individual blocks before committing.

This should be standard for any destructive-ish operation. Claude Code's compacting just nukes things — we show you exactly what you're trading away.

### Context Templates

Templates define the **structure** of a session, distinct from presets which define **content**. A template specifies what types of blocks go where, in what order, and with what constraints.

```yaml
template: debugging
structure:
  primacy:
    - system_prompt
    - error_context (pinned)
    - relevant_file_contents
  middle:
    - exploration_history
    - stale_tool_outputs
  recency:
    - recent_conversation (last 5 turns)
    - latest_tool_results
constraints:
  max_file_blocks: 3
  auto_condense_middle_after: 8 turns
  pin_errors: true
```

```yaml
template: greenfield
structure:
  primacy:
    - system_prompt
    - architecture_doc (staged)
    - coding_conventions (staged)
  middle:
    - conversation_history
  recency:
    - recent_turns (last 10)
constraints:
  auto_condense_middle_after: 15 turns
  keep_all_user_messages: true
```

Templates + presets combine: a preset loads specific *content* (which architecture doc, which conventions file), and a template defines the *layout* those blocks follow. You could have one "debugging" template used across many projects with different presets per project.

### Adaptive Learning

Aperture learns from your behavior over time and surfaces suggestions:

- You consistently remove tool_result blocks after 6 turns → "Create auto-rule? You've done this in 14 of 20 sessions."
- You always pin error blocks to recency → start doing it automatically
- You compress file reads but never user messages → learn compression preferences
- You always load the architecture doc when working on backend code → suggest staging rule

The cleaner model periodically analyzes usage patterns and generates rule suggestions. Over time, your Aperture instance becomes uniquely tuned to how you work. Accept or reject suggestions — it learns from that too.

### Context Health Score

A single composite number (0-100) displayed prominently in the header. At-a-glance context quality assessment.

**Factors:**
- Budget utilization (too full is bad, wasting space is also inefficient)
- Zone balance (everything crammed in middle is unhealthy)
- Heat distribution (lots of dead-weight blocks drags score down)
- Compression ratio (over-compressed blocks risk information loss)
- Deduplication opportunities (redundant content is waste)
- Dependency integrity (orphaned blocks are a smell)

**Display:** Color-coded — green (healthy), yellow (needs attention), red (critical). Clicking expands into a breakdown:

```
Context Health: 64/100

-23 pts  Dead weight in middle zone (18 blocks, zero heat)
 -8 pts  3 duplicate file reads (config.py read 3x)
 -5 pts  2 orphaned blocks (dependencies removed)

Suggested actions:
  Compress 12 stale blocks       → +15 pts
  Deduplicate config.py reads    → +8 pts
  Remove orphaned blocks         → +5 pts
```

### Context Search

Full-text and semantic search across all historical context — every session, every block, ever.

- "When did I last work on the auth module?" → find every session with auth-related blocks
- "What did the model say about the race condition?" → exact assistant response from weeks ago
- Keyword search for instant filtering of current context
- **Keyword-based selection:** search a term → all matching blocks get selected → compress/remove everything else. "Select everything with 'auth'" → one click to compress the rest.
- **LLM-assisted search:** ask the local cleaner model "find everything related to database connection pooling" and it semantically searches, selecting/highlighting relevant blocks even if they don't contain the exact keywords
- Embeddings generated by cleaner model enable semantic search, not just keyword matching
- Search across current session or across all historical sessions
- Builds a personal knowledge base automatically from your AI interactions
- Pairs with replay — find a historical moment, then replay that session's evolution

### Natural Language Context Commands

Type commands instead of clicking through UI. Local cleaner model interprets and maps to engine operations:

```
> compress everything from before the auth discussion
> pin the last three tool outputs
> remove all file reads older than 20 turns
> save a checkpoint called pre-refactor
> show me what changed since the last checkpoint
> expand all safety-related blocks
> find everything about WebSocket and select it
```

Also works from terminal: `aperture exec "compress the safety cluster to summarized"`

Bridges the visual UI and keyboard-driven workflow. Sometimes you're lazy and just want to tell the LLM what to do — that's a valid interaction mode. The cleaner model parses intent, maps to engine operations, shows a preview of what it'll do, and executes on confirmation.

### Intelligent Pre-Fetching & Task Integration

Aperture reads the agent's TODO/task list and proactively manages context around task transitions:

**Task-aware context management:**
1. Agent has a TODO list with tasks 1-5
2. Agent completes task 3 → marks it off
3. Hook fires → Aperture pauses the agent
4. Compresses task 3 context (keep results, compress exploration)
5. Pre-loads context relevant to task 4 (files, docs, dependencies)
6. Resumes the agent with clean, focused context

**Predictive pre-staging:**
- Based on the task list, pre-compute what files/context task 4 will need
- Pre-generate compression levels for those blocks so they're ready instantly
- Historical patterns: "when working on auth, you always reference middleware config within 3 turns" → pre-load it
- Cleaner model analyzes task descriptions and predicts relevant project files

**Task completion hooks:**
- Auto-checkpoint on task completion
- Auto-compress completed task context
- Auto-stage next task context
- Update project progress tracking
- All configurable — you choose how aggressive the automation is

### Smart System Prompt Management

System prompts deserve dedicated tooling beyond "it's a block in primacy."

- **Modular composition:** Build system prompts from pieces — base instructions + project rules + coding conventions + current task context
- **Version history:** Track changes to system prompts over time
- **A/B testing:** Try different system prompt variants, compare session outcomes
- **Effectiveness tracking:** Which system prompt versions correlated with fewer errors, fewer re-prompts, less wasted context?
- **Auto-composition:** Based on the detected project type and task, auto-compose the optimal system prompt from your library of modules
- **System prompt templates:** Starting points for different work types

### Block Annotations

Attach persistent notes to blocks:

- Select block → `N` → type note → done
- Annotations survive compression (they're metadata, not content)
- Annotated blocks get a relevance boost in the heat system
- Searchable — annotations become a personal index into context history
- "This block contains the API rate limit decision" → always findable
- Visible as small tag/badge on the block in the UI

### Context A/B Testing

Empirically validate context management decisions:

- Fork context, send same prompt through both branches (compressed vs original)
- Compare responses side by side — did compression cause the model to miss something?
- Automated mode: "before applying this compression batch, run an A/B test to verify quality"
- Track A/B results over time to build confidence in compression settings
- Ties into the fork/branch system

### Git Integration

Tie context to your codebase:

- Auto-save soft checkpoint tagged with commit hash on `git commit`
- "Show me the context from commit abc123" → see exactly what the AI was working with
- Store compressed context snapshots in `.aperture/` in the repo
- Team members can load shared context: "pick up where I left off on this branch"
- Pre-commit hooks: "warning: health score 52, 4 orphaned blocks"
- Branch-aware: switching git branches can auto-switch context presets

### Context Economics Dashboard

Detailed cost tracking with optimization suggestions:

```
Session Cost Breakdown:
  tool_result blocks: 67% of token spend ($1.57)
  assistant blocks:   22% ($0.52)
  user blocks:         8% ($0.19)
  system prompt:       3% ($0.07)

Insight: Average tool_result lifespan before irrelevance: 4 turns.
         Auto-condensing after 5 turns would save ~$0.89/session (38%).

Cost per block: schema.py read = $0.12/turn it stays in context
```

- Cost-per-block visibility
- Cross-session cost comparison
- Optimization suggestions with estimated savings
- "Your Monday sessions average $1.80, Friday sessions $3.40 — Fridays have 2x more redundant file reads"

### Project Context Profiles

Project-level configuration that persists and can be shared:

```yaml
# .aperture.yml (in project root)
project: argus
default_template: backend-dev
default_preset: argus-backend
provider: claude-code
token_budget: 200000

watch_paths:
  - src/
  - tests/
  - docs/architecture.md

auto_rules:
  - condense-tool-results-after-6
  - pin-errors-to-recency
  - deduplicate-file-reads

topic_clusters:
  - helios (market data)
  - athena (strategy)
  - hermes (notifications)
  - iris (sentiment)
```

Auto-loads when you `cd` into the project and launch Aperture. Team-shareable through the repo.

### Block Versioning

Blocks edited through hot patch or live editing maintain version history:

- See diff between original and edited versions
- Undo specific edits
- Track how often you correct the same type of misunderstanding → signal for system prompt improvement or staging injection
- "You've corrected file path misunderstandings 8 times → add a project structure doc to staging?"

### Multi-Agent Context Sharing (Future)

Bridge context between multiple AI agents working on the same project:

- Backend agent (Claude Code) + frontend agent (Codex) working simultaneously
- Key decisions/findings from one agent's context inject into the other's staging area
- "Backend decided on WebSocket for real-time" → frontend agent knows to build WebSocket client
- Configure which clusters/block types propagate between sessions

*Note: This is complex to get right. Deferred to later phases after core features are solid.*

### Universal Block Format

Every AI tool stores context differently. Aperture normalizes everything into a universal block format:

```
Block {
  id: string
  role: system | user | assistant | tool_use | tool_result
  content: string
  tokens: number
  timestamp: datetime
  zone: primacy | middle | recency
  pinned: top | bottom | null

  // Compression (non-destructive, multi-level)
  compression_level: original | trimmed | summarized | minimal
  compressed_versions: {           // pre-computed at each level
    original: { content, tokens }
    trimmed: { content, tokens }   // boilerplate removed
    summarized: { content, tokens } // key points only
    minimal: { content, tokens }   // one-liner
  }

  // Heat & Attention
  usage_heat: float               // 0.0-1.0, how often referenced in responses
  position_relevance: float       // 0.0-1.0, predicted attention based on position
  last_referenced_turn: number    // last turn where response used this block
  reference_count: number         // total times referenced

  // Topic Clustering
  topic_cluster: string | null    // e.g. "safety", "plugins", "auth"
  topic_keywords: string[]        // extracted keywords for clustering

  metadata: {
    provider: string               // "claude-code", "codex", "opencode", etc.
    turn_index: number
    tool_name: string | null       // for tool_use blocks
    file_paths: string[]           // referenced files
  }
}
```

### Provider Adapters

Each AI tool gets an adapter that handles:
- **Discovery** — find active sessions/state files
- **Parsing** — convert tool-specific format → universal blocks
- **Watching** — file watchers (inotify) for live updates
- **Write-back** — push modified context back (where supported)

Initial targets:
- Claude Code (`~/.claude/projects/` JSONL)
- Codex
- OpenCode
- Gemini CLI
- Generic OpenAI-compatible

Adding a new tool = writing one adapter. The entire UI, engine, and proxy are tool-agnostic.


---

## Architecture

### High-Level

```
AI Coding Tool (Claude Code, Codex, etc.)
         │
         │  ANTHROPIC_BASE_URL / OPENAI_API_BASE
         │  pointed at localhost
         ▼
┌──────────────────────────────┐
│      Aperture Proxy     │
│                              │
│  Intercept request ────────► │
│                              │
│  ┌────────────────────────┐  │
│  │    Context Pipeline    │  │
│  │                        │  │
│  │  1. Ingest             │  │
│  │  2. Parse to blocks    │  │
│  │  3. Zone assignment    │  │
│  │  4. Staged injection   │  │
│  │  5. Auto-condensation  │  │
│  │  6. Budget enforcement │  │
│  │  7. Reorder by zone    │  │
│  │  8. Emit               │  │
│  └────────────────────────┘  │
│                              │
│  Modified request ─────────► │──► Actual API (Anthropic/OpenAI/Google)
│                              │
│  Response captured + fwded   │──► Back to coding tool
└──────────────────────────────┘
         │
         │  IPC / WebSocket events
         ▼
┌──────────────────────────────┐
│     Tauri Window (UI)        │
│                              │
│  Live block visualization    │
│  Zone management             │
│  Pipeline config             │
│  Snapshots / Presets         │
│  Staging area                │
│  Analytics dashboard         │
└──────────────────────────────┘
```

### The Proxy Model

The coding tools don't need modification. Most support configuring an API base URL:
- Claude Code: `ANTHROPIC_BASE_URL=http://localhost:5400`
- OpenAI-compatible: `OPENAI_API_BASE=http://localhost:5400`

Aperture mimics the real API, intercepts the full message array, applies the context pipeline, forwards to the real API, captures the response, and passes it back. Zero patching, zero forks.

### Three Layers

1. **Proxy Core (Rust)** — HTTP intercept, request/response forwarding, pipeline execution. Must be fast and reliable since every API call flows through it.

2. **Context Engine (Rust)** — Block management, zones, rules, snapshots, staging, token counting. Exposes internal API consumed by both proxy and UI.

3. **UI Layer (Svelte 5 / Tauri)** — Visualization, drag/drop block management, pipeline config, analytics. Communicates with engine via Tauri IPC. Canvas layer for halftone/dithering effects.


---

## Context Pipeline

The pipeline is an ordered chain of processing stages applied to every outbound request. Each stage is independently toggleable and configurable. Think effects chain in a DAW.

### Pipeline Stages

| # | Stage | Purpose | Configurable |
|---|-------|---------|-------------|
| 1 | Ingest | Receive raw message array from coding tool | Provider selection |
| 2 | Parse | Break into universal blocks | — |
| 3 | Zone Assignment | Classify blocks into primacy/middle/recency | Auto-rules, age thresholds |
| 4 | Staged Injection | Insert pre-loaded blocks at target positions | Injection list, positions |
| 5 | Auto-Condensation | Compress blocks matching rule criteria | Rules, model, target ratio |
| 6 | Budget Enforcement | Handle over-limit scenarios | Strategy (trim/warn/block) |
| 7 | Reorder | Sort by zone priority | Zone ordering |
| 8 | Emit | Final context sent to API | — |

### Operating Modes

- **Manual** — Pipeline shows what *would* happen. User approves/rejects each action. Full control.
- **Autopilot** — Pipeline applies rules automatically. UI shows what was done. Hands-off.
- **Hybrid** — Auto-apply safe operations (zone assignment, reorder), prompt for destructive ones (condensation, removal).

All modes togglable at any time.

### User Modes

Four personas with different UI complexity:

- **Observer** — Read-only visualization. No proxy, no interception. Point at a session directory and watch. Token budget, block types, zone view. Useful on its own.
- **Editor** — Visualization + manual control. Select, remove, condense, reorder. Proxy intercepts but only applies manual edits, no auto-rules.
- **Operator** — Full pipeline. Auto-rules, presets, staging, condensation. Configure policies and let Aperture manage autonomously.
- **Developer** — API access. Build custom tools, UIs, rules, and integrations on top of Aperture's engine.

Surfaced as onboarding choice, configures UI complexity accordingly. Upgradeable at any time.

### CLI Integration & Preset Flags

Presets can be activated from the command line before a prompt:

```bash
# Load preset, then run prompt
claude --forge-preset argus-backend "add rate limiting to Helios"

# Nested presets (each layer adds more specific context)
# argus-backend extends argus-base extends python-project
claude --forge-preset argus-backend "fix the websocket reconnection bug"
```

Before the prompt hits the model, Aperture loads the preset — injects architecture docs, coding conventions, recent work summaries. Zero warm-up turns wasted on "let me look at your project."


---

## Context Sorting & Classification

How blocks get classified and sorted as they flow in. Must be fast (microseconds, not milliseconds) since it runs on every request.

### Sorting Pipeline

**Pass 1 — Role-based (instant):**
- System prompts → primacy (always)
- Last N turns → recency (always)
- Everything else → middle (default)

**Pass 2 — Content heuristics (fast):**
- Blocks containing error/traceback → boost toward recency (likely still relevant)
- File read blocks older than M turns → demote in middle (stale)
- Blocks after "actually", "wait", "never mind" → flag preceding assistant block as potentially stale
- Blocks with high token cost + low heat → flag for compression

**Pass 3 — Budget-aware ranking (fast):**
- If approaching token limit, rank middle zone blocks by staleness score
- Flag worst offenders for compression or removal

### Staleness Scoring

```
staleness = (turns_since_created × token_cost) / relevance_boost
```

Where `relevance_boost` increases if the block is referenced by later blocks (e.g., a file read that later tool calls depend on). Computable in microseconds.

### Optional: Semantic Relevance (opt-in)

For users who want smarter classification, optionally run a lightweight local model (quantized phi, embeddings-based scorer) for semantic relevance scoring against the current task. Strictly opt-in since it adds latency.


---

## Provider Adapter Interface

```rust
trait ProviderAdapter {
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


---

## Tech Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| App shell | Tauri v2 | Native webview, tiny binary, Rust backend, system tray, global hotkeys |
| Frontend | Svelte 5 | No virtual DOM (compiles to surgical DOM updates), built-in transition/animate directives, tiny bundle, less boilerplate than React, better perf for real-time updates |
| Styling | Tailwind + custom CSS | Tailwind for layout/spacing, custom CSS for dithering/halftone effects |
| Visual effects | Canvas API / WebGL | Heat maps, halftone rendering, timeline view — DOM can't do per-pixel dithering |
| Drag/Drop | svelte-dnd-action | Best Svelte DnD library, smooth reordering between zones |
| State | Svelte stores | Built-in reactive stores, no Redux/Zustand overhead |
| Backend/Proxy | Rust (axum) | Fast async HTTP, perfect for proxy critical path |
| Context Engine | Rust | In-memory block management, token counting |
| Token counting | tiktoken (via Rust bindings) | Accurate per-model counting |
| File watching | notify (Rust crate) | Cross-platform inotify/FSEvents |
| IPC | Tauri IPC | Frontend ↔ Rust communication |
| Live updates | WebSocket | Proxy → UI real-time events |
| Local models | Ollama | Easy local model management for cleaner sidecar |

### Why Svelte 5 over React

- **No virtual DOM:** React diffs a virtual DOM tree on every state change. Svelte compiles to direct DOM mutations — it knows exactly what changed at build time. For an app with real-time WebSocket updates, live heat recalculation, drag/drop across zones, and compression slider animations happening simultaneously, this eliminates a significant performance bottleneck.
- **Built-in animations:** Svelte has `transition:`, `animate:`, `in:`, `out:` directives as first-class syntax. The dissolution/materialization effects, block movement animations, and compression slider visuals are dramatically easier to implement. React requires third-party libraries (Framer Motion, React Spring) that add bundle weight and API complexity.
- **Reactivity model:** `let count = 0; count++;` and the UI updates. No `useState`, no dependency arrays, no stale closure bugs, no rules of hooks. Svelte 5's "runes" (`$state`, `$derived`, `$effect`) are explicit but still far simpler than React hooks.
- **Bundle size:** ~5x smaller than React equivalent. Matters in a Tauri webview where you don't have Chrome's full optimization pipeline.
- **Less boilerplate:** Components are more concise, templates are more readable, and the overall DX is faster for iterating on UI.

### Hybrid Rendering (DOM + Canvas)

The blocks themselves are DOM elements (for text selection, accessibility, keyboard navigation, and standard interaction events). But the visual effects layer — halftone dot patterns, heat visualization, dissolution animations, timeline rendering — runs on a canvas layer positioned behind/over the DOM elements. This gives us:

- Per-pixel dithering control (impossible with CSS alone)
- 60fps heat map transitions
- Complex visual effects without DOM reflow costs
- The ability to render hundreds of halftone dots per block without creating DOM nodes

### Build Strategy: UI-First

Build the complete UI with mock data first. Nail every interaction, animation, and visual detail before touching the backend. Reasons:

- The entire value proposition is the visual experience — if the UI doesn't feel incredible, nothing else matters
- Faster iteration — changing a visual is instant, changing a backend integration after building UI around it is painful
- Mock data (already built in v0 prototype) lets us test every feature visually
- We'll discover backend requirements we didn't anticipate by building the UI first
- Even features that don't "work" yet can be visualized and refined
- The v0 HTML prototype proves the concept; now it needs to *feel* right

### Launch

```bash
$ aperture
# → Tauri window opens
# → Proxy starts on localhost:5400
# → Auto-detects active AI sessions
# → Ready
```

Could also run as daemon + system tray for always-on monitoring.


---

## Rules System

Rules are declarative policies that the pipeline evaluates. Users build a library over time.

### Rule Format

```yaml
rule: auto-condense-old-tools
trigger:
  block.role: tool_result
  block.age: "> 8 turns"
action: condense
config:
  model: haiku
  target_ratio: 0.3
  preserve_keys:
    - error
    - filename
    - line_number
enabled: true
```

### Example Rules

- **Auto-condense stale tool output:** tool_result blocks older than N turns get compressed
- **System prompt budget:** if system prompt exceeds 4k tokens, warn or auto-trim
- **Token ceiling:** if total context > 80% of budget, auto-condense middle zone
- **Pin recent errors:** any block containing error/traceback auto-pins to recency
- **Expire file reads:** file content blocks older than 15 turns get summarized to just the filename + key findings


---

## Staging Area

Pre-loaded context blocks that get injected into requests. Think of it as a context "inventory" you prepare before a session.

### Use Cases

- **Architecture docs** — always inject the project structure overview into primacy
- **Coding conventions** — style guide injected so the model follows your patterns
- **Session briefing** — condensed summary of previous session injected on new session start
- **Reference material** — API docs, schema definitions, etc. loaded and available

### Configuration

Each staged item has:
- **Content** — the text/file to inject
- **Target zone** — where it goes (primacy, recency)
- **Condition** — always inject, or only when certain patterns/keywords detected
- **Priority** — ordering within the zone


---

## Cleaner Model Architecture (Local Sidecar)

A small local model acts as a "cleaner fish" — handling janitorial context work in the background so the main model's context stays clean and API budget stays low. Runs as an async sidecar process, never blocks the critical proxy path.

### Architecture

```
Aperture Engine
       │
       ├──► Proxy (fast path, zero model calls, microsecond latency)
       │
       └──► Cleaner Sidecar (async background worker)
            │
            ├── Model Backend (llama.cpp / ollama / custom)
            ├── Task Queue (priority-ordered)
            ├── Results Cache
            └── Health Monitor
```

The cleaner processes tasks from a queue and pushes results back to the engine. The proxy always uses the best available data — if compression levels haven't been computed yet, it uses the original. When the cleaner finishes, results are available for the next request. Zero blocking.

### Cleaner Tasks

- **Compression generation** — Pre-compute trimmed/summarized/minimal versions of every block. Highest volume task. Batch on idle cycles.
- **Attention echo analysis** — Score which source blocks a response actually references. More accurate than keyword matching, cheaper than main model.
- **Smart deduplication** — Catch semantically similar blocks (not just identical). "Block 4 and block 19 are both config.py with one line changed — 98% redundant."
- **Checkpoint boundary detection** — Watch conversation flow, emit "checkpoint suggested" events at meaningful boundaries (subtask complete, topic shift, tests pass).
- **Topic classification** — Assign blocks to topic clusters with actual semantic understanding, not just keyword overlap.
- **Compression quality verification** — After compression, score whether the compressed version preserves key information. Flag bad compressions.
- **Dependency edge detection** — Identify which blocks reference or depend on other blocks.
- **Ghost block generation** — Generate minimal placeholder text for removed blocks.

### Tiered Model Selection (Fully Configurable)

Different tasks need different capability levels. Users configure which model handles what:

**Routine tasks** (background, high volume, latency-tolerant):
- Default: Local model (Qwen 2.5 3B, Phi-3 Mini, Gemma 2B, etc.)
- Tasks: Compression slider levels, attention scoring, topic classification, dedup detection, checkpoint boundary detection
- Runs on CPU in ~2-8GB RAM, or GPU if available

**Significant compression** (fewer, higher stakes):
- Default: Mid-tier API model (Haiku, Flash)
- Tasks: Compressing important conversation blocks, generating soft checkpoints, quality verification on batch compressions
- Worth the API cost for fidelity

**Critical compression** (rare, maximum fidelity):
- Default: Primary/strong model (Sonnet, Opus, etc.)
- Tasks: Major session summaries, cross-session memory generation, compressing complex reasoning chains where nuance matters
- Used sparingly but essential for the hardest cases

**Full user control:**
- Any task type can be routed to any model
- "I run a local 70B, use it for everything" — valid
- "I'm cost-conscious, local model for everything" — valid
- "I don't trust small models, Sonnet for all compression" — valid
- Per-task model overrides, global defaults, preset-specific routing
- Ollama integration for easy local model management


---

## Block Dependency Graph

Blocks don't exist in isolation — they form a dependency chain. The agent reads `config.py` (block 4), uses values from it in block 7, modifies it in block 12. Those blocks are linked.

### Dependency Tracking

The engine tracks edges between blocks:
- **File reference chains** — block reads a file → later blocks reference that file's contents
- **Conversation flow** — assistant response depends on the user message that prompted it
- **Tool chains** — tool_use → tool_result pairs, and the assistant reasoning that follows
- **Information propagation** — when block B quotes, references, or builds on content from block A

### What This Enables

- **Orphan warnings:** "Removing this block will orphan 3 dependent blocks" — prevent accidental context gaps
- **Cascade compression:** When compressing a block, auto-propagate essential information into its dependents so the chain doesn't break
- **Smart removal ordering:** If you're clearing blocks to free space, suggest removal order that minimizes dependency breakage
- **Impact visualization:** Select a block and see its dependency tree highlighted — what feeds into it, what depends on it
- **Safe deletion zones:** Identify blocks with zero downstream dependencies — safe to remove without side effects

The cleaner model helps identify non-obvious dependencies (semantic references rather than just file path matches).


---

## Ghost Blocks

When a block is removed, it leaves a **ghost** — a minimal placeholder that preserves conversational flow.

```
Ghost: [config.py was read here — 847 tokens, removed at 2:34 PM]
```

Ghosts cost ~10-15 tokens but prevent the disorientation that happens when context has unexplained gaps. The model still knows the file was read even though it can't see the contents. If something downstream references config.py values, there's still a breadcrumb.

### Ghost Behavior

- Auto-generated on block removal (configurable — can be disabled)
- Show removed block's role, brief description, token cost, and removal time
- Visually distinct in UI (fully dithered/dissolved, barely there)
- Can be expanded back to a compressed version if the original is in the trash
- Ghosts themselves can be removed if you want a clean slate
- Cleaner model generates the ghost summary text


---

## Recently Deleted (Context Trash)

Everything removed goes to a local trash before permanent deletion. Like a recycle bin for context.

### Behavior

- Removed blocks stored locally with full original content
- Configurable retention: keep for N hours, N sessions, or until manually purged
- Browse trash in sidebar panel — search, filter, sort by recency
- One-click restore: block returns to its original zone and position (or you pick a new one)
- Bulk restore: bring back multiple blocks at once
- Trash size indicator: "42 blocks in trash (12,400 tokens recoverable)"
- Auto-purge policy: oldest blocks drop off after retention period

### Why This Matters

Deletion anxiety is real. People hesitate to clean context because they're afraid of removing something they'll need later. The trash eliminates that fear — remove aggressively, knowing you can always recover. This is especially important in autopilot mode where auto-rules are removing blocks; users need confidence that nothing is permanently lost without their explicit say-so.


---

## Context Replay

Step through how context evolved over a session, turn by turn. Git log for your context window.

### Features

- Scrubber/timeline showing each state change
- See exactly when blocks entered, were compressed, moved zones, or removed
- Token usage graph over time — identify when and why budget spiked
- Filter replay by event type (additions, removals, compressions, zone changes)
- "At turn 30, three tool_result blocks added 4,200 tokens — that's when budget pressure started"
- Export replay as a report for post-session analysis
- Useful for tuning rules: "I always blow budget around turn 30 because tool outputs pile up — set auto-condensation at turn 20"


---

## Token Cost Forecasting

Based on current trajectory, predict when you'll hit the context limit.

```
Current usage: 124,000 / 200,000 tokens (62%)
Growth rate: ~3,200 tokens/turn
Estimated limit hit: ~24 turns
Recommendation: Consider condensing middle zone (38,000 tokens recoverable)
```

### Features

- Live projection updated after every turn
- Growth rate calculation (rolling average)
- "Turns until limit" estimate
- Proactive recommendations: "compress now" vs "you have room"
- Integrates with auto-rules: trigger condensation when forecast shows N turns until limit
- Visual on the token budget bar — a projected "ghost fill" showing where you'll be in 5, 10, 20 turns


---

## Warning System

Configurable alerts for context health. Toasts in UI, or system tray notifications in daemon mode.

### Built-in Warnings

- **Budget warnings:** "Context at 80% capacity" (threshold configurable)
- **Dead weight:** "5 blocks have zero heat for 10+ turns — consider removing"
- **Compression quality:** "Compression ratio on block #14 is 15:1 — quality may be degraded"
- **Deduplication:** "3 near-duplicate file reads detected — 2,400 tokens recoverable"
- **Orphan risk:** "Block #7 has 4 dependents — removing it will create gaps"
- **Forecast:** "At current pace, budget limit in ~8 turns"
- **Stale pinning:** "Block #3 has been pinned to primacy for 40 turns with zero heat — still needed?"

### Configuration

- Enable/disable per warning type
- Set thresholds (budget %, heat threshold, staleness age)
- Choose delivery: toast, system notification, sound, or just badge in UI
- Snooze individual warnings
- Auto-action option: "when budget hits 90%, auto-condense middle zone" (ties into rules system)


---

## Session Timeline View

An alternative visualization to the block list — a horizontal timeline showing the session's evolution.

### Design

- Each block is a segment on the timeline
- Segment height = token cost
- Segment color = block type / heat
- Halftone density = compression level (solid = original, dithered = compressed)
- Zoom: pinch/scroll to zoom from full session overview to individual turns
- Click a segment to select that block in the main editor
- Overlay lines showing dependency edges between blocks
- Ghost blocks appear as faint dotted segments
- Checkpoint markers as vertical lines on the timeline

### Use Cases

- At-a-glance session overview: where did tokens go?
- Spot patterns: "tool outputs always spike here"
- Compare timeline shapes across sessions
- Identify the best checkpoint restore points visually


---

## Plugin / Extension System

Custom pipeline stages that users can write and share. The pipeline is already modular — each stage has an input (blocks) and output (modified blocks). A plugin is just a custom stage.

### Plugin Interface

```rust
trait PipelinePlugin {
    fn name(&self) -> &str;
    fn stage(&self) -> PipelinePosition;  // where it runs in the pipeline
    fn process(&self, blocks: &mut Vec<Block>, config: &PluginConfig) -> Result<()>;
    fn ui_panel(&self) -> Option<UIComponent>;  // optional config UI
}
```

### Example Plugins

- **Auto-test-staging:** Watches which source files are in context, auto-stages their corresponding test files
- **Cost optimizer:** Automatically routes to cheaper models when context is mostly boilerplate
- **Team conventions:** Enforces project-specific context rules (e.g., "always keep the API schema in primacy")
- **Export formatter:** Custom export formats for different tools or documentation
- **Metrics collector:** Push token usage stats to Grafana, Prometheus, or a custom dashboard
- **Voice notes:** Dictate context annotations that get injected as metadata on blocks

### Distribution

- Plugins as standalone Rust crates or WASM modules
- Community plugin registry (like crates.io but for Aperture)
- Install via CLI: `aperture plugin install auto-test-staging`


---

## Multi-Window / Split View

View two things side by side for comparison and analysis.

### Modes

- **Session comparison:** Two active sessions side by side
- **Snapshot diff:** Two snapshots of the same session with diff highlighting
- **Fork comparison:** Two branches of a forked context
- **Timeline + Editor:** Timeline view on top, block editor below
- **Before/After compression:** See original vs compressed versions of selected blocks


---

## Cross-Session Memory

Because Aperture sees every request/response, it can maintain continuity across sessions:

1. Session ends → auto-generates a **soft checkpoint** (condensed summary of understanding, decisions, state)
2. New session starts → soft checkpoint injected into primacy zone
3. User controls what persists and what's forgotten
4. Can also restore a **hard checkpoint** from a previous session for exact state recovery

This is smarter than built-in memory because *you* control the compression, retention, and positioning. Combined with presets, a new session can start with full project context + previous session continuity in seconds.


---

## Aesthetic Direction

**Halftone / Dithering / 1-Bit — Obra Dinn meets IDE**

A distinctive visual identity that nobody else is doing in dev tooling. Dark, utilitarian foundation with halftone/dithering treatments for data visualization.

### Visual Language

- **Token budget bar:** Dithered gradient that dissolves from solid to scattered dots as you approach the limit
- **Block heat visualization:** Dot density = usage heat (dense dots = hot, sparse dots = cold). Dot color = position relevance (bright teal for high relevance, dim gray for low). Hot well-positioned blocks are dense bright dots. Cold buried blocks are sparse gray dots — literally fading away.
- **Zone borders:** Stippled/dithered lines instead of solid borders
- **Compression indicator:** Blocks visually "dissolve" as compression increases. Original = solid. Trimmed = slight dither. Summarized = heavy dither. Minimal = almost gone, just dots.
- **Background textures:** Subtle halftone patterns, noise grain on surfaces
- **Block type indicators:** Pixel-art style icons or bitmap-rendered role labels

### Typography

- **Code/data:** Bitmap pixel font or JetBrains Mono for that raw terminal feel
- **Headers/labels:** Clean monospace (IBM Plex Mono) for contrast against the dithered visuals
- **Numbers/metrics:** JetBrains Mono, always

### Color Palette

Dark base with the existing accent system, but rendered through the dithering lens:
- Primacy (teal) rendered as tight halftone dots
- Middle (yellow) rendered as medium-spaced dots
- Recency (pink) rendered as another tight pattern
- Heat/cold as density variation rather than color shift

### Inspiration

- Return of the Obra Dinn (1-bit dithering on 3D scenes)
- Old Mac OS bitmap aesthetics
- Newspaper halftone printing
- CRT phosphor dot patterns


---

## UI Layout

```
┌──────────┬──────────────────────────┬────────────┐
│          │     Token Budget Bar     │            │
│          ├──────────────────────────┤  Pipeline  │
│ Sidebar  │                          │  ────────  │
│ ──────── │   Context Blocks         │  □ Ingest  │
│ Sessions │   ┌──────────────────┐   │  □ Parse   │
│ Snapshots│   │ Primacy Zone     │   │  ■ Zones   │
│ Presets  │   ├──────────────────┤   │  ■ Inject  │
│ Rules    │   │ Middle Zone      │   │  ■ Condense│
│ Analytics│   ├──────────────────┤   │  ■ Budget  │
│ Block    │   │ Recency Zone     │   │  □ Reorder │
│ Types    │   └──────────────────┘   │  ────────  │
│          │                          │  Staging   │
│ Keyboard │   Selection toolbar      │  Area      │
│ Shortcuts│   [Select] [Condense]    │            │
│          │   [Remove] [Pin]         │            │
└──────────┴──────────────────────────┴────────────┘
```

### Design Notes

- **Halftone / dithering / 1-bit aesthetic** — Obra Dinn meets IDE. See Aesthetic Direction section.
- JetBrains Mono / IBM Plex Mono / bitmap pixel fonts
- Color-coded block types (system=purple, user=blue, assistant=green, tool=lavender)
- Zone indicators with accent colors (primacy=teal, middle=yellow, recency=pink)
- Heat visualization via halftone dot density and color
- Compression levels shown as visual dissolution (solid → dithered → dots)
- Collapsible panels — pipeline config and staging area hide when not needed
- Token budget bar always visible at top, dithered gradient
- Compression sliders per block and per topic cluster


---

## Interaction Design & Animation Spec

### Design Principles

**Density = meaning.** Every visual property communicates data. Nothing is decorative.
- Dot density = heat (usage frequency)
- Block height = token cost
- Dot color = position relevance
- Dissolution level = compression
- Border style = selection state

**Precise, responsive, slightly alive.** No gratuitous bouncing or wobbling. Every animation communicates something. Things move because they're going somewhere, fade because they're losing relevance, pulse because they need attention.

**The context area should feel like a physical space.** Blocks have weight — high-token blocks feel heavier, take up more visual space. Zones feel like gravitational fields — primacy pulls important things up, recency pulls recent things down, middle is the low-gravity zone where things float and decay.

### Block Animations

**Appearing (new block enters context):**
Block materializes from noise — starts as scattered halftone dots and consolidates into a solid block. Like a fax printing in or an image loading on a slow connection. The dithering resolves from random to ordered. Duration: 200-300ms. Distinctive, not just a fade.

**Removing (block deleted or dragged to trash):**
The inverse — the block dissolves into scattered dots and fades out. Not a slide-out, not a fade, a *dissolution*. The information is literally scattering. Duration: 250ms. If dragged to trash, the dissolution triggers as it crosses the trash zone threshold — satisfying physical feeling.

**Compressing (slider or auto-compression):**
The block visually compresses in real-time as the compression slider moves. Content text blurs/fades, the block shrinks in height, the halftone background gets sparser. At "minimal" the block is barely there — a thin strip with a few scattered dots. At "original" it's fully solid and tall. Should feel like adjusting opacity in Photoshop. Continuous, not stepped.

**Moving between zones:**
Block lifts slightly (subtle shadow/elevation increase), moves to new position, settles in. The zone it's leaving briefly dims, the zone it's entering briefly glows. Spring physics easing, not linear — slight overshoot and settle. Feels physical.

**Heat transitions:**
On each turn update, heat values recalculate and dot patterns smoothly transition. Hot blocks densify, cold blocks thin out. Not per-frame — on data update events. Smooth CSS/canvas transitions between states (~500ms). You literally see blocks fading away as they become irrelevant over time.

### Selection & Interaction

**Click to select:**
Crisp teal border snaps on instantly. No fade-in — immediate, like a cursor blink. Feels decisive. The block's background subtly brightens.

**Multi-select (shift+click range, click individuals):**
Aggregate token count updates in real-time in the toolbar as each block joins the selection. Satisfying counter animation.

**Hover:**
Subtle elevation. Block lifts ~1px, slight shadow increase. The halftone dots in the background gently intensify. Content preview expands slightly if truncated. Not dramatic — just alive.

**Double-click:**
Opens the full block detail modal. The modal scales up from the block's position (origin-aware animation), not from center screen.

**Drag:**
Block picks up with a slight scale increase (1.02x) and elevated shadow. A ghost outline remains in the original position. Other blocks smoothly shift to make room as you drag between them. Trash zone slides up from bottom when dragging starts. Zones highlight with a glow border when the dragged block enters them.

### Token Budget Bar

The pressure gauge of the entire UI. Always visible at top.

**Fill behavior:**
Dithered gradient from left to right. As it fills, the visual tension increases:
- 0-60%: Calm. Sparse dithering at the fill edge. Teal tone.
- 60-80%: Attention. Dithering gets denser. Shifts toward yellow.
- 80-90%: Warning. Dense dithering. Subtle pulse (breathing, ~2s cycle). Orange.
- 90-95%: Urgent. Very dense. Faster pulse (~1s). Red-orange.
- 95%+: Critical. Nearly solid. Rapid pulse. Red. You feel the pressure.

**Segments:**
Three colored segments (primacy/middle/recency) with thin separator lines. Hovering a segment shows a tooltip with that zone's token count and block count.

**Forecast ghost fill:**
A semi-transparent projection extending past the current fill showing where you'll be in N turns at current growth rate. A faint dithered extension that says "this is where you're heading."

### Control Panel (Right Side — Pipeline & Staging)

Feels like a physical control board.

**Pipeline stage toggles:**
Each stage is a row with a toggle switch and a small LED-style indicator dot. Dot glows when the stage is active (green), dim when bypassed. Toggle has a satisfying snap animation — not just on/off, a brief intermediate state like a physical switch being flipped. Stages are draggable to reorder (changes pipeline execution order).

**Stage expansion:**
Click a stage to expand its configuration panel. Smooth height animation, content fades in. Collapse is the reverse. Only one stage expanded at a time (accordion).

**Staging area:**
Drop zone below the pipeline. Drag files or text blocks in. Staged items appear with a distinctive dashed border pattern (like a military "staging area" on a map). Each staged item shows its injection target zone and token cost. Drag to reorder priority.

### Sidebar

Clean, dense, information-rich.

**Session picker:**
When multiple sessions are active, show live mini-maps — tiny visual thumbnails of each session's zone distribution. Like a minimap in a code editor but for context zones. Active session highlighted.

**Snapshot list:**
Inline metadata (timestamp, token count, block count). Hover to preview — a mini version of the zone distribution at that snapshot point. Click to restore (with confirmation).

**Block type legend:**
Live token counts per type that update in real-time as you make changes. Click a type to select all blocks of that type (toggle).

**Health score:**
Prominent display near the top. Color-coded number. Click to expand the factor breakdown. Actions that improve it show a tiny "+N" float-up animation (like gaining XP in a game).

### Command Palette

Triggered by `Cmd/Ctrl+K` or `/`. Instant appearance (no animation delay — speed is the point).

- Type to fuzzy-search blocks, commands, presets, snapshots
- Natural language input interpreted by cleaner model
- Command history (up arrow)
- Autocomplete suggestions
- Preview panel on the right showing what the selected command will do
- Enter to execute, Esc to dismiss
- Should feel like Spotlight, Raycast, or VS Code's command palette

```
> compress safety cluster to summarized          [NL command]
> pin #14 to primacy                             [block operation]
> save checkpoint pre-refactor                   [checkpoint]
> switch preset argus-backend                    [preset]
> find websocket                                 [search]
```

### Toast Notifications

Slide in from bottom-right, rendered in the dithering style — they materialize from scattered dots (matching the block appearance animation). Auto-dismiss after 3s with dissolution animation. Stack vertically with slight offset. Brief, information-dense, monospace text.

### Checkpoint Save Visual

When a checkpoint is saved (manual or auto), a vertical line "stamps" down through the block list — like a receipt printer marking a position. Brief teal flash along the line, then it fades to a subtle persistent marker in the timeline gutter. Feels like pressing a physical stamp. Satisfying.

### Ghost Blocks

Almost invisible. A single thin line with a barely-there halftone pattern — like seeing something through frosted glass. Minimal height (just enough to be noticed). On hover, a tooltip fades in showing what was removed, when, and the token cost. Click to restore from trash (if available).

### Compression Slider

Per-block or per-selection-group. Horizontal slider below the block or in a floating panel.

- Dragging shows real-time visual compression of the block
- Token count updates live as you drag
- Small sparkline showing token savings at each position
- Detent stops at each compression level (original, trimmed, summarized, minimal) with a subtle snap feel
- Release triggers a brief "settled" confirmation animation
- Preview text updates showing what each level looks like


---

## Sound Design (Optional)

Off by default. Toggleable in settings. Very subtle, industrial/analog aesthetic.

- **Selection:** Tiny mechanical click. Like a keyboard switch.
- **Deselection:** Softer click, slightly lower pitch.
- **Checkpoint save:** Soft thud/stamp. Like a receipt printer or date stamp.
- **Compression:** Whisper of analog static, proportional to compression amount. Like tape compression.
- **Block removal (dissolution):** Brief crinkle/scatter sound, like paper disintegrating.
- **Block appearance:** Inverse — a brief coalesce sound, like static resolving.
- **Health score increase:** Tiny chime, like XP gain.
- **Warning:** Single low tone, not alarming. Like a gentle alert ping.
- **Mode switch:** Toggle click, mechanical.

Think: satisfying sounds from Notion/Linear, but more industrial and analog. Mechanical keyboard + analog tape + dot matrix printer vibes. Enhances the tactile feel of the dithering aesthetic.


---

## Theming

### Primary: Dark Mode (Default)

The core aesthetic. Dark background, halftone effects, colored accents. This is the "Obra Dinn meets IDE" look. Optimized for developer use alongside terminal windows.

### High Contrast Mode

Accessibility variant. Same layout and interactions, but higher contrast ratios. Brighter dots, stronger borders, larger hit targets. Important for extended use sessions.

### Newspaper / Light Mode (Alternative)

Inverted dithering aesthetic. Light/cream background, black halftone dots, ink-on-paper feel. Like a newspaper's print quality applied to a developer tool. Same density=meaning principle but in light mode. Could be gorgeous — think old technical manuals or patent drawings.

```
Dark:       ████ dots on ░░░░ background, colored accents
Newspaper:  ░░░░ dots on ████ background, ink/sepia accents
```

Both themes maintain the core principle: dithering density = data, not decoration.


---

## Features

### v0 — Foundation (Current Prototype)
- [x] Block visualization with token counts
- [x] Priority zones (primacy / middle / recency)
- [x] Select, multi-select, shift-range-select
- [x] Drag to reorder / drag to trash
- [x] Pin blocks to zones
- [x] Condense (simulated) with expand/restore
- [x] Snapshot save/restore
- [x] Token budget bar (color-coded by zone)
- [x] Block type filtering
- [x] Keyboard shortcuts
- [x] JSON import/export
- [x] Demo data for testing

### v1 — Proxy Core & App Shell
- [ ] Tauri app shell with terminal launch (`aperture`)
- [ ] Local proxy server (Rust/axum)
- [ ] Anthropic API pass-through
- [ ] OpenAI-compatible API pass-through
- [ ] Request/response capture
- [ ] Live UI updates via WebSocket
- [ ] Provider auto-detection
- [ ] Pause/hold request for inspection
- [ ] Hot patch mode (edits apply on next request)

### v2 — Context Engine
- [ ] Accurate token counting (tiktoken / provider-specific)
- [ ] Zone auto-assignment rules
- [ ] File watcher integration (inotify) for live session monitoring
- [ ] Delta parsing (cursor-based, only parse new content)
- [ ] Write-back support (where possible)
- [ ] Multi-session awareness
- [ ] Staleness scoring engine
- [ ] Context sorting/classification pipeline

### v3 — Dynamic Compression
- [ ] Multi-level compression (original → trimmed → summarized → minimal)
- [ ] LLM-powered compression (configurable model: Haiku, local, etc.)
- [ ] Pre-computed compression levels stored per block
- [ ] Compression slider UI per block and per group
- [ ] Compression preview (show all levels + token savings before committing)
- [ ] Batch compression preview ("these 8 blocks will save 4,200 tokens — approve?")
- [ ] Preserve-keys system (always keep errors, filenames verbatim)
- [ ] Async compression (background compute, apply on next request)
- [ ] Compression ratio display and warnings
- [ ] Non-destructive — original always preserved, always expandable

### v4 — Heat Map & Attention Tracking
- [ ] Usage heat tracking (analyze responses for source block references)
- [ ] Position relevance scoring (primacy/recency prediction)
- [ ] Combined heat visualization on blocks
- [ ] Heat-based recommendations (mispositioned, dead weight, etc.)
- [ ] Attention history over time per block

### v5 — Topic Clustering & Dynamic Rebalancing
- [ ] Keyword extraction and overlap-based clustering
- [ ] Topic cluster labels in UI
- [ ] Topic-aware auto-rebalancing on pivots
- [ ] Group compression/expansion by cluster
- [ ] Semantic deduplication (detect repeated file reads, etc.)

### v6 — Checkpoints & Forking
- [ ] Hard checkpoints (exact context snapshots)
- [ ] Soft checkpoints (intelligent summaries for cross-session)
- [ ] Auto-checkpointing at meaningful boundaries
- [ ] Manual checkpoint hotkey
- [ ] Checkpoint restore (instant rollback)
- [ ] Context forking (branch at decision points)
- [ ] Fork comparison and merge

### v7 — Staging, Injection & Presets
- [ ] Staging area UI for pre-loading context
- [ ] Injection position targeting
- [ ] File/doc auto-injection
- [ ] Conditional injection (pattern-based)
- [ ] Named presets (pipeline + rules + staging configs)
- [ ] Nested/inherited presets
- [ ] CLI preset flags (`--forge-preset`)
- [ ] Quick-switch between presets
- [ ] Context templates (define session *structure* — what block types go where)
- [ ] Template + preset composition (template = layout, preset = content)
- [ ] Template library (debugging, greenfield, refactoring, brainstorming, etc.)
- [ ] Preset sharing / export

### v8 — Analytics & Visualization
- [ ] Token usage tracking over time
- [ ] Cost estimation (real-time, per-session, per-project)
- [ ] Token cost forecasting ("limit in ~N turns")
- [ ] Context economics dashboard (cost-per-block, optimization suggestions)
- [ ] Block type distribution charts
- [ ] Compression efficiency metrics
- [ ] Context replay (step through session evolution turn by turn)
- [ ] Session timeline view (horizontal block visualization with dithered heat)
- [ ] Multi-window / split view (session comparison, snapshot diff, fork comparison)
- [ ] Warning system (budget, dead weight, dedup, orphan risk, forecast alerts)
- [ ] Context health score (composite 0-100 with factor breakdown)
- [ ] User modes (Observer / Editor / Operator / Developer)

### v9 — Cleaner Model & Intelligence
- [ ] Cleaner model sidecar (local model for background tasks)
- [ ] Tiered model selection (local → mid-tier → primary, configurable per task)
- [ ] Ollama integration for local model management
- [ ] Block dependency graph with orphan warnings and cascade compression
- [ ] Ghost blocks (minimal placeholders preserving conversational flow)
- [ ] Recently deleted / context trash with configurable retention and restore
- [ ] Semantic deduplication via cleaner model
- [ ] Compression quality verification via cleaner model
- [ ] Auto-checkpoint boundary detection via cleaner model
- [ ] Cross-session memory generation (soft checkpoints via mid-tier+ model)
- [ ] Multi-model routing (route tasks to appropriate capability tier)

### v10 — Search, NLP & Adaptive
- [ ] Full-text context search (current session + historical)
- [ ] Semantic search via cleaner model embeddings
- [ ] Keyword-based block selection ("select everything with X, compress the rest")
- [ ] LLM-assisted search ("find everything related to X" with semantic understanding)
- [ ] Natural language context commands (local model interprets, maps to operations)
- [ ] Terminal NLP commands (`aperture exec "compress the safety cluster"`)
- [ ] Adaptive learning (analyze usage patterns, suggest rules)
- [ ] Block annotations (persistent notes, searchable, relevance boost)
- [ ] Block versioning (edit history, diff, undo)

### v11 — Task Integration & Pre-Fetching
- [ ] TODO/task list integration (read agent's task list)
- [ ] Task completion hooks (pause → swap context → resume)
- [ ] Predictive pre-staging (pre-load context for next task)
- [ ] Historical pattern-based pre-fetching
- [ ] Smart system prompt management (modular composition, versioning, A/B testing)
- [ ] Context A/B testing (fork + compare responses for quality validation)
- [ ] Git integration (checkpoint on commit, branch-aware presets, `.aperture/`)
- [ ] Project context profiles (`.aperture.yml`, auto-load, team-shareable)

### v12 — Ecosystem & Multi-Agent
- [ ] Plugin / extension system (custom pipeline stages)
- [ ] Plugin interface (Rust crates or WASM modules)
- [ ] Community plugin registry + CLI install (`aperture plugin install`)
- [ ] Community rule/preset/template library
- [ ] Export/share configurations
- [ ] Multi-agent context sharing (cross-agent knowledge propagation)


---

## Build Order

**Strategy: UI-First.** For each phase, build the complete UI with mock data first — nail every interaction, animation, and visual detail — then wire up the backend behind it. Phase 0 is the full visual foundation; subsequent phases add real functionality.

0. **Phase 0** — UI foundation: Tauri + Svelte 5 app shell, full visual UI with mock data, all core interactions (drag/drop, zones, selection, compression slider, animations, dithering effects, theming). Everything works visually, nothing is wired to a real backend yet.
1. **Phase 1** — Proxy core: intercept + forward API calls, request/response capture, live UI updates via WebSocket, provider auto-detection
2. **Phase 2** — Context engine: parsing, zones, token counting, sorting/classification, manual block management
3. **Phase 3** — Dynamic compression: multi-level, slider UI, compression preview, async LLM compression
4. **Phase 4** — Heat map & attention tracking, topic clustering, semantic dedup
5. **Phase 5** — Checkpoints (hard + soft), forking, recently deleted / trash, ghost blocks
6. **Phase 6** — Staging/injection, presets, templates, CLI flags, project profiles (`.aperture.yml`)
7. **Phase 7** — Cleaner model sidecar, tiered model selection, dependency graph
8. **Phase 8** — Context search (full-text + semantic + LLM-assisted), NL commands, block annotations
9. **Phase 9** — Analytics, timeline view, context replay, forecasting, health score, warning system, economics dashboard
10. **Phase 10** — Task list integration, pre-fetching, task completion hooks (pause → swap → resume)
11. **Phase 11** — Smart system prompt management, A/B testing, git integration, adaptive learning, block versioning
12. **Phase 12** — Plugin system, community features, multi-agent context sharing (deferred — complex)


---

## Open Questions

- **Latency budget:** Pipeline processing adds latency per request. Target < 5ms for rule-based operations. Condensation (LLM call) handled async. Main latency cost comes from pipeline filters/stages, not the proxy hop itself.
- **Write-back compatibility:** Which tools actually support injecting modified context? Need to investigate each.
- **Token counting accuracy:** Different models use different tokenizers. Need per-model counting or accept approximation.
- **Conflict resolution:** If auto-rules and manual edits conflict, which wins? Manual always overrides.
- **Multi-user:** Strictly local-first. Community presets/rules can be shared.
- **Licensing:** Open source? What license?
- **Compression quality:** How do we verify that compressed blocks preserve the important information? Compression preview + ratio warnings help, but edge cases exist.
- **Topic detection accuracy:** Keyword-based clustering is fast but imprecise. Is that good enough or do we need embeddings?


---

## Notes & Ideas

### Core Design Philosophy
- Preset concept = saved mixer state. "Deep coding" activates aggressive condensation + injects architecture doc. "Brainstorming" loosens everything, keeps full history.
- Context breathing = photo editing model. Every compression is reversible, original always preserved.
- Claude Code's compaction: one-pass, all-or-nothing, no preview, no control. Aperture: multi-level, previewed, configurable, tiered models, always reversible. Strictly better.
- The dithering aesthetic makes data density visible — heat, compression, staleness all map to visual density. Functional beauty.
- Full configurability always. Every feature optional, every threshold adjustable, every model swappable. People who want a pure visualizer get that. People who want full autopilot get that.

### UX & Workflow
- Nested presets: `argus-backend` extends `argus-base` extends `python-project`. Each layer adds more specific context.
- Could bind `Super+C` to toggle the window via global keybind.
- Daemon mode with system tray for always-on monitoring.
- Context templates (beyond presets): define *structure*. Templates = layout, presets = content. Compose them.
- Ghost blocks prevent model disorientation from unexplained gaps (10-15 tokens, cheap insurance).
- Recently deleted = deletion anxiety eliminator. Remove aggressively knowing you can always recover.
- Block annotations = personal index into context history. Quick `N` keystroke to tag.
- Natural language commands bridge visual UI and keyboard workflow. "Compress the safety cluster" — let the LLM figure out the operations.
- Task completion hooks: pause → swap context → resume. The agent doesn't even know it happened.

### Intelligence & Optimization
- Local cleaner models are the force multiplier. 80% of intelligence work at 0% API cost.
- Tiered model routing = right tool for the job. Don't burn Sonnet tokens summarizing tool output.
- Adaptive learning makes the tool smarter over time. Your Aperture becomes uniquely yours.
- Intelligent pre-fetching uses the task list as a roadmap — don't predict, just read ahead.
- Context search + local LLM = "find everything related to X and select it" with semantic understanding, not just keywords.
- Keyword-based selection: type a term, everything matching gets selected, compress the rest in one action.
- Dependency graph enables "smart removal" — the system guides you to remove blocks that won't break anything.
- A/B testing gives empirical confidence that compression isn't hurting quality.

### Integration & Ecosystem
- Git integration: checkpoint on commit, branch-aware presets, shareable `.aperture/` in repo.
- Project profiles (`.aperture.yml`): auto-load on `cd`, team-shareable, project-specific rules.
- Plugin system makes Aperture a platform, not just a tool.
- Multi-agent sharing is powerful but complex — defer until core is solid.
- Analytics + economics dashboard: "this file read costs $0.12/turn" changes how you think about context.
- Timeline view + dithering = blocks as halftone segments, density showing heat, watching context dissolve as it loses relevance.
- The v0 HTML prototype is functional — use it as reference for the Svelte rebuild.
- Cost comparison across sessions: identify patterns, optimize workflows, quantify savings from compression rules.
