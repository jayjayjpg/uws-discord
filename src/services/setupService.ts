import { type CategoryChannel, ChannelType, type Guild, PermissionsBitField, type TextChannel, type VoiceChannel } from "discord.js";
import { CATEGORY_BLUEPRINT, ROLE_BLUEPRINT } from "../config/blueprint.js";
import type { PermissionFlag, RoleKey, RoleOverwrite } from "../config/types.js";
import { emptyServerMap, loadServerMap, saveServerMap, type ServerMap } from "../config/serverMap.js";
import { flagsToBitfield, mergeOverwrites } from "./permissionUtils.js";
import { logger } from "../logger.js";

export interface PlanEntry {
  kind: "guild" | "role" | "role-order" | "category" | "channel" | "overwrite";
  key: string;
  action: "create" | "update" | "skip";
  description: string;
}

export interface SetupOptions {
  /** When false (the default), nothing is written to Discord — only a plan is produced. */
  apply: boolean;
}

export interface SetupOutcome {
  plan: PlanEntry[];
  warnings: string[];
  map: ServerMap;
}

function overwriteOptionsFromFlags(allow: Set<PermissionFlag>, deny: Set<PermissionFlag>): Partial<Record<PermissionFlag, boolean>> {
  const options: Partial<Record<PermissionFlag, boolean>> = {};
  for (const flag of allow) options[flag] = true;
  for (const flag of deny) options[flag] = false;
  return options;
}

/** Does the live overwrite for `targetId` already match the desired allow/deny flags? */
function overwriteMatches(
  current: { allow: PermissionsBitField; deny: PermissionsBitField } | undefined,
  allow: Set<PermissionFlag>,
  deny: Set<PermissionFlag>
): boolean {
  if (!current) return allow.size === 0 && deny.size === 0;
  for (const flag of allow) {
    if (!current.allow.has(flag)) return false;
  }
  for (const flag of deny) {
    if (!current.deny.has(flag)) return false;
  }
  return true;
}

