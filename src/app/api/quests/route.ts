import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { FALLBACK_QUESTS } from '@/data/fallbackQuests';
import { QUEST_DEFINITIONS } from '@/data/quests';

export const dynamic = 'force-dynamic';

const STAT_SYNC: Record<string, keyof NonNullable<Awaited<ReturnType<typeof getSyncStats>>>> = {
  booster_count: 'totalBoostersOpened',
  recycle_count: 'totalRecycles',
  unique_count: 'totalCardsObtained',
  trade_count: 'totalTrades',
};

async function getSyncStats(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      totalBoostersOpened: true,
      totalRecycles: true,
      totalCardsObtained: true,
      totalTrades: true,
    },
  });
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

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization') || '');
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const userId = decoded.userId;
    const user = await getSyncStats(userId);

    // 1. Daily quests from embedded dailyQuests (User.dailyQuests)
    const userDoc = await prisma.user.findUnique({
      where: { id: userId },
      select: { dailyQuests: true },
    });

    const dailyQuests: DailyQuestEntry[] = (userDoc?.dailyQuests as DailyQuestEntry[]) ?? [];

    const daily = dailyQuests.map((dq) => ({
      id: dq.questId,
      description: dq.description,
      type: dq.type,
      target: dq.target,
      rewardTokens: 5,
      rewardBoosters: 0,
      progress: dq.progress,
      completed: dq.completed,
      rewardClaimed: dq.rewardClaimed,
      isDaily: true,
    }));

    // 2. Permanent QUEST_DEFINITIONS from UserQuest
    const userQuests = await prisma.userQuest.findMany({
      where: { userId },
    });

    const defIds = QUEST_DEFINITIONS.map((d) => d.id);
    const defMap = new Map(
      userQuests.filter((uq) => defIds.includes(uq.questId)).map((q) => [q.questId, q])
    );

    const permanent = QUEST_DEFINITIONS.map((def) => {
      const uq = defMap.get(def.id);
      const statKey = STAT_SYNC[def.type];
      let baseProgress = uq?.progress ?? 0;
      if (statKey && user) {
        baseProgress = Math.max(baseProgress, user[statKey]);
      }
      return {
        id: def.id,
        description: def.description,
        type: def.type,
        target: def.target,
        rewardTokens: 0,
        rewardBoosters: def.rewardBoosters,
        progress: baseProgress,
        completed: baseProgress >= def.target,
        rewardClaimed: uq?.rewardClaimed ?? false,
        isDaily: false,
      };
    });

    // 3. Fallback si aucune quête quotidienne embarquée
    const allQuests = [...daily, ...permanent];
    if (allQuests.length === 0) {
      const fallback = FALLBACK_QUESTS.map((q) => ({
        ...q,
        progress: Math.min(
          user?.[STAT_SYNC[q.type as keyof typeof STAT_SYNC] as keyof typeof user] ?? 0,
          q.target,
        ),
        completed:
          (user?.[STAT_SYNC[q.type as keyof typeof STAT_SYNC] as keyof typeof user] ?? 0) >= q.target,
      }));
      return NextResponse.json({ quests: fallback });
    }

    return NextResponse.json({ quests: allQuests });
  } catch (error) {
    console.error('Quests error:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des quêtes' }, { status: 500 });
  }
}
