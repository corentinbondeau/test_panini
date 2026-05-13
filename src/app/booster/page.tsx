"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { useCollectionStore, BoosterCardDraw } from "@/store/collectionStore";
import { useAuthStore } from "@/store/authStore";
import { COLLECTIONS } from "@/data/cards";
import { getCardsByCollection } from "@/data/clubCards";
import Link from "next/link";
import styles from "./page.module.css";

const PACK_SIZE = 5;

export default function BoosterPage() {
  const { user } = useAuthStore();
  const openBoosterPack = useCollectionStore((s) => s.openBoosterPack);
  const syncToServer = useCollectionStore((s) => s.syncToServer);
  const storeActiveCollection = useCollectionStore((s) => s.activeCollectionId);
  const setActiveCollectionId = useCollectionStore((s) => s.setActiveCollectionId);
  const [draws, setDraws] = useState<BoosterCardDraw[]>([]);
  const [phase, setPhase] = useState<"idle" | "shake" | "flash" | "reveal" | "done">("idle");
  const [revealedCount, setRevealedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState(storeActiveCollection);
  const cardRef = useRef<HTMLDivElement>(null);

  const allRevealed = revealedCount === PACK_SIZE;
  const currentDraw = draws[revealedCount];
  const remainingCount = PACK_SIZE - revealedCount;
  const activeCards = getCardsByCollection(selectedCollectionId);
  const hasCards = activeCards.length > 0;
  const packImage = selectedCollectionId === "s26-27" ? "/2627.png" : "/2526.png";

  useEffect(() => {
    if (allRevealed && phase === "reveal") {
      setPhase("done");
      const token = useAuthStore.getState().token;
      if (token) {
        setIsSyncing(true);
        syncToServer(token, selectedCollectionId).finally(() => setIsSyncing(false));
      }
    }
  }, [allRevealed, phase, syncToServer, selectedCollectionId]);

  const handleCollectionChange = (id: string) => {
    setSelectedCollectionId(id);
    setActiveCollectionId(id);
  };

  const handleOpen = useCallback(() => {
    setPhase("shake");
    setTimeout(() => {
      setPhase("flash");
      setTimeout(() => {
        const nextDraws = openBoosterPack(selectedCollectionId);
        setDraws(nextDraws);
        setRevealedCount(0);
        setPhase("reveal");
      }, 600);
    }, 700);
  }, [openBoosterPack, selectedCollectionId]);

  const handleNextCard = () => {
    if (revealedCount < PACK_SIZE) {
      setRevealedCount((prev) => prev + 1);
    }
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
      </div>

      {phase === "idle" && (
        <div className={styles.collectionTabs}>
          {COLLECTIONS.map((col) => {
            const cardCount = getCardsByCollection(col.id).length;
            const disabled = cardCount === 0;
            return (
              <button
                key={col.id}
                onClick={() => handleCollectionChange(col.id)}
                disabled={disabled}
                className={selectedCollectionId === col.id ? styles.collectionTabActive : styles.collectionTab}
              >
                {col.name}
                {disabled && " (vide)"}
              </button>
            );
          })}
        </div>
      )}

      {isSyncing && <p className={styles.syncing}>Synchronisation...</p>}

      {/* Pack animation */}
      {(phase === "idle" || phase === "shake" || phase === "flash") && (
        <div className={styles.packArea}>
          <motion.div
            className={`${styles.pack} ${!hasCards && phase === "idle" ? styles.packDisabled : ""}`}
            animate={
              phase === "shake"
                ? { x: [0, -8, 8, -6, 6, -4, 4, -2, 2, 0], rotate: [0, -3, 3, -2, 2, -1, 1, 0], scale: [1, 1.04, 0.96, 1.02, 0.98, 1] }
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
            onClick={phase === "idle" && hasCards ? handleOpen : undefined}
          >
            <div className={styles.packInner}>
              <img src={packImage} alt="" className={styles.packBackImg} />
            </div>
          </motion.div>
          {!hasCards && phase === "idle" && (
            <p className={styles.emptyWarning}>Cette collection ne contient pas encore de cartes.</p>
          )}
          {phase === "shake" && <div className={styles.packGlow} />}
          {phase === "flash" && <div className={styles.flashOverlay} />}
        </div>
      )}

      {/* Reveal phase */}
      {phase === "reveal" && currentDraw && (
        <div className={styles.revealArea}>
          {/* Current card face-up */}
          <motion.div
            key={revealedCount}
            className={`${styles.currentCard} ${currentDraw.card.imageUrl ? styles.currentCardReal : ""}`}
            initial={{ scale: 0.3, opacity: 0, rotateY: 180 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            onClick={revealedCount < PACK_SIZE ? handleNextCard : undefined}
            whileHover={revealedCount < PACK_SIZE ? { scale: 1.02 } : undefined}
            whileTap={revealedCount < PACK_SIZE ? { scale: 0.97 } : undefined}
            ref={cardRef}
          >
            <div className={styles.badges}>
              <span className={styles.role}>{currentDraw.card.category}</span>
              {currentDraw.wasDuplicate && (
                <span className={styles.doubleBadge}>
                  DOUBLE x{currentDraw.quantityAfter}
                </span>
              )}
            </div>
            <h3 className={styles.cardName}>
              {currentDraw.card.firstName} {currentDraw.card.lastName}
            </h3>
            <p className={styles.meta}>
              #{currentDraw.card.number.toString().padStart(3, "0")}
            </p>
            <div className={styles.photoWrap}>
              <Image
                className={styles.photo}
                src={currentDraw.card.imageUrl || currentDraw.card.photo}
                alt={`${currentDraw.card.firstName} ${currentDraw.card.lastName}`}
                width={320}
                height={180}
              />
            </div>
            {revealedCount < PACK_SIZE && (
              <span className={styles.cardHint}>
                Cliquez pour la carte suivante ({revealedCount + 1}/{PACK_SIZE})
              </span>
            )}
          </motion.div>

          {/* Remaining deck indicator */}
          {remainingCount > 1 && (
            <div className={styles.remainingArea}>
              <div className={styles.miniDeck}>
                {Array.from({ length: Math.min(remainingCount - 1, 3) }).map((_, i) => (
                  <div
                    key={i}
                    className={styles.miniCard}
                    style={{
                      zIndex: 3 - i,
                      transform: `rotate(${(i - 1) * 2.5}deg)`,
                    }}
                  >
                    <img src={packImage} alt="" className={styles.miniBack} />
                  </div>
                ))}
              </div>
              <span className={styles.remainingLabel}>
                {remainingCount - 1} carte{remainingCount - 1 > 1 ? "s" : ""} restante{remainingCount - 1 > 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Revealed cards */}
          {revealedCount > 0 && (
            <div className={styles.revealedSection}>
              <h4 className={styles.revealedTitle}>Déjà obtenues</h4>
              <div className={styles.revealedRow}>
                {draws.slice(0, revealedCount).map((draw, index) => (
                  <motion.div
                    key={`${draw.card.id}-${index}`}
                    className={styles.revealedCard}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Image
                      className={styles.miniPhoto}
                      src={draw.card.imageUrl || draw.card.photo}
                      alt={`${draw.card.firstName} ${draw.card.lastName}`}
                      width={80}
                      height={50}
                    />
                    <span className={styles.miniName}>
                      {draw.card.firstName} {draw.card.lastName}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
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
