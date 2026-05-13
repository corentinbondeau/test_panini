"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BoosterDraw } from "@/components/booster/BoosterDraw";
import { ProgressPanel } from "@/components/stats/ProgressPanel";
import { useCollectionStore } from "@/store/collectionStore";
import { useAuthStore } from "@/store/authStore";
import { COLLECTIONS, ALL_COLLECTIONS_ID } from "@/data/cards";
import styles from "./page.module.css";

const ALL_OPTION = { id: ALL_COLLECTIONS_ID, name: "Toutes les collections" };
const TAB_OPTIONS = [ALL_OPTION, ...COLLECTIONS];

export default function HomePage() {
  const storeCollectionId = useCollectionStore((s) => s.activeCollectionId);
  const setActiveCollectionId = useCollectionStore((s) => s.setActiveCollectionId);
  const loadCollection = useCollectionStore((s) => s.loadFromServer);
  const token = useAuthStore((s) => s.token);
  const [selectedCollection, setSelectedCollection] = useState(storeCollectionId);
  const [tradesRemaining, setTradesRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (token) {
      loadCollection(token, selectedCollection);
    }
  }, [token, selectedCollection, loadCollection]);

  useEffect(() => {
    if (!token) { setTradesRemaining(null); return; }
    fetch("/api/user/quotas", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setTradesRemaining(d.tradesRemainingToday))
      .catch(() => {});
  }, [token]);

  const handleChange = (id: string) => {
    setSelectedCollection(id);
    setActiveCollectionId(id);
  };

  return (
    <section className={styles.page}>
      <div className={styles.watermark}></div>
      <div className={styles.description}>
        <p>
          {"Bienvenue sur ECC Panini, la plateforme de collection de cartes du club. Collectionnez tous les joueurs, staff et dirigeants, ouvrez des boosters, et echangez vos doubles avec les autres supporters."}
        </p>
      </div>

      <Link href="/echange" className={styles.exchangeShortcut}>
        <span className={styles.exchangeShortcutIcon}>↔</span>
        <span className={styles.exchangeShortcutLabel}>
          Échanger mes doubles
          {tradesRemaining !== null && (
            <span className={styles.exchangeShortcutCount}>
              {tradesRemaining} échange{tradesRemaining > 1 ? "s" : ""} restant{tradesRemaining > 1 ? "s" : ""} aujourd&apos;hui
            </span>
          )}
        </span>
        <span className={styles.exchangeShortcutArrow}>→</span>
      </Link>

      <div className={styles.selectorWrapper}>
        <div className={styles.seasonTabs}>
          {TAB_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleChange(opt.id)}
              className={selectedCollection === opt.id ? styles.tabActive : styles.tab}
            >
              {opt.name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.left}>
        <BoosterDraw />
      </div>
      <div className={styles.right}>
        <ProgressPanel collectionId={selectedCollection} />
      </div>
    </section>
  );
}
