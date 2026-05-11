import { Card, CardRole } from "@/data/cards";

export type ProgressByRole = Record<CardRole, { ownedUnique: number; total: number; percent: number }>;

export const buildProgressByRole = (
  cards: Card[],
  quantities: Record<string, number>
): ProgressByRole => {
  const result: ProgressByRole = {
    joueur: { ownedUnique: 0, total: 0, percent: 0 },
    coach: { ownedUnique: 0, total: 0, percent: 0 },
    dirigeant: { ownedUnique: 0, total: 0, percent: 0 }
  };

  cards.forEach((card) => {
    result[card.role].total += 1;
    if ((quantities[card.id] ?? 0) > 0) {
      result[card.role].ownedUnique += 1;
    }
  });

  (Object.keys(result) as CardRole[]).forEach((role) => {
    const entry = result[role];
    entry.percent = entry.total === 0 ? 0 : Math.round((entry.ownedUnique / entry.total) * 100);
  });

  return result;
};

export const getUniqueCount = (quantities: Record<string, number>): number =>
  Object.values(quantities).filter((qty) => qty > 0).length;

export const getTotalDoubles = (quantities: Record<string, number>): number =>
  Object.values(quantities).reduce((sum, qty) => sum + Math.max(0, qty - 1), 0);
