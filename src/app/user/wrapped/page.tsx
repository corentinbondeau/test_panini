"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { Package, Recycle, TrendingUp, Zap, Trophy, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

type WrappedData = {
  boostersOpened: number;
  biggestDrop: string;
  totalRecycles: number;
  streakMax: number;
  totalLegendaries: number;
  totalCards: number;
  doublesRecycled: number;
  tokensEarned: number;
};

const SLIDES = [
  { key: 'boosters', icon: Package, color: '#f3c623', label: 'Boosters ouverts' },
  { key: 'legendaries', icon: Sparkles, color: '#a855f7', label: 'Légendaires obtenues' },
  { key: 'recycles', icon: Recycle, color: '#22c55e', label: 'Doublons recyclés' },
  { key: 'streak', icon: Zap, color: '#f97316', label: 'Streak max' },
  { key: 'biggest', icon: Trophy, color: '#f3c623', label: 'Plus gros drop' },
  { key: 'tokens', icon: TrendingUp, color: '#3b82f6', label: 'Tokens gagnés' },
];

export default function WrappedPage() {
  const { token } = useAuthStore();
  const [data, setData] = useState<WrappedData | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (!token) return;
    fetch('/api/user/wrapped', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.ok) setData(d.data);
      })
      .catch(() => {});
  }, [token]);

  if (!data) return (
    <div style={{ maxWidth: 500, margin: '48px auto', padding: '0 16px', textAlign: 'center' }}>
      <p style={{ color: 'var(--text-soft)' }}>Chargement de ton bilan...</p>
    </div>
  );

  const slideValues: Record<string, string | number> = {
    boosters: data.boostersOpened,
    legendaries: data.totalLegendaries,
    recycles: data.totalRecycles,
    streak: `${data.streakMax} jours`,
    biggest: data.biggestDrop === 'LEGENDAIRE' ? '⭐ Légendaire' : data.biggestDrop === 'RARE' ? '✨ Rare' : '📦 Commune',
    tokens: `${data.tokensEarned} 🪙`,
  };

  const slide = SLIDES[currentSlide];
  const Icon = slide.icon;

  const next = () => {
    if (currentSlide < SLIDES.length - 1) {
      setDirection(1);
      setCurrentSlide(p => p + 1);
    }
  };

  const prev = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(p => p - 1);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '24px auto', padding: '0 16px' }}>
      <h1 style={{ textAlign: 'center', color: 'var(--club-yellow-500)', fontSize: '1.1rem', marginBottom: 16 }}>
        📊 Bilan du mois
      </h1>

      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
        {SLIDES.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= currentSlide ? slide.color : 'var(--club-blue-700)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentSlide}
          custom={direction}
          initial={{ opacity: 0, x: direction * 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -60 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{
            background: `linear-gradient(135deg, ${slide.color}22, ${slide.color}11)`,
            border: `1px solid ${slide.color}44`,
            borderRadius: 20,
            padding: '32px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: `${slide.color}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Icon size={28} color={slide.color} />
          </div>
          <p style={{ color: 'var(--text-soft)', fontSize: '0.85rem', margin: 0 }}>
            {slide.label}
          </p>
          <p style={{
            fontSize: '2.2rem', fontWeight: 800, color: slide.color,
            margin: '8px 0 0',
          }}>
            {slideValues[slide.key]}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20 }}>
        <button
          onClick={prev}
          disabled={currentSlide === 0}
          style={{
            background: 'var(--club-blue-800)', border: '1px solid var(--club-blue-700)',
            color: 'var(--text-main)', padding: '10px 20px', borderRadius: 12,
            cursor: currentSlide > 0 ? 'pointer' : 'default',
            opacity: currentSlide > 0 ? 1 : 0.4, fontWeight: 600, fontSize: '0.85rem',
          }}
        >
          ← Précédent
        </button>
        <button
          onClick={next}
          disabled={currentSlide === SLIDES.length - 1}
          style={{
            background: slide.color, border: 'none',
            color: '#000', padding: '10px 20px', borderRadius: 12,
            cursor: currentSlide < SLIDES.length - 1 ? 'pointer' : 'default',
            opacity: currentSlide < SLIDES.length - 1 ? 1 : 0.4,
            fontWeight: 700, fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          Suivant <ArrowRight size={16} />
        </button>
      </div>

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Link href="/compte" style={{
          color: 'var(--text-soft)', fontSize: '0.8rem', textDecoration: 'underline',
        }}>
          ← Retour au profil
        </Link>
      </div>
    </div>
  );
}
