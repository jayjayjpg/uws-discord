import type { BotEvent } from "../types.js";
import { loadServerMap } from "../config/serverMap.js";
import { logger } from "../logger.js";
import { sendWelcomeMessage } from "../modules/onboarding/welcome.js";

const event: BotEvent<"guildMemberAdd"> = {
  name: "guildMemberAdd",
  async execute(member) {
    const map = loadServerMap();
    if (!map) {
      logger.warn("guildMemberAdd fired but no server-map.json exists yet — run the setup script first.");
      return;
    }

    if (map.roles.newMember) {
      try {
        await member.roles.add(map.roles.newMember, "New member onboarding");
      } catch (err) {
        logger.error(err, "Failed to assign New Member role on join");
      }
    }

    await sendWelcomeMessage(member);
  },
};

export default event;
