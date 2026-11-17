import type { BotEvent } from "../types.js";
import { runAutomod } from "../services/automod.js";
import { bumpMessageCount } from "../db/index.js";

const event: BotEvent<"messageCreate"> = {
  name: "messageCreate",
  async execute(message) {
    if (!message.inGuild() || message.author.bot) return;

    const actioned = await runAutomod(message);
    if (actioned) return;

    bumpMessageCount(message.guild.id, message.author.id);
  },
};

export default event;
