import type { Client } from "discord.js";
import type { Event as EventRecord } from "@prisma/client";
import { listEventsNeedingReminder, markReminderSent } from "../../db/events.js";
import { loadServerMap } from "../../config/serverMap.js";
import { buildEventEmbed } from "./eventService.js";
import { logger } from "../../logger.js";

const REMINDER_LOOKAHEAD_MINUTES = 60;
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

async function sendReminder(client: Client, event: EventRecord): Promise<void> {
  const guild = await client.guilds.fetch(event.guildId).catch(() => null);
  if (!guild) return;

  const map = loadServerMap();
  const channelId = map?.channels.eventAnnouncements;
  if (!channelId) return;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const pingRoleId = map?.roles.communityEventsPings;
  const ping = pingRoleId ? `<@&${pingRoleId}> ` : "";
  await channel.send({ content: `${ping}Reminder: this is starting soon!`, embeds: [buildEventEmbed(event)] }).catch((err) => logger.error(err, "Failed to send event reminder"));
}

async function checkAndSendReminders(client: Client): Promise<void> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_LOOKAHEAD_MINUTES * 60_000);
  const due = await listEventsNeedingReminder(now, windowEnd);

  for (const event of due) {
    await sendReminder(client, event);
    await markReminderSent(event.id);
  }
}

/** Every 5 minutes, reminds about published events starting within the next hour (once per event). */
export function scheduleEventReminders(client: Client): void {
  const run = () => checkAndSendReminders(client).catch((err) => logger.error(err, "Failed event reminder sweep"));
  run();
  setInterval(run, CHECK_INTERVAL_MS).unref();
}
