import type { CategoryBlueprint, PermissionFlag, RoleBlueprint, RoleKey, RoleOverwrite } from "./types.js";

/**
 * Baseline chat+voice permissions granted at the *guild* level (not channel-specific).
 * Visibility of any given channel is still controlled entirely by the
 * ViewChannel overwrites below — granting these guild-wide just means "this
 * role is capable of chatting/connecting wherever it can already see".
 */
const BASE_CHAT_VOICE: PermissionFlag[] = [
  "ViewChannel",
  "SendMessages",
  "EmbedLinks",
  "AttachFiles",
  "AddReactions",
  "ReadMessageHistory",
  "CreatePublicThreads",
  "UseApplicationCommands",
  "Connect",
  "Speak",
  "UseVAD",
];

/** New Members are deliberately missing EmbedLinks/AttachFiles/Threads/voice until guidelines are acknowledged. */
const REDUCED_CHAT: PermissionFlag[] = ["ViewChannel", "SendMessages", "AddReactions", "ReadMessageHistory", "UseApplicationCommands"];

/** Interest and notification roles must never carry any permission — enforced structurally, not just by convention. */
const NO_PERMISSIONS: PermissionFlag[] = [];

export const STAFF_ROLES: RoleKey[] = [
  "founder",
  "administrator",
  "bot",
  "moderator",
  "communityManager",
  "eventHost",
  "communityGuide",
  "facilitator",
];
export const MEMBER_TIER_ROLES: RoleKey[] = ["premiumMember", "member", ...STAFF_ROLES];
export const PREMIUM_TIER_ROLES: RoleKey[] = ["premiumMember", ...STAFF_ROLES];

export const INTEREST_ROLES: { key: RoleKey; label: string }[] = [
  { key: "meditationInterest", label: "Meditation" },
  { key: "mindfulnessInterest", label: "Mindfulness" },
  { key: "emotionalGrowthInterest", label: "Emotional Growth" },
  { key: "personalGrowthInterest", label: "Personal Growth" },
  { key: "readingAndLearningInterest", label: "Reading and Learning" },
  { key: "sleepAndRelaxationInterest", label: "Sleep and Relaxation" },
];

export const NOTIFICATION_ROLES: { key: RoleKey; label: string }[] = [
  { key: "meditationSessionsPings", label: "Meditation Sessions" },
  { key: "communityEventsPings", label: "Community Events" },
  { key: "weeklyChallengesPings", label: "Weekly Challenges" },
  { key: "newResourcesPings", label: "New Resources" },
];

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

/** Extra per-channel overwrite: hide this one channel from specific staff roles even though their category grants it. */
function hideFrom(roles: RoleKey[]): RoleOverwrite[] {
  return roles.map((role) => ({ role, deny: ["ViewChannel"] as PermissionFlag[] }));
}

/** Extra per-channel overwrite: channel is read-only for these roles (e.g. announcement-style channels). */
function readOnlyFor(roles: RoleKey[]): RoleOverwrite[] {
  return roles.map((role) => ({ role, deny: ["SendMessages"] as PermissionFlag[] }));
}

