"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
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
  activeCollectionId: string;
  lastDrawCardId: string | null;
  lastDrawWasDuplicate: boolean;
  syncError: string | null;
  addCard: (cardId: string, amount?: number) => void;
  setQuantity: (cardId: string, quantity: number) => void;
  removeCard: (cardId: string, amount?: number) => void;
  setActiveCollectionId: (id: string) => void;
  drawRandomCard: (collectionId?: string) => Card;
  openBoosterPack: (collectionId?: string) => BoosterCardDraw[];
  resetCollection: () => void;
  getQuantity: (cardId: string) => number;
  syncToServer: (token: string, collectionId?: string) => Promise<void>;
  loadFromServer: (token: string, collectionId?: string) => Promise<void>;
};

const safeStorage = createJSONStorage(() => localStorage);

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set, get) => ({
      quantities: {},
      activeCollectionId: DEFAULT_COLLECTION_ID,
      lastDrawCardId: null,
      lastDrawWasDuplicate: false,
      syncError: null,

      setActiveCollectionId: (id) => set({ activeCollectionId: id }),

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

      drawRandomCard: (collectionId) => {
        const cards = getCardsByCollection(collectionId || get().activeCollectionId);
        const randomIndex = Math.floor(Math.random() * cards.length);
        const card = cards[randomIndex];
        get().addCard(card.id, 1);
        return card;
      },

      openBoosterPack: (collectionId) => {
        const cards = getCardsByCollection(collectionId || get().activeCollectionId);
        const currentQuantities = get().quantities;
        const nextQuantities = { ...currentQuantities };
        const draws: BoosterCardDraw[] = [];

        for (let i = 0; i < 5; i += 1) {
          const randomIndex = Math.floor(Math.random() * cards.length);
          const card = cards[randomIndex];
          const previous = nextQuantities[card.id] ?? 0;
          const next = previous + 1;
          nextQuantities[card.id] = next;

          draws.push({
            card,
            wasDuplicate: previous >= 1,
            quantityAfter: next
          });
        }

        const lastDraw = draws[draws.length - 1];
        set({
          quantities: nextQuantities,
          lastDrawCardId: lastDraw.card.id,
          lastDrawWasDuplicate: lastDraw.wasDuplicate
        });

        return draws;
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
              set({ quantities: serverCards, syncError: null });
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Load failed';
          set({ syncError: errorMessage });
        }
      },
    }),
    {
      name: "panini-collection-v2",
      storage: safeStorage,
      partialize: (state) => ({
        quantities: state.quantities,
        activeCollectionId: state.activeCollectionId,
      }),
      version: 2
    }
  )
);

export const useCollectionSelectors = (collectionId?: string) => {
  const quantities = useCollectionStore((state) => state.quantities);
  const activeCollectionId = useCollectionStore((state) => state.activeCollectionId);
  const cid = collectionId || activeCollectionId;
  const cards = getCardsByCollection(cid);
  const totalCards = cards.length;

  const uniqueCount = getUniqueCount(quantities);
  const doublesCount = getTotalDoubles(quantities);
  const completionPercent = totalCards > 0 ? Math.round((uniqueCount / totalCards) * 100) : 0;
  const progressByRole = buildProgressByRole(cards, quantities);
  const doublesCards = cards.filter((card) => (quantities[card.id] ?? 0) >= 2);

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
