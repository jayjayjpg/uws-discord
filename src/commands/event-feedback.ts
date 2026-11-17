import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { addFeedback, getEvent } from "../db/events.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("event-feedback")
    .setDescription("Share feedback on a past event.")
    .addIntegerOption((o) => o.setName("event_id").setDescription("Event ID (see /event-list)").setRequired(true))
    .addIntegerOption((o) => o.setName("rating").setDescription("Rating 1-5 (optional)").setMinValue(1).setMaxValue(5))
    .addStringOption((o) => o.setName("comment").setDescription("Any comments? (optional)")),
  async execute(interaction) {
    if (!interaction.guild) return;

    const eventId = interaction.options.getInteger("event_id", true);
    const rating = interaction.options.getInteger("rating");
    const comment = interaction.options.getString("comment");
    const event = await getEvent(eventId);

    if (!event || event.status === "cancelled") {
      await interaction.reply({ content: `Couldn't find event #${eventId}.`, ephemeral: true });
      return;
    }
    if (event.startsAt.getTime() > Date.now()) {
      await interaction.reply({ content: "That event hasn't happened yet — come back after it's done!", ephemeral: true });
      return;
    }
    if (!rating && !comment) {
      await interaction.reply({ content: "Please provide a rating, a comment, or both.", ephemeral: true });
      return;
    }

    await addFeedback(eventId, interaction.user.id, rating, comment);
    await interaction.reply({ content: "Thanks for the feedback! 🙏", ephemeral: true });
  },
};

export default command;
