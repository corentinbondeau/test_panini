'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CardFlip } from '@/components/cards/CardFlip';
import styles from './page.module.css';

type CardData = {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
  rarity: string;
  quantity: number;
  isShiny: boolean;
};

type UserInfo = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
};

export function AlbumPublicClient({ userId }: { userId: string }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/album/public?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setUser(d.user);
        setCards(d.cards || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <p className={styles.loading}>Chargement...</p>;
  if (error) {
    return (
      <div className={styles.error}>
        <h2>Album indisponible</h2>
        <p>{error}</p>
        <Link href="/" className={styles.link}>Retour à l&apos;accueil</Link>
      </div>
    );
  }

  const ownedCards = cards.filter((c) => c.quantity > 0);
  const percent = cards.length > 0 ? Math.round((ownedCards.length / cards.length) * 100) : 0;

  return (
    <section>
      <div className={styles.hero}>
        <div className={styles.heroAvatar}>
          {user?.avatar ? (
            <img src={user.avatar} alt="" className={styles.avatarImg} />
          ) : (
            <div className={styles.avatarLetter}>
              {(user?.firstName?.charAt(0) || '?').toUpperCase()}
            </div>
          )}
        </div>
        <h2>Album de {user?.firstName} {user?.lastName}</h2>
        <p className={styles.stats}>
          {ownedCards.length} / {cards.length} cartes — {percent}%
        </p>
      </div>
      <div className={styles.grid}>
        {cards.map((card) => (
          <CardFlip
            key={card.id}
            card={card}
            quantity={card.quantity}
            isShiny={card.isShiny}
          />
        ))}
      </div>
    </section>
  );
}
