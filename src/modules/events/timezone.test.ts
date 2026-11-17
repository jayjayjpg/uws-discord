import { describe, it, expect } from "vitest";
import { isValidTimeZone, zonedWallTimeToUtc } from "./timezone.js";

describe("isValidTimeZone", () => {
  it("accepts known IANA zones and UTC", () => {
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("Asia/Tokyo")).toBe(true);
  });

  it("rejects garbage input", () => {
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});

describe("zonedWallTimeToUtc", () => {
  it("passes UTC straight through", () => {
    expect(zonedWallTimeToUtc("2026-11-25", "19:00", "UTC")?.toISOString()).toBe("2026-11-25T19:00:00.000Z");
  });

  it("converts America/New_York during standard time (EST, UTC-5)", () => {
    expect(zonedWallTimeToUtc("2026-11-25", "19:00", "America/New_York")?.toISOString()).toBe("2026-11-26T00:00:00.000Z");
  });

  it("converts America/New_York during daylight time (EDT, UTC-4) — confirms DST is handled", () => {
    expect(zonedWallTimeToUtc("2026-07-15", "19:00", "America/New_York")?.toISOString()).toBe("2026-07-15T23:00:00.000Z");
  });

  it("returns null for an invalid timezone", () => {
    expect(zonedWallTimeToUtc("2026-11-25", "19:00", "Not/AZone")).toBeNull();
  });

  it("returns null for malformed date/time strings", () => {
    expect(zonedWallTimeToUtc("11/25/2026", "19:00", "UTC")).toBeNull();
    expect(zonedWallTimeToUtc("2026-11-25", "7pm", "UTC")).toBeNull();
  });
});
