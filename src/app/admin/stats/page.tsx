'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

interface StatsData {
  kpis: {
    totalUsers: number;
    totalCardsInCirculation: number;
    totalBoostersOpened: number;
    totalTrades: number;
  };
  top10: Array<{ userId: string; name: string; unique: number; total: number }>;
  activity: {
    day: { boosters: number; trades: number };
    week: { boosters: number; trades: number };
    year: { boosters: number; trades: number };
  };
}

export default function AdminStatsPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<'day' | 'week' | 'year'>('day');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }
    fetchStats();
  }, [user]);

  async function fetchStats() {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 403) router.push('/');
        throw new Error('Erreur de chargement');
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  if (!user || user.role !== 'admin') return null;

  if (error) {
    return (
      <div className="p-4">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--club-yellow-500)]" />
      </div>
    );
  }

  const periodLabels: Record<string, string> = { day: "Aujourd'hui", week: 'Cette semaine', year: 'Cette année' };
  const activeActivity = data.activity[activePeriod];

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-[var(--club-yellow-500)]">Dashboard Administrateur</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
          <p className="text-sm text-gray-400">Utilisateurs</p>
          <p className="text-2xl font-bold text-white">{data.kpis.totalUsers}</p>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
          <p className="text-sm text-gray-400">Cartes en circulation</p>
          <p className="text-2xl font-bold text-white">{data.kpis.totalCardsInCirculation}</p>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
          <p className="text-sm text-gray-400">Boosters ouverts</p>
          <p className="text-2xl font-bold text-[var(--club-yellow-500)]">{data.kpis.totalBoostersOpened}</p>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
          <p className="text-sm text-gray-400">Échanges effectués</p>
          <p className="text-2xl font-bold text-[var(--club-blue-400)]">{data.kpis.totalTrades}</p>
        </div>
      </div>

      {/* Activity Section */}
      <h2 className="text-lg font-semibold mb-3 text-gray-300">Activité</h2>
      <div className="flex gap-2 mb-4">
        {(['day', 'week', 'year'] as const).map((period) => (
          <button
            key={period}
            onClick={() => setActivePeriod(period)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activePeriod === period
                ? 'bg-[var(--club-yellow-500)] text-black'
                : 'bg-[var(--card-bg)] text-gray-400 hover:text-white'
            }`}
          >
            {periodLabels[period]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
          <p className="text-sm text-gray-400">Boosters ({periodLabels[activePeriod]})</p>
          <p className="text-2xl font-bold text-[var(--club-yellow-500)]">{activeActivity.boosters}</p>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
          <p className="text-sm text-gray-400">Échanges ({periodLabels[activePeriod]})</p>
          <p className="text-2xl font-bold text-[var(--club-blue-400)]">{activeActivity.trades}</p>
        </div>
      </div>

      {/* Top 10 Leaderboard */}
      <h2 className="text-lg font-semibold mb-3 text-gray-300">Top 10 Collectionneurs</h2>
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] text-gray-400">
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Collectionneur</th>
              <th className="p-3 text-right">Cartes uniques</th>
              <th className="p-3 text-right">Total cartes</th>
            </tr>
          </thead>
          <tbody>
            {data.top10.map((collector, index) => (
              <tr key={collector.userId} className="border-b border-[var(--card-border)] hover:bg-white/5">
                <td className="p-3">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </td>
                <td className="p-3 text-white font-medium">{collector.name}</td>
                <td className="p-3 text-right text-[var(--club-yellow-500)]">{collector.unique}</td>
                <td className="p-3 text-right text-gray-400">{collector.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
