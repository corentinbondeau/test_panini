import Image from "next/image";
import { Card } from "@/data/cards";
import { QuantityBadge } from "./QuantityBadge";
import styles from "./CardTile.module.css";

type CardTileProps = {
  card: Card;
  quantity: number;
  showTradeButton?: boolean;
};

export function CardTile({ card, quantity, showTradeButton = true }: CardTileProps) {
  const isOwned = quantity > 0;
  const isDouble = quantity > 1;

  return (
    <article className={`${styles.card} ${isOwned ? styles.owned : styles.missing} ${isDouble ? styles.double : ""}`}>
      <QuantityBadge quantity={quantity} />
      <div className={styles.sideName}>{card.name}</div>
      <div className={styles.body}>
        <header className={styles.header}>
          <h3>{card.name}</h3>
          <small>#{card.number.toString().padStart(3, "0")} - Catégorie: {card.category}</small>
        </header>
        <div className={styles.photoWrap}>
          <Image className={styles.photo} src={card.photo} alt={`Photo ${card.name}`} width={640} height={360} />
        </div>
        {showTradeButton ? (
          <button className={styles.tradeBtn} disabled>
            Échanger
          </button>
        ) : null}
      </div>
    </article>
  );
}
