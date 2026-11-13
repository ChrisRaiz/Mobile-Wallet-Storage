"use client";

import { useId, useState } from "react";
import { buildCardDetails, CARDS, NAME_MAX_LENGTH, validateCardRequest, type CardId } from "@/lib/cards";
import PassPreview from "./PassPreview";
import styles from "./page.module.css";

interface Props {
  appleReady: boolean;
  googleReady: boolean;
  /** The server is using the throwaway credentials from `npm run demo:setup`. */
  demoCredentials: boolean;
}

function passUrl(platform: "apple" | "google", card: CardId, name: string, preview = false): string {
  const params = new URLSearchParams({ card, name: name.trim() });
  if (preview) params.set("format", "json");
  return `/api/passes/${platform}?${params}`;
}

export default function WalletDemo({ appleReady, googleReady, demoCredentials }: Props) {
  const [cardId, setCardId] = useState<CardId>("membership");
  const [name, setName] = useState("Jordan Lee");
  const nameId = useId();
  const errorId = useId();

  const validation = validateCardRequest(cardId, name);
  const details = validation.ok ? buildCardDetails(validation.template, validation.holderName) : null;
  const template = CARDS.find((card) => card.id === cardId)!;
  const demoMode = !appleReady && !googleReady;

  return (
    <div className={styles.layout}>
      <section className={styles.form} aria-label="Choose a card">
        {demoMode && (
          <div className={styles.banner} role="note">
            <strong>Demo mode.</strong> No wallet credentials are set on this server, so passes can&apos;t be
            signed yet. You can still preview each card and open the exact data that would be signed. Run{" "}
            <code>npm run demo:setup</code> to try the full flow locally.
          </div>
        )}
        {demoCredentials && (
          <div className={styles.banner} role="note">
            <strong>Local demo.</strong> Passes are signed with throwaway test certificates. Apple Wallet downloads a
            complete, signed <code>.pkpass</code> file, and Google Wallet shows the signed save link. Phones only
            accept passes signed with credentials from Apple or Google, so add real ones to save a card.
          </div>
        )}

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>1. Choose a card</legend>
          <div className={styles.choices}>
            {CARDS.map((card) => (
              <label key={card.id} className={styles.choice} data-selected={card.id === cardId}>
                <input
                  type="radio"
                  name="card"
                  value={card.id}
                  checked={card.id === cardId}
                  onChange={() => setCardId(card.id)}
                />
                <span className={styles.swatch} style={{ background: card.colors.background }} aria-hidden="true" />
                <span>
                  <span className={styles.choiceName}>{card.name}</span>
                  <span className={styles.choiceSummary}>{card.summary}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className={styles.fieldset}>
          <label className={styles.legend} htmlFor={nameId}>
            2. Name on the card
          </label>
          <input
            id={nameId}
            className={styles.input}
            value={name}
            maxLength={NAME_MAX_LENGTH + 10}
            autoComplete="name"
            onChange={(event) => setName(event.target.value)}
            aria-invalid={!validation.ok}
            aria-describedby={!validation.ok ? errorId : undefined}
          />
          {!validation.ok && (
            <p id={errorId} className={styles.error}>
              {validation.error}
            </p>
          )}
        </div>

        <div className={styles.fieldset}>
          <p className={styles.legend}>3. Save it</p>
          <div className={styles.buttons}>
            <WalletButton
              label="Add to Apple Wallet"
              hint={demoCredentials ? "Downloads a test-signed .pkpass file" : "Opens on iPhone, or in Safari on a Mac"}
              href={details ? passUrl("apple", cardId, name) : undefined}
              ready={appleReady}
            />
            <WalletButton
              label="Add to Google Wallet"
              hint={demoCredentials ? "Shows the signed save link" : "Opens Google's Save to Wallet page"}
              href={details ? passUrl("google", cardId, name) : undefined}
              ready={googleReady}
            />
          </div>
          {details && (
            <p className={styles.dataLinks}>
              See the data each pass is built from:{" "}
              <a href={passUrl("apple", cardId, name, true)} target="_blank" rel="noreferrer">
                Apple pass.json
              </a>{" "}
              ·{" "}
              <a href={passUrl("google", cardId, name, true)} target="_blank" rel="noreferrer">
                Google Wallet token
              </a>
            </p>
          )}
        </div>
      </section>

      <section className={styles.previewCol} aria-label="Pass preview">
        <PassPreview template={template} details={details} />
        <p className={styles.previewNote}>
          Live preview. The saved pass uses the same fields. Each wallet app lays them out in its own style.
        </p>
      </section>
    </div>
  );
}

function WalletButton({ label, hint, href, ready }: { label: string; hint: string; href?: string; ready: boolean }) {
  if (ready && href) {
    return (
      <a className={styles.walletButton} href={href}>
        <span>{label}</span>
        <small>{hint}</small>
      </a>
    );
  }
  return (
    <button type="button" className={styles.walletButton} disabled>
      <span>{label}</span>
      <small>{ready ? "Fix the name above first" : "Not configured on this server"}</small>
    </button>
  );
}
