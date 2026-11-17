import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { isAdministratorOrAbove } from "../utils/permissions.js";
import { runSetup } from "../services/setupService.js";
import { prisma } from "../db/client.js";
import { env } from "../env.js";
import { loadServerMap } from "../config/serverMap.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("server-audit")
    .setDescription("Run a full configuration + health audit of this server (Administrator+). Makes no changes.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    if (!isAdministratorOrAbove(interaction.member)) {
      await interaction.reply({ content: "You need to be an Administrator or above to use this.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const { plan, warnings } = await runSetup(interaction.guild, { apply: false });
    const toCreate = plan.filter((p) => p.action === "create").length;
    const toUpdate = plan.filter((p) => p.action === "update").length;
    const correct = plan.filter((p) => p.action === "skip").length;

    let dbOk = true;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbOk = false;
    }

    const map = loadServerMap();

    const embed = new EmbedBuilder()
      .setTitle(`Server audit — ${interaction.guild.name}`)
      .addFields(
        { name: "Blueprint vs. live server", value: `${correct} correct, ${toUpdate} need updating, ${toCreate} missing` },
        { name: "Setup warnings", value: warnings.length ? `${warnings.length} (see bot logs)` : "None", inline: true },
        { name: "server-map.json", value: map ? `Present (updated ${new Date(map.updatedAt).toLocaleString()})` : "Missing — run setup:apply", inline: true },
        { name: "Database", value: dbOk ? "✅ Connected" : "❌ Unreachable", inline: true },
        { name: "Premium membership", value: env.PREMIUM_ENABLED ? "Enabled" : "Disabled", inline: true },
        { name: "Moderation retention", value: `${env.MODERATION_LOG_RETENTION_DAYS} days`, inline: true },
        {
          name: "Engagement prompts",
          value: `Daily: ${env.ENGAGEMENT_DAILY_PROMPT_ENABLED ? "on" : "off"}, Gratitude: ${env.ENGAGEMENT_GRATITUDE_PROMPT_ENABLED ? "on" : "off"}, Weekly: ${env.ENGAGEMENT_WEEKLY_CHALLENGE_ENABLED ? "on" : "off"}`,
        }
      )
      .setColor(toCreate + toUpdate === 0 && dbOk ? 0x2ecc71 : 0xe67e22)
      .setTimestamp(new Date());

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
