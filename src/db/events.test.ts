import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "./client.js";
import {
  createEvent,
  getEvent,
  approveAndPublishEvent,
  cancelEvent,
  upsertRsvp,
  getRsvpCounts,
  getRsvpUserIds,
  listUpcomingEvents,
  addFeedback,
} from "./events.js";

// Integration test — requires a reachable Postgres (see docker-compose.yml) with migrations applied.
const GUILD_ID = "vitest-events-guild";

afterAll(async () => {
  await prisma.eventFeedback.deleteMany({ where: { event: { guildId: GUILD_ID } } });
  await prisma.eventRsvp.deleteMany({ where: { event: { guildId: GUILD_ID } } });
  await prisma.event.deleteMany({ where: { guildId: GUILD_ID } });
});

describe("event lifecycle (real Postgres)", () => {
  it("creates an event as pending", async () => {
    const event = await createEvent({
      guildId: GUILD_ID,
      title: "Wednesday Reset",
      description: "Guided meditation.",
      startsAt: new Date(Date.now() + 60 * 60 * 1000),
      durationMinutes: 20,
      hostId: "facilitator-1",
      proposedBy: "facilitator-1",
      voiceChannelId: null,
    });
    expect(event.status).toBe("pending");
  });

  it("publishes a pending event and it then appears in the upcoming list", async () => {
    const event = await createEvent({
      guildId: GUILD_ID,
      title: "Sunday Reflection Circle",
      description: "Group reflection.",
      startsAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      durationMinutes: 45,
      hostId: "facilitator-1",
      proposedBy: "facilitator-1",
      voiceChannelId: null,
    });

    await approveAndPublishEvent(event.id, "cm-1", "discord-evt-abc");
    const published = await getEvent(event.id);
    expect(published?.status).toBe("published");
    expect(published?.approvedBy).toBe("cm-1");

    const upcoming = await listUpcomingEvents(GUILD_ID);
    expect(upcoming.some((e) => e.id === event.id)).toBe(true);
  });

  it("tracks RSVP counts correctly and lets a member change their mind", async () => {
    const event = await createEvent({
      guildId: GUILD_ID,
      title: "Book Club",
      description: "Monthly book club.",
      startsAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
      durationMinutes: 60,
      hostId: "host-1",
      proposedBy: "host-1",
      voiceChannelId: null,
    });
    await approveAndPublishEvent(event.id, "cm-1", null);

    await upsertRsvp(event.id, "member-a", "going");
    await upsertRsvp(event.id, "member-b", "interested");
    expect(await getRsvpCounts(event.id)).toEqual({ going: 1, interested: 1 });

    // member-a changes their mind
    await upsertRsvp(event.id, "member-a", "cancelled");
    expect(await getRsvpCounts(event.id)).toEqual({ going: 0, interested: 1 });
    expect(await getRsvpUserIds(event.id, "going")).toEqual([]);
  });

  it("cancelling an event removes it from the upcoming list", async () => {
    const event = await createEvent({
      guildId: GUILD_ID,
      title: "Monthly Workshop",
      description: "Personal growth workshop.",
      startsAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
      durationMinutes: 90,
      hostId: "host-1",
      proposedBy: "host-1",
      voiceChannelId: null,
    });
    await approveAndPublishEvent(event.id, "cm-1", null);
    await cancelEvent(event.id, "Host unavailable");

    const cancelled = await getEvent(event.id);
    expect(cancelled?.status).toBe("cancelled");
    expect(cancelled?.cancelReason).toBe("Host unavailable");

    const upcoming = await listUpcomingEvents(GUILD_ID);
    expect(upcoming.some((e) => e.id === event.id)).toBe(false);
  });

  it("accepts feedback on a past event", async () => {
    const event = await createEvent({
      guildId: GUILD_ID,
      title: "7-Day Mindfulness Challenge Kickoff",
      description: "Past event for feedback testing.",
      startsAt: new Date(Date.now() - 60 * 60 * 1000),
      durationMinutes: 30,
      hostId: "host-1",
      proposedBy: "host-1",
      voiceChannelId: null,
    });
    const feedback = await addFeedback(event.id, "member-a", 5, "Loved it!");
    expect(feedback.rating).toBe(5);
    expect(feedback.comment).toBe("Loved it!");
  });
});
