import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { isAdministratorOrAbove } from "../utils/permissions.js";
import { env } from "../env.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("config-report")
    .setDescription("Show current non-secret configuration (Administrator+).")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    if (!isAdministratorOrAbove(interaction.member)) {
      await interaction.reply({ content: "You need to be an Administrator or above to use this.", ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Current configuration")
      .addFields(
        { name: "Environment", value: env.NODE_ENV, inline: true },
        { name: "Community name", value: env.COMMUNITY_NAME, inline: true },
        { name: "Premium membership", value: env.PREMIUM_ENABLED ? "Enabled" : "Disabled", inline: true },
        { name: "Payment provider", value: env.PAYMENT_PROVIDER || "Not set", inline: true },
        { name: "Moderation retention", value: `${env.MODERATION_LOG_RETENTION_DAYS} days`, inline: true },
        { name: "Log level", value: env.LOG_LEVEL, inline: true },
        { name: "Daily prompt", value: env.ENGAGEMENT_DAILY_PROMPT_ENABLED ? "on" : "off", inline: true },
        { name: "Gratitude prompt", value: env.ENGAGEMENT_GRATITUDE_PROMPT_ENABLED ? "on" : "off", inline: true },
        { name: "Weekly challenge", value: env.ENGAGEMENT_WEEKLY_CHALLENGE_ENABLED ? "on" : "off", inline: true }
      )
      .setFooter({ text: "Secrets (bot token, database URL, webhook secret) are never shown here." })
      .setColor(0x5865f2);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
