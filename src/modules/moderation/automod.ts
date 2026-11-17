import type { Message } from "discord.js";
import { isModeratorOrAbove } from "../../utils/permissions.js";
import { postModLog } from "./modLog.js";
import { logger } from "../../logger.js";

const INVITE_REGEX = /(discord\.gg\/|discord(?:app)?\.com\/invite\/)[a-z0-9-]+/i;
const MASS_MENTION_THRESHOLD = 5;
const RATE_LIMIT_WINDOW_MS = 7_000;
const RATE_LIMIT_MAX_MESSAGES = 6;

/** Per-user sliding window of recent message timestamps, in memory only. */
const recentMessageTimestamps = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = (recentMessageTimestamps.get(userId) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  recentMessageTimestamps.set(userId, timestamps);
  return timestamps.length > RATE_LIMIT_MAX_MESSAGES;
}

/**
 * Basic spam/link protection. Staff (Moderator+) are exempt. Returns true if
 * the message was actioned (deleted) so the caller can skip further
 * processing (e.g. engagement tracking) for it.
 */
export async function runAutomod(message: Message): Promise<boolean> {
  if (!message.inGuild() || message.author.bot) return false;
  if (message.member && isModeratorOrAbove(message.member)) return false;

  const reasons: string[] = [];
  if (INVITE_REGEX.test(message.content)) reasons.push("posted a Discord invite link");
  if (message.mentions.users.size + message.mentions.roles.size >= MASS_MENTION_THRESHOLD) reasons.push("mass-mention spam");
  if (isRateLimited(message.author.id)) reasons.push("exceeded the message rate limit (possible spam)");

  if (reasons.length === 0) return false;

  await message.delete().catch(() => null);
  await message.author.send(`Your message in **${message.guild.name}** was removed by automod: ${reasons.join(", ")}.`).catch(() => null);

  // Intentionally not logging message content here — policy is to avoid storing
  // full member message content by default (see spec section 5 / 12).
  await postModLog(message.guild, {
    action: "🚫 Automod",
    target: { id: message.author.id, tag: message.author.tag },
    moderator: { id: message.client.user?.id ?? "0", tag: "Automod" },
    reason: `${reasons.join("; ")} (message length: ${message.content.length} chars, deleted)`,
    color: 0x992d22,
  });

  logger.info({ user: message.author.tag, reasons }, "Automod action taken");
  return true;
}
