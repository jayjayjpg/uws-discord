import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { isModeratorOrAbove } from "../utils/permissions.js";
import { addWarning } from "../db/warnings.js";
import { postModLog } from "../modules/moderation/modLog.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member and record it in the moderation log.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName("user").setDescription("Member to warn").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the warning").setRequired(true)),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    if (!isModeratorOrAbove(interaction.member)) {
      await interaction.reply({ content: "You need to be a Moderator or above to use this.", ephemeral: true });
      return;
    }

    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);

    await addWarning(interaction.guild.id, target.id, interaction.user.id, reason);
    await postModLog(interaction.guild, {
      action: "⚠️ Warn",
      target: { id: target.id, tag: target.tag },
      moderator: { id: interaction.user.id, tag: interaction.user.tag },
      reason,
      color: 0xf1c40f,
    });
    await target.send(`You've received a warning in **${interaction.guild.name}**: ${reason}`).catch(() => null);

    await interaction.reply({ content: `${target.tag} has been warned.`, ephemeral: true });
  },
};

export default command;
