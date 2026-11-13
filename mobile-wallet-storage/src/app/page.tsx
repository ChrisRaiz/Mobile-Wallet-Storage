import { getAppleConfig, getGoogleConfig } from "@/lib/config";
import WalletDemo from "./WalletDemo";
import styles from "./page.module.css";

// Read the credentials on every request, so adding them doesn't need a rebuild.
export const dynamic = "force-dynamic";

export default function Home() {
  // Only whether each platform is set up is sent to the browser, never the keys.
  const appleReady = getAppleConfig().ok;
  const googleReady = getGoogleConfig().ok;

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Mobile Wallet Storage</p>
        <h1 className={styles.title}>Save a card to your phone&apos;s wallet</h1>
        <p className={styles.lede}>
          Pick a card, add your name, and save it to Apple Wallet or Google Wallet. The pass is built and
          signed on the server when you tap the button.
        </p>
      </header>

      <WalletDemo appleReady={appleReady} googleReady={googleReady} />

      <footer className={styles.footer}>
        These cards are demos and have no real membership, points, or tickets attached.{" "}
        <a href="https://chrisraiz.github.io/Mobile-Wallet-Storage/">Documentation</a> ·{" "}
        <a href="https://github.com/ChrisRaiz/Mobile-Wallet-Storage">Source on GitHub</a>
      </footer>
    </main>
  );
}
