import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  type ButtonInteraction,
  type Guild,
} from "discord.js";
import type { Event as EventRecord } from "@prisma/client";
import { loadServerMap } from "../../config/serverMap.js";
import type { ChannelKey } from "../../config/types.js";
import { approveAndPublishEvent, getEvent, getRsvpCounts, rejectEvent } from "../../db/events.js";
import { isEventApprover } from "../../utils/permissions.js";
import { logger } from "../../logger.js";

const EVENT_CUSTOM_ID_PREFIX = "event:";

export const VOICE_CHANNEL_CHOICES: { name: string; value: ChannelKey }[] = [
  { name: "Meditation Room", value: "meditationRoomVoice" },
  { name: "Quiet Space", value: "quietSpaceVoice" },
  { name: "Live Gatherings", value: "liveGatheringsVoice" },
  { name: "Premium Gathering", value: "premiumGatheringVoice" },
];

export function buildEventEmbed(event: Pick<EventRecord, "id" | "title" | "description" | "startsAt" | "durationMinutes" | "hostId">, rsvpCounts?: { going: number; interested: number }) {
  const unix = Math.floor(event.startsAt.getTime() / 1000);
  const fields = [
    { name: "When", value: `<t:${unix}:F> (<t:${unix}:R>)` },
    { name: "Duration", value: `${event.durationMinutes} minutes` },
    { name: "Host", value: `<@${event.hostId}>` },
  ];
  if (rsvpCounts) fields.push({ name: "RSVPs", value: `${rsvpCounts.going} going, ${rsvpCounts.interested} interested` });
  return new EmbedBuilder().setTitle(`🗓️ ${event.title} (#${event.id})`).setDescription(event.description).addFields(fields).setColor(0x3498db);
}

async function publishToDiscord(guild: Guild, event: EventRecord): Promise<string | null> {
  try {
    const scheduledEndTime = new Date(event.startsAt.getTime() + event.durationMinutes * 60_000);
    const created = event.voiceChannelId
      ? await guild.scheduledEvents.create({
          name: event.title,
          description: event.description,
          scheduledStartTime: event.startsAt,
          scheduledEndTime,
          privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
          entityType: GuildScheduledEventEntityType.Voice,
          channel: event.voiceChannelId,
        })
      : await guild.scheduledEvents.create({
          name: event.title,
          description: event.description,
          scheduledStartTime: event.startsAt,
          scheduledEndTime,
          privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
          entityType: GuildScheduledEventEntityType.External,
          entityMetadata: { location: "See #event-discussion for details" },
        });
    return created.id;
  } catch (err) {
    logger.error(err, "Failed to create Discord scheduled event — event is still published in our own tracking");
    return null;
  }
}

/** Posts the proposal to #event-planning with Approve/Reject buttons for Community Manager+ to act on. */
export async function postForReview(guild: Guild, event: EventRecord): Promise<void> {
  const map = loadServerMap();
  if (!map?.channels.eventPlanning) return;
  const channel = await guild.channels.fetch(map.channels.eventPlanning).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`event:approve:${event.id}`).setLabel("Approve & Publish").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`event:reject:${event.id}`).setLabel("Reject").setStyle(ButtonStyle.Danger)
  );
  await channel
    .send({ content: `New event proposal from <@${event.proposedBy}> — needs Community Manager review.`, embeds: [buildEventEmbed(event)], components: [row] })
    .catch((err) => logger.error(err, "Failed to post event for review"));
}

/** Approves an event (if still pending), publishes it to Discord Scheduled Events, and announces it. */
export async function approveAndPublish(guild: Guild, eventId: number, approverId: string): Promise<boolean> {
  const event = await getEvent(eventId);
  if (!event || event.status !== "pending") return false;

  const discordEventId = await publishToDiscord(guild, event);
  await approveAndPublishEvent(eventId, approverId, discordEventId);

  const map = loadServerMap();
  const embed = buildEventEmbed(event);
  const pingRoleId = map?.roles.communityEventsPings;
  const ping = pingRoleId ? `<@&${pingRoleId}> ` : "";

  if (map?.channels.eventAnnouncements) {
    const channel = await guild.channels.fetch(map.channels.eventAnnouncements).catch(() => null);
    if (channel && channel.isTextBased()) {
      await channel.send({ content: `${ping}New event published!`, embeds: [embed] }).catch((err) => logger.error(err, "Failed to post event announcement"));
    }
  }
  if (map?.channels.eventCalendar) {
    const channel = await guild.channels.fetch(map.channels.eventCalendar).catch(() => null);
    if (channel && channel.isTextBased()) {
      await channel.send({ embeds: [embed] }).catch((err) => logger.error(err, "Failed to post to event calendar"));
    }
  }
  return true;
}

export async function buildEmbedWithRsvps(event: EventRecord) {
  const counts = await getRsvpCounts(event.id);
  return buildEventEmbed(event, counts);
}

export function isEventReviewCustomId(customId: string): boolean {
  return customId.startsWith(EVENT_CUSTOM_ID_PREFIX);
}

/** Staff-facing: the Approve & Publish / Reject buttons posted in #event-planning. */
export async function handleEventReviewButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  if (!isEventApprover(interaction.member)) {
    await interaction.reply({ content: "Only Community Manager+ can approve or reject event proposals.", ephemeral: true });
    return;
  }

  const [, action, idRaw] = interaction.customId.split(":");
  const eventId = Number(idRaw);

  if (action === "approve") {
    const ok = await approveAndPublish(interaction.guild, eventId, interaction.user.id);
    await interaction.update({
      content: ok ? `✅ Approved and published by <@${interaction.user.id}>.` : "This event is no longer pending (already handled).",
      components: [],
    });
    return;
  }

  if (action === "reject") {
    await rejectEvent(eventId, interaction.user.id);
    await interaction.update({ content: `❌ Rejected by <@${interaction.user.id}>.`, components: [] });
  }
}
