import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { DEFAULT_COLLECTION_ID } from '@/data/cards';

export const dynamic = 'force-dynamic';

async function resolveCollectionObjectId(slug: string): Promise<string | null> {
  const collection = await prisma.collection.findUnique({ where: { slug } });
  return collection ? collection.id : null;
}

function getCollectionSlug(request: NextRequest): string {
  const url = new URL(request.url);
  return url.searchParams.get('collectionId') || DEFAULT_COLLECTION_ID;
}

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

    const collectionSlug = getCollectionSlug(request);
    const collectionObjectId = await resolveCollectionObjectId(collectionSlug);

    if (!collectionObjectId) {
      return NextResponse.json({ error: 'Collection introuvable' }, { status: 404 });
    }

    const userCollection = await prisma.userCollection.findUnique({
      where: { userId_collectionId: { userId: decoded.userId, collectionId: collectionObjectId } },
    });

    if (!userCollection) {
      return NextResponse.json(
        { collection: null },
        { status: 200 }
      );
    }

    return NextResponse.json({ collection: userCollection }, { status: 200 });
  } catch (error) {
    console.error('Get collection error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la collection' },
      { status: 500 }
    );
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
    const { cardId, quantity, collectionId: bodyCollectionSlug } = body;
    const collectionSlug = bodyCollectionSlug || DEFAULT_COLLECTION_ID;

    if (!cardId || quantity === undefined) {
      return NextResponse.json(
        { error: 'cardId et quantity sont requis' },
        { status: 400 }
      );
    }

    const collectionObjectId = await resolveCollectionObjectId(collectionSlug);
    if (!collectionObjectId) {
      return NextResponse.json({ error: 'Collection introuvable' }, { status: 404 });
    }

    let userCollection = await prisma.userCollection.findUnique({
      where: { userId_collectionId: { userId: decoded.userId, collectionId: collectionObjectId } },
    });

    if (!userCollection) {
      userCollection = await prisma.userCollection.create({
        data: {
          userId: decoded.userId,
          collectionId: collectionObjectId,
          cards: {},
        },
      });
    }

    const currentCards = (userCollection.cards as Record<string, number>) || {};

    if (quantity <= 0) {
      delete currentCards[cardId];
    } else {
      currentCards[cardId] = quantity;
    }

    const updated = await prisma.userCollection.update({
      where: { id: userCollection.id },
      data: { cards: currentCards },
    });

    return NextResponse.json({ collection: updated }, { status: 200 });
  } catch (error) {
    console.error('Update collection error:', error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la collection" },
      { status: 500 }
    );
  }
}
