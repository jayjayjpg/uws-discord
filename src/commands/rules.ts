import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { COMMUNITY_GUIDELINES_TEXT } from "../modules/onboarding/guidelines.js";

const command: Command = {
  data: new SlashCommandBuilder().setName("rules").setDescription("Show the community guidelines."),
  async execute(interaction) {
    const embed = new EmbedBuilder().setTitle("🌱 Community Guidelines").setDescription(COMMUNITY_GUIDELINES_TEXT).setColor(0x2ecc71);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
