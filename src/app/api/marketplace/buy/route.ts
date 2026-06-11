import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'bson';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { trackUserActivity } from '@/lib/tracking';

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
    const { listingId } = body;

    if (!listingId) {
      return NextResponse.json({ error: 'listingId requis' }, { status: 400 });
    }

    const buyerObjectId = new ObjectId(decoded.userId);
    const listingObjectId = new ObjectId(listingId);

    // 1. Fetch listing and verify it's active
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
    });

    if (!listing || listing.status !== 'active') {
      return NextResponse.json({ error: 'Annonce introuvable ou déjà vendue' }, { status: 400 });
    }

    if (listing.sellerId === decoded.userId) {
      return NextResponse.json({ error: 'Vous ne pouvez pas acheter votre propre annonce' }, { status: 400 });
    }

    // 2. Vérification stricte du solde (lecture directe MongoDB)
    const buyerDoc = await prisma.$runCommandRaw({
      find: 'User',
      filter: { _id: buyerObjectId },
      projection: { tokens: 1 },
      limit: 1,
    }) as unknown as { cursor: { firstBatch: Array<{ tokens: number }> } };

    const buyerTokens = (buyerDoc as any)?.cursor?.firstBatch?.[0]?.tokens ?? 0;

    if (buyerTokens < listing.price) {
      return NextResponse.json({ error: 'Fonds insuffisants' }, { status: 400 });
    }

    // 3. Opération atomique : débiter l'acheteur ($inc: -price)
    const sellerObjectId = new ObjectId(listing.sellerId);

    const debitResult = await prisma.$runCommandRaw({
      update: 'User',
      updates: [
        {
          q: {
            _id: buyerObjectId,
            tokens: { $gte: listing.price },
          },
          u: { $inc: { tokens: -listing.price } },
        },
      ],
    }) as unknown as { n: number; nModified: number };

    if (!debitResult || (debitResult as any).nModified === 0) {
      return NextResponse.json({ error: 'Fonds insuffisants lors du débit' }, { status: 400 });
    }

    // 4. Créditer le vendeur
    await prisma.$runCommandRaw({
      update: 'User',
      updates: [
        {
          q: { _id: sellerObjectId },
          u: { $inc: { tokens: listing.price } },
        },
      ],
    });

    // 5. Transférer la carte : retirer du vendeur
    const sellerCollections = await prisma.userCollection.findMany({
      where: { userId: listing.sellerId },
    });

    let cardTransferred = false;
    for (const col of sellerCollections) {
      const cards = (col.cards as Record<string, number>) || {};
      if (cards[listing.cardId] && cards[listing.cardId] > 0) {
        cards[listing.cardId] -= 1;
        if (cards[listing.cardId] <= 0) delete cards[listing.cardId];
        await prisma.userCollection.update({
          where: { id: col.id },
          data: { cards },
        });
        cardTransferred = true;
        break;
      }
    }

    if (!cardTransferred) {
      // Rollback tokens to buyer
      await prisma.$runCommandRaw({
        update: 'User',
        updates: [
          {
            q: { _id: buyerObjectId },
            u: { $inc: { tokens: listing.price } },
          },
        ],
      });
      return NextResponse.json({ error: 'La carte n\'est plus disponible' }, { status: 400 });
    }

    // 6. Ajouter la carte à la collection de l'acheteur
    const listingCollection = await prisma.collection.findFirst({
      where: { userCollections: { some: { userId: listing.sellerId } } },
    });

    if (listingCollection) {
      const buyerCollection = await prisma.userCollection.findUnique({
        where: {
          userId_collectionId: {
            userId: decoded.userId,
            collectionId: listingCollection.id,
          },
        },
      });

      if (buyerCollection) {
        const buyerCards = (buyerCollection.cards as Record<string, number>) || {};
        buyerCards[listing.cardId] = (buyerCards[listing.cardId] ?? 0) + 1;
        await prisma.userCollection.update({
          where: { id: buyerCollection.id },
          data: { cards: buyerCards },
        });
      }
    }

    // 7. Marquer l'annonce comme vendue
    await prisma.marketplaceListing.update({
      where: { id: listingId },
      data: { status: 'sold' },
    });

    // 8. Lire le nouveau solde de l'acheteur
    const updatedBuyer = await prisma.$runCommandRaw({
      find: 'User',
      filter: { _id: buyerObjectId },
      projection: { tokens: 1 },
      limit: 1,
    }) as unknown as { cursor: { firstBatch: Array<{ tokens: number }> } };

    const newTokens = (updatedBuyer as any)?.cursor?.firstBatch?.[0]?.tokens ?? 0;

    // 9. Tracking badges et quêtes (MARKET_PURCHASE incrémente totalMarketPurchases)
    const newBadges = await trackUserActivity(decoded.userId, 'MARKET_PURCHASE', 1);

    return NextResponse.json({
      success: true,
      cardId: listing.cardId,
      price: listing.price,
      tokens: newTokens,
      newBadges,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de l\'achat';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
