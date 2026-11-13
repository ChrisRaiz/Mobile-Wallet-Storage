// Creates throwaway test credentials so the whole app works as a local demo.
// Run with `npm run demo:setup`, then `npm run dev`.
//
// It writes .env.local with:
//   - a test certificate authority standing in for Apple's WWDR certificate,
//   - a Pass Type ID certificate and key issued by that authority, and
//   - an RSA key pair standing in for a Google service account key.
//
// Passes signed this way are complete and correctly signed, but Apple Wallet and
// Google Wallet only accept passes signed with credentials they issued. Use real
// credentials (see .env.example) to save passes on a phone.
//
// Options:
//   --out <file>  Write somewhere other than .env.local
//   --force       Replace an existing .env.local that holds real credentials
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
const outFile = outIndex >= 0 ? path.resolve(args[outIndex + 1]) : path.join(appDir, ".env.local");
const force = args.includes("--force");

if (existsSync(outFile) && !force && !readFileSync(outFile, "utf8").includes("DEMO_CREDENTIALS=true")) {
  console.error(
    `${path.basename(outFile)} already exists and doesn't look like demo credentials, so it was left alone.\n` +
      "Run `npm run demo:setup -- --force` to replace it.",
  );
  process.exit(1);
}

try {
  execFileSync("openssl", ["version"], { stdio: "ignore" });
} catch {
  console.error("openssl wasn't found. It comes with macOS and most Linux systems; on Windows, use Git Bash or WSL.");
  process.exit(1);
}

const dir = mkdtempSync(path.join(tmpdir(), "mws-demo-"));
const openssl = (...a) => execFileSync("openssl", a, { cwd: dir, stdio: "pipe" });
const b64 = (name) => readFileSync(path.join(dir, name)).toString("base64");

try {
  openssl("req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", "ca.key", "-out", "ca.pem",
    "-days", "365", "-subj", "/CN=Mobile Wallet Storage Local Demo Authority");
  openssl("req", "-newkey", "rsa:2048", "-nodes", "-keyout", "signer.key", "-out", "signer.csr",
    "-subj", "/CN=Pass Type ID: pass.com.example.localdemo/OU=DEMOTEAM01");
  openssl("x509", "-req", "-in", "signer.csr", "-CA", "ca.pem", "-CAkey", "ca.key", "-CAcreateserial",
    "-out", "signer.pem", "-days", "365");
  openssl("genpkey", "-algorithm", "RSA", "-pkeyopt", "rsa_keygen_bits:2048", "-out", "google.key");

  const lines = [
    "# Local demo credentials, created by `npm run demo:setup`.",
    "# These are throwaway test certificates and keys. Passes signed with them are",
    "# valid files, but Apple Wallet and Google Wallet won't accept them.",
    "# Replace this file with real credentials (see .env.example) to save passes on a phone.",
    "DEMO_CREDENTIALS=true",
    "",
    "APPLE_PASS_TYPE_ID=pass.com.example.localdemo",
    "APPLE_TEAM_ID=DEMOTEAM01",
    `APPLE_WWDR_CERT=${b64("ca.pem")}`,
    `APPLE_SIGNER_CERT=${b64("signer.pem")}`,
    `APPLE_SIGNER_KEY=${b64("signer.key")}`,
    "",
    "GOOGLE_ISSUER_ID=3388000000000000000",
    "GOOGLE_SERVICE_ACCOUNT_EMAIL=local-demo@example.invalid",
    `GOOGLE_PRIVATE_KEY=${b64("google.key")}`,
    "",
  ];
  writeFileSync(outFile, lines.join("\n"), { mode: 0o600 });
  console.log(`Demo credentials written to ${path.relative(process.cwd(), outFile) || outFile}.`);
  console.log("Start the app with `npm run dev` and open http://localhost:3000.");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
