import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { ALL_CLUB_CARDS } from '@/data/clubCards';

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

    const logs = await prisma.boosterLog.findMany({
      where: { userId: decoded.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const cardMap = new Map(ALL_CLUB_CARDS.map((c) => [c.id, c]));

    const data = logs.map((log) => {
      const cardIds = (log.cardIds as string[]) || [];
      const cards = cardIds.map((id) => cardMap.get(id)).filter(Boolean);
      return {
        id: log.id,
        createdAt: log.createdAt,
        rarityCounts: log.rarityCounts,
        cards: cards.map((c) => ({
          id: c!.id,
          firstName: c!.firstName,
          lastName: c!.lastName,
          photo: c!.photo,
          rarity: c!.rarity,
        })),
      };
    });

    return NextResponse.json({ logs: data });
  } catch (error) {
    console.error('Booster history error:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 });
  }
}
