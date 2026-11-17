import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { submitReport } from "../modules/moderation/reports.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("report")
    .setDescription("Privately report a member or an issue to the staff team.")
    .addStringOption((o) => o.setName("reason").setDescription("What happened?").setRequired(true))
    .addUserOption((o) => o.setName("user").setDescription("The member you're reporting (optional)").setRequired(false))
    .addStringOption((o) => o.setName("context").setDescription("Where did this happen? (optional)").setRequired(false)),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;

    const reportedUser = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason", true);
    const context = interaction.options.getString("context") ?? undefined;

    const result = await submitReport(interaction.guild, {
      reporterId: interaction.user.id,
      reportedUserId: reportedUser?.id,
      reason,
      context,
    });

    await interaction.reply({
      content: result.ok
        ? "Thanks for letting us know — your report has been sent to the staff team privately. We'll review it as soon as we can."
        : result.error,
      ephemeral: true,
    });
  },
};

export default command;
