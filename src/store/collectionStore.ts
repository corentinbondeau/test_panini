"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { CLUB_CARDS, TOTAL_CARDS } from "@/data/clubCards";
import { Card } from "@/data/cards";
import { buildProgressByRole, getTotalDoubles, getUniqueCount } from "@/lib/stats";

export type BoosterCardDraw = {
  card: Card;
  wasDuplicate: boolean;
  quantityAfter: number;
};

type CollectionState = {
  quantities: Record<string, number>;
  lastDrawCardId: string | null;
  lastDrawWasDuplicate: boolean;
  addCard: (cardId: string, amount?: number) => void;
  setQuantity: (cardId: string, quantity: number) => void;
  removeCard: (cardId: string, amount?: number) => void;
  drawRandomCard: () => Card;
  openBoosterPack: () => BoosterCardDraw[];
  resetCollection: () => void;
  getQuantity: (cardId: string) => number;
};

const safeStorage = createJSONStorage(() => localStorage);

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set, get) => ({
      quantities: {},
      lastDrawCardId: null,
      lastDrawWasDuplicate: false,

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

      drawRandomCard: () => {
        const randomIndex = Math.floor(Math.random() * CLUB_CARDS.length);
        const card = CLUB_CARDS[randomIndex];
        get().addCard(card.id, 1);
        return card;
      },

      openBoosterPack: () => {
        const currentQuantities = get().quantities;
        const nextQuantities = { ...currentQuantities };
        const draws: BoosterCardDraw[] = [];

        for (let i = 0; i < 4; i += 1) {
          const randomIndex = Math.floor(Math.random() * CLUB_CARDS.length);
          const card = CLUB_CARDS[randomIndex];
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

      getQuantity: (cardId) => get().quantities[cardId] ?? 0
    }),
    {
      name: "panini-collection-v2",
      storage: safeStorage,
      partialize: (state) => ({ quantities: state.quantities }),
      version: 2
    }
  )
);

export const useCollectionSelectors = () => {
  const quantities = useCollectionStore((state) => state.quantities);
  const uniqueCount = getUniqueCount(quantities);
  const doublesCount = getTotalDoubles(quantities);
  const completionPercent = Math.round((uniqueCount / TOTAL_CARDS) * 100);
  const progressByRole = buildProgressByRole(CLUB_CARDS, quantities);
  const doublesCards = CLUB_CARDS.filter((card) => (quantities[card.id] ?? 0) >= 2);

  return {
    quantities,
    uniqueCount,
    doublesCount,
    completionPercent,
    progressByRole,
    doublesCards
  };
};
