import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { listUpcomingEvents } from "../db/events.js";
import { buildEmbedWithRsvps } from "../modules/events/eventService.js";

// Thin alias of /event-list — the project brief names both "/events" (general
// commands) and "/event-list" (event commands) separately; rather than guess
// which one to drop, both exist and share the same underlying logic.
const command: Command = {
  data: new SlashCommandBuilder().setName("events").setDescription("See what's happening in the community."),
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
