export type FallbackQuest = {
  id: string;
  title: string;
  description: string;
  type: string;
  target: number;
  rewardTokens: number;
  progress: number;
  completed: boolean;
  rewardClaimed: boolean;
  isDaily: boolean;
};

export const FALLBACK_QUESTS: FallbackQuest[] = [
  {
    id: 'fallback_booster_1',
    title: 'Ouvreur de boosters',
    description: 'Ouvre 1 booster aujourd\'hui',
    type: 'booster_count',
    target: 1,
    rewardTokens: 5,
    progress: 0,
    completed: false,
    rewardClaimed: false,
    isDaily: true,
  },
  {
    id: 'fallback_booster_3',
    title: 'Collectionneur du jour',
    description: 'Ouvre 3 boosters aujourd\'hui',
    type: 'booster_count',
    target: 3,
    rewardTokens: 5,
    progress: 0,
    completed: false,
    rewardClaimed: false,
    isDaily: true,
  },
  {
    id: 'fallback_recycle_1',
    title: 'Recycleur',
    description: 'Recycle 1 carte aujourd\'hui',
    type: 'recycle_count',
    target: 1,
    rewardTokens: 5,
    progress: 0,
    completed: false,
    rewardClaimed: false,
    isDaily: true,
  },
  {
    id: 'fallback_recycle_5',
    title: ' Grand recycleur',
    description: 'Recycle 5 cartes aujourd\'hui',
    type: 'recycle_count',
    target: 5,
    rewardTokens: 5,
    progress: 0,
    completed: false,
    rewardClaimed: false,
    isDaily: true,
  },
  {
    id: 'fallback_unique_1',
    title: 'Collection',
    description: 'Débloque 1 nouvelle carte aujourd\'hui',
    type: 'unique_count',
    target: 1,
    rewardTokens: 5,
    progress: 0,
    completed: false,
    rewardClaimed: false,
    isDaily: true,
  },
];
