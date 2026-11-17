import { ChannelType, EmbedBuilder, type Guild, type GuildMember } from "discord.js";
import { env } from "../../env.js";
import { loadServerMap } from "../../config/serverMap.js";
import { logger } from "../../logger.js";

export async function sendWelcomeMessage(member: GuildMember): Promise<void> {
  const map = loadServerMap();
  if (!map?.channels.welcome) return;

  const channel = await member.guild.channels.fetch(map.channels.welcome).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) return;

  const startHereMention = map.channels.startHereGuide ? `<#${map.channels.startHereGuide}>` : "#start-here";
  const embed = new EmbedBuilder()
    .setTitle("👋 Welcome!")
    .setDescription(
      `Welcome to **${env.COMMUNITY_NAME}**, ${member}! We're glad you're here.\n\n` +
        `Head over to ${startHereMention} for a quick orientation, then read and acknowledge the community guidelines to unlock the rest of the space.`
    )
    .setColor(0x5865f2)
    .setThumbnail(member.user.displayAvatarURL());

  await channel.send({ embeds: [embed] }).catch((err) => logger.error(err, "Failed to send welcome message"));
}

/** Idempotent: posts a short orientation to #start-here once, and leaves it alone on every later boot. */
export async function ensureStartHereMessage(guild: Guild): Promise<void> {
  const map = loadServerMap();
  const channelId = map?.channels.startHereGuide;
  if (!channelId) return;

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) return;

  const recent = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  const alreadyPosted = recent?.some((m) => m.author.id === guild.client.user?.id);
  if (alreadyPosted) return;

  const guidelinesMention = map?.channels.communityGuidelines ? `<#${map.channels.communityGuidelines}>` : "#community-guidelines";
  const embed = new EmbedBuilder()
    .setTitle(`A quick orientation to ${env.COMMUNITY_NAME}`)
    .setDescription(
      [
        "Here's what you'll find around the community:",
        "",
        "**THE COMMUNITY** — general chat, daily check-ins, gratitude journaling, and celebrating wins.",
        "**EMOTIONAL GROWTH** — self-awareness, emotional intelligence, reflection, self-compassion, boundaries.",
        "**PERSONAL GROWTH** — habits, mindset, books, and recommendations.",
        "**MINDFULNESS & WELLBEING** — meditation, breathing exercises, and voice rooms to sit together quietly.",
        "**COMMUNITY EVENTS** — our recurring activities, like the Wednesday Reset and Sunday Reflection Circle.",
        "**SUPPORT & RESOURCES** — general support, and resources for finding professional help if you need it.",
        "",
        `Next step: head to ${guidelinesMention} and acknowledge the community guidelines to unlock everything above.`,
      ].join("\n")
    )
    .setColor(0x5865f2);

  await channel.send({ embeds: [embed] }).catch((err) => logger.error(err, "Failed to send start-here orientation message"));
}
