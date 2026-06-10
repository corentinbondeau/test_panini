import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { getCardsByCollection } from '@/data/clubCards';
import { ALL_CLUB_CARDS } from '@/data/clubCards';
import { DEFAULT_COLLECTION_ID } from '@/data/cards';

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
    const searchQuery = searchParams.get('search') || '';

    const listings = await prisma.marketplaceListing.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' },
      include: {
        seller: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    const cards = collectionSlug === 'all' ? ALL_CLUB_CARDS : getCardsByCollection(collectionSlug);
    const cardMap = new Map(cards.map((c) => [c.id, c]));

    let data = listings.map((l) => ({
      ...l,
      card: cardMap.get(l.cardId) || null,
    }));

    // Filter by search query on card name (case-insensitive)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      data = data.filter((item) => {
        if (!item.card) return false;
        const fullName = `${item.card.firstName} ${item.card.lastName}`.toLowerCase();
        return fullName.includes(q);
      });
    }

    return NextResponse.json({ listings: data });
  } catch (error) {
    console.error('Marketplace error:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération du marché' }, { status: 500 });
  }
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
    const { cardId, price, collectionSlug } = body;

    if (!cardId || !price || price < 1) {
      return NextResponse.json({ error: 'cardId et price (>=1) requis' }, { status: 400 });
    }

    const collectionId = collectionSlug || DEFAULT_COLLECTION_ID;
    const collection = await prisma.collection.findUnique({ where: { slug: collectionId } });
    if (!collection) {
      return NextResponse.json({ error: 'Collection introuvable' }, { status: 404 });
    }

    // Check seller has at least 1 copy to sell (needs > 1 since they keep at least 1)
    const userCollection = await prisma.userCollection.findUnique({
      where: {
        userId_collectionId: { userId: decoded.userId, collectionId: collection.id },
      },
    });

    const currentCards = (userCollection?.cards as Record<string, number>) || {};
    const qty = currentCards[cardId] ?? 0;

    if (qty < 2) {
      return NextResponse.json({ error: 'Vous devez avoir au moins 2 exemplaires pour vendre' }, { status: 400 });
    }

    // Deduct one from seller's collection
    currentCards[cardId] = qty - 1;
    if (currentCards[cardId] <= 0) delete currentCards[cardId];

    // Create listing
    const listing = await prisma.$transaction(async (tx) => {
      await tx.userCollection.update({
        where: { id: userCollection!.id },
        data: { cards: currentCards },
      });

      return tx.marketplaceListing.create({
        data: {
          sellerId: decoded.userId,
          cardId,
          price,
          status: 'active',
        },
      });
    });

    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    console.error('Marketplace create error:', error);
    return NextResponse.json({ error: 'Erreur lors de la création de l\'annonce' }, { status: 500 });
  }
}
