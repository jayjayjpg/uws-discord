import { PermissionFlagsBits, PermissionsBitField } from "discord.js";
import type { PermissionFlag, RoleKey, RoleOverwrite } from "../config/types.js";

export function flagsToBitfield(flags: PermissionFlag[]): bigint {
  return flags.reduce((acc, flag) => acc | PermissionFlagsBits[flag], 0n);
}

export function permissionsEqual(a: bigint, b: bigint): boolean {
  return a === b;
}

export function describePermissions(bits: bigint): string[] {
  return new PermissionsBitField(bits).toArray();
}

/** One role's resolved allow/deny sets after merging category + channel overwrite layers. */
export interface ResolvedOverwrite {
  allow: Set<PermissionFlag>;
  deny: Set<PermissionFlag>;
}

/**
 * Merges a category-level overwrite list with an optional channel-level list.
 * Channel entries win per-flag when they conflict with the category entry for
 * the same role; flags the channel doesn't mention are inherited from the
 * category. Keyed by role key, with "everyone" as a special key.
 */
export function mergeOverwrites(
  categoryOverwrites: RoleOverwrite[],
  channelOverwrites: RoleOverwrite[] = []
): Map<RoleKey | "everyone", ResolvedOverwrite> {
  const result = new Map<RoleKey | "everyone", ResolvedOverwrite>();

  const apply = (list: RoleOverwrite[]) => {
    for (const entry of list) {
      const existing = result.get(entry.role) ?? { allow: new Set<PermissionFlag>(), deny: new Set<PermissionFlag>() };
      for (const flag of entry.allow ?? []) {
        existing.deny.delete(flag);
        existing.allow.add(flag);
      }
      for (const flag of entry.deny ?? []) {
        existing.allow.delete(flag);
        existing.deny.add(flag);
      }
      result.set(entry.role, existing);
    }
  };

  apply(categoryOverwrites);
  apply(channelOverwrites);
  return result;
}
