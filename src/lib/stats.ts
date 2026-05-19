import { Card, CardRole } from "@/data/cards";

export type ProgressByRole = Record<CardRole, { ownedUnique: number; total: number; percent: number }>;

/**
 * Calcule la progression par rôle (joueur, coach, dirigeant).
 *
 * Chaque joueur génère 3 cartes (COMMUNE, RARE, LEGENDAIRE).
 * Le total par rôle = nombre de joueurs uniques × 3.
 * Le pourcentage = (cartes distinctes possédées / total) × 100.
 *
 * Normalisation : compare les `card.id` de manière insensible à la casse
 * et après nettoyage des espaces, pour éviter les désyncs avec la BDD.
 */
const normalizeKey = (key: string): string => key.trim().toLowerCase();

/**
 * Retourne le Set des clés normalisées d'un objet quantités (utile pour
 * la recherche O(1) avec des clés possiblement non normalisées).
 */
const buildOwnedSet = (quantities: Record<string, number>): Set<string> => {
  const set = new Set<string>();
  for (const [key, qty] of Object.entries(quantities)) {
    if (qty > 0) set.add(normalizeKey(key));
  }
  return set;
};

export const buildProgressByRole = (
  cards: Card[],
  quantities: Record<string, number>
): ProgressByRole => {
  const result: ProgressByRole = {
    joueur: { ownedUnique: 0, total: 0, percent: 0 },
    coach: { ownedUnique: 0, total: 0, percent: 0 },
    dirigeant: { ownedUnique: 0, total: 0, percent: 0 }
  };

  // Set de toutes les cartes possédées (clés normalisées)
  const ownedNormalized = buildOwnedSet(quantities);

  // Compte les joueurs uniques par rôle
  const uniquePlayers = new Map<CardRole, Set<string>>();
  for (const role of ['joueur', 'coach', 'dirigeant'] as CardRole[]) {
    uniquePlayers.set(role, new Set());
  }

  for (const card of cards) {
    const role = card.role as CardRole;
    uniquePlayers.get(role)!.add(`${card.firstName}|${card.lastName}`);

    // Comparaison normalisée (trim + toLowerCase)
    if (ownedNormalized.has(normalizeKey(card.id))) {
      result[role].ownedUnique += 1;
    }
  }

  // Total = nombre de joueurs uniques × 3 raretés
  for (const role of Object.keys(result) as CardRole[]) {
    const entry = result[role];
    const playerCount = uniquePlayers.get(role)!.size;
    entry.total = playerCount * 3;
    entry.percent = entry.total === 0 ? 0 : Math.round((entry.ownedUnique / entry.total) * 100);
  }

  return result;
};

export const getUniqueCount = (quantities: Record<string, number>): number =>
  Object.values(quantities).filter((qty) => qty > 0).length;

export const getTotalDoubles = (quantities: Record<string, number>): number =>
  Object.values(quantities).reduce((sum, qty) => sum + Math.max(0, qty - 1), 0);
