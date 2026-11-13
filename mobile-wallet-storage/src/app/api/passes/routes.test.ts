import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { hasOpenSsl, makeTestAppleCerts, makeTestGoogleKey, type TestAppleCerts } from "../../../test/fixtures";
import { GET as appleGET } from "./apple/route";
import { GET as googleGET } from "./google/route";

const ENV_KEYS = [
  "APPLE_PASS_TYPE_ID", "APPLE_TEAM_ID", "APPLE_WWDR_CERT", "APPLE_SIGNER_CERT", "APPLE_SIGNER_KEY",
  "GOOGLE_ISSUER_ID", "GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_PRIVATE_KEY",
];

const request = (platform: string, query: string) => new Request(`http://localhost/api/passes/${platform}?${query}`);

// Start every test with no credentials set.
beforeAll(() => ENV_KEYS.forEach((key) => vi.stubEnv(key, "")));
afterEach(() => {
  vi.unstubAllEnvs();
  ENV_KEYS.forEach((key) => vi.stubEnv(key, ""));
});

describe.each([
  ["apple", appleGET],
  ["google", googleGET],
])("/api/passes/%s", (platform, GET) => {
  it("rejects an invalid request with 400", async () => {
    const res = await GET(request(platform, "card=membership&name=%3Cscript%3E"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/letters/);
  });

  it("returns 503 and lists the missing settings when not configured", async () => {
    const res = await GET(request(platform, "card=membership&name=Jordan%20Lee"));
    expect(res.status).toBe(503);
    expect((await res.json()).missing.length).toBeGreaterThan(0);
  });

  it("shows the unsigned pass data with format=json, even without credentials", async () => {
    const res = await GET(request(platform, "card=loyalty&name=Jordan%20Lee&format=json"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.signed).toBe(false);
    expect(JSON.stringify(body)).toContain("Jordan Lee");
  });
});

describe.skipIf(!hasOpenSsl())("/api/passes/apple with credentials", () => {
  let certs: TestAppleCerts;
  beforeAll(() => {
    certs = makeTestAppleCerts();
  });
  afterAll(() => certs?.cleanup());

  it("returns a signed .pkpass download", async () => {
    vi.stubEnv("APPLE_PASS_TYPE_ID", "pass.com.example.test");
    vi.stubEnv("APPLE_TEAM_ID", "TEAMID1234");
    vi.stubEnv("APPLE_WWDR_CERT", certs.wwdr);
    // Stored with \n escapes, the way keys are often pasted into hosting dashboards.
    vi.stubEnv("APPLE_SIGNER_CERT", certs.signerCert.replace(/\n/g, "\\n"));
    // Stored as base64, the other supported format.
    vi.stubEnv("APPLE_SIGNER_KEY", Buffer.from(certs.signerKey).toString("base64"));

    const res = await appleGET(request("apple", "card=membership&name=Jordan%20Lee"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/vnd.apple.pkpass");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="example-club.pkpass"');
    const bytes = Buffer.from(await res.arrayBuffer());
    expect(bytes.subarray(0, 4).toString("hex")).toBe("504b0304"); // zip file signature
  });
});

describe("/api/passes/google with credentials", () => {
  it("redirects to a Google Wallet save link", async () => {
    vi.stubEnv("GOOGLE_ISSUER_ID", "3388000000000000000");
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", "wallet@test.iam.gserviceaccount.com");
    vi.stubEnv("GOOGLE_PRIVATE_KEY", makeTestGoogleKey().privateKey.replace(/\n/g, "\\n"));

    const res = await googleGET(request("google", "card=event&name=Jordan%20Lee"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toMatch(/^https:\/\/pay\.google\.com\/gp\/v\/save\/[\w-]+\.[\w-]+\.[\w-]+$/);
  });

  it("shows the signed link instead of redirecting when using demo credentials", async () => {
    vi.stubEnv("DEMO_CREDENTIALS", "true");
    vi.stubEnv("GOOGLE_ISSUER_ID", "3388000000000000000");
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", "local-demo@example.invalid");
    vi.stubEnv("GOOGLE_PRIVATE_KEY", makeTestGoogleKey().privateKey);

    const res = await googleGET(request("google", "card=event&name=Jordan%20Lee"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.signed).toBe(true);
    expect(body.saveUrl).toMatch(/^https:\/\/pay\.google\.com\/gp\/v\/save\//);
    expect(body.claims.payload.genericObjects[0].header.defaultValue.value).toBe("Jordan Lee");
  });
});
