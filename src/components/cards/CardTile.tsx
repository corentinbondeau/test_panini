"use client";

import { useState } from "react";
import Image from "next/image";
import { Card } from "@/data/cards";
import { QuantityBadge } from "./QuantityBadge";
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

  return (
    <article
      className={`${styles.card} ${isOwned ? styles.owned : styles.missing} ${isDouble ? styles.double : ""} ${hasRealPhoto ? styles.real : ""} ${onClick ? styles.clickable : ""}`}
      onClick={onClick}
    >
      <QuantityBadge quantity={quantity} />
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
