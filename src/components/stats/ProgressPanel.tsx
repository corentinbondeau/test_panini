import { useCollectionSelectors } from "@/store/collectionStore";
import { TOTAL_CARDS } from "@/data/clubCards";
import styles from "./ProgressPanel.module.css";

const ROLE_LABELS = {
  joueur: "Joueurs",
  coach: "Staff",
  dirigeant: "Dirigeants"
};

export function ProgressPanel() {
  const { uniqueCount, doublesCount, completionPercent, progressByRole } = useCollectionSelectors();

  return (
    <section className={styles.wrapper}>
      <h2>Progression</h2>
      <p className={styles.global}>
        Collection unique: <strong>{uniqueCount}</strong> / {TOTAL_CARDS} ({completionPercent}%)
      </p>
      <p className={styles.global}>
        Doubles totaux: <strong>{doublesCount}</strong>
      </p>

      {Object.entries(progressByRole).map(([role, data]) => (
        <div className={styles.roleBlock} key={role}>
          <div className={styles.row}>
            <span>{ROLE_LABELS[role as keyof typeof ROLE_LABELS]}</span>
            <strong>{data.ownedUnique}/{data.total}</strong>
          </div>
          <div className={styles.bar}>
            <span style={{ width: `${data.percent}%` }} />
          </div>
        </div>
      ))}
    </section>
  );
}
