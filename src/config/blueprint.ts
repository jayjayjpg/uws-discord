import type { CategoryBlueprint, PermissionFlag, RoleBlueprint, RoleKey, RoleOverwrite } from "./types.js";

/**
 * Baseline chat permissions granted at the *guild* level (not channel-specific).
 * Visibility of any given channel is still controlled entirely by the
 * ViewChannel overwrites below — granting these guild-wide just means "this
 * role is capable of chatting/reacting wherever it can already see".
 */
const BASE_CHAT: PermissionFlag[] = [
  "ViewChannel",
  "SendMessages",
  "EmbedLinks",
  "AttachFiles",
  "AddReactions",
  "ReadMessageHistory",
  "CreatePublicThreads",
  "UseApplicationCommands",
];

/** New Members are deliberately missing EmbedLinks/AttachFiles/Threads until verified (anti-raid). */
const REDUCED_CHAT: PermissionFlag[] = ["ViewChannel", "SendMessages", "AddReactions", "ReadMessageHistory", "UseApplicationCommands"];

export const STAFF_ROLES: RoleKey[] = ["bot", "owner", "administrator", "moderator", "communityManager"];
export const MEMBER_TIER_ROLES: RoleKey[] = ["member", "vip", ...STAFF_ROLES];

/**
 * Builds the standard "hidden unless you're one of these roles" overwrite set.
 * IMPORTANT (Discord permission quirk): once @everyone has ANY overwrite on a
 * bit, a role only escapes it by having its OWN overwrite on that same bit —
 * base guild permissions do not matter once an overwrite chain exists. That's
 * why every role that should see the category needs an explicit allow here,
 * even if it already has ViewChannel true at the guild level.
 */
function gated(viewers: RoleKey[]): RoleOverwrite[] {
  return [{ role: "everyone", deny: ["ViewChannel"] }, ...viewers.map((role) => ({ role, allow: ["ViewChannel"] as PermissionFlag[] }))];
}

export const ROLE_BLUEPRINT: RoleBlueprint[] = [
  {
    key: "owner",
    name: "Owner",
    color: 0xf1c40f,
    hoist: true,
    mentionable: false,
    permissions: ["Administrator"],
    rank: 100,
  },
  {
    key: "administrator",
    name: "Administrator",
    color: 0xe74c3c,
    hoist: true,
    mentionable: false,
    permissions: ["Administrator"],
    rank: 90,
  },
  {
    key: "bot",
    name: "Bot",
    color: 0x95a5a6,
    hoist: false,
    mentionable: false,
    permissions: [
      ...BASE_CHAT,
      "ManageRoles",
      "ManageChannels",
      "ManageMessages",
      "ManageNicknames",
      "KickMembers",
      "BanMembers",
      "ModerateMembers",
      "ManageWebhooks",
      "ManageThreads",
      "ViewAuditLog",
      "MentionEveryone",
      "ManageEvents",
    ],
    rank: 80,
  },
  {
    key: "moderator",
    name: "Moderator",
    color: 0x3498db,
    hoist: true,
    mentionable: false,
    permissions: [...BASE_CHAT, "KickMembers", "BanMembers", "ModerateMembers", "ManageMessages", "ManageNicknames", "ManageThreads", "ViewAuditLog"],
    rank: 70,
  },
  {
    key: "communityManager",
    name: "Community Manager",
    color: 0x1abc9c,
    hoist: true,
    mentionable: false,
    permissions: [...BASE_CHAT, "ManageMessages", "ManageEvents", "ManageWebhooks", "MentionEveryone", "ManageThreads", "CreateInstantInvite"],
    rank: 60,
  },
  {
    key: "vip",
    name: "VIP",
    color: 0x9b59b6,
    hoist: true,
    mentionable: false,
    permissions: [...BASE_CHAT, "UseExternalEmojis", "UseExternalStickers"],
    rank: 50,
  },
  {
    key: "member",
    name: "Member",
    color: 0x2ecc71,
    hoist: false,
    mentionable: false,
    permissions: BASE_CHAT,
    rank: 40,
  },
  {
    key: "newMember",
    name: "New Member",
    color: 0xbdc3c7,
    hoist: false,
    mentionable: false,
    permissions: REDUCED_CHAT,
    rank: 30,
  },
  {
    key: "eventPings",
    name: "Event Pings",
    color: 0,
    hoist: false,
    mentionable: false,
    permissions: [],
    rank: 11,
  },
  {
    key: "announcementPings",
    name: "Announcement Pings",
    color: 0,
    hoist: false,
    mentionable: false,
    permissions: [],
    rank: 10,
  },
  {
    key: "communityUpdatesPings",
    name: "Community Updates Pings",
    color: 0,
    hoist: false,
    mentionable: false,
    permissions: [],
    rank: 9,
  },
];

