'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useCollectionStore, useCollectionSelectors } from '@/store/collectionStore';
import { ALL_CLUB_CARDS } from '@/data/clubCards';
import { CardRarity } from '@/data/cards';
import Image from 'next/image';
import Link from 'next/link';
import { Search } from 'lucide-react';
import styles from './page.module.css';

type Listing = {
  id: string;
  sellerId: string;
  cardId: string;
  price: number;
  status: string;
  createdAt: string;
  seller: { id: string; firstName: string | null; lastName: string | null; avatar: string | null };
  card: { id: string; firstName: string; lastName: string; photo: string; rarity: string } | null;
};

export default function MarketplacePage() {
  const { user, checkAuth, token } = useAuthStore();
  const { quantities } = useCollectionSelectors();
  const setQuantities = useCollectionStore((s) => s.setQuantities);
  const loadCollection = useCollectionStore((s) => s.loadFromServer);
  const [isInitialized, setIsInitialized] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  // Sell form
  const [showSellForm, setShowSellForm] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [price, setPrice] = useState(5);
  const [selling, setSelling] = useState(false);

  useEffect(() => {
    checkAuth().finally(() => setIsInitialized(true));
  }, [checkAuth]);

  const fetchListings = () => {
    if (!token) return;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    const url = `/api/marketplace${params.toString() ? `?${params.toString()}` : ''}`;
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setListings(data.listings || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Erreur de chargement');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchListings();
  }, [token, search]);

  const doublesCards = useMemo(
    () => ALL_CLUB_CARDS.filter((c) => (quantities[c.id] ?? 0) >= 2),
    [quantities],
  );

  const handleBuy = async (listingId: string) => {
    if (!token) return;
    setBuyingId(listingId);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/marketplace/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ listingId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('Carte achetée avec succès !');
      setListings((prev) => prev.filter((l) => l.id !== listingId));
      loadCollection(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBuyingId(null);
    }
  };

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSelling(true);
    setError('');
    try {
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cardId: selectedCardId, price }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowSellForm(false);
      setSelectedCardId('');
      setPrice(5);
      setSuccess('Annonce créée !');
      loadCollection(token);
      // Refresh listings
      const r = await fetch('/api/marketplace', { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setListings(d.listings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSelling(false);
    }
  };

  if (!isInitialized) {
    return <p className={styles.loading}>Chargement...</p>;
  }

  if (!user) {
    return (
      <div className={styles.protected}>
        <h2>Marketplace</h2>
        <p>Connectez-vous pour accéder au marché.</p>
        <Link href="/auth" className={styles.loginLink}>Se connecter</Link>
      </div>
    );
  }

  return (
    <section>
      <h2>Marché aux cartes</h2>
      <p className={styles.note}>Achète et vends tes doubles contre des tokens.</p>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <div className={styles.actions}>
        <button onClick={() => setShowSellForm(!showSellForm)} className={styles.sellBtn}>
          {showSellForm ? 'Annuler' : 'Vendre un double'}
        </button>
      </div>

      {showSellForm && (
        <form onSubmit={handleSell} className={styles.sellForm}>
          <h3>Vendre une carte</h3>
          <div className={styles.field}>
            <label className={styles.label}>Carte (doublons)</label>
            <select
              value={selectedCardId}
              onChange={(e) => setSelectedCardId(e.target.value)}
              className={styles.select}
              required
            >
              <option value="">Choisis une carte</option>
              {doublesCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} ({c.rarity}) x{quantities[c.id]}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Prix (tokens)</label>
            <input
              type="number"
              min={1}
              max={100}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className={styles.input}
              required
            />
          </div>
          <button type="submit" disabled={selling || !selectedCardId} className={styles.submitBtn}>
            {selling ? 'Publication...' : 'Mettre en vente'}
          </button>
        </form>
      )}

      {/* Search bar */}
      <div className={styles.searchWrapper}>
        <Search size={16} className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Rechercher une carte par nom..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {loading ? (
        <p className={styles.loading}>Chargement du marché...</p>
      ) : listings.length === 0 ? (
        <p className={styles.empty}>
          {search.trim() ? 'Aucune carte trouvée pour ce nom.' : 'Aucune carte en vente pour le moment.'}
        </p>
      ) : (
        <div className={styles.grid}>
          {listings.map((listing) => (
            <div key={listing.id} className={styles.card}>
              {listing.card ? (
                <>
                  <div className={styles.cardImageWrapper}>
                    <Image
                      src={listing.card.photo}
                      alt={`${listing.card.firstName} ${listing.card.lastName}`}
                      width={120}
                      height={160}
                      className={styles.cardImage}
                    />
                  </div>
                  <div className={styles.cardInfo}>
                    <p className={styles.cardName}>{listing.card.firstName} {listing.card.lastName}</p>
                    <span className={`${styles.rarityBadge} ${styles[listing.card.rarity]}`}>
                      {listing.card.rarity}
                    </span>
                    <p className={styles.price}>{listing.price} tokens</p>
                    <p className={styles.seller}>
                      Vendu par {listing.seller.firstName || ''} {listing.seller.lastName || ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handleBuy(listing.id)}
                    disabled={buyingId === listing.id}
                    className={styles.buyBtn}
                  >
                    {buyingId === listing.id ? 'Achat...' : 'Acheter'}
                  </button>
                </>
              ) : (
                <p className={styles.empty}>Carte introuvable</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
