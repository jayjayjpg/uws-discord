import { EmbedBuilder, type Guild } from "discord.js";
import { loadServerMap } from "../config/serverMap.js";
import { logger } from "../logger.js";

export interface ModLogEntry {
  action: string;
  target: { id: string; tag: string };
  moderator: { id: string; tag: string };
  reason: string;
  color?: number;
}

/** Posts a standardized embed to #moderator-log. No-ops (with a warning) if setup hasn't run yet. */
export async function postModLog(guild: Guild, entry: ModLogEntry): Promise<void> {
  const map = loadServerMap();
  if (!map?.channels.moderatorLog) {
    logger.warn("No moderator-log channel mapped yet — run the setup script. Skipping mod log post.");
    return;
  }
  const channel = await guild.channels.fetch(map.channels.moderatorLog).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle(entry.action)
    .addFields(
      { name: "Target", value: `${entry.target.tag} (${entry.target.id})` },
      { name: "Moderator", value: `${entry.moderator.tag} (${entry.moderator.id})` },
      { name: "Reason", value: entry.reason || "No reason given" }
    )
    .setColor(entry.color ?? 0xe67e22)
    .setTimestamp(new Date());

  await channel.send({ embeds: [embed] }).catch((err) => logger.error(err, "Failed to post to moderator-log"));
}