export async function runSetup(guild: Guild, options: SetupOptions): Promise<SetupOutcome> {
  const { apply } = options;
  const plan: PlanEntry[] = [];
  const warnings: string[] = [];
  const map: ServerMap = loadServerMap() ?? emptyServerMap(guild.id);
  map.guildId = guild.id;

  await guild.roles.fetch();
  await guild.channels.fetch();

  // --- 0. Lock down @everyone's base guild permissions -----------------
  const everyone = guild.roles.everyone;
  if (everyone.permissions.bitfield !== 0n) {
    plan.push({
      kind: "guild",
      key: "@everyone",
      action: "update",
      description: "Strip @everyone's base guild permissions to 0 (visibility/posting is granted per-channel instead).",
    });
    if (apply) {
      await everyone.setPermissions(0n, "UWS setup: deny-by-default baseline for @everyone");
    }
  } else {
    plan.push({ kind: "guild", key: "@everyone", action: "skip", description: "@everyone already has no base permissions." });
  }

  // --- 1. Roles ------------------------------------------------------------
  for (const roleBp of ROLE_BLUEPRINT) {
    if (roleBp.key === "bot") {
      const botUserId = guild.client.user?.id;
      const managed = guild.roles.cache.find((r) => r.managed && r.tags?.botId === botUserId);
      if (!managed) {
        warnings.push(
          `Could not find this bot's managed role in "${guild.name}". Make sure the bot has been invited with the ` +
            `scopes/permissions from the README before running --apply.`
        );
        plan.push({ kind: "role", key: "bot", action: "skip", description: "Bot's managed role not found yet — invite the bot first." });
        continue;
      }
      map.roles.bot = managed.id;
      const desiredBits = flagsToBitfield(roleBp.permissions);
      if (managed.permissions.bitfield !== desiredBits) {
        plan.push({ kind: "role", key: "bot", action: "update", description: "Sync permissions on the bot's managed role." });
        if (apply) {
          try {
            await managed.setPermissions(desiredBits, "UWS setup: sync bot role permissions");
          } catch (err) {
            warnings.push(`Failed to update the bot's managed role permissions: ${(err as Error).message}`);
          }
        }
      } else {
        plan.push({ kind: "role", key: "bot", action: "skip", description: "Bot's managed role permissions already match." });
      }
      continue;
    }

    const existing = guild.roles.cache.find((r) => !r.managed && r.name === roleBp.name);
    if (!existing) {
      plan.push({ kind: "role", key: roleBp.key, action: "create", description: `Create role "${roleBp.name}".` });
      if (apply) {
        const created = await guild.roles.create({
          name: roleBp.name,
          color: roleBp.color,
          hoist: roleBp.hoist,
          mentionable: roleBp.mentionable,
          permissions: flagsToBitfield(roleBp.permissions),
          reason: "UWS setup script",
        });
        map.roles[roleBp.key] = created.id;
      }
      continue;
    }

    map.roles[roleBp.key] = existing.id;
    const desiredBits = flagsToBitfield(roleBp.permissions);
    const diffs: string[] = [];
    if (existing.permissions.bitfield !== desiredBits) diffs.push("permissions");
    if (existing.color !== roleBp.color) diffs.push("color");
    if (existing.hoist !== roleBp.hoist) diffs.push("hoist");
    if (existing.mentionable !== roleBp.mentionable) diffs.push("mentionable");

    if (diffs.length > 0) {
      plan.push({ kind: "role", key: roleBp.key, action: "update", description: `Update ${diffs.join(", ")} on role "${roleBp.name}".` });
      if (apply) {
        await existing.edit({
          color: roleBp.color,
          hoist: roleBp.hoist,
          mentionable: roleBp.mentionable,
          permissions: desiredBits,
          reason: "UWS setup script",
        });
      }
    } else {
      plan.push({ kind: "role", key: roleBp.key, action: "skip", description: `Role "${roleBp.name}" already matches.` });
    }
  }

  // --- 2. Role ordering (best-effort) --------------------------------------
  const orderedKeys = [...ROLE_BLUEPRINT].sort((a, b) => b.rank - a.rank).map((r) => r.key);
  const blueprintRoleIds = new Set(orderedKeys.map((k) => map.roles[k]).filter((id): id is string => Boolean(id)));
  plan.push({
    kind: "role-order",
    key: "hierarchy",
    action: "update",
    description: `Ensure role order (top → bottom): ${orderedKeys.map((k) => ROLE_BLUEPRINT.find((r) => r.key === k)?.name).join(" > ")}`,
  });
  if (apply) {
    try {
      const nonBlueprint = [...guild.roles.cache.values()]
        .filter((r) => r.id !== guild.id && !blueprintRoleIds.has(r.id))
        .sort((a, b) => b.position - a.position);
      const topToBottom = [...orderedKeys.map((k) => map.roles[k]).filter((id): id is string => Boolean(id)), ...nonBlueprint.map((r) => r.id)];
      const positions = topToBottom.map((id, idxFromTop) => ({ role: id, position: topToBottom.length - idxFromTop }));
      await guild.roles.setPositions(positions);
    } catch (err) {
      warnings.push(
        `Could not automatically reorder roles (${(err as Error).message}). This usually means the bot's own role ` +
          `isn't high enough yet — drag it above "Moderator" in Server Settings > Roles, then rerun setup.`
      );
    }
  }

  // --- 3. Categories + channels ---------------------------------------------
  for (const categoryBp of CATEGORY_BLUEPRINT) {
    let category = guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name === categoryBp.name) as
      | CategoryChannel
      | undefined;

    if (!category) {
      plan.push({ kind: "category", key: categoryBp.key, action: "create", description: `Create category "${categoryBp.name}".` });
      if (apply) {
        category = await guild.channels.create({ name: categoryBp.name, type: ChannelType.GuildCategory, reason: "UWS setup script" });
      }
    } else {
      plan.push({ kind: "category", key: categoryBp.key, action: "skip", description: `Category "${categoryBp.name}" already exists.` });
    }
    if (category) map.categories[categoryBp.key] = category.id;

    if (category) {
      await applyOverwrites(category, categoryBp.overwrites, undefined, map, guild, plan, warnings, apply, `category "${categoryBp.name}"`);
    }

    for (const channelBp of categoryBp.channels) {
      const isVoice = channelBp.type === "voice";
      const discordType = isVoice ? ChannelType.GuildVoice : ChannelType.GuildText;
      const label = isVoice ? `voice "${channelBp.name}"` : `#${channelBp.name}`;

      let channel = guild.channels.cache.find(
        (c) => c.type === discordType && c.parentId === (category?.id ?? null) && c.name === channelBp.name
      ) as TextChannel | VoiceChannel | undefined;

      if (!channel) {
        plan.push({ kind: "channel", key: channelBp.key, action: "create", description: `Create ${label} in "${categoryBp.name}".` });
        if (apply) {
          channel = await guild.channels.create({
            name: channelBp.name,
            type: discordType,
            parent: category?.id,
            topic: isVoice ? undefined : channelBp.topic,
            nsfw: isVoice ? undefined : channelBp.nsfw ?? false,
            reason: "UWS setup script",
          });
        }
      } else if (!isVoice && "setTopic" in channel) {
        const topicDiffers = channelBp.topic !== undefined && (channel.topic ?? undefined) !== channelBp.topic;
        if (topicDiffers) {
          plan.push({ kind: "channel", key: channelBp.key, action: "update", description: `Update topic on ${label}.` });
          if (apply) await channel.setTopic(channelBp.topic ?? null, "UWS setup script");
        } else {
          plan.push({ kind: "channel", key: channelBp.key, action: "skip", description: `${label} already exists.` });
        }
      } else {
        plan.push({ kind: "channel", key: channelBp.key, action: "skip", description: `${label} already exists.` });
      }
      if (channel) map.channels[channelBp.key] = channel.id;

      if (channel) {
        await applyOverwrites(channel, categoryBp.overwrites, channelBp.overwrites, map, guild, plan, warnings, apply, label);
      }
    }
  }

  if (apply) {
    map.updatedAt = new Date().toISOString();
    saveServerMap(map);
    logger.info({ path: "server-map.json" }, "Setup applied — server-map.json written.");
  }

  return { plan, warnings, map };
}

