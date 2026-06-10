export type FallbackQuest = {
  id: string;
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
    id: 'fallback_booster_5',
    description: 'Ouvre 5 boosters aujourd\'hui',
    type: 'booster_count',
    target: 5,
    rewardTokens: 10,
    progress: 0,
    completed: false,
    rewardClaimed: false,
    isDaily: true,
  },
  {
    id: 'fallback_booster_10',
    description: 'Ouvre 10 boosters aujourd\'hui',
    type: 'booster_count',
    target: 10,
    rewardTokens: 15,
    progress: 0,
    completed: false,
    rewardClaimed: false,
    isDaily: true,
  },
  {
    id: 'fallback_booster_25',
    description: 'Ouvre 25 boosters aujourd\'hui',
    type: 'booster_count',
    target: 25,
    rewardTokens: 25,
    progress: 0,
    completed: false,
    rewardClaimed: false,
    isDaily: true,
  },
  {
    id: 'fallback_recycle_1',
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
    description: 'Recycle 5 cartes aujourd\'hui',
    type: 'recycle_count',
    target: 5,
    rewardTokens: 10,
    progress: 0,
    completed: false,
    rewardClaimed: false,
    isDaily: true,
  },
  {
    id: 'fallback_unique_1',
    description: 'Decroche 1 nouvelle carte aujourd\'hui',
    type: 'unique_count',
    target: 1,
    rewardTokens: 5,
    progress: 0,
    completed: false,
    rewardClaimed: false,
    isDaily: true,
  },
  {
    id: 'fallback_trade_1',
    description: 'Realise 1 echange aujourd\'hui',
    type: 'trade_count',
    target: 1,
    rewardTokens: 5,
    progress: 0,
    completed: false,
    rewardClaimed: false,
    isDaily: true,
  },
  {
    id: 'fallback_trade_3',
    description: 'Realise 3 echanges aujourd\'hui',
    type: 'trade_count',
    target: 3,
    rewardTokens: 10,
    progress: 0,
    completed: false,
    rewardClaimed: false,
    isDaily: true,
  },
  {
    id: 'fallback_trade_5',
    description: 'Realise 5 echanges aujourd\'hui',
    type: 'trade_count',
    target: 5,
    rewardTokens: 15,
    progress: 0,
    completed: false,
    rewardClaimed: false,
    isDaily: true,
  },
];
