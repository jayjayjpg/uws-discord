import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { isModeratorOrAbove } from "../utils/permissions.js";
import { postModLog } from "../modules/moderation/modLog.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((o) => o.setName("user").setDescription("Member to kick").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(false)),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    if (!isModeratorOrAbove(interaction.member)) {
      await interaction.reply({ content: "You need to be a Moderator or above to use this.", ephemeral: true });
      return;
    }

    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? "No reason given";

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: "Couldn't find that member in this server.", ephemeral: true });
      return;
    }
    if (!member.kickable) {
      await interaction.reply({ content: "I can't kick that member — check role hierarchy and my permissions.", ephemeral: true });
      return;
    }

    await member.send(`You've been kicked from **${interaction.guild.name}**: ${reason}`).catch(() => null);
    await member.kick(reason);
    await postModLog(interaction.guild, {
      action: "👢 Kick",
      target: { id: user.id, tag: user.tag },
      moderator: { id: interaction.user.id, tag: interaction.user.tag },
      reason,
      color: 0xd35400,
    });

    await interaction.reply({ content: `${user.tag} has been kicked.`, ephemeral: true });
  },
};

export default command;
