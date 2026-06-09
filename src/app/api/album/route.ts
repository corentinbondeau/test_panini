import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { DEFAULT_COLLECTION_ID } from '@/data/cards';
import { getCardsByCollection } from '@/data/clubCards';
import { CardRarity } from '@/data/cards';

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

    const { searchParams } = new URL(request.url);
    const collectionSlug = searchParams.get('collectionId') || DEFAULT_COLLECTION_ID;
    const rarity = searchParams.get('rarity') as CardRarity | null;
    const serie = searchParams.get('serie') || null;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '24', 10)));

    let cards = getCardsByCollection(collectionSlug);

    if (rarity && ['COMMUNE', 'RARE', 'LEGENDAIRE'].includes(rarity)) {
      cards = cards.filter((c) => c.rarity === rarity);
    }

    const totalCards = cards.length;
    const totalPages = Math.ceil(totalCards / limit);
    const paginatedCards = cards.slice((page - 1) * limit, page * limit);

    let quantities: Record<string, number> = {};

    if (!serie || serie === collectionSlug) {
      const collectionObjectId = await prisma.collection.findUnique({
        where: { slug: collectionSlug },
        select: { id: true },
      });

      if (collectionObjectId) {
        const userCollection = await prisma.userCollection.findUnique({
          where: {
            userId_collectionId: {
              userId: decoded.userId,
              collectionId: collectionObjectId.id,
            },
          },
          select: { cards: true },
        });

        quantities = (userCollection?.cards as Record<string, number>) ?? {};
      }
    }

    const data = paginatedCards.map((card) => ({
      ...card,
      quantity: quantities[card.id] ?? 0,
    }));

    return NextResponse.json({
      data,
      total: totalCards,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error('Album API error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'album' },
      { status: 500 }
    );
  }
}
