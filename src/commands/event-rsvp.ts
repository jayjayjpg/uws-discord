import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { getEvent, getRsvpCounts, upsertRsvp } from "../db/events.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("event-rsvp")
    .setDescription("RSVP to a community event.")
    .addIntegerOption((o) => o.setName("event_id").setDescription("Event ID (see /event-list)").setRequired(true))
    .addStringOption((o) =>
      o
        .setName("status")
        .setDescription("Your RSVP status")
        .setRequired(true)
        .addChoices({ name: "Going", value: "going" }, { name: "Interested", value: "interested" }, { name: "Not going", value: "cancelled" })
    ),
  async execute(interaction) {
    if (!interaction.guild) return;

    const eventId = interaction.options.getInteger("event_id", true);
    const status = interaction.options.getString("status", true) as "going" | "interested" | "cancelled";
    const event = await getEvent(eventId);

    if (!event || event.status !== "published") {
      await interaction.reply({ content: `Event #${eventId} isn't a published, upcoming event.`, ephemeral: true });
      return;
    }
    if (event.startsAt.getTime() <= Date.now()) {
      await interaction.reply({ content: "That event has already happened.", ephemeral: true });
      return;
    }

    await upsertRsvp(eventId, interaction.user.id, status);
    const counts = await getRsvpCounts(eventId);

    const confirmation =
      status === "cancelled" ? "You're marked as not going." : status === "going" ? "You're marked as going! 🎉" : "You're marked as interested.";
    await interaction.reply({ content: `${confirmation} (${counts.going} going, ${counts.interested} interested)`, ephemeral: true });
  },
};

export default command;
