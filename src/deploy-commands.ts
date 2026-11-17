/**
 * Registers slash commands with Discord.
 *
 *   npm run deploy-commands          -> registers to DISCORD_GUILD_ID only (instant, best for dev)
 *   npm run deploy-commands:global   -> registers globally (can take up to 1h to propagate)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REST, Routes } from "discord.js";
import { env } from "./env.js";
import { logger } from "./logger.js";
import { loadModules } from "./utils/loadFiles.js";
import type { Command } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const global = process.argv.includes("--global");

async function main() {
  const commands = await loadModules<Command>(path.join(__dirname, "commands"));
  const body = commands.map((c) => c.data.toJSON());

  const rest = new REST().setToken(env.DISCORD_TOKEN);
  const route = global ? Routes.applicationCommands(env.DISCORD_CLIENT_ID) : Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID);

  logger.info({ count: body.length, scope: global ? "global" : "guild", names: commands.map((c) => c.data.name) }, "Deploying slash commands...");
  await rest.put(route, { body });
  logger.info("Slash commands deployed.");
}

main().catch((err) => {
  logger.error(err, "Failed to deploy commands");
  process.exit(1);
});
