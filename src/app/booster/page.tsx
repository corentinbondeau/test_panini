"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BoosterCardDraw, useCollectionStore } from "@/store/collectionStore";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import styles from "./page.module.css";

function CardGlow({ card }: { card: BoosterCardDraw["card"] }) {
  const isRare = card.role === "coach" || card.role === "dirigeant";
  if (!isRare) return null;
  return (
    <div className={styles.rareGlow}>
      {[...Array(6)].map((_, i) => (
        <span key={i} className={styles.particle} style={{
          left: `${20 + Math.random() * 60}%`,
          top: `${10 + Math.random() * 80}%`,
          animationDelay: `${i * 0.15}s`,
          width: `${4 + Math.random() * 6}px`,
          height: `${4 + Math.random() * 6}px`,
        }} />
      ))}
    </div>
  );
}

const cardVariants = {
  hidden: { rotateY: 180, scale: 0.6, opacity: 0 },
  visible: (i: number) => ({
    rotateY: 0,
    scale: 1,
    opacity: 1,
    transition: { delay: i * 0.15, duration: 0.5, ease: "easeOut" as const },
  }),
};

const shakeVariants = {
  idle: { x: 0 },
  shake: {
    x: [0, -6, 6, -4, 4, -2, 2, 0],
    transition: { duration: 0.5 },
  },
};

export default function BoosterPage() {
  const { user } = useAuthStore();
  const openBoosterPack = useCollectionStore((state) => state.openBoosterPack);
  const syncToServer = useCollectionStore((state) => state.syncToServer);
  const [draws, setDraws] = useState<BoosterCardDraw[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const visibleDraws = useMemo(() => draws.slice(0, revealedCount), [draws, revealedCount]);

  const handleOpenBooster = useCallback(async () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);

    setTimeout(() => {
      const nextDraws = openBoosterPack();
      setDraws(nextDraws);
      setRevealedCount(0);
      setIsRevealing(true);
    }, 600);
  }, [openBoosterPack]);

  useEffect(() => {
    if (!isRevealing || draws.length === 0) return;
    if (revealedCount >= draws.length) {
      setIsRevealing(false);
      const token = useAuthStore.getState().token;
      if (token) {
        setIsSyncing(true);
        syncToServer(token).finally(() => setIsSyncing(false));
      }
      return;
    }
    const timeout = setTimeout(() => {
      setRevealedCount((count) => count + 1);
    }, 700);
    return () => clearTimeout(timeout);
  }, [draws.length, isRevealing, revealedCount, syncToServer]);

  if (!user) {
    return (
      <section className={styles.page}>
        <div className={styles.loginPrompt}>
          <h2>Ouverture de Booster</h2>
          <p>Connectez-vous pour ouvrir vos boosters et collectionner des cartes.</p>
          <Link href="/auth" className={styles.loginLink}>Se connecter</Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <h2>Ouverture de booster (4 cartes)</h2>
        <motion.button
          onClick={handleOpenBooster}
          disabled={isRevealing || isShaking}
          variants={shakeVariants}
          animate={isShaking ? "shake" : "idle"}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={styles.openBtn}
        >
          {isRevealing ? "Révélation en cours..." : isShaking ? "Shh...!" : "Ouvrir un booster"}
        </motion.button>
      </div>

      {isSyncing && <p className={styles.syncing}>Synchronisation...</p>}

      <p className={styles.note}>
        Les cartes apparaissent une par une. Les cartes Staff et Dirigeants ont un éclat doré.
      </p>

      <div className={styles.grid}>
        {[0, 1, 2, 3].map((index) => {
          const draw = visibleDraws[index];
          if (!draw) {
            return (
              <div key={index} className={`${styles.card} ${styles.placeholder}`}>
                <p>Carte {index + 1}</p>
              </div>
            );
          }
          const isRare = draw.card.role === "coach" || draw.card.role === "dirigeant";
          return (
            <AnimatePresence key={`${draw.card.id}-${index}`}>
              <motion.div
                custom={index}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className={`${styles.card} ${styles.revealed} ${draw.wasDuplicate ? styles.duplicate : ""} ${isRare ? styles.rare : styles.newCard}`}
              >
                <CardGlow card={draw.card} />
                <div className={styles.badges}>
                  <span className={styles.role}>{draw.card.category}</span>
                  {draw.wasDuplicate ? <span className={styles.doubleBadge}>DOUBLE x{draw.quantityAfter}</span> : null}
                  {isRare && <span className={styles.rareBadge}>⭐ RARE</span>}
                </div>
                <h3>{draw.card.firstName} {draw.card.lastName}</h3>
                <p className={styles.meta}>#{draw.card.number.toString().padStart(3, "0")} — {draw.card.category}</p>
                <div className={styles.photoWrap}>
                  <Image className={styles.photo} src={draw.card.photo}
                    alt={`${draw.card.firstName} ${draw.card.lastName}`}
                    width={640} height={360} />
                </div>
              </motion.div>
            </AnimatePresence>
          );
        })}
      </div>

      <AnimatePresence>
        {!isRevealing && draws.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.summary}
          >
            <p>Booster ouvert ! {draws.filter((d) => d.wasDuplicate).length} double(s) obtenu(s).</p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}