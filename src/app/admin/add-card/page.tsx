'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { COLLECTIONS } from '@/data/cards';

const RARITIES = ['COMMUNE', 'RARE', 'LEGENDAIRE'] as const;

export default function AdminAddCardPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  const [name, setName] = useState('');
  const [rarity, setRarity] = useState<string>('COMMUNE');
  const [number, setNumber] = useState('');
  const [collectionSlug, setCollectionSlug] = useState('s25-26');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/');
    }
  }, [user, router]);

  if (!user || user.role !== 'admin') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          rarity,
          number: parseInt(number, 10),
          collectionSlug,
          imageUrl: imageUrl || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la création');
      }

      setMessage({ type: 'success', text: `Carte "${name}" créée avec succès !` });
      setName('');
      setNumber('');
      setImageUrl('');
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur inconnue' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-[var(--club-yellow-500)]">Ajouter une carte</h1>

      {message && (
        <div
          className={`p-3 rounded-lg mb-4 font-medium text-sm ${
            message.type === 'success'
              ? 'bg-green-900/50 text-green-300 border border-green-700'
              : 'bg-red-900/50 text-red-300 border border-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Nom de la carte *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full p-2.5 rounded-lg border border-[var(--club-blue-700)] bg-[var(--club-blue-900)] text-white outline-none focus:border-[var(--club-yellow-500)] transition-colors"
            placeholder="Ex: Jan Baran"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Rareté *</label>
          <select
            value={rarity}
            onChange={(e) => setRarity(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-[var(--club-blue-700)] bg-[var(--club-blue-900)] text-white outline-none focus:border-[var(--club-yellow-500)] transition-colors"
          >
            {RARITIES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Numéro *</label>
          <input
            type="number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            required
            min="1"
            className="w-full p-2.5 rounded-lg border border-[var(--club-blue-700)] bg-[var(--club-blue-900)] text-white outline-none focus:border-[var(--club-yellow-500)] transition-colors"
            placeholder="Ex: 100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Collection *</label>
          <select
            value={collectionSlug}
            onChange={(e) => setCollectionSlug(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-[var(--club-blue-700)] bg-[var(--club-blue-900)] text-white outline-none focus:border-[var(--club-yellow-500)] transition-colors"
          >
            {COLLECTIONS.map((col) => (
              <option key={col.id} value={col.id}>{col.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">URL de l&apos;image</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-[var(--club-blue-700)] bg-[var(--club-blue-900)] text-white outline-none focus:border-[var(--club-yellow-500)] transition-colors"
            placeholder="https://example.com/player.jpg"
          />
          <p className="text-xs text-gray-500 mt-1">Laissez vide pour utiliser l&apos;image par défaut.</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full p-3 rounded-lg font-bold bg-[var(--club-yellow-500)] text-[var(--club-blue-950)] disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity mt-2"
        >
          {saving ? 'Création en cours...' : 'Créer la carte'}
        </button>
      </form>
    </div>
  );
}
