import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApplePass } from "@/lib/apple-pass";
import { buildCardDetails, CARDS } from "@/lib/cards";
import { getAppleConfig, getGoogleConfig, usingDemoCredentials } from "@/lib/config";
import { createGoogleSaveUrl } from "@/lib/google-pass";
import { hasOpenSsl } from "./fixtures";

const script = path.resolve(__dirname, "../../scripts/setup-demo.mjs");

function runScript(...args: string[]) {
  return spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
}

/** Reads KEY=value lines, the way Next.js loads .env.local. */
function parseEnv(text: string): Record<string, string> {
  return Object.fromEntries(
    text
      .split("\n")
      .filter((line) => /^[A-Z_]+=/.test(line))
      .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]),
  );
}

describe.skipIf(!hasOpenSsl())("npm run demo:setup", () => {
  let dir: string;
  let env: Record<string, string>;

  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), "mws-setup-test-"));
    const result = runScript("--out", path.join(dir, ".env.local"));
    expect(result.status, result.stderr).toBe(0);
    env = parseEnv(readFileSync(path.join(dir, ".env.local"), "utf8"));
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("writes complete credentials for both platforms, marked as demo credentials", () => {
    expect(usingDemoCredentials(env)).toBe(true);
    expect(getAppleConfig(env).ok).toBe(true);
    expect(getGoogleConfig(env).ok).toBe(true);
  });

  it("produces an Apple pass whose signature verifies against the demo authority", async () => {
    const apple = getAppleConfig(env);
    if (!apple.ok) throw new Error("not configured");
    const pass = await createApplePass(buildCardDetails(CARDS[0], "Jordan Lee"), apple.config);

    const passPath = path.join(dir, "demo.pkpass");
    const outDir = path.join(dir, "unpacked");
    const caPath = path.join(dir, "ca.pem");
    writeFileSync(passPath, pass);
    writeFileSync(caPath, apple.config.wwdr);
    execFileSync("unzip", ["-q", passPath, "-d", outDir]);
    execFileSync(
      "openssl",
      ["cms", "-verify", "-binary", "-inform", "DER", "-in", path.join(outDir, "signature"),
        "-content", path.join(outDir, "manifest.json"), "-CAfile", caPath, "-purpose", "any", "-out", "/dev/null"],
      { stdio: "pipe" },
    );
  });

  it("produces a signed Google Wallet link", () => {
    const google = getGoogleConfig(env);
    if (!google.ok) throw new Error("not configured");
    expect(createGoogleSaveUrl(buildCardDetails(CARDS[1], "Jordan Lee"), google.config)).toMatch(
      /^https:\/\/pay\.google\.com\/gp\/v\/save\/[\w-]+\.[\w-]+\.[\w-]+$/,
    );
  });

  it("can be run again to replace its own demo credentials", () => {
    expect(runScript("--out", path.join(dir, ".env.local")).status).toBe(0);
  });

  it("won't overwrite a file holding real credentials unless --force is given", () => {
    const realFile = path.join(dir, "real.env");
    writeFileSync(realFile, "APPLE_TEAM_ID=REALTEAM99\n");

    const refused = runScript("--out", realFile);
    expect(refused.status).toBe(1);
    expect(readFileSync(realFile, "utf8")).toBe("APPLE_TEAM_ID=REALTEAM99\n");

    expect(runScript("--out", realFile, "--force").status).toBe(0);
    expect(readFileSync(realFile, "utf8")).toContain("DEMO_CREDENTIALS=true");
  });
});
