'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import styles from './page.module.css';

type Quest = {
  id: string;
  title: string;
  description: string;
  type: string;
  target: number;
  rewardBoosters: number;
  progress: number;
  completed: boolean;
  rewardClaimed: boolean;
};

export default function QuestsPage() {
  const { user, checkAuth, token } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkAuth().finally(() => setIsInitialized(true));
  }, [checkAuth]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setError('');
    fetch('/api/quests', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setQuests(data.quests || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Erreur de chargement');
        setLoading(false);
      });
  }, [token]);

  const handleClaim = async (questId: string) => {
    if (!token) return;
    setClaimingId(questId);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/quests/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ questId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('Récompense récupérée !');
      setQuests((prev) =>
        prev.map((q) =>
          q.id === questId ? { ...q, rewardClaimed: true } : q,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setClaimingId(null);
    }
  };

  if (!isInitialized) {
    return <p className={styles.loading}>Chargement...</p>;
  }

  if (!user) {
    return (
      <div>
        <h2>Quêtes</h2>
        <p>Connectez-vous pour accéder aux quêtes.</p>
        <Link href="/auth">Se connecter</Link>
      </div>
    );
  }

  const icon = (q: Quest) => {
    if (q.rewardClaimed) return '✅';
    if (q.completed) return '⭐';
    return '📦';
  };

  const iconClass = (q: Quest) => {
    if (q.rewardClaimed) return styles.iconDone;
    if (q.completed) return styles.iconAvailable;
    return styles.iconLocked;
  };

  const pct = (q: Quest) => Math.min(100, Math.round((q.progress / q.target) * 100));

  return (
    <section>
      <h2>Quêtes</h2>
      <p className={styles.note}>
        Accomplis des quêtes pour gagner des boosters gratuits.
      </p>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      {loading ? (
        <p className={styles.loading}>Chargement des quêtes...</p>
      ) : quests.length === 0 ? (
        <p className={styles.loading}>Aucune quête disponible.</p>
      ) : (
        <div className={styles.list}>
          {quests.map((q) => (
            <div key={q.id} className={styles.card}>
              <div className={`${styles.icon} ${iconClass(q)}`}>
                {icon(q)}
              </div>
              <div className={styles.body}>
                <p className={styles.title}>{q.title}</p>
                <p className={styles.description}>
                  {q.description} — {q.progress}/{q.target}
                </p>
                <div className={styles.progressBar}>
                  <div
                    className={`${styles.progressFill} ${q.rewardClaimed ? styles.progressFillDone : styles.progressFillAvailable}`}
                    style={{ width: `${pct(q)}%` }}
                  />
                </div>
              </div>
              {q.rewardClaimed ? (
                <span className={styles.doneBadge}>
                  +{q.rewardBoosters} booster{q.rewardBoosters > 1 ? 's' : ''}
                </span>
              ) : q.completed ? (
                <button
                  onClick={() => handleClaim(q.id)}
                  disabled={claimingId === q.id}
                  className={styles.claimBtn}
                >
                  {claimingId === q.id ? '...' : `Réclamer (+${q.rewardBoosters})`}
                </button>
              ) : (
                <span className={styles.doneBadge}>
                  {pct(q)}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
