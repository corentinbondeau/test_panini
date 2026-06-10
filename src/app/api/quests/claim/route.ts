import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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

    // --- Fallback quests (not persisted in UserQuest) ---
    if (questId.startsWith('fallback_')) {
      // Atomically increment tokens for fallback quests
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

    // --- Persisted quest claim (UserQuest) ---
    // Atomic check-and-set: only update if completed AND not already claimed
    // This prevents double-claim even under concurrent requests
    const { count } = await prisma.userQuest.updateMany({
      where: {
        userId: decoded.userId,
        questId,
        completed: true,
        rewardClaimed: false,
      },
      data: { rewardClaimed: true },
    });

    if (count === 0) {
      // Either no matching row, not completed, or already claimed
      const existing = await prisma.userQuest.findUnique({
        where: { userId_questId: { userId: decoded.userId, questId } },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Quête introuvable' }, { status: 404 });
      }
      if (!existing.completed) {
        return NextResponse.json({ error: 'Quête non terminée' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Récompense déjà réclamée' }, { status: 400 });
    }

    // Award 5 tokens
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
