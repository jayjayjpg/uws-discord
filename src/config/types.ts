import type { PermissionsBitField } from "discord.js";

/** Stable, human-meaningless keys used everywhere instead of Discord snowflake IDs. */
export type RoleKey =
  | "owner"
  | "administrator"
  | "bot"
  | "moderator"
  | "communityManager"
  | "vip"
  | "member"
  | "newMember"
  | "eventPings"
  | "announcementPings"
  | "communityUpdatesPings";

export type ChannelKey =
  | "welcome"
  | "rules"
  | "announcements"
  | "introduceYourself"
  | "generalChat"
  | "questionsAndHelp"
  | "resources"
  | "offTopic"
  | "mediaSharing"
  | "upcomingEvents"
  | "eventDiscussion"
  | "communityUpdates"
  | "openATicket"
  | "supportChat"
  | "staffChat"
  | "moderatorLog"
  | "adminAnnouncements"
  | "ticketLogs";

export type CategoryKey = "startHere" | "community" | "events" | "support" | "staff" | "tickets";

export type PermissionFlag = keyof typeof PermissionsBitField.Flags;

/** Allow/deny overwrite for a single role, expressed with readable permission names. */
export interface RoleOverwrite {
  role: RoleKey | "everyone";
  allow?: PermissionFlag[];
  deny?: PermissionFlag[];
}

export interface RoleBlueprint {
  key: RoleKey;
  name: string;
  color: number;
  hoist: boolean;
  mentionable: boolean;
  /** Guild-wide base permissions for this role. */
  permissions: PermissionFlag[];
  /** Higher = closer to the top of the role list (resolved relative to other blueprint roles). */
  rank: number;
}

export interface ChannelBlueprint {
  key: ChannelKey;
  name: string;
  topic?: string;
  /** Overwrites applied on top of whatever the parent category already sets. */
  overwrites?: RoleOverwrite[];
  nsfw?: boolean;
}

export interface CategoryBlueprint {
  key: CategoryKey;
  name: string;
  overwrites: RoleOverwrite[];
  channels: ChannelBlueprint[];
}
