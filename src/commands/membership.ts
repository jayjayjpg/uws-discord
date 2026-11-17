import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { isAdministratorOrAbove } from "../utils/permissions.js";
import { getMembershipView, setTierAndSyncRole } from "../modules/membership/membershipService.js";
import type { MembershipTier } from "../db/membership.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("membership")
    .setDescription("View your membership status.")
    .addUserOption((o) => o.setName("user").setDescription("View/manage this member instead (Administrator+ only to view others or change tier)"))
    .addStringOption((o) =>
      o.setName("set").setDescription("Administrator+ only: set a member's tier").addChoices({ name: "Free", value: "free" }, { name: "Premium", value: "premium" })
    ),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;

    const targetUser = interaction.options.getUser("user") ?? interaction.user;
    const setValue = interaction.options.getString("set") as MembershipTier | null;
    const isSelf = targetUser.id === interaction.user.id;

    if ((setValue || !isSelf) && !isAdministratorOrAbove(interaction.member)) {
      await interaction.reply({ content: "Viewing another member's membership, or changing a tier, requires Administrator or above.", ephemeral: true });
      return;
    }

    if (setValue) {
      await setTierAndSyncRole(interaction.guild, targetUser.id, setValue);
      await interaction.reply({ content: `Set ${targetUser.tag}'s membership to **${setValue}**.`, ephemeral: true });
      return;
    }

    const view = await getMembershipView(interaction.guild.id, targetUser.id);
    const embed = new EmbedBuilder()
      .setTitle(`Membership — ${targetUser.tag}`)
      .addFields(
        { name: "Tier", value: view.tier === "premium" ? "✨ Premium" : "Free", inline: true },
        { name: "Status", value: view.status, inline: true }
      )
      .setColor(view.tier === "premium" ? 0x9b59b6 : 0x2ecc71);
    if (view.currentPeriodEnd) embed.addFields({ name: "Renews / ends", value: `<t:${Math.floor(view.currentPeriodEnd.getTime() / 1000)}:D>` });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
