"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CardTile } from "@/components/cards/CardTile";
import { useCollectionStore, useCollectionSelectors } from "@/store/collectionStore";
import { useAuthStore } from "@/store/authStore";
import { COLLECTIONS, ALL_COLLECTIONS_ID } from "@/data/cards";
import { getCardsByCollection } from "@/data/clubCards";
import Link from "next/link";
import styles from "./page.module.css";

const ALL_OPTION = { id: ALL_COLLECTIONS_ID, name: "Toutes les collections" };
const TAB_OPTIONS = [ALL_OPTION, ...COLLECTIONS];

export default function AlbumPage() {
  const { user, checkAuth } = useAuthStore();
  const { quantities } = useCollectionSelectors();
  const storeCollectionId = useCollectionStore((s) => s.activeCollectionId);
  const setActiveCollectionId = useCollectionStore((s) => s.setActiveCollectionId);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(storeCollectionId);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const loadCollection = useCollectionStore((s) => s.loadFromServer);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    checkAuth().finally(() => setIsInitialized(true));
  }, [checkAuth]);

  useEffect(() => {
    if (token) {
      loadCollection(token, selectedCollection);
    }
  }, [token, selectedCollection, loadCollection]);

  useEffect(() => {
    setSelectedCollection(storeCollectionId);
  }, [storeCollectionId]);

  const handleCollectionChange = (id: string) => {
    setSelectedCollection(id);
    setActiveCollectionId(id);
    setSearch("");
    setCategoryFilter("");
  };

  const collectionCards = getCardsByCollection(selectedCollection);
  const isEmpty = collectionCards.length === 0 && selectedCollection !== ALL_COLLECTIONS_ID;

  const categories = useMemo(() => {
    const cats = new Set(collectionCards.map((c) => c.category));
    return Array.from(cats).sort();
  }, [collectionCards]);

  const filteredCards = useMemo(() => {
    let cards = collectionCards;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      cards = cards.filter(
        (c) =>
          c.firstName.toLowerCase().includes(q) ||
          c.lastName.toLowerCase().includes(q)
      );
    }
    if (categoryFilter) {
      cards = cards.filter((c) => c.category === categoryFilter);
    }
    return cards;
  }, [collectionCards, search, categoryFilter]);

  const hasActiveFilter = search.trim() !== "" || categoryFilter !== "";

  const handleReset = () => {
    setSearch("");
    setCategoryFilter("");
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
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={`${styles.chipRow} ${styles.chipRowGap}`}>
            <button
              onClick={() => setCategoryFilter("")}
              className={!categoryFilter ? styles.chipActive : styles.chip}
            >
              Tous
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat === categoryFilter ? "" : cat)}
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
        </div>
      )}

      {isEmpty ? (
        <p className={styles.emptyMessage}>
          {"Vous n'avez pas encore commence cette collection !"}
        </p>
      ) : filteredCards.length === 0 ? (
        <p className={styles.emptyMessage}>
          Aucun joueur ne correspond a votre recherche.
        </p>
      ) : (
        <div className={styles.grid}>
          <AnimatePresence mode="popLayout">
            {filteredCards.map((card) => (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <CardTile card={card} quantity={quantities[card.id] ?? 0} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
