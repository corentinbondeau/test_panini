import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'bson';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type DailyQuestEntry = {
  questId: string;
  description: string;
  type: string;
  target: number;
  progress: number;
  completed: boolean;
  rewardClaimed: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization') || '');
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const body = await request.json();
    const { questId } = body;

    if (!questId) {
      return NextResponse.json({ error: 'questId requis' }, { status: 400 });
    }

    // --- Fallback quests (not persisted) ---
    if (questId.startsWith('fallback_')) {
      await prisma.user.update({
        where: { id: decoded.userId },
        data: { tokens: { increment: 5 } },
      });

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { tokens: true },
      });

      return NextResponse.json({
        success: true,
        rewardTokens: 5,
        tokens: user?.tokens ?? 0,
      });
    }

    // --- Claim embarrassée (dailyQuests) ---
    // 1. Récupère le document User
    const userDoc = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { dailyQuests: true },
    });

    const dailyQuests: DailyQuestEntry[] = (userDoc?.dailyQuests as DailyQuestEntry[]) ?? [];

    const idx = dailyQuests.findIndex((dq) => dq.questId === questId);

    if (idx === -1) {
      // 2. Ce n'est pas une quête embarquée — essayer UserQuest (permanentes)
      return await claimPersistedQuest(decoded.userId, questId);
    }

    const q = dailyQuests[idx];
    if (!q.completed) {
      return NextResponse.json({ error: 'Quête non terminée' }, { status: 400 });
    }
    if (q.rewardClaimed) {
      return NextResponse.json({ error: 'Récompense déjà réclamée' }, { status: 400 });
    }

    // 3. Mettre à jour le tableau embarqué via $set
    dailyQuests[idx] = { ...q, rewardClaimed: true };
    const userObjectId = new ObjectId(decoded.userId);

    await prisma.$runCommandRaw({
      update: 'User',
      updates: [
        {
          q: { _id: userObjectId },
          u: { $set: { dailyQuests } },
        },
      ],
    });

    // 4. Créditer les tokens
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { tokens: { increment: 5 } },
    });

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { tokens: true },
    });

    return NextResponse.json({
      success: true,
      rewardTokens: 5,
      tokens: user?.tokens ?? 0,
    });
  } catch (error) {
    console.error('Claim quest error:', error);
    return NextResponse.json({ error: 'Erreur lors de la réclamation' }, { status: 500 });
  }
}

async function claimPersistedQuest(userId: string, questId: string) {
  const { count } = await prisma.userQuest.updateMany({
    where: {
      userId,
      questId,
      completed: true,
      rewardClaimed: false,
    },
    data: { rewardClaimed: true },
  });

  if (count === 0) {
    const existing = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Quête introuvable' }, { status: 404 });
    }
    if (!existing.completed) {
      return NextResponse.json({ error: 'Quête non terminée' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Récompense déjà réclamée' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { tokens: { increment: 5 } },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokens: true },
  });

  return NextResponse.json({
    success: true,
    rewardTokens: 5,
    tokens: user?.tokens ?? 0,
  });
}
