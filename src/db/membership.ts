import { prisma } from "./client.js";
import type { Membership } from "@prisma/client";

export type MembershipTier = "free" | "premium";
export type MembershipStatus = "active" | "cancelled" | "past_due";

export async function getMembership(guildId: string, userId: string): Promise<Membership | null> {
  return prisma.membership.findUnique({ where: { guildId_userId: { guildId, userId } } });
}

export interface SetTierInput {
  guildId: string;
  userId: string;
  tier: MembershipTier;
  status?: MembershipStatus;
  provider?: string | null;
  externalSubscriptionId?: string | null;
  currentPeriodEnd?: Date | null;
}

export async function setMembershipTier(input: SetTierInput): Promise<Membership> {
  const { guildId, userId, tier, status = "active", provider, externalSubscriptionId, currentPeriodEnd } = input;
  return prisma.membership.upsert({
    where: { guildId_userId: { guildId, userId } },
    create: { guildId, userId, tier, status, provider: provider ?? undefined, externalSubscriptionId: externalSubscriptionId ?? undefined, currentPeriodEnd: currentPeriodEnd ?? undefined },
    update: { tier, status, provider: provider ?? undefined, externalSubscriptionId: externalSubscriptionId ?? undefined, currentPeriodEnd: currentPeriodEnd ?? undefined },
  });
}

/** Idempotency check for payment-provider webhooks — returns true if this event was already processed. */
export async function wasWebhookEventProcessed(provider: string, eventId: string): Promise<boolean> {
  const existing = await prisma.processedWebhookEvent.findUnique({ where: { provider_eventId: { provider, eventId } } });
  return existing !== null;
}

export async function markWebhookEventProcessed(provider: string, eventId: string): Promise<void> {
  await prisma.processedWebhookEvent.create({ data: { provider, eventId } }).catch(() => {
    // Unique constraint race — another concurrent delivery already recorded it. Fine, that's the point.
  });
}
