import { describe, expect, it } from "vitest";
import { buildCardDetails, CARDS, cardNumber, validateCardRequest } from "./cards";

describe("validateCardRequest", () => {
  it("accepts every card in the catalog and tidies the name", () => {
    for (const card of CARDS) {
      const result = validateCardRequest(card.id, "  Jordan   Lee ");
      expect(result).toMatchObject({ ok: true, holderName: "Jordan Lee" });
    }
  });

  it("accepts names in other languages", () => {
    expect(validateCardRequest("membership", "Zoë O'Brien-Núñez").ok).toBe(true);
    expect(validateCardRequest("membership", "山田 太郎").ok).toBe(true);
  });

  it.each([
    ["an unknown card", "gold-card", "Jordan"],
    ["a missing card", null, "Jordan"],
    ["a missing name", "membership", null],
    ["a blank name", "membership", "   "],
    ["a name that is too long", "membership", "A".repeat(41)],
    ["markup in the name", "membership", "<script>"],
    ["digits in the name", "membership", "Jordan 2"],
  ])("rejects %s", (_label, card, name) => {
    expect(validateCardRequest(card, name).ok).toBe(false);
  });
});

describe("cardNumber", () => {
  it("is stable, formatted, and ignores capitalization", () => {
    const n = cardNumber("membership", "Jordan Lee");
    expect(n).toMatch(/^\d{4}-\d{4}$/);
    expect(cardNumber("membership", "jordan lee")).toBe(n);
  });

  it("differs between cards and between people", () => {
    const n = cardNumber("membership", "Jordan Lee");
    expect(cardNumber("loyalty", "Jordan Lee")).not.toBe(n);
    expect(cardNumber("membership", "Sam Lee")).not.toBe(n);
  });
});

describe("buildCardDetails", () => {
  const today = new Date("2026-11-13T12:00:00Z");

  it("dates the membership expiry and event from the current year", () => {
    const membership = buildCardDetails(CARDS[0], "Jordan Lee", today);
    expect(membership.secondary.find((f) => f.key === "expires")?.value).toBe("12/27");

    const event = buildCardDetails(CARDS[2], "Jordan Lee", today);
    expect(event.relevantDate).toBe("2027-08-14T19:00:00-05:00");
  });
});
