import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { checkAndResetQuota, MAX_BOOSTERS_PER_DAY } from '@/lib/quota';
import { getCardsByCollection } from '@/data/clubCards';

export const dynamic = 'force-dynamic';

const PACK_COUNT = 10;
const CARDS_PER_PACK = 5;

const RARITY_WEIGHTS = [
  { rarity: 'COMMUNE', weight: 75 },
  { rarity: 'RARE', weight: 20 },
  { rarity: 'LEGENDAIRE', weight: 5 },
];

function pickRarity(): string {
  const totalWeight = RARITY_WEIGHTS.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const { rarity, weight } of RARITY_WEIGHTS) {
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
    if (quota.boostersOpenedToday + PACK_COUNT > MAX_BOOSTERS_PER_DAY) {
      const remaining = MAX_BOOSTERS_PER_DAY - quota.boostersOpenedToday;
      return NextResponse.json(
        {
          error: `Limite quotidienne. Il vous reste ${remaining} booster${remaining > 1 ? 's' : ''} sur 25.`,
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

    const cardsByRarity: Record<string, typeof cards> = {};
    for (const card of cards) {
      if (!cardsByRarity[card.rarity]) cardsByRarity[card.rarity] = [];
      cardsByRarity[card.rarity].push(card);
    }

    // Get or create user collection
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

    // Generate all 50 cards across 10 packs (5 per pack), ensuring no duplicate players per pack
    for (let pack = 0; pack < PACK_COUNT; pack++) {
      const usedPlayerKeys = new Set<string>();

      for (let i = 0; i < CARDS_PER_PACK; i++) {
        let card: (typeof cards)[number] | null = null;
        let attempts = 0;

        while (!card && attempts < 30) {
          const targetRarity = pickRarity();
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
    }

    // Single update operation for all 50 cards
    await prisma.userCollection.update({
      where: { id: userCollection.id },
      data: { cards: currentCards },
    });

    // Single log entry for the mass opening
    const rarityCounts: Record<string, number> = {};
    for (const d of draws) {
      rarityCounts[d.card.rarity] = (rarityCounts[d.card.rarity] ?? 0) + 1;
    }

    await prisma.boosterLog.create({
      data: {
        userId: decoded.userId,
        collectionId: collection.id,
        cardIds: draws.map((d) => d.cardId),
        rarityCounts,
      },
    });

    // Update counter (increment by PACK_COUNT at once)
    const current = await checkAndResetQuota(decoded.userId);
    const newCount = current.boostersOpenedToday + PACK_COUNT;
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { boostersOpenedToday: newCount },
    });

    return NextResponse.json({
      cards: draws,
      boostersRemainingToday: MAX_BOOSTERS_PER_DAY - newCount,
      quantities: currentCards,
      quota: {
        boostersOpenedToday: newCount,
        maxBoostersPerDay: MAX_BOOSTERS_PER_DAY,
      },
      packCount: PACK_COUNT,
    });
  } catch (error) {
    console.error('Open ten boosters error:', error);
    return NextResponse.json(
      { error: "Erreur lors de l'ouverture des 10 boosters" },
      { status: 500 }
    );
  }
}
