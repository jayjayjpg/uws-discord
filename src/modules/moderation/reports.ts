import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, type ButtonInteraction, type Guild } from "discord.js";
import { loadServerMap } from "../../config/serverMap.js";
import { createReport, markReportStatus, type ReportStatus } from "../../db/reports.js";
import { isModeratorOrAbove } from "../../utils/permissions.js";
import { logger } from "../../logger.js";

const REPORT_CUSTOM_ID_PREFIX = "report:";

export interface SubmitReportInput {
  reporterId: string;
  reportedUserId?: string;
  reason: string;
  context?: string;
}

export type SubmitReportResult = { ok: true } | { ok: false; error: string };

function buildReviewRow(reportId: number): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`${REPORT_CUSTOM_ID_PREFIX}reviewed:${reportId}`).setLabel("Mark Reviewed").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`${REPORT_CUSTOM_ID_PREFIX}resolved:${reportId}`).setLabel("Resolve").setStyle(ButtonStyle.Success)
  );
}

/** Member-facing: submit a report. Posted only to the staff-only, access-controlled #member-reports channel. */
export async function submitReport(guild: Guild, input: SubmitReportInput): Promise<SubmitReportResult> {
  const map = loadServerMap();
  if (!map?.channels.memberReports) {
    return { ok: false, error: "Reporting isn't configured yet — please contact staff directly." };
  }
  const channel = await guild.channels.fetch(map.channels.memberReports).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) {
    return { ok: false, error: "Couldn't reach the reports channel — please contact staff directly." };
  }

  const report = await createReport(guild.id, input.reporterId, input.reportedUserId ?? null, input.reason, input.context ?? null);

  const embed = new EmbedBuilder()
    .setTitle(`🚩 New report #${report.id}`)
    .addFields(
      { name: "Reporter", value: `<@${input.reporterId}>` },
      { name: "Reported user", value: input.reportedUserId ? `<@${input.reportedUserId}>` : "Not specified" },
      { name: "Context", value: input.context ?? "Not provided" },
      { name: "Details", value: input.reason }
    )
    .setColor(0xe74c3c)
    .setTimestamp(new Date());

  await channel.send({ embeds: [embed], components: [buildReviewRow(report.id)] }).catch((err) => logger.error(err, "Failed to post report to #member-reports"));
  return { ok: true };
}

export function isReportCustomId(customId: string): boolean {
  return customId.startsWith(REPORT_CUSTOM_ID_PREFIX);
}

/** Staff-facing: the Mark Reviewed / Resolve buttons on a posted report. */
export async function handleReportReviewButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  if (!isModeratorOrAbove(interaction.member)) {
    await interaction.reply({ content: "Only Moderator+ can review reports.", ephemeral: true });
    return;
  }

  const [, action, idRaw] = interaction.customId.split(":");
  const id = Number(idRaw);
  const status: ReportStatus = action === "resolved" ? "resolved" : "reviewed";

  const report = await markReportStatus(id, status, interaction.user.id);
  if (!report) {
    await interaction.reply({ content: "Couldn't find that report — it may have already been removed.", ephemeral: true });
    return;
  }

  const sourceEmbed = interaction.message.embeds[0];
  const updatedEmbed = sourceEmbed
    ? EmbedBuilder.from(sourceEmbed).addFields({ name: status === "resolved" ? "Resolved by" : "Reviewed by", value: `<@${interaction.user.id}>` })
    : new EmbedBuilder().setTitle(`Report #${id}`);

  await interaction.update({ embeds: [updatedEmbed], components: status === "resolved" ? [] : [buildReviewRow(id)] });
}
