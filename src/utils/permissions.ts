import type { GuildMember } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { ROLE_BLUEPRINT } from "../config/blueprint.js";
import { loadServerMap } from "../config/serverMap.js";
import type { RoleKey } from "../config/types.js";

const RANK_BY_KEY = new Map(ROLE_BLUEPRINT.map((r) => [r.key, r.rank]));

/** The highest blueprint-managed role rank this member currently holds, or -1 if none. */
export function highestManagedRank(member: GuildMember): number {
  const map = loadServerMap();
  if (!map) return -1;
  let highest = -1;
  for (const [key, id] of Object.entries(map.roles) as [RoleKey, string | undefined][]) {
    if (id && member.roles.cache.has(id)) {
      highest = Math.max(highest, RANK_BY_KEY.get(key) ?? -1);
    }
  }
  return highest;
}

/**
 * Does this member hold `minimum` or anything ranked above it in our role
 * hierarchy? Native Discord Administrator permission always passes, as a
 * safety net independent of our own blueprint bookkeeping.
 */
export function memberMeetsRole(member: GuildMember, minimum: RoleKey): boolean {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  const minRank = RANK_BY_KEY.get(minimum) ?? Number.POSITIVE_INFINITY;
  return highestManagedRank(member) >= minRank;
}

export const isModeratorOrAbove = (member: GuildMember): boolean => memberMeetsRole(member, "moderator");
export const isCommunityManagerOrAbove = (member: GuildMember): boolean => memberMeetsRole(member, "communityManager");
export const isAdministratorOrAbove = (member: GuildMember): boolean => memberMeetsRole(member, "administrator");

/** Does this member hold ANY of the given roles (by blueprint key)? Administrator permission always passes. */
export function hasAnyManagedRole(member: GuildMember, keys: RoleKey[]): boolean {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  const map = loadServerMap();
  if (!map) return false;
  return keys.some((key) => {
    const id = map.roles[key];
    return id && member.roles.cache.has(id);
  });
}

/** Can this member propose a community event? (Facilitator, Event Host, Community Manager, or above) */
export const isEventProposer = (member: GuildMember): boolean =>
  hasAnyManagedRole(member, ["eventHost", "facilitator", "communityManager", "administrator", "founder"]);

/** Can this member approve/publish/cancel any event outright? (Community Manager, or above) */
export const isEventApprover = (member: GuildMember): boolean =>
  hasAnyManagedRole(member, ["communityManager", "administrator", "founder"]);
