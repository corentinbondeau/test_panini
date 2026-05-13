import { seedClubCards } from "../../scripts/seed-club";
import { Card, ALL_COLLECTIONS_ID } from "./cards";

export const ALL_CLUB_CARDS: Card[] = seedClubCards();

// All existing cards belong to "Saison 25-26"
export const S25_26_CARDS = ALL_CLUB_CARDS.map((c) => ({
  ...c,
  collectionId: "s25-26" as const,
}));

// Saison 26-27 starts empty
export const S26_27_CARDS: Card[] = [];

export const CLUB_CARDS_BY_COLLECTION: Record<string, Card[]> = {
  "s25-26": S25_26_CARDS,
  "s26-27": S26_27_CARDS,
};

export const getCardsByCollection = (collectionId: string): Card[] => {
  if (collectionId === ALL_COLLECTIONS_ID) return ALL_CLUB_CARDS;
  return CLUB_CARDS_BY_COLLECTION[collectionId] ?? [];
};

// Backward-compatible default
export const CLUB_CARDS = S25_26_CARDS;
export const TOTAL_CARDS = CLUB_CARDS.length;
