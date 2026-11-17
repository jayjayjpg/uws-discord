import { prisma } from "./client.js";
import type { Event as EventRecord } from "@prisma/client";

export interface CreateEventInput {
  guildId: string;
  title: string;
  description: string;
  startsAt: Date;
  durationMinutes: number;
  hostId: string;
  proposedBy: string;
  voiceChannelId: string | null;
}

export async function createEvent(input: CreateEventInput): Promise<EventRecord> {
  return prisma.event.create({ data: { ...input, status: "pending" } });
}

export async function getEvent(id: number): Promise<EventRecord | null> {
  return prisma.event.findUnique({ where: { id } });
}

export async function listUpcomingEvents(guildId: string): Promise<EventRecord[]> {
  return prisma.event.findMany({ where: { guildId, status: "published", startsAt: { gt: new Date() } }, orderBy: { startsAt: "asc" } });
}

export async function listEventsNeedingReminder(windowStart: Date, windowEnd: Date): Promise<EventRecord[]> {
  return prisma.event.findMany({ where: { status: "published", reminderSentAt: null, startsAt: { gte: windowStart, lte: windowEnd } } });
}

export async function markReminderSent(id: number): Promise<void> {
  await prisma.event.update({ where: { id }, data: { reminderSentAt: new Date() } });
}

export async function approveAndPublishEvent(id: number, approvedBy: string, discordEventId: string | null): Promise<EventRecord> {
  return prisma.event.update({
    where: { id },
    data: { status: "published", approvedBy, approvedAt: new Date(), discordEventId: discordEventId ?? undefined },
  });
}

export async function rejectEvent(id: number, rejectedBy: string): Promise<EventRecord> {
  return prisma.event.update({
    where: { id },
    data: { status: "cancelled", cancelledAt: new Date(), cancelReason: `Rejected during review by <@${rejectedBy}>` },
  });
}

export async function cancelEvent(id: number, reason: string | null): Promise<EventRecord> {
  return prisma.event.update({ where: { id }, data: { status: "cancelled", cancelledAt: new Date(), cancelReason: reason ?? undefined } });
}

export async function upsertRsvp(eventId: number, userId: string, status: "going" | "interested" | "cancelled") {
  return prisma.eventRsvp.upsert({
    where: { eventId_userId: { eventId, userId } },
    create: { eventId, userId, status },
    update: { status },
  });
}

export async function getRsvpCounts(eventId: number): Promise<{ going: number; interested: number }> {
  const [going, interested] = await Promise.all([
    prisma.eventRsvp.count({ where: { eventId, status: "going" } }),
    prisma.eventRsvp.count({ where: { eventId, status: "interested" } }),
  ]);
  return { going, interested };
}

export async function getRsvpUserIds(eventId: number, status: "going" | "interested" = "going"): Promise<string[]> {
  const rows = await prisma.eventRsvp.findMany({ where: { eventId, status }, select: { userId: true } });
  return rows.map((r) => r.userId);
}

export async function addFeedback(eventId: number, userId: string, rating: number | null, comment: string | null) {
  return prisma.eventFeedback.upsert({
    where: { eventId_userId: { eventId, userId } },
    create: { eventId, userId, rating: rating ?? undefined, comment: comment ?? undefined },
    update: { rating: rating ?? undefined, comment: comment ?? undefined },
  });
}
