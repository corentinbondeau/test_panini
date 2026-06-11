import { ObjectId } from 'bson';
import { prisma } from '@/lib/prisma';
import { QUEST_DEFINITIONS, QuestDefinition } from '@/data/quests';

interface MongoUpdateResult {
  n: number;
  nModified: number;
  ok: number;
}

type DailyQuestEntry = {
  questId: string;
  description: string;
  type: string;
  target: number;
  progress: number;
  completed: boolean;
  rewardClaimed: boolean;
};

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

  if (!result || result.n === 0) {
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

/**
 * Met à jour la progression des quêtes embarquées (dailyQuests) dans le User
 * en incrémentant le champ `progress` des entrées dont le type correspond
 * et qui ne sont ni complétées ni réclamées.
 */
async function updateEmbeddedDailyQuests(
  userId: string,
  type: string,
  increment: number,
): Promise<void> {
  const userObjectId = new ObjectId(userId);

  const userDoc = await prisma.user.findUnique({
    where: { id: userId },
    select: { dailyQuests: true },
  });

  const dailyQuests: DailyQuestEntry[] = (userDoc?.dailyQuests as DailyQuestEntry[]) ?? [];
  let changed = false;

  for (let i = 0; i < dailyQuests.length; i++) {
    const dq = dailyQuests[i];
    if (dq.type === type && !dq.completed && !dq.rewardClaimed) {
      dq.progress += increment;
      if (dq.progress >= dq.target) {
        dq.completed = true;
      }
      changed = true;
    }
  }

  if (changed) {
    await prisma.$runCommandRaw({
      update: 'User',
      updates: [
        {
          q: { _id: userObjectId },
          u: { $set: { dailyQuests } },
        },
      ],
    });
  }
}

export async function updateQuestProgress(
  userId: string,
  type: string,
  increment: number,
): Promise<void> {
  console.log(`[updateQuestProgress] userId=${userId} type=${type} inc=${increment}`);

  // 1. Permanent QUEST_DEFINITIONS (UserQuest collection)
  const matchingDefs = QUEST_DEFINITIONS.filter((d) => d.type === type);
  for (const def of matchingDefs) {
    await updateSingleQuest(userId, def.id, def.target, increment);
  }

  // 2. Quêtes quotidiennes embarquées (User.dailyQuests)
  await updateEmbeddedDailyQuests(userId, type, increment);

  console.log(`[updateQuestProgress] done`);
}
