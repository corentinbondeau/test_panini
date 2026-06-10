'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Coins, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import styles from './page.module.css';

type Quest = {
  id: string;
  title: string;
  description: string;
  type: string;
  target: number;
  rewardTokens: number;
  progress: number;
  completed: boolean;
  rewardClaimed: boolean;
  isDaily: boolean;
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

  const fetchQuests = useCallback(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setError('');
    setLoading(true);
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

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

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
      setSuccess('+5 pièces récupérées !');
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
      <div className={styles.page}>
        <h2>Quêtes</h2>
        <p>Connectez-vous pour accéder aux quêtes.</p>
        <Link href="/auth">Se connecter</Link>
      </div>
    );
  }

  const pct = (q: Quest) => Math.min(100, Math.round((q.progress / q.target) * 100));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2>Défis Journaliers</h2>
        <p className={styles.note}>
          Chaque défi complété rapporte 5 pièces. Nouveaux défis chaque jour à minuit.
        </p>
        <button onClick={fetchQuests} className={styles.refreshBtn} disabled={loading}>
          <RotateCcw size={14} />
          Actualiser
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      {loading ? (
        <p className={styles.loading}>Chargement des quêtes...</p>
      ) : quests.length === 0 ? (
        <div className={styles.empty}>
          <p>Aucun défi disponible aujourd&apos;hui.</p>
          <p className={styles.emptyHint}>Reviens demain pour de nouveaux défis !</p>
        </div>
      ) : (
        <div className={styles.list}>
          {quests.map((q) => (
            <div key={q.id} className={`${styles.card} ${q.completed ? styles.cardComplete : ''} ${q.rewardClaimed ? styles.cardClaimed : ''}`}>
              <div className={styles.cardLeft}>
                <div className={`${styles.icon} ${q.rewardClaimed ? styles.iconDone : q.completed ? styles.iconAvailable : styles.iconLocked}`}>
                  {q.rewardClaimed ? '✅' : q.completed ? '⭐' : '📦'}
                </div>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.cardTitle}>{q.title}</p>
                <p className={styles.cardDesc}>
                  {q.description} — {q.progress}/{q.target}
                </p>
                <div className={styles.progressBar}>
                  <div
                    className={`${styles.progressFill} ${q.rewardClaimed ? styles.progressDone : styles.progressActive}`}
                    style={{ width: `${pct(q)}%` }}
                  />
                </div>
              </div>
              <div className={styles.cardRight}>
                <div className={styles.rewardBadge}>
                  <Coins size={14} />
                  <span>5</span>
                </div>
                {q.rewardClaimed ? (
                  <span className={styles.claimedBadge}>Réclamée</span>
                ) : q.completed ? (
                  <button
                    onClick={() => handleClaim(q.id)}
                    disabled={claimingId === q.id}
                    className={styles.claimBtn}
                  >
                    {claimingId === q.id ? '...' : 'Réclamer'}
                  </button>
                ) : (
                  <span className={styles.progressPct}>{pct(q)}%</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
