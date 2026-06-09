"use client";

import { create } from "zustand";
import { useMemo } from "react";
import { Card } from "@/data/cards";
import { DEFAULT_COLLECTION_ID } from "@/data/cards";
import { getCardsByCollection } from "@/data/clubCards";
import { getTotalDoubles, getUniqueCount } from "@/lib/stats";
import { buildProgressByRole } from "@/lib/stats";

export type BoosterCardDraw = {
  card: Card;
  wasDuplicate: boolean;
  quantityAfter: number;
};

type CollectionState = {
  quantities: Record<string, number>;
  shinyCards: string[];
  cardDates: Record<string, string>;
  activeCollectionId: string;
  lastDrawCardId: string | null;
  lastDrawWasDuplicate: boolean;
  syncError: string | null;
  initialized: boolean;
  addCard: (cardId: string, amount?: number) => void;
  setQuantity: (cardId: string, quantity: number) => void;
  removeCard: (cardId: string, amount?: number) => void;
  setActiveCollectionId: (id: string) => void;
  openBoosterPackAsync: (collectionId: string, token: string) => Promise<BoosterCardDraw[]>;
  resetCollection: () => void;
  getQuantity: (cardId: string) => number;
  syncToServer: (token: string, collectionId?: string) => Promise<void>;
  loadFromServer: (token: string, collectionId?: string) => Promise<void>;
  setQuantities: (quantities: Record<string, number>) => void;
  setShinyCards: (shinyCards: string[]) => void;
  setCardDates: (cardDates: Record<string, string>) => void;
};

export const useCollectionStore = create<CollectionState>()(
  (set, get) => ({
    quantities: {},
    shinyCards: [],
    cardDates: {},
    activeCollectionId: DEFAULT_COLLECTION_ID,
    lastDrawCardId: null,
    lastDrawWasDuplicate: false,
    syncError: null,
    initialized: false,

    setActiveCollectionId: (id) => set({ activeCollectionId: id }),

    setQuantities: (quantities) => set({ quantities }),
    setShinyCards: (shinyCards) => set({ shinyCards }),
    setCardDates: (cardDates) => set({ cardDates }),

    addCard: (cardId, amount = 1) =>
      set((state) => {
        const previous = state.quantities[cardId] ?? 0;
        const quantity = Math.max(0, previous + amount);
        const next = { ...state.quantities };
        if (quantity <= 0) {
          delete next[cardId];
        } else {
          next[cardId] = quantity;
        }
        return {
          quantities: next,
          lastDrawCardId: cardId,
          lastDrawWasDuplicate: previous >= 1
        };
      }),

    setQuantity: (cardId, quantity) =>
      set((state) => {
        const next = { ...state.quantities };
        if (quantity <= 0) {
          delete next[cardId];
        } else {
          next[cardId] = quantity;
        }
        return { quantities: next };
      }),

    removeCard: (cardId, amount = 1) =>
      set((state) => {
        const previous = state.quantities[cardId] ?? 0;
        const quantity = Math.max(0, previous - amount);
        const next = { ...state.quantities };
        if (quantity <= 0) {
          delete next[cardId];
        } else {
          next[cardId] = quantity;
        }
        return { quantities: next };
      }),

    openBoosterPackAsync: async (collectionId, token) => {
      const response = await fetch('/api/booster/open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ collectionId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de l'ouverture du booster");
      }

      const data = await response.json();
      const cards: BoosterCardDraw[] = data.cards;

      const nextQuantities = { ...get().quantities };
      for (const draw of cards) {
        nextQuantities[draw.card.id] = draw.quantityAfter;
      }

      const lastDraw = cards[cards.length - 1];
      set({
        quantities: nextQuantities,
        lastDrawCardId: lastDraw.card.id,
        lastDrawWasDuplicate: lastDraw.wasDuplicate,
        syncError: null,
      });

      return cards;
    },

    resetCollection: () =>
      set({
        quantities: {},
        lastDrawCardId: null,
        lastDrawWasDuplicate: false
      }),

    getQuantity: (cardId) => get().quantities[cardId] ?? 0,

    syncToServer: async (token, collectionId) => {
      try {
        const quantities = get().quantities;
        const cid = collectionId || get().activeCollectionId;
        for (const [cardId, quantity] of Object.entries(quantities)) {
          await fetch('/api/collection', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ cardId, quantity, collectionId: cid }),
          });
        }
        set({ syncError: null });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Sync failed';
        set({ syncError: errorMessage });
      }
    },

    loadFromServer: async (token, collectionId) => {
      try {
        const cid = collectionId || get().activeCollectionId;
        const response = await fetch(`/api/collection?collectionId=${encodeURIComponent(cid)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.collection) {
            const serverCards = data.collection.cards as Record<string, number>;
            const serverShiny = (data.collection.shinyCards as string[]) || [];
            const serverCardDates = (data.collection.cardDates as Record<string, string>) || {};
            set({ quantities: serverCards, shinyCards: serverShiny, cardDates: serverCardDates, syncError: null });
          } else {
            set({ quantities: {}, shinyCards: [], cardDates: {} });
          }
        }
        set({ initialized: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Load failed';
        set({ syncError: errorMessage, initialized: true });
      }
    },
  })
);

export const useCollectionSelectors = (collectionId?: string) => {
  const quantities = useCollectionStore((state) => state.quantities);
  const activeCollectionId = useCollectionStore((state) => state.activeCollectionId);
  const cid = collectionId || activeCollectionId;
  const cards = getCardsByCollection(cid);
  const totalCards = cards.length;

  const uniqueCount = useMemo(() => getUniqueCount(quantities), [quantities]);
  const doublesCount = useMemo(() => getTotalDoubles(quantities), [quantities]);
  const completionPercent = useMemo(
    () => (totalCards > 0 ? Math.round((uniqueCount / totalCards) * 100) : 0),
    [uniqueCount, totalCards]
  );
  const progressByRole = useMemo(
    () => buildProgressByRole(cards, quantities),
    [cards, quantities]
  );
  const doublesCards = useMemo(
    () => cards.filter((card) => (quantities[card.id] ?? 0) >= 2),
    [cards, quantities]
  );

  return {
    quantities,
    activeCollectionId,
    uniqueCount,
    doublesCount,
    completionPercent,
    progressByRole,
    doublesCards,
    totalCards,
    cards,
  };
};
