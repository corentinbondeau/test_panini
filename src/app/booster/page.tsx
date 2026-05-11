"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { BoosterCardDraw, useCollectionStore } from "@/store/collectionStore";
import styles from "./page.module.css";

export default function BoosterPage() {
  const openBoosterPack = useCollectionStore((state) => state.openBoosterPack);
  const [draws, setDraws] = useState<BoosterCardDraw[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);

  const visibleDraws = useMemo(() => draws.slice(0, revealedCount), [draws, revealedCount]);
  const handleOpenBooster = () => {
    const nextDraws = openBoosterPack();
    setDraws(nextDraws);
    setRevealedCount(0);
    setIsRevealing(true);
  };

  useEffect(() => {
    if (!isRevealing || draws.length === 0) return;
    if (revealedCount >= draws.length) {
      setIsRevealing(false);
      return;
    }

    const timeout = setTimeout(() => {
      setRevealedCount((count) => count + 1);
    }, 850);

    return () => clearTimeout(timeout);
  }, [draws.length, isRevealing, revealedCount]);

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <h2>Ouverture de booster (4 cartes)</h2>
        <button onClick={handleOpenBooster} disabled={isRevealing}>
          {isRevealing ? "Révélation en cours..." : "Ouvrir un booster"}
        </button>
      </div>

      <p className={styles.note}>
        Les cartes apparaissent automatiquement une par une. Les doubles ont un effet lumineux doré.
      </p>

      <div className={styles.grid}>
        {[0, 1, 2, 3].map((index) => {
          const draw = visibleDraws[index];
          if (!draw) {
            return (
              <article key={index} className={`${styles.card} ${styles.placeholder}`}>
                <p>Carte {index + 1}</p>
              </article>
            );
          }

          return (
            <article
              key={`${draw.card.id}-${index}`}
              className={`${styles.card} ${styles.revealed} ${draw.wasDuplicate ? styles.duplicate : styles.newCard}`}
            >
              <div className={styles.badges}>
                <span className={styles.role}>{draw.card.category}</span>
                {draw.wasDuplicate ? <span className={styles.doubleBadge}>DOUBLE x{draw.quantityAfter}</span> : null}
              </div>
              <h3>{draw.card.name}</h3>
              <p className={styles.meta}>
                #{draw.card.number.toString().padStart(3, "0")} - Catégorie: {draw.card.category}
              </p>
              <div className={styles.photoWrap}>
                <Image
                  className={styles.photo}
                  src={draw.card.photo}
                  alt={`Photo ${draw.card.name}`}
                  width={640}
                  height={360}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
