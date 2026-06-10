'use client';

import { Card } from '@/data/cards';
import { CardTile } from './CardTile';
import styles from './CardFlip.module.css';

type CardFlipProps = {
  card: Card;
  quantity: number;
  isShiny?: boolean;
  dateObtained?: string | null;
  onCardClick?: () => void;
};

export function CardFlip({ card, quantity, isShiny, onCardClick }: CardFlipProps) {
  return (
    <div className={styles.flipContainer} onClick={onCardClick}>
      <CardTile card={card} quantity={quantity} isShiny={isShiny} onClick={onCardClick} />
    </div>
  );
}
