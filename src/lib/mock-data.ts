/**
 * Mock Data Generator
 * Realistic demo context data for Phase 0 UI development
 */

import type {
  Block,
  Role,
  Zone,
  CompressionLevel,
  Session,
  Snapshot,
  TokenBudget,
} from "./types";

// ============================================================================
// ID Generation
// ============================================================================

let idCounter = 0;

function generateId(): string {
  return `block-${Date.now()}-${++idCounter}`;
}

// ============================================================================
// Token Estimation (rough approximation for mock data)
// ============================================================================

function estimateTokens(content: string): number {
  // Rough estimate: ~4 characters per token for English text
  return Math.ceil(content.length / 4);
}

// ============================================================================
// Block Factory
// ============================================================================

interface CreateBlockOptions {
  role: Role;
  content: string;
  zone?: Zone;
  usageHeat?: number;
  compressionLevel?: CompressionLevel;
  toolName?: string;
}

function createBlock(options: CreateBlockOptions): Block {
  const {
    role,
    content,
    zone = "middle",
    usageHeat = Math.random() * 0.5 + 0.2,
    compressionLevel = "original",
    toolName,
  } = options;

  const tokens = estimateTokens(content);

  return {
    id: generateId(),
    role,
    content,
    tokens,
    timestamp: new Date(Date.now() - Math.random() * 3600000), // Random time in last hour
    zone,
    pinned: null,
    compressionLevel,
    compressedVersions: {
      original: { content, tokens },
    },
    usageHeat,
    positionRelevance: zone === "primacy" ? 0.9 : zone === "recency" ? 0.7 : 0.4,
    lastReferencedTurn: Math.floor(Math.random() * 10),
    referenceCount: Math.floor(Math.random() * 5),
    topicCluster: null,
    topicKeywords: [],
    metadata: {
      provider: "anthropic",
      turnIndex: Math.floor(Math.random() * 20),
      toolName,
      filePaths: [],
    },
  };
}

// ============================================================================
// Sample Content
// ============================================================================

const SYSTEM_PROMPT = `You are Claude, an AI assistant by Anthropic. You are helping with the Aperture project, a universal LLM context visualization tool.

Key guidelines:
- Follow the planning-first workflow
- Use Svelte 5 runes ($state, $derived, $effect)
- Maintain the halftone/dithering aesthetic
- Every pixel encodes data — no decorative elements`;

const USER_MESSAGES = [
  "Let's build the Zone component. It should display blocks in a collapsible container with a header showing the zone name, token count, and block count.",
  "The blocks should be draggable. When I drag a block to a different zone, it should move there. Add visual feedback during drag.",
  "Can you add selection? Click to select one block, shift+click for range select, and show a teal border on selected blocks.",
  "Now implement the compression slider. When I drag the slider, blocks should visually dissolve based on their compression level.",
];

const ASSISTANT_RESPONSES = [
  `I'll create the Zone component with a collapsible header. The design will follow the halftone aesthetic:

\`\`\`svelte
<script lang="ts">
  import type { Block, Zone } from '$lib/types';

  let { zone, blocks, collapsed = $bindable(false) }: Props = $props();

  let totalTokens = $derived(blocks.reduce((sum, b) => sum + b.tokens, 0));
</script>
\`\`\`

The header will show zone name with the accent color, plus token/block counts in JetBrains Mono.`,

  `For drag-and-drop, I'll use svelte-dnd-action. Key interactions:

1. **Drag start**: Block lifts with subtle shadow, origin zone dims slightly
2. **Drag over**: Target zone highlights with dithered border
3. **Drop**: Block animates to new position with spring physics

The zone accent colors (teal/yellow/pink) will pulse on valid drop targets.`,

  `Selection implementation with the Aperture aesthetic:

- **Click**: Instant 2px teal border (decisive, no fade)
- **Shift+click**: Range select with subtle cascade animation
- **Ctrl+click**: Toggle individual selection
- **A key**: Select all in current zone

Selected blocks get intensified halftone dots to show "heat" increase.`,
];

const TOOL_RESULTS = [
  {
    name: "Read",
    content: `src/lib/types.ts (187 lines)
\`\`\`typescript
export type Role = "system" | "user" | "assistant" | "tool_use" | "tool_result";
export type Zone = "primacy" | "middle" | "recency";

export interface Block {
  id: string;
  role: Role;
  content: string;
  tokens: number;
  // ... more fields
}
\`\`\``,
  },
  {
    name: "Glob",
    content: `Found 12 files matching **/*.svelte:
- src/routes/+page.svelte
- src/lib/components/Zone.svelte
- src/lib/components/ContextBlock.svelte
- src/lib/components/TokenBudgetBar.svelte`,
  },
  {
    name: "Edit",
    content: `Updated src/lib/components/Zone.svelte
- Added collapse toggle
- Added token count display
- Styled with zone accent color`,
  },
];

