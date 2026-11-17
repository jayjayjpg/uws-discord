/**
 * Server configuration CLI.
 *
 *   npm run setup            -> dry run (default, no Discord writes at all)
 *   npm run setup:apply      -> actually create/update roles & channels
 *
 * Safe to run as many times as you like: it only creates what's missing and
 * reconciles permissions on things that already exist. It never deletes or
 * renames anything, and it never touches overwrite entries for
 * roles/users outside this blueprint (e.g. a mod's manual per-user mute).
 */
import { Client, GatewayIntentBits } from "discord.js";
import { env } from "../src/env.js";
import { logger } from "../src/logger.js";
import { formatPlan, runSetup } from "../src/services/setupService.js";

const apply = process.argv.includes("--apply");

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  await client.login(env.DISCORD_TOKEN);
  await new Promise<void>((resolve) => client.once("ready", () => resolve()));

  const guild = await client.guilds.fetch(env.DISCORD_GUILD_ID);
  logger.info({ guild: guild.name, apply }, apply ? "Applying server configuration..." : "Running dry-run (no changes will be made)...");

  const { plan, warnings, map } = await runSetup(guild, { apply });

  console.log(formatPlan(plan));

  if (warnings.length > 0) {
    console.log("\nWarnings:");
    for (const w of warnings) console.log(`  ! ${w}`);
  }

  if (!apply) {
    console.log("\nThis was a DRY RUN — nothing was changed. Review the plan above, then run `npm run setup:apply` to apply it.");
  } else {
    console.log(`\nDone. ${Object.keys(map.roles).length} roles, ${Object.keys(map.categories).length} categories, ${Object.keys(map.channels).length} channels mapped in server-map.json.`);
  }

  await client.destroy();
}

main().catch((err) => {
  logger.error(err, "Setup script failed");
  process.exit(1);
});
