import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";

const command: Command = {
  data: new SlashCommandBuilder().setName("help").setDescription("List available commands."),
  async execute(interaction) {
    const commands = [...interaction.client.commands.values()].sort((a, b) => a.data.name.localeCompare(b.data.name));
    const embed = new EmbedBuilder()
      .setTitle("Available commands")
      .setDescription(commands.map((c) => `**/${c.data.name}** — ${c.data.description}`).join("\n"))
      .setFooter({ text: "Some commands are only visible/usable if you hold the right staff role." })
      .setColor(0x5865f2);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
