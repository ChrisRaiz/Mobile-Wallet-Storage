/**
 * Google Wallet passes. The pass details go into a JSON Web Token (JWT) signed with a
 * Google Cloud service account key. Sending the visitor to
 * https://pay.google.com/gp/v/save/<token> shows the card with a Save button; Google
 * checks the signature and creates the pass class and object when the card is saved.
 */
import { createSign } from "node:crypto";
import type { CardDetails } from "./cards";
import type { GoogleConfig } from "./config";

export const GOOGLE_SAVE_URL = "https://pay.google.com/gp/v/save/";

const text = (value: string) => ({ defaultValue: { language: "en-US", value } });

/** Google Wallet ids allow letters, digits, periods, underscores, and hyphens. */
function safeId(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, "_");
}

/** The pass class (shared design) and object (this visitor's card) for a card. */
export function buildGenericPass(details: CardDetails, issuerId: string, logoUrl?: string) {
  const { template } = details;
  const classId = `${issuerId}.${safeId(`mws-${template.id}`)}`;
  const objectId = `${issuerId}.${safeId(`mws-${template.id}-${details.number}`)}`;

  const genericClass = { id: classId };
  const genericObject = {
    id: objectId,
    classId,
    state: "ACTIVE",
    cardTitle: text(template.organization),
    subheader: text(template.holderLabel),
    header: text(details.holderName),
    hexBackgroundColor: template.colors.background,
    ...(logoUrl
      ? { logo: { sourceUri: { uri: logoUrl }, contentDescription: text(`${template.organization} logo`) } }
      : {}),
    textModulesData: [
      { id: "number", header: details.numberLabel, body: details.number },
      ...details.secondary.map((field) => ({ id: field.key, header: field.label, body: field.value })),
      ...details.back.map((field) => ({ id: field.key, header: field.label, body: field.value })),
    ],
    barcode: { type: "QR_CODE", value: details.number, alternateText: details.number },
  };
  return { genericClass, genericObject };
}

/** The claims of the "Save to Google Wallet" JWT. */
export function buildSaveClaims(
  details: CardDetails,
  config: Pick<GoogleConfig, "issuerId" | "serviceAccountEmail">,
  options: { origin?: string; logoUrl?: string; issuedAt?: number } = {},
) {
  const { genericClass, genericObject } = buildGenericPass(details, config.issuerId, options.logoUrl);
  return {
    iss: config.serviceAccountEmail,
    aud: "google",
    typ: "savetowallet",
    iat: options.issuedAt ?? Math.floor(Date.now() / 1000),
    ...(options.origin ? { origins: [options.origin] } : {}),
    payload: {
      genericClasses: [genericClass],
      genericObjects: [genericObject],
    },
  };
}

const base64url = (input: string | Buffer) => Buffer.from(input).toString("base64url");

/** Signs claims as an RS256 JWT. */
export function signJwt(claims: object, privateKeyPem: string): string {
  const unsigned = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(JSON.stringify(claims))}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(privateKeyPem);
  return `${unsigned}.${base64url(signature)}`;
}

/** Builds the signed "Save to Google Wallet" link for a card. */
export function createGoogleSaveUrl(
  details: CardDetails,
  config: GoogleConfig,
  options: { origin?: string; logoUrl?: string } = {},
): string {
  return GOOGLE_SAVE_URL + signJwt(buildSaveClaims(details, config, options), config.privateKey);
}
