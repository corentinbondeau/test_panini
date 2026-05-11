"use client";

import { CLUB_CARDS } from "@/data/clubCards";
import { CardTile } from "@/components/cards/CardTile";
import { useCollectionSelectors } from "@/store/collectionStore";
import styles from "./page.module.css";

export default function AlbumPage() {
  const { quantities } = useCollectionSelectors();

  return (
    <section>
      <h2>Album Complet</h2>
      <p className={styles.note}>Les cartes avec badge x2+ sont tes meilleures candidates pour l&apos;échange.</p>
      <div className={styles.grid}>
        {CLUB_CARDS.map((card) => (
          <CardTile key={card.id} card={card} quantity={quantities[card.id] ?? 0} />
        ))}
      </div>
    </section>
  );
}
