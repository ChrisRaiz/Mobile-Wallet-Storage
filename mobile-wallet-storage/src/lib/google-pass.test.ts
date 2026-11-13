import { createVerify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { makeTestGoogleKey } from "../test/fixtures";
import { buildCardDetails, CARDS } from "./cards";
import { buildGenericPass, createGoogleSaveUrl, GOOGLE_SAVE_URL } from "./google-pass";

const config = { issuerId: "3388000000000000000", serviceAccountEmail: "wallet@test.iam.gserviceaccount.com" };

function decodePart(part: string) {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

describe("buildGenericPass", () => {
  it("links the object to its class under the issuer's id", () => {
    const details = buildCardDetails(CARDS[1], "Jordan Lee");
    const { genericClass, genericObject } = buildGenericPass(details, config.issuerId);
    expect(genericClass.id).toBe(`${config.issuerId}.mws-loyalty`);
    expect(genericObject.classId).toBe(genericClass.id);
    expect(genericObject.id).toBe(`${config.issuerId}.mws-loyalty-${details.number}`);
    expect(genericObject.id).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(genericObject.header.defaultValue.value).toBe("Jordan Lee");
    expect(genericObject.barcode.value).toBe(details.number);
  });

  it("adds the logo only when a public URL is given", () => {
    const details = buildCardDetails(CARDS[0], "Jordan Lee");
    expect(buildGenericPass(details, config.issuerId).genericObject).not.toHaveProperty("logo");
    const withLogo = buildGenericPass(details, config.issuerId, "https://example.com/pass-logo.png").genericObject;
    expect(withLogo).toHaveProperty("logo.sourceUri.uri", "https://example.com/pass-logo.png");
  });
});

describe("createGoogleSaveUrl", () => {
  const key = makeTestGoogleKey();
  const details = buildCardDetails(CARDS[0], "Jordan Lee");
  const url = createGoogleSaveUrl(details, { ...config, privateKey: key.privateKey });
  const token = url.slice(GOOGLE_SAVE_URL.length);
  const [header, claims, signature] = token.split(".");

  it("is a Google Wallet save link holding a three-part JWT", () => {
    expect(url.startsWith(GOOGLE_SAVE_URL)).toBe(true);
    expect(token.split(".")).toHaveLength(3);
    expect(decodePart(header)).toEqual({ alg: "RS256", typ: "JWT" });
  });

  it("carries the save-to-wallet claims and the pass", () => {
    const body = decodePart(claims);
    expect(body).toMatchObject({ iss: config.serviceAccountEmail, aud: "google", typ: "savetowallet" });
    expect(body.payload.genericObjects[0].header.defaultValue.value).toBe("Jordan Lee");
    expect(body.payload.genericClasses[0].id).toBe(body.payload.genericObjects[0].classId);
  });

  it("has a signature that verifies with the service account's public key", () => {
    const ok = createVerify("RSA-SHA256").update(`${header}.${claims}`).verify(key.publicKey, Buffer.from(signature, "base64url"));
    expect(ok).toBe(true);
  });

  it("fails verification if the claims are changed", () => {
    const forged = Buffer.from(JSON.stringify({ ...decodePart(claims), iss: "attacker@example.com" })).toString("base64url");
    const ok = createVerify("RSA-SHA256").update(`${header}.${forged}`).verify(key.publicKey, Buffer.from(signature, "base64url"));
    expect(ok).toBe(false);
  });
});
