"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);

  const allRevealed = revealed.size === PACK_SIZE && phase === "reveal";

  useEffect(() => {
    if (allRevealed) {
      setPhase("done");
      const token = useAuthStore.getState().token;
      if (token) {
        setIsSyncing(true);
        syncToServer(token).finally(() => setIsSyncing(false));
      }
    }
  }, [allRevealed, syncToServer]);

  const handleOpen = useCallback(() => {
    setPhase("shake");
    setTimeout(() => {
      setPhase("flash");
      setTimeout(() => {
        const nextDraws = openBoosterPack();
        setDraws(nextDraws);
        setRevealed(new Set());
        setPhase("back");
      }, 600);
    }, 700);
  }, [openBoosterPack]);

  const handleFlip = (index: number) => {
    if (phase === "reveal" || phase === "done") {
      setRevealed((prev) => {
        if (prev.has(index)) return prev;
        const next = new Set(prev);
        next.add(index);
        return next;
      });
    }
  };

  const handleRevealAll = () => {
    setRevealed(new Set([0, 1, 2, 3, 4]));
  };

  const handleStartReveal = () => {
    setPhase("reveal");
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
        {phase === "back" && (
          <motion.button
            onClick={handleStartReveal}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.openBtn}
          >
            Retourner les cartes
          </motion.button>
        )}
        {phase === "reveal" && !allRevealed && (
          <motion.button
            onClick={handleRevealAll}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={styles.revealBtn}
          >
            Tout révéler
          </motion.button>
        )}
      </div>

      {isSyncing && <p className={styles.syncing}>Synchronisation...</p>}

      {/* Pack display — idle / shake / flash */}
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

      {/* Card backs */}
      {phase === "back" && draws.length > 0 && (
        <motion.div
          className={styles.cardsFan}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <p className={styles.hint}>Clique sur chaque carte pour la retourner</p>
          <div className={styles.fanRow}>
            {draws.map((_, index) => (
              <motion.div
                key={index}
                className={styles.cardBack}
                initial={{ opacity: 0, y: 60, rotateY: 180 }}
                animate={{ opacity: 1, y: 0, rotateY: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4, ease: "easeOut" }}
                onClick={() => handleFlip(index)}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className={styles.cardBackInner}>
                  <span>?</span>
                  <small>ECC</small>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.button
            onClick={handleStartReveal}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className={styles.startRevealBtn}
          >
            Retourner toutes les cartes →
          </motion.button>
        </motion.div>
      )}

      {/* Reveal phase — cards flip one by one */}
      {phase === "reveal" && draws.length > 0 && (
        <div className={styles.cardsFan}>
          <div className={styles.fanRow}>
            {draws.map((draw, index) => {
              const isRevealed = revealed.has(index);
              return (
                <motion.div
                  key={`${draw.card.id}-${index}`}
                  className={`${styles.flipCard} ${isRevealed ? styles.flipped : ""}`}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.08 }}
                  onClick={() => handleFlip(index)}
                >
                  <motion.div
                    className={styles.flipInner}
                    animate={{ rotateY: isRevealed ? 0 : 180 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    {/* Card back face */}
                    <div className={styles.flipBack}>
                      <div className={styles.cardBackInner}>
                        <span>?</span>
                        <small>ECC</small>
                      </div>
                    </div>

                    {/* Card front face */}
                    <div className={styles.flipFront}>
                      <div className={styles.flipFrontInner}>
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
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
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
            <button onClick={() => { setDraws([]); setPhase("idle"); setRevealed(new Set()); }} className={styles.openBtn}>
              Ouvrir un autre booster
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}