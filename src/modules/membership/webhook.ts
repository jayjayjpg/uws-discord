/**
 * Payment-webhook FOUNDATION ONLY — not wired to any live HTTP endpoint.
 *
 * This project is a Discord gateway bot; it has no HTTP server. Actually
 * receiving webhooks from a payment provider (Stripe, Paddle, etc.) requires
 * standing up a public HTTP endpoint, choosing a hosting/ingress story, and
 * wiring provider-specific event shapes — all of which is a separate decision
 * requiring explicit approval (per the project brief: "do not implement
 * payment processing without my approval"). What's here is the part that's
 * safe to build ahead of time: signature verification and an idempotent way
 * to apply a subscription change once a real webhook handler exists.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../env.js";
import { markWebhookEventProcessed, setMembershipTier, wasWebhookEventProcessed, type MembershipStatus, type MembershipTier } from "../../db/membership.js";
import { logger } from "../../logger.js";

/**
 * Generic HMAC-SHA256 signature check (the scheme most providers use, though
 * the exact header format varies — e.g. Stripe prefixes with a timestamp —
 * so this will need a small provider-specific adapter once a provider is chosen).
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  if (!secret || !signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const givenBuf = Buffer.from(signatureHeader, "hex");
  if (expectedBuf.length !== givenBuf.length) return false;
  return timingSafeEqual(expectedBuf, givenBuf);
}

export interface SubscriptionEvent {
  provider: string;
  eventId: string;
  guildId: string;
  userId: string;
  tier: MembershipTier;
  status: MembershipStatus;
  currentPeriodEnd?: Date;
}

/**
 * Idempotently applies a subscription change: if this exact provider event
 * was already processed (e.g. a retried webhook delivery), it's a no-op.
 * Does NOT touch Discord roles directly — call setTierAndSyncRole for that
 * once PREMIUM_ENABLED is true and a real provider is wired in.
 */
export async function applySubscriptionEvent(event: SubscriptionEvent): Promise<{ applied: boolean }> {
  if (!env.PREMIUM_ENABLED) {
    logger.warn({ eventId: event.eventId }, "Received a subscription event while PREMIUM_ENABLED=false — ignoring.");
    return { applied: false };
  }

  if (await wasWebhookEventProcessed(event.provider, event.eventId)) {
    logger.info({ eventId: event.eventId }, "Webhook event already processed — skipping (idempotent).");
    return { applied: false };
  }

  await setMembershipTier({
    guildId: event.guildId,
    userId: event.userId,
    tier: event.tier,
    status: event.status,
    provider: event.provider,
    currentPeriodEnd: event.currentPeriodEnd ?? null,
  });
  await markWebhookEventProcessed(event.provider, event.eventId);

  return { applied: true };
}
