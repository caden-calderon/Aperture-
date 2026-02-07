/**
 * Lightweight syntax highlighting for block content.
 * Uses Prism.js with a minimal set of languages.
 */

import Prism from "prismjs";
import "prismjs/components/prism-json";
import "prismjs/components/prism-python";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-diff";
import "prismjs/components/prism-toml";
import "prismjs/components/prism-css";

// Cache highlighted results to avoid re-computation
const cache = new Map<string, string>();
const MAX_CACHE = 200;

const LANG_ALIASES: Record<string, string> = {
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  py: "python",
  python: "python",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  bash: "bash",
  rs: "rust",
  rust: "rust",
  yml: "yaml",
  yaml: "yaml",
  md: "markdown",
  markdown: "markdown",
  json: "json",
  toml: "toml",
  css: "css",
  diff: "diff",
  svelte: "markup",
  html: "markup",
  xml: "markup",
};

function resolveLanguage(lang: string): string | null {
  const lower = lang.toLowerCase();
  const resolved = LANG_ALIASES[lower] ?? lower;
  return Prism.languages[resolved] ? resolved : null;
}

/**
 * Detect the likely language of a content string.
 * Searches for code fences anywhere in content, uses heuristics for pure code.
 */
export function detectLanguage(content: string, role?: string): string | null {
  const trimmed = content.trim();

  // Short content: skip detection (not worth highlighting < 20 chars)
  if (trimmed.length < 20) return null;

  // Pure JSON detection (most common for tool blocks)
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      // Not valid JSON, continue
    }
  }

  // Code fence detection — search ANYWHERE in content (not just start)
  const fenceMatch = trimmed.match(/```(\w+)/);
  if (fenceMatch) {
    const resolved = resolveLanguage(fenceMatch[1]);
    if (resolved) return "markdown"; // Content with embedded code fences → highlight as markdown
  }

  // Diff detection
  if (trimmed.match(/^[-+]{3}\s/m) && trimmed.match(/^@@\s/m)) return "diff";

  // TOML detection
  if (trimmed.match(/^\[[\w.-]+\]\s*$/m) && trimmed.includes("=")) return "toml";

  // Bash/shell detection
  if (trimmed.startsWith("#!/") || trimmed.match(/^\$\s/m)) return "bash";

  // Rust detection (strong signals)
  if (trimmed.match(/\b(fn\s+\w|let\s+mut\s|impl\s|pub\s+fn\s|struct\s+\w|enum\s+\w|use\s+\w+::)/)) return "rust";

  // Python detection (strong signals)
  if (trimmed.match(/\b(def\s+\w|import\s+\w|class\s+\w|from\s+\w+\s+import|print\()/)) return "python";

  // TypeScript/JavaScript detection (strong signals)
  if (trimmed.match(/\b(const\s+\w|let\s+\w|function\s+\w|import\s+\{|export\s+(default|const|function|interface|type)\s)/)) return "typescript";

  // YAML detection
  if (trimmed.match(/^\w[\w-]*:\s/m) && !trimmed.includes("{") && trimmed.includes("\n")) return "yaml";

  // CSS detection
  if (trimmed.match(/[.#]\w+\s*\{/) && trimmed.includes(":") && trimmed.includes(";")) return "css";

  // Markdown detection: assistant responses with markdown formatting
  if (role === "assistant") {
    const hasHeadings = trimmed.match(/^#{1,3}\s/m);
    const hasCodeFence = trimmed.includes("```");
    const hasLists = trimmed.match(/^\s*[-*]\s+\S/m);
    const hasBold = trimmed.includes("**");
    const signals = [hasHeadings, hasCodeFence, hasLists, hasBold].filter(Boolean).length;
    if (signals >= 1) return "markdown";
  }

  // Tool result content — often contains file paths and structured output
  if (role === "tool_result" || role === "tool_use") {
    // Check for JSON-like structure
    if (trimmed.includes("{") && trimmed.includes("}") && trimmed.includes(":")) {
      return "json";
    }
    // Check for code-like content
    if (trimmed.match(/\b(function|const|let|var|import|export|class|def|fn|pub|struct)\b/)) {
      return "typescript";
    }
  }

  return null;
}

/**
 * Highlight content with Prism.js.
 * Returns HTML string (already escaped by Prism).
 */
export function highlightCode(content: string, language: string): string {
  const cacheKey = `${language}:${content.slice(0, 100)}:${content.length}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const grammar = Prism.languages[language];
  if (!grammar) return escapeHtml(content);

  const highlighted = Prism.highlight(content, grammar, language);

  // Manage cache size
  if (cache.size >= MAX_CACHE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(cacheKey, highlighted);

  return highlighted;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
