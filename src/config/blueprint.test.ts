import { describe, it, expect } from "vitest";
import { CATEGORY_BLUEPRINT, ROLE_BLUEPRINT } from "./blueprint.js";

const ROLE_KEYS = new Set(ROLE_BLUEPRINT.map((r) => r.key));

describe("blueprint structural invariants (what makes setup idempotent + safe)", () => {
  it("every role key is unique", () => {
    const keys = ROLE_BLUEPRINT.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every role name is unique (name is what the setup script matches existing roles by)", () => {
    const names = ROLE_BLUEPRINT.map((r) => r.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every category key is unique", () => {
    const keys = CATEGORY_BLUEPRINT.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every channel key across the whole blueprint is globally unique", () => {
    const keys = CATEGORY_BLUEPRINT.flatMap((c) => c.channels.map((ch) => ch.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("channel names are unique within their own category (setup matches by name+parent)", () => {
    for (const category of CATEGORY_BLUEPRINT) {
      const names = category.channels.map((c) => c.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it("every overwrite references a real role key, or the literal 'everyone'", () => {
    for (const category of CATEGORY_BLUEPRINT) {
      for (const overwrite of category.overwrites) {
        expect(overwrite.role === "everyone" || ROLE_KEYS.has(overwrite.role)).toBe(true);
      }
      for (const channel of category.channels) {
        for (const overwrite of channel.overwrites ?? []) {
          expect(overwrite.role === "everyone" || ROLE_KEYS.has(overwrite.role)).toBe(true);
        }
      }
    }
  });

  it("the Bot role is never assigned Administrator (least-privilege — it gets a specific, scoped permission set)", () => {
    const bot = ROLE_BLUEPRINT.find((r) => r.key === "bot");
    expect(bot).toBeDefined();
    expect(bot!.permissions).not.toContain("Administrator");
  });

  it("interest and notification roles (the cosmetic, self-assignable ones) never carry any permission", () => {
    const cosmeticKeys = ["meditationInterest", "mindfulnessInterest", "meditationSessionsPings", "communityEventsPings"];
    for (const key of cosmeticKeys) {
      const role = ROLE_BLUEPRINT.find((r) => r.key === key);
      expect(role, `expected role ${key} to exist in the blueprint`).toBeDefined();
      expect(role!.permissions).toEqual([]);
    }
  });

  it("role ranks strictly decrease in the documented hierarchy order (no accidental ties among staff tiers)", () => {
    const order = ["founder", "administrator", "bot", "moderator", "communityManager"] as const;
    const ranks = order.map((key) => ROLE_BLUEPRINT.find((r) => r.key === key)!.rank);
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]).toBeLessThan(ranks[i - 1]!);
    }
  });
});