export const ROLE_BLUEPRINT: RoleBlueprint[] = [
  // --- Staff --------------------------------------------------------------
  { key: "founder", name: "Founder", color: 0xf1c40f, hoist: true, mentionable: false, permissions: ["Administrator"], rank: 100 },
  { key: "administrator", name: "Administrator", color: 0xe74c3c, hoist: true, mentionable: false, permissions: ["Administrator"], rank: 90 },
  {
    key: "bot",
    name: "Bot",
    color: 0x95a5a6,
    hoist: false,
    mentionable: false,
    permissions: [
      ...BASE_CHAT_VOICE,
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
    rank: 85,
  },
  {
    key: "moderator",
    name: "Moderator",
    color: 0x3498db,
    hoist: true,
    mentionable: false,
    permissions: [...BASE_CHAT_VOICE, "KickMembers", "BanMembers", "ModerateMembers", "ManageMessages", "ManageNicknames", "ManageThreads", "ViewAuditLog"],
    rank: 80,
  },
  {
    key: "communityManager",
    name: "Community Manager",
    color: 0x1abc9c,
    hoist: true,
    mentionable: false,
    permissions: [...BASE_CHAT_VOICE, "ManageMessages", "ManageEvents", "ManageWebhooks", "MentionEveryone", "ManageThreads", "CreateInstantInvite"],
    rank: 70,
  },
  {
    key: "eventHost",
    name: "Event Host",
    color: 0xe67e22,
    hoist: true,
    mentionable: false,
    permissions: BASE_CHAT_VOICE, // no admin/mod permissions by design
    rank: 55,
  },
  {
    key: "facilitator",
    name: "Facilitator",
    color: 0x16a085,
    hoist: true,
    mentionable: false,
    permissions: BASE_CHAT_VOICE, // no admin permissions, no private mod-report access by design
    rank: 55,
  },
  {
    key: "communityGuide",
    name: "Community Guide",
    color: 0x3498db,
    hoist: true,
    mentionable: false,
    permissions: BASE_CHAT_VOICE, // onboarding/welcoming helper — no moderation power
    rank: 50,
  },
  // --- Member tier ----------------------------------------------------------
  {
    key: "premiumMember",
    name: "Premium Member",
    color: 0x9b59b6,
    hoist: true,
    mentionable: false,
    permissions: [...BASE_CHAT_VOICE, "UseExternalEmojis", "UseExternalStickers"],
    rank: 45,
  },
  { key: "member", name: "Member", color: 0x2ecc71, hoist: false, mentionable: false, permissions: BASE_CHAT_VOICE, rank: 40 },
  { key: "newMember", name: "New Member", color: 0xbdc3c7, hoist: false, mentionable: false, permissions: REDUCED_CHAT, rank: 30 },
  // --- Interest roles (never grant permissions) ------------------------------
  ...INTEREST_ROLES.map(
    (r, i): RoleBlueprint => ({ key: r.key, name: r.label, color: 0, hoist: false, mentionable: false, permissions: NO_PERMISSIONS, rank: 5 - i * 0.01 })
  ),
  // --- Notification roles (never grant permissions) --------------------------
  ...NOTIFICATION_ROLES.map(
    (r, i): RoleBlueprint => ({ key: r.key, name: r.label, color: 0, hoist: false, mentionable: false, permissions: NO_PERMISSIONS, rank: 4 - i * 0.01 })
  ),
];

export const CATEGORY_BLUEPRINT: CategoryBlueprint[] = [
  // =========================================================================
  // START HERE — visible to everyone, including unverified New Members
  // =========================================================================
  {
    key: "startHere",
    name: "START HERE",
    overwrites: [
      { role: "everyone", allow: ["ViewChannel", "ReadMessageHistory", "AddReactions"], deny: ["SendMessages"] },
      { role: "bot", allow: ["SendMessages", "EmbedLinks", "ManageMessages", "AddReactions"] },
    ],
    channels: [
      { key: "welcome", name: "welcome", topic: "Welcome! We're glad you're here." },
      { key: "startHereGuide", name: "start-here", topic: "A quick orientation to the community and how it works." },
      {
        key: "communityGuidelines",
        name: "community-guidelines",
        topic: "Please read and acknowledge these before joining in — click the button below.",
      },
      { key: "announcements", name: "announcements", topic: "Official updates from the team.", overwrites: [{ role: "communityManager", allow: ["SendMessages"] }] },
      {
        key: "chooseYourRoles",
        name: "choose-your-roles",
        topic: "Pick interest and notification roles once you've joined the community.",
        // Role selection happens after guidelines acknowledgment, so this is Member+ only even though the category is public.
        // (Overrides the category's @everyone ViewChannel allow above; newMember has no entry here so it falls back to this deny.)
        overwrites: gated(MEMBER_TIER_ROLES),
      },
    ],
  },
  // =========================================================================
  // THE COMMUNITY
  // =========================================================================
  {
    key: "community",
    name: "THE COMMUNITY",
    overwrites: gated(MEMBER_TIER_ROLES),
    channels: [
      { key: "general", name: "general" },
      { key: "introductions", name: "introductions", topic: "Introduce yourself — only share what you're comfortable sharing." },
      { key: "dailyCheckIn", name: "daily-check-in" },
      { key: "shareYourThoughts", name: "share-your-thoughts" },
      { key: "gratitudeJournal", name: "gratitude-journal" },
      { key: "winsAndProgress", name: "wins-and-progress" },
    ],
  },
  // =========================================================================
  // EMOTIONAL GROWTH
  // =========================================================================
  {
    key: "emotionalGrowth",
    name: "EMOTIONAL GROWTH",
    overwrites: gated(MEMBER_TIER_ROLES),
    channels: [
      { key: "selfAwareness", name: "self-awareness" },
      { key: "emotionalIntelligence", name: "emotional-intelligence" },
      { key: "personalReflection", name: "personal-reflection" },
      { key: "selfCompassion", name: "self-compassion" },
      { key: "healthyBoundaries", name: "healthy-boundaries" },
    ],
  },
  // =========================================================================
  // PERSONAL GROWTH
  // =========================================================================
  {
    key: "personalGrowth",
    name: "PERSONAL GROWTH",
    overwrites: gated(MEMBER_TIER_ROLES),
    channels: [
      { key: "personalDevelopment", name: "personal-development" },
      { key: "habitsAndRoutines", name: "habits-and-routines" },
      { key: "mindsetAndResilience", name: "mindset-and-resilience" },
      { key: "booksAndResources", name: "books-and-resources" },
      { key: "recommendations", name: "recommendations" },
    ],
  },
  // =========================================================================
  // MINDFULNESS & WELLBEING
  // =========================================================================
  {
    key: "mindfulness",
    name: "MINDFULNESS & WELLBEING",
    overwrites: gated(MEMBER_TIER_ROLES),
    channels: [
      { key: "meditation", name: "meditation" },
      { key: "breathingExercises", name: "breathing-exercises" },
      { key: "mindfulnessPractice", name: "mindfulness-practice" },
      { key: "sleepAndRest", name: "sleep-and-rest" },
      { key: "meditationRoomVoice", name: "Meditation Room", type: "voice" },
      { key: "quietSpaceVoice", name: "Quiet Space", type: "voice" },
    ],
  },
  // =========================================================================
  // COMMUNITY EVENTS
  // =========================================================================
  {
    key: "events",
    name: "COMMUNITY EVENTS",
    overwrites: gated(MEMBER_TIER_ROLES),
    channels: [
      { key: "eventCalendar", name: "event-calendar", topic: "What's coming up.", overwrites: readOnlyFor(["member", "premiumMember"]) },
      {
        key: "eventAnnouncements",
        name: "event-announcements",
        overwrites: readOnlyFor(["member", "premiumMember"]),
      },
      { key: "eventDiscussion", name: "event-discussion" },
      { key: "communityChallenges", name: "community-challenges" },
      { key: "liveGatheringsVoice", name: "Live Gatherings", type: "voice" },
    ],
  },
  // =========================================================================
  // SUPPORT & RESOURCES — never premium-gated; essential safety info stays free
  // =========================================================================
  {
    key: "support",
    name: "SUPPORT & RESOURCES",
    overwrites: gated(MEMBER_TIER_ROLES),
    channels: [
      { key: "supportAndResources", name: "support-and-resources" },
      {
        key: "findingProfessionalHelp",
        name: "finding-professional-help",
        topic: "Curated, staff-vetted resources. Not a crisis service — if you're in immediate danger, contact local emergency services.",
        overwrites: readOnlyFor(["member", "premiumMember"]),
      },
      { key: "communityQuestions", name: "community-questions" },
    ],
  },
  // =========================================================================
  // PREMIUM EXPERIENCES — gated to Premium Member + staff only
  // =========================================================================
  {
    key: "premium",
    name: "PREMIUM EXPERIENCES",
    overwrites: gated(PREMIUM_TIER_ROLES),
    channels: [
      { key: "premiumAnnouncements", name: "premium-announcements", overwrites: readOnlyFor(["premiumMember"]) },
      { key: "premiumResources", name: "premium-resources", overwrites: readOnlyFor(["premiumMember"]) },
      { key: "premiumWorkshops", name: "premium-workshops" },
      { key: "premiumGatheringVoice", name: "Premium Gathering", type: "voice" },
    ],
  },
  // =========================================================================
  // COMMUNITY TEAM (PRIVATE) — staff-only, with further per-channel narrowing
  // =========================================================================
  {
    key: "team",
    name: "COMMUNITY TEAM (PRIVATE)",
    overwrites: [...gated(STAFF_ROLES), { role: "bot", allow: ["SendMessages", "EmbedLinks", "ManageMessages", "AddReactions"] }],
    channels: [
      { key: "staffChat", name: "staff-chat" },
      {
        key: "moderationLog",
        name: "moderation-log",
        topic: "Automated moderation + automod log. Bot-posted. Access-controlled — see README for retention policy.",
        overwrites: hideFrom(["eventHost", "communityGuide", "facilitator", "communityManager"]),
      },
      {
        key: "memberReports",
        name: "member-reports",
        topic: "Member-submitted reports via /report. Access-controlled.",
        overwrites: hideFrom(["eventHost", "communityGuide", "facilitator", "communityManager"]),
      },
      {
        key: "eventPlanning",
        name: "event-planning",
        topic: "Facilitators and Event Hosts propose events here; Community Manager reviews and approves.",
        overwrites: hideFrom(["moderator", "communityGuide"]),
      },
      {
        key: "facilitatorHub",
        name: "facilitator-hub",
        topic: "Facilitator resources and session planning.",
        overwrites: hideFrom(["moderator", "eventHost", "communityGuide"]),
      },
      { key: "staffResources", name: "staff-resources" },
    ],
  },
];
