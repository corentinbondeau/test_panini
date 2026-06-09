import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { claimQuestReward } from '@/lib/quests';
import { DEFAULT_COLLECTION_ID } from '@/data/cards';

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

    const result = await claimQuestReward(decoded.userId, questId);

    // Add weekly XP to clan for quest completion
    const clanMember = await prisma.clanMember.findFirst({ where: { userId: decoded.userId } });
    if (clanMember) {
      await prisma.clan.update({
        where: { id: clanMember.clanId },
        data: { weeklyXP: { increment: 10 } },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la réclamation';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
