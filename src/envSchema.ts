import { z } from "zod";

const booleanFlag = (defaultValue: "true" | "false") =>
  z
    .enum(["true", "false"])
    .optional()
    .default(defaultValue)
    .transform((value) => value === "true");

/**
 * All environment variables the project needs. Pulled into its own
 * side-effect-free module (no `dotenv/config` import, no process.exit) so it
 * can be unit-tested directly without needing a real .env file present.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).optional().default("development"),
  DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN is required (bot token, never hardcode it)"),
  DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID is required"),
  DISCORD_GUILD_ID: z.string().min(1, "DISCORD_GUILD_ID is required"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (Postgres connection string — see docker-compose.yml for a local one)"),
  COMMUNITY_NAME: z.string().optional().default("COMMUNITY_NAME"),
  PREMIUM_ENABLED: booleanFlag("false"),
  PAYMENT_PROVIDER: z.string().optional().default(""),
  PAYMENT_WEBHOOK_SECRET: z.string().optional().default(""),
  BOT_OWNER_IDS: z
    .string()
    .optional()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    ),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .optional()
    .default("info"),
  // How long resolved moderation records (warnings, reviewed/resolved reports) are kept before
  // automatic purge. Open reports are never auto-purged regardless of age.
  MODERATION_LOG_RETENTION_DAYS: z.coerce.number().int().positive().optional().default(180),
  // Toggle scheduled engagement prompts independently without touching code. All default on.
  ENGAGEMENT_DAILY_PROMPT_ENABLED: booleanFlag("true"),
  ENGAGEMENT_GRATITUDE_PROMPT_ENABLED: booleanFlag("true"),
  ENGAGEMENT_WEEKLY_CHALLENGE_ENABLED: booleanFlag("true"),
});
