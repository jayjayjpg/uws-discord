import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, type ButtonInteraction, type Guild } from "discord.js";
import { loadServerMap } from "../../config/serverMap.js";
import { logger } from "../../logger.js";
import { buildInterestRolesMenu, buildNotificationRolesMenu } from "../roles/selfRoles.js";

export const ACKNOWLEDGE_GUIDELINES_CUSTOM_ID = "onboarding:acknowledge-guidelines";

export const COMMUNITY_GUIDELINES_TEXT = [
  "This is a peer-support and personal-growth community — please read this before joining in, then click **I Acknowledge** below.",
  "",
  "**What this community is**",
  "A space for mutual support, reflection, and growth around mental wellbeing, mindfulness, and personal development.",
  "",
  "**What this community is *not***",
  "- Not a therapy, medical, or crisis-response service.",
  "- Participation is voluntary — you're never expected to act as anyone's therapist.",
  "- Confidentiality can't be guaranteed in a group chat setting — keep that in mind before sharing.",
  "- This community is not monitored 24/7. If you're in immediate danger, please contact your local emergency services right away.",
  "",
  "**Please don't**",
  "- Diagnose other members or present opinions as medical advice.",
  "- Give unsolicited counselling, treatment instructions, or pressure anyone to share personal experiences.",
  "- Harass, bully, discriminate against, or manipulate other members.",
  "- Share screenshots or private conversations without the other person's consent.",
  "- Promote unverified cures or dangerous treatment advice.",
  "",
  "**Please do**",
  "- Be kind, patient, and respectful — everyone is at a different point in their journey.",
  "- Keep conversations in the right channels.",
  "- Reach out to staff, or use `/report`, if something doesn't feel right.",
  "- Look after yourself — step away if a conversation isn't serving you.",
].join("\n");

/** Idempotent: posts the guidelines + acknowledge button once, and leaves it alone on every later boot. */
export async function ensureGuidelinesMessage(guild: Guild): Promise<void> {
  const map = loadServerMap();
  const channelId = map?.channels.communityGuidelines;
  if (!channelId) return;

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) return;

  const recent = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  const alreadyPosted = recent?.some((m) => {
    if (m.author.id !== guild.client.user?.id) return false;
    const rows = (m.components as unknown as { components?: { customId?: string }[] }[]) ?? [];
    return rows.some((row) => row.components?.some((c) => c.customId === ACKNOWLEDGE_GUIDELINES_CUSTOM_ID));
  });
  if (alreadyPosted) return;

  const embed = new EmbedBuilder().setTitle("🌱 Community Guidelines").setDescription(COMMUNITY_GUIDELINES_TEXT).setColor(0x2ecc71);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(ACKNOWLEDGE_GUIDELINES_CUSTOM_ID).setLabel("I Acknowledge").setEmoji("✅").setStyle(ButtonStyle.Success)
  );
  await channel.send({ embeds: [embed], components: [row] });
  logger.info({ guild: guild.name }, "Posted community guidelines message with acknowledge button");
}

export async function handleAcknowledgeGuidelines(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) return;
  const map = loadServerMap();
  if (!map?.roles.member) {
    await interaction.reply({ content: "Onboarding isn't configured yet — ask an admin to run the setup script.", ephemeral: true });
    return;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);

  if (member.roles.cache.has(map.roles.member)) {
    await interaction.reply({ content: "You've already acknowledged the guidelines — enjoy the community! 🎉", ephemeral: true });
    return;
  }

  try {
    await member.roles.add(map.roles.member, "Acknowledged community guidelines");
    if (map.roles.newMember && member.roles.cache.has(map.roles.newMember)) {
      await member.roles.remove(map.roles.newMember, "Acknowledged community guidelines");
    }
  } catch (err) {
    logger.error(err, "Failed to apply onboarding roles");
    await interaction.reply({ content: "Something went wrong unlocking the community for you — please ping a staff member.", ephemeral: true });
    return;
  }

  const introductionsMention = map.channels.introductions ? `<#${map.channels.introductions}>` : "#introductions";
  const interestRow = buildInterestRolesMenu();
  const notificationRow = buildNotificationRolesMenu();

  await interaction.reply({
    content:
      "You're in! 🎉 The rest of the community just unlocked for you.\n\n" +
      "Want to personalize things a bit? Pick any **interest roles** and **notification roles** below — both are completely " +
      "optional, pick as many or as few as you like.\n\n" +
      `Whenever you're ready, feel free to drop by ${introductionsMention} and say hi — totally optional too.`,
    components: [interestRow, notificationRow],
    ephemeral: true,
  });
}
