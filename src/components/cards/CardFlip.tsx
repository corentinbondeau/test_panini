'use client';

import { useState } from 'react';
import { Card } from '@/data/cards';
import { CardTile } from './CardTile';
import styles from './CardFlip.module.css';

type CardFlipProps = {
  card: Card;
  quantity: number;
  isShiny?: boolean;
  dateObtained?: string | null;
};

export function CardFlip({ card, quantity, isShiny, dateObtained }: CardFlipProps) {
  const [flipped, setFlipped] = useState(false);

  const description = {
    COMMUNE: 'Carte commune — le début de ta collection.',
    RARE: 'Carte rare — un bon tirage !',
    LEGENDAIRE: 'Carte légendaire — une trouvaille exceptionnelle !',
  }[card.rarity];

  const obtainedDate = dateObtained
    ? new Date(dateObtained).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div
      className={`${styles.flipContainer} ${flipped ? styles.flipped : ''}`}
      onClick={() => setFlipped(!flipped)}
    >
      <div className={styles.flipInner}>
        <div className={styles.flipFront}>
          <CardTile card={card} quantity={quantity} isShiny={isShiny} />
        </div>
        <div className={styles.flipBack}>
          <div className={styles.backContent}>
            <h4 className={styles.backTitle}>{card.firstName} {card.lastName}</h4>
            <p className={styles.backSubtitle}>{card.category}</p>
            <p className={styles.backRarity}>{card.rarity}</p>
            <p className={styles.backDesc}>{description}</p>
            {obtainedDate && (
              <p className={styles.backDate}>Obtenue le {obtainedDate}</p>
            )}
            <p className={styles.backHint}>Cliquez pour retourner</p>
          </div>
        </div>
      </div>
    </div>
  );
}
