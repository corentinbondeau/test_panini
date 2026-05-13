import { useAuthStore } from "@/store/authStore";
import { useCollectionSelectors } from "@/store/collectionStore";
import { COLLECTIONS, ALL_COLLECTIONS_ID } from "@/data/cards";
import styles from "./ProgressPanel.module.css";

const ROLE_LABELS: Record<string, string> = {
  joueur: "Joueurs",
  coach: "Staff",
  dirigeant: "Dirigeants"
};

const FALLBACK_ROLES = ["joueur", "coach", "dirigeant"] as const;

type ProgressPanelProps = {
  collectionId?: string;
};

export function ProgressPanel({ collectionId }: ProgressPanelProps) {
  const { user } = useAuthStore();
  const { uniqueCount, doublesCount, completionPercent, progressByRole, totalCards } =
    useCollectionSelectors(collectionId);

  const isAll = collectionId === ALL_COLLECTIONS_ID;
  const collectionName = isAll
    ? "Toutes les collections"
    : (COLLECTIONS.find((c) => c.id === collectionId)?.name ?? "");

  return (
    <section className={styles.wrapper}>
      <h2>Progression</h2>
      {user && collectionName && (
        <p className={styles.collectionName}>{collectionName}</p>
      )}
      <p className={styles.global}>
        Collection unique: <strong>{user ? uniqueCount : 0}</strong> / {totalCards} ({user ? completionPercent : 0}%)
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
