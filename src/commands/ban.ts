import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { isAdministratorOrAbove } from "../utils/permissions.js";
import { postModLog } from "../modules/moderation/modLog.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member from the server (Administrator+ only).")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((o) => o.setName("user").setDescription("Member or user ID to ban").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(false))
    .addIntegerOption((o) => o.setName("delete_days").setDescription("Delete this many days of their recent messages (0-7)").setMinValue(0).setMaxValue(7)),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    if (!isAdministratorOrAbove(interaction.member)) {
      await interaction.reply({ content: "Banning requires the Administrator role or above.", ephemeral: true });
      return;
    }

    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? "No reason given";
    const deleteDays = interaction.options.getInteger("delete_days") ?? 0;

    const existingMember = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (existingMember && !existingMember.bannable) {
      await interaction.reply({ content: "I can't ban that member — check role hierarchy and my permissions.", ephemeral: true });
      return;
    }

    await existingMember?.send(`You've been banned from **${interaction.guild.name}**: ${reason}`).catch(() => null);

    try {
      await interaction.guild.bans.create(user.id, { reason, deleteMessageSeconds: deleteDays * 24 * 60 * 60 });
    } catch (err) {
      await interaction.reply({ content: `Failed to ban that user: ${(err as Error).message}`, ephemeral: true });
      return;
    }

    await postModLog(interaction.guild, {
      action: "🔨 Ban",
      target: { id: user.id, tag: user.tag },
      moderator: { id: interaction.user.id, tag: interaction.user.tag },
      reason,
      color: 0xc0392b,
    });

    await interaction.reply({ content: `${user.tag} has been banned.`, ephemeral: true });
  },
};

export default command;
