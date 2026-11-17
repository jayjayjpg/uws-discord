import { ChannelType, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { isCommunityManagerOrAbove } from "../utils/permissions.js";
import { loadServerMap } from "../config/serverMap.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Post an announcement to #announcements (Community Manager+).")
    .setDefaultMemberPermissions(PermissionFlagsBits.MentionEveryone)
    .addStringOption((o) => o.setName("message").setDescription("The announcement text").setRequired(true))
    .addBooleanOption((o) => o.setName("ping_everyone").setDescription("Also mention @everyone").setRequired(false)),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    if (!isCommunityManagerOrAbove(interaction.member)) {
      await interaction.reply({ content: "You need to be a Community Manager or above to use this.", ephemeral: true });
      return;
    }

    const map = loadServerMap();
    if (!map?.channels.announcements) {
      await interaction.reply({ content: "The announcements channel isn't configured yet — run the setup script.", ephemeral: true });
      return;
    }
    const channel = await interaction.guild.channels.fetch(map.channels.announcements).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildText) {
      await interaction.reply({ content: "Couldn't find the announcements channel.", ephemeral: true });
      return;
    }

    const message = interaction.options.getString("message", true);
    const pingEveryone = interaction.options.getBoolean("ping_everyone") ?? false;
    const embed = new EmbedBuilder()
      .setDescription(message)
      .setColor(0x5865f2)
      .setFooter({ text: `Posted by ${interaction.user.tag}` })
      .setTimestamp(new Date());

    await channel.send({ content: pingEveryone ? "@everyone" : undefined, embeds: [embed] });
    await interaction.reply({ content: `Announcement posted in ${channel}.`, ephemeral: true });
  },
};

export default command;
