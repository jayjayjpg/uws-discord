import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { DAILY_REFLECTION_PROMPTS, pickRandomPrompt } from "../modules/engagement/prompts.js";

const command: Command = {
  data: new SlashCommandBuilder().setName("daily-prompt").setDescription("Get a reflection prompt to sit with, any time you want one."),
  async execute(interaction) {
    const prompt = pickRandomPrompt(DAILY_REFLECTION_PROMPTS);
    const embed = new EmbedBuilder().setTitle("🌤️ A Reflection For You").setDescription(prompt).setColor(0x5865f2);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
