"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { CardTile } from "@/components/cards/CardTile";
import { RarityBadge } from "@/components/cards/RarityBadge";
import { useCollectionSelectors, useCollectionStore } from "@/store/collectionStore";
import { useAuthStore } from "@/store/authStore";
import { CardRarity } from "@/data/cards";
import styles from "./page.module.css";

const RECYCLE_RATIOS: Record<string, { required: number; label: string }> = {
  COMMUNE: { required: 5, label: "5 Communes" },
  RARE: { required: 3, label: "3 Rares" },
  LEGENDAIRE: { required: 1, label: "1 Légendaire" },
};

export default function DoublesPage() {
  const { quantities, doublesCards, cards } = useCollectionSelectors();
  const loadCollection = useCollectionStore((state) => state.loadFromServer);
  const setQuantities = useCollectionStore((state) => state.setQuantities);
  const token = useAuthStore((state) => state.token);

  const [recycling, setRecycling] = useState<string | null>(null);
  const [result, setResult] = useState<{
    card: { id: string; firstName: string; lastName: string; imageUrl: string | null; photo: string; rarity: string };
    wasDuplicate: boolean;
    quantityAfter: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadCollection(token);
    }
  }, [token, loadCollection]);

  const sorted = useMemo(
    () => [...doublesCards].sort(
      (a, b) => (quantities[b.id] ?? 0) - (quantities[a.id] ?? 0)
    ),
    [doublesCards, quantities]
  );

  // Count duplicates per rarity (cards with quantity > 1, count = sum of qty-1)
  const duplicatesByRarity = useMemo(() => {
    const counts: Record<string, number> = { COMMUNE: 0, RARE: 0, LEGENDAIRE: 0 };
    for (const [cardId, qty] of Object.entries(quantities)) {
      if (qty > 1) {
        const card = cards.find((c) => c.id === cardId);
        if (card) {
          counts[card.rarity] += qty - 1;
        }
      }
    }
    return counts;
  }, [quantities, cards]);

  const handleRecycle = async (rarity: string) => {
    if (!token) return;
    setRecycling(rarity);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/cards/recycle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rarity }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors du recyclage');
      }

      setResult(data);
      setQuantities(data.quantities);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setRecycling(null);
    }
  };

  return (
    <section>
      <h2>Mes doubles</h2>
      <p className={styles.note}>Cartes possédées au moins en 2 exemplaires.</p>

      {/* Recycling Section */}
      <div className={styles.recycleSection}>
        <h3 className={styles.recycleTitle}>♻️ Recycler vos doublons</h3>
        <p className={styles.recycleDesc}>
          Échangez vos cartes en double contre une carte aléatoire de même rareté.
        </p>
        <div className={styles.recycleGrid}>
          {(Object.entries(RECYCLE_RATIOS) as [string, { required: number; label: string }][]).map(([rarity, config]) => {
            const available = duplicatesByRarity[rarity] ?? 0;
            const canRecycle = available >= config.required;
            const isProcessing = recycling === rarity;

            return (
              <div key={rarity} className={`${styles.recycleCard} ${canRecycle ? styles.recycleCardReady : ''}`}>
                <div className={styles.recycleHeader}>
                  <RarityBadge rarity={rarity as CardRarity} size="md" />
                  <span className={styles.recycleRatio}>{config.label}</span>
                </div>
                <div className={styles.recycleCount}>
                  <span className={styles.recycleAvailable}>{available}</span>
                  <span className={styles.recycleNeeded}> / {config.required} doublons</span>
                </div>
                <div className={styles.recycleBar}>
                  <div
                    className={styles.recycleBarFill}
                    style={{ width: `${Math.min(100, (available / config.required) * 100)}%` }}
                  />
                </div>
                <button
                  onClick={() => handleRecycle(rarity)}
                  disabled={!canRecycle || isProcessing}
                  className={styles.recycleBtn}
                >
                  {isProcessing ? 'Recyclage...' : `Échanger`}
                </button>
              </div>
            );
          })}
        </div>

        {error && (
          <div className={styles.recycleError}>{error}</div>
        )}

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={styles.recycleResult}
            >
              <h4 className={styles.recycleResultTitle}>Carte obtenue !</h4>
              <div className={styles.recycleResultCard}>
                <Image
                  src={result.card.imageUrl || result.card.photo}
                  alt={`${result.card.firstName} ${result.card.lastName}`}
                  width={120}
                  height={80}
                  className={styles.recycleResultImg}
                />
                <div className={styles.recycleResultInfo}>
                  <p className={styles.recycleResultName}>
                    {result.card.firstName} {result.card.lastName}
                  </p>
                  <RarityBadge rarity={result.card.rarity as CardRarity} size="sm" />
                  {result.wasDuplicate && (
                    <span className={styles.recycleDoubleBadge}>
                      DOUBLE x{result.quantityAfter}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setResult(null)} className={styles.recycleCloseBtn}>
                OK
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Exchange banner */}
      <div className={styles.exchangeBanner}>
        <p>Échange tes doubles avec d&apos;autres joueurs !</p>
        <Link href="/echange" className={styles.exchangeLink}>
          Aller aux échanges →
        </Link>
      </div>

      {sorted.length === 0 ? (
        <p className={styles.empty}>{"Aucun double pour l'instant. Ouvre quelques boosters !"}</p>
      ) : (
        <div className={styles.grid}>
          {sorted.map((card) => (
            <CardTile key={card.id} card={card} quantity={quantities[card.id] ?? 0} />
          ))}
        </div>
      )}
    </section>
  );
}
