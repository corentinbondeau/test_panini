import { ObjectId } from 'bson';
import { prisma } from '@/lib/prisma';
import { QUEST_DEFINITIONS, QuestDefinition } from '@/data/quests';
import { FALLBACK_QUESTS } from '@/data/fallbackQuests';

interface MongoUpdateResult {
  n: number;
  nModified: number;
  ok: number;
}

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
      totalTrades: true,
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
      { totalBoostersOpened: user.totalBoostersOpened, totalRecycles: user.totalRecycles, totalTrades: user.totalTrades },
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
  user: { totalBoostersOpened: number; totalRecycles: number; totalTrades: number },
  type: string,
): Promise<number> {
  switch (type) {
    case 'booster_count':
      return user.totalBoostersOpened;
    case 'recycle_count':
      return user.totalRecycles;
    case 'trade_count':
      return user.totalTrades;
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

async function updateSingleQuest(
  userId: string,
  questId: string,
  target: number,
  increment: number,
): Promise<void> {
  const userObjectId = new ObjectId(userId);

  // Atomic $inc via raw MongoDB command — bypasses Prisma's ObjectId conversion
  // to avoid the string-vs-ObjectId mismatch that causes silent 0-matches
  const result: MongoUpdateResult = (await prisma.$runCommandRaw({
    update: 'UserQuest',
    updates: [
      {
        q: {
          userId: userObjectId,
          questId,
          completed: false,
          rewardClaimed: false,
        },
        u: { $inc: { progress: increment } },
      },
    ],
  })) as unknown as MongoUpdateResult;

  // result.n = number of documents matched by the query
  if (!result || result.n === 0) {
    // No non-completed quest found — check if a record exists at all
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
      console.log(`[quests] created ${questId} +${increment}`);
    } else {
      console.log(`[quests] ${questId} skipped (already completed/claimed)`);
    }
  } else {
    // Increment succeeded — check if now completed
    const updated = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
    });
    if (updated && updated.progress >= target && !updated.completed) {
      await prisma.userQuest.update({
        where: { id: updated.id },
        data: { completed: true },
      });
      console.log(`[quests] ${questId} COMPLETED`);
    } else {
      console.log(`[quests] ${questId} +${increment} (${updated?.progress}/${target})`);
    }
  }
}

export async function updateQuestProgress(
  userId: string,
  type: string,
  increment: number,
): Promise<void> {
  console.log(`[updateQuestProgress] userId=${userId} type=${type} inc=${increment}`);

  // 1. Permanent QUEST_DEFINITIONS
  const matchingDefs = QUEST_DEFINITIONS.filter((d) => d.type === type);
  for (const def of matchingDefs) {
    await updateSingleQuest(userId, def.id, def.target, increment);
  }

  // 2. Daily / fallback quests
  const matchingFallback = FALLBACK_QUESTS.filter((q) => q.type === type);
  for (const fq of matchingFallback) {
    await updateSingleQuest(userId, fq.id, fq.target, increment);
  }

  console.log(`[updateQuestProgress] done`);
}
