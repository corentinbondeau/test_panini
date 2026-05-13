import { useAuthStore } from "@/store/authStore";
import { useCollectionSelectors } from "@/store/collectionStore";
import { TOTAL_CARDS } from "@/data/clubCards";
import styles from "./ProgressPanel.module.css";

const ROLE_LABELS: Record<string, string> = {
  joueur: "Joueurs",
  coach: "Staff",
  dirigeant: "Dirigeants"
};

const FALLBACK_ROLES = ["joueur", "coach", "dirigeant"] as const;

export function ProgressPanel() {
  const { user } = useAuthStore();
  const { uniqueCount, doublesCount, completionPercent, progressByRole } = useCollectionSelectors();

  return (
    <section className={styles.wrapper}>
      <h2>Progression</h2>
      <p className={styles.global}>
        Collection unique: <strong>{user ? uniqueCount : 0}</strong> / {TOTAL_CARDS} ({user ? completionPercent : 0}%)
      </p>
      <p className={styles.global}>
        Doubles totaux: <strong>{user ? doublesCount : 0}</strong>
      </p>

      {user
        ? Object.entries(progressByRole).map(([role, data]) => (
            <div className={styles.roleBlock} key={role}>
              <div className={styles.row}>
                <span>{ROLE_LABELS[role] ?? role}</span>
                <strong>{data.ownedUnique}/{data.total}</strong>
              </div>
              <div className={styles.bar}>
                <span style={{ width: `${data.percent}%` }} />
              </div>
            </div>
          ))
        : FALLBACK_ROLES.map((role) => (
            <div className={styles.roleBlock} key={role}>
              <div className={styles.row}>
                <span>{ROLE_LABELS[role]}</span>
                <strong>0/0</strong>
              </div>
              <div className={styles.bar}>
                <span style={{ width: "0%" }} />
              </div>
            </div>
          ))}
    </section>
  );
}