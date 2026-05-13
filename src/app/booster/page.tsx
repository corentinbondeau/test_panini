"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCollectionStore, BoosterCardDraw } from "@/store/collectionStore";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import styles from "./page.module.css";

const PACK_SIZE = 5;

export default function BoosterPage() {
  const { user } = useAuthStore();
  const openBoosterPack = useCollectionStore((s) => s.openBoosterPack);
  const syncToServer = useCollectionStore((s) => s.syncToServer);
  const [draws, setDraws] = useState<BoosterCardDraw[]>([]);
  const [phase, setPhase] = useState<"idle" | "shake" | "flash" | "back" | "reveal" | "done">("idle");
  const [revealedCount, setRevealedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const allRevealed = revealedCount === PACK_SIZE;

  useEffect(() => {
    if (allRevealed && phase === "reveal") {
      setPhase("done");
      const token = useAuthStore.getState().token;
      if (token) {
        setIsSyncing(true);
        syncToServer(token).finally(() => setIsSyncing(false));
      }
    }
  }, [allRevealed, phase, syncToServer]);

  const handleOpen = useCallback(() => {
    setPhase("shake");
    setTimeout(() => {
      setPhase("flash");
      setTimeout(() => {
        const nextDraws = openBoosterPack();
        setDraws(nextDraws);
        setRevealedCount(0);
        setPhase("back");
      }, 600);
    }, 700);
  }, [openBoosterPack]);

  const handleNextCard = () => {
    if (revealedCount < PACK_SIZE) {
      setRevealedCount((prev) => prev + 1);
    }
  };

  const handleRevealAll = () => {
    setRevealedCount(PACK_SIZE);
  };

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
        <h2>Pack de {PACK_SIZE} cartes</h2>
        {phase === "idle" && (
          <motion.button
            onClick={handleOpen}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={styles.openBtn}
          >
            Ouvrir un booster
          </motion.button>
        )}
      </div>

      {isSyncing && <p className={styles.syncing}>Synchronisation...</p>}

      {/* Pack animation — idle / shake / flash */}
      {(phase === "idle" || phase === "shake" || phase === "flash") && (
        <div className={styles.packArea}>
          <motion.div
            className={styles.pack}
            animate={
              phase === "shake"
                ? {
                    x: [0, -8, 8, -6, 6, -4, 4, -2, 2, 0],
                    rotate: [0, -3, 3, -2, 2, -1, 1, 0],
                    scale: [1, 1.04, 0.96, 1.02, 0.98, 1],
                  }
                : phase === "flash"
                ? { scale: 6, opacity: 0 }
                : { scale: 1, opacity: 1 }
            }
            transition={
              phase === "shake"
                ? { duration: 0.6 }
                : phase === "flash"
                ? { duration: 0.5, ease: "easeOut" }
                : {}
            }
            onClick={phase === "idle" ? handleOpen : undefined}
          >
            <div className={styles.packInner}>
              <span className={styles.packBadge}>ECC</span>
              <span className={styles.packSub}>Panini</span>
            </div>
          </motion.div>

          {phase === "shake" && <div className={styles.packGlow} />}
          {phase === "flash" && <div className={styles.flashOverlay} />}
        </div>
      )}

      {/* Back : paquet empilé avec le logo du club */}
      {phase === "back" && draws.length > 0 && (
        <motion.div
          className={styles.deckArea}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className={styles.deck}>
            {draws.map((_, index) => (
              <div
                key={index}
                className={styles.deckCard}
                style={{
                  zIndex: draws.length - index,
                  transform: `rotate(${(index - 2) * 1.5}deg) translateY(${index * 1.5}px)`,
                }}
              >
                <div className={styles.cardBackDesign}>
                  <img src="/logo-club.png" alt="ECC" className={styles.cardBackLogo} />
                </div>
              </div>
            ))}
          </div>
          <motion.button
            onClick={() => setPhase("reveal")}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={styles.openBtn}
          >
            {"Commencer l'ouverture"}
          </motion.button>
        </motion.div>
      )}

      {/* Reveal : piocher une par une */}
      {phase === "reveal" && draws.length > 0 && (
        <div className={styles.revealArea}>
          <div className={styles.revealTop}>
            {/* Paquet restant */}
            {revealedCount < PACK_SIZE && (
              <motion.div
                className={styles.deck}
                onClick={handleNextCard}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {draws.slice(revealedCount).map((_, i) => (
                  <div
                    key={i}
                    className={styles.deckCard}
                    style={{
                      zIndex: draws.length - revealedCount - i,
                      transform: `rotate(${(i - Math.floor((draws.length - revealedCount - 1) / 2)) * 1.5}deg) translateY(${i * 1.5}px)`,
                    }}
                  >
                    <div className={styles.cardBackDesign}>
                      <img src="/logo-club.png" alt="ECC" className={styles.cardBackLogo} />
                    </div>
                  </div>
                ))}
                <span className={styles.deckHint}>
                  Cliquez pour révéler ({revealedCount + 1}/{PACK_SIZE})
                </span>
              </motion.div>
            )}

            {revealedCount < PACK_SIZE && (
              <motion.button
                onClick={handleRevealAll}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={styles.revealAllBtn}
              >
                Tout révéler
              </motion.button>
            )}
          </div>

          {/* Cartes révélées */}
          <div className={styles.revealedGrid}>
            {draws.slice(0, revealedCount).map((draw, index) => (
              <motion.div
                key={`${draw.card.id}-${index}`}
                className={styles.revealedCard}
                initial={{ scale: 0.3, opacity: 0, rotateY: 180 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <div className={styles.badges}>
                  <span className={styles.role}>{draw.card.category}</span>
                  {draw.wasDuplicate && (
                    <span className={styles.doubleBadge}>
                      DOUBLE x{draw.quantityAfter}
                    </span>
                  )}
                </div>
                <h3 className={styles.cardName}>
                  {draw.card.firstName} {draw.card.lastName}
                </h3>
                <p className={styles.meta}>
                  #{draw.card.number.toString().padStart(3, "0")}
                </p>
                <div className={styles.photoWrap}>
                  <Image
                    className={styles.photo}
                    src={draw.card.photo}
                    alt={`${draw.card.firstName} ${draw.card.lastName}`}
                    width={320}
                    height={180}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Done summary */}
      <AnimatePresence>
        {phase === "done" && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.summary}
          >
            <p>
              Booster terminé ! {draws.filter((d) => d.wasDuplicate).length} double(s) obtenu(s).
            </p>
            <button
              onClick={() => { setDraws([]); setPhase("idle"); setRevealedCount(0); }}
              className={styles.openBtn}
            >
              Ouvrir un autre booster
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
