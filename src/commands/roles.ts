import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { buildSelfRolesMenu, SELF_ASSIGNABLE_ROLES } from "../services/selfRoles.js";
import { loadServerMap } from "../config/serverMap.js";

const command: Command = {
  data: new SlashCommandBuilder().setName("roles").setDescription("Pick which optional notification roles you want."),
  async execute(interaction) {
    const map = loadServerMap();
    const member = interaction.guild ? await interaction.guild.members.fetch(interaction.user.id) : null;
    const current = member
      ? SELF_ASSIGNABLE_ROLES.filter((r) => {
          const roleId = map?.roles[r.key];
          return roleId && member.roles.cache.has(roleId);
        }).map((r) => r.key)
      : [];

    const row = buildSelfRolesMenu(current);
    await interaction.reply({
      content: "Choose which notification roles you want — pick multiple, or clear your selection to remove them all.",
      components: [row],
      ephemeral: true,
    });
  },
};

export default command;
