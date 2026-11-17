import { describe, it, expect } from "vitest";
import { COMMUNITY_GUIDELINES_TEXT } from "./guidelines.js";

describe("community guidelines content — required safety disclosures", () => {
  const text = COMMUNITY_GUIDELINES_TEXT.toLowerCase();

  it("makes clear this is not a therapy/medical/crisis service", () => {
    expect(text).toMatch(/not a therapy, medical, or crisis-response service/);
  });

  it("directs people in immediate danger to local emergency services", () => {
    expect(text).toMatch(/emergency services/);
  });

  it("states confidentiality can't be guaranteed", () => {
    expect(text).toMatch(/confidentiality can't be guaranteed/);
  });

  it("prohibits diagnosing other members", () => {
    expect(text).toMatch(/diagnose other members/);
  });

  it("prohibits sharing screenshots/private conversations without consent", () => {
    expect(text).toMatch(/screenshots or private conversations/);
    expect(text).toMatch(/consent/);
  });

  it("prohibits promoting unverified cures or dangerous treatment advice", () => {
    expect(text).toMatch(/unverified cures/);
  });

  it("does not ask the reader to disclose a diagnosis, medical history, or trauma", () => {
    // The guidelines describe prohibited behavior ("don't diagnose others") but must never
    // themselves request personal medical/trauma disclosure as a condition of participation.
    expect(text).not.toMatch(/please (share|tell us|describe) your (diagnosis|medical history|trauma)/);
  });
});
