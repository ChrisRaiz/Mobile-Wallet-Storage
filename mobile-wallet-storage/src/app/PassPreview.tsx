import type { CardDetails, CardTemplate } from "@/lib/cards";
import styles from "./page.module.css";

/** A decorative grid that stands in for the QR code. It is not scannable. */
function QrPlaceholder({ seed }: { seed: string }) {
  const size = 11;
  let h = 0;
  for (const ch of seed) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  const cells: boolean[] = [];
  for (let i = 0; i < size * size; i++) {
    h = (Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) + i) >>> 0;
    const x = i % size;
    const y = Math.floor(i / size);
    const finder = (x < 3 && y < 3) || (x > size - 4 && y < 3) || (x < 3 && y > size - 4);
    cells.push(finder || (h & 1) === 1);
  }
  return (
    <div className={styles.qr} aria-hidden="true">
      {cells.map((on, i) => (
        <i key={i} data-on={on} />
      ))}
    </div>
  );
}

export default function PassPreview({ template, details }: { template: CardTemplate; details: CardDetails | null }) {
  const { colors } = template;
  return (
    <div
      className={styles.pass}
      style={{ background: colors.background, color: colors.foreground, ["--label" as string]: colors.label }}
      role="img"
      aria-label={
        details
          ? `${template.name} preview for ${details.holderName}, ${details.numberLabel} ${details.number}`
          : `${template.name} preview`
      }
    >
      <div className={styles.passTop}>
        <span className={styles.passOrg}>
          <i aria-hidden="true" />
          {template.organization}
        </span>
        {details && (
          <span className={styles.passNumber}>
            <span className={styles.passLabel}>{details.numberLabel}</span>
            {details.number}
          </span>
        )}
      </div>
      <div className={styles.passPrimary}>
        <span className={styles.passLabel}>{template.holderLabel}</span>
        <span className={styles.passHolder}>{details ? details.holderName : "Your name"}</span>
      </div>
      {details && (
        <div className={styles.passFields}>
          {details.secondary.map((field) => (
            <div key={field.key}>
              <span className={styles.passLabel}>{field.label}</span>
              <span className={styles.passValue}>{field.value}</span>
            </div>
          ))}
        </div>
      )}
      <div className={styles.passCode}>
        <QrPlaceholder seed={details?.number ?? template.id} />
        {details && <span>{details.number}</span>}
      </div>
    </div>
  );
}
