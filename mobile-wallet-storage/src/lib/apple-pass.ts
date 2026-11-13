/**
 * Apple Wallet passes. A pass is a .pkpass file: a zip archive holding pass.json, its
 * images, a manifest of SHA-1 hashes, and a PKCS #7 signature of that manifest made
 * with the issuer's Pass Type ID certificate. passkit-generator writes the manifest,
 * signature, and archive; this module decides what goes in pass.json.
 */
import { PKPass } from "passkit-generator";
import type { CardDetails } from "./cards";
import type { AppleConfig } from "./config";
import { passImages } from "./pass-images";

export const PKPASS_CONTENT_TYPE = "application/vnd.apple.pkpass";

function hexToRgb(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

/** The pass.json contents for a card, without the signing identifiers filled in. */
export function buildPassJson(
  details: CardDetails,
  ids: { passTypeIdentifier: string; teamIdentifier: string },
) {
  const { template } = details;
  return {
    formatVersion: 1,
    passTypeIdentifier: ids.passTypeIdentifier,
    teamIdentifier: ids.teamIdentifier,
    serialNumber: `${template.id}-${details.number}`,
    organizationName: template.organization,
    description: template.description,
    logoText: template.organization,
    backgroundColor: hexToRgb(template.colors.background),
    foregroundColor: hexToRgb(template.colors.foreground),
    labelColor: hexToRgb(template.colors.label),
    ...(details.relevantDate ? { relevantDate: details.relevantDate } : {}),
    [template.appleStyle]: {
      headerFields: [{ key: "number", label: details.numberLabel, value: details.number }],
      primaryFields: [{ key: "holder", label: template.holderLabel, value: details.holderName }],
      secondaryFields: details.secondary,
      backFields: details.back,
    },
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: details.number,
        messageEncoding: "iso-8859-1",
        altText: details.number,
      },
    ],
  };
}

/** Builds and signs a .pkpass file. */
export async function createApplePass(details: CardDetails, config: AppleConfig): Promise<Buffer> {
  const passJson = buildPassJson(details, config);
  const pass = new PKPass(
    {
      "pass.json": Buffer.from(JSON.stringify(passJson)),
      // icon.png is required; the larger icons and the logo are optional.
      ...passImages(),
    },
    {
      wwdr: config.wwdr,
      signerCert: config.signerCert,
      signerKey: config.signerKey,
      signerKeyPassphrase: config.signerKeyPassphrase,
    },
  );
  return pass.getAsBuffer();
}

/** A safe download name, such as "example-club.pkpass". */
export function passFileName(details: CardDetails): string {
  return `${details.template.organization.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pkpass`;
}
