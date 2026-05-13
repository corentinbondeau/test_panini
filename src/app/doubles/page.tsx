"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { CardTile } from "@/components/cards/CardTile";
import { useCollectionSelectors, useCollectionStore } from "@/store/collectionStore";
import { useAuthStore } from "@/store/authStore";
import styles from "./page.module.css";

export default function DoublesPage() {
  const { quantities, doublesCards } = useCollectionSelectors();
  const loadCollection = useCollectionStore((state) => state.loadFromServer);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (token) {
      loadCollection(token);
    }
  }, [token, loadCollection]);

  const sorted = useMemo(
    () => [...doublesCards].sort(
      (a, b) => (quantities[b.id] ?? 0) - (quantities[a.id] ?? 0)
    ),
    [doublesCards, quantities]
  );

  return (
    <section>
      <h2>Mes doubles</h2>
      <p className={styles.note}>Cartes possédées au moins en 2 exemplaires.</p>

      <div className={styles.exchangeBanner}>
        <p>Échange tes doubles avec d&apos;autres joueurs !</p>
        <Link href="/echange" className={styles.exchangeLink}>
          Aller aux échanges →
        </Link>
      </div>

      {sorted.length === 0 ? (
        <p className={styles.empty}>{"Aucun double pour l'instant. Ouvre quelques boosters !"}</p>
      ) : (
        <div className={styles.grid}>
          {sorted.map((card) => (
            <CardTile key={card.id} card={card} quantity={quantities[card.id] ?? 0} />
          ))}
        </div>
      )}
    </section>
  );
}
