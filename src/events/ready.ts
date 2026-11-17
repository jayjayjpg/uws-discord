import type { BotEvent } from "../types.js";
import { logger } from "../logger.js";
import { loadServerMap } from "../config/serverMap.js";
import { ensureGuidelinesMessage } from "../modules/onboarding/guidelines.js";
import { ensureStartHereMessage } from "../modules/onboarding/welcome.js";
import { scheduleEventReminders } from "../modules/events/reminders.js";
import { scheduleEngagementPrompts } from "../modules/engagement/scheduler.js";

const event: BotEvent<"ready"> = {
  name: "ready",
  once: true,
  async execute(client) {
    logger.info({ tag: client.user?.tag }, "Bot is online");

    if (!loadServerMap()) return;

    for (const guild of client.guilds.cache.values()) {
      try {
        await ensureStartHereMessage(guild);
        await ensureGuidelinesMessage(guild);
      } catch (err) {
        logger.error(err, "Failed to ensure onboarding messages on ready");
      }
    }

    scheduleEventReminders(client);
    scheduleEngagementPrompts(client);
  },
};

export default event;
