import type { PermissionsBitField } from "discord.js";

/** Stable, human-meaningless keys used everywhere instead of Discord snowflake IDs. */
export type RoleKey =
  // staff
  | "founder"
  | "administrator"
  | "bot"
  | "moderator"
  | "communityManager"
  | "eventHost"
  | "communityGuide"
  | "facilitator"
  // member tier
  | "premiumMember"
  | "member"
  | "newMember"
  // interest roles (never grant permissions)
  | "meditationInterest"
  | "mindfulnessInterest"
  | "emotionalGrowthInterest"
  | "personalGrowthInterest"
  | "readingAndLearningInterest"
  | "sleepAndRelaxationInterest"
  // notification roles (never grant permissions)
  | "meditationSessionsPings"
  | "communityEventsPings"
  | "weeklyChallengesPings"
  | "newResourcesPings";

export type ChannelKey =
  // START HERE
  | "welcome"
  | "startHereGuide"
  | "communityGuidelines"
  | "announcements"
  | "chooseYourRoles"
  // THE COMMUNITY
  | "general"
  | "introductions"
  | "dailyCheckIn"
  | "shareYourThoughts"
  | "gratitudeJournal"
  | "winsAndProgress"
  // EMOTIONAL GROWTH
  | "selfAwareness"
  | "emotionalIntelligence"
  | "personalReflection"
  | "selfCompassion"
  | "healthyBoundaries"
  // PERSONAL GROWTH
  | "personalDevelopment"
  | "habitsAndRoutines"
  | "mindsetAndResilience"
  | "booksAndResources"
  | "recommendations"
  // MINDFULNESS & WELLBEING
  | "meditation"
  | "breathingExercises"
  | "mindfulnessPractice"
  | "sleepAndRest"
  | "meditationRoomVoice"
  | "quietSpaceVoice"
  // COMMUNITY EVENTS
  | "eventCalendar"
  | "eventAnnouncements"
  | "eventDiscussion"
  | "communityChallenges"
  | "liveGatheringsVoice"
  // SUPPORT & RESOURCES
  | "supportAndResources"
  | "findingProfessionalHelp"
  | "communityQuestions"
  // PREMIUM EXPERIENCES
  | "premiumAnnouncements"
  | "premiumResources"
  | "premiumWorkshops"
  | "premiumGatheringVoice"
  // COMMUNITY TEAM (PRIVATE)
  | "staffChat"
  | "moderationLog"
  | "memberReports"
  | "eventPlanning"
  | "facilitatorHub"
  | "staffResources";

export type CategoryKey =
  | "startHere"
  | "community"
  | "emotionalGrowth"
  | "personalGrowth"
  | "mindfulness"
  | "events"
  | "support"
  | "premium"
  | "team";

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
  /** Guild-wide base permissions for this role. Interest/notification roles must always be []. */
  permissions: PermissionFlag[];
  /** Higher = closer to the top of the role list (resolved relative to other blueprint roles). */
  rank: number;
}

export interface ChannelBlueprint {
  key: ChannelKey;
  name: string;
  /** Defaults to "text" when omitted. */
  type?: "text" | "voice";
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
