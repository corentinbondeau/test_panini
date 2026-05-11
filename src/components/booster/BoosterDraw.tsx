"use client";

import Link from "next/link";
import styles from "./BoosterDraw.module.css";

export function BoosterDraw() {
  return (
    <section className={styles.booster}>
      <h2>Ouverture de Booster</h2>
      <p className={styles.helper}>Un booster contient 4 cartes révélées une par une.</p>
      <Link className={styles.openLink} href="/booster">
        Ouvrir un booster
      </Link>
    </section>
  );
}
