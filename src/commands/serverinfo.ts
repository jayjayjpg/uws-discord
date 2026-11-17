import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { getMessageCount, getTotalTrackedMessages } from "../db/index.js";

const command: Command = {
  data: new SlashCommandBuilder().setName("serverinfo").setDescription("Show server stats and your tracked activity."),
  async execute(interaction) {
    if (!interaction.guild) return;
    const guild = interaction.guild;

    const myMessages = getMessageCount(guild.id, interaction.user.id);
    const totalTracked = getTotalTrackedMessages(guild.id);

    const embed = new EmbedBuilder()
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL())
      .addFields(
        { name: "Members", value: `${guild.memberCount}`, inline: true },
        { name: "Roles", value: `${guild.roles.cache.size}`, inline: true },
        { name: "Channels", value: `${guild.channels.cache.size}`, inline: true },
        { name: "Created", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
        { name: "Your tracked messages", value: `${myMessages}`, inline: true },
        { name: "Total tracked messages", value: `${totalTracked}`, inline: true }
      )
      .setColor(0x5865f2);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
