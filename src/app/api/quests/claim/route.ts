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

    const userQuest = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId: decoded.userId, questId } },
    });

    if (!userQuest) {
      return NextResponse.json({ error: 'Quête introuvable' }, { status: 404 });
    }

    if (!userQuest.completed) {
      return NextResponse.json({ error: 'Quête non terminée' }, { status: 400 });
    }

    if (userQuest.rewardClaimed) {
      return NextResponse.json({ error: 'Récompense déjà réclamée' }, { status: 400 });
    }

    // Mark quest as claimed
    await prisma.userQuest.update({
      where: { id: userQuest.id },
      data: { rewardClaimed: true },
    });

    // Award 5 tokens
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { tokens: { increment: 5 } },
    });

    return NextResponse.json({
      success: true,
      rewardTokens: 5,
    });
  } catch (error) {
    console.error('Claim quest error:', error);
    return NextResponse.json({ error: 'Erreur lors de la réclamation' }, { status: 500 });
  }
}
