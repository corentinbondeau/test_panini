import { prisma } from '@/lib/prisma';
import { QUEST_DEFINITIONS, QuestDefinition } from '@/data/quests';
import { FALLBACK_QUESTS } from '@/data/fallbackQuests';

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

  return { success: true, rewardBoosters: quest.rewardBoosters };
}

async function atomicUpdateOrCreate(
  userId: string,
  questId: string,
  target: number,
  increment: number,
): Promise<void> {
  const { count } = await prisma.userQuest.updateMany({
    where: {
      userId,
      questId,
      completed: false,
      rewardClaimed: false,
    },
    data: { progress: { increment } },
  });

  if (count === 0) {
    const existing = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
    });
    if (!existing) {
      await prisma.userQuest.create({
        data: {
          userId,
          questId,
          progress: increment,
          target,
          completed: false,
        },
      });
      console.log(`[quests] created ${questId} progress=${increment}`);
    } else {
      console.log(`[quests] ${questId} skipped (already completed/claimed)`);
    }
  } else {
    console.log(`[quests] ${questId} +${increment}`);
    await prisma.userQuest.updateMany({
      where: {
        userId,
        questId,
        progress: { gte: target },
        completed: false,
      },
      data: { completed: true },
    });
  }
}

export async function updateQuestProgress(
  userId: string,
  type: string,
  increment: number,
): Promise<void> {
  console.log(`[updateQuestProgress] userId=${userId} type=${type} increment=${increment}`);

  const matchingDefs = QUEST_DEFINITIONS.filter((d) => d.type === type);
  console.log(`[updateQuestProgress] defs:`, matchingDefs.map(d => d.id));

  for (const def of matchingDefs) {
    await atomicUpdateOrCreate(userId, def.id, def.target, increment);
  }

  const fallbackMatching = FALLBACK_QUESTS.filter((q) => q.type === type);
  console.log(`[updateQuestProgress] fallback:`, fallbackMatching.map(q => q.id));

  for (const fq of fallbackMatching) {
    await atomicUpdateOrCreate(userId, fq.id, fq.target, increment);
  }

  console.log(`[updateQuestProgress] done`);
}
