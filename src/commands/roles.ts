import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { buildInterestRolesMenu, buildNotificationRolesMenu, currentSelfRoleKeys } from "../modules/roles/selfRoles.js";
import { INTEREST_ROLES, NOTIFICATION_ROLES } from "../config/blueprint.js";
import { loadServerMap } from "../config/serverMap.js";

const command: Command = {
  data: new SlashCommandBuilder().setName("roles").setDescription("Pick optional interest and notification roles."),
  async execute(interaction) {
    const map = loadServerMap();
    const member = interaction.guild ? await interaction.guild.members.fetch(interaction.user.id) : null;
    const memberRoleIds = new Set(member ? member.roles.cache.keys() : []);

    const interestRow = buildInterestRolesMenu(currentSelfRoleKeys(memberRoleIds, map, INTEREST_ROLES));
    const notificationRow = buildNotificationRolesMenu(currentSelfRoleKeys(memberRoleIds, map, NOTIFICATION_ROLES));

    await interaction.reply({
      content:
        "**Interest roles** help others know what you're into. **Notification roles** opt you into pings for specific things. " +
        "Both are completely optional — pick as many or as few as you like, or clear your selection to remove them.",
      components: [interestRow, notificationRow],
      ephemeral: true,
    });
  },
};

export default command;
