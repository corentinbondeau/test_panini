export type BadgeDefinition = {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: UserStats) => boolean;
};

export type UserStats = {
  totalBoostersOpened: number;
  totalRecycles: number;
  totalLegendaries: number;
  totalCardsObtained: number;
  currentStreak: number;
};

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_booster',
    name: 'Premier pas',
    description: 'Ouvre ton premier booster',
    icon: '🎁',
    condition: (s) => s.totalBoostersOpened >= 1,
  },
  {
    id: 'booster_25',
    name: 'Collectionneur de boosters',
    description: 'Ouvre 25 boosters',
    icon: '📦',
    condition: (s) => s.totalBoostersOpened >= 25,
  },
  {
    id: 'booster_100',
    name: 'Fan de boosters',
    description: 'Ouvre 100 boosters',
    icon: '🏆',
    condition: (s) => s.totalBoostersOpened >= 100,
  },
  {
    id: 'first_recycle',
    name: 'Recycleur',
    description: 'Effectue ton premier recyclage',
    icon: '♻️',
    condition: (s) => s.totalRecycles >= 1,
  },
  {
    id: 'recycle_50',
    name: 'Grand Recycleur',
    description: 'Recycle 50 cartes au total',
    icon: '🔄',
    condition: (s) => s.totalRecycles >= 50,
  },
  {
    id: 'recycle_200',
    name: 'Maitre du recyclage',
    description: 'Recycle 200 cartes au total',
    icon: '♻️',
    condition: (s) => s.totalRecycles >= 200,
  },
  {
    id: 'legendary_5',
    name: 'Chasseur de Mythes',
    description: 'Obtiens 5 cartes légendaires',
    icon: '✨',
    condition: (s) => s.totalLegendaries >= 5,
  },
  {
    id: 'legendary_25',
    name: 'Seigneur des Légendaires',
    description: 'Obtiens 25 cartes légendaires',
    icon: '👑',
    condition: (s) => s.totalLegendaries >= 25,
  },
  {
    id: 'streak_7',
    name: 'Semaine complète',
    description: 'Atteins 7 jours de connexion consécutifs',
    icon: '🔥',
    condition: (s) => s.currentStreak >= 7,
  },
  {
    id: 'streak_30',
    name: 'Mois de champion',
    description: 'Atteins 30 jours de connexion consécutifs',
    icon: '💎',
    condition: (s) => s.currentStreak >= 30,
  },
  {
    id: 'cards_100',
    name: 'Cent cartes',
    description: 'Obtiens 100 cartes au total',
    icon: '🃏',
    condition: (s) => s.totalCardsObtained >= 100,
  },
  {
    id: 'cards_500',
    name: 'Bibliothèque vivante',
    description: 'Obtiens 500 cartes au total',
    icon: '📚',
    condition: (s) => s.totalCardsObtained >= 500,
  },
];
