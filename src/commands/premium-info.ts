import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { env } from "../env.js";

const PREMIUM_PERKS = [
  "Additional guided meditation sessions",
  "Extended workshops",
  "Curated learning resources",
  "Small-group learning experiences",
  "Premium community events",
].join("\n• ");

const command: Command = {
  data: new SlashCommandBuilder().setName("premium-info").setDescription("Learn about premium membership."),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("✨ Premium Membership")
      .setDescription(
        `Premium adds extra content and experiences on top of everything in the free community:\n\n• ${PREMIUM_PERKS}\n\n` +
          "Premium is about **more** access and content — not a better path to feeling better. Every core support space, " +
          "peer discussion, and basic session stays free for everyone, always."
      )
      .setColor(0x9b59b6)
      .setFooter({
        text: env.PREMIUM_ENABLED
          ? "Premium is currently available."
          : "Premium isn't available yet — we'll announce it here once it's ready.",
      });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
