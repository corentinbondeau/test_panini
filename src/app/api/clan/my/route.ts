import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { getChestReward } from '@/lib/clan';

export const dynamic = 'force-dynamic';

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

    const membership = await prisma.clanMember.findFirst({
      where: { userId: decoded.userId },
      include: {
        clan: {
          include: {
            _count: { select: { members: true } },
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ clan: null });
    }

    const { clan, ...memberData } = membership;
    const chestReward = getChestReward(clan.weeklyXP);

    return NextResponse.json({
      clan: {
        ...clan,
        memberCount: clan._count.members,
        _count: undefined,
      },
      membership: memberData,
      chestReward,
    });
  } catch (error) {
    console.error('My clan error:', error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
