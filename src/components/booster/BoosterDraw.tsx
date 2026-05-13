"use client";

import Link from "next/link";
import styles from "./BoosterDraw.module.css";
import { useAuthStore } from "@/store/authStore";

export function BoosterDraw() {
  const { isAuthenticated } = useAuthStore();

  return (
    <section className={styles.booster}>
      <h2>Ouverture de Booster</h2>
      <p className={styles.helper}>Un booster contient 4 cartes révélées une par une.</p>
      {isAuthenticated ? (
        <Link className={styles.openLink} href="/booster">
          Ouvrir un booster
        </Link>
      ) : (
        <p className={styles.loginPrompt}>Connectez-vous pour ouvrir vos boosters.</p>
      )}
    </section>
  );
}
