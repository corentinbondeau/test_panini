import { prisma } from '@/lib/prisma';
import { QUEST_DEFINITIONS, QuestDefinition } from '@/data/quests';
import { getCardsByCollection } from '@/data/clubCards';
import { DEFAULT_COLLECTION_ID } from '@/data/cards';

export type QuestWithProgress = QuestDefinition & {
  progress: number;
  completed: boolean;
  rewardClaimed: boolean;
};

export async function getUserQuests(userId: string, collectionSlug?: string): Promise<QuestWithProgress[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      totalBoostersOpened: true,
      totalRecycles: true,
      badges: true,
    },
  });

  if (!user) return [];

  const userQuests = await prisma.userQuest.findMany({
    where: { userId },
  });

  const questMap = new Map(userQuests.map((q) => [q.questId, q]));

  const results: QuestWithProgress[] = [];

  for (const def of QUEST_DEFINITIONS) {
    const existing = questMap.get(def.id);
    const progress = existing?.progress ?? 0;
    const currentCount = await getCurrentCount(
      { totalBoostersOpened: user.totalBoostersOpened, totalRecycles: user.totalRecycles },
      def.type,
    );

    // Sync progress automatically
    const syncedProgress = Math.max(progress, currentCount);

    results.push({
      ...def,
      progress: syncedProgress,
      completed: existing?.completed ?? syncedProgress >= def.target,
      rewardClaimed: existing?.rewardClaimed ?? false,
    });
  }

  return results;
}

async function getCurrentCount(
  user: { totalBoostersOpened: number; totalRecycles: number },
  type: string,
): Promise<number> {
  switch (type) {
    case 'booster_count':
      return user.totalBoostersOpened;
    case 'recycle_count':
      return user.totalRecycles;
    default:
      return 0;
  }
}

export async function claimQuestReward(
  userId: string,
  questId: string,
  collectionSlug?: string,
): Promise<{ success: boolean; rewardBoosters: number }> {
  const quest = QUEST_DEFINITIONS.find((q) => q.id === questId);
  if (!quest) throw new Error('Quête introuvable');

  const userQuest = await prisma.userQuest.findUnique({
    where: { userId_questId: { userId, questId } },
  });

  if (!userQuest || !userQuest.completed || userQuest.rewardClaimed) {
    throw new Error('Quête non terminée ou déjà réclamée');
  }

  await prisma.userQuest.update({
    where: { id: userQuest.id },
    data: { rewardClaimed: true },
  });

  // Give reward boosters: remove 1 from daily quota (they got a free pack)
  // For now, we just return the reward info and let the frontend integrate it

  return { success: true, rewardBoosters: quest.rewardBoosters };
}

export async function updateQuestProgress(
  userId: string,
  type: string,
  increment: number,
): Promise<void> {
  const matchingDefs = QUEST_DEFINITIONS.filter((d) => d.type === type);
  if (matchingDefs.length === 0) return;

  for (const def of matchingDefs) {
    const existing = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId: def.id } },
    });

    if (existing?.rewardClaimed) continue;

    const newProgress = (existing?.progress ?? 0) + increment;
    const completed = newProgress >= def.target;

    await prisma.userQuest.upsert({
      where: { userId_questId: { userId, questId: def.id } },
      create: {
        userId,
        questId: def.id,
        progress: newProgress,
        target: def.target,
        completed,
      },
      update: {
        progress: newProgress,
        completed: completed || existing?.completed,
      },
    });
  }
}
