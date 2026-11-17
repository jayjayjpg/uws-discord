import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { isEventApprover, isEventProposer } from "../utils/permissions.js";
import { zonedWallTimeToUtc } from "../modules/events/timezone.js";
import { createEvent } from "../db/events.js";
import { approveAndPublish, postForReview, VOICE_CHANNEL_CHOICES } from "../modules/events/eventService.js";
import { loadServerMap } from "../config/serverMap.js";
import type { ChannelKey } from "../config/types.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("event-create")
    .setDescription("Propose or create a community event.")
    .addStringOption((o) => o.setName("title").setDescription("Event title").setRequired(true))
    .addStringOption((o) => o.setName("description").setDescription("What's this event about?").setRequired(true))
    .addStringOption((o) => o.setName("date").setDescription("Date, YYYY-MM-DD").setRequired(true))
    .addStringOption((o) => o.setName("time").setDescription("Time, 24h HH:MM").setRequired(true))
    .addStringOption((o) => o.setName("timezone").setDescription("IANA timezone, e.g. UTC or America/New_York").setRequired(true))
    .addIntegerOption((o) => o.setName("duration_minutes").setDescription("Duration in minutes (default 60)").setMinValue(5).setMaxValue(480))
    .addStringOption((o) => o.setName("voice_channel").setDescription("Host in one of our voice rooms (optional)").addChoices(...VOICE_CHANNEL_CHOICES))
    .addUserOption((o) => o.setName("host").setDescription("Who's hosting? (defaults to you)")),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    if (!isEventProposer(interaction.member)) {
      await interaction.reply({ content: "You need to be an Event Host, Facilitator, Community Manager, or above to propose events.", ephemeral: true });
      return;
    }

    const title = interaction.options.getString("title", true);
    const description = interaction.options.getString("description", true);
    const date = interaction.options.getString("date", true);
    const time = interaction.options.getString("time", true);
    const timezone = interaction.options.getString("timezone", true);
    const durationMinutes = interaction.options.getInteger("duration_minutes") ?? 60;
    const voiceChannelKey = interaction.options.getString("voice_channel") as ChannelKey | null;
    const host = interaction.options.getUser("host") ?? interaction.user;

    const startsAt = zonedWallTimeToUtc(date, time, timezone);
    if (!startsAt) {
      await interaction.reply({ content: "Couldn't parse that date/time/timezone — use YYYY-MM-DD, HH:MM (24h), and a valid IANA timezone like `UTC` or `America/New_York`.", ephemeral: true });
      return;
    }
    if (startsAt.getTime() <= Date.now()) {
      await interaction.reply({ content: "That start time is in the past — please pick a future date/time.", ephemeral: true });
      return;
    }

    const map = loadServerMap();
    const voiceChannelId = voiceChannelKey ? (map?.channels[voiceChannelKey] ?? null) : null;

    const event = await createEvent({
      guildId: interaction.guild.id,
      title,
      description,
      startsAt,
      durationMinutes,
      hostId: host.id,
      proposedBy: interaction.user.id,
      voiceChannelId,
    });

    if (isEventApprover(interaction.member)) {
      await approveAndPublish(interaction.guild, event.id, interaction.user.id);
      await interaction.reply({ content: `Event **#${event.id}** created and published! 🎉`, ephemeral: true });
    } else {
      await postForReview(interaction.guild, event);
      await interaction.reply({ content: `Event **#${event.id}** submitted for Community Manager review.`, ephemeral: true });
    }
  },
};

export default command;
