import { prisma } from "./client.js";
import type { Warning } from "@prisma/client";

export type WarningRecord = Warning;

/** `reason` is always staff-authored text — never raw member message content. */
export async function addWarning(guildId: string, userId: string, moderatorId: string, reason: string): Promise<void> {
  await prisma.warning.create({ data: { guildId, userId, moderatorId, reason } });
}

export async function getWarnings(guildId: string, userId: string): Promise<WarningRecord[]> {
  return prisma.warning.findMany({ where: { guildId, userId }, orderBy: { createdAt: "desc" } });
}
