import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { getCardsByCollection } from '@/data/clubCards';
import { DEFAULT_COLLECTION_ID } from '@/data/cards';
import { updateQuestProgress } from '@/lib/quests';
import { checkAndUnlockBadges } from '@/lib/badges';
import { getActiveEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

const RECYCLE_RATIOS: Record<string, number> = {
  COMMUNE: 5,
  RARE: 10,
  LEGENDAIRE: 25,
};

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
    const { rarity, collectionId } = body;

    if (!rarity) {
      return NextResponse.json({ error: 'La rareté est requise' }, { status: 400 });
    }

    let ratio = RECYCLE_RATIOS[rarity];
    if (!ratio) {
      return NextResponse.json({ error: 'Rareté invalide' }, { status: 400 });
    }

    // Check for active Happy Hour event to reduce recycle cost
    const activeEvent = await getActiveEvent('happy_hour');
    if (activeEvent?.modification?.recycleCostReduction) {
      const reduction = Math.min(activeEvent.modification.recycleCostReduction, 0.5);
      ratio = Math.max(1, Math.round(ratio * (1 - reduction)));
    }

    const collectionSlug = collectionId || DEFAULT_COLLECTION_ID;
    const collection = await prisma.collection.findUnique({ where: { slug: collectionSlug } });
    if (!collection) {
      return NextResponse.json({ error: 'Collection introuvable' }, { status: 404 });
    }

    const cards = getCardsByCollection(collectionSlug);
    const cardsOfRarity = cards.filter((c) => c.rarity === rarity);
    if (cardsOfRarity.length === 0) {
      return NextResponse.json({ error: 'Aucune carte disponible pour cette rareté' }, { status: 400 });
    }

    const userCollection = await prisma.userCollection.findUnique({
      where: { userId_collectionId: { userId: decoded.userId, collectionId: collection.id } },
    });

    if (!userCollection) {
      return NextResponse.json({ error: 'Vous ne possédez aucune carte de cette collection' }, { status: 400 });
    }

    const currentCards = (userCollection.cards as Record<string, number>) || {};

    // Find cards of the target rarity that have duplicates (quantity > 1)
    const eligibleCards = Object.entries(currentCards)
      .filter(([cardId, qty]) => qty > 1 && cardsOfRarity.some((c) => c.id === cardId))
      .sort(([, a], [, b]) => b - a);

    const totalDuplicates = eligibleCards.reduce((sum, [, qty]) => sum + qty - 1, 0);

    if (totalDuplicates < ratio) {
      return NextResponse.json(
        {
          error: `Vous avez besoin d'au moins ${ratio} doublons de rareté ${rarity}. Vous en avez ${totalDuplicates}.`,
          needed: ratio,
          available: totalDuplicates,
        },
        { status: 400 }
      );
    }

    // Deduct duplicates: take from the cards with most extras first
    let toDeduct = ratio;
    for (const [cardId, qty] of eligibleCards) {
      if (toDeduct <= 0) break;
      const extras = qty - 1;
      const deductAmount = Math.min(extras, toDeduct);
      currentCards[cardId] = qty - deductAmount;
      toDeduct -= deductAmount;
      if (currentCards[cardId] <= 0) {
        delete currentCards[cardId];
      }
    }

    // Pick a random card of this rarity
    const randomCard = cardsOfRarity[Math.floor(Math.random() * cardsOfRarity.length)];

    // Add the new card to the user's collection
    const previous = currentCards[randomCard.id] ?? 0;
    currentCards[randomCard.id] = previous + 1;

    // Save in a single update
    const currentCardDates = (userCollection.cardDates as Record<string, string>) || {};
    if (!currentCardDates[randomCard.id]) {
      currentCardDates[randomCard.id] = new Date().toISOString();
    }
    await prisma.userCollection.update({
      where: { id: userCollection.id },
      data: { cards: currentCards, cardDates: currentCardDates },
    });

    // Track stats and quest progress (use original ratio for recycling count)
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { totalRecycles: { increment: RECYCLE_RATIOS[rarity] } },
    });
    await updateQuestProgress(decoded.userId, 'recycle_count', RECYCLE_RATIOS[rarity]);

    const newBadges = await checkAndUnlockBadges(decoded.userId);

    return NextResponse.json({
      card: {
        id: randomCard.id,
        firstName: randomCard.firstName,
        lastName: randomCard.lastName,
        role: randomCard.role,
        category: randomCard.category,
        number: randomCard.number,
        team: randomCard.team,
        photo: randomCard.photo,
        rarity: randomCard.rarity,
        collectionId: randomCard.collectionId,
        imageUrl: randomCard.imageUrl ?? null,
      },
      wasDuplicate: previous >= 1,
      quantityAfter: previous + 1,
      quantities: currentCards,
      newBadges,
    });
  } catch (error) {
    console.error('Recycle error:', error);
    return NextResponse.json({ error: 'Erreur lors du recyclage' }, { status: 500 });
  }
}
