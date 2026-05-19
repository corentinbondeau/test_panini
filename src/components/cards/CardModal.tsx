"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Card, COLLECTIONS } from "@/data/cards";
import { RarityBadge } from "./RarityBadge";
import styles from "./CardModal.module.css";

const FALLBACK_IMG = "/logo-club.png";

type CardModalProps = {
  card: Card | null;
  quantity: number;
  onClose: () => void;
};

export function CardModal({ card, quantity, onClose }: CardModalProps) {
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
        className={`${styles.modalCard} ${!isOwned ? styles.missing : ""} ${hasRealPhoto ? styles.real : ""}`}
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
          </div>
          {seasonName && <span className={styles.season}>{seasonName}</span>}
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
