"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Card, COLLECTIONS } from "@/data/cards";
import { RarityBadge } from "./RarityBadge";
import styles from "./CardModal.module.css";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const FALLBACK_IMG = "/logo-club.png";

type CardModalProps = {
  card: Card | null;
  quantity: number;
  isShiny?: boolean;
  dateObtained?: string | null;
  onClose: () => void;
};

export function CardModal({ card, quantity, isShiny, dateObtained, onClose }: CardModalProps) {
  const isOwned = quantity > 0;
  const [imgSrc, setImgSrc] = useState(card?.imageUrl || card?.photo || FALLBACK_IMG);

  useEffect(() => {
    setImgSrc(card?.imageUrl || card?.photo || FALLBACK_IMG);
  }, [card]);

  useEffect(() => {
    if (!card) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [card, onClose]);

  const seasonName = COLLECTIONS.find((c) => c.id === card?.collectionId)?.name || card?.collectionId || "";
  const hasRealPhoto = !!card?.imageUrl;
  const [history, setHistory] = useState<Array<{ date: string; avgPrice: number }>>([]);

  useEffect(() => {
    if (!card) return;
    fetch(`/api/cards/value/${card.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.data)) {
          setHistory(data.data.map((d: { date: string; avgPrice: number }) => ({ date: new Date(d.date).toLocaleDateString(), avgPrice: d.avgPrice })));
        }
      })
      .catch(() => {});
  }, [card]);

  const obtainedDateFormatted = dateObtained
    ? new Date(dateObtained).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        className={`${styles.modalCard} ${!isOwned ? styles.missing : ""} ${hasRealPhoto ? styles.real : ""} ${isShiny ? styles.shiny : ""}`}
        layoutId={card ? `card-${card.id}` : undefined}
        onClick={(e) => e.stopPropagation()}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        <div className={styles.imageWrapper}>
          <Image
            className={styles.image}
            src={imgSrc}
            alt={card ? `${card.firstName} ${card.lastName}` : ""}
            fill
            sizes="(max-width: 640px) 340px, 380px"
            onError={() => setImgSrc(FALLBACK_IMG)}
            style={{ objectFit: "cover", objectPosition: "top" }}
          />
          <div className={styles.gradient} />
          {!isOwned && <div className={styles.lockOverlay} />}
          {isShiny && <div className={styles.shinyOverlay} />}
          <div className={styles.nameOverlay}>
            <span className={styles.nameText}>{card?.firstName} {card?.lastName}</span>
            <span className={styles.categoryText}>{card?.category}</span>
          </div>
        </div>

        <div className={styles.info}>
          <h3 className={styles.name}>
            {card?.firstName} {card?.lastName}
          </h3>
          <div className={styles.rarityRow}>
            <span className={styles.category}>{card?.category}</span>
            {card && <RarityBadge rarity={card.rarity} size="lg" />}
            {isShiny && <span className={styles.shinyBadge}>✨ Shiny</span>}
          </div>
          {seasonName && <span className={styles.season}>{seasonName}</span>}

          {/* Stats panel */}
          <div className={styles.statsPanel}>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Numéro</span>
              <span className={styles.statValue}>#{card?.number.toString().padStart(3, '0')}</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Rôle</span>
              <span className={styles.statValue}>{card?.role}</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Équipe</span>
              <span className={styles.statValue}>{card?.team}</span>
            </div>
            {isOwned && (
              <>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Exemplaires</span>
                  <span className={styles.statValue}>x{quantity}</span>
                </div>
                {obtainedDateFormatted && (
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>Obtenue le</span>
                    <span className={styles.statValue}>{obtainedDateFormatted}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Price history chart */}
          {history.length > 0 && (
            <div style={{ width: '100%', height: 120, marginTop: 8 }}>
              <p className={styles.chartTitle}>Évolution du prix moyen</p>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="avgPrice" stroke="#f3c623" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <span className={`${styles.status} ${isOwned ? styles.ownedText : styles.missingText}`}>
            {isOwned
              ? `Possédée${quantity > 1 ? ` x${quantity}` : ""}`
              : "Carte non possédée. Ouvre des boosters pour la trouver !"}
          </span>
        </div>

        <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
          ×
        </button>
      </motion.div>
    </motion.div>
  );
}
