'use client';

import { useEffect, useState } from 'react';
import AvatarBorder from '@/components/AvatarBorder';
import styles from './page.module.css';

type ShowcaseCard = {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
  rarity: string;
};

type LeaderboardEntry = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatar: string | null;
  tokens: number;
  totalCardsObtained: number;
  unique: number;
  total: number;
  percent: number;
  showcase: ShowcaseCard[];
};

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((r) => r.json())
      .then((d) => {
        setData(d.leaderboard || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <section className={styles.page}>
      <h2>Classement des collectionneurs</h2>
      <p className={styles.note}>Basé sur le pourcentage de complétion de l&apos;album Saison 25-26.</p>

      {loading ? (
        <p className={styles.loading}>Chargement...</p>
      ) : data.length === 0 ? (
        <p className={styles.empty}>Aucun collectionneur pour le moment.</p>
      ) : (
        <div className={styles.list}>
          {data.map((entry, i) => (
            <div key={entry.userId} className={styles.row}>
              <span className={styles.rank}>#{i + 1}</span>
              <AvatarBorder level={entry.totalCardsObtained} size={48}>
                <div className={styles.avatar}>
                  {entry.avatar ? (
                    <img src={entry.avatar} alt="" className={styles.avatarImg} />
                  ) : (
                    <div className={styles.avatarLetter}>
                      {(entry.firstName?.charAt(0) || entry.email.charAt(0)).toUpperCase()}
                    </div>
                  )}
                </div>
              </AvatarBorder>
              <div className={styles.info}>
                <p className={styles.name}>
                  {entry.firstName || 'Anonyme'} {entry.lastName || ''}
                </p>
                <p className={styles.detail}>
                  {entry.unique} / {entry.total} cartes
                </p>
              </div>
              <div className={styles.stats}>
                <span className={styles.percent}>{entry.percent}%</span>
                <span className={styles.tokens}>{entry.tokens} 🪙</span>
              </div>
              {/* Showcase */}
              {entry.showcase && entry.showcase.length > 0 && (
                <div className={styles.showcase}>
                  {entry.showcase.map((card) => (
                    <div key={card.id} className={styles.showcaseCard}>
                      <img src={card.photo} alt={card.firstName} className={styles.showcaseImg} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
