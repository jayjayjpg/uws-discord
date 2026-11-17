import { prisma } from "../../db/client.js";
import { env } from "../../env.js";
import { logger } from "../../logger.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = DAY_MS; // once a day is sufficient for a retention sweep

/**
 * Enforces MODERATION_LOG_RETENTION_DAYS: purges warnings and
 * reviewed/resolved reports older than the window. Open reports are never
 * auto-purged — an unresolved issue shouldn't silently disappear.
 */
export async function purgeExpiredModerationRecords(): Promise<void> {
  const cutoff = new Date(Date.now() - env.MODERATION_LOG_RETENTION_DAYS * DAY_MS);

  const warnings = await prisma.warning.deleteMany({ where: { createdAt: { lt: cutoff } } });
  const reports = await prisma.report.deleteMany({ where: { status: { not: "open" }, createdAt: { lt: cutoff } } });

  if (warnings.count > 0 || reports.count > 0) {
    logger.info(
      { warningsPurged: warnings.count, reportsPurged: reports.count, retentionDays: env.MODERATION_LOG_RETENTION_DAYS },
      "Purged expired moderation records per retention policy"
    );
  }
}

export function scheduleRetentionJob(): void {
  purgeExpiredModerationRecords().catch((err) => logger.error(err, "Failed initial retention purge"));
  setInterval(() => {
    purgeExpiredModerationRecords().catch((err) => logger.error(err, "Failed scheduled retention purge"));
  }, CHECK_INTERVAL_MS).unref();
}
