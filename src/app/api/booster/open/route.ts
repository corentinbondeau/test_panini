import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { checkAndResetQuota, incrementBoosterCount, MAX_BOOSTERS_PER_DAY } from '@/lib/quota';
import { getCardsByCollection } from '@/data/clubCards';

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

    const pool = [...cards];
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

    for (let i = 0; i < 5; i++) {
      if (pool.length === 0) break;
      const randomIndex = Math.floor(Math.random() * pool.length);
      const card = pool[randomIndex];
      pool.splice(randomIndex, 1);

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

    await prisma.userCollection.update({
      where: { id: userCollection.id },
      data: { cards: currentCards },
    });

    const boostersOpenedToday = await incrementBoosterCount(decoded.userId);

    return NextResponse.json({
      cards: draws,
      boostersRemainingToday: MAX_BOOSTERS_PER_DAY - boostersOpenedToday,
      quantities: currentCards,
      quota: {
        boostersOpenedToday,
        maxBoostersPerDay: MAX_BOOSTERS_PER_DAY,
      },
    });
  } catch (error) {
    console.error('Open booster error:', error);
    return NextResponse.json(
      { error: "Erreur lors de l'ouverture du booster" },
      { status: 500 }
    );
  }
}
