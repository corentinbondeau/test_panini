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

    const userQuests = await prisma.userQuest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`[quests API] userId=${userId} records=${userQuests.length}`);
    userQuests.forEach(uq =>
      console.log(`  - ${uq.questId} ${uq.progress}/${uq.target} done=${uq.completed} claimed=${uq.rewardClaimed}`)
    );

    // --- 1. Daily cron quests (ids with _YYYYMMDD suffix) ---
    const dailyRecords = userQuests.filter(
      (uq) => uq.questId.includes('_') && uq.questId.split('_').pop()?.length === 8
    );

    const poolKeys = [...new Set(dailyRecords.map((q) => q.questId.split('_').slice(0, -1).join('_')).filter(Boolean))];
    const pools = poolKeys.length > 0
      ? await prisma.questPool.findMany({ where: { key: { in: poolKeys } } })
      : [];
    const poolMap = new Map(pools.map((p) => [p.key, p]));

    const daily = dailyRecords.map((uq) => {
      const poolKey = uq.questId.split('_').slice(0, -1).join('_');
      const pool = poolMap.get(poolKey);
      return {
        id: uq.questId,
        description: pool?.description ?? 'Quete',
        type: pool?.type ?? 'UNKNOWN',
        target: uq.target,
        rewardTokens: 5,
        rewardBoosters: 0,
        progress: uq.progress,
        completed: uq.completed,
        rewardClaimed: uq.rewardClaimed,
        isDaily: true,
      };
    });

    // --- 2. Permanent QUEST_DEFINITIONS ---
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

    // --- 3. Other persisted quests (fallback etc.) ---
    const known = new Set([...defIds, ...daily.map((q) => q.id)]);
    const other = userQuests
      .filter((uq) => !known.has(uq.questId))
      .map((uq) => {
        const fb = FALLBACK_QUESTS.find((f) => f.id === uq.questId);
        return {
          id: uq.questId,
          description: fb?.description ?? 'Quete',
          type: fb?.type ?? uq.questId.split('_')[0] ?? 'UNKNOWN',
          target: uq.target,
          rewardTokens: 5,
          rewardBoosters: 0,
          progress: uq.progress,
          completed: uq.completed,
          rewardClaimed: uq.rewardClaimed,
          isDaily: true,
        };
      });

    // --- 4. Absolute fallback (no UserQuest records at all) ---
    const allQuests = [...daily, ...permanent, ...other];
    if (allQuests.length === 0) {
      const fallback = FALLBACK_QUESTS.map((q) => ({
        ...q,
        progress: Math.min(user?.[STAT_SYNC[q.type as keyof typeof STAT_SYNC] as keyof typeof user] ?? 0, q.target),
        completed: (user?.[STAT_SYNC[q.type as keyof typeof STAT_SYNC] as keyof typeof user] ?? 0) >= q.target,
      }));
      console.log(`[quests API] fallback (${fallback.length})`);
      return NextResponse.json({ quests: fallback });
    }

    console.log(`[quests API] returning ${allQuests.length} quests`);
    return NextResponse.json({ quests: allQuests });
  } catch (error) {
    console.error('Quests error:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des quêtes' }, { status: 500 });
  }
}
