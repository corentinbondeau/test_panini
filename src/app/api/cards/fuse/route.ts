import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { DEFAULT_COLLECTION_ID } from '@/data/cards';
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
    const { cardId, collectionSlug } = body;

    if (!cardId) {
      return NextResponse.json({ error: 'cardId requis' }, { status: 400 });
    }

    const slug = collectionSlug || DEFAULT_COLLECTION_ID;
    const collection = await prisma.collection.findUnique({ where: { slug } });
    if (!collection) {
      return NextResponse.json({ error: 'Collection introuvable' }, { status: 404 });
    }

    const userCollection = await prisma.userCollection.findUnique({
      where: { userId_collectionId: { userId: decoded.userId, collectionId: collection.id } },
    });

    if (!userCollection) {
      return NextResponse.json({ error: 'Aucune collection trouvée' }, { status: 400 });
    }

    const cards = (userCollection.cards as Record<string, number>) || {};
    const shinyCards = new Set((userCollection.shinyCards as string[]) || []);

    const qty = cards[cardId] ?? 0;

    if (qty < 3) {
      return NextResponse.json({ error: 'Vous avez besoin de 3 exemplaires pour fusionner' }, { status: 400 });
    }

    if (shinyCards.has(cardId)) {
      return NextResponse.json({ error: 'Cette carte est déjà shiny' }, { status: 400 });
    }

    // Deduct 2 copies, keep the 3rd and upgrade it to shiny
    cards[cardId] = qty - 2;

    // Add to shiny set
    shinyCards.add(cardId);

    await prisma.userCollection.update({
      where: { id: userCollection.id },
      data: {
        cards,
        shinyCards: Array.from(shinyCards),
      },
    });

    // Check for newly unlocked badges
    const newBadges = await checkAndUnlockBadges(decoded.userId);

    return NextResponse.json({
      success: true,
      cardId,
      quantities: cards,
      shinyCards: Array.from(shinyCards),
      newBadges,
    });
  } catch (error) {
    console.error('Fuse error:', error);
    return NextResponse.json({ error: 'Erreur lors de la fusion' }, { status: 500 });
  }
}
