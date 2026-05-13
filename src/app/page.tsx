"use client";

import { BoosterDraw } from "@/components/booster/BoosterDraw";
import { ProgressPanel } from "@/components/stats/ProgressPanel";
import { useCollectionSelectors } from "@/store/collectionStore";
import { shareCollection } from "@/lib/shareCollection";
import { CLUB_CARDS } from "@/data/clubCards";
import styles from "./page.module.css";

export default function HomePage() {
  const { quantities, doublesCards } = useCollectionSelectors();

  const handleShare = async () => {
    const { text, url } = shareCollection(CLUB_CARDS, quantities);
    const payload = `${text}\n\n${url}`;
    if (navigator.share) {
      await navigator.share({ title: "Mes doubles Panini Club", text: payload });
      return;
    }
    await navigator.clipboard.writeText(payload);
    alert("Résumé copié dans le presse-papiers.");
  };

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
          Bienvenue sur le projet ECC Panini, une plateforme dédiée à la collection et à l'échange de cartes du club. Créez votre collection, partagez vos doubles et connectez-vous avec d'autres passionnés !
        </p>
      </div>
    </section>
  );
}
