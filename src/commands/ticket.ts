import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { openTicket } from "../services/tickets.js";

const command: Command = {
  data: new SlashCommandBuilder().setName("ticket").setDescription("Open a private support ticket with staff."),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    await interaction.deferReply({ ephemeral: true });

    const result = await openTicket(interaction.guild, interaction.member);
    if (result.error && !result.channelId) {
      await interaction.editReply(result.error);
      return;
    }
    if (result.error) {
      await interaction.editReply(`${result.error} <#${result.channelId}>`);
      return;
    }
    await interaction.editReply(`Ticket created: <#${result.channelId}>`);
  },
};

export default command;
