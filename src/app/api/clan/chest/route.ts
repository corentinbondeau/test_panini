import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { getChestReward } from '@/lib/clan';

export const dynamic = 'force-dynamic';

/** Claim weekly chest reward */
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

    const membership = await prisma.clanMember.findFirst({
      where: { userId: decoded.userId },
      include: { clan: true },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Vous devez être dans un clan' }, { status: 400 });
    }

    const tokens = getChestReward(membership.clan.weeklyXP);

    if (tokens <= 0) {
      return NextResponse.json({ error: 'Pas assez de XP pour réclamer des récompenses' }, { status: 400 });
    }

    // Award tokens to user
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { tokens: { increment: tokens } },
    });

    return NextResponse.json({
      success: true,
      tokensAwarded: tokens,
      weeklyXP: membership.clan.weeklyXP,
    });
  } catch (error) {
    console.error('Chest claim error:', error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
