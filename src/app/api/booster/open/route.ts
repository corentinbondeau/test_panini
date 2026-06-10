import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { checkAndResetQuota, incrementBoosterCount, MAX_BOOSTERS_PER_DAY } from '@/lib/quota';
import { getCardsByCollection } from '@/data/clubCards';
import { checkAndUpdateStreak } from '@/lib/streak';
import { getActiveEvent } from '@/lib/events';
import { trackUserActivity } from '@/lib/tracking';

export const dynamic = 'force-dynamic';

const BASE_WEIGHTS = {
  COMMUNE: 75,
  RARE: 20,
  LEGENDAIRE: 5,
};

function pickRarity(bonusChance: number = 0): string {
  const weights = {
    COMMUNE: BASE_WEIGHTS.COMMUNE,
    RARE: BASE_WEIGHTS.RARE * (1 + bonusChance),
    LEGENDAIRE: BASE_WEIGHTS.LEGENDAIRE * (1 + bonusChance),
  };
  const totalWeight = weights.COMMUNE + weights.RARE + weights.LEGENDAIRE;
  let roll = Math.random() * totalWeight;
  for (const [rarity, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return 'COMMUNE';
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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
    const collectionSlug: string = body.collectionId || 's25-26';

    const quota = await checkAndResetQuota(decoded.userId);
    if (quota.boostersOpenedToday >= MAX_BOOSTERS_PER_DAY) {
      return NextResponse.json(
        {
          error: 'Limite quotidienne de boosters atteinte (25/jour)',
          quota: {
            boostersOpenedToday: quota.boostersOpenedToday,
            maxBoostersPerDay: MAX_BOOSTERS_PER_DAY,
          },
        },
        { status: 429 }
      );
    }

    const collection = await prisma.collection.findUnique({ where: { slug: collectionSlug } });
    if (!collection) {
      return NextResponse.json({ error: 'Collection introuvable' }, { status: 404 });
    }

    const cards = getCardsByCollection(collectionSlug);
    if (cards.length === 0) {
      return NextResponse.json({ error: 'Cette collection ne contient pas encore de cartes' }, { status: 400 });
    }

    // Check for active Happy Hour event
    const activeEvent = await getActiveEvent('happy_hour');
    let bonusChance = activeEvent?.modification?.boosterBonusChance ?? 0;

    // Check for reserved charm on user and consume it for this draw
    const userRecord = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (userRecord?.charmReserved && (userRecord.charms ?? 0) > 0) {
      // apply +5% bonus to RARE and LEGENDAIRE
      bonusChance += 0.05;
      // consume one charm and clear reservation
      await prisma.user.update({ where: { id: decoded.userId }, data: { charms: { decrement: 1 }, charmReserved: false } });
    }

    const cardsByRarity: Record<string, typeof cards> = {};
    for (const card of cards) {
      if (!cardsByRarity[card.rarity]) cardsByRarity[card.rarity] = [];
      cardsByRarity[card.rarity].push(card);
    }

    const draws: Array<{
      cardId: string;
      card: {
        id: string;
        firstName: string;
        lastName: string;
        role: string;
        category: string;
        number: number;
        team: string;
        photo: string;
        rarity: string;
        collectionId: string;
        imageUrl: string | null;
      };
      wasDuplicate: boolean;
      quantityAfter: number;
    }> = [];

    let userCollection = await prisma.userCollection.findUnique({
      where: { userId_collectionId: { userId: decoded.userId, collectionId: collection.id } },
    });

    if (!userCollection) {
      userCollection = await prisma.userCollection.create({
        data: {
          userId: decoded.userId,
          collectionId: collection.id,
          cards: {},
        },
      });
    }

    const currentCards = (userCollection.cards as Record<string, number>) || {};
    const currentCardDates = (userCollection.cardDates as Record<string, string>) || {};

    const usedPlayerKeys = new Set<string>();

    for (let i = 0; i < 5; i++) {
      let card: (typeof cards)[number] | null = null;
      let attempts = 0;

      while (!card && attempts < 30) {
        const targetRarity = pickRarity(bonusChance);
        const rarityPool = cardsByRarity[targetRarity] ?? cards;
        const available = rarityPool.filter(
          (c) => !usedPlayerKeys.has(`${c.firstName}|${c.lastName}`)
        );
        if (available.length > 0) {
          const shuffled = shuffleArray(available);
          card = shuffled[0];
        }
        attempts++;
      }

      if (!card) continue;

      const playerKey = `${card.firstName}|${card.lastName}`;
      usedPlayerKeys.add(playerKey);

      const previous = currentCards[card.id] ?? 0;
      const next = previous + 1;
      currentCards[card.id] = next;
      if (previous === 0) {
        currentCardDates[card.id] = new Date().toISOString();
      }

      draws.push({
        cardId: card.id,
        card: {
          id: card.id,
          firstName: card.firstName,
          lastName: card.lastName,
          role: card.role,
          category: card.category,
          number: card.number,
          team: card.team,
          photo: card.photo,
          rarity: card.rarity,
          collectionId: card.collectionId,
          imageUrl: card.imageUrl ?? null,
        },
        wasDuplicate: previous >= 1,
        quantityAfter: next,
      });
    }

    await prisma.userCollection.update({
      where: { id: userCollection.id },
      data: { cards: currentCards, cardDates: currentCardDates },
    });

    // Log booster opening
    const rarityCounts: Record<string, number> = {};
    for (const d of draws) {
      rarityCounts[d.card.rarity] = (rarityCounts[d.card.rarity] ?? 0) + 1;
    }
    await prisma.boosterLog.create({
      data: {
        userId: decoded.userId,
        collectionId: collection.id,
        cardIds: draws.map(d => d.cardId),
        rarityCounts,
      },
    });

    const boostersOpenedToday = await incrementBoosterCount(decoded.userId);

    // Update lifetime stats
    const legendaryCount = draws.filter((d) => d.card.rarity === 'LEGENDAIRE').length;
    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        totalCardsObtained: { increment: draws.length },
        totalLegendaries: { increment: legendaryCount },
      },
    });

    // Centralised tracking: increment totalBoostersOpened, check badges, update quests
    const newBadges = await trackUserActivity(decoded.userId, 'OPEN_BOOSTER', 1);

    // Fetch refreshed quest progress for the frontend
    const refreshedQuests = await prisma.userQuest.findMany({
      where: { userId: decoded.userId },
    });

    // Add weekly XP to clan
    const clanMember = await prisma.clanMember.findFirst({ where: { userId: decoded.userId } });
    if (clanMember) {
      await prisma.clan.update({
        where: { id: clanMember.clanId },
        data: { weeklyXP: { increment: 5 } },
      });
    }

    return NextResponse.json({
      cards: draws,
      boostersRemainingToday: MAX_BOOSTERS_PER_DAY - boostersOpenedToday,
      quantities: currentCards,
      quota: {
        boostersOpenedToday,
        maxBoostersPerDay: MAX_BOOSTERS_PER_DAY,
      },
      newBadges,
      quests: refreshedQuests.map(q => ({
        id: q.questId,
        progress: q.progress,
        target: q.target,
        completed: q.completed,
        rewardClaimed: q.rewardClaimed,
      })),
    });
  } catch (error) {
    console.error('Open booster error:', error);
    return NextResponse.json(
      { error: "Erreur lors de l'ouverture du booster" },
      { status: 500 }
    );
  }
}
