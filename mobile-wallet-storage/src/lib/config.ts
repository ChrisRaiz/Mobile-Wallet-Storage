/**
 * Reads the wallet credentials from environment variables. Server-only: these values
 * include private keys and must never be sent to the browser.
 */

export interface AppleConfig {
  passTypeIdentifier: string;
  teamIdentifier: string;
  wwdr: string;
  signerCert: string;
  signerKey: string;
  signerKeyPassphrase?: string;
}

export interface GoogleConfig {
  issuerId: string;
  serviceAccountEmail: string;
  privateKey: string;
}

export type ConfigResult<T> = { ok: true; config: T } | { ok: false; missing: string[] };

const APPLE_REQUIRED = [
  "APPLE_PASS_TYPE_ID",
  "APPLE_TEAM_ID",
  "APPLE_WWDR_CERT",
  "APPLE_SIGNER_CERT",
  "APPLE_SIGNER_KEY",
] as const;

const GOOGLE_REQUIRED = ["GOOGLE_ISSUER_ID", "GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_PRIVATE_KEY"] as const;

type Env = Record<string, string | undefined>;

/**
 * PEM values can be stored in an env var with real line breaks, with "\n" escapes
 * (the format Google uses in service account JSON files), or base64-encoded.
 */
export function readPem(value: string): string {
  const text = value.trim();
  if (text.includes("-----BEGIN")) return text.replace(/\\n/g, "\n");
  return Buffer.from(text, "base64").toString("utf8").trim();
}

function missingKeys(env: Env, keys: readonly string[]): string[] {
  return keys.filter((key) => !env[key]?.trim());
}

/** True when the credentials are the throwaway ones made by `npm run demo:setup`. */
export function usingDemoCredentials(env: Env = process.env): boolean {
  return env.DEMO_CREDENTIALS === "true";
}

export function getAppleConfig(env: Env = process.env): ConfigResult<AppleConfig> {
  const missing = missingKeys(env, APPLE_REQUIRED);
  if (missing.length) return { ok: false, missing };
  return {
    ok: true,
    config: {
      passTypeIdentifier: env.APPLE_PASS_TYPE_ID!.trim(),
      teamIdentifier: env.APPLE_TEAM_ID!.trim(),
      wwdr: readPem(env.APPLE_WWDR_CERT!),
      signerCert: readPem(env.APPLE_SIGNER_CERT!),
      signerKey: readPem(env.APPLE_SIGNER_KEY!),
      signerKeyPassphrase: env.APPLE_SIGNER_KEY_PASSPHRASE || undefined,
    },
  };
}

export function getGoogleConfig(env: Env = process.env): ConfigResult<GoogleConfig> {
  const missing = missingKeys(env, GOOGLE_REQUIRED);
  if (missing.length) return { ok: false, missing };
  return {
    ok: true,
    config: {
      issuerId: env.GOOGLE_ISSUER_ID!.trim(),
      serviceAccountEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL!.trim(),
      privateKey: readPem(env.GOOGLE_PRIVATE_KEY!),
    },
  };
}
