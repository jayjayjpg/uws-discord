import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { isEventApprover } from "../utils/permissions.js";
import { getEvent, markReminderSent } from "../db/events.js";
import { buildEventEmbed } from "../modules/events/eventService.js";
import { loadServerMap } from "../config/serverMap.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("event-remind")
    .setDescription("Manually send a reminder for an event.")
    .addIntegerOption((o) => o.setName("event_id").setDescription("Event ID (see /event-list)").setRequired(true)),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;

    const eventId = interaction.options.getInteger("event_id", true);
    const event = await getEvent(eventId);

    if (!event || event.status !== "published") {
      await interaction.reply({ content: `Event #${eventId} isn't a published, upcoming event.`, ephemeral: true });
      return;
    }

    const isOwner = event.hostId === interaction.user.id;
    if (!isOwner && !isEventApprover(interaction.member)) {
      await interaction.reply({ content: "Only the event's host or a Community Manager+ can send a reminder.", ephemeral: true });
      return;
    }

    const map = loadServerMap();
    if (!map?.channels.eventAnnouncements) {
      await interaction.reply({ content: "Event announcements channel isn't configured yet.", ephemeral: true });
      return;
    }
    const channel = await interaction.guild.channels.fetch(map.channels.eventAnnouncements).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      await interaction.reply({ content: "Couldn't reach the event announcements channel.", ephemeral: true });
      return;
    }

    const pingRoleId = map.roles.communityEventsPings;
    const ping = pingRoleId ? `<@&${pingRoleId}> ` : "";
    await channel.send({ content: `${ping}Reminder!`, embeds: [buildEventEmbed(event)] });

    if (!event.reminderSentAt) await markReminderSent(event.id);
    await interaction.reply({ content: "Reminder sent.", ephemeral: true });
  },
};

export default command;
