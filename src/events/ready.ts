import type { BotEvent } from "../types.js";
import { logger } from "../logger.js";
import { loadServerMap } from "../config/serverMap.js";
import { ensureRulesMessage } from "../services/verification.js";

const event: BotEvent<"ready"> = {
  name: "ready",
  once: true,
  async execute(client) {
    logger.info({ tag: client.user?.tag }, "Bot is online");

    if (!loadServerMap()) return;
    for (const guild of client.guilds.cache.values()) {
      try {
        await ensureRulesMessage(guild);
      } catch (err) {
        logger.error(err, "Failed to ensure rules message on ready");
      }
    }
  },
};

export default event;
