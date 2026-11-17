import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { isModeratorOrAbove } from "../utils/permissions.js";

const command: Command = {
  data: new SlashCommandBuilder().setName("bot-health").setDescription("Show bot uptime, latency, and resource usage (Moderator+)."),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    if (!isModeratorOrAbove(interaction.member)) {
      await interaction.reply({ content: "You need to be a Moderator or above to use this.", ephemeral: true });
      return;
    }

    const uptimeSec = Math.floor((interaction.client.uptime ?? 0) / 1000);
    const mem = process.memoryUsage();

    const embed = new EmbedBuilder()
      .setTitle("Bot health")
      .addFields(
        { name: "Uptime", value: `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m`, inline: true },
        { name: "Gateway latency", value: `${interaction.client.ws.ping}ms`, inline: true },
        { name: "Memory (RSS)", value: `${Math.round(mem.rss / 1024 / 1024)} MB`, inline: true },
        { name: "Node.js", value: process.version, inline: true }
      )
      .setColor(0x5865f2);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
