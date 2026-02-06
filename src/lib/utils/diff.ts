/**
 * Line-level diff utility using LCS (Longest Common Subsequence).
 * Pure functions, no dependencies.
 */

export type DiffLineType = "added" | "removed" | "unchanged";

export interface DiffLine {
  type: DiffLineType;
  content: string;
  oldLineNum: number | null;
  newLineNum: number | null;
}

export interface DiffStats {
  added: number;
  removed: number;
  unchanged: number;
}

/**
 * Compute a line-level diff between two strings using LCS DP.
 * Returns an array of DiffLine entries with line numbers.
 */
export function diffLines(before: string, after: string): DiffLine[] {
  if (before === after) {
    const lines = before.split("\n");
    return lines.map((content, i) => ({
      type: "unchanged" as const,
      content,
      oldLineNum: i + 1,
      newLineNum: i + 1,
    }));
  }

  const oldLines = before.split("\n");
  const newLines = after.split("\n");
  const m = oldLines.length;
  const n = newLines.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.push({
        type: "unchanged",
        content: oldLines[i - 1],
        oldLineNum: i,
        newLineNum: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({
        type: "added",
        content: newLines[j - 1],
        oldLineNum: null,
        newLineNum: j,
      });
      j--;
    } else {
      result.push({
        type: "removed",
        content: oldLines[i - 1],
        oldLineNum: i,
        newLineNum: null,
      });
      i--;
    }
  }

  result.reverse();
  return result;
}

/**
 * Compute stats from a diff result.
 */
export function diffStats(lines: DiffLine[]): DiffStats {
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  for (const line of lines) {
    if (line.type === "added") added++;
    else if (line.type === "removed") removed++;
    else unchanged++;
  }
  return { added, removed, unchanged };
}
