import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, type ButtonInteraction, type Guild } from "discord.js";
import { loadServerMap } from "../config/serverMap.js";
import { logger } from "../logger.js";

export const ACCEPT_RULES_CUSTOM_ID = "verify:accept";

export const RULES_TEXT = [
  "**Welcome!** Please read the rules below, then click **I Accept** to unlock the rest of the server.",
  "",
  "1. Be respectful — no harassment, hate speech, or personal attacks.",
  "2. No spam, self-promotion, or unsolicited advertising.",
  "3. Keep content in the right channels and follow Discord's Terms of Service.",
  "4. Follow staff instructions — Moderators and Admins have the final say.",
  "5. No NSFW content.",
].join("\n");

/** Idempotent: posts the rules + accept button once, and leaves it alone on every later boot. */
export async function ensureRulesMessage(guild: Guild): Promise<void> {
  const map = loadServerMap();
  const rulesChannelId = map?.channels.rules;
  if (!rulesChannelId) return;

  const channel = await guild.channels.fetch(rulesChannelId).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) return;

  const recent = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  const alreadyPosted = recent?.some((m) => {
    if (m.author.id !== guild.client.user?.id) return false;
    // Best-effort structural check — message components can be plain action rows or newer
    // Components V2 types, so we just walk the JSON shape rather than fighting the full union type.
    const rows = (m.components as unknown as { components?: { customId?: string }[] }[]) ?? [];
    return rows.some((row) => row.components?.some((c) => c.customId === ACCEPT_RULES_CUSTOM_ID));
  });
  if (alreadyPosted) return;

  const embed = new EmbedBuilder().setTitle("📜 Server Rules").setDescription(RULES_TEXT).setColor(0x2ecc71);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(ACCEPT_RULES_CUSTOM_ID).setLabel("I Accept").setEmoji("✅").setStyle(ButtonStyle.Success)
  );
  await channel.send({ embeds: [embed], components: [row] });
  logger.info({ guild: guild.name }, "Posted rules message with accept button");
}

export async function handleAcceptRules(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) return;
  const map = loadServerMap();
  if (!map?.roles.member) {
    await interaction.reply({ content: "Verification isn't configured yet — ask an admin to run the setup script.", ephemeral: true });
    return;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);

  if (member.roles.cache.has(map.roles.member)) {
    await interaction.reply({ content: "You're already verified! Enjoy the server. 🎉", ephemeral: true });
    return;
  }

  try {
    await member.roles.add(map.roles.member, "Accepted rules");
    if (map.roles.newMember && member.roles.cache.has(map.roles.newMember)) {
      await member.roles.remove(map.roles.newMember, "Accepted rules");
    }
    await interaction.reply({ content: "You're verified! The rest of the server just unlocked for you. 🎉", ephemeral: true });
  } catch (err) {
    logger.error(err, "Failed to apply verification roles");
    await interaction.reply({ content: "Something went wrong assigning your roles — ping a staff member.", ephemeral: true });
  }
}
