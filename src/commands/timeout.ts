import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { isModeratorOrAbove } from "../utils/permissions.js";
import { postModLog } from "../services/moderation.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Time out a member for a set number of minutes.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName("user").setDescription("Member to time out").setRequired(true))
    .addIntegerOption((o) =>
      o.setName("minutes").setDescription("Duration in minutes (max 40320 = 28 days)").setRequired(true).setMinValue(1).setMaxValue(40320)
    )
    .addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(false)),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    if (!isModeratorOrAbove(interaction.member)) {
      await interaction.reply({ content: "You need to be a Moderator or above to use this.", ephemeral: true });
      return;
    }

    const user = interaction.options.getUser("user", true);
    const minutes = interaction.options.getInteger("minutes", true);
    const reason = interaction.options.getString("reason") ?? "No reason given";

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: "Couldn't find that member in this server.", ephemeral: true });
      return;
    }
    if (!member.moderatable) {
      await interaction.reply({ content: "I can't time out that member — check role hierarchy and my permissions.", ephemeral: true });
      return;
    }

    await member.timeout(minutes * 60 * 1000, reason);
    await postModLog(interaction.guild, {
      action: "⏱️ Timeout",
      target: { id: user.id, tag: user.tag },
      moderator: { id: interaction.user.id, tag: interaction.user.tag },
      reason: `${reason} (${minutes}m)`,
      color: 0xe67e22,
    });

    await interaction.reply({ content: `${user.tag} has been timed out for ${minutes} minute(s).`, ephemeral: true });
  },
};

export default command;
