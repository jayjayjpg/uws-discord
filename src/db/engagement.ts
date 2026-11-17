import { prisma } from "./client.js";

/** Minimal engagement signal: a running count, not a transcript. */
export async function bumpMessageCount(guildId: string, userId: string): Promise<void> {
  await prisma.messageStat.upsert({
    where: { guildId_userId: { guildId, userId } },
    create: { guildId, userId, messageCount: 1, lastMessageAt: new Date() },
    update: { messageCount: { increment: 1 }, lastMessageAt: new Date() },
  });
}

export async function getMessageCount(guildId: string, userId: string): Promise<number> {
  const row = await prisma.messageStat.findUnique({ where: { guildId_userId: { guildId, userId } } });
  return row?.messageCount ?? 0;
}

export async function getTotalTrackedMessages(guildId: string): Promise<number> {
  const result = await prisma.messageStat.aggregate({ where: { guildId }, _sum: { messageCount: true } });
  return result._sum.messageCount ?? 0;
}

export type EngagementPromptType = "daily" | "gratitude" | "weeklyChallenge";

export async function getLastPosted(guildId: string, promptType: EngagementPromptType): Promise<Date | null> {
  const row = await prisma.engagementState.findUnique({ where: { guildId_promptType: { guildId, promptType } } });
  return row?.lastPostedAt ?? null;
}

export async function markPromptPosted(guildId: string, promptType: EngagementPromptType, when: Date): Promise<void> {
  await prisma.engagementState.upsert({
    where: { guildId_promptType: { guildId, promptType } },
    create: { guildId, promptType, lastPostedAt: when },
    update: { lastPostedAt: when },
  });
}
