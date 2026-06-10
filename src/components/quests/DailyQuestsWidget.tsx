'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

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

export function DailyQuestsWidget() {
  const { token } = useAuthStore();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchQuests = useCallback(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch('/api/quests', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setQuests(data.quests?.slice(0, 5) || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  const handleClaim = async (questId: string) => {
    if (!token) return;
    setClaimingId(questId);
    try {
      const res = await fetch('/api/quests/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ questId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuests((prev) =>
        prev.map((q) =>
          q.id === questId ? { ...q, rewardClaimed: true } : q,
        ),
      );
    } catch {
      // silent
    } finally {
      setClaimingId(null);
    }
  };

  const pct = (q: Quest) => Math.min(100, Math.round((q.progress / q.target) * 100));

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--club-blue-700)] bg-gradient-to-b from-[var(--club-blue-800)] to-[var(--club-blue-900)] p-4">
        <div className="text-center text-sm text-[var(--text-soft)]">Chargement des defis...</div>
      </div>
    );
  }

  if (quests.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--club-blue-700)] bg-gradient-to-b from-[var(--club-blue-800)] to-[var(--club-blue-900)] p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={18} className="text-[var(--club-yellow-500)]" />
          <h3 className="text-sm font-bold text-[var(--club-yellow-500)] m-0">Defis du Jour</h3>
        </div>
        <p className="text-xs text-[var(--text-soft)] m-0">Aucun defi disponible aujourd&apos;hui. Reviens demain !</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--club-blue-700)] bg-gradient-to-b from-[var(--club-blue-800)] to-[var(--club-blue-900)] p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={18} className="text-[var(--club-yellow-500)]" />
        <h3 className="text-sm font-bold text-[var(--club-yellow-500)] m-0">Defis du Jour</h3>
      </div>

      <div className="flex flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {quests.map((q) => (
            <motion.div
              key={q.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                q.rewardClaimed
                  ? 'border-green-500/30 bg-green-500/5'
                  : q.completed
                    ? 'border-[var(--club-yellow-500)] bg-[var(--club-yellow-500)]/5'
                    : 'border-[var(--club-blue-700)] bg-[var(--club-blue-950)]/50'
              }`}
            >
              <div className="flex-shrink-0">
                {q.rewardClaimed ? (
                  <CheckCircle2 size={20} className="text-green-400" />
                ) : q.completed ? (
                  <Circle size={20} className="text-[var(--club-yellow-500)] fill-[var(--club-yellow-500)]/20" />
                ) : (
                  <Circle size={20} className="text-[var(--club-blue-600)]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-main)] m-0">{q.description}</p>
                <p className="text-[10px] text-[var(--text-soft)] m-0">{q.progress}/{q.target}</p>
                <div className="h-1.5 bg-[var(--club-blue-700)] rounded-full mt-1 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      q.rewardClaimed ? 'bg-green-400' : 'bg-[var(--club-yellow-500)]'
                    }`}
                    style={{ width: `${pct(q)}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--club-yellow-500)]">
                  <Coins size={10} />
                  <span>5</span>
                </div>
                {q.rewardClaimed ? (
                  <span className="text-[10px] text-green-400 font-semibold">Reclamee</span>
                ) : q.completed ? (
                  <button
                    onClick={() => handleClaim(q.id)}
                    disabled={claimingId === q.id}
                    className="text-[10px] font-bold bg-[var(--club-yellow-500)] text-[var(--club-blue-950)] px-2.5 py-1 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
                  >
                    {claimingId === q.id ? '...' : 'Reclamer'}
                  </button>
                ) : (
                  <span className="text-[10px] text-[var(--text-soft)] font-semibold">{pct(q)}%</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
