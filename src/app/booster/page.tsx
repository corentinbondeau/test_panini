"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { useCollectionStore, BoosterCardDraw } from "@/store/collectionStore";
import { useAuthStore } from "@/store/authStore";
import { useQuestStore } from "@/store/questStore";
import { useBadgeStore } from "@/store/badgeStore";
import { COLLECTIONS, CardRarity } from "@/data/cards";
import { getCardsByCollection } from "@/data/clubCards";
import { RarityBadge } from "@/components/cards/RarityBadge";
import { playRipSound, playLegendaryJingle, playRareChime, vibrate } from '@/lib/audio';
import { fireConfetti } from '@/lib/confetti';
import Link from "next/link";
import styles from "./page.module.css";

const PACK_SIZE = 5;
const MASS_PACK_COUNT = 10;
const MASS_TOTAL_CARDS = MASS_PACK_COUNT * PACK_SIZE;
const MAX_BOOSTERS = 25;

export default function BoosterPage() {
  const { user, token } = useAuthStore();
  const openBoosterPackAsync = useCollectionStore((s) => s.openBoosterPackAsync);
  const loadFromServer = useCollectionStore((s) => s.loadFromServer);
  const setQuantities = useCollectionStore((s) => s.setQuantities);
  const storeActiveCollection = useCollectionStore((s) => s.activeCollectionId);
  const setActiveCollectionId = useCollectionStore((s) => s.setActiveCollectionId);
  const triggerQuestRefresh = useQuestStore((s) => s.triggerRefresh);
  const triggerBadgeRefresh = useBadgeStore((s) => s.triggerRefresh);
  const [draws, setDraws] = useState<BoosterCardDraw[]>([]);
  const [phase, setPhase] = useState<"idle" | "loading" | "shake" | "flash" | "reveal" | "done" | "mass-done">("idle");
  const [revealedCount, setRevealedCount] = useState(0);
  const [selectedCollectionId, setSelectedCollectionId] = useState(storeActiveCollection);
  const [boostersRemaining, setBoostersRemaining] = useState(MAX_BOOSTERS);
  const [error, setError] = useState<string | null>(null);
  const [isMassOpen, setIsMassOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const allRevealed = revealedCount === PACK_SIZE;
  const currentDraw = draws[revealedCount];
  const remainingCount = PACK_SIZE - revealedCount;
  const activeCards = getCardsByCollection(selectedCollectionId);
  const hasCards = activeCards.length > 0;
  const packImage = selectedCollectionId === "s26-27" ? "/2627.png" : "/2526.png";
  const limitReached = boostersRemaining <= 0;
  const canOpenTen = boostersRemaining >= 10 && !isMassOpen;

  useEffect(() => {
    if (!user || !token) return;
    loadFromServer(token, selectedCollectionId);
    fetch('/api/user/quotas', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) setBoostersRemaining(data.boostersRemainingToday);
      })
      .catch(() => {});
  }, [user, token, selectedCollectionId, loadFromServer]);

  useEffect(() => {
    if (!allRevealed || phase !== "reveal") return;
    setPhase("done");
    if (token) {
      fetch('/api/user/quotas', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data) setBoostersRemaining(data.boostersRemainingToday);
        })
        .catch(() => {});
    }
  }, [allRevealed, phase, token]);

  const handleCollectionChange = (id: string) => {
    setSelectedCollectionId(id);
    setActiveCollectionId(id);
  };

  const handleOpen = useCallback(async () => {
    if (!token) return;
    setError(null);
    setIsMassOpen(false);
    setPhase("loading");

    try {
      const { cards: nextDraws, newBadges } = await openBoosterPackAsync(selectedCollectionId, token);
      triggerQuestRefresh();
      triggerBadgeRefresh(newBadges);
      const rarityOrder: Record<string, number> = { 'COMMUNE': 0, 'RARE': 1, 'LEGENDAIRE': 2 };
      nextDraws.sort((a, b) => (rarityOrder[a.card.rarity] ?? 0) - (rarityOrder[b.card.rarity] ?? 0));
      setDraws(nextDraws);
      setRevealedCount(0);
      setTimeout(() => {
        setPhase("shake");
        setTimeout(() => {
          setPhase("flash");
          setTimeout(() => {
            setPhase("reveal");
          }, 600);
        }, 700);
      }, 300);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      if (message.includes("Limite")) {
        setError("Limite quotidienne atteinte (25/25)");
      } else {
        setError(message);
      }
      setPhase("idle");
    }
  }, [openBoosterPackAsync, selectedCollectionId, token]);

  const handleOpenTen = useCallback(async () => {
    if (!token) return;
    setError(null);
    setIsMassOpen(true);
    setPhase("loading");

    try {
      const res = await fetch('/api/booster/open-ten', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ collectionId: selectedCollectionId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'ouverture");
      }

      const data = await res.json();
      const nextDraws: BoosterCardDraw[] = data.cards;

      triggerQuestRefresh();
      triggerBadgeRefresh(data.newBadges ?? []);
      setDraws(nextDraws);
      setQuantities(data.quantities || {});

      const rarityOrder: Record<string, number> = { 'COMMUNE': 0, 'RARE': 1, 'LEGENDAIRE': 2 };
      const sorted = [...nextDraws].sort((a, b) => (rarityOrder[a.card.rarity] ?? 0) - (rarityOrder[b.card.rarity] ?? 0));
      setDraws(sorted);
      setBoostersRemaining(data.boostersRemainingToday ?? 0);

      setTimeout(() => {
        setPhase("shake");
        setTimeout(() => {
          setPhase("flash");
          setTimeout(() => {
            setPhase("mass-done");
          }, 600);
        }, 700);
      }, 300);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      if (message.includes("Limite") || message.includes("limite")) {
        setError("Limite quotidienne atteinte ou insuffisante");
      } else {
        setError(message);
      }
      setPhase("idle");
      setIsMassOpen(false);
    }
  }, [openBoosterPackAsync, selectedCollectionId, token, setQuantities]);

  const handleNextCard = () => {
    if (revealedCount < PACK_SIZE) {
      const next = draws[revealedCount];
      if (next) {
        // Play sound + effects based on rarity
        if (next.card.rarity === 'LEGENDAIRE') {
          playLegendaryJingle();
          vibrate([100, 50, 100, 50, 200]);
          fireConfetti('LEGENDAIRE');
        } else if (next.card.rarity === 'RARE') {
          playRareChime();
          vibrate(50);
          fireConfetti('RARE');
        } else {
          vibrate(20);
        }
      }
      setRevealedCount((prev) => prev + 1);
    }
  };

  // Play rip sound at start of reveal phase
  useEffect(() => {
    if (phase === 'shake') {
      playRipSound();
    }
  }, [phase]);

  const handleReset = () => {
    setDraws([]);
    setPhase("idle");
    setRevealedCount(0);
    setError(null);
    setIsMassOpen(false);
    if (token) {
      fetch('/api/user/quotas', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data) setBoostersRemaining(data.boostersRemainingToday);
        })
        .catch(() => {});
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
        <div className={styles.quotaIndicator}>
          Boosters aujourd&apos;hui : {MAX_BOOSTERS - boostersRemaining} / {MAX_BOOSTERS}
        </div>
      </div>

      {phase === "idle" && (
        <>
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

          {canOpenTen && (
            <div className={styles.massOpenRow}>
              <button
                onClick={handleOpenTen}
                className={styles.massOpenBtn}
              >
                Ouvrir 10 Boosters ({MASS_TOTAL_CARDS} cartes)
              </button>
            </div>
          )}
        </>
      )}

      {/* Error message */}
      {error && (
        <div className={styles.errorMsg}>{error}</div>
      )}

      {/* 3D Pack with drag-to-tear */}
      {(phase === "idle" || phase === "loading" || phase === "shake" || phase === "flash") && (
        <div className={styles.packArea}>
          <motion.div
            className={`${styles.pack3d} ${(!hasCards || limitReached) && phase === "idle" ? styles.packDisabled : ""}`}
            style={{ perspective: 1000 }}
            animate={
              phase === "loading"
                ? { scale: [1, 1.05, 1], opacity: [1, 0.7, 1] }
                : phase === "shake"
                ? { x: [0, -8, 8, -6, 6, -4, 4, -2, 2, 0], rotate: [0, -3, 3, -2, 2, -1, 1, 0], scale: [1, 1.04, 0.96, 1.02, 0.98, 1] }
                : phase === "flash"
                ? { scale: 6, opacity: 0 }
                : { scale: 1, opacity: 1 }
            }
            transition={
              phase === "loading"
                ? { duration: 0.8, repeat: Infinity }
                : phase === "shake"
                ? { duration: 0.6 }
                : phase === "flash"
                ? { duration: 0.5, ease: "easeOut" }
                : {}
            }
            onClick={phase === "idle" && hasCards && !limitReached ? handleOpen : undefined}
            // 3D tilt on hover (idle only)
            whileHover={phase === "idle" ? { rotateX: 5, rotateY: 10, scale: 1.03 } : undefined}

          >
            <div className={styles.pack3dInner}>
              <motion.img
                src={packImage}
                alt=""
                className={styles.packBackImg}
                style={{ backfaceVisibility: 'hidden' }}
              />

            </div>
          </motion.div>
          {isMassOpen && phase === "loading" && (
            <p className={styles.massLoadingText}>Ouverture de 10 boosters...</p>
          )}
          {limitReached && phase === "idle" && (
            <p className={styles.emptyWarning}>Limite quotidienne atteinte (25/25)</p>
          )}
          {!hasCards && phase === "idle" && (
            <p className={styles.emptyWarning}>Cette collection ne contient pas encore de cartes.</p>
          )}
          {!isMassOpen && phase === "loading" && <div className={styles.packGlow3d} />}
          {!isMassOpen && phase === "shake" && <div className={styles.packGlow3d} />}
          {!isMassOpen && phase === "flash" && <div className={styles.flashOverlay} />}
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
              <RarityBadge rarity={currentDraw.card.rarity as CardRarity} size="md" />
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
                width={640}
                height={360}
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

      {/* Done summary (single booster) */}
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
            <p className={styles.quotaSummary}>
              Boosters restants aujourd&apos;hui : {boostersRemaining}
            </p>
            <button
              onClick={handleReset}
              disabled={limitReached}
              className={styles.openBtn}
            >
              {limitReached ? "Limite quotidienne atteinte" : "Ouvrir un autre booster"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mass opening result grid */}
      <AnimatePresence>
        {phase === "mass-done" && draws.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.massSummary}
          >
            <h3 className={styles.massTitle}>
              {MASS_PACK_COUNT} boosters ouverts — {draws.length} cartes obtenues
            </h3>
            <p className={styles.massSubtitle}>
              {draws.filter((d) => d.wasDuplicate).length} double(s) · 
              {draws.filter((d) => d.card.rarity === 'LEGENDAIRE').length} légendaire(s) · 
              {draws.filter((d) => d.card.rarity === 'RARE').length} rare(s) · 
              {draws.filter((d) => d.card.rarity === 'COMMUNE').length} commune(s)
            </p>

            <div className={styles.massGrid}>
              {draws.map((draw, index) => (
                <motion.div
                  key={`${draw.card.id}-${index}`}
                  className={styles.massGridCard}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.01, duration: 0.15 }}
                >
                  <div className={styles.massGridPhotoWrap}>
                    <Image
                      className={styles.massGridPhoto}
                      src={draw.card.imageUrl || draw.card.photo}
                      alt={`${draw.card.firstName} ${draw.card.lastName}`}
                      width={120}
                      height={80}
                    />
                  </div>
                  <span className={styles.massGridRarity}
                    style={{
                      color: draw.card.rarity === 'LEGENDAIRE' ? '#a855f7' : draw.card.rarity === 'RARE' ? '#f59e0b' : '#9ca3af'
                    }}
                  >
                    {draw.card.rarity === 'LEGENDAIRE' ? 'L' : draw.card.rarity === 'RARE' ? 'R' : 'C'}
                  </span>
                  <span className={styles.massGridName}>
                    {draw.card.firstName?.slice(0, 1)}. {draw.card.lastName}
                  </span>
                  {draw.wasDuplicate && (
                    <span className={styles.massGridDouble}>x{draw.quantityAfter}</span>
                  )}
                </motion.div>
              ))}
            </div>

            <p className={styles.quotaSummary}>
              Boosters restants aujourd&apos;hui : {boostersRemaining}
            </p>
            <button
              onClick={handleReset}
              disabled={limitReached}
              className={styles.openBtn}
            >
              {limitReached ? "Limite quotidienne atteinte" : "Ouvrir des boosters"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
