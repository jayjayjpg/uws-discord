import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { isModeratorOrAbove } from "../utils/permissions.js";
import { getWarnings } from "../db/warnings.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("modlog")
    .setDescription("View a member's warning history (Moderator+).")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName("user").setDescription("Member to look up").setRequired(true)),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    if (!isModeratorOrAbove(interaction.member)) {
      await interaction.reply({ content: "You need to be a Moderator or above to use this.", ephemeral: true });
      return;
    }

    const user = interaction.options.getUser("user", true);
    const warnings = await getWarnings(interaction.guild.id, user.id);

    if (warnings.length === 0) {
      await interaction.reply({ content: `${user.tag} has no recorded warnings.`, ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`Warning history — ${user.tag}`)
      .setDescription(
        warnings
          .slice(0, 10)
          .map((w) => `**${w.createdAt.toISOString().slice(0, 10)}** by <@${w.moderatorId}>: ${w.reason}`)
          .join("\n")
      )
      .setFooter({ text: `${warnings.length} total warning(s)${warnings.length > 10 ? " — showing 10 most recent" : ""}` })
      .setColor(0xf1c40f);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
