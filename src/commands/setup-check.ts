import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { isAdministratorOrAbove } from "../utils/permissions.js";
import { runSetup, formatPlan } from "../services/setupService.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("setup-check")
    .setDescription("Dry-run the server blueprint against this guild (Administrator+). Makes no changes.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    if (!isAdministratorOrAbove(interaction.member)) {
      await interaction.reply({ content: "You need to be an Administrator or above to use this.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const { plan, warnings } = await runSetup(interaction.guild, { apply: false });

    let body = `Dry run against "${interaction.guild.name}" — no changes were made.\n` + formatPlan(plan);
    if (body.length > 1850) body = `${body.slice(0, 1850)}\n... (truncated — see bot logs for the full plan)`;
    const warningsNote = warnings.length ? `\n\n${warnings.length} warning(s) — see bot logs for details.` : "";

    await interaction.editReply(`\`\`\`\n${body}\n\`\`\`${warningsNote}`);
  },
};

export default command;
