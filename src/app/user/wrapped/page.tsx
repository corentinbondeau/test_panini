"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function WrappedPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/user/wrapped', { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } })
      .then(r => r.json())
      .then(d => setData(d.data))
      .catch(() => {});
  }, []);

  if (!data) return <p style={{ padding: 24 }}>Chargement...</p>;

  const cards = [
    { title: 'Boosters ouverts', value: data.boostersOpened },
    { title: 'Plus gros drop', value: data.biggestDrop },
    { title: 'Doublons recyclés', value: data.totalRecycles },
    { title: 'Streak max', value: data.streakMax },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '24px auto', padding: '0 16px' }}>
      <h1 style={{ marginBottom: 12 }}>Bilan de fin de saison</h1>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
        {cards.map((c, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12 }} style={{ minWidth: 200, padding: 16, borderRadius: 12, background: 'linear-gradient(180deg,#0b1f3f, #123668)', color: '#fff' }}>
            <h3 style={{ margin: 0 }}>{c.title}</h3>
            <p style={{ marginTop: 8, fontSize: 20, fontWeight: 700 }}>{c.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
