'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, Reorder } from 'framer-motion';
import { GripVertical, X, Save, ArrowLeft, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { CLUB_CARDS } from '@/data/clubCards';
import { useAuthStore } from '@/store/authStore';
import { Card } from '@/data/cards';

const MAX_SHOWCASE = 5;

interface ShowcaseEditorProps {
  initialShowcase: string[];
  ownedCards: Card[];
  onClose: () => void;
  onSaved: () => void;
}

export function ShowcaseEditor({ initialShowcase, ownedCards, onClose, onSaved }: ShowcaseEditorProps) {
  const { token } = useAuthStore();
  const [showcase, setShowcase] = useState<string[]>(initialShowcase.slice(0, MAX_SHOWCASE));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const toggleCard = useCallback((cardId: string) => {
    setShowcase((prev) => {
      if (prev.includes(cardId)) {
        return prev.filter((id) => id !== cardId);
      }
      if (prev.length >= MAX_SHOWCASE) return prev;
      return [...prev, cardId];
    });
  }, []);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/user/showcase', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cardIds: showcase }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const rarities = ['LEGENDAIRE', 'RARE', 'COMMUNE'];
  const sortedOwned = [...ownedCards].sort((a, b) => rarities.indexOf(a.rarity) - rarities.indexOf(b.rarity));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border border-[var(--club-blue-700)] bg-gradient-to-b from-[var(--club-blue-800)] to-[var(--club-blue-900)] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--club-blue-700)]">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-[var(--club-yellow-500)]" />
            <h2 className="text-lg font-bold text-[var(--club-yellow-500)] m-0">Éditer ma vitrine</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--club-blue-700)] transition-colors"
            aria-label="Fermer"
          >
            <X size={20} className="text-[var(--text-soft)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Preview */}
          <div className="mb-4">
            <p className="text-xs text-[var(--text-soft)] mb-2 font-semibold">
              Aperçu de la vitrine ({showcase.length}/{MAX_SHOWCASE})
            </p>
            <Reorder.Group
              axis="x"
              values={showcase}
              onReorder={setShowcase}
              className="flex gap-3 flex-wrap"
            >
              {Array.from({ length: MAX_SHOWCASE }).map((_, idx) => {
                const cardId = showcase[idx] || null;
                const cardMeta = cardId ? CLUB_CARDS.find((c) => c.id === cardId) : null;
                return (
                  <Reorder.Item
                    key={cardId || `empty-${idx}`}
                    value={cardId || `empty-${idx}`}
                    className="relative"
                    style={{ listStyle: 'none' }}
                  >
                    <motion.div
                      layoutId={`showcase-slot-${idx}`}
                      className={`relative rounded-xl border-2 overflow-hidden ${
                        cardMeta
                          ? 'border-[var(--club-yellow-500)] shadow-[0_0_12px_rgba(243,198,35,0.2)]'
                          : 'border-dashed border-[var(--club-blue-700)]'
                      }`}
                      style={{ width: 90, height: 68 }}
                    >
                      {cardMeta ? (
                        <>
                          <Image
                            src={cardMeta.photo}
                            alt={cardMeta.firstName}
                            width={90}
                            height={68}
                            style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                          />
                          <button
                            onClick={() => toggleCard(cardId!)}
                            className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-red-500/80 transition-colors"
                            aria-label="Retirer"
                          >
                            <X size={12} className="text-white" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                            <p className="text-[8px] text-white font-semibold truncate m-0">{cardMeta.firstName}</p>
                          </div>
                          <div className="absolute top-0.5 left-0.5">
                            <GripVertical size={12} className="text-white/60" />
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <span className="text-[10px] text-[var(--text-soft)]">Vide</span>
                        </div>
                      )}
                    </motion.div>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          </div>

          {/* Card selection */}
          <div>
            <p className="text-xs text-[var(--text-soft)] mb-2 font-semibold">
              Sélectionne tes cartes (clique pour ajouter/retirer)
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
              {sortedOwned.map((card) => {
                const isSelected = showcase.includes(card.id);
                return (
                  <motion.button
                    key={card.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleCard(card.id)}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                      isSelected
                        ? 'border-[var(--club-yellow-500)] shadow-[0_0_10px_rgba(243,198,35,0.3)]'
                        : 'border-transparent hover:border-[var(--club-blue-600)]'
                    }`}
                  >
                    <Image
                      src={card.photo || '/logo-club.png'}
                      alt={card.firstName}
                      width={80}
                      height={60}
                      style={{ objectFit: 'cover', width: '100%', height: 'auto', aspectRatio: '4/3' }}
                    />
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[var(--club-yellow-500)] flex items-center justify-center"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </motion.div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                      <p className="text-[9px] text-white font-semibold truncate m-0">{card.firstName}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--club-blue-700)] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[var(--text-soft)] hover:bg-[var(--club-blue-700)] transition-colors"
          >
            <ArrowLeft size={16} />
            Annuler
          </button>
          {error && <p className="text-xs text-red-400 flex-1 text-center">{error}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-[var(--club-yellow-500)] text-[var(--club-blue-950)] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
