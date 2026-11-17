import { describe, it, expect } from "vitest";
import { DAILY_REFLECTION_PROMPTS, GRATITUDE_PROMPTS, WEEKLY_CHALLENGES, WEEKLY_REFLECTION_PROMPTS, pickPromptForDate, pickRandomPrompt } from "./prompts.js";

describe("pickPromptForDate", () => {
  it("is deterministic for the same calendar day", () => {
    const a = pickPromptForDate(DAILY_REFLECTION_PROMPTS, new Date("2026-03-10T01:00:00Z"));
    const b = pickPromptForDate(DAILY_REFLECTION_PROMPTS, new Date("2026-03-10T23:00:00Z"));
    expect(a).toBe(b);
  });

  it("only ever returns prompts from the given pool", () => {
    for (const d of ["2026-01-01", "2026-06-15", "2026-12-31"]) {
      expect(DAILY_REFLECTION_PROMPTS).toContain(pickPromptForDate(DAILY_REFLECTION_PROMPTS, new Date(`${d}T12:00:00Z`)));
    }
  });
});

describe("pickRandomPrompt", () => {
  it("always returns a prompt from the given pool", () => {
    for (let i = 0; i < 20; i++) {
      expect(GRATITUDE_PROMPTS).toContain(pickRandomPrompt(GRATITUDE_PROMPTS));
    }
  });
});

describe("prompt content — no pressure/streak language", () => {
  const allPools = [DAILY_REFLECTION_PROMPTS, GRATITUDE_PROMPTS, WEEKLY_CHALLENGES, WEEKLY_REFLECTION_PROMPTS];

  it("never mentions streaks or consecutive-day tracking", () => {
    for (const pool of allPools) {
      for (const prompt of pool) {
        expect(prompt.toLowerCase()).not.toMatch(/streak|in a row|consecutive day/);
      }
    }
  });

  it("every pool has multiple distinct prompts (so nothing repeats every single time)", () => {
    for (const pool of allPools) {
      expect(pool.length).toBeGreaterThanOrEqual(4);
      expect(new Set(pool).size).toBe(pool.length);
    }
  });
});
