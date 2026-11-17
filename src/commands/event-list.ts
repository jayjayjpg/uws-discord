import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { listUpcomingEvents } from "../db/events.js";
import { buildEmbedWithRsvps } from "../modules/events/eventService.js";

const command: Command = {
  data: new SlashCommandBuilder().setName("event-list").setDescription("List upcoming community events."),
  async execute(interaction) {
    if (!interaction.guild) return;
    const events = await listUpcomingEvents(interaction.guild.id);

    if (events.length === 0) {
      await interaction.reply({ content: "No upcoming events right now — check back soon!", ephemeral: true });
      return;
    }

    const embeds: EmbedBuilder[] = [];
    for (const event of events.slice(0, 10)) {
      embeds.push(await buildEmbedWithRsvps(event));
    }

    await interaction.reply({ embeds, ephemeral: true });
  },
};

export default command;
