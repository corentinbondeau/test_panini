export type QuestType = 'booster_count' | 'recycle_count' | 'unique_count' | 'legendary_count';

export type QuestDefinition = {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  target: number;
  rewardBoosters: number;
};

export const QUEST_DEFINITIONS: QuestDefinition[] = [
  {
    id: 'boosters_10',
    title: 'Débutant collectionneur',
    description: 'Ouvre 10 boosters',
    type: 'booster_count',
    target: 10,
    rewardBoosters: 1,
  },
  {
    id: 'boosters_50',
    title: 'Collectionneur acharné',
    description: 'Ouvre 50 boosters',
    type: 'booster_count',
    target: 50,
    rewardBoosters: 3,
  },
  {
    id: 'boosters_100',
    title: 'Maître des boosters',
    description: 'Ouvre 100 boosters',
    type: 'booster_count',
    target: 100,
    rewardBoosters: 5,
  },
  {
    id: 'recycle_5',
    title: 'Recycleur débutant',
    description: 'Recycle 5 cartes',
    type: 'recycle_count',
    target: 5,
    rewardBoosters: 1,
  },
  {
    id: 'recycle_25',
    title: 'Recycleur confirmé',
    description: 'Recycle 25 cartes',
    type: 'recycle_count',
    target: 25,
    rewardBoosters: 3,
  },
  {
    id: 'recycle_100',
    title: 'Grand Recycleur',
    description: 'Recycle 100 cartes',
    type: 'recycle_count',
    target: 100,
    rewardBoosters: 5,
  },
  {
    id: 'unique_50',
    title: 'Petite collection',
    description: 'Collectionne 50 cartes uniques',
    type: 'unique_count',
    target: 50,
    rewardBoosters: 2,
  },
  {
    id: 'unique_200',
    title: 'Grande collection',
    description: 'Collectionne 200 cartes uniques',
    type: 'unique_count',
    target: 200,
    rewardBoosters: 5,
  },
  {
    id: 'unique_500',
    title: 'Collectionneur légendaire',
    description: 'Collectionne 500 cartes uniques',
    type: 'unique_count',
    target: 500,
    rewardBoosters: 10,
  },
  {
    id: 'legendary_5',
    title: 'Chasseur de mythes',
    description: 'Obtiens 5 cartes légendaires',
    type: 'legendary_count',
    target: 5,
    rewardBoosters: 3,
  },
];
