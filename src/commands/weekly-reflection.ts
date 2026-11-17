import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { WEEKLY_REFLECTION_PROMPTS, pickRandomPrompt } from "../modules/engagement/prompts.js";

const command: Command = {
  data: new SlashCommandBuilder().setName("weekly-reflection").setDescription("Get a prompt for reflecting on your week so far."),
  async execute(interaction) {
    const prompt = pickRandomPrompt(WEEKLY_REFLECTION_PROMPTS);
    const embed = new EmbedBuilder().setTitle("📝 Weekly Reflection").setDescription(prompt).setColor(0x9b59b6);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
