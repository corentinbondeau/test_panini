"use client";

import { BoosterDraw } from "@/components/booster/BoosterDraw";
import { ProgressPanel } from "@/components/stats/ProgressPanel";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <section className={styles.page}>
      <div className={styles.watermark}></div>
      <div className={styles.left}>
        <BoosterDraw />
      </div>
      <div className={styles.right}>
        <ProgressPanel />
      </div>
      <div className={styles.description}>
        <p>
          Bienvenue sur ECC Panini, la plateforme de collection de cartes du club.
          Collectionnez tous les joueurs, staff et dirigeants, ouvrez des boosters,
          et échangez vos doubles avec les autres supporters.
        </p>
      </div>
    </section>
  );
}