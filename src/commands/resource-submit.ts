import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { submitResource } from "../modules/engagement/resources.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("resource-submit")
    .setDescription("Share a book, article, or resource with the community.")
    .addStringOption((o) => o.setName("title").setDescription("Title of the resource").setRequired(true))
    .addStringOption((o) => o.setName("url").setDescription("Link (optional)").setRequired(false))
    .addStringOption((o) => o.setName("notes").setDescription("Why are you sharing this? (optional)").setRequired(false)),
  async execute(interaction) {
    if (!interaction.guild) return;

    const title = interaction.options.getString("title", true);
    const url = interaction.options.getString("url") ?? undefined;
    const notes = interaction.options.getString("notes") ?? undefined;

    const result = await submitResource(interaction.guild, { submitterId: interaction.user.id, title, url, notes });

    await interaction.reply({
      content: result.ok ? "Thanks for sharing! Your resource has been posted. 📚" : result.error,
      ephemeral: true,
    });
  },
};

export default command;
