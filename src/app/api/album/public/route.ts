import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCardsByCollection, ALL_CLUB_CARDS } from '@/data/clubCards';
import { DEFAULT_COLLECTION_ID, ALL_COLLECTIONS_ID } from '@/data/cards';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        isPublicAlbum: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    if (!user.isPublicAlbum) {
      return NextResponse.json({ error: 'Cet album est privé' }, { status: 403 });
    }

    const collectionSlug = searchParams.get('collectionId') || DEFAULT_COLLECTION_ID;
    const cards = collectionSlug === ALL_COLLECTIONS_ID ? ALL_CLUB_CARDS : getCardsByCollection(collectionSlug);

    const collection = await prisma.collection.findUnique({ where: { slug: collectionSlug } });
    let quantities: Record<string, number> = {};
    let shinyCards: string[] = [];

    if (collection) {
      const userCollection = await prisma.userCollection.findUnique({
        where: {
          userId_collectionId: { userId, collectionId: collection.id },
        },
        select: { cards: true, shinyCards: true },
      });

      quantities = (userCollection?.cards as Record<string, number>) ?? {};
      shinyCards = (userCollection?.shinyCards as string[]) ?? [];
    }

    const data = cards.map((card) => ({
      ...card,
      quantity: quantities[card.id] ?? 0,
      isShiny: shinyCards.includes(card.id),
    }));

    return NextResponse.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
      },
      cards: data,
      total: cards.length,
      owned: Object.keys(quantities).length,
    });
  } catch (error) {
    console.error('Public album error:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 });
  }
}
