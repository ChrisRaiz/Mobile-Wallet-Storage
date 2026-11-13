/**
 * Test credentials. Real passes need certificates from Apple and a key from Google, so
 * the tests create stand-ins: a throwaway certificate authority in place of Apple's
 * WWDR certificate, a signer certificate it issues, and an RSA key pair in place of a
 * Google service account key. Nothing here is valid outside the tests.
 */
import { execFileSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export interface TestAppleCerts {
  dir: string;
  caPath: string;
  wwdr: string;
  signerCert: string;
  signerKey: string;
  cleanup: () => void;
}

export function hasOpenSsl(): boolean {
  try {
    execFileSync("openssl", ["version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function makeTestAppleCerts(): TestAppleCerts {
  const dir = mkdtempSync(path.join(tmpdir(), "mws-test-"));
  const file = (name: string) => path.join(dir, name);
  const openssl = (...args: string[]) => execFileSync("openssl", args, { cwd: dir, stdio: "pipe" });

  openssl("req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", "ca.key", "-out", "ca.pem",
    "-days", "1", "-subj", "/CN=Test WWDR Authority");
  openssl("req", "-newkey", "rsa:2048", "-nodes", "-keyout", "signer.key", "-out", "signer.csr",
    "-subj", "/CN=Pass Type ID: pass.com.example.test/OU=TEAMID1234");
  openssl("x509", "-req", "-in", "signer.csr", "-CA", "ca.pem", "-CAkey", "ca.key", "-CAcreateserial",
    "-out", "signer.pem", "-days", "1");

  return {
    dir,
    caPath: file("ca.pem"),
    wwdr: readFileSync(file("ca.pem"), "utf8"),
    signerCert: readFileSync(file("signer.pem"), "utf8"),
    signerKey: readFileSync(file("signer.key"), "utf8"),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

export function makeTestGoogleKey() {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return {
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKey,
  };
}
