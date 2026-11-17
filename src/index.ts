import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client, Collection, GatewayIntentBits } from "discord.js";
import { env } from "./env.js";
import { logger } from "./logger.js";
import "./db/index.js"; // initializes the SQLite file + schema as a side effect
import { loadServerMap } from "./config/serverMap.js";
import { loadModules } from "./utils/loadFiles.js";
import type { BotEvent, Command } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

client.commands = new Collection();

async function bootstrap() {
  if (!loadServerMap()) {
    logger.warn(
      'No server-map.json found yet. Channel/role-aware features (tickets, verification, moderation logs, ...) will ' +
        'warn and no-op until you run `npm run setup:apply`.'
    );
  }

  const commands = await loadModules<Command>(path.join(__dirname, "commands"));
  for (const command of commands) client.commands.set(command.data.name, command);
  logger.info({ count: commands.length, names: commands.map((c) => c.data.name) }, "Loaded commands");

  const events = await loadModules<BotEvent>(path.join(__dirname, "events"));
  for (const event of events) {
    if (event.once) {
      client.once(event.name, (...args) => void Promise.resolve(event.execute(...args)).catch((err) => logger.error(err, `Error in once:${event.name}`)));
    } else {
      client.on(event.name, (...args) => void Promise.resolve(event.execute(...args)).catch((err) => logger.error(err, `Error in ${event.name}`)));
    }
  }
  logger.info({ count: events.length, names: events.map((e) => e.name) }, "Loaded events");

  await client.login(env.DISCORD_TOKEN);
}

bootstrap().catch((err) => {
  logger.error(err, "Fatal error during bootstrap");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error(reason, "Unhandled promise rejection");
});
