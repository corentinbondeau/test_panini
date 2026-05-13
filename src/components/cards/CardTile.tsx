import Image from "next/image";
import { Card } from "@/data/cards";
import { QuantityBadge } from "./QuantityBadge";
import styles from "./CardTile.module.css";

type CardTileProps = {
  card: Card;
  quantity: number;
};

export function CardTile({ card, quantity }: CardTileProps) {
  const isOwned = quantity > 0;
  const isDouble = quantity > 1;

  return (
    <article className={`${styles.card} ${isOwned ? styles.owned : styles.missing} ${isDouble ? styles.double : ""}`}>
      <QuantityBadge quantity={quantity} />
      <div className={styles.sideName}>{card.firstName} {card.lastName}</div>
      <div className={styles.body}>
        <header className={styles.header}>
          <h3>{card.firstName} {card.lastName}</h3>
          <small>{card.category}</small>
        </header>
        <div className={styles.photoWrap}>
          <Image className={styles.photo} src={card.photo} alt={`${card.firstName} ${card.lastName}`} width={640} height={360} />
        </div>
      </div>
    </article>
  );
}