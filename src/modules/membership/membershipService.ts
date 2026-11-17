import type { Guild } from "discord.js";
import { loadServerMap } from "../../config/serverMap.js";
import { getMembership, setMembershipTier, type MembershipTier } from "../../db/membership.js";
import { logger } from "../../logger.js";

export interface MembershipView {
  tier: MembershipTier;
  status: string;
  currentPeriodEnd: Date | null;
}

/** Defaults to free if no record exists — free tier never requires an explicit DB row. */
export async function getMembershipView(guildId: string, userId: string): Promise<MembershipView> {
  const record = await getMembership(guildId, userId);
  if (!record) return { tier: "free", status: "active", currentPeriodEnd: null };
  return { tier: record.tier as MembershipTier, status: record.status, currentPeriodEnd: record.currentPeriodEnd };
}

/**
 * Sets a member's tier in the DB and syncs the Discord "Premium Member" role
 * to match. This is the single choke point every path to changing someone's
 * tier must go through — manual admin command today, a payment webhook later —
 * so the Discord-side role state can never drift from the DB.
 */
export async function setTierAndSyncRole(guild: Guild, userId: string, tier: MembershipTier): Promise<void> {
  await setMembershipTier({ guildId: guild.id, userId, tier });

  const map = loadServerMap();
  const premiumRoleId = map?.roles.premiumMember;
  if (!premiumRoleId) {
    logger.warn("Premium Member role not mapped yet — run the setup script. Skipping role sync.");
    return;
  }

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;

  const hasRole = member.roles.cache.has(premiumRoleId);
  if (tier === "premium" && !hasRole) {
    await member.roles.add(premiumRoleId, "Membership set to premium").catch((err) => logger.error(err, "Failed to add Premium Member role"));
  } else if (tier === "free" && hasRole) {
    await member.roles.remove(premiumRoleId, "Membership set to free").catch((err) => logger.error(err, "Failed to remove Premium Member role"));
  }
}
