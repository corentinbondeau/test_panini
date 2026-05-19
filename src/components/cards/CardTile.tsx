"use client";

import { useState } from "react";
import Image from "next/image";
import { Card } from "@/data/cards";
import { QuantityBadge } from "./QuantityBadge";
import { RarityBadge } from "./RarityBadge";
import styles from "./CardTile.module.css";

const FALLBACK_IMG = "/logo-club.png";

type CardTileProps = {
  card: Card;
  quantity: number;
  onClick?: () => void;
};

export function CardTile({ card, quantity, onClick }: CardTileProps) {
  const isOwned = quantity > 0;
  const isDouble = quantity > 1;
  const [imgSrc, setImgSrc] = useState(card.imageUrl || card.photo);

  const handleError = () => {
    if (imgSrc !== FALLBACK_IMG) {
      setImgSrc(FALLBACK_IMG);
    }
  };

  const hasRealPhoto = !!card.imageUrl;

  const rarityStyles = {
    COMMUNE: "",
    RARE: "border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]",
    LEGENDAIRE: "border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)] animate-pulse",
  }[card.rarity];

  return (
    <article
      className={`${styles.card} ${isOwned ? styles.owned : styles.missing} ${isDouble ? styles.double : ""} ${hasRealPhoto ? styles.real : ""} ${onClick ? styles.clickable : ""} ${rarityStyles}`}
      onClick={onClick}
    >
      <QuantityBadge quantity={quantity} />
      <div className={styles.rarityBadgeTop}>
        <RarityBadge rarity={card.rarity} size="sm" />
      </div>
      <div className={styles.photoContainer}>
        <Image
          className={styles.photo}
          src={imgSrc}
          alt={`${card.firstName} ${card.lastName}`}
          width={480}
          height={640}
          onError={handleError}
          style={{ objectPosition: "top" }}
        />
        <div className={styles.gradient} />
        <div className={styles.nameOverlay}>
          <span className={styles.nameText}>{card.firstName} {card.lastName}</span>
          <span className={styles.categoryText}>{card.category}</span>
        </div>
      </div>
    </article>
  );
}
