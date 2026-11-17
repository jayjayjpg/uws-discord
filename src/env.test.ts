import { describe, it, expect } from "vitest";
import { envSchema } from "./envSchema.js";

const BASE_VALID = {
  DISCORD_TOKEN: "fake-token",
  DISCORD_CLIENT_ID: "123",
  DISCORD_GUILD_ID: "456",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
};

describe("environment schema validation", () => {
  it("accepts a minimal valid configuration and fills in defaults", () => {
    const result = envSchema.safeParse(BASE_VALID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.COMMUNITY_NAME).toBe("COMMUNITY_NAME");
      expect(result.data.PREMIUM_ENABLED).toBe(false);
      expect(result.data.ENGAGEMENT_DAILY_PROMPT_ENABLED).toBe(true);
      expect(result.data.MODERATION_LOG_RETENTION_DAYS).toBe(180);
      expect(result.data.BOT_OWNER_IDS).toEqual([]);
    }
  });

  it("rejects a config missing a required field", () => {
    const { DISCORD_TOKEN: _omit, ...rest } = BASE_VALID;
    const result = envSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("parses PREMIUM_ENABLED=true as a real boolean, not the truthy string", () => {
    const result = envSchema.safeParse({ ...BASE_VALID, PREMIUM_ENABLED: "true" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.PREMIUM_ENABLED).toBe(true);
  });

  it("rejects a non-boolean-looking value for a boolean flag", () => {
    const result = envSchema.safeParse({ ...BASE_VALID, PREMIUM_ENABLED: "yes" });
    expect(result.success).toBe(false);
  });

  it("splits and trims BOT_OWNER_IDS into an array", () => {
    const result = envSchema.safeParse({ ...BASE_VALID, BOT_OWNER_IDS: " 111, 222 ,333" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.BOT_OWNER_IDS).toEqual(["111", "222", "333"]);
  });

  it("coerces MODERATION_LOG_RETENTION_DAYS to a number and rejects non-positive values", () => {
    const ok = envSchema.safeParse({ ...BASE_VALID, MODERATION_LOG_RETENTION_DAYS: "30" });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.MODERATION_LOG_RETENTION_DAYS).toBe(30);

    const bad = envSchema.safeParse({ ...BASE_VALID, MODERATION_LOG_RETENTION_DAYS: "-5" });
    expect(bad.success).toBe(false);
  });
});
