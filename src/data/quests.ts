export type QuestType = 'booster_count' | 'recycle_count' | 'unique_count' | 'legendary_count' | 'trade_count';

export type QuestDefinition = {
  id: string;
  description: string;
  type: QuestType;
  target: number;
  rewardBoosters: number;
};

export const QUEST_DEFINITIONS: QuestDefinition[] = [
  {
    id: 'boosters_10',
    description: 'Ouvre 10 boosters',
    type: 'booster_count',
    target: 10,
    rewardBoosters: 1,
  },
  {
    id: 'boosters_50',
    description: 'Ouvre 50 boosters',
    type: 'booster_count',
    target: 50,
    rewardBoosters: 3,
  },
  {
    id: 'boosters_100',
    description: 'Ouvre 100 boosters',
    type: 'booster_count',
    target: 100,
    rewardBoosters: 5,
  },
  {
    id: 'recycle_5',
    description: 'Recycle 5 cartes',
    type: 'recycle_count',
    target: 5,
    rewardBoosters: 1,
  },
  {
    id: 'recycle_25',
    description: 'Recycle 25 cartes',
    type: 'recycle_count',
    target: 25,
    rewardBoosters: 3,
  },
  {
    id: 'recycle_100',
    description: 'Recycle 100 cartes',
    type: 'recycle_count',
    target: 100,
    rewardBoosters: 5,
  },
  {
    id: 'unique_50',
    description: 'Collectionne 50 cartes uniques',
    type: 'unique_count',
    target: 50,
    rewardBoosters: 2,
  },
  {
    id: 'unique_200',
    description: 'Collectionne 200 cartes uniques',
    type: 'unique_count',
    target: 200,
    rewardBoosters: 5,
  },
  {
    id: 'unique_500',
    description: 'Collectionne 500 cartes uniques',
    type: 'unique_count',
    target: 500,
    rewardBoosters: 10,
  },
  {
    id: 'legendary_5',
    description: 'Obtiens 5 cartes legendaires',
    type: 'legendary_count',
    target: 5,
    rewardBoosters: 3,
  },
  {
    id: 'trades_5',
    description: 'Realise 5 echanges',
    type: 'trade_count',
    target: 5,
    rewardBoosters: 1,
  },
  {
    id: 'trades_25',
    description: 'Realise 25 echanges',
    type: 'trade_count',
    target: 25,
    rewardBoosters: 3,
  },
  {
    id: 'trades_100',
    description: 'Realise 100 echanges',
    type: 'trade_count',
    target: 100,
    rewardBoosters: 5,
  },
];
