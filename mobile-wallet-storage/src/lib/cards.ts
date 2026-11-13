/**
 * The cards a visitor can save, and the shared logic that turns a card choice and a
 * name into the details printed on the pass. The page preview, the Apple Wallet pass,
 * and the Google Wallet pass are all built from `CardDetails`, so they always match.
 */

export type CardId = "membership" | "loyalty" | "event";

export interface CardField {
  key: string;
  label: string;
  value: string;
}

export interface CardTemplate {
  id: CardId;
  /** Short name shown in the card picker. */
  name: string;
  /** One-line summary shown in the card picker. */
  summary: string;
  organization: string;
  /** What the pass is, shown by the wallet app (for example in notifications). */
  description: string;
  /** Apple Wallet pass style. */
  appleStyle: "storeCard" | "eventTicket";
  /** Label above the holder's name. */
  holderLabel: string;
  colors: {
    background: string;
    foreground: string;
    label: string;
  };
}

export interface CardDetails {
  template: CardTemplate;
  holderName: string;
  /** Number printed on the card and encoded in the QR code. */
  number: string;
  numberLabel: string;
  /** Fields shown below the holder's name. */
  secondary: CardField[];
  /** Fields shown on the back of the pass, or in the details view. */
  back: CardField[];
  /** ISO date the pass is relevant on, used by Apple Wallet for event tickets. */
  relevantDate?: string;
}

export const CARDS: readonly CardTemplate[] = [
  {
    id: "membership",
    name: "Membership card",
    summary: "A gym or club membership with a member number and expiry date.",
    organization: "Example Club",
    description: "Example Club membership card",
    appleStyle: "storeCard",
    holderLabel: "Member",
    colors: { background: "#2C8F9E", foreground: "#FFFFFF", label: "#D7F5EE" },
  },
  {
    id: "loyalty",
    name: "Loyalty card",
    summary: "A rewards card for a coffee shop, with a points balance.",
    organization: "Example Coffee",
    description: "Example Coffee rewards card",
    appleStyle: "storeCard",
    holderLabel: "Rewards member",
    colors: { background: "#6B3E26", foreground: "#FFFFFF", label: "#F3D9C2" },
  },
  {
    id: "event",
    name: "Event ticket",
    summary: "A general admission ticket with the event date and venue.",
    organization: "Example Live",
    description: "Example Live event ticket",
    appleStyle: "eventTicket",
    holderLabel: "Ticket holder",
    colors: { background: "#5B4FD1", foreground: "#FFFFFF", label: "#DDD8FF" },
  },
];

export const NAME_MAX_LENGTH = 40;

/** Letters (any language), spaces, apostrophes, periods, and hyphens. */
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u;

export type ValidationResult =
  | { ok: true; template: CardTemplate; holderName: string }
  | { ok: false; error: string };

/** Checks a card id and holder name from an untrusted request. */
export function validateCardRequest(cardId: unknown, name: unknown): ValidationResult {
  const template = CARDS.find((card) => card.id === cardId);
  if (!template) {
    return { ok: false, error: `Unknown card. Choose one of: ${CARDS.map((c) => c.id).join(", ")}.` };
  }
  if (typeof name !== "string") {
    return { ok: false, error: "Enter the name to print on the card." };
  }
  const holderName = name.trim().replace(/\s+/g, " ");
  if (holderName.length === 0) {
    return { ok: false, error: "Enter the name to print on the card." };
  }
  if (holderName.length > NAME_MAX_LENGTH) {
    return { ok: false, error: `The name can be at most ${NAME_MAX_LENGTH} characters.` };
  }
  if (!NAME_PATTERN.test(holderName)) {
    return { ok: false, error: "The name can only contain letters, spaces, apostrophes, periods, and hyphens." };
  }
  return { ok: true, template, holderName };
}

/**
 * A stable 8-digit number for a card and name (32-bit FNV-1a hash). The same input
 * always gives the same number, so the preview matches the pass, and saving the same
 * card twice updates one Google Wallet pass instead of creating two.
 */
export function cardNumber(cardId: CardId, holderName: string): string {
  let hash = 0x811c9dc5;
  const input = `${cardId}:${holderName.toLowerCase()}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const digits = String(hash % 100_000_000).padStart(8, "0");
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

/** Builds everything printed on the pass. `today` is a parameter so tests are repeatable. */
export function buildCardDetails(template: CardTemplate, holderName: string, today = new Date()): CardDetails {
  const number = cardNumber(template.id, holderName);
  const year = today.getUTCFullYear();

  switch (template.id) {
    case "membership":
      return {
        template,
        holderName,
        number,
        numberLabel: "Member no.",
        secondary: [
          { key: "tier", label: "Tier", value: "Gold" },
          { key: "expires", label: "Expires", value: `12/${String(year + 1).slice(2)}` },
        ],
        back: [
          { key: "terms", label: "Terms", value: "This card is a demo created by Mobile Wallet Storage. It has no real membership attached." },
        ],
      };
    case "loyalty":
      return {
        template,
        holderName,
        number,
        numberLabel: "Card no.",
        secondary: [
          { key: "points", label: "Points", value: "120" },
          { key: "reward", label: "Next reward", value: "Free drink at 150" },
        ],
        back: [
          { key: "terms", label: "Terms", value: "This card is a demo created by Mobile Wallet Storage. Points have no cash value." },
        ],
      };
    case "event": {
      const eventYear = year + 1;
      return {
        template,
        holderName,
        number,
        numberLabel: "Ticket no.",
        secondary: [
          { key: "date", label: "Date", value: `Aug 14, ${eventYear}, 7:00 PM` },
          { key: "venue", label: "Venue", value: "Example Hall" },
          { key: "admission", label: "Admission", value: "General" },
        ],
        back: [
          { key: "terms", label: "Terms", value: "This ticket is a demo created by Mobile Wallet Storage. It is not valid for entry." },
        ],
        relevantDate: `${eventYear}-08-14T19:00:00-05:00`,
      };
    }
  }
}
