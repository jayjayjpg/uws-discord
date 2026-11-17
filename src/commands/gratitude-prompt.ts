import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { GRATITUDE_PROMPTS, pickRandomPrompt } from "../modules/engagement/prompts.js";

const command: Command = {
  data: new SlashCommandBuilder().setName("gratitude-prompt").setDescription("Get a gratitude prompt, any time you want one."),
  async execute(interaction) {
    const prompt = pickRandomPrompt(GRATITUDE_PROMPTS);
    const embed = new EmbedBuilder().setTitle("🙏 A Gratitude Prompt For You").setDescription(prompt).setColor(0xf1c40f);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
