import { ActionRowBuilder, StringSelectMenuBuilder, type StringSelectMenuInteraction } from "discord.js";
import { loadServerMap } from "../config/serverMap.js";
import type { RoleKey } from "../config/types.js";

export const SELF_ROLES_CUSTOM_ID = "selfroles:menu";

export const SELF_ASSIGNABLE_ROLES: { key: RoleKey; label: string; emoji: string; description: string }[] = [
  { key: "eventPings", label: "Event Pings", emoji: "📅", description: "Get notified about upcoming community events." },
  { key: "announcementPings", label: "Announcement Pings", emoji: "📢", description: "Get notified about official announcements." },
  { key: "communityUpdatesPings", label: "Community Updates Pings", emoji: "📰", description: "Get notified about community news & updates." },
];

export function buildSelfRolesMenu(currentlySelected: RoleKey[] = []): ActionRowBuilder<StringSelectMenuBuilder> {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(SELF_ROLES_CUSTOM_ID)
    .setPlaceholder("Choose notification roles to toggle...")
    .setMinValues(0)
    .setMaxValues(SELF_ASSIGNABLE_ROLES.length)
    .addOptions(
      SELF_ASSIGNABLE_ROLES.map((r) => ({
        label: r.label,
        value: r.key,
        emoji: r.emoji,
        description: r.description,
        default: currentlySelected.includes(r.key),
      }))
    );
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export async function handleSelfRolesSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.guild) return;
  const map = loadServerMap();
  if (!map) {
    await interaction.reply({ content: "Self-roles aren't configured yet — ask an admin to run the setup script.", ephemeral: true });
    return;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const selected = new Set(interaction.values as RoleKey[]);
  const added: string[] = [];
  const removed: string[] = [];

  for (const def of SELF_ASSIGNABLE_ROLES) {
    const roleId = map.roles[def.key];
    if (!roleId) continue;
    const has = member.roles.cache.has(roleId);
    const shouldHave = selected.has(def.key);
    if (shouldHave && !has) {
      await member.roles.add(roleId, "Self-assigned notification role");
      added.push(def.label);
    } else if (!shouldHave && has) {
      await member.roles.remove(roleId, "Self-unassigned notification role");
      removed.push(def.label);
    }
  }

  const parts: string[] = [];
  if (added.length) parts.push(`Added: ${added.join(", ")}`);
  if (removed.length) parts.push(`Removed: ${removed.join(", ")}`);
  await interaction.reply({ content: parts.length ? parts.join(" | ") : "No changes made.", ephemeral: true });
}
