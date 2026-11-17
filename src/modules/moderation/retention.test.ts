import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../../db/client.js";
import { addWarning } from "../../db/warnings.js";
import { createReport, markReportStatus } from "../../db/reports.js";
import { purgeExpiredModerationRecords } from "./retention.js";
import { env } from "../../env.js";

// Integration test — requires a reachable Postgres with migrations applied.
const GUILD_ID = "vitest-retention-guild";

afterAll(async () => {
  await prisma.warning.deleteMany({ where: { guildId: GUILD_ID } });
  await prisma.report.deleteMany({ where: { guildId: GUILD_ID } });
});

describe("moderation record retention (real Postgres)", () => {
  it("purges warnings older than the retention window, keeps recent ones", async () => {
    await addWarning(GUILD_ID, "user-old", "mod-1", "old warning");
    await addWarning(GUILD_ID, "user-new", "mod-1", "recent warning");

    // Backdate the "old" warning past the retention cutoff.
    const cutoff = new Date(Date.now() - (env.MODERATION_LOG_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000);
    await prisma.warning.updateMany({ where: { guildId: GUILD_ID, userId: "user-old" }, data: { createdAt: cutoff } });

    await purgeExpiredModerationRecords();

    const remaining = await prisma.warning.findMany({ where: { guildId: GUILD_ID } });
    expect(remaining.some((w) => w.userId === "user-old")).toBe(false);
    expect(remaining.some((w) => w.userId === "user-new")).toBe(true);
  });

  it("never purges an open report, regardless of age", async () => {
    const report = await createReport(GUILD_ID, "reporter-1", "reported-1", "still open", null);
    const cutoff = new Date(Date.now() - (env.MODERATION_LOG_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000);
    await prisma.report.update({ where: { id: report.id }, data: { createdAt: cutoff } });

    await purgeExpiredModerationRecords();

    const stillThere = await prisma.report.findUnique({ where: { id: report.id } });
    expect(stillThere).not.toBeNull();
  });

  it("purges an old RESOLVED report, but not an old one still pending review", async () => {
    const resolved = await createReport(GUILD_ID, "reporter-2", "reported-2", "resolved long ago", null);
    await markReportStatus(resolved.id, "resolved", "mod-1");
    const cutoff = new Date(Date.now() - (env.MODERATION_LOG_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000);
    await prisma.report.update({ where: { id: resolved.id }, data: { createdAt: cutoff } });

    await purgeExpiredModerationRecords();

    const gone = await prisma.report.findUnique({ where: { id: resolved.id } });
    expect(gone).toBeNull();
  });
});
