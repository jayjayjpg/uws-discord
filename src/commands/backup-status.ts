import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { isAdministratorOrAbove } from "../utils/permissions.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("backup-status")
    .setDescription("Show database backup guidance (Administrator+).")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    if (!isAdministratorOrAbove(interaction.member)) {
      await interaction.reply({ content: "You need to be an Administrator or above to use this.", ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Database backups")
      .setDescription(
        "This bot doesn't run its own backup job — backups are a hosting-layer concern, not something the Discord bot " +
          "process should own.\n\n" +
          "**Self-hosting Postgres?** Schedule `pg_dump` (e.g. via cron) to a secure, separate location.\n" +
          "**Using a managed Postgres provider** (Railway, Render, Supabase, RDS, etc.)? Enable their built-in automated " +
          "backups / point-in-time recovery — most include this by default.\n\n" +
          "See the README's deployment section for specifics."
      )
      .setColor(0xe67e22);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
