import { EmbedBuilder, type Guild } from "discord.js";
import { loadServerMap } from "../../config/serverMap.js";
import { logger } from "../../logger.js";
import { DAILY_REFLECTION_PROMPTS, GRATITUDE_PROMPTS, WEEKLY_CHALLENGES, pickPromptForDate } from "./prompts.js";

export async function postDailyPrompt(guild: Guild, now: Date): Promise<void> {
  const map = loadServerMap();
  const channelId = map?.channels.dailyCheckIn;
  if (!channelId) return;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const prompt = pickPromptForDate(DAILY_REFLECTION_PROMPTS, now);
  const embed = new EmbedBuilder()
    .setTitle("🌤️ Daily Reflection")
    .setDescription(`${prompt}\n\nShare as much or as little as you'd like — totally optional.`)
    .setColor(0x5865f2);
  await channel.send({ embeds: [embed] }).catch((err) => logger.error(err, "Failed to post daily reflection prompt"));
}

export async function postGratitudePrompt(guild: Guild, now: Date): Promise<void> {
  const map = loadServerMap();
  const channelId = map?.channels.gratitudeJournal;
  if (!channelId) return;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const prompt = pickPromptForDate(GRATITUDE_PROMPTS, now);
  const embed = new EmbedBuilder()
    .setTitle("🙏 Gratitude Prompt")
    .setDescription(`${prompt}\n\nNo pressure to post every day — drop in whenever it feels right.`)
    .setColor(0xf1c40f);
  await channel.send({ embeds: [embed] }).catch((err) => logger.error(err, "Failed to post gratitude prompt"));
}

export async function postWeeklyChallenge(guild: Guild, now: Date): Promise<void> {
  const map = loadServerMap();
  const channelId = map?.channels.communityChallenges;
  if (!channelId) return;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const challenge = pickPromptForDate(WEEKLY_CHALLENGES, now);
  const pingRoleId = map?.roles.weeklyChallengesPings;
  const ping = pingRoleId ? `<@&${pingRoleId}> ` : "";
  const embed = new EmbedBuilder().setTitle("🎯 This Week's Challenge").setDescription(`${challenge}\n\nEntirely optional — do what feels right for you.`).setColor(0x2ecc71);
  await channel.send({ content: ping || undefined, embeds: [embed] }).catch((err) => logger.error(err, "Failed to post weekly challenge"));
}
