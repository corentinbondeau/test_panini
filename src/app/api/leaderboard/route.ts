import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { S25_26_CARDS, ALL_CLUB_CARDS } from '@/data/clubCards';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true,
        tokens: true,
        totalCardsObtained: true,
        showcase: true,
      },
    });

    const collections = await prisma.userCollection.findMany({
      select: {
        userId: true,
        cards: true,
      },
    });

    const uniqueCardTotal = S25_26_CARDS.length;
    const cardMap = new Map(ALL_CLUB_CARDS.map((c) => [c.id, c]));
    const userProgress = new Map<string, { unique: number; total: number; percent: number }>();

    for (const col of collections) {
      const quantities = (col.cards as Record<string, number>) || {};
      const unique = Object.values(quantities).filter((q) => q > 0).length;
      const percent = uniqueCardTotal > 0 ? Math.round((unique / uniqueCardTotal) * 10000) / 100 : 0;
      userProgress.set(col.userId, { unique, total: uniqueCardTotal, percent });
    }

    const leaderboard = users
      .filter((u) => userProgress.has(u.id))
      .map((u) => {
        const progress = userProgress.get(u.id)!;
        const showcaseIds = (u.showcase as string[]) || [];
        return {
          userId: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          avatar: u.avatar,
          tokens: u.tokens,
          totalCardsObtained: u.totalCardsObtained,
          showcase: showcaseIds.slice(0, 5).map((id) => {
            const card = cardMap.get(id);
            return card ? { id: card.id, firstName: card.firstName, lastName: card.lastName, photo: card.photo, rarity: card.rarity } : null;
          }).filter(Boolean),
          ...progress,
        };
      })
      .sort((a, b) => {
        if (b.percent !== a.percent) return b.percent - a.percent;
        return b.unique - a.unique;
      })
      .slice(0, 100);

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération du classement' }, { status: 500 });
  }
}
