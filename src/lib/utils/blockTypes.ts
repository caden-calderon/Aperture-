import type { Block, Role } from "$lib/types";
import { isRole } from "$lib/types";

export interface TypeSelection {
  role: Role;
  blockType?: string;
}

export function isBuiltInType(typeId: string): typeId is Role {
  return isRole(typeId);
}

export function getDisplayTypeId(block: Pick<Block, "role" | "blockType">): string {
  return block.blockType ?? block.role;
}

export function matchesDisplayType(
  block: Pick<Block, "role" | "blockType">,
  typeId: string
): boolean {
  return getDisplayTypeId(block) === typeId;
}

export function resolveTypeSelection(typeId: string, fallbackRole: Role): TypeSelection {
  if (isBuiltInType(typeId)) {
    return { role: typeId };
  }
  return { role: fallbackRole, blockType: typeId };
}
