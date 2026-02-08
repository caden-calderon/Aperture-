import { describe, expect, it } from "vitest";

import {
  getDisplayTypeId,
  isBuiltInType,
  matchesDisplayType,
  resolveTypeSelection,
} from "./blockTypes";

describe("block type semantics", () => {
  it("resolves built-in types to canonical role without custom blockType", () => {
    expect(resolveTypeSelection("assistant", "user")).toEqual({ role: "assistant" });
  });

  it("resolves custom types to blockType and preserves provided canonical role", () => {
    expect(resolveTypeSelection("custom-memory", "tool_result")).toEqual({
      role: "tool_result",
      blockType: "custom-memory",
    });
  });

  it("uses blockType as display identity when present", () => {
    const block = { role: "user" as const, blockType: "custom-memory" };
    expect(getDisplayTypeId(block)).toBe("custom-memory");
    expect(matchesDisplayType(block, "custom-memory")).toBe(true);
    expect(matchesDisplayType(block, "user")).toBe(false);
  });

  it("treats built-in role as display identity when blockType is not set", () => {
    const block = { role: "system" as const, blockType: undefined };
    expect(getDisplayTypeId(block)).toBe("system");
    expect(matchesDisplayType(block, "system")).toBe(true);
  });

  it("identifies built-in ids correctly", () => {
    expect(isBuiltInType("tool_use")).toBe(true);
    expect(isBuiltInType("custom-memory")).toBe(false);
  });
});
