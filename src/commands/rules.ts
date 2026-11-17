import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { RULES_TEXT } from "../services/verification.js";

const command: Command = {
  data: new SlashCommandBuilder().setName("rules").setDescription("Show the server rules."),
  async execute(interaction) {
    const embed = new EmbedBuilder().setTitle("📜 Server Rules").setDescription(RULES_TEXT).setColor(0x2ecc71);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
