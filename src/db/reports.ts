import { prisma } from "./client.js";
import type { Report } from "@prisma/client";

export type ReportStatus = "open" | "reviewed" | "resolved";

export async function createReport(
  guildId: string,
  reporterId: string,
  reportedUserId: string | null,
  reason: string,
  context: string | null
): Promise<Report> {
  return prisma.report.create({
    data: { guildId, reporterId, reportedUserId: reportedUserId ?? undefined, reason, context: context ?? undefined },
  });
}

export async function markReportStatus(id: number, status: ReportStatus, reviewerId: string): Promise<Report | null> {
  try {
    return await prisma.report.update({ where: { id }, data: { status, reviewedBy: reviewerId, reviewedAt: new Date() } });
  } catch {
    return null;
  }
}

export async function getOpenReports(guildId: string): Promise<Report[]> {
  return prisma.report.findMany({ where: { guildId, status: "open" }, orderBy: { createdAt: "desc" } });
}
