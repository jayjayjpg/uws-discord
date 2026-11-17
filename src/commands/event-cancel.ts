import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { isEventApprover } from "../utils/permissions.js";
import { cancelEvent, getEvent, getRsvpUserIds } from "../db/events.js";
import { loadServerMap } from "../config/serverMap.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("event-cancel")
    .setDescription("Cancel an event.")
    .addIntegerOption((o) => o.setName("event_id").setDescription("Event ID (see /event-list)").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Why is this being cancelled?").setRequired(false)),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;

    const eventId = interaction.options.getInteger("event_id", true);
    const reason = interaction.options.getString("reason");
    const event = await getEvent(eventId);

    if (!event) {
      await interaction.reply({ content: `Couldn't find event #${eventId}.`, ephemeral: true });
      return;
    }
    if (event.status === "cancelled") {
      await interaction.reply({ content: `Event #${eventId} is already cancelled.`, ephemeral: true });
      return;
    }

    const isOwner = event.hostId === interaction.user.id || event.proposedBy === interaction.user.id;
    if (!isOwner && !isEventApprover(interaction.member)) {
      await interaction.reply({ content: "Only the event's host/proposer or a Community Manager+ can cancel it.", ephemeral: true });
      return;
    }

    if (event.discordEventId) {
      await interaction.guild.scheduledEvents.delete(event.discordEventId).catch(() => null);
    }
    await cancelEvent(eventId, reason);

    const map = loadServerMap();
    if (map?.channels.eventAnnouncements) {
      const channel = await interaction.guild.channels.fetch(map.channels.eventAnnouncements).catch(() => null);
      if (channel && channel.isTextBased()) {
        await channel.send(`❌ **${event.title}** (#${eventId}) has been cancelled.${reason ? ` Reason: ${reason}` : ""}`).catch(() => null);
      }
    }

    const goingUserIds = await getRsvpUserIds(eventId, "going");
    for (const userId of goingUserIds) {
      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      await member?.send(`**${event.title}** (which you RSVP'd to) has been cancelled.${reason ? ` Reason: ${reason}` : ""}`).catch(() => null);
    }

    await interaction.reply({ content: `Event #${eventId} cancelled.`, ephemeral: true });
  },
};

export default command;
