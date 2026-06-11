import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { BADGE_DEFINITIONS, UserStats } from '@/data/badges';

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

    // Fetch live stats from the User document
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        totalBoostersOpened: true,
        totalRecycles: true,
        totalLegendaries: true,
        totalCardsObtained: true,
        totalTrades: true,
        totalFusionsDone: true,
        totalMarketPurchases: true,
        currentStreak: true,
        badges: true,
      },
    });

    if (!user) {
      return NextResponse.json({ badges: [] });
    }

    const stats: UserStats = {
      totalBoostersOpened: user.totalBoostersOpened,
      totalRecycles: user.totalRecycles,
      totalLegendaries: user.totalLegendaries,
      totalCardsObtained: user.totalCardsObtained,
      totalTrades: user.totalTrades,
      totalFusionsDone: user.totalFusionsDone,
      totalMarketPurchases: user.totalMarketPurchases,
      currentStreak: user.currentStreak,
    };

    const persisted = new Set<string>((user.badges as string[]) ?? []);

    // Compute badge state dynamically: unlocked if persisted OR condition met
    const allBadges = BADGE_DEFINITIONS.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      icon: b.icon,
      unlocked: persisted.has(b.id) || b.condition(stats),
    }));

    return NextResponse.json({ badges: allBadges, stats });
  } catch (error) {
    console.error('Badges error:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des badges' }, { status: 500 });
  }
}
