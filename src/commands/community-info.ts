import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { env } from "../env.js";

const command: Command = {
  data: new SlashCommandBuilder().setName("community-info").setDescription("What this community is about."),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle(`About ${env.COMMUNITY_NAME}`)
      .setDescription(
        [
          "An international, English-speaking community for mental health awareness and wellbeing, mindfulness and meditation, " +
            "emotional growth, personal development, and building healthy habits and resilience together.",
          "",
          "We aim to be professional, welcoming, inclusive, calm, and supportive.",
          "",
          "**Please keep in mind**: this is a peer-support community, not a therapy, medical, or crisis-response service. " +
            "See `/rules` for the full community guidelines, and `/report` if something doesn't feel right.",
        ].join("\n")
      )
      .setColor(0x5865f2);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
