import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

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

    const requester = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!requester || requester.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const totalUsers = await prisma.user.count();

    const userCollections = await prisma.userCollection.findMany({
      select: { cards: true },
    });
    let totalCardsInCirculation = 0;
    for (const uc of userCollections) {
      const cards = uc.cards as Record<string, number>;
      for (const qty of Object.values(cards)) {
        totalCardsInCirculation += qty;
      }
    }

    const totalBoostersOpened = await prisma.boosterLog.count();
    const totalTrades = await prisma.tradeLog.count();

    const userIds = await prisma.user.findMany({ select: { id: true, firstName: true, lastName: true, email: true } });
    const userMap = new Map(userIds.map(u => [u.id, u]));

    const allUCs = await prisma.userCollection.findMany({
      select: { userId: true, cards: true },
    });
    const userUniqueCounts: Record<string, { name: string; unique: number; total: number }> = {};
    for (const uc of allUCs) {
      const cards = uc.cards as Record<string, number>;
      let unique = 0;
      let total = 0;
      for (const qty of Object.values(cards)) {
        if (qty > 0) unique++;
        total += qty;
      }
      const u = userMap.get(uc.userId);
      if (u) {
        if (!userUniqueCounts[uc.userId]) {
          const displayName = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
          userUniqueCounts[uc.userId] = { name: displayName, unique: 0, total: 0 };
        }
        userUniqueCounts[uc.userId].unique += unique;
        userUniqueCounts[uc.userId].total += total;
      }
    }

    const top10 = Object.entries(userUniqueCounts)
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.unique - a.unique)
      .slice(0, 10);

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const weekStart = new Date(dayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [boostersDay, boostersWeek, boostersYear] = await Promise.all([
      prisma.boosterLog.count({ where: { createdAt: { gte: dayStart } } }),
      prisma.boosterLog.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.boosterLog.count({ where: { createdAt: { gte: yearStart } } }),
    ]);

    const [tradesDay, tradesWeek, tradesYear] = await Promise.all([
      prisma.tradeLog.count({ where: { createdAt: { gte: dayStart } } }),
      prisma.tradeLog.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.tradeLog.count({ where: { createdAt: { gte: yearStart } } }),
    ]);

    return NextResponse.json({
      kpis: {
        totalUsers,
        totalCardsInCirculation,
        totalBoostersOpened,
        totalTrades,
      },
      top10,
      activity: {
        day: { boosters: boostersDay, trades: tradesDay },
        week: { boosters: boostersWeek, trades: tradesWeek },
        year: { boosters: boostersYear, trades: tradesYear },
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Erreur lors du chargement des statistiques' }, { status: 500 });
  }
}
