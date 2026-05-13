"use client";

import { useEffect, useState } from "react";
import { CLUB_CARDS } from "@/data/clubCards";
import { CardTile } from "@/components/cards/CardTile";
import { useCollectionSelectors } from "@/store/collectionStore";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import styles from "./page.module.css";

export default function AlbumPage() {
  const { user, checkAuth } = useAuthStore();
  const { quantities } = useCollectionSelectors();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    checkAuth().finally(() => setIsInitialized(true));
  }, [checkAuth]);

  if (!isInitialized) {
    return <div className={styles.loading}>Chargement...</div>;
  }

  if (!user) {
    return (
      <section className={styles.protected}>
        <h2>Album Complet</h2>
        <p>Connectez-vous pour commencer votre collection.</p>
        <Link href="/auth" className={styles.loginLink}>Se connecter</Link>
      </section>
    );
  }

  return (
    <section>
      <h2>Album Complet</h2>
      <p className={styles.note}>Les cartes avec badge x2+ sont tes meilleures candidates pour {"l'échange"}.</p>
      <div className={styles.grid}>
        {CLUB_CARDS.map((card) => (
          <CardTile key={card.id} card={card} quantity={quantities[card.id] ?? 0} />
        ))}
      </div>
    </section>
  );
}