export const CATEGORY_BLUEPRINT: CategoryBlueprint[] = [
  {
    key: "startHere",
    name: "START HERE",
    overwrites: [
      { role: "everyone", allow: ["ViewChannel", "ReadMessageHistory", "AddReactions"], deny: ["SendMessages"] },
      { role: "bot", allow: ["SendMessages", "EmbedLinks", "ManageMessages", "AddReactions"] },
    ],
    channels: [
      { key: "welcome", name: "welcome", topic: "Start here! Say hi and read the rules before diving in." },
      {
        key: "rules",
        name: "rules",
        topic: "Server rules — click the ✅ Accept button below to unlock the rest of the server.",
      },
      {
        key: "announcements",
        name: "announcements",
        topic: "Official announcements from the team.",
        overwrites: [{ role: "communityManager", allow: ["SendMessages"] }],
      },
      {
        key: "introduceYourself",
        name: "introduce-yourself",
        topic: "Tell the community a bit about yourself!",
        overwrites: [{ role: "everyone", allow: ["SendMessages"] }],
      },
    ],
  },
  {
    key: "community",
    name: "COMMUNITY",
    overwrites: gated(MEMBER_TIER_ROLES),
    channels: [
      { key: "generalChat", name: "general-chat" },
      { key: "questionsAndHelp", name: "questions-and-help" },
      {
        key: "resources",
        name: "resources",
        topic: "Curated links and guides — staff and Community Managers post here.",
        overwrites: [
          { role: "member", deny: ["SendMessages"] },
          { role: "vip", deny: ["SendMessages"] },
        ],
      },
      { key: "offTopic", name: "off-topic" },
      { key: "mediaSharing", name: "media-sharing", topic: "Share your creations, screenshots, and media!" },
    ],
  },
  {
    key: "events",
    name: "EVENTS",
    overwrites: gated(MEMBER_TIER_ROLES),
    channels: [
      {
        key: "upcomingEvents",
        name: "upcoming-events",
        topic: "What's coming up — posted by the Community Manager team.",
        overwrites: [
          { role: "member", deny: ["SendMessages"] },
          { role: "vip", deny: ["SendMessages"] },
        ],
      },
      { key: "eventDiscussion", name: "event-discussion" },
      {
        key: "communityUpdates",
        name: "community-updates",
        topic: "News and updates from the team.",
        overwrites: [
          { role: "member", deny: ["SendMessages"] },
          { role: "vip", deny: ["SendMessages"] },
        ],
      },
    ],
  },
  {
    key: "support",
    name: "SUPPORT",
    overwrites: gated(MEMBER_TIER_ROLES),
    channels: [
      {
        key: "openATicket",
        name: "open-a-ticket",
        topic: "Click the button below (or run /ticket) to open a private ticket with staff.",
        overwrites: [
          { role: "member", deny: ["SendMessages"] },
          { role: "vip", deny: ["SendMessages"] },
        ],
      },
      { key: "supportChat", name: "support-chat" },
    ],
  },
  {
    key: "staff",
    name: "STAFF",
    overwrites: [...gated(STAFF_ROLES), { role: "bot", allow: ["SendMessages", "EmbedLinks", "ManageMessages", "AddReactions"] }],
    channels: [
      { key: "staffChat", name: "staff-chat" },
      { key: "moderatorLog", name: "moderator-log", topic: "Automated moderation + automod log. Bot-posted." },
      {
        key: "adminAnnouncements",
        name: "admin-announcements",
        overwrites: [
          { role: "moderator", deny: ["SendMessages"] },
          { role: "communityManager", deny: ["SendMessages"] },
        ],
      },
      { key: "ticketLogs", name: "ticket-logs", topic: "Transcripts of closed tickets. Bot-posted." },
    ],
  },
  {
    key: "tickets",
    name: "TICKETS",
    // Empty by default — individual ticket channels are created on demand by
    // the ticket service and get an extra per-user overwrite at creation time.
    overwrites: gated(STAFF_ROLES),
    channels: [],
  },
];