// ============================================================================
// Demo Session Generator
// ============================================================================

export function generateDemoBlocks(): Block[] {
  const blocks: Block[] = [];

  // System prompt in primacy zone (high heat, pinned)
  const systemBlock = createBlock({
    role: "system",
    content: SYSTEM_PROMPT,
    zone: "primacy",
    usageHeat: 0.95,
  });
  systemBlock.pinned = "top";
  blocks.push(systemBlock);

  // Conversation turns in middle zone
  for (let i = 0; i < USER_MESSAGES.length; i++) {
    // User message
    blocks.push(
      createBlock({
        role: "user",
        content: USER_MESSAGES[i],
        zone: "middle",
        usageHeat: 0.3 + Math.random() * 0.3,
      })
    );

    // Tool use/result occasionally
    if (i < TOOL_RESULTS.length && Math.random() > 0.3) {
      blocks.push(
        createBlock({
          role: "tool_use",
          content: `Calling ${TOOL_RESULTS[i].name} tool...`,
          zone: "middle",
          usageHeat: 0.2 + Math.random() * 0.2,
          toolName: TOOL_RESULTS[i].name,
        })
      );
      blocks.push(
        createBlock({
          role: "tool_result",
          content: TOOL_RESULTS[i].content,
          zone: "middle",
          usageHeat: 0.4 + Math.random() * 0.3,
          toolName: TOOL_RESULTS[i].name,
        })
      );
    }

    // Assistant response
    if (i < ASSISTANT_RESPONSES.length) {
      blocks.push(
        createBlock({
          role: "assistant",
          content: ASSISTANT_RESPONSES[i],
          zone: "middle",
          usageHeat: 0.5 + Math.random() * 0.3,
        })
      );
    }
  }

  // Recent context in recency zone
  blocks.push(
    createBlock({
      role: "user",
      content:
        "Great progress! Let's add keyboard shortcuts next. A for select all, Esc to deselect, Del to remove.",
      zone: "recency",
      usageHeat: 0.8,
    })
  );

  blocks.push(
    createBlock({
      role: "assistant",
      content: `I'll implement the keyboard shortcuts using Svelte's on:keydown handler at the window level:

\`\`\`svelte
<svelte:window on:keydown={handleKeydown} />
\`\`\`

The shortcuts will:
- **A**: Select all visible blocks
- **Esc**: Clear selection
- **Del**: Remove selected (with dissolution animation)
- **C**: Open compression slider for selected
- **S**: Quick save snapshot`,
      zone: "recency",
      usageHeat: 0.85,
    })
  );

  return blocks;
}

export function generateDemoSession(): Session {
  const blocks = generateDemoBlocks();

  return {
    id: "demo-session",
    name: "Aperture UI Development",
    provider: "anthropic",
    tokenLimit: 200000,
    blocks,
    createdAt: new Date(Date.now() - 3600000),
    updatedAt: new Date(),
  };
}

export function generateDemoSnapshots(): Snapshot[] {
  return [
    {
      id: "snap-1",
      name: "Before refactor",
      timestamp: new Date(Date.now() - 1800000),
      blocks: [],
      totalTokens: 45000,
      type: "hard",
    },
    {
      id: "snap-2",
      name: "Working state",
      timestamp: new Date(Date.now() - 600000),
      blocks: [],
      totalTokens: 67420,
      type: "soft",
    },
  ];
}

export function calculateTokenBudget(blocks: Block[]): TokenBudget {
  const budget: TokenBudget = {
    used: 0,
    limit: 200000,
    byZone: { primacy: 0, middle: 0, recency: 0 }, // Initialize built-in zones
    byRole: {
      system: 0,
      user: 0,
      assistant: 0,
      tool_use: 0,
      tool_result: 0,
    },
  };

  for (const block of blocks) {
    budget.used += block.tokens;
    // Initialize zone if not exists (for custom zones)
    if (!(block.zone in budget.byZone)) {
      budget.byZone[block.zone] = 0;
    }
    budget.byZone[block.zone] += block.tokens;
    budget.byRole[block.role] += block.tokens;
  }

  return budget;
}
