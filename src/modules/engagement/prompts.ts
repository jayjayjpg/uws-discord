/**
 * All prompt wording is intentionally gentle and opt-in — no streak counts,
 * no "you missed yesterday", nothing that implies participation is tracked
 * or expected. Sharing is always framed as optional.
 */

export const DAILY_REFLECTION_PROMPTS = [
  "What's one small thing that went well for you today?",
  "What's something you're looking forward to this week?",
  "How are you really feeling right now — no need to sugarcoat it.",
  "What's one thing you could do today to be a little kinder to yourself?",
  "Is there a thought that's been taking up a lot of space in your mind lately?",
  "What does 'rest' look like for you today?",
  "What's one boundary you're proud of holding recently?",
  "Name one thing in your life right now that feels steady.",
  "What's a small win from this week that you haven't told anyone about?",
  "What's one thing you'd like to let go of today?",
];

export const GRATITUDE_PROMPTS = [
  "What's one small thing you're grateful for today?",
  "Who is someone that made your day a little better recently?",
  "What's a simple pleasure you enjoyed this week?",
  "What's something about your body or mind you're grateful for today?",
  "What's a place that makes you feel grateful to exist?",
  "What's a small comfort that's been getting you through lately?",
];

/** Used by the automated weekly post in #community-challenges. */
export const WEEKLY_CHALLENGES = [
  "This week's gentle challenge: try 5 minutes of quiet breathing before checking your phone in the morning.",
  "This week's gentle challenge: write down one thing you're proud of, each day.",
  "This week's gentle challenge: reach out to one person you've been meaning to check in with.",
  "This week's gentle challenge: notice one moment of calm today, and just sit with it for a breath.",
  "This week's gentle challenge: take one walk this week without your phone.",
];

/** Used by the on-demand /weekly-reflection command. */
export const WEEKLY_REFLECTION_PROMPTS = [
  "Looking back at this week, what's one moment you'd want to remember?",
  "What's something you learned about yourself this week?",
  "What pattern — good or hard — have you noticed in yourself lately?",
  "If this week had a theme, what would it be?",
  "What's one thing you want to carry into next week, and one thing you want to leave behind?",
];

/** Deterministic-ish pick by day-of-year, so the same day doesn't repeat within a short window. */
export function pickPromptForDate(prompts: readonly string[], date: Date): string {
  const dayOfYear = Math.floor((date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86_400_000);
  return prompts[dayOfYear % prompts.length] ?? prompts[0]!;
}

export function pickRandomPrompt(prompts: readonly string[]): string {
  return prompts[Math.floor(Math.random() * prompts.length)] ?? prompts[0]!;
}
