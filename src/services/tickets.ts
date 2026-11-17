import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  type Guild,
  type GuildMember,
} from "discord.js";
import { loadServerMap } from "../config/serverMap.js";
import { closeTicket as closeTicketInDb, createTicket, getOpenTicketByUser, getTicketByChannel } from "../db/index.js";
import { logger } from "../logger.js";

export const TICKET_CLOSE_CUSTOM_ID = "ticket:close";

/** Archive-then-delete policy decided with the user: lock + transcript immediately, delete 24h later. */
const TICKET_AUTO_DELETE_MS = 24 * 60 * 60 * 1000;

export interface OpenTicketResult {
  channelId?: string;
  error?: string;
}

export async function openTicket(guild: Guild, member: GuildMember): Promise<OpenTicketResult> {
  const map = loadServerMap();
  if (!map?.categories.tickets) {
    return { error: "Ticketing isn't configured yet — ask an admin to run the setup script." };
  }

  const existing = getOpenTicketByUser(guild.id, member.id);
  if (existing) {
    return { channelId: existing.channel_id, error: "You already have an open ticket:" };
  }

  const safeName = member.user.username
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .slice(0, 20);
  const channel = await guild.channels.create({
    name: `ticket-${safeName || "member"}`,
    type: ChannelType.GuildText,
    parent: map.categories.tickets,
    topic: `Ticket opened by ${member.user.tag} (${member.id})`,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: ["ViewChannel"] },
      { id: member.id, allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"] },
    ],
    reason: `Ticket opened by ${member.user.tag}`,
  });

  createTicket(guild.id, channel.id, member.id);

  const embed = new EmbedBuilder()
    .setTitle("🎫 Support Ticket")
    .setDescription(`Hi ${member}, a staff member will be with you shortly. Describe your issue below.\n\nUse the button when you're done to close this ticket.`)
    .setColor(0x3498db);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(TICKET_CLOSE_CUSTOM_ID).setLabel("Close Ticket").setEmoji("🔒").setStyle(ButtonStyle.Danger)
  );
  await channel.send({ content: `${member}`, embeds: [embed], components: [row] });

  return { channelId: channel.id };
}

export async function closeTicketChannel(guild: Guild, channelId: string, closedByTag: string, closedById: string): Promise<void> {
  const ticket = getTicketByChannel(channelId);
  if (!ticket || ticket.status === "closed") return;

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) return;

  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  const transcriptLines = messages
    ? [...messages.values()].reverse().map((m) => `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`)
    : ["(transcript unavailable)"];
  const transcript = new AttachmentBuilder(Buffer.from(transcriptLines.join("\n"), "utf-8"), { name: `${channel.name}-transcript.txt` });

  closeTicketInDb(channelId, closedById);

  const map = loadServerMap();
  if (map?.channels.ticketLogs) {
    const logChannel = await guild.channels.fetch(map.channels.ticketLogs).catch(() => null);
    if (logChannel && logChannel.type === ChannelType.GuildText) {
      await logChannel
        .send({
          embeds: [
            new EmbedBuilder()
              .setTitle("Ticket closed")
              .addFields(
                { name: "Channel", value: `#${channel.name}` },
                { name: "Opened by", value: `<@${ticket.opener_id}>` },
                { name: "Closed by", value: closedByTag }
              )
              .setColor(0x7f8c8d)
              .setTimestamp(new Date()),
          ],
          files: [transcript],
        })
        .catch((err) => logger.error(err, "Failed to post ticket transcript"));
    }
  }

  await channel.send(`🔒 This ticket was closed by **${closedByTag}**. The channel will be deleted automatically in 24 hours.`).catch(() => null);
  await channel.permissionOverwrites.edit(ticket.opener_id, { SendMessages: false }).catch((err) => logger.error(err, "Failed to lock ticket channel"));

  setTimeout(() => {
    channel.delete("Ticket auto-cleanup, 24h after close").catch((err) => logger.error(err, "Failed to auto-delete closed ticket channel"));
  }, TICKET_AUTO_DELETE_MS).unref();
}
