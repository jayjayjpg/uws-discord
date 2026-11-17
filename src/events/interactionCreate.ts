import type { BotEvent } from "../types.js";
import { logger } from "../logger.js";
import { ACCEPT_RULES_CUSTOM_ID, handleAcceptRules } from "../services/verification.js";
import { SELF_ROLES_CUSTOM_ID, handleSelfRolesSelect } from "../services/selfRoles.js";
import { TICKET_CLOSE_CUSTOM_ID, closeTicketChannel } from "../services/tickets.js";
import { getTicketByChannel } from "../db/index.js";
import { isModeratorOrAbove } from "../utils/permissions.js";

const event: BotEvent<"interactionCreate"> = {
  name: "interactionCreate",
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
          logger.warn({ name: interaction.commandName }, "Received unknown slash command");
          return;
        }
        await command.execute(interaction);
        return;
      }

      if (interaction.isButton()) {
        if (interaction.customId === ACCEPT_RULES_CUSTOM_ID) {
          await handleAcceptRules(interaction);
          return;
        }

        if (interaction.customId === TICKET_CLOSE_CUSTOM_ID) {
          if (!interaction.inCachedGuild()) return;
          const ticket = getTicketByChannel(interaction.channelId);
          if (!ticket || ticket.status === "closed") {
            await interaction.reply({ content: "This ticket is already closed.", ephemeral: true });
            return;
          }
          const isOpener = ticket.opener_id === interaction.user.id;
          if (!isOpener && !isModeratorOrAbove(interaction.member)) {
            await interaction.reply({ content: "Only the ticket opener or staff can close this.", ephemeral: true });
            return;
          }
          await interaction.reply("Closing ticket...");
          await closeTicketChannel(interaction.guild, interaction.channelId, interaction.user.tag, interaction.user.id);
          return;
        }
        return;
      }

      if (interaction.isStringSelectMenu() && interaction.customId === SELF_ROLES_CUSTOM_ID) {
        await handleSelfRolesSelect(interaction);
        return;
      }
    } catch (err) {
      logger.error(err, "Error handling interaction");
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "Something went wrong handling that.", ephemeral: true }).catch(() => null);
      }
    }
  },
};

export default event;
