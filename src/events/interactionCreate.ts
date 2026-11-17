import type { BotEvent } from "../types.js";
import { logger } from "../logger.js";
import { ACKNOWLEDGE_GUIDELINES_CUSTOM_ID, handleAcknowledgeGuidelines } from "../modules/onboarding/guidelines.js";
import { isSelfRolesCustomId, handleSelfRolesSelect } from "../modules/roles/selfRoles.js";
import { isReportCustomId, handleReportReviewButton } from "../modules/moderation/reports.js";
import { isEventReviewCustomId, handleEventReviewButton } from "../modules/events/eventService.js";

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
        if (interaction.customId === ACKNOWLEDGE_GUIDELINES_CUSTOM_ID) {
          await handleAcknowledgeGuidelines(interaction);
          return;
        }
        if (isReportCustomId(interaction.customId)) {
          await handleReportReviewButton(interaction);
          return;
        }
        if (isEventReviewCustomId(interaction.customId)) {
          await handleEventReviewButton(interaction);
          return;
        }
        return;
      }

      if (interaction.isStringSelectMenu() && isSelfRolesCustomId(interaction.customId)) {
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
