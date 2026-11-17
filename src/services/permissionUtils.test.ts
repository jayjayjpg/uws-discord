import { describe, it, expect } from "vitest";
import { flagsToBitfield, mergeOverwrites } from "./permissionUtils.js";

describe("flagsToBitfield", () => {
  it("returns 0n for an empty flag list", () => {
    expect(flagsToBitfield([])).toBe(0n);
  });

  it("ORs multiple flags together into a single bitfield", () => {
    const combined = flagsToBitfield(["ViewChannel", "SendMessages"]);
    expect(flagsToBitfield(["ViewChannel"]) & combined).not.toBe(0n);
    expect(flagsToBitfield(["SendMessages"]) & combined).not.toBe(0n);
    expect(flagsToBitfield(["BanMembers"]) & combined).toBe(0n);
  });
});

describe("mergeOverwrites", () => {
  it("channel-level allow overrides a category-level deny for the same role+flag", () => {
    const merged = mergeOverwrites([{ role: "everyone", deny: ["SendMessages"] }], [{ role: "everyone", allow: ["SendMessages"] }]);
    const everyone = merged.get("everyone")!;
    expect(everyone.allow.has("SendMessages")).toBe(true);
    expect(everyone.deny.has("SendMessages")).toBe(false);
  });

  it("flags the channel doesn't mention are inherited from the category", () => {
    const merged = mergeOverwrites(
      [{ role: "everyone", allow: ["ViewChannel"], deny: ["SendMessages"] }],
      [{ role: "everyone", allow: ["SendMessages"] }] // only overrides SendMessages
    );
    const everyone = merged.get("everyone")!;
    expect(everyone.allow.has("ViewChannel")).toBe(true); // inherited from category, untouched
    expect(everyone.allow.has("SendMessages")).toBe(true); // overridden by channel
  });

  it("roles only mentioned at the category level still show up with no channel entry", () => {
    const merged = mergeOverwrites([{ role: "moderator", allow: ["ViewChannel"] }], []);
    expect(merged.get("moderator")?.allow.has("ViewChannel")).toBe(true);
    expect(merged.has("member")).toBe(false);
  });

  it("is a pure function — running it twice on the same input gives the same result (idempotent)", () => {
    const categoryOverwrites = [{ role: "everyone" as const, deny: ["ViewChannel" as const] }, { role: "member" as const, allow: ["ViewChannel" as const] }];
    const first = mergeOverwrites(categoryOverwrites);
    const second = mergeOverwrites(categoryOverwrites);
    expect([...first.entries()]).toEqual([...second.entries()]);
  });
});
