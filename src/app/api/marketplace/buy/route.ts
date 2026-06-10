import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { checkAndUnlockBadges } from '@/lib/badges';

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

    // Use a transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      const listing = await tx.marketplaceListing.findUnique({
        where: { id: listingId },
      });

      if (!listing || listing.status !== 'active') {
        throw new Error('Annonce introuvable ou déjà vendue');
      }

      if (listing.sellerId === decoded.userId) {
        throw new Error('Vous ne pouvez pas acheter votre propre annonce');
      }

      // Check buyer has enough tokens
      const buyer = await tx.user.findUnique({
        where: { id: decoded.userId },
        select: { tokens: true },
      });

      if (!buyer || buyer.tokens < listing.price) {
        throw new Error('Tokens insuffisants');
      }

      // Transfer tokens: buyer -> seller
      await tx.user.update({
        where: { id: decoded.userId },
        data: { tokens: { decrement: listing.price } },
      });

      await tx.user.update({
        where: { id: listing.sellerId },
        data: { tokens: { increment: listing.price } },
      });

      // Find the seller's collection to deduct the card
      const sellerCollections = await tx.userCollection.findMany({
        where: { userId: listing.sellerId },
      });

      let cardTransferred = false;
      for (const col of sellerCollections) {
        const cards = (col.cards as Record<string, number>) || {};
        if (cards[listing.cardId] && cards[listing.cardId] > 0) {
          cards[listing.cardId] -= 1;
          if (cards[listing.cardId] <= 0) delete cards[listing.cardId];

          await tx.userCollection.update({
            where: { id: col.id },
            data: { cards },
          });
          cardTransferred = true;
          break;
        }
      }

      if (!cardTransferred) {
        throw new Error('La carte n\'est plus disponible');
      }

      // Find buyer's collection for the same collection
      const listingCollection = await tx.collection.findFirst({
        where: { userCollections: { some: { userId: listing.sellerId } } },
      });

      if (listingCollection) {
        const buyerCollection = await tx.userCollection.findUnique({
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

          await tx.userCollection.update({
            where: { id: buyerCollection.id },
            data: { cards: buyerCards },
          });
        }
      }

      // Mark listing as sold
      await tx.marketplaceListing.update({
        where: { id: listingId },
        data: { status: 'sold' },
      });

      return { success: true, cardId: listing.cardId, price: listing.price };
    });

    // Update buyer stats and check badges
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { totalCardsObtained: { increment: 1 } },
    });
    const newBadges = await checkAndUnlockBadges(decoded.userId);

    return NextResponse.json({ ...result, newBadges });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de l\'achat';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
