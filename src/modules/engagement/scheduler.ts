import type { Client } from "discord.js";
import { env } from "../../env.js";
import { logger } from "../../logger.js";
import { getLastPosted, markPromptPosted, type EngagementPromptType } from "../../db/engagement.js";
import { postDailyPrompt, postGratitudePrompt, postWeeklyChallenge } from "./posting.js";

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // check every 10 minutes — plenty for once-a-day/week posts

// Fixed UTC hours/days chosen as a reasonable single compromise across timezones.
// Deliberately infrequent: daily (1x/day), gratitude (2x/week), weekly challenge (1x/week).
const DAILY_PROMPT_HOUR_UTC = 14;
const GRATITUDE_PROMPT_HOUR_UTC = 15;
const GRATITUDE_PROMPT_DAYS_UTC = [1, 4]; // Mon, Thu
const WEEKLY_CHALLENGE_HOUR_UTC = 14;
const WEEKLY_CHALLENGE_DAY_UTC = 1; // Monday

function sameUtcDay(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

async function alreadyPostedToday(guildId: string, promptType: EngagementPromptType, now: Date): Promise<boolean> {
  const last = await getLastPosted(guildId, promptType);
  return last !== null && sameUtcDay(last, now);
}

async function checkGuild(client: Client, guildId: string, now: Date): Promise<void> {
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return;

  if (env.ENGAGEMENT_DAILY_PROMPT_ENABLED && now.getUTCHours() === DAILY_PROMPT_HOUR_UTC) {
    if (!(await alreadyPostedToday(guildId, "daily", now))) {
      await postDailyPrompt(guild, now);
      await markPromptPosted(guildId, "daily", now);
    }
  }

  if (env.ENGAGEMENT_GRATITUDE_PROMPT_ENABLED && GRATITUDE_PROMPT_DAYS_UTC.includes(now.getUTCDay()) && now.getUTCHours() === GRATITUDE_PROMPT_HOUR_UTC) {
    if (!(await alreadyPostedToday(guildId, "gratitude", now))) {
      await postGratitudePrompt(guild, now);
      await markPromptPosted(guildId, "gratitude", now);
    }
  }

  if (env.ENGAGEMENT_WEEKLY_CHALLENGE_ENABLED && now.getUTCDay() === WEEKLY_CHALLENGE_DAY_UTC && now.getUTCHours() === WEEKLY_CHALLENGE_HOUR_UTC) {
    if (!(await alreadyPostedToday(guildId, "weeklyChallenge", now))) {
      await postWeeklyChallenge(guild, now);
      await markPromptPosted(guildId, "weeklyChallenge", now);
    }
  }
}

export function scheduleEngagementPrompts(client: Client): void {
  const run = async () => {
    const now = new Date();
    for (const guildId of client.guilds.cache.keys()) {
      await checkGuild(client, guildId, now).catch((err) => logger.error(err, "Failed engagement prompt check for guild"));
    }
  };
  run().catch((err) => logger.error(err, "Failed initial engagement prompt check"));
  setInterval(() => void run(), CHECK_INTERVAL_MS).unref();
}
