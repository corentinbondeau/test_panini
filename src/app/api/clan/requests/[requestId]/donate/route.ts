import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DONATION_TOKEN_REWARD = 5;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization') || '');
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const { requestId } = await params;

    // Get the request
    const clanRequest = await prisma.clanRequest.findUnique({ where: { id: requestId } });
    if (!clanRequest) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
    }

    if (clanRequest.status !== 'open') {
      return NextResponse.json({ error: 'Cette demande a déjà été traitée' }, { status: 400 });
    }

    if (clanRequest.userId === decoded.userId) {
      return NextResponse.json({ error: 'Vous ne pouvez pas donner à votre propre demande' }, { status: 400 });
    }

    // Find the collection for both users
    const collection = await prisma.collection.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!collection) {
      return NextResponse.json({ error: 'Aucune collection trouvée' }, { status: 500 });
    }

    // Use a transaction: remove card from donor, add to requester, reward donor with tokens
    await prisma.$transaction(async (tx) => {
      // 1. Get donor's collection
      const donorCollection = await tx.userCollection.findUnique({
        where: {
          userId_collectionId: { userId: decoded.userId, collectionId: collection.id },
        },
      });

      if (!donorCollection) {
        throw new Error('Vous ne possédez pas cette carte');
      }

      const donorCards = (donorCollection.cards as Record<string, number>) || {};
      const donorQty = donorCards[clanRequest.cardIdRequested] ?? 0;

      if (donorQty < 2) {
        throw new Error("Vous n'avez pas assez d'exemplaires de cette carte pour donner (minimum 2)");
      }

      // 2. Remove one from donor
      donorCards[clanRequest.cardIdRequested] = donorQty - 1;
      if (donorCards[clanRequest.cardIdRequested] <= 0) {
        delete donorCards[clanRequest.cardIdRequested];
      }

      await tx.userCollection.update({
        where: { id: donorCollection.id },
        data: { cards: donorCards },
      });

      // 3. Get/update requester's collection
      const requesterCollection = await tx.userCollection.findUnique({
        where: {
          userId_collectionId: { userId: clanRequest.userId, collectionId: collection.id },
        },
      });

      const requesterCards = requesterCollection
        ? ((requesterCollection.cards as Record<string, number>) || {})
        : {};
      requesterCards[clanRequest.cardIdRequested] = (requesterCards[clanRequest.cardIdRequested] ?? 0) + 1;

      // Update card date if new
      const requesterCardDates = requesterCollection
        ? ((requesterCollection.cardDates as Record<string, string>) || {})
        : {};
      if (!requesterCardDates[clanRequest.cardIdRequested]) {
        requesterCardDates[clanRequest.cardIdRequested] = new Date().toISOString();
      }

      if (requesterCollection) {
        await tx.userCollection.update({
          where: { id: requesterCollection.id },
          data: { cards: requesterCards, cardDates: requesterCardDates },
        });
      } else {
        await tx.userCollection.create({
          data: {
            userId: clanRequest.userId,
            collectionId: collection.id,
            cards: requesterCards,
            cardDates: requesterCardDates,
          },
        });
      }

      // 4. Reward donor with tokens
      await tx.user.update({
        where: { id: decoded.userId },
        data: { tokens: { increment: DONATION_TOKEN_REWARD } },
      });

      // 5. Mark request as fulfilled
      await tx.clanRequest.update({
        where: { id: requestId },
        data: { status: 'fulfilled' },
      });
    });

    return NextResponse.json({ success: true, tokensRewarded: DONATION_TOKEN_REWARD });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors du don';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
