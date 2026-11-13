import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hasOpenSsl, makeTestAppleCerts, type TestAppleCerts } from "../test/fixtures";
import { buildPassJson, createApplePass } from "./apple-pass";
import { buildCardDetails, CARDS } from "./cards";
import { passImages } from "./pass-images";

const ids = { passTypeIdentifier: "pass.com.example.test", teamIdentifier: "TEAMID1234" };

describe("passImages", () => {
  it("matches the PNG files in pass-assets (run `npm run embed-images` if this fails)", () => {
    const assetDir = path.resolve(__dirname, "../../pass-assets");
    const onDisk = readdirSync(assetDir).filter((name) => name.endsWith(".png")).sort();
    const embedded = passImages();
    expect(Object.keys(embedded).sort()).toEqual(onDisk);
    for (const name of onDisk) {
      expect(embedded[name].equals(readFileSync(path.join(assetDir, name)))).toBe(true);
    }
  });
});

describe("buildPassJson", () => {
  it("uses the pass style that matches each card", () => {
    for (const card of CARDS) {
      const json = buildPassJson(buildCardDetails(card, "Jordan Lee"), ids);
      expect(json).toHaveProperty(card.appleStyle);
      expect(json.formatVersion).toBe(1);
      expect(json.barcodes[0].format).toBe("PKBarcodeFormatQR");
    }
  });

  it("prints the holder's name and number", () => {
    const details = buildCardDetails(CARDS[0], "Jordan Lee");
    const json = buildPassJson(details, ids) as unknown as { serialNumber: string; backgroundColor: string; storeCard: { primaryFields: { value: string }[] } };
    expect(json.storeCard.primaryFields[0].value).toBe("Jordan Lee");
    expect(json.serialNumber).toBe(`membership-${details.number}`);
    expect(json.backgroundColor).toBe("rgb(44, 143, 158)");
  });
});

describe.skipIf(!hasOpenSsl())("createApplePass", () => {
  let certs: TestAppleCerts;
  let files: Record<string, Buffer>;
  let outDir: string;

  beforeAll(async () => {
    certs = makeTestAppleCerts();
    const pass = await createApplePass(buildCardDetails(CARDS[2], "Jordan Lee"), { ...ids, ...certs });

    // Unpack the .pkpass with the system unzip, independent of the code that made it.
    const passPath = path.join(certs.dir, "test.pkpass");
    outDir = path.join(certs.dir, "unpacked");
    mkdirSync(outDir);
    writeFileSync(passPath, pass);
    execFileSync("unzip", ["-q", passPath, "-d", outDir]);
    files = Object.fromEntries(readdirSync(outDir).map((name) => [name, readFileSync(path.join(outDir, name))]));
  });

  afterAll(() => certs?.cleanup());

  it("is a zip archive with pass.json, images, a manifest, and a signature", () => {
    expect(Object.keys(files).sort()).toEqual(
      ["icon.png", "icon@2x.png", "icon@3x.png", "logo.png", "logo@2x.png", "manifest.json", "pass.json", "signature"].sort(),
    );
  });

  it("contains the card's pass.json", () => {
    const passJson = JSON.parse(files["pass.json"].toString("utf8"));
    expect(passJson.passTypeIdentifier).toBe(ids.passTypeIdentifier);
    expect(passJson.teamIdentifier).toBe(ids.teamIdentifier);
    expect(passJson.eventTicket.primaryFields[0].value).toBe("Jordan Lee");
  });

  it("lists the correct SHA-1 hash of every file in the manifest", () => {
    const manifest: Record<string, string> = JSON.parse(files["manifest.json"].toString("utf8"));
    const listed = Object.keys(manifest).sort();
    const expected = Object.keys(files).filter((n) => n !== "manifest.json" && n !== "signature").sort();
    expect(listed).toEqual(expected);
    for (const [name, hash] of Object.entries(manifest)) {
      expect(createHash("sha1").update(files[name]).digest("hex")).toBe(hash);
    }
  });

  it("has a signature that OpenSSL verifies against the manifest and the issuing authority", () => {
    const output = execFileSync(
      "openssl",
      ["cms", "-verify", "-binary", "-inform", "DER", "-in", path.join(outDir, "signature"),
        "-content", path.join(outDir, "manifest.json"), "-CAfile", certs.caPath, "-purpose", "any", "-out", "/dev/null"],
      { stdio: "pipe" },
    );
    expect(output).toBeDefined(); // execFileSync throws if verification fails
  });

  it("fails verification if the manifest is changed after signing", () => {
    const tampered = path.join(certs.dir, "tampered.json");
    writeFileSync(tampered, files["manifest.json"].toString("utf8").replace(/"[0-9a-f]{40}"/, `"${"0".repeat(40)}"`));
    expect(() =>
      execFileSync(
        "openssl",
        ["cms", "-verify", "-binary", "-inform", "DER", "-in", path.join(outDir, "signature"),
          "-content", tampered, "-CAfile", certs.caPath, "-purpose", "any", "-out", "/dev/null"],
        { stdio: "pipe" },
      ),
    ).toThrow();
  });
});
