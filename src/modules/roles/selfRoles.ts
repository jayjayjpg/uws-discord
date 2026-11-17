import { ActionRowBuilder, StringSelectMenuBuilder, type StringSelectMenuInteraction } from "discord.js";
import { loadServerMap } from "../../config/serverMap.js";
import { INTEREST_ROLES, NOTIFICATION_ROLES } from "../../config/blueprint.js";
import type { RoleKey } from "../../config/types.js";

export const INTEREST_ROLES_CUSTOM_ID = "selfroles:interests";
export const NOTIFICATION_ROLES_CUSTOM_ID = "selfroles:notifications";

const SELF_ROLE_MENUS: Record<string, { key: RoleKey; label: string }[]> = {
  [INTEREST_ROLES_CUSTOM_ID]: INTEREST_ROLES,
  [NOTIFICATION_ROLES_CUSTOM_ID]: NOTIFICATION_ROLES,
};

export function isSelfRolesCustomId(customId: string): boolean {
  return customId in SELF_ROLE_MENUS;
}

function buildMenu(
  customId: string,
  placeholder: string,
  defs: { key: RoleKey; label: string }[],
  currentlySelected: RoleKey[]
): ActionRowBuilder<StringSelectMenuBuilder> {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder)
    .setMinValues(0)
    .setMaxValues(defs.length)
    .addOptions(defs.map((r) => ({ label: r.label, value: r.key, default: currentlySelected.includes(r.key) })));
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export function buildInterestRolesMenu(currentlySelected: RoleKey[] = []): ActionRowBuilder<StringSelectMenuBuilder> {
  return buildMenu(INTEREST_ROLES_CUSTOM_ID, "Choose interest roles (optional)...", INTEREST_ROLES, currentlySelected);
}

export function buildNotificationRolesMenu(currentlySelected: RoleKey[] = []): ActionRowBuilder<StringSelectMenuBuilder> {
  return buildMenu(NOTIFICATION_ROLES_CUSTOM_ID, "Choose notification roles (optional)...", NOTIFICATION_ROLES, currentlySelected);
}

export function currentSelfRoleKeys(memberRoleIds: Set<string>, map: ReturnType<typeof loadServerMap>, defs: { key: RoleKey; label: string }[]): RoleKey[] {
  if (!map) return [];
  return defs.filter((d) => {
    const roleId = map.roles[d.key];
    return roleId && memberRoleIds.has(roleId);
  }).map((d) => d.key);
}

export async function handleSelfRolesSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.guild) return;
  const defs = SELF_ROLE_MENUS[interaction.customId];
  if (!defs) return;

  const map = loadServerMap();
  if (!map) {
    await interaction.reply({ content: "Self-roles aren't configured yet — ask an admin to run the setup script.", ephemeral: true });
    return;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const selected = new Set(interaction.values as RoleKey[]);
  const added: string[] = [];
  const removed: string[] = [];

  for (const def of defs) {
    const roleId = map.roles[def.key];
    if (!roleId) continue;
    const has = member.roles.cache.has(roleId);
    const shouldHave = selected.has(def.key);
    if (shouldHave && !has) {
      await member.roles.add(roleId, "Self-assigned role");
      added.push(def.label);
    } else if (!shouldHave && has) {
      await member.roles.remove(roleId, "Self-unassigned role");
      removed.push(def.label);
    }
  }

  const parts: string[] = [];
  if (added.length) parts.push(`Added: ${added.join(", ")}`);
  if (removed.length) parts.push(`Removed: ${removed.join(", ")}`);
  await interaction.reply({ content: parts.length ? parts.join(" | ") : "No changes made.", ephemeral: true });
}
