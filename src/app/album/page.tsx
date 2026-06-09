"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CardTile } from "@/components/cards/CardTile";
import { CardModal } from "@/components/cards/CardModal";
import { useCollectionStore, useCollectionSelectors } from "@/store/collectionStore";
import { useAuthStore } from "@/store/authStore";
import { COLLECTIONS, ALL_COLLECTIONS_ID } from "@/data/cards";
import { getCardsByCollection } from "@/data/clubCards";
import { Card, CardRarity } from "@/data/cards";
import Link from "next/link";
import styles from "./page.module.css";

const ALL_OPTION = { id: ALL_COLLECTIONS_ID, name: "Toutes les collections" };
const TAB_OPTIONS = [ALL_OPTION, ...COLLECTIONS];
const CARDS_PER_PAGE = 50;
const SEARCH_DEBOUNCE_MS = 300;

export default function AlbumPage() {
  const { user, checkAuth } = useAuthStore();
  const { quantities } = useCollectionSelectors();
  const storeCollectionId = useCollectionStore((s) => s.activeCollectionId);
  const setActiveCollectionId = useCollectionStore((s) => s.setActiveCollectionId);
  const shinyCards = useCollectionStore((s) => s.shinyCards);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(storeCollectionId);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [rarityFilter, setRarityFilter] = useState("");
  const [onlyOwned, setOnlyOwned] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(CARDS_PER_PAGE);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadCollection = useCollectionStore((s) => s.loadFromServer);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search]);

  useEffect(() => {
    checkAuth().finally(() => setIsInitialized(true));
  }, [checkAuth]);

  useEffect(() => {
    if (token) {
      setCollectionLoading(true);
      loadCollection(token, selectedCollection).finally(() => setCollectionLoading(false));
    }
  }, [token, selectedCollection, loadCollection]);

  useEffect(() => {
    setSelectedCollection(storeCollectionId);
  }, [storeCollectionId]);

  const handleCollectionChange = (id: string) => {
    setSelectedCollection(id);
    setActiveCollectionId(id);
    setSearch("");
    setDebouncedSearch("");
    setCategoryFilter("");
    setRarityFilter("");
    setSelectedCard(null);
    setVisibleCount(CARDS_PER_PAGE);
  };

  const collectionCards = useMemo(
    () => getCardsByCollection(selectedCollection) ?? [],
    [selectedCollection]
  );

  const isEmpty = collectionCards.length === 0 && selectedCollection !== ALL_COLLECTIONS_ID;

  const categories = useMemo(() => {
    if (!collectionCards?.length) return [];
    const cats = new Set(collectionCards.map((c) => c?.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [collectionCards]);

  const rarities = useMemo(() => {
    if (!collectionCards?.length) return [];
    const r = new Set(collectionCards.map((c) => c?.rarity).filter(Boolean));
    const order: CardRarity[] = ['COMMUNE', 'RARE', 'LEGENDAIRE'];
    return order.filter((o) => r.has(o));
  }, [collectionCards]);

  const filteredCards = useMemo(() => {
    let cards = collectionCards;
    if (!cards?.length) return [];
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      cards = cards.filter(
        (c) =>
          (c?.firstName?.toLowerCase() ?? '').includes(q) ||
          (c?.lastName?.toLowerCase() ?? '').includes(q)
      );
    }
    if (categoryFilter) {
      const normalized = categoryFilter.trim().toLowerCase();
      cards = cards.filter((c) => (c?.category?.trim()?.toLowerCase() ?? '') === normalized);
    }
    if (rarityFilter) {
      cards = cards.filter((c) => c?.rarity === rarityFilter);
    }
    if (onlyOwned) {
      cards = cards.filter((c) => (quantities?.[c?.id] ?? 0) > 0);
    }
    return cards;
  }, [collectionCards, debouncedSearch, categoryFilter, rarityFilter, onlyOwned, quantities]);

  const visibleCards = useMemo(
    () => filteredCards.slice(0, visibleCount),
    [filteredCards, visibleCount]
  );

  const hasMore = filteredCards.length > visibleCount;

  const hasActiveFilter = debouncedSearch.trim() !== "" || categoryFilter !== "" || rarityFilter !== "";

  const handleShowMore = () => {
    setVisibleCount((prev) => prev + CARDS_PER_PAGE);
  };

  const handleReset = () => {
    setSearch("");
    setDebouncedSearch("");
    setCategoryFilter("");
    setRarityFilter("");
    setVisibleCount(CARDS_PER_PAGE);
  };

  if (!isInitialized) {
    return <div className={styles.loading}>Chargement...</div>;
  }

  if (!user) {
    return (
      <section className={styles.protected}>
        <h2>Album</h2>
        <p>Connectez-vous pour commencer votre collection.</p>
        <Link href="/auth" className={styles.loginLink}>Se connecter</Link>
      </section>
    );
  }

  return (
    <section>
      <div className={styles.tabs}>
        {TAB_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => handleCollectionChange(opt.id)}
            className={selectedCollection === opt.id ? styles.tabActive : styles.tab}
          >
            {opt.name}
          </button>
        ))}
      </div>

      {!isEmpty && (
        <div className={styles.filterBar}>
          {/* Row 1a: Search + Possession toggle */}
          <div className={styles.searchToggleRow}>
            <div className={styles.searchWrapper}>
              <svg
                className={styles.searchIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Rechercher un joueur..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setVisibleCount(CARDS_PER_PAGE);
                }}
                className={styles.searchInput}
              />
            </div>
            <label className={styles.toggleLabel}>
              <button
                onClick={() => setOnlyOwned(!onlyOwned)}
                className={`${styles.toggleSwitch} ${onlyOwned ? styles.toggleActive : ''}`}
                role="switch"
                aria-checked={onlyOwned}
              >
                <span className={styles.toggleKnob} />
              </button>
              <span className={styles.toggleText}>Uniquement mes cartes</span>
            </label>
          </div>

          {/* Row 1b: Category filters */}
          <div className={`${styles.chipRow} ${styles.chipRowGap}`}>
            <button
              onClick={() => {
                setCategoryFilter("");
                setVisibleCount(CARDS_PER_PAGE);
              }}
              className={!categoryFilter ? styles.chipActive : styles.chip}
            >
              Tous
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setCategoryFilter(cat === categoryFilter ? "" : cat);
                  setVisibleCount(CARDS_PER_PAGE);
                }}
                className={cat === categoryFilter ? styles.chipActive : styles.chip}
              >
                {cat}
              </button>
            ))}
            {hasActiveFilter && (
              <button onClick={handleReset} className={styles.resetBtn}>
                <svg className={styles.resetIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                R&eacute;initialiser
              </button>
            )}
          </div>

          {/* Row 2: Rarity filters only */}
          {rarities.length > 1 && (
            <div className={`${styles.chipRow} ${styles.chipRowCentered}`}>
              <button
                onClick={() => {
                  setRarityFilter("");
                  setVisibleCount(CARDS_PER_PAGE);
                }}
                className={!rarityFilter ? styles.chipActive : styles.chip}
              >
                Toutes
              </button>
              {rarities.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRarityFilter(r === rarityFilter ? "" : r);
                    setVisibleCount(CARDS_PER_PAGE);
                  }}
                  className={r === rarityFilter ? styles.chipActive : styles.chip}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {collectionLoading ? (
        <p className={styles.loading}>Chargement de la collection...</p>
      ) : isEmpty ? (
        <p className={styles.emptyMessage}>
          {"Vous n'avez pas encore commence cette collection !"}
        </p>
      ) : filteredCards.length === 0 ? (
        <p className={styles.emptyMessage}>
          Aucun joueur ne correspond a votre recherche.
        </p>
      ) : (
        <>
          <div className={styles.grid}>
            {visibleCards.map((card) => (
              <div key={card.id}>
                <CardTile card={card} quantity={quantities[card.id] ?? 0} isShiny={shinyCards.includes(card.id)} onClick={() => setSelectedCard(card)} />
              </div>
            ))}
          </div>
          {hasMore && (
            <div className={styles.showMoreWrapper}>
              <button onClick={handleShowMore} className={styles.showMoreBtn}>
                Afficher plus ({filteredCards.length - visibleCount} restantes)
              </button>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {selectedCard && (
          <CardModal
            card={selectedCard}
            quantity={quantities[selectedCard.id] ?? 0}
            onClose={() => setSelectedCard(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
