import { EmbedBuilder, type Guild } from "discord.js";
import { loadServerMap } from "../../config/serverMap.js";
import { logger } from "../../logger.js";

export interface SubmitResourceInput {
  submitterId: string;
  title: string;
  url?: string;
  notes?: string;
}

export type SubmitResourceResult = { ok: true } | { ok: false; error: string };

const URL_REGEX = /^https?:\/\/\S+$/i;

export async function submitResource(guild: Guild, input: SubmitResourceInput): Promise<SubmitResourceResult> {
  if (input.url && !URL_REGEX.test(input.url)) {
    return { ok: false, error: "That doesn't look like a valid link — links must start with http:// or https://." };
  }

  const map = loadServerMap();
  if (!map?.channels.booksAndResources) {
    return { ok: false, error: "Resource sharing isn't configured yet — ask an admin to run the setup script." };
  }
  const channel = await guild.channels.fetch(map.channels.booksAndResources).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return { ok: false, error: "Couldn't reach the resources channel." };
  }

  const embed = new EmbedBuilder()
    .setTitle(`📚 ${input.title}`)
    .setDescription(input.notes ?? "No additional notes.")
    .addFields([...(input.url ? [{ name: "Link", value: input.url }] : []), { name: "Shared by", value: `<@${input.submitterId}>` }])
    .setColor(0x1abc9c)
    .setTimestamp(new Date());

  const pingRoleId = map.roles.newResourcesPings;
  const ping = pingRoleId ? `<@&${pingRoleId}> ` : "";

  await channel.send({ content: `${ping}New resource shared!`, embeds: [embed] }).catch((err) => {
    logger.error(err, "Failed to post submitted resource");
  });

  return { ok: true };
}
