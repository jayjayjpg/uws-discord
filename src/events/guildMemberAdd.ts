import { ChannelType, EmbedBuilder } from "discord.js";
import type { BotEvent } from "../types.js";
import { loadServerMap } from "../config/serverMap.js";
import { logger } from "../logger.js";

const event: BotEvent<"guildMemberAdd"> = {
  name: "guildMemberAdd",
  async execute(member) {
    const map = loadServerMap();
    if (!map) {
      logger.warn("guildMemberAdd fired but no server-map.json exists yet — run the setup script first.");
      return;
    }

    if (map.roles.newMember) {
      try {
        await member.roles.add(map.roles.newMember, "New member onboarding");
      } catch (err) {
        logger.error(err, "Failed to assign New Member role on join");
      }
    }

    if (map.channels.welcome) {
      const channel = await member.guild.channels.fetch(map.channels.welcome).catch(() => null);
      if (channel && channel.type === ChannelType.GuildText) {
        const rulesMention = map.channels.rules ? `<#${map.channels.rules}>` : "#rules";
        const embed = new EmbedBuilder()
          .setTitle("👋 Welcome!")
          .setDescription(`Welcome to **${member.guild.name}**, ${member}! Head over to ${rulesMention} and accept the rules to unlock the rest of the server.`)
          .setColor(0x5865f2)
          .setThumbnail(member.user.displayAvatarURL());
        await channel.send({ embeds: [embed] }).catch((err) => logger.error(err, "Failed to send welcome message"));
      }
    }
  },
};

export default event;