async function applyOverwrites(
  channel: CategoryChannel | TextChannel | VoiceChannel,
  categoryOverwrites: RoleOverwrite[],
  channelOverwrites: RoleOverwrite[] | undefined,
  map: ServerMap,
  guild: Guild,
  plan: PlanEntry[],
  warnings: string[],
  apply: boolean,
  label: string
): Promise<void> {
  const resolved = mergeOverwrites(categoryOverwrites, channelOverwrites);
  for (const [roleKey, { allow, deny }] of resolved) {
    if (allow.size === 0 && deny.size === 0) continue;
    const targetId = roleKey === "everyone" ? guild.roles.everyone.id : map.roles[roleKey as RoleKey];
    if (!targetId) {
      warnings.push(`Skipping overwrite for role "${roleKey}" on ${label} — role ID not known yet (run setup again after roles are created).`);
      continue;
    }
    const current = channel.permissionOverwrites.cache.get(targetId);
    if (overwriteMatches(current, allow, deny)) {
      plan.push({ kind: "overwrite", key: `${label}:${roleKey}`, action: "skip", description: `${label}: overwrite for "${roleKey}" already correct.` });
      continue;
    }
    plan.push({
      kind: "overwrite",
      key: `${label}:${roleKey}`,
      action: "update",
      description: `${label}: set overwrite for "${roleKey}" — allow [${[...allow].join(", ")}] deny [${[...deny].join(", ")}].`,
    });
    if (apply) {
      await channel.permissionOverwrites.edit(targetId, overwriteOptionsFromFlags(allow, deny), { reason: "UWS setup script" });
    }
  }
}

export function formatPlan(plan: PlanEntry[]): string {
  const lines: string[] = [];
  const grouped = {
    create: plan.filter((p) => p.action === "create"),
    update: plan.filter((p) => p.action === "update"),
    skip: plan.filter((p) => p.action === "skip"),
  };
  lines.push(`\nPlan summary: ${grouped.create.length} to create, ${grouped.update.length} to update, ${grouped.skip.length} already correct.\n`);
  for (const entry of [...grouped.create, ...grouped.update]) {
    const tag = entry.action === "create" ? "+ CREATE" : "~ UPDATE";
    lines.push(`  [${tag}] ${entry.description}`);
  }
  if (grouped.create.length === 0 && grouped.update.length === 0) {
    lines.push("  Nothing to do — the live server already matches the blueprint.");
  }
  return lines.join("\n");
}
