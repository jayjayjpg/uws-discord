import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { getTicketByChannel } from "../db/index.js";
import { closeTicketChannel } from "../services/tickets.js";
import { isModeratorOrAbove } from "../utils/permissions.js";

const command: Command = {
  data: new SlashCommandBuilder().setName("close").setDescription("Close the current support ticket."),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;

    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket || ticket.status === "closed") {
      await interaction.reply({ content: "This isn't an open ticket channel.", ephemeral: true });
      return;
    }

    const isOpener = ticket.opener_id === interaction.user.id;
    if (!isOpener && !isModeratorOrAbove(interaction.member)) {
      await interaction.reply({ content: "Only the ticket opener or staff can close this.", ephemeral: true });
      return;
    }

    await interaction.reply("Closing ticket...");
    await closeTicketChannel(interaction.guild, interaction.channelId, interaction.user.tag, interaction.user.id);
  },
};

export default command;
